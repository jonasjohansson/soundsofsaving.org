#!/usr/bin/env node
/* ==================================================================== *
 *  Partner logo sizing.
 *
 *  A logo wall looks wrong if every mark is set to the same HEIGHT (a wide
 *  wordmark then reads three times bigger than a square emblem) and equally
 *  wrong if every mark is set to the same WIDTH. The usual fix is equal
 *  optical AREA, which is what this does — but area alone is not enough on
 *  its own:
 *
 *   - a very wide mark at the target area overflows the cell, so width and
 *     height are both clamped to the cell's usable box and the area is
 *     given up rather than the fit;
 *   - a dense multi-line lockup (MTV Entertainment Studios) carries its ink
 *     in three small lines, so at the same area as a single bold word it
 *     reads far smaller. Those get a modest boost, capped by the same box.
 *
 *  Writes width/height attributes into content/pages/community.json. The
 *  files themselves are untouched; these are display sizes only, at 1x, and
 *  the sources are 2x so they stay sharp on a retina screen.
 *
 *  Run: node scripts/size-logos.js
 * ==================================================================== */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "content/pages/community.json");

/* The cell is 3:2 and 265x177 at the widest desktop column. The clamps leave
   air inside that so no mark ever fills its cell edge to edge. */
const MAX_W = 152;
const MAX_H = 83;
/* Target optical AREA, not height or width — see above. Every value here was
   scaled down 20% linearly from the first pass, which is 0.8^2 = 0.64 on the
   area: the marks had grown confident enough to read as the subject of the
   section rather than as credits under it. */
const TARGET_AREA = 7040;

/* Marks whose ink is spread over several small lines rather than one word.
   They read small at equal area, so they get a boost — still clamped by the
   box, so nothing here can overflow its cell. */
const DENSE = {
  "mtv-entertainment-studios.png": 1.18,
  "william-alanson-white-institute.png": 1.18,
  "the-loveland-foundation.png": 1.12,
  "neal-casal-music-foundation.png": 1.12,
  "american-association-of-suicidology.png": 1.1,
  "hi-how-are-you-project.png": 1.1,
};

async function main() {
  const doc = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const logos = (doc.partners && doc.partners.logos) || [];
  if (!logos.length) throw new Error("no logos in community.json");

  for (const logo of logos) {
    if (!logo.src) continue;
    const file = path.join(ROOT, "src", logo.src.replace(/^\//, ""));
    if (!fs.existsSync(file)) {
      console.warn("missing:", logo.src);
      continue;
    }
    const meta = await sharp(file).metadata();
    const ratio = meta.width / meta.height;
    const boost = DENSE[path.basename(file)] || 1;

    let h = Math.sqrt((TARGET_AREA * boost) / ratio);
    let w = ratio * h;
    // Fit before area: a mark that overflows its cell is worse than one a
    // little off the target.
    const k = Math.min(MAX_W / w, MAX_H / h, 1);
    w = Math.round(w * k);
    h = Math.round(h * k);

    logo.w = w;
    logo.h = h;
    console.log(
      String(w).padStart(4) + " x " + String(h).padStart(3),
      "area " + String(w * h).padStart(6),
      " ", path.basename(file)
    );
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(doc, null, 2) + "\n");
  console.log("\nwrote", path.relative(ROOT, JSON_PATH));
}

main().catch((e) => { console.error(e); process.exit(1); });
