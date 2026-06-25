/* ------------------------------------------------------------------ *
 *  Parse the Get Help resource directory from the Webflow mirror.
 *
 *  The live /resources page is a Webflow CMS "Resources" collection,
 *  faceted by Category (16 topic pages) and Location (33 city pages).
 *  Each topic/city page renders the same `.resource-row` markup, so the
 *  same resource appears on several pages. This script walks both folders,
 *  extracts every row, and DEDUPES into one resource per (name + url),
 *  aggregating the categories and locations it was found under.
 *
 *  Output: content/resources.json
 *    {
 *      categories: [{ slug, label }, ...],   // canonical 16
 *      locations:  [{ slug, label }, ...],   // canonical 33
 *      resources:  [{ name, description, url, phone, categories:[], locations:[] }]
 *    }
 *
 *  Re-run when the mirror is refreshed. Not part of the Eleventy build;
 *  src/_data/resources.js reads the committed JSON.
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const MIRROR =
  process.env.SOS_MIRROR ||
  "/private/tmp/claude-501/-Users-jonas-Documents-GitHub-org-jonasjohansson-skynet/93629cee-452e-4961-8446-e07dd1fcb140/scratchpad/sos-mirror/www.soundsofsaving.org";

const OUT = path.join(__dirname, "..", "content", "resources.json");

const clean = (s = "") => String(s).replace(/\s+/g, " ").trim();

// pull a phone number out of a blurb when present ("Call: 1-800-...",
// "Phone: (212) ...", "Text 838255", bare "988"). Match the whole phone
// token including a leading "(" so we don't drop the area-code paren.
function phoneFrom(text) {
  if (!text) return "";
  const m = text.match(
    /(?:call|phone|text|dial|tel)[^0-9(]{0,12}(\(?\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\(?\d{3}\)?[-.\s]?\d{4}|\b988\b|\b\d{6}\b)/i
  );
  return m ? clean(m[1]) : "";
}

function labelFromSlug(slug) {
  return slug
    .replace(/\.html$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Hand-mapped labels so capitalization/abbreviations match the live site
// (the slug -> Title Case fallback gets most, these fix the rest).
const CATEGORY_LABELS = {
  "addiction": "Addiction",
  "anxiety-stress": "Anxiety & Stress",
  "community-services": "Community Services",
  "crisis-services": "Crisis Services",
  "depression": "Depression",
  "domestic-violence-sexual-assault": "Domestic Violence / Sexual Assault",
  "eating-disorders": "Eating Disorders",
  "health-wellness": "Health & Wellness",
  "hotline": "Hotline",
  "houselessness": "Houselessness",
  "lgbtq": "LGBTQ+",
  "multilingual": "Multilingual",
  "suicide-prevention-support": "Suicide Prevention & Support",
  "support-services": "Support Services",
  "therapy-services": "Therapy Services",
  "youth-families": "Youth & Families",
};

const LOCATION_LABELS = {
  "atlanta-ga": "Atlanta, GA",
  "austin-tx": "Austin, TX",
  "bay-area-ca": "Bay Area, CA",
  "boston-ma": "Boston, MA",
  "chicago-il": "Chicago, IL",
  "cincinnati-oh": "Cincinnati, OH",
  "cleveland-oh": "Cleveland, OH",
  "columbus-oh": "Columbus, OH",
  "dallas-tx": "Dallas, TX",
  "denver-co": "Denver, CO",
  "detroit-mi": "Detroit, MI",
  "houston-tx": "Houston, TX",
  "jersey-city-nj": "Jersey City, NJ",
  "long-island-ny": "Long Island, NY",
  "los-angeles-ca": "Los Angeles, CA",
  "minneapolis-mn": "Minneapolis, MN",
  "montreal-qc": "Montreal, QC",
  "nashville-tn": "Nashville, TN",
  "national": "National",
  "new-orleans": "New Orleans, LA",
  "new-york": "New York, NY",
  "north-florida": "North Florida",
  "orlando-fl": "Orlando, FL",
  "phoenix-az": "Phoenix, AZ",
  "portland-or": "Portland, OR",
  "raleigh-nc": "Raleigh, NC",
  "salt-lake-city-ut": "Salt Lake City, UT",
  "san-diego-ca": "San Diego, CA",
  "seattle-wa": "Seattle, WA",
  "st-louis-mo": "St. Louis, MO",
  "toronto-on": "Toronto, ON",
  "washington-d-c": "Washington, D.C.",
  "yellow-springs-oh": "Yellow Springs, OH",
};

function parseDir(dir) {
  const folder = path.join(MIRROR, dir);
  const files = fs
    .readdirSync(folder)
    .filter((f) => f.endsWith(".html"))
    .sort();
  const facets = [];
  const rows = [];
  for (const f of files) {
    const slug = f.replace(/\.html$/, "");
    const labels = dir === "categories" ? CATEGORY_LABELS : LOCATION_LABELS;
    const label = labels[slug] || labelFromSlug(slug);
    facets.push({ slug, label });

    const $ = cheerio.load(fs.readFileSync(path.join(folder, f), "utf8"));
    let count = 0;
    $(".resource-row").each((_, el) => {
      const $el = $(el);
      const $a = $el.find("a[href]").first();
      // name lives in an h3 or h4 (Webflow rows use both); prefer the one
      // inside the link, fall back to the first heading in the row.
      const name = clean(
        $a.find("h3,h4").first().text() || $el.find("h3,h4").first().text()
      );
      const url = clean($a.attr("href"));
      const description = clean($el.find("p").first().text());
      if (!name && !url) return;
      rows.push({ name, url, description, facet: slug });
      count++;
    });
    if (count === 0) {
      console.warn(`[resources] ${dir}/${f}: no .resource-row items (skipped)`);
    }
  }
  return { facets, rows };
}

function main() {
  const cats = parseDir("categories");
  const locs = parseDir("locations");

  // Dedupe into one resource per identity key. Same name+url across many
  // topic/city pages collapses to one record that lists every facet.
  const byKey = new Map();
  const keyOf = (r) => (r.url || "").toLowerCase().replace(/\/+$/, "") + "|" + r.name.toLowerCase();

  function ingest(rows, facetField) {
    for (const r of rows) {
      const key = keyOf(r);
      let rec = byKey.get(key);
      if (!rec) {
        rec = {
          name: r.name,
          description: r.description,
          url: r.url,
          phone: phoneFrom(r.description),
          categories: [],
          locations: [],
        };
        byKey.set(key, rec);
      }
      // prefer the longest description seen (some pages truncate)
      if (r.description && r.description.length > (rec.description || "").length) {
        rec.description = r.description;
        if (!rec.phone) rec.phone = phoneFrom(r.description);
      }
      if (!rec[facetField].includes(r.facet)) rec[facetField].push(r.facet);
    }
  }

  ingest(cats.rows, "categories");
  ingest(locs.rows, "locations");

  const resources = [...byKey.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en")
  );

  const out = {
    categories: cats.facets,
    locations: locs.facets,
    resources,
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `[resources] wrote ${resources.length} resources, ${cats.facets.length} categories, ${locs.facets.length} locations -> ${path.relative(process.cwd(), OUT)}`
  );
  console.log(
    `[resources] raw rows: ${cats.rows.length} category + ${locs.rows.length} location = ${cats.rows.length + locs.rows.length}`
  );
}

main();
