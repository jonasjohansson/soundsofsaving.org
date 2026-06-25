const Image = require("@11ty/eleventy-img");
const path = require("path");

module.exports = function (eleventyConfig) {
  // static assets + custom-domain file copied straight through
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

  // Responsive images: emit AVIF/WebP/JPEG at several widths with srcset, so
  // phones don't download full-size originals. `webSrc` is the root-absolute
  // path from a data file (e.g. /assets/img/songs/001.jpg).
  eleventyConfig.addNunjucksAsyncShortcode("respImg", async function (webSrc, alt, sizes) {
    const input = path.join("src", webSrc);
    const metadata = await Image(input, {
      widths: [400, 800, 1200],
      formats: ["avif", "webp", "jpeg"],
      outputDir: "./_site/assets/img/opt/",
      urlPath: "/assets/img/opt/",
    });
    return Image.generateHTML(metadata, {
      alt: alt || "",
      sizes: sizes || "(max-width: 640px) 92vw, 320px",
      loading: "lazy",
      decoding: "async",
    });
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

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html"],
  };
};
