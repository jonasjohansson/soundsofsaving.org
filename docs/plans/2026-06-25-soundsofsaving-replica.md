# soundsofsaving.org Replica Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a faithful, close-visual replica of soundsofsaving.org as an Eleventy static site with Pages CMS content in git, deployed to GitHub Pages — same architecture as lumenproject.se.

**Architecture:** Eleventy reads content files (`content/songs/*.md`, `content/news/*.md`, `content/pages/*.json`, `content/settings.json`) via build-time `src/_data/*.js` loaders and renders Nunjucks templates into `_site/`. Pages CMS (`.pages.yml`) edits those files; each save commits and triggers a GitHub Actions → Pages rebuild. Content + design are sourced by a `wget` mirror of the live site, parsed into content files.

**Tech Stack:** Node 22, Eleventy 2, `@11ty/eleventy-img`, `gray-matter`, `js-yaml`, `image-size`; vanilla CSS with `:root` tokens; GitHub Pages + Actions.

**Reference repo:** `../lumenproject.se` — mirror its structure and conventions closely. Read its `src/_includes/base.njk`, `src/_data/lumen.js`, `.pages.yml`, `.eleventy.js`, `scripts/validate-content.js` before writing the equivalents here.

**Verification model:** No unit tests (static content site). Each task verifies via one of: `npm run build` succeeds, `npm run validate` passes, the generated HTML contains expected markup (grep), or a visual compare of `localhost:8080` against the live page. Commit after each task.

---

## Phase 0 — Scaffold

### Task 0.1: package.json + deps
**Files:** Create `package.json`
- Copy lumen's `package.json`, rename to `soundsofsaving.org`, keep the same scripts (`build`, `serve`, `validate`, `clean`) and deps.
- Run: `npm install`
- Verify: `npx eleventy --version` prints a version. Commit.

### Task 0.2: .eleventy.js + .gitignore
**Files:** Create `.eleventy.js`, `.gitignore`
- Start from lumen's `.eleventy.js`: passthrough `src/assets` → `assets`, passthrough `src/CNAME`, the `galleryImg`/responsive-image shortcode (rename to `respImg`), a human `postDate` filter, `img`/`absImg` filters (set `ORIGIN = "https://soundsofsaving.org"`). Drop lumen-specific `eventBody`/`tc` line-up parsing for now.
- `.gitignore`: `node_modules/`, `_site/`, `.DS_Store`.
- Verify: `npx eleventy --dryrun` runs without config errors. Commit.

### Task 0.3: directory skeleton
**Files:** Create empty dirs with `.gitkeep`: `content/songs/`, `content/news/`, `content/pages/`, `src/assets/img/{songs,news,site}/`, `src/assets/css/`, `src/_includes/partials/`, `src/_data/`, `scripts/`.
- Verify: `find content src -type d`. Commit.

---

## Phase 1 — Crawl the live site

### Task 1.1: wget mirror to scratch
**Files:** none committed (scratch only)
- Run into scratch dir `SCRATCH=/private/tmp/claude-501/.../scratchpad/sos-mirror`:
  ```bash
  wget --mirror --page-requisites --adjust-extension --convert-links \
       --no-parent --domains soundsofsaving.org,www.soundsofsaving.org \
       --wait=1 --random-wait -e robots=off \
       -P "$SCRATCH" https://www.soundsofsaving.org/
  ```
- Also fetch `https://www.soundsofsaving.org/sitemap.xml` for a canonical URL list.
- Verify: `find "$SCRATCH" -name '*.html' | wc -l` > 10. No commit (scratch).

### Task 1.2: recon report
**Files:** Create `docs/scrape-report.md`
- From the mirror + sitemap, enumerate: every Song episode URL, every News post URL (all pages of pagination), the static page URLs, and the platform (grep mirrored HTML for `Squarespace`/`squarespace.com`).
- Record counts and the detected design tokens source (fonts, CSS files).
- Verify: report lists concrete URLs and counts. Commit the report.

---

## Phase 2 — Design tokens + base layout

### Task 2.1: extract design tokens
**Files:** Create `src/assets/css/tokens.css`
- From the mirrored CSS/computed styles, capture: font families (+ any webfont URLs to self-host or link), color palette (background, text, accent, link), heading scale, max content width, spacing rhythm. Express ALL as `:root` CSS variables (per Jonas's CSS-vars convention).
- Download/copy the logo and any hero/og images into `src/assets/img/site/`.
- Verify: `tokens.css` has a `:root{}` block with named vars; logo file exists. Commit.

### Task 2.2: base.njk layout + global CSS
**Files:** Create `src/_includes/base.njk`, `src/assets/css/site.css`
- `base.njk`: `<head>` with title/description/OG/Twitter tags driven by page vars + settings (model on lumen's `base.njk`), favicon, fonts, header nav (Home·Programs·About Us·Community·News + Donate/Get Help buttons), footer (988 crisis line + social links), `{{ content | safe }}`.
- `site.css`: import `tokens.css`; header/footer/nav/button/typography styles matching the live site.
- Verify: a throwaway `src/_includes`-using page builds and renders header/footer. Commit.

---

## Phase 3 — Settings + data layer

### Task 3.1: settings.json
**Files:** Create `content/settings.json`
- Fill from the live site: site_title, tagline, nav labels, donate_url, get_help_url, crisis_line ("988 Suicide & Crisis Lifeline" + url), socials (youtube/facebook/spotify/twitter/instagram), hero copy, SEO descriptions per page.
- Verify: valid JSON (`node -e "JSON.parse(require('fs').readFileSync('content/settings.json'))"`). Commit.

### Task 3.2: site data loader
**Files:** Create `src/_data/site.js`, `src/_data/settings.js`
- `settings.js` reads `content/settings.json`; `site.js` exposes `origin`, `buildTime`. Model on lumen's `site.js`.
- Verify: `npx eleventy --dryrun` resolves data without error. Commit.

---

## Phase 4 — Songs collection ("Song That Found Me at the Right Time")

### Task 4.1: songs data loader
**Files:** Create `src/_data/songs.js`
- Read `content/songs/*.md` with `gray-matter`; return sorted-by-date array with: artist, song_title, slug, date, youtube_id (parsed from url), spotify_url, portrait (+ intrinsic dims via `image-size`), pull_quote, story(html), featured, excerpt. Model on lumen's `lumen.js` (dimsOf, excerptOf, slugify, ymd helpers).
- Verify: loader returns `[]` cleanly with no content files yet. Commit.

### Task 4.2: songs parser script
**Files:** Create `scripts/parse-songs.js`
- Parse each Song episode page from the mirror into `content/songs/<slug>.md` (frontmatter + story body). Download the artist portrait into `src/assets/img/songs/`. Log any page that doesn't yield required fields to `docs/scrape-report.md`.
- Run it. Verify: `ls content/songs/*.md | wc -l` matches the episode count from the recon report (or the delta is logged). Commit content + images.

### Task 4.3: songs index + detail templates
**Files:** Create `src/songs.njk` (index, e.g. `/songs/`), `src/song.njk` (pagination over `songs`, permalink `/songs/<slug>/`)
- Index: grid of portraits + artist/song title, featured one first. Detail: portrait/video embed, pull-quote, story, Spotify link, share/OG. Match live layout.
- Verify: `npm run build` then grep a known artist name in `_site/songs/index.html` and in its detail page. Visual compare one detail page to live. Commit.

---

## Phase 5 — News (blog)

### Task 5.1: news data loader
**Files:** Create `src/_data/news.js`
- Read `content/news/*.md`; return sorted-desc by date with title, slug, date, author, hero image(+dims), body(html), excerpt.
- Verify: returns `[]` cleanly. Commit.

### Task 5.2: news parser script
**Files:** Create `scripts/parse-news.js`
- Parse every News post (all pagination pages) from the mirror into `content/news/<slug>.md`; download hero images into `src/assets/img/news/`. Log misses.
- Run it. Verify: file count matches recon (≥6). Commit content + images.

### Task 5.3: news index + post templates
**Files:** Create `src/news.njk` (`/news/`), `src/newspost.njk` (permalink `/news/<slug>/`)
- Index: vertical list (thumbnail, date, title, author, "Learn More"), pagination if needed. Post: hero, title, date, author, body.
- Verify: build; grep a known post title in `_site/news/index.html` and its post page. Commit.

---

## Phase 6 — Structured static pages

### Task 6.1: page JSON files
**Files:** Create `content/pages/{programs,about,community,get-help}.json`
- Each holds named blocks. Programs = 3 pillars (Education & Engagement [SoS HS, SoS Uni], Artist Storytelling, Connection [Events, SoS On Tour]) with heading + body + optional image per sub-item. About/Community/Get-Help blocks parsed from their live pages.
- Verify: all valid JSON. Commit.

### Task 6.2: page data loader + templates
**Files:** Create `src/_data/pages.js`, `src/programs.njk`, `src/about.njk`, `src/community.njk`, `src/gethelp.njk`
- Loader reads `content/pages/*.json` keyed by filename. Each template renders its blocks. Community includes the submission form UI (wired to existing endpoint or documented stub). Get Help surfaces 988 prominently.
- Verify: build; grep "Education & Engagement" in `_site/programs/index.html`. Visual compare. Commit.

---

## Phase 7 — Home

### Task 7.1: home page
**Files:** Create `src/index.njk` (permalink `/`)
- Hero (tagline + donate CTA), event/program spotlight, 3-pillar program overview, featured Songs (from `songs` data), Community submission teaser, recent News. Match live section order.
- Verify: build; grep tagline + a featured artist in `_site/index.html`. Visual compare to live home. Commit.

---

## Phase 8 — CMS config + site plumbing

### Task 8.1: .pages.yml
**Files:** Create `.pages.yml`
- Media: `songs`, `news`, `site`. Collections: `songs` (content/songs, `{fields.artist} - {fields.song_title}.md`), `news` (content/news), `pages` (Programs/About/Community/Get Help as `type: file` entries), `settings` (content/settings.json). Model field definitions + descriptions on lumen's `.pages.yml`.
- Verify: `node -e "require('js-yaml').load(require('fs').readFileSync('.pages.yml','utf8'))"` parses. Commit.

### Task 8.2: admin redirect + 404 + robots + sitemap
**Files:** Create `src/admin.njk`, `src/404.njk`, `src/robots.njk`, `src/sitemap.njk`
- Mirror lumen's versions (admin → app.pagescms.org; sitemap iterates songs+news+pages).
- Verify: build; `_site/sitemap.xml`, `_site/404.html`, `_site/robots.txt`, `_site/admin/index.html` exist. Commit.

### Task 8.3: validate-content.js
**Files:** Create `scripts/validate-content.js`
- Validate: every song has artist+date+(youtube_url|portrait); every news post has title+date; settings.json + page JSONs parse; referenced local images exist. Non-zero exit on failure. Model on lumen's validator.
- Run: `npm run validate` → passes. Commit.

---

## Phase 9 — Deploy

### Task 9.1: workflow + CNAME
**Files:** Create `.github/workflows/deploy.yml`, `src/CNAME`
- Copy lumen's deploy workflow (checkout, setup-node 22, `npm ci`, `npm run validate`, `npm run build`, upload-pages-artifact, deploy-pages; push + workflow_dispatch + daily cron). `src/CNAME` = `soundsofsaving.org`.
- **Do not** create the GitHub repo or push yet — Jonas decides on going live (DNS is the nonprofit's). Document this in README.
- Verify: workflow YAML parses. Commit.

### Task 9.2: README + WORKFLOW docs
**Files:** Create `README.md`, `docs/EDITING.md`
- README: what this is (replica), the stack, local dev, the DNS/deploy gate caveat. EDITING.md: how to edit each collection in Pages CMS (model on lumen's).
- Verify: links resolve. Commit.

---

## Phase 10 — Final verification

### Task 10.1: full build + validate + visual pass
- Run `npm run clean && npm run validate && npm run build`. Both succeed.
- `npm run serve`; open `http://localhost:8080` (via `open`, per Jonas's Ghostty note) and compare Home, Programs, a Song detail, a News post, About, Community, Get Help against the live site. Note gaps in `docs/scrape-report.md`.
- Verify: build clean, no broken local images (validator green), key pages visually match. Final commit.

### Task 10.2: log the session
- Append the build to skynet `wiki/logs/2026-06-25.md` Activity log (project slug `soundsofsaving`), and add a `wiki/projects/soundsofsaving.md` if this becomes ongoing.
- Commit skynet wiki separately.

---

## Notes for the executor
- Read the corresponding lumen file before writing each equivalent — match its conventions, don't reinvent.
- Preserve external destinations (Donate, Get Help, 988) exactly as the live site uses them.
- Keep all hardcoded CSS values tokenized in `:root` (Jonas convention).
- Show the `http://localhost:8080` preview link when the site first builds (Jonas convention).
- Never use em/en dashes or emojis in any user-facing site copy (Jonas convention).
- This replicates a real nonprofit's site; do not push to a public host or wire it to their live domain without Jonas's explicit go-ahead.
