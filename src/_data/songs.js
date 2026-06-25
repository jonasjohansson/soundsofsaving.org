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
const MarkdownIt = require("markdown-it");
const { dimsOf, excerptOf, slugify, ymd, youtubeId } = require("../../lib/content");

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const CONTENT = path.join(__dirname, "..", "..", "content", "songs");

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
