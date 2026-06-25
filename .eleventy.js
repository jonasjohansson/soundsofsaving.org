const Image = require("@11ty/eleventy-img");
const path = require("path");
const fs = require("fs");
const CleanCSS = require("clean-css");

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
          out = out.replace(tag, replacement);
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

  // Minify the global stylesheet after build (inlining its local @imports so
  // the browser fetches one small file instead of three unminified ones).
  eleventyConfig.on("eleventy.after", ({ dir } = {}) => {
    const outDir = (dir && dir.output) || "_site";
    const cssPath = path.join(outDir, "assets/css/site.css");
    try {
      if (!fs.existsSync(cssPath)) return;
      const min = new CleanCSS({ inline: ["local"], level: 2 }).minify([cssPath]);
      if (min.errors && min.errors.length) return;
      fs.writeFileSync(cssPath, min.styles);
    } catch (e) {
      console.warn("[css] minify skipped:", e.message);
    }
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html"],
  };
};
