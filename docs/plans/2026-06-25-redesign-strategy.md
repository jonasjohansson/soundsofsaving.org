# Sounds of Saving - Redesign Strategy (Final)

> Produced 2026-06-25 by an 11-agent analysis workflow (8 parallel lenses ->
> synthesis -> adversarial critique -> revision). Source brief: the org feels the
> message does not land; goals = clearer educator section, reframe News, better
> resource overview, present Programs better, show the cultural work (IG/YouTube),
> a new typeface, and ditch the depersonalizing color overlay.

**Confirmed facts (with caveats):** 504 resources, 16 categories, 33 locations
(not yet verified to be 33 distinct cities), 70 news posts. The "Songs That Found
Me" series is really **31 episodes (Mar 2018 - Jun 2023)**, not the 6 our playlist
pull captured - co-branded "988 Lifeline x Sounds of Saving" (Bartees Strange,
SASAMI, Sharon Van Etten, CHAI, Meshell Ndegeocello). Their Instagram (~13K) is
their most alive surface; the Community page is a 62-word shell.

## The core problem (why the message doesn't land)

The site opens with an animated logo over an abstract color-wash video, three
abstract words ("Music. Youth Culture. Mental Wellness."), and a donation ask -
before it ever says what the org does. The one sharp self-description is buried
three scrolls down. The homepage tries to be four things at once (content studio,
school program, crisis directory, fundraising campaign), so it reads as none. A
hardcoded 2022 event and a "(c) 2019 LLC" footer make it feel frozen. The org's
strongest assets (a 31-episode artist video series, a who's-who artist roster, a
504-resource directory, a 13K Instagram) are demoted, mislabeled, or punted to
Instagram. The brand is a living feed; the website is a stale brochure that
flattens the human warmth (real artists, faces, music) that is the actual product.

## Positioning

**One sharp line:** *"We help young people use music to take care of their mental health."*

**What we do:** Sounds of Saving is a music and mental-health nonprofit for young
people ages 14 to 24. We make intimate films where artists share the song that got
them through a hard time, we bring a music-based, SEL-rooted curriculum into high
schools and colleges, and we maintain a vetted directory of 500+ real mental-health
resources across the US.

**Audience order:** youth (14-24) first, educators second, donors third.
Implemented as a config toggle so a "keep fundraising up" answer is a one-line flip.

## New information architecture / sitemap

Plain-language nav (no internal "pillar" jargon):

```
PRIMARY NAV
  Sessions      (the artist video series - was "Songs That Found Me")
  Programs      -> For Educators (own nav item on wide screens)
  Get Help      (the resource finder, promoted to primary)
  Stories       (was "News" - curated, typed)
  About
  [ Donate ]    (config-toggled: secondary by default; promotable to hero)

UNDER SESSIONS (sub-tabs)
  Episodes   (the ~31 core films)
  Check-Ins  (lighter touchpoint series)
  Conversations (longer-form talks)
  Artists    (index spanning all series)
  Songs That Found Me  (the fan/UGC card wall)

FOOTER / SECONDARY
  Archive    (retired gig reviews / round-ups, URLs preserved, out of nav)
```

- **Educators:** dedicated `/educators`, own nav item. Two tracks (SoS HS, SoS
  Uni) + "Bring an Artist Workshop"; each with proof + one CTA + intake form
  (Netlify Forms -> a shared `programs@` alias + Airtable, never a personal inbox).
- **News reframe:** "News" dies; all 70 posts redistribute. Phase 0 delivers the
  per-post mapping spreadsheet (current URL, target bucket, new URL, 301 rule).
  Buckets: ~27 -> Stories (artist interviews + music-as-tool), ~9 clinical
  explainers -> folded into Get Help as a "learn" layer, ~4 resource sheets ->
  Get Help entries, the `a-sound-approach` white paper -> About (canonical), ~29
  perishables -> `/archive`. 301s for all 70.
- **Resources:** Get Help promoted to primary, rebuilt as a finder (search +
  Topic/Location/Language filters, result counts, per-topic intros, absorbed
  explainers). Data cleaned first.
- **Programs:** 3 numbered blocks -> program cards (what / who / what happens /
  proof / CTA), grouped by a backstage Listen-Learn-Connect taxonomy (page only).
- **Cultural work:** Sessions becomes a top-level destination with sub-tabs,
  per-episode pages, an Artists index, the fan card wall, and a live social
  surface (recent YouTube uploads + IG grid, cached at build).

## Section-by-section direction

- **Home** - answer "what is this?" in 3s. Hero = mission line in the new display
  face over a real full-color artist still (or muted Session clip) + ONE primary
  CTA (Watch a Session). Below the hero: one support line (ages 14-24, free); four
  doors (Sessions / Get Help / Educators / Donate); one embedded hero Session; a
  Get Help teaser; an artist marquee; the Songs-That-Found-Me module. Kill the
  2022 event; fix the 2019 footer.
- **Programs** - program cards under Listen/Learn/Connect headings; lead with the
  988-co-branded series; a "how it works" loop. "Social Impact Media" card held
  until its youth-vs-B2B nature is confirmed (neutral Partnerships stub fallback).
- **Educators (new)** - thesis headline + two tracks + "what you get" spec tables
  + proof band (CDC/Surgeon-General stats, 988/Vibrant partnership, press, board)
  + one intake form per track + a classroom crisis-card pack as lead magnet. Tone
  fixed to present-tense / "now accepting 2026-27 pilot partners".
- **Get Help / Resources** - persistent crisis band (988 / 741741 / Trevor /
  not-in-US), separate from the scroll; one client-side finder; per-topic intros;
  absorbed explainers; verification badges. Print "500+ vetted resources across the
  US" (always true); only say "33 cities" if verified. 89 uncategorized rows
  default to an "Other / General" facet so the finder is never broken.
- **Cultural work / Sessions** - episode grid (~31 cards) replacing the single
  scroll; per-episode pages from existing content + YouTube id; an Artists index;
  the fan card wall; a live "Latest" strip (YouTube Data API + IG, cached).
- **About** - founding story + the 35-person advisory roster as designed proof +
  "Why Now" stats + the `a-sound-approach` white paper (its one canonical home).
- **Community** - retire as standalone (62 words); fan wall -> Sessions, partner
  logos -> About/Home strip; 301 to Sessions.
- **Donate** - keep external GiveLively; default secondary; config toggle to hero.

## Typography & visual direction

**PRIMARY - "Liner Notes."** Type carries the energy, real full-color faces carry
the humanity, a controllable image system rescues messy assets.

- **Type (all SIL OFL, free to self-host):** Display - **Bricolage Grotesque**.
  Body/long-form - **Newsreader** or **Source Serif 4**. Accent - **Space Mono**
  for song cards/tracklists. Tight headline tracking; ~1.6 body line-height.
- **Palette - "warm dusk, not corporate blue."** Off `#006fe5`/periwinkle. Warm
  ink `#16130F` on warm paper `#F6F1E9`; one emotive primary (dusk violet `#5B4B8A`
  or warm coral `#E8543E`); calm sage/teal `#3E6F66` reserved for Get Help.
- **Imagery (the G8 fix) - full-color is the DEFAULT.** Any image >=1000px,
  rights-cleared, displays full color at rest, everywhere. Duotone-at-rest is
  reserved ONLY for genuinely-too-low-res salvage assets (600px event JPEGs),
  where it functions as honest treatment + grain + caption frame (zine/liner-note),
  blooming to full color on focus. Systematize the "Songs That Found Me" card
  (portrait + typeset tracklist in mono) as the repeatable brand unit.

**Alternates (license-honest):** (B) Hanken/Schibsted Grotesk (OFL) + Instrument
Sans (OFL) + Redaction (free, NOT OFL - confirm web/self-host rights). (C) Clash
Display + Switzer + Hanken via Fontshare (free, NOT OFL - confirm rights). Only the
Primary pairing is greenlit today (fully OFL, unambiguous).

## Three creative directions

1. **"Liner Notes" (RECOMMENDED).** A record someone handed you saying "this got
   me through it." Bricolage + Newsreader + Space Mono; full-color portraiture by
   default, duotone+grain only as salvage; the song-card as recurring unit. Highest
   fit, lowest risk, no license ambiguity.
2. **"Open Mic."** A live room - motion, video-first, the feed on-site. Clash
   Display + grotesk (Fontshare caveat). Muted Session clips as heroes. Best answer
   to "feed vs brochure," but riskier (depends on archive video quality; can
   undercut crisis-content gravity).
3. **"Field Guide."** Lead with utility/care - finder and educator tools as the
   spine. Humanist serif + calm grotesk, sage/teal forward. Strongest for
   educator/crisis audiences; undersells the cultural firepower - better as a
   *mode* inside Direction 1.

**Recommendation:** build **Direction 1** as the system, borrow Direction 2's
video-forward treatment for the Sessions hub/home hero, apply Direction 3's calmer
palette/wayfinding inside Get Help and Educators. One system, three registers.

## Success metrics (acceptance criterion per goal)

- G1: in 5-second tests, >=80% can answer "what does this org do?" from above the fold.
- G2: a counselor reaches a submitted intake form in <=3 clicks; >=1 inquiry/week in 30 days.
- G3: 70/70 posts have a target bucket + 301; zero orphaned/404 legacy URLs.
- G4: median time-to-first-relevant-resource <=10s; 0 broken filter facets.
- G5: every program rendered as a card with all 5 schema fields populated.
- G6: all ~31 episodes + all series reachable in <=2 clicks; a live YouTube/IG surface on home.
- G7: all production type self-hosted under confirmed free/OFL licenses.
- G8: color-overlay video removed from hero; index images render full-color at rest.

## Assumptions encoded (each with a no-rebuild fallback)

- A1 audience youth-first/donor-third -> `donate.heroSlot: false` toggle.
- A2 SoS HS/Uni pre-launch -> "now accepting 2026-27 pilot partners" copy.
- A3 Sessions = living archive -> social-feed strip shows it's current.
- A4 numbers unprinted until confirmed -> only "500+ resources across the US".

## Open questions that block content (not the build)

- Q5 cost/facilitator model for programs (stub: "Contact us for pricing").
- Q6 "Social Impact Media" youth program vs B2B (stub: neutral Partnerships card).
- Q-backend: does a `programs@` alias + Airtable inquiry base exist?
- Q-assets: rights-cleared high-res hero still + crisis-card download pack?
- Q-access: authed IG + YouTube access to harvest stills + quantify content.

## Phased build plan

- **Phase 0 - Trust + automated data hygiene (low effort, automated):** fix
  footer/entity + remove 2022 event; normalize `resources.json` (strip `Phone:`
  prefixes, fill empty phone fields, redirect dead `.html#` URLs, add
  `languages[]`/`national`/`verified_on`, default-bucket the 89 uncategorized);
  produce the 70-post mapping spreadsheet (D1).
- **Phase 0.5 - Human-judgment data work (NOT low effort, parallel):** per-post
  Stories-vs-archive split; dedup the ~15 duplicate orgs; triage the 89; verify
  "33 locations" are cities.
- **Phase 1 - Make the message land:** hero = mission line + single CTA over real
  imagery; four doors below; ship the type system + warm palette + full-color
  image treatment.
- **Phase 2 - The two structural rebuilds (content already exists):** the Get Help
  finder; the Sessions hub (episode grid, per-episode pages, Artists index, live
  YouTube/IG surface). Re-scrape the full ~31-episode series first.
- **Phase 3 - Educators + Programs + Stories (org-dependent):** `/educators` with
  tracks + intake forms; Programs into card schema; Stories typed + the 70-post
  redistribution + `/archive` with 301s.
- **Phase 4 - UGC + polish:** fan card wall, On Tour/Find Us strip, designed About
  roster, cross-wiring, IG-still refresh.

**Org-independent baseline (ships even if the org never responds):** footer/entity
fix, remove 2022 event, full type system + warm palette, hero rebuild, resources
normalization + 301s, Sessions episode grid + per-episode pages, Stories shell.
