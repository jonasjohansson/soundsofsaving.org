/* ------------------------------------------------------------------ *
 *  News collection — read the Markdown posts in content/news/*.md
 *  (parsed from the original Webflow mirror by scripts/parse-news.js,
 *  editable afterwards via Pages CMS) and hand them to the templates.
 *
 *    content/news/<slug>.md     — frontmatter (title, date, author?,
 *                                 image?, summary) + Markdown body
 *    src/assets/img/news/        — rehosted hero + inline images
 *
 *  Each post is normalised to a flat object with a pre-rendered HTML
 *  body and a clean text excerpt, sorted newest-first. Modelled on
 *  lumenproject.se/src/_data/lumen.js.
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { imageSize } = require("image-size");
const MarkdownIt = require("markdown-it");

const CONTENT = path.join(__dirname, "..", "..", "content", "news");
const ASSETS = path.join(__dirname, "..", "assets");

const md = new MarkdownIt({ html: true, linkify: true, typographer: false });

// intrinsic dimensions of a local image (root-absolute "/assets/img/news/x.jpg");
// null for external/missing so templates omit width/height rather than lie.
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

// strip markdown/HTML to a clean ~160-char excerpt on a word boundary
// (for index teasers / og:description when no summary is set).
function excerptOf(text, max = 160) {
  const s = String(text || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")      // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")     // links -> text
    .replace(/[#>*_`~]/g, " ")                   // md markers
    .replace(/<[^>]+>/g, " ")                    // any stray html
    .replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[.,;:-]\s*$/, "") + "...";
}

module.exports = function () {
  const files = fs.existsSync(CONTENT)
    ? fs.readdirSync(CONTENT).filter((f) => f.endsWith(".md"))
    : [];

  // Category -> URL section. The redesign retires the flat /news/ dump; each
  // post's new home is derived from its `category` frontmatter (set by
  // scripts/tag-posts.js), so files never move. learn + resource-sheet +
  // whitepaper all live under /learn/ (the Get Help "learn" layer / About);
  // stories under /stories/, perishables under /archive/.
  const SECTION = {
    story: "stories",
    archive: "archive",
    learn: "learn",
    "resource-sheet": "learn",
    whitepaper: "learn",
  };

  let posts = files.map((f) => {
    const g = matter(fs.readFileSync(path.join(CONTENT, f), "utf8"));
    const d = g.data || {};
    const slug = f.replace(/\.md$/, "");
    const date = ymd(d.date);
    const image = d.image || "";
    const bodyMd = (g.content || "").trim();
    const summary = (d.summary ? String(d.summary) : "").replace(/\s+/g, " ").trim();
    const category = (d.category ? String(d.category).trim() : "story");
    const cluster = d.cluster ? String(d.cluster).trim() : null;
    const section = SECTION[category] || "stories";
    return {
      title: (d.title || "").trim(),
      slug,
      category,
      cluster,
      section,
      // the a-sound-approach white paper links straight to the hosted PDF
      // instead of generating an on-site page.
      url: category === "whitepaper"
        ? "https://drive.google.com/file/d/1fMIfsbp3okh9TT1phHb9hnZpu9_zCzTz/view"
        : `/${section}/${slug}/`,
      oldUrl: `/news/${slug}/`,        // legacy URL, kept for 301 redirects
      date,
      year: date ? date.slice(0, 4) : "",
      author: d.author ? String(d.author).trim() : null,
      image,
      dims: dimsOf(image),
      summary,
      body: bodyMd ? md.render(bodyMd) : "",
      excerpt: summary || excerptOf(bodyMd),
    };
  }).filter((p) => p.title && p.date);

  // newest first
  posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (!posts.length) {
    throw new Error("No news posts found in content/news — aborting build to avoid an empty /news.");
  }

  // ---- Typed subsets for the new templates (back-compatible: `posts` is
  // still the full newest-first array, so anything iterating `news` works). ----
  const byCat = (c) => posts.filter((p) => p.category === c);
  const stories = byCat("story");
  const learn = posts.filter((p) => p.section === "learn"); // learn + resource-sheet + whitepaper
  const archive = byCat("archive");

  // Stories grouped by cluster, in a curated display order.
  const STORY_CLUSTERS = [
    { slug: "interviews", label: "Interviews" },
    { slug: "features", label: "Features" },
    { slug: "reviews", label: "Reviews" },
  ];
  const storyClusters = STORY_CLUSTERS
    .map((c) => ({ ...c, posts: stories.filter((p) => (p.cluster || "features") === c.slug) }))
    .filter((c) => c.posts.length);
  // Surface stories that would silently vanish from /stories/ via an unknown cluster.
  const knownClusters = new Set(STORY_CLUSTERS.map((c) => c.slug));
  stories.forEach((p) => {
    const c = p.cluster || "features";
    if (!knownClusters.has(c)) console.warn(`[news] story "${p.slug}" has unknown cluster "${c}" — not shown on /stories/`);
  });

  // attach subsets as enumerable props on the array so templates can read
  // either `news` (the array) or `news.stories` / `news.learn` / etc.
  posts.stories = stories;
  posts.learn = learn;
  // learn cards for Get Help: explainers + resource sheets, but NOT the
  // a-sound-approach white paper (that surfaces on About).
  posts.learnForGetHelp = learn.filter((p) => p.category !== "whitepaper");
  posts.archive = archive;
  // Posts that generate their own on-site page (the white paper links out to a PDF).
  posts.pages = posts.filter((p) => p.category !== "whitepaper");
  posts.storyClusters = storyClusters;

  return posts;
};
