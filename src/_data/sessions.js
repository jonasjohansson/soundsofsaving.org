/* ------------------------------------------------------------------ *
 *  Build-time data: the "Songs That Found Me at the Right Time" SESSIONS
 *  series — the site's flagship video series (~37 episodes, 2018–2023).
 *
 *  The series lives as YouTube videos, not as site pages. The collection
 *  is built FROM those videos by scripts/parse-sessions.js (which unions
 *  the mirrored landing page's oEmbed cards with the YouTube playlist),
 *  writing one Markdown file per episode into content/sessions/. Editors
 *  then enrich pull_quote / story via Pages CMS (each save commits the
 *  file and triggers a rebuild). This data file reads those files and
 *  hands a clean, sorted array to the templates. No service at build time.
 *
 *    content/sessions/*.md         — one file per episode (frontmatter + story)
 *    src/assets/img/sessions/*.jpg — YouTube thumbnails (downloaded by parser)
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");
const { dimsOf, excerptOf, slugify, ymd, youtubeId } = require("../../lib/content");

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const CONTENT = path.join(__dirname, "..", "..", "content", "sessions");

module.exports = function () {
  const files = fs.existsSync(CONTENT)
    ? fs.readdirSync(CONTENT).filter((f) => f.endsWith(".md"))
    : [];

  let sessions = files
    .map((f) => {
      const g = matter(fs.readFileSync(path.join(CONTENT, f), "utf8"));
      const d = g.data || {};
      const slug = f.replace(/\.md$/, "") || slugify(`${d.artist} ${d.song_title}`);
      const id = youtubeId(d.youtube_id || d.youtube_url || "");
      const story = (g.content || "").trim();
      const pull_quote = (d.pull_quote || "").trim();
      const thumbnail = d.thumbnail || (id ? `/assets/img/sessions/${id}.jpg` : "");
      const artist = (d.artist || "").trim();
      const song_title = (d.song_title || "").trim();
      const covers = (d.covers || "").trim();
      const kind = (d.kind || "").trim(); // "", "short", or "favorite"

      // human-readable "what they chose" line for cards / meta
      let chose = "";
      if (song_title && covers) chose = `${song_title} (${covers})`;
      else if (song_title) chose = song_title;
      else if (covers) chose = `a ${covers} song`;

      const metaArtist = covers
        ? `${artist} covers ${covers}${song_title ? ` — "${song_title}"` : ""}.`
        : song_title
        ? `${artist} — "${song_title}".`
        : artist;

      return {
        slug,
        url: `/sessions/${slug}/`,
        artist,
        song_title,
        covers,
        chose,
        kind,
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
        excerpt: excerptOf(pull_quote || story || metaArtist),
      };
    })
    .filter((s) => s.artist || s.song_title);

  // featured first; then by date desc when present; else by title.
  sessions.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return a.title.localeCompare(b.title, "en");
  });

  if (!sessions.length) {
    console.warn("[sessions] no content/sessions/*.md found — index will be empty.");
  }

  return sessions;
};
