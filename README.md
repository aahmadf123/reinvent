# Toledo Athletics Giving Site — SIDEARM consolidation preview

Rebuild of **supportutrockets.com** (Rocket Fund / athletics development) as
custom pages destined for **utrockets.com** SIDEARM feature pages — letting
the separate development-site contract be dropped. This repo is the design
preview, deployed to GitHub Pages for stakeholder review, and it also
produces the paste-ready SIDEARM embeds.

## Quick start

```sh
npm install
npm run dev        # local preview at http://localhost:8080
npm run build      # _site/ (pages + embeds) + link check
npm run a11y       # axe-core WCAG 2.1 A/AA gate (zero violations)
npm run shots      # screenshots at 375/768/1440 into _shots/
```

## How it's put together

- **Eleventy** (only build dependency) renders `src/pages/*.njk` with shared
  macros (`src/_includes/components.njk`) and layout (`layouts/base.njk`).
- **Editable content lives in JSON**: `src/_data/site.json` (contact info,
  external giving URLs), `levels.json` (giving levels), `faqs.json`,
  `nav.json`. Most content edits never touch a template.
- **Design tokens** in `src/assets/css/tokens.css` — all brand colors in one
  place; a future 2026-27 brand refresh is a one-file swap.
- **Portability rules**: every page body is one self-contained
  `<div class="rkt">`; all CSS is scoped under `.rkt` with `rkt-` prefixed
  classes; JavaScript is preview-only progressive enhancement — pages work
  fully without it.
- **Embeds**: `scripts/build-embeds.mjs` extracts each built page's `.rkt`
  payload and inlines the compiled CSS into `_site/embed/<slug>.html` — the
  file you paste into a SIDEARM feature page.

## Docs

- [`docs/sidearm-url-map.md`](docs/sidearm-url-map.md) — page ↔ feature page ↔
  clean-URL redirect map (auto-generated from page front matter).
- [`docs/sidearm-paste-guide.md`](docs/sidearm-paste-guide.md) — how to move
  pages into SIDEARM, with a sanitization fallback ladder.
- [`docs/content-status.md`](docs/content-status.md) — every claim on the
  site marked confirmed vs. placeholder. **Review before go-live.**

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds with `PATH_PREFIX=/reinvent/`, runs
the link check and accessibility audit as gates, and deploys `_site/` to
GitHub Pages on pushes to `main` and the working branch.

One-time setup: **Settings → Pages → Build and deployment → Source →
"GitHub Actions"**. If deploying from a non-default branch, also allow that
branch under **Settings → Environments → github-pages → Deployment branches**.

Preview URL: `https://aahmadf123.github.io/reinvent/` · embeds at
`…/reinvent/embed/<slug>.html`.

## Accessibility

Target: **WCAG 2.1 AA** (required for public universities under the DOJ's
ADA Title II rule, 28 CFR Part 35, in force April 2026). Enforced by
`scripts/audit-a11y.mjs` (axe-core) against every page **and** every embed
in CI; plus keyboard-operable nav, `prefers-reduced-motion` support,
semantic tables/details, and contrast-safe tokens (gold is never text on
light backgrounds). Manual screen-reader spot-check (NVDA/VoiceOver)
recommended before go-live.
