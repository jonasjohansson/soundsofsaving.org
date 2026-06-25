# soundsofsaving.org — scrape / recon report

Generated from a `wget --mirror` of `https://www.soundsofsaving.org/` (141 HTML
files captured) plus a direct fetch of the shared stylesheet. This report is the
input for the content-extraction and templating phases.

## Detected platform

**Webflow** (not Squarespace).

Evidence:
- `data-wf-domain`, `data-wf-page`, `data-wf-site` attributes on `<html>`.
- `data-wf-site="5d6546885bb4104c9eb80a98"` (the main site).
- Stylesheet `soundsofsaving.webflow.shared.dab4b6213.css` served from
  `cdn.prod.website-files.com` (Webflow's asset CDN).
- `<html data-wf-ignore="true">` blocks, Webflow form widgets (`.w-form`,
  `.w-richtext`, `.w-button`).

No `generator` meta tag is present. There is **no `robots.txt` and no working
`sitemap.xml`** — both `/sitemap.xml` and the no-www variant return Webflow's
404 ("Not Found") page. Enumeration below is therefore built from the crawl link
graph, not a sitemap.

Note: news posts pull their images from a **second** Webflow site id
(`5d71b6d4972e97253aaebb04`), while chrome/logo assets come from the main site id
(`5d6546885bb4104c9eb80a98`). Both are on `cdn.prod.website-files.com`.

## "Songs That Found Me at the Right Time" (songs collection)

**There is no per-episode collection of song pages on the website.** This is the
single most important finding for downstream phases.

- The series lives on a **single landing page**:
  `https://www.soundsofsaving.org/songs-that-found-me-at-the-right-time`
  (title: "Songs That Found Me at the Right Time").
- The episodes themselves are **YouTube videos**, surfaced as embeds + a link to
  the full playlist. They are not individual site URLs.
- Inline embeds on that page: one primary `youtube.com/embed/fth9UUa1Mfw` plus a
  handful of oEmbed-card thumbnails (video ids seen: `-m0glN0yg3U`, `1dkL8IdQ1R0`,
  `3iy6HehLaOg`, ...).
- Full series playlist:
  `https://www.youtube.com/playlist?list=PLrBVhh4EJvMOjNUKZO4C07XwSj0EAD0XH`
  (channel `UC63jSE75VJoOekg-NdUSXmA`). The authoritative episode list is the
  YouTube playlist, **not** any HTML the mirror can see.

Count of song episode URLs on the site: **0 individual pages** (1 landing page,
1 YouTube playlist). If downstream phases need per-episode song content, it must
come from the YouTube Data API / playlist scrape, not the HTML mirror. Flagging
this as an open item rather than guessing.

## News / blog posts

Single content type under `/news/<slug>`. The index `/news` is a Webflow
Collection List paginated across 13 pages
(`/news?4351cff9_page=1` ... `/news?4351cff9_page=13`).

**Unique news posts: 70** (every slug linked across all 13 pagination pages was
crawled; 70 files captured in the mirror, full coverage).

Index / pagination URLs:
- `https://www.soundsofsaving.org/news`
- `https://www.soundsofsaving.org/news?4351cff9_page=1` through `...page=13`

Per-post URL pattern: `https://www.soundsofsaving.org/news/<slug>`. Full slug
list (70):

3-tips-for-managing-concert-anxiety, 4-lyrics-for-feeling-your-feelings,
a-conversation-with-amira-elfeky,
a-conversation-with-up-and-coming-hyperpop-artist-wsteaway,
a-holistic-approach-to-trauma-recovery, a-night-in-the-marias-dreamland,
a-sound-approach, an-interview-with-rising-pop-artist-rosie-darling,
as-abortion-rights-are-under-attack-artists-fight-back,
backstage-at-newport-folk-with-the-black-opry-revue,
boygenius-hit-the-road-so-i-did-too,
caring-for-your-body-in-crisis-prioritizing-respiratory-health,
check-in-series-summer-salt-reimagines-their-past-on-the-juniper-songbook-by-alyssa-goldberg,
comfort-club-interview,
coping-with-suicidal-ideation-in-college-tips-from-a-college-student,
donor-thanks-email, fall-2023-round-up, girlsonthebrink-reflection,
govball2024-claire-rosinkranz-interview, govball2024-hotlinetnt-interview,
greywind-interview, hoja-de-recursos, holly-humberstone-album-review,
how-to-curate-an-anxiety-soothing-playlist,
i-am-tired-of-being-constantly-available, illinoise-review,
is-it-heaven-or-is-it-just-palace-at-webster-hall,
kacy-hill-performs-at-mercury-lounge-by-alyssa-goldberg,
kate-yeager-interview-2024,
limperatrice-music-hall-of-williamsburg-review,
lyrical-analysis-of-holly-humberstones-the-walls-are-way-too-thin,
maddie-zahm-interview,
marina-herlop-finds-the-balance-between-danger-discomfort-and-stillness,
moy-interview, neda-week-stigma, nina-ljeti-interview, noah-kahan-interview,
noah-kahans-stick-season-speaks-to-the-mental-health-of-young-adults-through-powerful-folk-lyrics,
nuria-graham-on-music-as-a-collective-experience-and-her-journey-with-her-latest-album-majorie,
olive-klug-interview, paris-paloma-the-atlantis-review,
quinn-xcii-interview,
resource-sheet-for-evacuees-and-first-responders-of-the-2025-los-angeles-fires,
review-chappell-roan-house-of-blues-boston, review-dean-lewis-at-td-garden,
review-del-water-gap-atlanta, review-mac-demarco-at-webster-hall-7-19-23,
review-mod-sun-live-at-irving-plaza,
review-two-door-cinema-club-roadrunner-boston,
rock-singer-songwriter-ally-nicholas-is-being-true-to-herself,
smino-and-jid-at-terminal-5-review,
sounds-of-saving-announces-the-formation-of-its-youth-advisory-council,
sounds-of-saving-check-in-series-field-medic-brings-emo-to-folk-music,
spring-2023-round-up,
surf-curse-magic-hour-the-mental-toll-of-touring-and-collective-creativity,
syml-interview-2023, taking-life-advice-from-shakey-graves,
taylor-swift-philly-review, the-art-of-being-seen,
the-front-bottoms-fan-spotlight-it-was-a-life-saving-experience,
the-last-dinner-party-at-royale-review,
tim-atlas-kicks-off-north-american-tour-at-bostons-cafe-939-q-a,
tiny-habits-union-stage-review, valley-lost-in-translation-interview,
vara-interview, what-is-dbt, what-is-dysthymia, what-is-emdr,
wherever-mt-joy-is-thats-where-we-wanna-go, winter-spring-2024-round-up.

Author / date:
- A `Month DD, YYYY` date string appears in **70 / 70** posts (e.g.
  "January 27, 2023"), rendered inside a heading element (seen as
  `class="heading-3"`).
- A "By <Name>" byline appears in roughly **35 / 70** posts (e.g.
  "By Alyssa Goldberg", inside `class="paragraph-9"`). The remaining posts have
  no visible byline. Author is therefore best-effort, date is reliable. Alyssa
  Goldberg is the most frequent contributor.

## Static pages

| URL | `<title>` | Notes |
|---|---|---|
| `/` | SOS | Home |
| `/programs` | Programs | |
| `/about-us` | About Us | "About Us" in nav |
| `/community` | Community | |
| `/resources` | Get Help – Mental Health Resources | nav label is "Get Help" |
| `/news` | Sounds of Saving – News | news index (13 paginated pages) |
| `/songs-that-found-me-at-the-right-time` | Songs That Found Me at the Right Time | series landing |

Primary nav exposes: **Get Help** (`/resources`), Programs, About Us, Community,
News, and a **Donate Now** button -> `https://secure.givelively.org/donate/sounds-of-saving`
(external; donation is not an on-site page).

Resource sub-collections (children of the Get Help / resources system, Webflow
Collections):
- `/categories/<slug>` — **16** category pages: addiction, anxiety-stress,
  community-services, crisis-services, depression,
  domestic-violence-sexual-assault, eating-disorders, health-wellness, hotline,
  houselessness, lgbtq, multilingual, suicide-prevention-support,
  support-services, therapy-services, youth-families.
- `/locations/<slug>` — **33** US-city location pages (atlanta-ga, austin-tx,
  bay-area-ca, boston-ma, chicago-il, ... ). These are a resource directory
  faceted by city.

The home-page index files with `?bdce394b_page=1/2` are an additional paginated
Collection List embedded on the homepage (Personal Stories / News teasers), not
separate destinations.

## Design tokens

**Main stylesheet (one file):**
`https://cdn.prod.website-files.com/5d6546885bb4104c9eb80a98/css/soundsofsaving.webflow.shared.dab4b6213.css`
(~134 KB; standard Webflow shared CSS). Not captured by the mirror because it is
on the cross-domain CDN; fetched directly for this analysis.

**Fonts:** primary typeface is **Inter** (bundled as a Webflow web font:
Inter-Regular / Inter-Medium / Inter-SemiBold / Inter-Italic woff). `body` is
`font-family: Inter, sans-serif`. A couple of Webflow default rules reference
Arial / Helvetica Neue fallbacks, but Inter is the brand face throughout. No
Google Fonts / Typekit / external font loader is used.

**Color palette** (from CSS custom properties — these are the real tokens):

| Token | Value | Role |
|---|---|---|
| `--white` | white / `#fff` | page background |
| `--white-smoke` | `#f0f0f0` | light section background |
| `--gray` | `#dfdfdf` | borders / dividers |
| `--dark-grey-2` | `#9e9e9e` | muted text |
| `--medium-grey-1` | `#292929` | dark surfaces |
| `--dark-slate-grey` | `#444` | secondary text |
| `--dark-grey` | `#111` | primary body text |
| `--black` | black / `#000` | headings / max contrast |
| `--header-blue` | `#006fe5` (`#006fe5f0` w/ alpha) | header / accent blue |
| `--links-color` | `#91a7db` | link color (soft periwinkle blue) |

So the brand is essentially: near-black text (`#111`) on white, greyscale
structure, with a blue accent (`#006fe5` strong, `#91a7db` for links). Other
blues seen in the raw CSS (`#0082f3`, `#3898ec`) are Webflow form/widget
defaults, not brand tokens.

**Logo (mirror / CDN paths):** all on
`cdn.prod.website-files.com/5d6546885bb4104c9eb80a98/`:
- Primary wordmark: `5d6fde7d2fd62fb2462690e9_SOS_Small2_Logo_1_%402x.png`
  (responsive variants `-p-500` / `-p-800` / `-p-1080`).
- Alt mark: `5d6fde6516986414adfef489_SOS_Small2_Logo_2_%402x.png`.
- Animated logo: `5d76f0478d6d919eee820033_Logo_GIF_Animation_v2.gif` (home hero).
- Favicon / webclip: `5d770154b9339dc6e227c51b_SOS_Logo_Webclip.png`,
  `5d770395247be103173cccec_sos-logo-ico.png`.

## Parse notes (for the extraction phase)

Markers a parser can key on in the mirrored HTML:

**News post (`/news/<slug>.html`):**
- Title: the single `<h1>` is the article title; also mirrored in
  `<meta property="og:title">` and `<title>`.
- Summary: `<meta property="og:description">` carries a clean one-line summary.
- Hero image: `<meta property="og:image">` (on `cdn.prod.website-files.com/5d71b6d4972e97253aaebb04/...`).
  Note the per-post og blocks override a site-wide default og block that also
  appears in head — take the **first / post-specific** one (the one whose content
  matches the `<title>`), not the generic "Sounds of Saving" fallback.
- Body: rich text in `.w-richtext` blocks (class names like
  `rich-text-block-2 w-richtext`). Posts have 2–8 such blocks; concatenate them
  in document order for the body. Strip Webflow figure wrappers
  (`figure.w-richtext-align-* .w-richtext-figure-type-image`) or keep as images.
- Date: a `Month DD, YYYY` string, present in 70/70 posts, inside
  `class="heading-3"`. Regex `/[A-Z][a-z]+ \d{1,2}, 20\d{2}/` is a safe extractor.
- Author: optional "By <Name>" string, ~35/70 posts, inside `class="paragraph-9"`.
  Regex `/^By (.+)$/` after trimming. Absent on the rest — leave author empty.

**News index / pagination:**
- Webflow Collection List. Pagination query param is `?4351cff9_page=N` (N=1..13).
  To enumerate all posts, walk those 13 pages and collect `href` values matching
  `/news/<slug>`; dedupe (some posts feature on multiple pages).

**Songs landing (`/songs-that-found-me-at-the-right-time.html`):**
- Single editorial page. YouTube embeds via `youtube.com/embed/<11-char-id>` and
  oEmbed cards. The canonical episode set is the YouTube playlist
  `PLrBVhh4EJvMOjNUKZO4C07XwSj0EAD0XH`, not the HTML. Use the YouTube Data API if
  per-episode song data is needed.

**Resource directory:**
- `/categories/<slug>` (16) and `/locations/<slug>` (33) are Webflow Collection
  item pages feeding the Get Help directory. If replicated, treat as two faceted
  collections (by topic, by city) over a shared resource dataset.

## Open items / ambiguities

1. **Song episodes have no site pages.** The plan's "songs collection" maps to a
   YouTube playlist. Decide in a later phase whether to (a) mirror the landing
   page as-is, or (b) pull the playlist via the YouTube API into
   `content/songs/`. Cannot be resolved from the HTML mirror alone.
2. **Author missing on ~half the news posts** — extraction should treat author as
   optional, date as required.
3. **Two Webflow site ids** in play for assets; image rehosting in a later phase
   must pull from both CDN roots.

## Songs parse

- Source: /private/tmp/claude-501/-Users-jonas-Documents-GitHub-org-jonasjohansson-skynet/93629cee-452e-4961-8446-e07dd1fcb140/scratchpad/full.jsonl
- Playlist: https://www.youtube.com/playlist?list=PLrBVhh4EJvMOjNUKZO4C07XwSj0EAD0XH
- Episodes processed: 6
- Content files (written or present): 6

  - a-love-supreme-pt-1-acknowledgement.md  (fth9UUa1Mfw)  A Love Supreme, Pt. 1- Acknowledgement
  - nina-simone-who-knows-where-the-time-goes.md  (OXeh742_jak)  Nina Simone — Who knows where the time goes
  - prince-something-in-the-water-does-not-compute.md  (LwoSyRd5ngY)  Prince — Something in the Water (Does Not Compute)
  - the-pixies-monkey-gone-to-heaven.md  (XycBLF6kWuY)  The Pixies — Monkey Gone To Heaven
  - christforte-out-on-the-weekend.md  (08ts6hekHlc)  ChristForte — Out on the Weekend
  - jackie-mendoza-book-of-dreams.md  (nwU5UTqCbMU)  Jackie Mendoza — Book of Dreams

- No failures.

## News parse

Parsed **70 / 70** mirrored news posts into `content/news/*.md` via `scripts/parse-news.js` (cheerio DOM walk). Body = the two `.w-richtext` blocks per post converted to clean Markdown (short lead block folded in as an emphasised intro), hero image from the post-specific `og:image`, inline figures rehosted from the Webflow CDN into `src/assets/img/news/`.

No posts failed extraction (every mirrored post had a title + date).

Note: `donor-thanks-email` is a fundraising thank-you letter rather than an editorial article, but it carries a valid title, date and body, so it was parsed rather than dropped. Remove the file if a non-article should be excluded.

All hero and inline images downloaded successfully.


## Resources parse

Source: the Webflow mirror's `categories/*.html` (16 topic pages) and
`locations/*.html` (33 city pages). Each page renders the same `.resource-row`
markup, and the same organization appears on multiple topic/city pages, so
`scripts/parse-resources.js` extracts every row and dedupes into one record per
`(url + name)`, aggregating the categories and locations it was found under.

Result: real listing data (not a thin link hub), so `/resources` renders the
full faceted directory.

| Metric | Count |
|---|---|
| Categories (topics) | 16 |
| Locations (cities) | 33 |
| Raw resource rows parsed | 1545 (965 category + 580 location) |
| Unique resources after dedupe | 504 |
| Resources with a phone number | 402 |
| Resources with a description | 503 |

Skipped: `locations/orlando-fl.html` yielded no `.resource-row` items (empty
collection page on the source site), so it contributes no resources and is
dropped from the location facet list.

Output: `content/resources.json` (`{ categories[], locations[], resources[] }`).
Loaded by `src/_data/resources.js`, which exposes `all`, `byCategory`,
`byLocation`, and the canonical facet lists with per-facet counts.

## Resources normalization

`scripts/normalize-resources.js` is a re-runnable cleaner that reads
`content/resources.json` (the parser output), cleans it in place, and writes it
back with a printed summary. It is idempotent: a second run reports zero
changes. Run it after any re-scrape, before build.

Counts from the clean run (504 raw resources in):

| Change | Count |
|---|---|
| Resources after dedupe | 491 |
| Phones extracted into the `phone` field | 38 |
| Descriptions cleaned (pipe/label cruft stripped) | 448 |
| Dead Webflow URLs (`.html#`) nulled | 17 |
| Duplicate records merged (by url, then name) | 13 |
| Uncategorized rows bucketed into "Other / General" | 84 |
| Resources tagged with one or more `languages[]` | 64 |
| Resources flagged `national` | 33 |
| Resources left with empty categories | 0 |

Notes:

- **Phones / descriptions.** Pipe-delimited `Label: value` segments
  (`Phone:`/`Email:`/`Text:`/`Call:`) are split out; when the `phone` field was
  empty a real number is mined from the description (or its own field) and the
  contact cruft is stripped from the blurb. Already-present phones are
  normalized (e.g. `(844) 493-8255` kept whole).
- **Default bucket.** Empty `categories[]` become `["other-general"]`
  (label "Other / General"), which is appended to the category facet list so
  filters never carry a null/empty facet. (89 raw empties → 84 after dedupe
  folded five empties into richer records.)
- **Dedupe.** Groups by normalized url first, then by normalized name; keeps the
  richest record (longest description, has url/phone, most facets) and unions
  the dropped record's `categories[]` + `locations[]` into it.
- **Derived fields.** `languages[]` detects Spanish / Multilingual / Mandarin /
  Korean / Vietnamese / ASL / French signals in name+description (and the
  `multilingual` category). `national` is true for explicit "national" location
  slugs plus a nationwide-hotline heuristic (known lines + "national"/"nationwide"
  language). `src/_data/resources.js` surfaces a single reconciled "National"
  location facet from this.
