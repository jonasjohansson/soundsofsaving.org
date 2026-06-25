#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  parse-news.js — extract the 70 Webflow news posts from the local
 *  wget mirror into Pages-CMS-style Markdown files.
 *
 *  Source : the mirrored HTML under  <MIRROR>/news/<slug>.html
 *  Output : content/news/<slug>.md   (frontmatter + Markdown body)
 *           src/assets/img/news/...  (rehosted hero + inline images)
 *
 *  For every post we pull:
 *    - title    : the single <h1>  (og:title fallback)
 *    - date     : "Month DD, YYYY" inside .heading-3  -> ISO YYYY-MM-DD
 *    - author   : optional, from .paragraph-9 ("By <Name>" or a bare name)
 *    - summary  : post-specific og:description, else first body sentence
 *    - image    : post-specific og:image, downloaded locally
 *    - body     : the .w-richtext block(s) -> clean Markdown, with the
 *                 short subtitle block folded in and CDN images rehosted.
 *
 *  Run:  node scripts/parse-news.js
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const https = require("https");
const cheerio = require("cheerio");

const REPO = path.join(__dirname, "..");
const MIRROR = process.env.SOS_MIRROR ||
  "/private/tmp/claude-501/-Users-jonas-Documents-GitHub-org-jonasjohansson-skynet/93629cee-452e-4961-8446-e07dd1fcb140/scratchpad/sos-mirror/www.soundsofsaving.org/news";
const OUT_DIR = path.join(REPO, "content", "news");
const IMG_DIR = path.join(REPO, "src", "assets", "img", "news");
const REPORT = path.join(REPO, "docs", "scrape-report.md");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

const DATE_RE = /[A-Z][a-z]+ \d{1,2}, 20\d{2}/;
const MONTHS = {
  january: "01", february: "02", march: "03", april: "04", may: "05",
  june: "06", july: "07", august: "08", september: "09", october: "10",
  november: "11", december: "12",
};

// ---- helpers -------------------------------------------------------

function toISO(dateStr) {
  const m = dateStr.match(/([A-Z][a-z]+) (\d{1,2}), (20\d{2})/);
  if (!m) return "";
  const mm = MONTHS[m[1].toLowerCase()];
  if (!mm) return "";
  return `${m[3]}-${mm}-${String(m[2]).padStart(2, "0")}`;
}

// download a remote file to disk (skips if it already exists). Follows one
// redirect. Returns true on success.
function download(url, dest) {
  return new Promise((resolve) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return resolve(true);
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        file.close();
        fs.rmSync(dest, { force: true });
        return resolve(download(res.headers.location, dest));
      }
      if (res.statusCode !== 200) {
        res.resume();
        file.close();
        fs.rmSync(dest, { force: true });
        return resolve(false);
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(true)));
    });
    req.on("error", () => {
      file.close();
      fs.rmSync(dest, { force: true });
      resolve(false);
    });
    req.setTimeout(30000, () => req.destroy());
  });
}

// derive a stable, readable local filename for a rehosted Webflow image.
// Webflow asset names look like "<hash>_<Real Name>.jpg" — keep the tail.
function localImageName(slug, url, idx) {
  let ext = (path.extname(new URL(url).pathname).split("?")[0] || ".jpg").toLowerCase();
  if (!/^\.(jpe?g|png|gif|webp|avif)$/.test(ext)) ext = ".jpg";
  return idx === 0 ? `${slug}${ext}` : `${slug}-${idx}${ext}`;
}

// pull the post-specific OG meta value: Webflow emits the per-post block
// FIRST, then a sitewide "Sounds of Saving" fallback. We want the first.
function ogValue($, prop) {
  let val = "";
  $(`meta[property="${prop}"], meta[name="${prop.replace("og:", "twitter:")}"]`).each((_, el) => {
    if (val) return;
    const c = $(el).attr("content");
    if (c != null && c.trim()) val = c.trim();
  });
  return val;
}
function ogFirst($, prop) {
  // strictly the first matching meta (post-specific), even if empty
  const el = $(`meta[property="${prop}"]`).first();
  return el.length ? (el.attr("content") || "").trim() : "";
}

const escMd = (s) => s.replace(/([\\`*_[\]])/g, "\\$1");

// ---- body -> Markdown ----------------------------------------------
// Walk a .w-richtext block and emit clean Markdown. Inline CDN images are
// queued for download and rewritten to /assets/img/news/<file>. External
// links are kept. Webflow wrapper cruft (data-*, empty figures) is dropped.

function makeBodyConverter(slug, imageQueue, usedNames) {
  function inline($, el) {
    let out = "";
    $(el).contents().each((_, n) => {
      if (n.type === "text") {
        out += n.data.replace(/\s+/g, " ");
      } else if (n.type === "tag") {
        const tag = n.tagName.toLowerCase();
        const inner = inline($, n).trim();
        if (tag === "a") {
          const href = ($(n).attr("href") || "").trim();
          if (href && inner) out += `[${inner}](${href})`;
          else out += inner;
        } else if (tag === "strong" || tag === "b") {
          out += inner ? `**${inner}**` : "";
        } else if (tag === "em" || tag === "i") {
          out += inner ? `*${inner}*` : "";
        } else if (tag === "br") {
          out += "\n";
        } else {
          out += inner;
        }
      }
    });
    return out;
  }

  function rehost(src) {
    if (!src) return "";
    src = src.replace(/&amp;/g, "&");
    if (!/cdn\.prod\.website-files\.com/.test(src)) return src; // keep non-Webflow
    let name;
    for (let i = 0; ; i++) {
      name = localImageName(slug, src, imageQueue.length + i);
      if (!usedNames.has(name)) break;
    }
    usedNames.add(name);
    imageQueue.push({ url: src, name });
    return `/assets/img/news/${name}`;
  }

  function block($, el) {
    const tag = el.tagName.toLowerCase();
    const txt = inline($, el).replace(/[ \t]+\n/g, "\n").trim();

    if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(6, parseInt(tag[1], 10) + 1); // demote: page h1 is the title
      return txt ? `${"#".repeat(level)} ${txt}` : "";
    }
    if (tag === "p") return txt;
    if (tag === "blockquote") {
      return txt ? txt.split("\n").map((l) => `> ${l}`.trimEnd()).join("\n") : "";
    }
    if (tag === "ul" || tag === "ol") {
      const items = [];
      $(el).children("li").each((i, li) => {
        const t = inline($, li).replace(/\s+/g, " ").trim();
        if (t) items.push(tag === "ol" ? `${i + 1}. ${t}` : `- ${t}`);
      });
      return items.join("\n");
    }
    if (tag === "figure") {
      const img = $(el).find("img").first();
      if (img.length) {
        const local = rehost(img.attr("src") || "");
        const alt = (img.attr("alt") || "").trim();
        const cap = $(el).find("figcaption").first().text().trim();
        let out = local ? `![${escMd(alt)}](${local})` : "";
        if (cap) out += `\n\n*${escMd(cap)}*`;
        return out;
      }
      const iframe = $(el).find("iframe").first();
      if (iframe.length) {
        // embeds (Spotify / YouTube via embedly) -> a plain link, no iframe cruft
        let src = (iframe.attr("src") || "").replace(/&amp;/g, "&");
        const m = src.match(/[?&]url=([^&]+)/);
        if (m) src = decodeURIComponent(m[1]);
        const title = (iframe.attr("title") || "Embedded media").trim();
        return src ? `[${escMd(title)}](${src})` : "";
      }
      return "";
    }
    if (tag === "img") {
      const local = rehost($(el).attr("src") || "");
      const alt = ($(el).attr("alt") || "").trim();
      return local ? `![${escMd(alt)}](${local})` : "";
    }
    // generic container: recurse over children
    return children($, el);
  }

  function children($, el) {
    const parts = [];
    $(el).children().each((_, c) => {
      const b = block($, c).trim();
      if (b) parts.push(b);
    });
    return parts.join("\n\n");
  }

  return { children, inline, rehost };
}

// strip soft hyphens / zero-width chars Webflow injects into richtext
function clean(s) {
  return s.replace(/[​‌‍­﻿]/g, "");
}

// ---- main ----------------------------------------------------------

async function main() {
  const files = fs.readdirSync(MIRROR).filter((f) => f.endsWith(".html")).sort();
  const parsed = [];
  const skipped = [];
  const notes = [];

  for (const f of files) {
    const slug = f.replace(/\.html$/, "");
    const html = clean(fs.readFileSync(path.join(MIRROR, f), "utf8"));
    const $ = cheerio.load(html);

    // title
    let title = ($("h1").first().text() || "").trim();
    if (!title) title = ogFirst($, "og:title");
    title = title.replace(/\s+/g, " ").trim();

    // date (required)
    let dateStr = "";
    $(".heading-3").each((_, el) => {
      if (dateStr) return;
      const m = $(el).text().match(DATE_RE);
      if (m) dateStr = m[0];
    });
    if (!dateStr) {
      const m = html.match(DATE_RE);
      if (m) dateStr = m[0];
    }
    const date = toISO(dateStr);

    if (!title || !date) {
      skipped.push({ slug, reason: !title ? "no title" : "no date" });
      continue;
    }

    // author (optional)
    let author = "";
    $(".paragraph-9").each((_, el) => {
      if (author) return;
      let t = $(el).text().replace(/\s+/g, " ").trim();
      if (!t || DATE_RE.test(t)) return;
      const by = t.match(/^By\s+(.+)$/i);
      if (by) t = by[1].trim();
      // sanity: a byline, not a paragraph of prose
      if (t.length >= 2 && t.length <= 60 && !/[.!?]$/.test(t)) author = t;
    });

    // hero image (post-specific og:image)
    const heroUrl = ogFirst($, "og:image");
    let image = "";
    if (heroUrl && /cdn\.prod\.website-files\.com/.test(heroUrl)) {
      const name = localImageName(slug, heroUrl, 0);
      const ok = await download(heroUrl, path.join(IMG_DIR, name));
      if (ok) image = `/assets/img/news/${name}`;
      else notes.push(`hero download failed for ${slug}`);
    }

    // body: concat the .w-richtext blocks in document order. The first short
    // block is a subtitle; the second is the article. Hero image lives between
    // them in the DOM and is captured via og:image, so we skip it in-body.
    const imageQueue = [];
    const usedNames = new Set();
    if (image) usedNames.add(path.basename(image));
    const conv = makeBodyConverter(slug, imageQueue, usedNames);

    const blocks = $(".w-richtext").toArray();
    const rendered = [];
    blocks.forEach((b, i) => {
      const md = conv.children($, b).trim();
      if (!md) return;
      // fold the short lead-in block as an emphasised intro line
      if (i === 0 && blocks.length > 1 && md.length < 200 && !md.includes("\n")) {
        rendered.push(`*${md.replace(/^\*+|\*+$/g, "").trim()}*`);
      } else {
        rendered.push(md);
      }
    });
    let body = rendered.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    // collapse the adjacent-emphasis run Webflow leaves between two bolded
    // inline spans ("**a****b**" -> "**ab**") so it never renders as literal "****"
    body = body.replace(/\*{4,}/g, "");

    // download any inline images queued during conversion
    for (const im of imageQueue) {
      const ok = await download(im.url, path.join(IMG_DIR, im.name));
      if (!ok) {
        notes.push(`inline image download failed for ${slug}: ${im.name}`);
        // leave the local path; build still works, image just 404s
      }
    }

    // summary: post-specific og:description, else first sentence of body prose
    let summary = ogFirst($, "og:description");
    if (!summary) {
      // first real prose line (allow an emphasised lead-in; skip headings,
      // images and block-quotes). Strip md markers for a clean meta string.
      const firstPara = body
        .split("\n")
        .map((l) => l.trim())
        .find((l) => {
          if (!l || l.startsWith("#") || l.startsWith("!") || l.startsWith(">")) return false;
          const plain = l.replace(/[*_`]/g, "").trim();
          return plain.length > 20;
        });
      if (firstPara) {
        const plain = firstPara.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").trim();
        summary = plain.length > 200 ? plain.slice(0, 197).replace(/\s+\S*$/, "") + "..." : plain;
      }
    }
    summary = summary.replace(/\s+/g, " ").trim();

    // ---- write frontmatter + body ----
    const fm = ["---"];
    fm.push(`title: ${yaml(title)}`);
    fm.push(`date: ${date}`);
    if (author) fm.push(`author: ${yaml(author)}`);
    if (image) fm.push(`image: ${image}`);
    if (summary) fm.push(`summary: ${yaml(summary)}`);
    fm.push("---");
    const out = fm.join("\n") + "\n\n" + body + "\n";
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.md`), out);

    parsed.push({ slug, title, date, author, image, hasBody: !!body });
  }

  // ---- report ----
  parsed.sort((a, b) => b.date.localeCompare(a.date));
  console.log(`Parsed ${parsed.length} posts -> content/news/`);
  if (skipped.length) console.log("Skipped:", skipped);

  const donor = parsed.find((p) => p.slug === "donor-thanks-email");
  let section = "\n## News parse\n\n";
  section += `Parsed **${parsed.length} / ${files.length}** mirrored news posts into ` +
    "`content/news/*.md` via `scripts/parse-news.js` (cheerio DOM walk). " +
    "Body = the two `.w-richtext` blocks per post converted to clean Markdown " +
    "(short lead block folded in as an emphasised intro), hero image from the " +
    "post-specific `og:image`, inline figures rehosted from the Webflow CDN into " +
    "`src/assets/img/news/`.\n\n";
  if (skipped.length) {
    section += "Skipped (no usable title/date):\n";
    for (const s of skipped) section += `- \`${s.slug}\` — ${s.reason}\n`;
    section += "\n";
  } else {
    section += "No posts failed extraction (every mirrored post had a title + date).\n\n";
  }
  if (donor) {
    section += "Note: `donor-thanks-email` is a fundraising thank-you letter rather than an " +
      "editorial article, but it carries a valid title, date and body, so it was parsed " +
      "rather than dropped. Remove the file if a non-article should be excluded.\n\n";
  }
  if (notes.length) {
    section += "Asset warnings:\n";
    for (const n of [...new Set(notes)]) section += `- ${n}\n`;
    section += "\n";
  } else {
    section += "All hero and inline images downloaded successfully.\n\n";
  }

  let report = fs.readFileSync(REPORT, "utf8");
  report = report.replace(/\n## News parse[\s\S]*$/, "\n").trimEnd() + "\n";
  fs.writeFileSync(REPORT, report + section);
  console.log("Appended '## News parse' to docs/scrape-report.md");
}

// minimal YAML scalar quoting (double-quote + escape) for frontmatter strings
function yaml(s) {
  s = String(s);
  if (/^[\w][\w .,'!?&()/-]*$/.test(s) && !/^(true|false|null|yes|no)$/i.test(s) && !/^\d/.test(s)) {
    // safe enough unquoted, but quote anything with a colon
    if (!s.includes(":")) return s;
  }
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

main().catch((e) => { console.error(e); process.exit(1); });
