# SIDEARM paste-in guide

How to move a page from this preview site into a SIDEARM feature page on
utrockets.com. Every page in the preview has a matching self-contained embed
file — see `docs/sidearm-url-map.md` for the full page-by-page map.

## What an embed is

`npm run build` writes one file per page to `_site/embed/<slug>.html`.
Each embed contains:

1. A comment header identifying the page.
2. A Google Fonts `<link>` (Saira Condensed, Montserrat — see `docs/brand.md`
   for why these stand in for Smart Sans Std and Gotham).
3. One `<style>` block — the complete compiled CSS, scoped under `.rkt`.
4. One `<div class="rkt" data-page="...">` — the entire page content.

Images inside an embed — the athletic marks above all — are rewritten to
absolute URLs against `embedAssetBase` in `src/_data/site.json`, because a
site-root `/assets/` path does not exist on utrockets.com. Set
`EMBED_ASSET_BASE` when the files move to SIDEARM's own file storage.

Embeds contain **no JavaScript** by design: every page works fully without
it, so SIDEARM script sanitization can never break a page. They also contain
no site header/nav/footer — SIDEARM's own chrome wraps the content.

All CSS selectors are scoped under `.rkt` and prefixed `rkt-`, and design
tokens are CSS custom properties declared on `.rkt` (not `:root`), so the
embed cannot fight SIDEARM's global styles.

## Steps per page

1. Run `npm run build` (or download the `embed/` folder from the deployed
   preview at `<pages-url>/embed/<slug>.html`).
2. In the SIDEARM admin, create a feature page with the slug from the URL
   map (e.g. `/feature/rocket-fund-benefits`).
3. Paste the entire contents of the embed file into the feature page's
   HTML/content field.
4. Publish and view the page. Check: fonts loaded, colors correct, mobile
   layout intact.
5. Configure the redirect so the clean URL (e.g. `utrockets.com/rocketfundbenefits`)
   serves the feature page without showing `/feature/` — per the URL map.

## Pilot first

Before migrating everything, paste **one low-risk embed** (suggested:
`rocket-fund-faq.html`) into a real feature page to verify what SIDEARM's
editor preserves. Then check the fallback ladder below if anything is
stripped.

## Fallback ladder (if SIDEARM sanitizes something)

| Symptom | Cause | Fix |
|---|---|---|
| Page renders unstyled | `<style>` block stripped by the editor | Upload the CSS through SIDEARM's custom CSS / additional stylesheet mechanism instead. The style block is identical on every embed, so one upload covers all pages — then paste embeds without their `<style>` block. |
| Wrong fonts | `<link>` tag stripped | Add the Google Fonts link via SIDEARM's head-injection / custom code setting. Fallback stacks (Arial Narrow / Helvetica) keep pages legible either way. |
| Logos missing | `embedAssetBase` host unreachable from utrockets.com | Upload `src/assets/img/brand/` to SIDEARM file storage and rebuild with `EMBED_ASSET_BASE=<that base>`. |
| Layout collides with site styles | A global SIDEARM rule outranks a scoped one | Report the specific element; scoping under `.rkt` makes targeted overrides safe to add at the end of the style block. |

## Fonts note

The preview self-hosts fonts; embeds intentionally use Google Fonts instead
so they have no dependency on the preview site's hosting. If athletics
prefers no third-party font CDN, the `woff2` files in `src/assets/fonts/`
can be uploaded to SIDEARM's file storage and the `@font-face` block from
`src/assets/css/fonts.css` added with updated URLs.
