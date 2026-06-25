/* ------------------------------------------------------------------ *
 *  Site settings — read from content/settings.json (managed by Pages
 *  CMS). Exposed to templates as `settings`. Editors save the JSON via
 *  the CMS, which commits here and triggers a rebuild. No external
 *  service at build time.
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "..", "content", "settings.json");

module.exports = function () {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
};
