const Image = require("@11ty/eleventy-img");
const path = require("path");
const fs = require("fs");
const CleanCSS = require("clean-css");
const UglifyJS = require("uglify-js");
const { ogCard } = require("./lib/og-card.js");

const OUTPUT_DIR = "_site";

// Shared eleventy-img settings — moderate widths/formats so the build and the
// on-disk variant count stay reasonable; the built-in disk cache makes repeat
// builds fast. Output lands in _site/assets/img/opt/ (the path the deploy
// workflow caches).
const IMG_WIDTHS = [400, 800, 1200];
const IMG_FORMATS = ["avif", "webp", "jpeg"];
const IMG_OUTPUT_DIR = "./_site/assets/img/opt/";
const IMG_URL_PATH = "/assets/img/opt/";

// HTML-attribute escaper for the plain-<img> fallback path.
function escAttr(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Build a <picture>/srcset (AVIF+WebP+JPEG at several widths) for a local image
// so phones never download the full-size original. Falls back to a plain <img>
// for external URLs (https://...) or files missing on disk, so nothing breaks.
//
//   webSrc  root-absolute web path, e.g. "/assets/img/sessions/abc.jpg"
//   opts    { alt, sizes, className, eager (LCP -> loading=eager+fetchpriority=high),
//             width, height }  width/height seed intrinsic dims to avoid CLS.
async function respImage(webSrc, opts = {}) {
  const { alt = "", sizes, className, eager = false, width, height } = opts;
  const sizesAttr = sizes || "(max-width: 640px) 92vw, 320px";

  const isExternal = /^https?:\/\//.test(String(webSrc || ""));
  const input = isExternal ? null : path.join("src", String(webSrc).replace(/^\/+/, "/"));

  // External or missing file -> plain <img>, unoptimized but unbroken.
  if (isExternal || !input || !fs.existsSync(input)) {
    const attrs = [
      `src="${escAttr(webSrc)}"`,
      `alt="${escAttr(alt)}"`,
      className ? `class="${escAttr(className)}"` : "",
      width ? `width="${escAttr(width)}"` : "",
      height ? `height="${escAttr(height)}"` : "",
      eager ? `fetchpriority="high"` : `loading="lazy"`,
      `decoding="async"`,
    ].filter(Boolean).join(" ");
    return `<img ${attrs} />`;
  }

  const metadata = await Image(input, {
    widths: IMG_WIDTHS,
    formats: IMG_FORMATS,
    outputDir: IMG_OUTPUT_DIR,
    urlPath: IMG_URL_PATH,
    // Higher per-format quality so cards/heroes stay artifact-free.
    sharpAvifOptions: { quality: 62 },
    sharpWebpOptions: { quality: 84 },
    sharpJpegOptions: { quality: 85, mozjpeg: true },
  });

  const imgAttrs = {
    alt: alt || "",
    sizes: sizesAttr,
    decoding: "async",
    // LCP image loads eagerly with high priority; everything else lazy-loads.
    ...(eager ? { loading: "eager", fetchpriority: "high" } : { loading: "lazy" }),
  };
  if (className) imgAttrs.class = className;

  return Image.generateHTML(metadata, imgAttrs);
}

module.exports = function (eleventyConfig) {

  /* eleventy-img treats any variant already on disk as done and skips it, and
     the deploy workflow restores _site/assets/img/opt from a cache across
     builds. So a single interrupted build leaves a zero-byte file that is
     never regenerated and never expires — which is what put an empty AVIF in
     the <picture> for one session card: the browser picked the AVIF source,
     got nothing, and drew a broken image over a JPEG that was perfectly fine.
     Empty variants are always wrong, so drop them and let them rebuild. */
  eleventyConfig.on("eleventy.before", () => {
    let pruned = 0;
    try {
      for (const f of fs.readdirSync(IMG_OUTPUT_DIR)) {
        const file = path.join(IMG_OUTPUT_DIR, f);
        if (fs.statSync(file).size === 0) { fs.unlinkSync(file); pruned++; }
      }
    } catch (e) { /* dir absent on a clean build — nothing to prune */ }
    if (pruned) console.log(`[img] pruned ${pruned} zero-byte variant(s); they will be re-encoded`);
  });
  // static assets + custom-domain file copied straight through
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

  // Responsive image shortcode. Positional for the common case
  // ({% respImg src, alt, sizes %}); pass an options object as `alt` for the
  // full set ({% respImg src, { alt, sizes, className, eager, width, height } %}).
  eleventyConfig.addNunjucksAsyncShortcode("respImg", async function (webSrc, alt, sizes) {
    if (alt && typeof alt === "object") return respImage(webSrc, alt);
    return respImage(webSrc, { alt, sizes });
  });

  // Rewrite local <img> tags inside already-rendered post-body HTML through the
  // responsive pipeline. External images and anything we can't resolve are left
  // untouched. Used by newspost.njk for inline body images.
  eleventyConfig.addNunjucksAsyncFilter("respBody", function (html, cb) {
    const run = async () => {
      const src = String(html || "");
      const imgTag = /<img\b[^>]*>/gi;
      const tags = src.match(imgTag) || [];
      let out = src;
      for (const tag of tags) {
        const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
        if (!srcMatch) continue;
        const url = srcMatch[1];
        if (/^https?:\/\//.test(url) || /^data:/.test(url)) continue;
        const altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
        try {
          const replacement = await respImage(url, { alt: altMatch ? altMatch[1] : "" });
          // split/join avoids $-pattern interpretation in String.replace's 2nd arg
          out = out.split(tag).join(replacement);
        } catch (e) {
          // leave the original tag in place on any failure
        }
      }
      return out;
    };
    run().then((r) => cb(null, r)).catch((e) => cb(null, String(html || "")));
  });

  // human date: "July 11, 2025"
  eleventyConfig.addFilter("postDate", (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  });

  // local image paths -> root-absolute; pass external URLs through
  eleventyConfig.addFilter("img", (v) => {
    if (!v) return "";
    return /^https?:\/\//.test(v) ? v : "/" + String(v).replace(/^\/+/, "");
  });

  // fully-qualified image URL (for og:image / twitter:image — scrapers need absolute)
  const ORIGIN = "https://soundsofsaving.jonasjohansson.se";
  eleventyConfig.addFilter("absImg", (v) => {
    if (!v) return "";
    return /^https?:\/\//.test(v) ? v : ORIGIN + "/" + String(v).replace(/^\/+/, "");
  });

  // --- Photo rows -------------------------------------------------------
  // These were Nunjucks macros, but a Nunjucks macro body is rendered
  // synchronously, so an async shortcode inside one silently produces nothing.
  // As real shortcodes they can await the responsive pipeline.
  //
  // A photo is { src, alt, caption, source }. `source` is where the image came
  // from — an Instagram post, for the ones pulled from the SoS account — and
  // when it is set both the image and the caption link back to it.
  async function photoMedia(ph, eager, sizes) {
    const img = await respImage(ph.src, { alt: ph.alt || "", sizes, eager: !!eager });
    return ph.source
      ? `<a class="photo" href="${escAttr(ph.source)}" target="_blank" rel="noopener">${img}</a>`
      : `<span class="photo">${img}</span>`;
  }

  function photoCaption(ph) {
    if (!ph.caption) return "";
    const text = escAttr(ph.caption);
    const inner = ph.source
      ? `<a href="${escAttr(ph.source)}" target="_blank" rel="noopener">${text}</a>`
      : text;
    return `<figcaption>${inner}</figcaption>`;
  }

  // A row of photos. `eager` skips lazy-loading for rows above the fold.
  eleventyConfig.addNunjucksAsyncShortcode("photoRow", async function (photos, eager) {
    const list = photos || [];
    if (!list.length) return "";
    const sizes = "(max-width: 720px) 46vw, 340px";
    const items = [];
    for (const ph of list) {
      if (!ph || !ph.src) continue;
      items.push(`<li><figure>${await photoMedia(ph, eager, sizes)}${photoCaption(ph)}</figure></li>`);
    }
    return `<ul class="photo-row" aria-label="Photos">${items.join("")}</ul>`;
  });

  // One photo, used beside a section head.
  eleventyConfig.addNunjucksAsyncShortcode("photoFigure", async function (ph, className) {
    if (!ph || !ph.src) return "";
    const sizes = "(max-width: 860px) 92vw, 260px";
    const media = await photoMedia(ph, false, sizes);
    return `<figure class="${escAttr(className || "photo-figure")}">${media}${photoCaption(ph)}</figure>`;
  });

  // --- Hero pool --------------------------------------------------------
  // The hero photo is swapped by JS every ten seconds, so it cannot be a
  // <picture>: the <source> srcset would always win over the src the rotator
  // sets. Instead we run each archive photo through the same responsive
  // pipeline here and hand the script a resolved src + srcset per photo, which
  // it can assign to a plain <img>. WebP only — one format keeps the srcset
  // short, and it is universally supported by anything running this script.
  async function heroVariants(ph) {
    const entry = { src: ph.src, alt: ph.alt || "", credit: ph.credit || "" };
    const input = path.join("src", String(ph.src).replace(/^\/+/, "/"));
    if (!fs.existsSync(input)) return entry;
    try {
      const meta = await Image(input, {
        widths: [800, 1200, 1600],
        formats: ["webp"],
        outputDir: IMG_OUTPUT_DIR,
        urlPath: IMG_URL_PATH,
        sharpWebpOptions: { quality: 82 },
      });
      const set = meta.webp;
      entry.src = set[set.length - 1].url;
      entry.srcset = set.map((s) => `${s.url} ${s.width}w`).join(", ");
    } catch (e) {
      /* fall back to the original path — an unoptimized hero beats none */
    }
    return entry;
  }

  eleventyConfig.addNunjucksAsyncShortcode("heroPool", async function (photos) {
    const out = [];
    for (const ph of photos || []) {
      if (!ph || !ph.src) continue;
      out.push(await heroVariants(ph));
    }
    return JSON.stringify(out);
  });

  // The server-rendered hero: the same variants, emitted as the actual LCP
  // element so first paint never pulls the unoptimized original.
  eleventyConfig.addNunjucksAsyncShortcode("heroImg", async function (ph) {
    if (!ph || !ph.src) return "";
    const v = await heroVariants(ph);
    return (
      `<img class="home-hero__img media media--full" src="${escAttr(v.src)}"` +
      (v.srcset ? ` srcset="${escAttr(v.srcset)}"` : "") +
      ` sizes="100vw" alt="${escAttr(v.alt)}" width="1600" height="900"` +
      ` fetchpriority="high" decoding="async" />`
    );
  });

  // --- Open Graph share cards -----------------------------------------
  // Normalize whatever photo a page nominates into one 1200x630 card (see
  // lib/og-card.js). Async because it encodes with sharp. Falls through to
  // the original path if the card can't be made, so og:image is never empty.
  eleventyConfig.addNunjucksAsyncFilter("ogCard", function (webSrc, cb) {
    ogCard(webSrc, OUTPUT_DIR)
      .then((r) => cb(null, r || webSrc))
      .catch(() => cb(null, webSrc));
  });

  // --- Trailing-arrow filter -------------------------------------------
  // "Read the story" -> "Read the <span class=nowrap>story &rarr;</span>", so
  // the arrow can never be orphaned onto a line of its own. The last word and
  // the arrow wrap together or not at all.
  const glyphed = (glyph) => (text) => {
    const t = String(text == null ? "" : text).trim();
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (!t) return glyph;
    const m = t.match(/^([\s\S]*?)(\S+)$/);
    const head = m ? esc(m[1]) : "";
    const last = m ? esc(m[2]) : esc(t);
    return `${head}<span class="nowrap">${last} ${glyph}</span>`;
  };
  eleventyConfig.addFilter("arrow", glyphed("&rarr;"));
  // Same, with the north-east arrow that conventionally means "leaves this
  // site". Used where a link opens somewhere that is not ours.
  eleventyConfig.addFilter("arrowOut", glyphed("&nearr;"));

  // --- Page CSS ---------------------------------------------------------
  // Each template's styles live in src/assets/css/pages/<name>.css and are
  // minified and inlined into that page alone. One <style> block, no extra
  // request, and no page carries another page's rules.
  const pageCssCache = new Map();
  eleventyConfig.addShortcode("pageCss", function (name) {
    if (pageCssCache.has(name)) return pageCssCache.get(name);
    const src = path.join("src/assets/css/pages", `${name}.css`);
    let out = "";
    try {
      const min = new CleanCSS({ level: 2 }).minify(fs.readFileSync(src, "utf8"));
      out = min.errors && min.errors.length ? "" : `<style>${min.styles}</style>`;
    } catch (e) {
      console.warn(`[css] page module missing: ${src}`);
    }
    pageCssCache.set(name, out);
    return out;
  });

  // --- Bundle + minify after build --------------------------------------
  eleventyConfig.on("eleventy.after", ({ dir } = {}) => {
    const outDir = (dir && dir.output) || OUTPUT_DIR;

    // Global stylesheet: inline every local @import so the browser fetches one
    // file instead of the module tree, then minify.
    const cssPath = path.join(outDir, "assets/css/site.css");
    try {
      if (fs.existsSync(cssPath)) {
        const min = new CleanCSS({ inline: ["local"], level: 2 }).minify([cssPath]);
        if (!(min.errors && min.errors.length)) fs.writeFileSync(cssPath, min.styles);
      }
    } catch (e) {
      console.warn("[css] minify skipped:", e.message);
    }

    // The CSS modules are build inputs, not deliverables — once they're inlined
    // above, shipping them would just be dead weight in the deploy.
    for (const sub of ["base", "layout", "components", "pages"]) {
      fs.rmSync(path.join(outDir, "assets/css", sub), { recursive: true, force: true });
    }
    for (const f of ["fonts.css", "tokens.css"]) {
      fs.rmSync(path.join(outDir, "assets/css", f), { force: true });
    }

    // Site scripts: minify in place. They are ES5 by design (no build step,
    // no transpiler), so uglify-js is the right tool.
    const jsDir = path.join(outDir, "assets/js");
    try {
      if (fs.existsSync(jsDir)) {
        for (const f of fs.readdirSync(jsDir).filter((f) => f.endsWith(".js"))) {
          const p = path.join(jsDir, f);
          const res = UglifyJS.minify(fs.readFileSync(p, "utf8"), {
            compress: { passes: 2 },
            mangle: true,
          });
          if (res.error) {
            console.warn(`[js] minify skipped ${f}:`, res.error.message);
            continue;
          }
          fs.writeFileSync(p, res.code);
        }
      }
    } catch (e) {
      console.warn("[js] minify skipped:", e.message);
    }
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html"],
  };
};
