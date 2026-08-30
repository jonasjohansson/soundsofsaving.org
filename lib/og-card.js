/* ==================================================================== *
 *  Open Graph share cards
 *
 *  Every og:image must be one shape — 1200x630 (1.91:1) — or the platforms
 *  crop it themselves, unpredictably, and X downgrades a `summary_large_image`
 *  card whose picture is square. Source photography here is anything but one
 *  shape: 1600x900 heroes, 1500x1000 stills, square and portrait session
 *  thumbnails, and news images from 480px up to 6000px.
 *
 *  So we normalise at build time with sharp:
 *    - big enough  -> cover-crop to 1200x630, attention-weighted so faces
 *                     survive the trim rather than the geometric centre
 *    - too small   -> never upscale. Sit the image on a 1200x630 bed made
 *                     from its own blurred, darkened self, so the card is
 *                     full-bleed and on-brand instead of letterboxed.
 *
 *  Output is content-addressed (mtime+size+path), so unchanged photos are
 *  skipped on rebuild and changed ones bust the scrapers' cache for free.
 * ==================================================================== */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OG_W = 1200;
const OG_H = 630;
const OUT_REL = "assets/img/og";

// Resolve sharp lazily: it arrives via @11ty/eleventy-img, and if it ever
// goes missing we want a degraded build, not a crashed one.
let sharp;
try { sharp = require("sharp"); } catch (e) { sharp = null; }

// Remember what we've already written this run so ten pages sharing a photo
// only pay for one encode.
const done = new Map();

/** Map a web path ("/assets/img/site/hug.jpg") to its file on disk. */
function toDisk(webSrc) {
  const clean = String(webSrc || "").replace(/^\/+/, "");
  if (!clean) return null;
  const p = path.join("src", clean);
  return fs.existsSync(p) ? p : null;
}

/**
 * Generate the 1200x630 card for `webSrc` and return its web path.
 * Returns null when it can't (no sharp, external URL, missing file) so the
 * caller can fall back to whatever it was going to use anyway.
 */
async function ogCard(webSrc, outputDir) {
  if (!sharp) return null;
  if (/^https?:\/\//.test(String(webSrc || ""))) return null;

  const input = toDisk(webSrc);
  if (!input) return null;

  const stat = fs.statSync(input);
  const key = crypto
    .createHash("sha1")
    .update(input + ":" + stat.size + ":" + stat.mtimeMs)
    .digest("hex")
    .slice(0, 10);

  const base = path.basename(input).replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const name = `${base}-${key}.jpg`;
  const webPath = `/${OUT_REL}/${name}`;

  if (done.has(webPath)) return webPath;

  const outPath = path.join(outputDir || "_site", OUT_REL, name);
  if (fs.existsSync(outPath)) {
    done.set(webPath, true);
    return webPath;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const img = sharp(input, { failOn: "none" });
  const meta = await img.metadata();
  const bigEnough = (meta.width || 0) >= OG_W && (meta.height || 0) >= OG_H;

  if (bigEnough) {
    await img
      .resize(OG_W, OG_H, { fit: "cover", position: sharp.strategy.attention })
      .jpeg({ quality: 82, mozjpeg: true, progressive: true })
      .toFile(outPath);
  } else {
    // Blurred self-bed: fill the frame with an enlarged, softened, darkened
    // copy, then set the real image on top at its own scale.
    const bed = await sharp(input, { failOn: "none" })
      .resize(OG_W, OG_H, { fit: "cover", position: "centre" })
      .blur(28)
      .modulate({ brightness: 0.55 })
      .toBuffer();
    const fg = await sharp(input, { failOn: "none" })
      .resize(OG_W, OG_H, { fit: "inside", withoutEnlargement: true })
      .toBuffer();
    await sharp(bed)
      .composite([{ input: fg, gravity: "centre" }])
      .jpeg({ quality: 82, mozjpeg: true, progressive: true })
      .toFile(outPath);
  }

  done.set(webPath, true);
  return webPath;
}

module.exports = { ogCard, OG_W, OG_H };
