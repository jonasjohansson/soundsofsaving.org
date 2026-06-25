module.exports = {
  // canonical origin, used for absolute canonical / og / sitemap URLs
  origin: "https://soundsofsaving.jonasjohansson.se",

  // build timestamp (ISO) — useful for cache-busting / footer "last built"
  buildTime: new Date().toISOString(),

  // default Open Graph / Twitter card image (pages can override via ogImage).
  // No bespoke 1200x630 share card yet — fall back to the brand logo so the
  // og:image is never broken; replace with a real share card when available.
  ogImage: {
    src: "assets/img/site/logo.png",
    width: 801,
    height: 801,
    alt: "Sounds of Saving",
  },
};
