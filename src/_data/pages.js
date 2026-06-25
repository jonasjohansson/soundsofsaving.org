/* ------------------------------------------------------------------ *
 *  Structured page content — read from content/pages/*.json (managed by
 *  Pages CMS). Each file becomes a key on the returned object, keyed by
 *  its filename without extension, so templates reach copy as
 *  `pages.programs`, `pages.about`, `pages.community`, `pages.gethelp`,
 *  and the pre-existing `pages.songs`.
 *
 *  Editors save the JSON via the CMS, which commits here and triggers a
 *  rebuild. No external service at build time.
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "..", "content", "pages");

module.exports = function () {
  const out = {};
  if (!fs.existsSync(DIR)) return out;
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith(".json")) continue;
    const key = f.replace(/\.json$/, "");
    try {
      out[key] = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
    } catch (err) {
      console.warn(`[pages] failed to parse ${f}: ${err.message}`);
    }
  }
  return out;
};
