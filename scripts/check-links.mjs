/**
 * Validates every internal href/src in the built site against the files
 * Eleventy actually wrote. Fails the build on a broken internal link.
 * External URLs can't be fetched from every environment, so they're
 * printed as a manual-verify list instead.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { htmlPages } from "./_lib.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SITE = join(ROOT, "_site");
const PREFIX = (process.env.PATH_PREFIX || "/").replace(/\/$/, "");

const broken = [];
const externals = new Set();

for (const rel of htmlPages(SITE)) {
  const html = readFileSync(join(SITE, rel), "utf8");
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(url)) {
      if (/^https?:/.test(url)) externals.add(url);
      continue;
    }
    let path = url.split("#")[0].split("?")[0];
    if (PREFIX && path.startsWith(PREFIX + "/")) path = path.slice(PREFIX.length);
    if (!path.startsWith("/")) path = "/" + join(rel, "..", path);
    if (path.endsWith("/")) path += "index.html";
    if (!existsSync(join(SITE, path))) broken.push(`${rel}: ${url}`);
  }
}

if (externals.size) {
  console.log("[links] external URLs to verify manually:");
  for (const u of [...externals].sort()) console.log(`  - ${u}`);
}

if (broken.length) {
  console.error(`[links] BROKEN internal links (${broken.length}):`);
  for (const b of broken) console.error(`  ✗ ${b}`);
  process.exit(1);
}
console.log("[links] all internal links resolve ✓");
