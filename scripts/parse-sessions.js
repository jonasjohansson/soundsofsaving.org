#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  parse-sessions.js — build the "Songs That Found Me at the Right
 *  Time" SESSIONS collection (the flagship video series) as one
 *  Markdown file per episode under content/sessions/, plus a YouTube
 *  thumbnail per episode under src/assets/img/sessions/<id>.jpg.
 *
 *  SOURCES (unioned + deduped by YouTube id):
 *    1. The mirrored series landing page — its embedly oEmbed cards
 *       expose every episode's YouTube id. Authoritative titles come
 *       from each video's YouTube oEmbed; song names come from the
 *       landing-page headings where the oEmbed omits them.
 *    2. The YouTube playlist PLrBVhh4EJvMOjNUKZO4C07XwSj0EAD0XH.
 *  The reconciled, hand-verified result of that union lives in
 *  scripts/sessions-seed.json, which THIS script consumes. Re-derive
 *  the seed with the commands documented in docs/scrape-report.md;
 *  this script is the deterministic, re-runnable build step over it.
 *
 *  Re-runnable: only writes a .md if it does not already exist, so any
 *  CMS-authored story / pull_quote is never clobbered. Pass --force to
 *  rewrite frontmatter while preserving the existing body + pull_quote.
 *  Thumbnails are only downloaded when missing (needs network for new
 *  ids); pass --no-download to skip the network entirely.
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const https = require("https");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const SEED = path.join(__dirname, "sessions-seed.json");
const OUT_DIR = path.join(ROOT, "content", "sessions");
const IMG_DIR = path.join(ROOT, "src", "assets", "img", "sessions");
const REPORT = path.join(ROOT, "docs", "scrape-report.md");

const FORCE = process.argv.includes("--force");
const NO_DOWNLOAD = process.argv.includes("--no-download");

// Lead the index with these (strongest names / clearest hooks).
const FEATURED = new Set([
  "jpguLriXLik", // Sharon Van Etten
  "eCLoUHG8uEI", // Bartees Strange
  "dMOTwpBm1x0", // Indigo Sparke
  "XC7GRIRqNW8", // CHAI
]);

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

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });
    req.on("error", (e) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(e);
    });
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const seed = JSON.parse(fs.readFileSync(SEED, "utf8"));
  const episodes = Array.isArray(seed.episodes) ? seed.episodes : [];

  const failures = [];
  const written = [];
  const usedSlugs = new Set();

  for (const e of episodes) {
    const id = String(e.youtube_id || "").trim();
    if (!id) {
      failures.push(`(no id) "${e.artist || e.song_title || "?"}"`);
      continue;
    }
    const artist = String(e.artist || "").trim();
    const song_title = String(e.song_title || "").trim();
    const covers = String(e.covers || "").trim();
    const date = String(e.date || "").trim();
    const kind = String(e.kind || "").trim();

    if (!artist) {
      failures.push(`${id} — missing artist`);
    }

    // unique slug, derived from artist (+ song when present)
    const base = song_title ? `${artist} ${song_title}` : artist || id;
    let slug = slugify(base) || id;
    while (usedSlugs.has(slug)) slug = `${slug}-${id.slice(0, 4).toLowerCase()}`;
    usedSlugs.add(slug);

    // thumbnail — download only when missing
    const thumbFile = path.join(IMG_DIR, `${id}.jpg`);
    const thumbWeb = `/assets/img/sessions/${id}.jpg`;
    if (!fs.existsSync(thumbFile) && !NO_DOWNLOAD) {
      try {
        await download(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, thumbFile);
      } catch (err) {
        failures.push(`${id} "${artist}" — thumbnail download failed: ${err.message}`);
      }
    }
    if (!fs.existsSync(thumbFile)) {
      failures.push(`${id} "${artist}" — thumbnail missing on disk`);
    }

    // never clobber CMS-authored body / pull_quote
    const mdPath = path.join(OUT_DIR, `${slug}.md`);
    let existingStory = "";
    let existingPull = "";
    if (fs.existsSync(mdPath)) {
      const g = matter(fs.readFileSync(mdPath, "utf8"));
      existingStory = (g.content || "").trim();
      existingPull = g.data.pull_quote || "";
      if (!FORCE) {
        written.push({ slug, id, artist, song_title, kept: true });
        continue;
      }
    }

    const ordered = {
      artist,
      song_title,
      ...(covers ? { covers } : {}),
      ...(date ? { date } : {}),
      ...(kind ? { kind } : {}),
      youtube_url: `https://youtu.be/${id}`,
      youtube_id: id,
      thumbnail: thumbWeb,
      featured: FEATURED.has(id),
      pull_quote: existingPull,
    };

    const md = matter.stringify("\n" + existingStory + "\n", ordered);
    fs.writeFileSync(mdPath, md);
    written.push({ slug, id, artist, song_title });
  }

  // ---- report -----------------------------------------------------
  const lines = [];
  lines.push("");
  lines.push("## Sessions parse");
  lines.push("");
  lines.push(`- Seed: scripts/sessions-seed.json`);
  lines.push(`- Episodes in seed: ${episodes.length}`);
  lines.push(`- Content files (written or present): ${written.length}`);
  lines.push("");
  for (const w of written) {
    const t = w.song_title ? `${w.artist} — ${w.song_title}` : w.artist;
    lines.push(`  - ${w.kept ? "[kept] " : ""}${w.slug}.md  (${w.id})  ${t}`);
  }
  if (failures.length) {
    lines.push("");
    lines.push("### Failures / notes");
    for (const f of failures) lines.push(`  - ${f}`);
  } else {
    lines.push("");
    lines.push("- No failures.");
  }
  fs.appendFileSync(REPORT, lines.join("\n") + "\n");

  console.log(`Episodes: ${episodes.length} | content files: ${written.length} | issues: ${failures.length}`);
  for (const w of written) {
    console.log(
      `  ${w.kept ? "kept" : "wrote"} ${w.slug}.md  (${w.id})  ${w.artist}${w.song_title ? " — " + w.song_title : ""}`
    );
  }
  if (failures.length) {
    console.log("Issues:");
    for (const f of failures) console.log("  " + f);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
