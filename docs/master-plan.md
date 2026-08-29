# soundsofsaving.org — Phase 1 master plan

_Drafted 29 Aug 2026, the day after the kick-off call with Nick Greto and Charlie Gross._

## 1. Where we are

- **Agreed scope.** Phase 1 = fixed fee 30,000 SEK, approved by the SoS board (8 Jul). Covers: information architecture around the five pillars, homepage/mission clarity with STFM prominent, design system, content integration, responsive/SEO, domain + Webflow disconnect, Pages CMS. Phase 2 wishlist: Impact section, "keep it alive" (Stories/Instagram), STFM radio-dial discovery.
- **Inputs received (28–29 Aug).** "SoS Site content and one sheet" (elevator pitch, org description, approach), "SoS HS 2026" (the high-school program in detail), "A Sound Approach" (research paper Charlie co-authored with NYU/We Are All Music). Charlie's Albany panel talk (received 29 Aug, see §2b). Photo archive folder from Charlie/Nick coming "this weekend".
- **Shared workspace.** Drive folder `Media/` (empty until now) + Google Doc `soundsofsaving.org` (empty). I've added `Media/Instagram selection (Jonas, 29 Aug 2026)`.
- **Current dev site.** `soundsofsaving.jonasjohansson.se` — Eleventy + Pages CMS, 37 sessions, 70 stories, 491 resources, Programs/Educators/About pages.

## 2. What changed in the positioning (from the one-sheet)

The one-sheet is a much sharper story than what the site says today. It should become the spine of the whole site:

| | Site today | One-sheet (new) |
|---|---|---|
| Line | "Find hope in music." | **"Music is already a mental health tool. We help young people use it intentionally."** |
| Who | "for everyone, with young people at heart" | Youth mental health, full stop |
| Three things we do | Listen / Learn / Connect (film, curriculum, events) | **Artists** (storytelling: STFM + original films) / **Schools** (SoS High School) / **Community** (concerts, festivals, campuses) |
| Tone | warm, slightly abstract | concrete, "an adjunct not a replacement", research-backed (NYU Ripollés Lab evaluation) |

Decisions taken from the call:
- **SoS Uni is dormant → remove** from Programs and Educators (currently a card on both). Keep the campus work under Community (UCLA, Columbia, campus events already happen).
- **Be blatantly clear about the paths a visitor can take** — the hero must route people, not just set a mood.
- **Show how donations are put to use.** Today the site has a single "Donate" nav button and nothing else.
- **Real photography** from the archive and Instagram, not stock or stills only.

## 2b. Charlie's Albany panel talk — what to lift

_Received 29 Aug as "SoS Albany.txt" (the Coalition to Empower Our Future panel). It's the voice the site should have: clinician + music person, concrete, no jargon._

**Origin and credibility (About)**
- Charlie: worked in the music space *and* as a clinician with adolescents — say this on About, it's the credibility line.
- Founding question: "why, if music is so central to coping and to being young, is it not more integrated into mental wellbeing?" → "a powerful tool hiding in plain sight."
- Started as a public-health storytelling project → led to the 988 partnership "because they recognized that music reaches people traditional mental-health messaging often misses."

**Proof points we didn't have (Impact / Educators)**
- 2023 MTV Mental Health Action Day grant → programs in **2 NYC public high schools**, artists performing then co-facilitating small groups with therapists.
- Principal quote: a high-risk student who'd rejected every counseling outreach called it "pretty cool." → the best testimonial on file; use it on Educators and Impact.
- SoS HS is **currently piloting in DC**.
- Papageno effect; Logic's "1-800-273-8255" measurably increased Lifeline calls.
- NYU Ripollés Lab named as research partner; Levitin on what music does at brain level.

**Lines to use nearly verbatim**
- "We're not telling teenagers to listen to music — that would be absurd — but we're taking advantage of the fact that they do." (Schools / Educators)
- "Music is where kids already are — literally and figuratively." (What we do)
- "It doesn't replace great therapies such as DBT but can be a bridge to it." (About › Our approach)
- Tour/festival paragraph: "Instead of just handing out pamphlets, we invite young people to share the song that found them at the right time…" (Community)

**New audience: parents.** The closing paragraph ("if your teenager disappears into headphones, don't panic… ask them what they're listening to and why") is a ready-made Resources/Stories piece — *For parents: how to talk about the music your kid loves*. Cheap to add, high value, and it widens who the site serves without adding a program.


## 3. Information architecture (five pillars, from Nick's 26 Jun email)

```
Home
About        Mission & story · Team & board · Partners · Research (A Sound Approach)
Programs     Artists (STFM + films) · Schools (SoS HS) · Community & events
   └ Educators  (dedicated landing for SoS HS pilots — intake form)
Impact       (Phase 2 shell in Phase 1: numbers we can stand behind + testimonials placeholder)
Resources    Get Help directory (already built) + 988
Support      Donate · Partner with us · Volunteer   ← NEW page
Sessions     STFM archive (keep top-level; it's the flagship)
Stories      keep, low-maintenance
```

Nav: `Programs · Educators · Sessions · Resources · About · [Support ▸ Donate]`. "Support" replaces the bare Donate button so the button leads somewhere that explains the ask.

## 4. Homepage — three doors

1. **Hero.** Real image (see selection). Headline = the one-sheet line. Sub = one sentence. Then **three doors, not two**: *I'm an artist / fan* → Sessions & Community · *I work at a school* → Educators · *I need help* → Resources. Donate stays in the nav.
2. **What we do — Artists / Schools / Community.** Three blocks, each with a real photo, 2 lines from the one-sheet, one link.
3. **Featured Session** (keep; it's STFM prominence).
4. **Proof strip.** 988 partnership, NYU evaluation, Responsible 100, press (Pitchfork/RS/MTV), partner logos.
5. **Support block.** "Where your donation goes" — three concrete lines (see §6), then Donate.
6. Featured story (keep).

## 5. Page-by-page work list

### About
- Rewrite intro from "Org description" + "Why music?". Add **Our approach** (the seven principles: music as emotional language, connection as prevention, artists as trusted messengers, creativity creates engagement, participate don't extract, meet young people where they are, an adjunct not a replacement).
- **Research** section: A Sound Approach (already linked) + "SoS HS is being evaluated with NYU's Ripollés Lab" + Pablo Ripollés / Anna Palumbo on the advisory board.
- Photos of Nick and Charlie (still missing — none on Instagram; ask for them explicitly).

### Programs
- Restructure groups to **Artists / Schools / Community** (rename from Listen/Learn/Connect, copy from one-sheet).
- Remove the **SoS Uni** card. Fold "Bring an Artist Workshop" under Schools as an option.
- Schools card = SoS HS: five sessions, the five themes (music/brain/emotion · mental health & coping · identity · connection · resilience), "not therapy", NYU evaluation, partner logos (988, Save The Music, Loveland, TikTok, SoundCloud, US Dept of Education).

### Educators
- Single track (SoS HS) instead of three. Use "SoS HS 2026" verbatim structure: The context → The gap → Where SoS HS fits → What schools get → Outcomes → Trusted by → Bring it to your school (nick@soundsofsaving.com + form).
- Real classroom photography (Montclair Kimberley, Hollywood High, Bartees at SoS HS, UCLA focus group).

### Support (new)
- **Donate** with "what it funds": a school pilot, a STFM film, a tour stop with a 988 counsellor + wallet cards. Get exact costs from Nick to make it real ("$X puts SoS HS in one classroom for a semester").
- **Partner with us** (artists, labels, festivals, brands) · **Volunteer**.
- Keep GiveLively link; consider embedding their widget.

### Impact (Phase 2 shell)
- Stub page with what's true now: schools/cities reached, sessions filmed (37), resources (491), 988 partnership since 2022, Responsible 100 (2025). Testimonials slot.

### Resources / Sessions / Stories
- No structural change. Sessions: hero credit + "share your song" card CTA (ties to the STFM cards and the radio-dial idea later).

### Global
- Settings: new tagline/meta, nav, socials. Footer: add Support + 988.
- Remove `SoS Uni` from `.pages.yml` schemas too.
- Domain: GoDaddy DNS → GitHub Pages; disconnect Webflow at launch.

## 6. Donations — making it blatant

The site never says what money does. Proposed copy skeleton (needs Nick's numbers):

> **Where your gift goes.** Sounds of Saving is a 501(c)(3). Every dollar funds one of three things: **a classroom** — SoS HS in a new school (five sessions, materials, an artist visit); **a film** — a Song That Found Me at the Right Time session with an artist and 988; **a tour stop** — a mental-health professional, a 988 counsellor and wallet crisis cards at a show where care is hard to find.

Show this on Home, Support and in the footer. The May-2024 "$100K by end of May — fund SoS's school programs" campaign post shows they already think this way.

## 7. Photography — Instagram selection

Scraped 1,020 posts (Sep 2023 → Aug 2026). 46 posts picked, in six buckets, with first frames + full-carousel contact sheets and a README pointing at frames. In Drive: `Media/Instagram selection (Jonas, 29 Aug 2026)`.

| Bucket | Use on site | Strongest |
|---|---|---|
| 01 STFM storytelling | Hero, Sessions, Artists block | Skullcrusher shoot (living-room), Geese/Nick Drake, Cameron Winter, Clairo |
| 02 Schools / SoS HS | Educators, Schools block | Montclair Kimberley (Apr 2026), Hollywood High, Bartees in classroom, UCLA focus group with Charlie |
| 03 Tour & community | Community block, Support | 6LACK tour tabling + card wall, National Homecoming tabling, Hinterland fans with cards, Power of Music benefit |
| 04 STFM cards | Discovery motif, Sessions, radio-dial idea | Re:SET cards, "Music has listened to me…", Lorde / Michelle Zauner / Nick Cave cards |
| 05 Team, board, research | About | Ripollés, Palumbo, advisory board portraits, Ocean Vuong panel, Coalition panel |
| 06 Impact / proof | Impact, Support | 988 data post, $100K campaign, year recap |

Gaps to ask for: **portraits of Nick and Charlie**, **wide classroom shots with students' faces cleared for use**, **originals** of the picks (Instagram sizes are 1080px; Charlie shot many of these — the archive should have RAWs), and **one "living room" hero frame** in landscape.

Rights note: photos credited to other photographers (@alyssa.goldberg, @saslj_photo, @allisonmichaelorenstein…) need a yes before web use; SoS-shot ones (Charlie) are fine.

## 8. Timeline and next steps

| When | What |
|---|---|
| Week of 31 Aug | Nick/Charlie: archive folder + portraits + donation cost lines + OK to quote the principal. Jonas: IA + nav + Programs/Educators restructure (SoS Uni out, one-sheet copy in). |
| Week of 7 Sep | Home rebuild (three doors, what-we-do, proof strip, support block). Support page. About rewrite. |
| Week of 14 Sep | Photography pass across pages, Impact stub, settings/SEO, review call. |
| Week of 21 Sep | Revisions, DNS cut-over, Webflow off. Launch. |

Ask now: (1) the archive folder, (2) Nick + Charlie portraits, (3) three "what a dollar buys" numbers, (4) OK to quote the principal and name the DC pilot, (5) confirm SoS Uni removal and the Artists/Schools/Community naming.
