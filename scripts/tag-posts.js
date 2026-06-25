#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  tag-posts.js — classify every content/news/*.md post into a
 *  redesign category and write a `category` (+ optional `cluster`)
 *  field back into its frontmatter, idempotently.
 *
 *  The News section is being replaced by a typed structure (see
 *  docs/plans/2026-06-25-redesign-strategy.md). Files DO NOT move —
 *  everything (URL, index membership) is driven off the `category`
 *  field so there is zero directory churn:
 *
 *    story         -> /stories/<slug>/   (the Stories index)
 *    learn         -> /learn/<slug>/     (surfaced in Get Help)
 *    resource-sheet-> /learn/<slug>/     (resource sheets, Get Help)
 *    whitepaper    -> /learn/<slug>/     (a-sound-approach; About rebuild)
 *    archive       -> /archive/<slug>/   (perishable gig reviews / round-ups)
 *
 *  `cluster` sub-types the `story` bucket so the Stories index can be
 *  grouped: interviews | features | reviews (reviews-worth-keeping).
 *
 *  Re-runnable: classification is pure (slug/title only), and the
 *  script only rewrites a file when category/cluster actually change.
 *
 *  Usage:  node scripts/tag-posts.js          (writes + prints mapping)
 *          node scripts/tag-posts.js --dry     (print only, no writes)
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const NEWS = path.join(ROOT, "content", "news");
const REPORT = path.join(ROOT, "docs", "scrape-report.md");
const DRY = process.argv.includes("--dry");

/* ---- Explicit per-slug overrides (human judgment from the strategy) ---- */
/* These win over the heuristics below. Each maps slug -> {category, cluster?}. */
const OVERRIDES = {
  // --- Learn: clinical / care explainers folded into Get Help ---
  "what-is-emdr": { category: "learn" },
  "what-is-dbt": { category: "learn" },
  "what-is-dysthymia": { category: "learn" },
  "a-holistic-approach-to-trauma-recovery": { category: "learn" },
  "coping-with-suicidal-ideation-in-college-tips-from-a-college-student": { category: "learn" },
  "girlsonthebrink-reflection": { category: "learn" },

  // --- Resource sheets: direct-aid handouts (a learn/resource layer) ---
  "hoja-de-recursos": { category: "resource-sheet" },
  "resource-sheet-for-evacuees-and-first-responders-of-the-2025-los-angeles-fires": { category: "resource-sheet" },
  "caring-for-your-body-in-crisis-prioritizing-respiratory-health": { category: "resource-sheet" },
  "neda-week-stigma": { category: "resource-sheet" },

  // --- White paper -> About (canonical home), tagged not moved ---
  "a-sound-approach": { category: "whitepaper" },

  // --- Stories: music-as-tool features (no "interview" in the slug) ---
  "4-lyrics-for-feeling-your-feelings": { category: "story", cluster: "features" },
  "how-to-curate-an-anxiety-soothing-playlist": { category: "story", cluster: "features" },
  "3-tips-for-managing-concert-anxiety": { category: "story", cluster: "features" },
  "lyrical-analysis-of-holly-humberstones-the-walls-are-way-too-thin": { category: "story", cluster: "features" },
  "noah-kahans-stick-season-speaks-to-the-mental-health-of-young-adults-through-powerful-folk-lyrics": { category: "story", cluster: "features" },
  "i-am-tired-of-being-constantly-available": { category: "story", cluster: "features" },
  "the-art-of-being-seen": { category: "story", cluster: "features" },
  "as-abortion-rights-are-under-attack-artists-fight-back": { category: "story", cluster: "features" },
  "the-front-bottoms-fan-spotlight-it-was-a-life-saving-experience": { category: "story", cluster: "features" },
  "taking-life-advice-from-shakey-graves": { category: "story", cluster: "features" },
  "surf-curse-magic-hour-the-mental-toll-of-touring-and-collective-creativity": { category: "story", cluster: "interviews" },
  "marina-herlop-finds-the-balance-between-danger-discomfort-and-stillness": { category: "story", cluster: "interviews" },
  "nuria-graham-on-music-as-a-collective-experience-and-her-journey-with-her-latest-album-majorie": { category: "story", cluster: "interviews" },
  "rock-singer-songwriter-ally-nicholas-is-being-true-to-herself": { category: "story", cluster: "interviews" },
  "olive-klug-interview": { category: "story", cluster: "interviews" },
  "maddie-zahm-interview": { category: "story", cluster: "interviews" },
  "comfort-club-interview": { category: "story", cluster: "interviews" },
  "moy-interview": { category: "story", cluster: "interviews" },
  "vara-interview": { category: "story", cluster: "interviews" },

  // --- Stories: check-in / conversation series worth keeping ---
  "check-in-series-summer-salt-reimagines-their-past-on-the-juniper-songbook-by-alyssa-goldberg": { category: "story", cluster: "interviews" },
  "sounds-of-saving-check-in-series-field-medic-brings-emo-to-folk-music": { category: "story", cluster: "interviews" },
  "govball2024-claire-rosinkranz-interview": { category: "story", cluster: "interviews" },
  "govball2024-hotlinetnt-interview": { category: "story", cluster: "interviews" },

  // --- Archive: perishable gig reviews / round-ups / org ephemera ---
  "fall-2023-round-up": { category: "archive" },
  "spring-2023-round-up": { category: "archive" },
  "winter-spring-2024-round-up": { category: "archive" },
  "donor-thanks-email": { category: "archive" },
  "sounds-of-saving-announces-the-formation-of-its-youth-advisory-council": { category: "archive" },
  "taylor-swift-philly-review": { category: "archive" },
  "a-night-in-the-marias-dreamland": { category: "archive" },
  "is-it-heaven-or-is-it-just-palace-at-webster-hall": { category: "archive" },
  "boygenius-hit-the-road-so-i-did-too": { category: "archive" },
  "backstage-at-newport-folk-with-the-black-opry-revue": { category: "archive" },
  "kacy-hill-performs-at-mercury-lounge-by-alyssa-goldberg": { category: "archive" },
  "wherever-mt-joy-is-thats-where-we-wanna-go": { category: "archive" },
  "illinoise-review": { category: "archive" },
  "holly-humberstone-album-review": { category: "archive" },

  // --- Stories: live reviews worth keeping (artist/mission depth) ---
  "noah-kahan-interview": { category: "story", cluster: "interviews" },
};

/* ---- Heuristic classifier (fallback for anything not overridden) ---- */
function classify(slug) {
  if (OVERRIDES[slug]) return OVERRIDES[slug];

  // Interviews / conversations -> Stories (interviews cluster)
  if (/(^|[-_])interview([-_]|$)/.test(slug) ||
      /^a-conversation-with-/.test(slug) ||
      /(^|[-_])q-a([-_]|$)/.test(slug) ||
      /-interview-\d{4}$/.test(slug)) {
    return { category: "story", cluster: "interviews" };
  }

  // Reviews / live-show write-ups -> Archive (perishable by default)
  if (/(^|[-_])review([-_]|$)/.test(slug) ||
      /-round-up$/.test(slug)) {
    return { category: "archive" };
  }

  // Everything else defaults to a story feature (kept, surfaced).
  return { category: "story", cluster: "features" };
}

/* ---- Surgical frontmatter rewrite ----
 * We edit the raw `--- ... ---` block as text rather than re-serializing
 * via matter.stringify, because js-yaml round-trips would rewrite the
 * unquoted `date:` scalar into an ISO Date string and reflow other fields.
 * The brief is explicit: only ADD category/cluster; never alter date/title/
 * body. So we drop any existing category/cluster lines and append fresh ones
 * just before the closing `---`, touching nothing else.                     */
function setFrontmatter(raw, category, cluster) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*)?$/);
  if (!m) throw new Error("no frontmatter block");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  // strip any prior category/cluster lines (re-runnable)
  let fm = m[1]
    .split(/\r?\n/)
    .filter((l) => !/^(category|cluster):/.test(l.trim()))
    .join(eol)
    .replace(/[\r\n]+$/, "");
  fm += eol + `category: ${category}`;
  if (cluster) fm += eol + `cluster: ${cluster}`;
  const body = m[2] || "";
  return `---${eol}${fm}${eol}---${body}`;
}

const files = fs.readdirSync(NEWS).filter((f) => f.endsWith(".md")).sort();
const rows = [];
let changed = 0;

for (const f of files) {
  const slug = f.replace(/\.md$/, "");
  const full = path.join(NEWS, f);
  const raw = fs.readFileSync(full, "utf8");
  const g = matter(raw);
  const { category, cluster } = classify(slug);

  const wantCluster = cluster || null;
  const haveCategory = g.data.category || null;
  const haveCluster = g.data.cluster || null;

  if (haveCategory !== category || haveCluster !== wantCluster) {
    if (!DRY) fs.writeFileSync(full, setFrontmatter(raw, category, wantCluster));
    changed++;
  }

  rows.push({ slug, category, cluster: wantCluster || "" });
}

/* ---- Print the full 70-row mapping ---- */
const counts = rows.reduce((m, r) => ((m[r.category] = (m[r.category] || 0) + 1), m), {});
console.log("\nslug -> category (cluster)\n" + "-".repeat(60));
for (const r of rows) {
  console.log(`${r.slug}  ->  ${r.category}${r.cluster ? " / " + r.cluster : ""}`);
}
console.log("-".repeat(60));
console.log(
  `Total: ${rows.length} posts` +
    `  |  ` +
    Object.entries(counts).sort().map(([k, v]) => `${k}: ${v}`).join(", ")
);
console.log(`${DRY ? "[dry-run] " : ""}${changed} file(s) ${DRY ? "would change" : "updated"}.`);

/* ---- Append/replace the taxonomy table in docs/scrape-report.md ---- */
if (!DRY && fs.existsSync(REPORT)) {
  const md = fs.readFileSync(REPORT, "utf8");
  const header = "## Stories taxonomy";
  const tableLines = [
    header,
    "",
    "_Generated by `scripts/tag-posts.js` (re-runnable). Each post's `category`",
    "drives its URL/section; files stay in `content/news/`._",
    "",
    `Counts: ${Object.entries(counts).sort().map(([k, v]) => `**${k}** ${v}`).join(", ")} (total ${rows.length}).`,
    "",
    "| slug | category | cluster |",
    "|---|---|---|",
    ...rows.map((r) => `| \`${r.slug}\` | ${r.category} | ${r.cluster || "-"} |`),
    "",
  ];
  const block = tableLines.join("\n");
  let next;
  const idx = md.indexOf(header);
  if (idx !== -1) {
    // replace from the existing header to the next top-level "## " or EOF
    const after = md.indexOf("\n## ", idx + header.length);
    next = md.slice(0, idx) + block + (after !== -1 ? md.slice(after) : "\n");
  } else {
    next = md.replace(/\s*$/, "\n\n") + block;
  }
  fs.writeFileSync(REPORT, next);
  console.log("Wrote taxonomy table to docs/scrape-report.md");
}
