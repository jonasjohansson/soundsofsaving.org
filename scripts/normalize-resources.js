#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  normalize-resources.js — re-runnable cleaner for content/resources.json
 *
 *  Reads content/resources.json (produced by parse-resources.js), cleans
 *  the 504 scraped records in place, and writes it back. Idempotent: run
 *  it twice and the second run reports zero changes.
 *
 *  What it fixes (see docs/scrape-report.md for the run summary):
 *    1. Pipe-delimited "Label: value" cruft in descriptions (Phone:/Email:/
 *       Text:/Call:) — pull a real phone number into the `phone` field when
 *       one is missing, then strip the label segment from the blurb.
 *    2. Embedded phone numbers / "Phone:" prefixes at the head of a blurb.
 *    3. Dead Webflow URLs ending in `.html#` — nulled out.
 *    4. Empty `categories` — default-bucketed into "other-general" so the
 *       facet list never carries a null/empty category.
 *    5. Duplicate orgs (same normalized name or url) — merged, keeping the
 *       richest record and unioning categories + locations.
 *    6. Derived fields: `languages[]` (Spanish / Multilingual / etc. detected
 *       in name+description) and `national` (nationwide hotline heuristic).
 *
 *  Usage: node scripts/normalize-resources.js
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "content", "resources.json");

// — counters for the summary ————————————————————————————————————————
const stats = {
  phonesExtracted: 0,
  descriptionsCleaned: 0,
  deadUrls: 0,
  dupesMerged: 0,
  bucketed: 0,
  languagesTagged: 0,
  nationalTagged: 0,
};

const OTHER = { slug: "other-general", label: "Other / General" };

// — helpers ————————————————————————————————————————————————————————

// Phone matcher: a run with 7+ digits, allowing (), -, ., spaces, leading +
// and an optional leading "(" so area codes like "(844) 493-8255" stay whole.
const PHONE_RE = /(\(?\+?\d[\d().\s-]{6,}\d)/;

// Pull the first plausible phone number out of a string, normalized lightly
// (collapse whitespace, keep human-readable punctuation). Returns "" if none.
function findPhone(str) {
  if (!str) return "";
  const m = String(str).match(PHONE_RE);
  if (!m) return "";
  const raw = m[1].trim().replace(/\s+/g, " ");
  // require at least 7 digits so we don't grab a stray year / zip
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return "";
  return raw;
}

// Clean a description: split on pipes, drop label-only segments (Phone:/Email:
// /Text:/Call:/Contact:), strip leading "Phone: ..." style prefixes, collapse
// whitespace. Returns the cleaned blurb.
const DROP_LABELS = /^(phone|tel|telephone|email|e-mail|text|call|contact|fax|tty)\b/i;

// Strip a contact-label segment down to whatever real prose follows it. For a
// segment like "Phone: (216) 512-0321 Email: x@y — The Black ..." we drop the
// leading contact run (label + number/email + parentheticals) and keep prose.
function stripContactSegment(seg) {
  const labelMatch = seg.match(/^([A-Za-z\- ]{2,20}):\s*(.*)$/);
  if (!labelMatch || !DROP_LABELS.test(labelMatch[1].trim())) return seg;
  let rest = labelMatch[2].trim();
  // Consume successive contact-ish chunks: phone numbers, emails, "(notes)",
  // toll-free names, and further "Label:" runs, until we hit real prose.
  let prev;
  do {
    prev = rest;
    rest = rest
      // leading email
      .replace(/^\S+@\S+\.\S+\b/, "")
      // leading phone number (with optional parenthetical note after it)
      .replace(/^\(?\+?\d[\d().\s-]{5,}\d(\s*\([^)]*\))?/, "")
      // leading "(TALK)", "(toll free)", "(local)", "(not a crisis line)" etc.
      .replace(/^\s*\([^)]{0,40}\)/, "")
      // a chained "Email:"/"Phone:" label starting another contact run
      .replace(/^\s*(or|and)?\s*(phone|tel|telephone|email|e-mail|text|call|contact|fax|tty)\s*:?\s*/i, "")
      // toll-free spelled forms like "(833) SPEAKUT"
      .replace(/^\s*\(?\d{3}\)?\s*[A-Z]{4,}\b/, "")
      .trim();
  } while (rest !== prev && rest.length);
  return rest;
}

function cleanDescription(desc) {
  if (!desc) return "";
  let parts = String(desc)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(stripContactSegment)
    .filter(Boolean);

  let out = parts.join(" — ").replace(/\s+/g, " ").trim();
  // tidy a leftover leading separator / dangling "or"/dash that slipped through
  out = out.replace(/^[—\-:\s]+/, "").replace(/^(or|and)\s+/i, "").trim();
  return out;
}

// — language detection ————————————————————————————————————————————
// name+description scanned for explicit language signals.
const LANG_SIGNALS = [
  { lang: "Spanish", re: /\b(spanish|español|espanol|en español|bilingual|hispanic|latino|latina|latinx)\b/i },
  { lang: "Multilingual", re: /\b(multilingual|multiple languages|many languages|language line|interpreters?|translation services?)\b/i },
  { lang: "Mandarin", re: /\b(mandarin|chinese|cantonese)\b/i },
  { lang: "Korean", re: /\bkorean\b/i },
  { lang: "Vietnamese", re: /\bvietnamese\b/i },
  { lang: "ASL", re: /\b(asl|american sign language|deaf|hard of hearing)\b/i },
  { lang: "French", re: /\bfrench\b/i },
];

function detectLanguages(r) {
  const hay = `${r.name || ""} ${r.description || ""}`;
  const langs = new Set();
  for (const { lang, re } of LANG_SIGNALS) if (re.test(hay)) langs.add(lang);
  // a resource tagged with the "multilingual" category counts as multilingual
  if ((r.categories || []).includes("multilingual")) langs.add("Multilingual");
  return [...langs].sort();
}

// — national / nationwide heuristic ————————————————————————————————
const NATIONAL_RE = /\b(national|nationwide|nationally|across the (us|u\.s\.|country|nation)|all 50 states|24\/7 national|federal)\b/i;
function detectNational(r) {
  // An explicit "national" location slug from the source scrape is authoritative.
  if ((r.locations || []).includes("national")) return true;
  const hay = `${r.name || ""} ${r.description || ""}`;
  if (NATIONAL_RE.test(hay)) return true;
  // Well-known nationwide hotlines by name
  if (/\b(988|suicide & crisis lifeline|crisis text line|trevor project|samhsa|veterans crisis|trans lifeline|the trevor)\b/i.test(hay))
    return true;
  return false;
}

// — record "richness" score, to pick the survivor in a dupe group —————
function richness(r) {
  return (
    (r.description ? r.description.length : 0) +
    (r.url ? 50 : 0) +
    (r.phone ? 30 : 0) +
    (r.categories || []).length * 10 +
    (r.locations || []).length * 10
  );
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

// — main ————————————————————————————————————————————————————————————

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
let resources = Array.isArray(data.resources) ? data.resources : [];

// 1+2+3: per-record field cleanup
for (const r of resources) {
  const beforeDesc = r.description || "";
  const beforePhone = (r.phone || "").trim();

  // Extract phone if the field is empty: try the existing phone field first,
  // then mine it from the (still-raw) description.
  if (!beforePhone) {
    const fromPhoneField = findPhone(r.phone);
    const fromDesc = findPhone(beforeDesc);
    const found = fromPhoneField || fromDesc;
    if (found) {
      r.phone = found;
      stats.phonesExtracted++;
    } else {
      r.phone = "";
    }
  } else {
    // normalize an already-present phone (strip a "Phone:" label if present)
    const cleaned = findPhone(beforePhone) || beforePhone.replace(/^(phone|tel)\s*:\s*/i, "").trim();
    r.phone = cleaned;
  }

  // Clean the description (drop contact-label cruft / pipe segments).
  const cleaned = cleanDescription(beforeDesc);
  if (cleaned !== beforeDesc) stats.descriptionsCleaned++;
  r.description = cleaned;

  // Dead Webflow URL.
  if (/\.html#\s*$/.test(r.url || "")) {
    r.url = null;
    stats.deadUrls++;
  }
  if (r.url === "") r.url = null;
}

// 5: dedupe. Group by normalized url first (strongest signal), then by name.
function normUrl(u) {
  return (u || "").trim().toLowerCase().replace(/\/+$/, "");
}
function normName(n) {
  return (n || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function mergeInto(keep, drop) {
  keep.categories = uniq([...(keep.categories || []), ...(drop.categories || [])]);
  keep.locations = uniq([...(keep.locations || []), ...(drop.locations || [])]);
  if (!keep.url && drop.url) keep.url = drop.url;
  if (!keep.phone && drop.phone) keep.phone = drop.phone;
  if ((drop.description || "").length > (keep.description || "").length)
    keep.description = drop.description;
}

function dedupe(list, keyFn) {
  const groups = new Map();
  for (const r of list) {
    const k = keyFn(r);
    if (!k) {
      // no key → keep as its own group under a unique sentinel
      groups.set(Symbol(), [r]);
      continue;
    }
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const out = [];
  for (const grp of groups.values()) {
    if (grp.length === 1) {
      out.push(grp[0]);
      continue;
    }
    grp.sort((a, b) => richness(b) - richness(a));
    const keep = grp[0];
    for (let i = 1; i < grp.length; i++) {
      mergeInto(keep, grp[i]);
      stats.dupesMerged++;
    }
    out.push(keep);
  }
  return out;
}

resources = dedupe(resources, (r) => normUrl(r.url) || null); // url-based first
resources = dedupe(resources, (r) => normName(r.name)); // then name-based

// 4: default-bucket empty categories.
for (const r of resources) {
  if (!Array.isArray(r.categories) || r.categories.length === 0) {
    r.categories = [OTHER.slug];
    stats.bucketed++;
  }
}

// 6: derive languages[] and national.
for (const r of resources) {
  const langs = detectLanguages(r);
  r.languages = langs;
  if (langs.length) stats.languagesTagged++;
  r.national = detectNational(r);
  if (r.national) stats.nationalTagged++;
}

// — rebuild facet lists ————————————————————————————————————————————
// Categories: keep existing canonical labels, append Other/General if used.
let categories = (data.categories || []).slice();
const usedCats = new Set();
for (const r of resources) for (const c of r.categories) usedCats.add(c);
if (usedCats.has(OTHER.slug) && !categories.some((c) => c.slug === OTHER.slug)) {
  categories.push({ ...OTHER });
}

// Sort resources by name for a stable, diff-friendly file.
resources.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

// — write back ————————————————————————————————————————————————————————
const out = {
  categories,
  locations: data.locations || [],
  resources,
};
fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n", "utf8");

// — verify: no empty categories remain ————————————————————————————————
const stillEmpty = resources.filter((r) => !r.categories || r.categories.length === 0).length;

// — summary ————————————————————————————————————————————————————————
console.log("normalize-resources.js — summary");
console.log("  resources (after dedupe):  " + resources.length);
console.log("  phones extracted:          " + stats.phonesExtracted);
console.log("  descriptions cleaned:      " + stats.descriptionsCleaned);
console.log("  dead URLs nulled:          " + stats.deadUrls);
console.log("  duplicate records merged:  " + stats.dupesMerged);
console.log("  uncategorized bucketed:    " + stats.bucketed + " -> '" + OTHER.label + "'");
console.log("  languages tagged:          " + stats.languagesTagged);
console.log("  national flagged:          " + stats.nationalTagged);
console.log("  empty-category remaining:  " + stillEmpty + (stillEmpty === 0 ? " (ok)" : " (!)"));

if (stillEmpty > 0) process.exit(1);
