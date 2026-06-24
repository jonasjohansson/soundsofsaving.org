# soundsofsaving.org — replica on the lumen stack

**Date:** 2026-06-25
**Goal:** Build a faithful, maintainable replica of the live nonprofit site
[soundsofsaving.org](https://www.soundsofsaving.org/) using the exact same
architecture as `lumenproject.se`: an Eleventy static site with **Pages CMS**
content stored as plain files in git, deployed to GitHub Pages.

## Decisions (locked 2026-06-25)

1. **Visual fidelity:** *Close visual replica.* Crawl the live site, extract its
   real fonts / colors / spacing / logo / images, tokenize into `:root` CSS
   variables, and rebuild each template section-by-section in clean Nunjucks —
   not a copy of their minified CSS.
2. **Content scope:** *Everything reachable.* Crawl the whole site (all Song
   episodes, every News post incl. pagination, all Programs/About/Community
   copy, all images). Anything that won't parse cleanly is logged, never
   silently dropped.
3. **Domain:** `soundsofsaving.org` (plural — repo name "soundofsaving" was a
   typo). CNAME wired like lumen, but **live deploy is gated on DNS Jonas
   controls** (it's the nonprofit's live domain). Build + run locally; flip DNS
   only if/when appropriate.
4. **Crawl method:** `wget` recursive mirror to scratch for assets + full HTML,
   then targeted parsing of the mirror into CMS content files. (`httrack` not
   installed; `wget` covers it.)
5. **Static page model:** Programs / About / Community / Get Help are each a
   **structured JSON file** in `content/pages/` with named blocks the CMS edits.

## Architecture (identical to lumenproject.se)

- **Eleventy** static-site build; `src/` templates → `_site/` output.
- **Pages CMS** (`app.pagescms.org`) on top via `.pages.yml`. Every save is a
  commit → GitHub Actions rebuilds → GitHub Pages. No database, no lock-in.
- Deps: `@11ty/eleventy`, `@11ty/eleventy-img`, `gray-matter`, `js-yaml`,
  `image-size`. Build-time loaders in `src/_data/*.js`. `scripts/validate-content.js`.
- Deploy: `.github/workflows/deploy.yml` (push + manual dispatch + daily cron),
  `src/CNAME`, GitHub Pages.

## Content model → CMS collections (`.pages.yml`)

| Collection | Files | Key fields |
|---|---|---|
| **Songs** ("Song That Found Me at the Right Time") | `content/songs/*.md` | artist, song_title, date, youtube_url, spotify_url, portrait, pull_quote, story (body), featured |
| **News** (blog) | `content/news/*.md` | title, date, author, hero image, body |
| **Pages** (Programs, About, Community, Get Help) | `content/pages/*.json` | named structured blocks (Programs = 3 pillars: Education & Engagement, Artist Storytelling, Connection) |
| **Settings** | `content/settings.json` | site title, tagline, nav, Donate URL, **988 crisis line**, social links (YouTube/Facebook/Spotify/Twitter/Instagram), hero copy, SEO descriptions |

Media folders in `.pages.yml`: `songs` (portraits), `news` (hero images),
`site` (logo, hero, og image).

## Pages to build

Home · Programs · About Us · Community · News (index + post) · Songs (index +
detail) · Get Help · Donate (preserve external destination) · 404 · sitemap ·
robots · admin redirect.

## Source site reference (from recon)

- **Mission:** music + mental wellness nonprofit, ages 14–24.
- **Nav:** Home · Programs · About Us · Community · News · Donate · Get Help.
- **Programs pillars:** Education & Engagement (SoS HS, SoS Uni), Artist
  Storytelling (the Song series + social-impact media), Connection (Events,
  SoS On Tour).
- **News:** vertical list, 6+ posts w/ pagination; fields = thumbnail, date,
  title, author (e.g. Francesca Namala). No categories/excerpts on index.
- **Footer:** crisis resource (988 Suicide & Crisis Lifeline), social links.
- **Platform:** appears to be Squarespace (confirm during crawl).

## Scrape plan

1. `wget` recursive mirror of `https://www.soundsofsaving.org/` → scratch
   (`--mirror --page-requisites --adjust-extension --convert-links`, polite rate
   limit, restrict to host).
2. Walk the sitemap / mirrored tree to enumerate every Song episode, every News
   post, and the static pages.
3. Parse each into a content file; download referenced images into
   `src/assets/img/{songs,news,site}/`.
4. Extract design tokens (font families, palette, logo) into `src/assets/css`
   `:root` vars.
5. Log unparseable pages to a report rather than dropping them.

## Build / verify

- `npm run serve` → `http://localhost:8080`, compare against live site.
- `npm run validate` fails the build on malformed content.
- Commit content + assets; CMS edits land as commits thereafter.

## Out of scope (for now)

- Live DNS cutover (Jonas decides separately).
- Community submission form backend (replicate the form UI; wire to their
  existing endpoint or leave as a documented stub).
- Donate payment flow (link out to their existing donation destination).
