#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  parse-songs.js — build the "Songs That Found Me at the Right Time"
 *  collection FROM the YouTube playlist (the series lives as a playlist,
 *  not as site pages). For each playlist video this writes one
 *  content/songs/<slug>.md (frontmatter the Pages CMS can later enrich)
 *  and downloads its thumbnail to src/assets/img/songs/<id>.jpg.
 *
 *  Input: a yt-dlp dump of the playlist. We try, in order:
 *    1. an existing JSONL dump   (scripts ... > full.jsonl, one obj/line)
 *    2. an existing single-json  (--dump-single-json, { entries: [...] })
 *    3. run yt-dlp ourselves     (needs network + yt-dlp on PATH)
 *
 *  Re-runnable: only writes a .md if it does not already exist, so the
 *  CMS-editable story/pull_quote fields are never clobbered. Pass
 *  --force to rewrite frontmatter (keeps any existing story/pull_quote).
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const SONGS_DIR = path.join(ROOT, "content", "songs");
const IMG_DIR = path.join(ROOT, "src", "assets", "img", "songs");
const REPORT = path.join(ROOT, "docs", "scrape-report.md");

const PLAYLIST_ID = "PLrBVhh4EJvMOjNUKZO4C07XwSj0EAD0XH";
const PLAYLIST_URL = `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`;

const FORCE = process.argv.includes("--force");

// First explicit path argument (not a flag) is treated as a dump file.
const argPath = process.argv.slice(2).find((a) => !a.startsWith("--"));

// ------------------------------------------------------------------ //
// helpers
// ------------------------------------------------------------------ //
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

// yt-dlp upload_date is "YYYYMMDD"; we want "YYYY-MM-DD" (or "" if absent).
const ymd = (d) => {
  const m = String(d || "").match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
};

// Channels that are clearly YouTube re-uploaders / aggregators, not the
// performing artist — so we should NOT treat the uploader as the artist.
const NON_ARTIST_UPLOADER =
  /\b(VEVO|Topic|Records|Music|Official|TV|Channel|Lyrics|HD|HQ|Vinyl|Archive|Sounds of Saving)\b/i;
const looksLikeHandle = (u = "") =>
  /\d{2,}$|^user|^UC[\w-]{20,}$/i.test(u) || /[A-Z]\.\s*[A-Z]/.test(u);

// Split a video title into { artist, song } where the format allows.
// Handles "Artist - Song", "Artist ~ Song", "Artist | Song", "Artist: Song",
// "Artist covers ...". Returns { artist, song } with song possibly "".
function parseTitle(rawTitle, uploader) {
  let title = String(rawTitle || "")
    .replace(/\s*\((official|official video|official audio|audio|lyrics|lyric video|hd|hq|live|visualizer)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // "<Artist> covers <Other>'s "Song" for Sounds of Saving" (SoS productions)
  let m = title.match(/^(.+?)\s+covers\s+.+?["“](.+?)["”]/i);
  if (m) return { artist: m[1].trim(), song: m[2].trim() };
  m = title.match(/^(.+?)\s+covers\s+(.+?)(?:\s+for\s+Sounds of Saving)?$/i);
  if (m) return { artist: m[1].trim(), song: m[2].trim() };

  // explicit "Artist - Song" style separators (longest-first so " - " wins)
  for (const sep of [" - ", " – ", " — ", " ~ ", " | ", " // ", " : "]) {
    const i = title.indexOf(sep);
    if (i > 0) {
      const artist = title.slice(0, i).trim();
      const song = title.slice(i + sep.length).trim();
      if (artist && song) return { artist, song };
    }
  }
  // "Artist: Song" (tight colon, no space)
  m = title.match(/^([^:]{2,40}):\s*(.+)$/);
  if (m && !/https?/i.test(m[1])) return { artist: m[1].trim(), song: m[2].trim() };

  // No separator. If the uploader looks like a real artist/band channel, use
  // it as the artist and the whole title as the song.
  const up = String(uploader || "").trim();
  if (up && !NON_ARTIST_UPLOADER.test(up) && !looksLikeHandle(up) && up.length <= 40) {
    return { artist: up, song: title };
  }
  // Last resort: cannot confidently split — whole title becomes the artist.
  return { artist: title, song: "" };
}

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

// ------------------------------------------------------------------ //
// load playlist entries
// ------------------------------------------------------------------ //
function loadEntries() {
  const tryFile = (p) => {
    if (!p || !fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8").trim();
    if (!raw) return null;
    // single-json playlist object?
    try {
      const obj = JSON.parse(raw);
      if (Array.isArray(obj)) return obj;
      if (obj && Array.isArray(obj.entries)) return obj.entries;
    } catch (_) {
      /* fall through to JSONL */
    }
    // JSONL (one object per line)
    const objs = [];
    for (const line of raw.split(/\n/)) {
      const s = line.trim();
      if (!s) continue;
      try {
        objs.push(JSON.parse(s));
      } catch (_) {}
    }
    return objs.length ? objs : null;
  };

  // explicit arg, then conventional locations, then yt-dlp itself
  const candidates = [argPath, path.join(ROOT, "scripts", "playlist.json")].filter(Boolean);
  for (const c of candidates) {
    const e = tryFile(c);
    if (e) return { entries: e, source: c };
  }

  // run yt-dlp (per-video dump gives upload_date + uploader)
  try {
    const out = execFileSync(
      "yt-dlp",
      ["--no-update", "--skip-download", "--dump-json", "--ignore-errors", PLAYLIST_URL],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
    const objs = out
      .trim()
      .split(/\n/)
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);
    if (objs.length) return { entries: objs, source: "yt-dlp" };
  } catch (e) {
    throw new Error(
      "Could not load playlist. Provide a yt-dlp dump as scripts/playlist.json " +
        "(or pass a path), or install yt-dlp. Underlying: " + e.message
    );
  }
  throw new Error("No playlist entries found.");
}

// ------------------------------------------------------------------ //
// main
// ------------------------------------------------------------------ //
async function main() {
  fs.mkdirSync(SONGS_DIR, { recursive: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const { entries, source } = loadEntries();
  const failures = [];
  const written = [];
  let seq = 0;

  for (const e of entries) {
    const id = e.id || e.youtube_id;
    if (!id) {
      failures.push(`(no id) "${e.title || "?"}"`);
      continue;
    }
    seq += 1;
    const featured = seq <= 3; // first ~3 lead the index

    let artist = "";
    let song_title = "";
    try {
      const parsed = parseTitle(e.title, e.uploader || e.channel);
      artist = parsed.artist;
      song_title = parsed.song;
    } catch (err) {
      failures.push(`${id} "${e.title}" — parse error: ${err.message}`);
    }
    if (!artist) {
      failures.push(`${id} "${e.title || ""}" — could not derive an artist`);
      artist = (e.title || id).trim();
    }

    const date = ymd(e.upload_date);
    const slugBase = song_title ? `${artist} ${song_title}` : artist || e.title || id;
    let slug = slugify(slugBase) || id;

    // thumbnail
    const thumbFile = path.join(IMG_DIR, `${id}.jpg`);
    const thumbWeb = `/assets/img/songs/${id}.jpg`;
    if (!fs.existsSync(thumbFile)) {
      try {
        await download(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, thumbFile);
      } catch (err) {
        failures.push(`${id} "${e.title}" — thumbnail download failed: ${err.message}`);
      }
    }

    // content file — never clobber CMS-authored story/pull_quote
    const mdPath = path.join(SONGS_DIR, `${slug}.md`);
    let existingStory = "";
    let existingPull = "";
    if (fs.existsSync(mdPath)) {
      const g = matter(fs.readFileSync(mdPath, "utf8"));
      existingStory = (g.content || "").trim();
      existingPull = g.data.pull_quote || "";
      if (!FORCE) {
        written.push({ slug, id, artist, song_title, skipped: true });
        continue;
      }
    }

    const data = {
      artist,
      song_title,
      youtube_url: `https://youtu.be/${id}`,
      youtube_id: id,
      thumbnail: thumbWeb,
      featured,
      pull_quote: existingPull,
    };
    if (date) data.date = date;

    // order keys for a clean, predictable file
    const ordered = {
      artist: data.artist,
      song_title: data.song_title,
      ...(date ? { date } : {}),
      youtube_url: data.youtube_url,
      youtube_id: data.youtube_id,
      thumbnail: data.thumbnail,
      featured: data.featured,
      pull_quote: data.pull_quote,
    };
    const md = matter.stringify("\n" + existingStory + "\n", ordered);
    fs.writeFileSync(mdPath, md);
    written.push({ slug, id, artist, song_title });
  }

  // ---- report -----------------------------------------------------
  const lines = [];
  lines.push("");
  lines.push("## Songs parse");
  lines.push("");
  lines.push(`- Source: ${source}`);
  lines.push(`- Playlist: ${PLAYLIST_URL}`);
  lines.push(`- Episodes processed: ${entries.length}`);
  lines.push(`- Content files (written or present): ${written.length}`);
  lines.push("");
  for (const w of written) {
    const t = w.song_title ? `${w.artist} — ${w.song_title}` : w.artist;
    lines.push(`  - ${w.skipped ? "[kept] " : ""}${w.slug}.md  (${w.id})  ${t}`);
  }
  if (failures.length) {
    lines.push("");
    lines.push("### Failures / unparsed");
    for (const f of failures) lines.push(`  - ${f}`);
  } else {
    lines.push("");
    lines.push("- No failures.");
  }
  fs.appendFileSync(REPORT, lines.join("\n") + "\n");

  console.log(`Source: ${source}`);
  console.log(`Episodes: ${entries.length} | content files: ${written.length} | failures: ${failures.length}`);
  for (const w of written) {
    console.log(`  ${w.skipped ? "kept" : "wrote"} ${w.slug}.md  (${w.id})  ${w.artist}${w.song_title ? " — " + w.song_title : ""}`);
  }
  if (failures.length) {
    console.log("Failures:");
    for (const f of failures) console.log("  " + f);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
