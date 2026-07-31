# Brand implementation

How this site implements the **Toledo Athletics Branding Guidelines (2023)**,
and where it deliberately substitutes something the guide can't supply for web.

Anything below marked **stand-in** is a compromise on something the guide
can't supply for web. Everything else is taken directly from the guide.

The two typeface substitutions are **approved** — see [Type](#type). The
remaining stand-in is a single interactive shade of 116C, which is never
applied to a mark.

## Colour

The guide specifies exactly two brand colours. The site uses those two, plus
white and black — both of which the guide sanctions as logo backgrounds — and
a small set of neutrals tinted toward 289C so nothing reads warm.

| Token | Value | Source |
|---|---|---|
| `--rkt-navy` | `#0A2240` | Midnight Blue · PANTONE 289C (guide p.5) |
| `--rkt-gold` | `#FFCD00` | Athletic Gold · PANTONE 116C (guide p.5) |
| `--rkt-white` | `#FFFFFF` | the wordmark's third colour |
| `--rkt-black` | `#000000` | the guide's black-ground lockup (p.7) |
| `--rkt-gold-press` | `#E6B900` | **stand-in** — a shade of 116C for button press/hover only. Never applied to a mark. |
| `--rkt-paper` | `#F2F4F7` | neutral ground |
| `--rkt-slate` | `#4A5A70` | secondary text on paper — 6.4:1 |
| `--rkt-mist` | `#C6D0DE` | secondary text on navy — 10.3:1 |

**Athletic Gold never carries text on a light background.** `#FFCD00` on
`#F2F4F7` is 1.4:1 — it fails contrast at every size. Gold is for fills,
rules, and text on navy or black only. Links on paper are navy.

Before this pass the site used `#002649`, `#003F87`, and `#FCD116` — three
colours, none of them the official two.

## Type

The guide names three licensed faces. None can be served on the web without
a licence, so each has an open stand-in chosen for skeleton, not vibe.

| Role | Guide (p.12–14) | Site uses | Note |
|---|---|---|---|
| Campaign / display | Smart Sans Std | **Saira Condensed** | **stand-in.** Squared-off condensed grotesque, closest open match to Smart Sans' skeleton. |
| Secondary / body | Gotham | **Montserrat** | **stand-in.** The standard open substitute for Gotham; near-identical uppercase proportions. |
| Logotype | Eurostil Condensed Heavy Italic | *not used* | The wordmark ships as artwork, so the face is never needed as live text. |

There is **no monospace in this brand.** The previous build set every label,
statistic, and table header in IBM Plex Mono, which came from nowhere in the
guide. Labels are now the secondary face tracked wide — the same treatment
the guide gives its own sub-brand tags.

### Approval

Saira Condensed and Montserrat are **approved by Athletic Development as web
substitutes for Smart Sans Std and Gotham** — confirmed verbally, July 2026.

Record the approver and date here when written confirmation lands. The guide's
own Trademark & Licensing section (p.17) makes the department the authority on
brand usage, so an auditable record of who approved a departure from the named
faces is worth keeping alongside the code that implements it.

Should Athletics later license Smart Sans Std and Gotham for web, swapping them
in is two files: the family names in `src/assets/css/tokens.css` and the
`@font-face` blocks in `src/assets/css/fonts.css`. The Google Fonts link for
SIDEARM embeds lives in `scripts/build-embeds.mjs`. Nothing else changes.

## Marks

Official artwork lives in `src/assets/img/brand/`, copied from `Branding/`:

| File | Guide variant | Use on |
|---|---|---|
| `toledo-primary-on-navy.png` | primary, dark ground | navy, and any dark photo field |
| `toledo-primary-on-light.png` | primary, full colour | paper |
| `toledo-primary-on-gold.png` | primary, gold ground | gold fields |
| `toledo-primary-on-black.png` | primary, black ground | black fields |
| `toledo-rocket-gold.png` | secondary rocket | navy and black |
| `toledo-rocket-navy.png` | secondary rocket | paper and gold |

Render them through the macros in `src/_includes/brand.njk` — never with a
bare `<img>`. The macros size marks **by height with `width: auto`**, so the
supplied proportions can't be altered, and they carry the clear space the
guide requires (p.7): X = 1/4 the athletic logo's height, X = 1/3 the
rocket's. Both ratios are tokens (`--rkt-clear-logo`, `--rkt-clear-rocket`).

### Rules this build enforces

From the guide's incorrect-application page (p.15) and vaulted/prohibited
logos page (p.11):

- **Nothing redraws the rocket.** The previous build drew its own rocket in
  inline SVG for the header mark, the favicon, and a "trajectory" divider on
  every section head. All three are gone. Where the rocket is wanted, the
  official file is placed; where a divider is wanted, `slant()` in
  `components.njk` draws plain bars raked to the logotype's italic — geometry
  that quotes the wordmark's lean without going near the artwork.
- No effects, outlines, rotation, or tilt on any mark.
- No mark used as a repeating pattern.
- No mark in a colour combination outside the six files above.

### Derived assets

`npm run brand` regenerates favicons and the social card from the official
files — pure Node, no image library, so backgrounds land on the exact brand
hex with no colour-space round trip. Outputs are committed; re-run only when
a source logo changes.

- `favicon-32/180/512.png` — the rocket mark on Midnight Blue, clear space respected
- `share-card.png` — the athletic logo on Midnight Blue, 1200×630
- `site.webmanifest`

## Verbiage

The guide's approved and unapproved lists (p.16) apply to all copy. In short:
**Toledo**, **Rockets**, **Toledo Athletics**, **Toledo Rockets**, **UToledo**,
and *Toledo/Rocket + sport* ("Toledo Football", "Rocket Football") are
approved. **UT**, **UT Rockets**, **Lady Rockets**, and *Toledo Rockets +
sport* ("Toledo Rockets Football") are not.

`utrockets.com` appears as a URL, which is the actual domain and not a name.

## Hero footage

`src/assets/video/rockets-hero.mp4` is cut from the reel supplied in
`Branding/hero.mp4` (1080p, 41.7 s, 61 MB) by `npm run video`
(`scripts/build-hero-video.mjs`). Four segments, snapped to detected scene
cuts: the band at the Glass Bowl into volleyball (0–7.34 s), the basketball
drive and layup (19.52–22.39 s), the football celebration (25.33–29.4 s),
and the Toledo flag as the closing beat (40.01–41.67 s) — 15.9 s total.

The encode keeps the master's full **1920×1080** and native 29.97 fps, drops
the audio, and is a **two-pass H.264 High** encode against an 8.5 MB byte
budget (~4.4 Mbps), faststart enabled. The poster
(`src/assets/img/rockets-hero-poster.jpg`, 1600×900) is extracted from the
finished reel at the band wide shot. Both outputs are committed; re-run
`npm run video` only to change the cut.

An earlier hand-made 1152×648 / 838 kbps encode is why the hero once looked
soft: the CSS displays the reel full-bleed with `object-fit: cover`, so any
sub-1080p source is upscaled. Don't ship one.

It is attached by `rkt.js` only on screens ≥ 48em, with no reduced-motion
preference and no data-saver request. Everywhere else — including the
JS-free SIDEARM embeds — the poster still is the hero. The scrim over it is
Midnight Blue behind the text, which holds white type comfortably above AA
regardless of which frame is showing.

The full 61 MB original is not shipped and should not be.

## Photography from the live site

`npm run fetch-assets` (`scripts/fetch-remote-assets.mjs`) downloads the
program's own photography from supportutrockets.com's CDN and normalizes it:
athlete cutouts (PNG, alpha kept) into `src/assets/img/people/`, impact
photos (JPEG, ≤1600 px) into `src/assets/img/impact/`, and staff headshots
(JPEG, ≤800 px) into `src/assets/img/people/`. The donor benefits chart
lands in `docs/reference/` for transcription only and never ships. Outputs
are committed; the script skips existing files unless run with `--force`.
