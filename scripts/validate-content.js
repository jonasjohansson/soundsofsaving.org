#!/usr/bin/env node
/* Pre-build content validation. Run in CI before `npm run build` so a malformed
   CMS edit fails the job and never replaces the live site. Checks:
     - .pages.yml is valid YAML
     - content/settings.json, every content/pages/*.json, and
       content/resources.json are valid JSON
     - every song has an artist and a YouTube id/url; its local thumbnail (if a
       /assets path) exists on disk
     - every news post has a title and a valid YYYY-MM-DD date; its local image
       (if set) exists on disk
   Exits non-zero (with a readable list) when anything fails. */
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const yaml = require("js-yaml");

const root = path.join(__dirname, "..");
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const counts = { songs: 0, sessions: 0, news: 0, pages: 0, json: 0 };

// --- config + structured content files parse ----------------------------
try {
  yaml.load(fs.readFileSync(path.join(root, ".pages.yml"), "utf8"));
} catch (e) {
  fail(".pages.yml", "invalid YAML — " + e.message);
}

function checkJson(rel) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
    counts.json++;
  } catch (e) {
    fail(rel, "invalid JSON — " + e.message);
  }
}

checkJson("content/settings.json");
checkJson("content/resources.json");

const pagesDir = path.join(root, "content/pages");
if (fs.existsSync(pagesDir)) {
  for (const f of fs.readdirSync(pagesDir).filter((f) => f.endsWith(".json"))) {
    checkJson(path.join("content/pages", f));
    counts.pages++;
  }
}

// Pages CMS writes dates unquoted, so gray-matter/js-yaml hands us a Date
// object rather than a string; normalise to YYYY-MM-DD the same way the build
// (src/_data/*.js ymd()) does, so the validator matches what actually ships.
const dateStr = (v) =>
  v instanceof Date ? (isNaN(v) ? "" : v.toISOString().slice(0, 10)) : String(v);

// a /assets/... path must resolve to a file under src/assets/...
function assetExists(p) {
  const rel = String(p).replace(/^\/+/, ""); // assets/img/...
  return fs.existsSync(path.join(root, "src", rel));
}

// --- songs --------------------------------------------------------------
const songDir = path.join(root, "content/songs");
if (fs.existsSync(songDir)) {
  for (const f of fs.readdirSync(songDir).filter((f) => f.endsWith(".md"))) {
    counts.songs++;
    let data;
    try {
      data = matter(fs.readFileSync(path.join(songDir, f), "utf8")).data;
    } catch (e) {
      fail(f, "unparseable frontmatter — " + e.message);
      continue;
    }
    if (!data.artist || !String(data.artist).trim()) fail(f, "missing artist");
    const hasYt =
      (data.youtube_id && String(data.youtube_id).trim()) ||
      (data.youtube_url && String(data.youtube_url).trim());
    if (!hasYt) fail(f, "missing youtube_id or youtube_url");
    if (data.thumbnail && String(data.thumbnail).startsWith("/assets/") && !assetExists(data.thumbnail))
      fail(f, `thumbnail not found on disk: ${data.thumbnail}`);
  }
}

// --- sessions (the flagship "Songs That Found Me at the Right Time" hub) -
const sessionDir = path.join(root, "content/sessions");
if (fs.existsSync(sessionDir)) {
  for (const f of fs.readdirSync(sessionDir).filter((f) => f.endsWith(".md"))) {
    counts.sessions = (counts.sessions || 0) + 1;
    let data;
    try {
      data = matter(fs.readFileSync(path.join(sessionDir, f), "utf8")).data;
    } catch (e) {
      fail(f, "unparseable frontmatter — " + e.message);
      continue;
    }
    if (!data.artist || !String(data.artist).trim()) fail(f, "missing artist");
    const hasYt =
      (data.youtube_id && String(data.youtube_id).trim()) ||
      (data.youtube_url && String(data.youtube_url).trim());
    if (!hasYt) fail(f, "missing youtube_id or youtube_url");
    if (data.thumbnail && String(data.thumbnail).startsWith("/assets/") && !assetExists(data.thumbnail))
      fail(f, `thumbnail not found on disk: ${data.thumbnail}`);
  }
}

// --- news ---------------------------------------------------------------
const newsDir = path.join(root, "content/news");
if (fs.existsSync(newsDir)) {
  for (const f of fs.readdirSync(newsDir).filter((f) => f.endsWith(".md"))) {
    counts.news++;
    let data;
    try {
      data = matter(fs.readFileSync(path.join(newsDir, f), "utf8")).data;
    } catch (e) {
      fail(f, "unparseable frontmatter — " + e.message);
      continue;
    }
    if (!data.title || !String(data.title).trim()) fail(f, "missing title");
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr(data.date)))
      fail(f, `date must be YYYY-MM-DD (got ${JSON.stringify(data.date)})`);
    if (data.image && String(data.image).startsWith("/assets/") && !assetExists(data.image))
      fail(f, `image not found on disk: ${data.image}`);
  }
}

// --- report -------------------------------------------------------------
if (errors.length) {
  console.error(`\nx Content validation failed (${errors.length}):\n`);
  for (const e of errors) console.error("  - " + e);
  console.error("");
  process.exit(1);
}
console.log(
  `Content valid: ${counts.songs} songs, ${counts.sessions} sessions, ` +
    `${counts.news} news posts, ${counts.pages} page files, ${counts.json} JSON files.`
);
