/**
 * Rebuilds the hero reel and its poster still from the 1080p master in
 * Branding/hero.mp4. The served reel keeps the master's full 1920×1080
 * resolution — the hero displays it full-bleed with object-fit: cover, so
 * anything smaller gets upscaled and turns to mush.
 *
 * Encoding is two-pass ABR against a byte budget rather than CRF: this
 * footage (fast sports motion, crowds) runs ~8.5 Mbps even at CRF 23,
 * which would be a ~20 MB file. Two-pass hits the budget exactly and
 * spends it where the motion needs it.
 *
 * Output: src/assets/video/rockets-hero.mp4 (H.264 High, 1080p, native
 * 29.97 fps, audio dropped, faststart) and src/assets/img/rockets-hero-poster.jpg
 * (1600×900, taken from the finished reel).
 *
 * Run: npm run video   (both outputs are committed; CI never encodes)
 */
import { execFileSync } from "node:child_process";
import { statSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MASTER = join(ROOT, "Branding", "hero.mp4");
const OUT_VIDEO = join(ROOT, "src", "assets", "video", "rockets-hero.mp4");
const OUT_POSTER = join(ROOT, "src", "assets", "img", "rockets-hero-poster.jpg");

if (!existsSync(MASTER)) {
  console.error(`[video] master not found: ${MASTER}`);
  process.exit(1);
}

// Segment boundaries snap to scene cuts detected on the master
// (ffmpeg select='gt(scene,0.15)'). In order: marching band at the Glass
// Bowl into volleyball at Savage Arena; the basketball drive and layup;
// football touchdown celebration; the Toledo flag as the closing beat
// before the loop restarts on the stadium wide shot. ~15.9 s total.
const SEGMENTS = [
  { from: 0, to: 7.34 },
  { from: 19.52, to: 22.39 },
  { from: 25.33, to: 29.4 },
  { from: 40.01, to: 41.67 },
];

// Byte budget for the finished reel. The old 1.78 MB encode is what made
// the hero look like mush; ~8.5 MB buys ~4.3 Mbps at this duration, which
// holds up full-bleed on a 1440–1920 px viewport.
const TARGET_MB = 8.5;

// Seconds into the finished reel: the band wide shot with the painted
// "Toledo Rockets" stands — the frame the page holds until the reel plays.
const POSTER_AT = 1.0;

const filter =
  SEGMENTS.map(
    (s, i) => `[0:v]trim=start=${s.from}:end=${s.to},setpts=PTS-STARTPTS[v${i}]`
  ).join(";") +
  ";" +
  SEGMENTS.map((_, i) => `[v${i}]`).join("") +
  `concat=n=${SEGMENTS.length}:v=1:a=0[out]`;

const MB = 1024 * 1024;
const duration = SEGMENTS.reduce((t, s) => t + (s.to - s.from), 0);
// ~1% mux overhead margin; kbps as ffmpeg counts them (1000 bits).
const kbps = Math.floor((TARGET_MB * MB * 8 * 0.99) / duration / 1000);
const passlog = join(tmpdir(), "rkt-hero-x264");

function pass(n) {
  execFileSync(
    ffmpeg,
    [
      "-y",
      "-i", MASTER,
      "-filter_complex", filter,
      "-map", "[out]",
      "-c:v", "libx264",
      "-profile:v", "high",
      "-b:v", `${kbps}k`,
      "-preset", "slow",
      "-pix_fmt", "yuv420p",
      "-pass", String(n),
      "-passlogfile", passlog,
      "-an",
      ...(n === 1
        ? ["-f", "null", process.platform === "win32" ? "NUL" : "/dev/null"]
        : ["-movflags", "+faststart", OUT_VIDEO]),
    ],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
}

console.log(`[video] two-pass encode: ${duration.toFixed(1)} s at ${kbps} kbps (target ${TARGET_MB} MB)`);
pass(1);
pass(2);
rmSync(`${passlog}-0.log`, { force: true });
rmSync(`${passlog}-0.log.mbtree`, { force: true });

const size = statSync(OUT_VIDEO).size;
if (size > 12 * MB || size < 3 * MB) {
  console.error(
    `[video] output is ${(size / MB).toFixed(1)} MB — outside the 3–12 MB sanity window. ` +
      `Check SEGMENTS/TARGET_MB before committing.`
  );
  process.exit(1);
}

execFileSync(
  ffmpeg,
  [
    "-y",
    "-ss", String(POSTER_AT),
    "-i", OUT_VIDEO,
    "-frames:v", "1",
    "-vf", "scale=1600:900",
    "-q:v", "3",
    OUT_POSTER,
  ],
  { stdio: ["ignore", "ignore", "inherit"] }
);

const posterKb = Math.round(statSync(OUT_POSTER).size / 1024);
console.log(
  `[video] wrote rockets-hero.mp4 — ${(size / MB).toFixed(1)} MB, ${duration.toFixed(1)} s, 1920×1080, ${kbps} kbps two-pass`
);
console.log(`[video] wrote rockets-hero-poster.jpg — ${posterKb} KB, 1600×900`);
