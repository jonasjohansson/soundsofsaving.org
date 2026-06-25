/* ------------------------------------------------------------------ *
 *  Build-time CMS: the "Songs That Found Me at the Right Time" series.
 *
 *  The series lives as a YouTube playlist, not as site pages, so the
 *  collection is built FROM the playlist by scripts/parse-songs.js, which
 *  writes one Markdown file per episode into content/songs/. Editors then
 *  enrich pull_quote / story via Pages CMS (each save commits the file and
 *  triggers a rebuild). This data file reads those files and hands a clean
 *  array to the templates. No external service at build time.
 *
 *    content/songs/*.md        — one file per episode (frontmatter + story)
 *    src/assets/img/songs/*.jpg — YouTube thumbnails (downloaded by parser)
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { imageSize } = require("image-size");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const CONTENT = path.join(__dirname, "..", "..", "content", "songs");
const ASSETS = path.join(__dirname, "..", "assets");

// intrinsic dimensions of a local image (root-absolute path like
// "/assets/img/songs/<id>.jpg"); null for external/missing files so the
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

// trim free text to a clean ~155-char meta excerpt on a word boundary.
function excerptOf(text, max = 155) {
  const s = String(text || "")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[.,;:-]\s*$/, "") + "…";
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

// robust YYYY-MM-DD, tolerant of YAML date objects (if the CMS rewrites the
// date field unquoted, js-yaml parses it to a Date).
function ymd(v) {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// pull a YouTube id out of any common URL/id form (or pass an id through).
function youtubeId(s = "") {
  const str = String(s).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;
  const m = str.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

module.exports = function () {
  const files = fs.existsSync(CONTENT)
    ? fs.readdirSync(CONTENT).filter((f) => f.endsWith(".md"))
    : [];

  let songs = files
    .map((f) => {
      const g = matter(fs.readFileSync(path.join(CONTENT, f), "utf8"));
      const d = g.data || {};
      const slug = f.replace(/\.md$/, "") || slugify(`${d.artist} ${d.song_title}`);
      const id = youtubeId(d.youtube_id || d.youtube_url || "");
      const story = (g.content || "").trim();
      const pull_quote = (d.pull_quote || "").trim();
      const thumbnail = d.thumbnail || (id ? `/assets/img/songs/${id}.jpg` : "");
      const artist = (d.artist || "").trim();
      const song_title = (d.song_title || "").trim();

      return {
        slug,
        url: `/songs/${slug}/`,
        artist,
        song_title,
        title: song_title ? `${artist}: ${song_title}` : artist,
        date: ymd(d.date),
        youtube_id: id,
        youtube_url: d.youtube_url || (id ? `https://youtu.be/${id}` : ""),
        embed_url: id ? `https://www.youtube-nocookie.com/embed/${id}` : "",
        thumbnail,
        dims: dimsOf(thumbnail),
        featured: d.featured === true || d.featured === "true",
        pull_quote,
        story,
        storyHtml: story ? md.render(story) : "",
        excerpt: excerptOf(pull_quote || story || (song_title ? `${artist} performs ${song_title}.` : artist)),
      };
    })
    .filter((s) => s.artist || s.song_title);

  // featured first; then by date desc when present; else by title.
  songs.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return a.title.localeCompare(b.title, "en");
  });

  if (!songs.length) {
    // Don't hard-fail the whole build over an empty series; the index simply
    // renders its intro. (Events are the site's required content, not songs.)
    console.warn("[songs] no content/songs/*.md found — index will be empty.");
  }

  return songs;
};
