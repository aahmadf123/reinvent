/**
 * Accessibility gate: axe-core (WCAG 2.0/2.1 A + AA rulesets) against
 * every built page AND every SIDEARM embed. Zero violations required.
 *
 * Embeds are audited inside a minimal harness page that stands in for
 * SIDEARM's chrome (title/lang/main landmark), since a bare fragment
 * legitimately has no <html> of its own.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { serveDir, htmlPages, chromiumExecutable } from "./_lib.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SITE = join(ROOT, "_site");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// Wrap each embed in a SIDEARM-like harness for auditing
const HARNESS_DIR = join(SITE, "_a11y-harness");
mkdirSync(HARNESS_DIR, { recursive: true });
const embeds = readdirSync(join(SITE, "embed")).filter((f) => f.endsWith(".html"));
for (const f of embeds) {
  const body = readFileSync(join(SITE, "embed", f), "utf8");
  writeFileSync(
    join(HARNESS_DIR, f),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Embed audit — ${f}</title></head><body><main>${body}</main></body></html>`
  );
}

const { port, close } = await serveDir(SITE, 8124);
const browser = await chromium.launch({ executablePath: chromiumExecutable() });
// Reduced motion: reveal transitions are disabled, so axe samples final
// colors and below-fold content is never opacity-hidden mid-audit.
const ctx = await browser.newContext({ reducedMotion: "reduce" });
// External requests (e.g. the Google Fonts link inside embeds) may be
// blocked in sandboxed environments — abort them so audits never stall.
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
const page = await ctx.newPage();

const targets = [
  ...htmlPages(SITE).map((p) => "/" + p.replace(/index\.html$/, "")),
  ...embeds.map((f) => `/_a11y-harness/${f}`)
];

let totalViolations = 0;
for (const url of targets) {
  await page.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: "load", timeout: 20000 });
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  if (results.violations.length) {
    totalViolations += results.violations.length;
    console.error(`\n✗ ${url}`);
    for (const v of results.violations) {
      console.error(`  [${v.impact}] ${v.id}: ${v.help}`);
      for (const n of v.nodes.slice(0, 5)) {
        const data = n.any?.[0]?.data;
        console.error(`    → ${n.target.join(" ")}${data ? " " + JSON.stringify(data) : ""}`);
      }
    }
  } else {
    console.log(`✓ ${url}`);
  }
}

await browser.close();
close();
rmSync(HARNESS_DIR, { recursive: true, force: true });

if (totalViolations) {
  console.error(`\n[a11y] FAILED — ${totalViolations} violation group(s). See above.`);
  process.exit(1);
}
console.log(`\n[a11y] all ${targets.length} pages + embeds pass WCAG 2.1 A/AA (axe) ✓`);
