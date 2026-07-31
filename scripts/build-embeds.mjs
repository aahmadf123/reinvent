/**
 * Extracts the portable <div class="rkt"> payload from every built page and
 * writes a self-contained SIDEARM paste-in file to _site/embed/<slug>.html.
 *
 * The embed is byte-derived from the exact page that was previewed:
 * payload between <!--RKT:START--> / <!--RKT:END--> markers, plus the
 * compiled scoped CSS inlined in a <style> block. Embeds intentionally
 * ship WITHOUT JavaScript — every page works fully without it.
 *
 * Internal links are rewritten from preview paths to the clean utrockets.com
 * redirect URLs declared in each page's front matter (cleanUrl), so pasted
 * pages link to each other correctly on the live site.
 *
 * Also regenerates docs/sidearm-url-map.md from page front matter.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { htmlPages } from "./_lib.mjs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE = join(ROOT, "_site");
const OUT = join(SITE, "embed");
const PREFIX = (process.env.PATH_PREFIX || "/").replace(/\/$/, "");

const css = ["tokens.css", "reset.css", "site.css"]
  .map((f) => readFileSync(join(ROOT, "src/assets/css", f), "utf8"))
  .join("\n");

const FONTS_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap">';

// Embeds live on utrockets.com, where /assets/ does not exist. Point every
// asset reference — logos above all — at a host that actually serves them.
// Override with EMBED_ASSET_BASE when the files move to SIDEARM storage.
const ASSET_BASE = (
  process.env.EMBED_ASSET_BASE ??
  JSON.parse(readFileSync(join(ROOT, "src/_data/site.json"), "utf8")).embedAssetBase ??
  ""
).replace(/\/$/, "");

// ---- Read front matter from src/pages: preview path ↔ slug ↔ clean URL ----
const pagesDir = join(ROOT, "src/pages");
const rows = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith(".njk")) {
      // Normalise CRLF: a Windows checkout would otherwise fail every
      // front-matter match and silently emit an empty URL map.
      const src = readFileSync(full, "utf8").replace(/\r\n/g, "\n");
      const fm = /^---\n([\s\S]*?)\n---/.exec(src)?.[1] ?? "";
      const get = (key) => new RegExp(`^${key}:\\s*(.+)$`, "m").exec(fm)?.[1]?.trim();
      const title = get("title");
      const slug = get("sidearmSlug");
      const clean = get("cleanUrl");
      if (title && slug) {
        // POSIX separators: rel becomes a URL path, and a Windows checkout
        // would otherwise emit "/premium\basketball/" and quietly skip the
        // clean-URL rewrite for every nested page.
        let rel = full
          .slice(pagesDir.length + 1)
          .replaceAll("\\", "/")
          .replace(/(index)?\.njk$/, "");
        if (rel && !rel.endsWith("/")) rel += "/"; // match Eleventy's trailing-slash URLs
        rows.push({ title, slug, clean, preview: "/" + rel });
      }
    }
  }
};
walk(pagesDir);
rows.sort((a, b) => a.preview.localeCompare(b.preview));

// preview path -> clean path on utrockets.com (e.g. "/give/" -> "/givenow")
const cleanPath = (clean) => (clean ? "/" + clean.replace(/^utrockets\.com\//, "") : null);
const linkMap = rows
  .filter((r) => r.clean && r.preview !== "/")
  .map((r) => [r.preview, cleanPath(r.clean)]);
const homeClean = cleanPath(rows.find((r) => r.preview === "/")?.clean) ?? "/";

// ---- Write embeds ----
mkdirSync(OUT, { recursive: true });
let count = 0;
for (const rel of htmlPages(SITE)) {
  const html = readFileSync(join(SITE, rel), "utf8");
  const start = html.indexOf("<!--RKT:START");
  const end = html.indexOf("<!--RKT:END-->");
  if (start === -1 || end === -1) continue;
  let payload = html
    .slice(html.indexOf("-->", start) + 3, end)
    .trim()
    // Reveal animation is preview-only; embeds ship without JS.
    .replaceAll(" rkt-reveal", "");
  // Strip the GitHub Pages base path, then map preview paths to the clean
  // redirect URLs the pages will live at on utrockets.com.
  if (PREFIX) payload = payload.replaceAll(`href="${PREFIX}/`, 'href="/');
  for (const [preview, clean] of linkMap) {
    payload = payload.replaceAll(`href="${preview}"`, `href="${clean}"`);
  }
  payload = payload.replaceAll('href="/"', `href="${homeClean}"`);

  // Assets keep their own path. Strip the preview base, then absolutise —
  // the official logos have to resolve from utrockets.com, where a
  // site-root /assets/ does not exist.
  if (PREFIX) {
    payload = payload
      .replaceAll(`src="${PREFIX}/`, 'src="/')
      .replaceAll(`data-rkt-reel="${PREFIX}/`, 'data-rkt-reel="/');
  }
  if (ASSET_BASE) {
    payload = payload
      .replaceAll('src="/assets/', `src="${ASSET_BASE}/assets/`)
      .replaceAll('data-rkt-reel="/assets/', `data-rkt-reel="${ASSET_BASE}/assets/`);
  }

  const slug = /data-page="([^"]+)"/.exec(payload)?.[1] ?? "page";
  const embed = `<!--
  Rocket Fund — SIDEARM feature page embed: ${slug}
  Generated from the previewed page ${rel} — do not hand-edit; rebuild instead.
  Internal links point at the clean redirect URLs from docs/sidearm-url-map.md;
  those redirects must exist before this page goes live.
  Fonts: keep the Google Fonts link below (or move it to SIDEARM head injection).
  See docs/sidearm-paste-guide.md for paste instructions.
-->
${FONTS_LINK}
<style>
${css}
</style>
${payload}
`;
  writeFileSync(join(OUT, `${slug}.html`), embed);
  count++;
}
console.log(`[embeds] wrote ${count} embeds to _site/embed/`);

// ---- Regenerate docs/sidearm-url-map.md ----
const doc = `# SIDEARM URL map — generated by scripts/build-embeds.mjs

Do not hand-edit; this table is regenerated from page front matter on every build.

For each page: create a SIDEARM feature page with the listed slug, paste in
\`_site/embed/<slug>.html\`, then configure the redirect so the clean URL is
what fans see (no \`/feature/\` in the address bar). Embed internal links
already point at the clean URLs, so the redirects are required for
cross-page navigation to work.

| Page | Preview path | SIDEARM feature page | Embed file | Clean redirect URL |
|---|---|---|---|---|
${rows
  .map(
    (r) =>
      `| ${r.title} | \`${r.preview}\` | \`/feature/${r.slug}\` | \`embed/${r.slug}.html\` | \`${r.clean ?? "—"}\` |`
  )
  .join("\n")}
`;
mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(join(ROOT, "docs/sidearm-url-map.md"), doc);
console.log(`[embeds] regenerated docs/sidearm-url-map.md (${rows.length} rows)`);
