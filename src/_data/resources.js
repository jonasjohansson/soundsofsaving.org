/* ------------------------------------------------------------------ *
 *  Get Help resource directory — read from content/resources.json,
 *  produced by scripts/parse-resources.js (parses the Webflow mirror's
 *  16 category + 33 location collection pages, deduped into one record
 *  per resource with the categories/locations it appears under).
 *
 *  Exposes to templates:
 *    resources.all        — every resource, sorted by name
 *    resources.categories — [{ slug, label, count }]
 *    resources.locations  — [{ slug, label, count }]
 *    resources.byCategory — { slug: [resource, ...] }
 *    resources.byLocation — { slug: [resource, ...] }
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "..", "content", "resources.json");

module.exports = function () {
  if (!fs.existsSync(FILE)) {
    console.warn("[resources] content/resources.json missing — directory will be empty.");
    return { all: [], categories: [], locations: [], byCategory: {}, byLocation: {} };
  }

  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const all = Array.isArray(data.resources) ? data.resources : [];

  const byCategory = {};
  const byLocation = {};
  for (const r of all) {
    for (const c of r.categories || []) (byCategory[c] = byCategory[c] || []).push(r);
    for (const l of r.locations || []) (byLocation[l] = byLocation[l] || []).push(r);
  }

  // attach counts to the canonical facet lists; drop facets with no items
  const categories = (data.categories || [])
    .map((c) => ({ ...c, count: (byCategory[c.slug] || []).length }))
    .filter((c) => c.count > 0);
  const locations = (data.locations || [])
    .map((l) => ({ ...l, count: (byLocation[l.slug] || []).length }))
    .filter((l) => l.count > 0);

  return { all, categories, locations, byCategory, byLocation };
};
