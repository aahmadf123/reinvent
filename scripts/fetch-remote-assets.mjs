/**
 * Downloads the Rocket Fund's own photography from the live
 * supportutrockets.com (SIDEARM) site and normalizes it for this repo:
 * athlete cutouts keep their PNG alpha, everything else becomes a
 * right-sized JPEG. Outputs are committed — embeds serve them from the
 * GitHub Pages asset base, so they must exist in the repo.
 *
 * Idempotent: existing outputs are skipped unless --force is passed.
 * Run: npm run fetch-assets
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, statSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FORCE = process.argv.includes("--force");

// SIDEARM serves site images from CloudFront; the origin host is the
// fallback in case a path moves off the CDN.
const CDN = "https://dbukjj6eu5tsf.cloudfront.net/sidearm.sites/supportutrockets.sidearmsports.com";
const ORIGIN = "https://supportutrockets.com";

// mode: "cutout" = PNG, keep alpha, cap height 900px, never upscale
//       "photo"  = JPEG q3, cap width 1600px
//       "headshot" = JPEG q3, cap width 800px
//       "raw"    = byte-for-byte download, no processing
const MANIFEST = [
  { path: "/images/2026/5/6/KARINA-JAMES-CUTOUT.png", out: "src/assets/img/people/karina-james-cutout.png", mode: "cutout" },
  { path: "/images/2026/5/6/GRACE-FREIBERGER-CUTOUT.png", out: "src/assets/img/people/grace-freiberger-cutout.png", mode: "cutout" },
  { path: "/images/2026/5/6/TROY-SUDBROOK-CUTOUT.png", out: "src/assets/img/people/troy-sudbrook-cutout.png", mode: "cutout" },
  { path: "/images/2023/10/30/slideshow_A_1.png", out: "src/assets/img/impact/impact-1.jpg", mode: "photo" },
  { path: "/images/2023/10/30/slideshow_A_2.png", out: "src/assets/img/impact/impact-2.jpg", mode: "photo" },
  { path: "/images/2023/10/30/slideshow_A_3.png", out: "src/assets/img/impact/impact-3.jpg", mode: "photo" },
  { path: "/images/2025/7/8/Connor_Whelan_-_2025_copy.png", out: "src/assets/img/people/connor-whelan.jpg", mode: "headshot" },
  { path: "/images/2024/5/31/Josh_Dittman_8sP4L.jpeg", out: "src/assets/img/people/josh-dittman.jpg", mode: "headshot" },
  { path: "/images/2024/5/31/Ryleigh_Gordon_lZHnC.jpeg", out: "src/assets/img/people/ryleigh-gordon.jpg", mode: "headshot" },
  { path: "/images/2024/5/31/Zane_Collier_rEeAf.jpeg", out: "src/assets/img/people/zane-collier.jpg", mode: "headshot" },
  // Reference only — lives outside src/assets so it never ships.
  { path: "/images/2024/4/3/RF-BENEFITS-CHART-v2.jpg", out: "docs/reference/rf-benefits-chart-v2.jpg", mode: "raw" },
];

const FILTERS = {
  cutout: ["-vf", "scale=-2:'min(900,ih)'"],
  photo: ["-vf", "scale='min(1600,iw)':-2", "-q:v", "3"],
  headshot: ["-vf", "scale='min(800,iw)':-2", "-q:v", "3"],
};

async function download(item) {
  const urls = item.url ? [item.url] : [CDN + item.path, ORIGIN + item.path];
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.warn(`[fetch]   ${url} failed (${err.message})`);
    }
  }
  return null;
}

function dimensions(file) {
  try {
    execFileSync(ffmpeg, ["-i", file], { stdio: "pipe" });
  } catch (err) {
    const m = /Video:.* (\d{2,5})x(\d{2,5})/.exec(String(err.stderr));
    if (m) return `${m[1]}×${m[2]}`;
  }
  return "?";
}

let failures = 0;
for (const item of MANIFEST) {
  const out = join(ROOT, item.out);
  if (existsSync(out) && !FORCE) {
    console.log(`[fetch] skip (exists): ${item.out}`);
    continue;
  }
  const bytes = await download(item);
  if (!bytes) {
    console.error(`[fetch] FAILED: ${item.out}`);
    failures++;
    continue;
  }
  mkdirSync(dirname(out), { recursive: true });
  if (item.mode === "raw") {
    writeFileSync(out, bytes);
  } else {
    const tmp = join(tmpdir(), `rkt-fetch-${Date.now()}${item.path.slice(item.path.lastIndexOf("."))}`);
    writeFileSync(tmp, bytes);
    execFileSync(ffmpeg, ["-y", "-i", tmp, ...FILTERS[item.mode], out], { stdio: "pipe" });
    rmSync(tmp, { force: true });
  }
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`[fetch] wrote ${item.out} — ${kb} KB, ${dimensions(out)} (source ${Math.round(bytes.length / 1024)} KB)`);
}

if (failures) {
  console.error(`[fetch] ${failures} file(s) failed`);
  process.exit(1);
}
console.log("[fetch] done");
