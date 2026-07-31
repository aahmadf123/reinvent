/**
 * Captures every built page at mobile/tablet/desktop widths, plus an
 * optional reduced-motion pass. Output dir: SHOT_DIR or ./_shots.
 * Usage: node scripts/screenshot.mjs [--reduced-motion] [--page <path>]
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { serveDir, htmlPages, chromiumExecutable } from "./_lib.mjs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE = join(ROOT, "_site");
const OUT = process.env.SHOT_DIR || join(ROOT, "_shots");
const REDUCED = process.argv.includes("--reduced-motion");
const ONLY = process.argv.includes("--page")
  ? process.argv[process.argv.indexOf("--page") + 1]
  : null;

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 800 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1440, height: 950 }
];

mkdirSync(OUT, { recursive: true });
const { port, close } = await serveDir(SITE, 8123);
const browser = await chromium.launch({ executablePath: chromiumExecutable() });

let pages = htmlPages(SITE).map((p) => "/" + p.replace(/index\.html$/, ""));
if (ONLY) pages = pages.filter((p) => p === ONLY);

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: REDUCED ? "reduce" : "no-preference"
  });
  const page = await ctx.newPage();
  for (const url of pages) {
    await page.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: "networkidle" });
    // settle reveal animations so full-page shots aren't half-faded
    await page.evaluate(() =>
      document.querySelectorAll(".rkt-reveal").forEach((el) => el.classList.add("is-in"))
    );
    await page.waitForTimeout(120);
    const name =
      (url === "/" ? "home" : url.replace(/^\/|\/$/g, "").replaceAll("/", "-")) +
      `--${vp.name}${REDUCED ? "--reduced" : ""}.png`;
    await page.screenshot({ path: join(OUT, name), fullPage: true });
    console.log(`[shots] ${name}`);
  }
  await ctx.close();
}

await browser.close();
close();
console.log(`[shots] done → ${OUT}`);
