/* ------------------------------------------------------------------ *
 *  Get Help resource directory — read from content/resources.json.
 *
 *  Pipeline: scripts/parse-resources.js scrapes the Webflow mirror into
 *  content/resources.json (one record per resource, with the categories /
 *  locations it appears under), then scripts/normalize-resources.js cleans
 *  it in place — extracting phones, dropping dead URLs, deduping orgs,
 *  bucketing uncategorized rows into "Other / General", and deriving
 *  languages[] + national. This loader just shapes the cleaned data for
 *  the /resources/ finder.
 *
 *  Each resource: { name, description, url, phone, categories[],
 *                   locations[], languages[], national }.
 *
 *  Exposes to templates:
 *    resources.all        — every resource, sorted by name
 *    resources.categories — [{ slug, label, count }]  (topics, incl. Other)
 *    resources.locations  — [{ slug, label, count }]  (cities, incl. National)
 *    resources.languages  — [{ slug, label, count }]  (derived languages)
 *    resources.byCategory — { slug: [resource, ...] }
 *    resources.byLocation — { slug: [resource, ...] }
 *    resources.byLanguage — { slug: [resource, ...] }
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "..", "content", "resources.json");

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

module.exports = function () {
  if (!fs.existsSync(FILE)) {
    console.warn("[resources] content/resources.json missing — directory will be empty.");
    return {
      all: [],
      categories: [],
      locations: [],
      languages: [],
      byCategory: {},
      byLocation: {},
      byLanguage: {},
    };
  }

  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const all = (Array.isArray(data.resources) ? data.resources : [])
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const byCategory = {};
  const byLocation = {};
  const byLanguage = {};
  const langLabels = {}; // slug -> display label
  for (const r of all) {
    for (const c of r.categories || []) (byCategory[c] = byCategory[c] || []).push(r);
    for (const l of r.locations || []) (byLocation[l] = byLocation[l] || []).push(r);
    for (const lang of r.languages || []) {
      const slug = slugify(lang);
      langLabels[slug] = lang;
      (byLanguage[slug] = byLanguage[slug] || []).push(r);
    }
  }

  // "National" facet: union of the source's explicit "national" location slug
  // and the derived `national` boolean, so the count and the filter agree.
  // (normalize-resources.js already sets national=true for the explicit slug,
  // so this is just deduping against any rows already in byLocation.national.)
  const nationalList = all.filter((r) => r.national);
  byLocation["national"] = nationalList;

  // attach counts to the canonical facet lists; drop facets with no items.
  const categories = (data.categories || [])
    .map((c) => ({ ...c, count: (byCategory[c.slug] || []).length }))
    .filter((c) => c.count > 0);

  // City facets only — "national" is surfaced separately as the broadest option.
  const cityLocations = (data.locations || [])
    .filter((l) => l.slug !== "national")
    .map((l) => ({ ...l, count: (byLocation[l.slug] || []).length }))
    .filter((l) => l.count > 0);
  const locations = nationalList.length
    ? [{ slug: "national", label: "National", count: nationalList.length }, ...cityLocations]
    : cityLocations;

  const languages = Object.keys(byLanguage)
    .map((slug) => ({ slug, label: langLabels[slug], count: byLanguage[slug].length }))
    .filter((l) => l.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return { all, categories, locations, languages, byCategory, byLocation, byLanguage };
};
