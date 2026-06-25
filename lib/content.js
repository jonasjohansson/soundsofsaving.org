/* ------------------------------------------------------------------ *
 *  Shared build-time content helpers for the src/_data/ loaders.
 *  Kept outside src/_data/ so Eleventy doesn't load it as global data.
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const { imageSize } = require("image-size");

const ASSETS = path.join(__dirname, "..", "src", "assets");

// intrinsic dimensions of a local image (root-absolute path like
// "/assets/img/<dir>/<id>.jpg"); null for external/missing files so the
// template can omit width/height rather than emit wrong ones.
function dimsOf(src) {
  if (!src || /^https?:\/\//.test(src)) return null;
  const rel = String(src).replace(/^\/+/, "").replace(/^assets\//, "");
  const file = path.join(ASSETS, rel);
  try {
    const { width, height } = imageSize(fs.readFileSync(file));
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}

// robust YYYY-MM-DD, tolerant of YAML date objects (js-yaml parses an
// unquoted date scalar into a JS Date).
function ymd(v) {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

const slugify = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

// pull a YouTube id out of any common URL/id form (or pass an id through).
function youtubeId(s = "") {
  const str = String(s).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;
  const m = str.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

// trim free text to a clean ~155-char meta excerpt on a word boundary.
// (news.js keeps its own richer markdown-stripping variant.)
function excerptOf(text, max = 155) {
  const s = String(text || "")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[.,;:-]\s*$/, "") + "…";
}

module.exports = { dimsOf, ymd, slugify, youtubeId, excerptOf };
