/**
 * Derives the site's raster brand assets from the official logo files in
 * src/assets/img/brand/ — favicons, the social share card, and the web app
 * manifest.
 *
 * Nothing here redraws, recolours, or distorts a mark. Every output is an
 * official PNG scaled proportionally and centred on Midnight Blue
 * (#0A2240), with at least the clear space the branding guide requires:
 * X = 1/3 the height of the rocket logo, X = 1/4 the height of the full
 * athletic logo.
 *
 * Pure Node — no image library, no ffmpeg — so the background is exactly
 * the brand hex with no colour-space round trip. Outputs are committed;
 * re-run only when a source logo changes.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BRAND = join(ROOT, "src/assets/img/brand");
const IMG = join(ROOT, "src/assets/img");

const NAVY = [0x0a, 0x22, 0x40]; // Midnight Blue, PANTONE 289C

// ---------------------------------------------------------------- decode --
/** Decode an 8-bit RGBA PNG to flat {w, h, data} — enough for our own logos. */
function decodePng(file) {
  const b = readFileSync(file);
  const w = b.readUInt32BE(16);
  const h = b.readUInt32BE(20);
  if (b[24] !== 8 || b[25] !== 6) {
    throw new Error(`${file}: expected 8-bit RGBA, got depth ${b[24]} type ${b[25]}`);
  }
  const chunks = [];
  for (let p = 8; p < b.length; ) {
    const len = b.readUInt32BE(p);
    if (b.toString("ascii", p + 4, p + 8) === "IDAT") chunks.push(b.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const bpp = 4;
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0, ro = 0, o = 0; y < h; y++, ro += stride, o += stride) {
    const filter = raw[ro++];
    for (let x = 0; x < stride; x++) {
      const cur = raw[ro + x];
      const a = x >= bpp ? out[o + x - bpp] : 0;
      const b2 = y > 0 ? out[o + x - stride] : 0;
      const c = x >= bpp && y > 0 ? out[o + x - stride - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = cur; break;
        case 1: v = cur + a; break;
        case 2: v = cur + b2; break;
        case 3: v = cur + ((a + b2) >> 1); break;
        case 4: {
          const p0 = a + b2 - c;
          const pa = Math.abs(p0 - a);
          const pb = Math.abs(p0 - b2);
          const pc = Math.abs(p0 - c);
          v = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b2 : c);
          break;
        }
        default: throw new Error(`${file}: unknown filter ${filter}`);
      }
      out[o + x] = v & 255;
    }
  }
  return { w, h, data: out };
}

// ---------------------------------------------------------------- encode --
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** Encode flat 8-bit RGB (no alpha) as a PNG. */
function encodePng(w, h, rgb) {
  const stride = w * 3;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- composite --
/**
 * Box-resample `src` to dstW×dstH and alpha-composite it at (ox, oy) over a
 * canvas flooded with `bg`. Averaging happens in premultiplied space so the
 * mark's edges don't fringe toward the source file's white matte.
 */
function render(src, dstW, dstH, canvasW, canvasH, ox, oy, bg) {
  const out = Buffer.alloc(canvasW * canvasH * 3);
  for (let i = 0; i < canvasW * canvasH; i++) {
    out[i * 3] = bg[0];
    out[i * 3 + 1] = bg[1];
    out[i * 3 + 2] = bg[2];
  }
  const sx = src.w / dstW;
  const sy = src.h / dstH;
  for (let y = 0; y < dstH; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.min(src.h, Math.max(y0 + 1, Math.floor((y + 1) * sy)));
    const cy = oy + y;
    if (cy < 0 || cy >= canvasH) continue;
    for (let x = 0; x < dstW; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.min(src.w, Math.max(x0 + 1, Math.floor((x + 1) * sx)));
      const cx = ox + x;
      if (cx < 0 || cx >= canvasW) continue;
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * src.w + xx) * 4;
          const al = src.data[i + 3] / 255;
          r += src.data[i] * al;
          g += src.data[i + 1] * al;
          b += src.data[i + 2] * al;
          a += al;
          n++;
        }
      }
      if (!n || a <= 0) continue;
      const alpha = a / n;
      const o = (cy * canvasW + cx) * 3;
      // un-premultiply the averaged colour, then composite over the canvas
      out[o] = Math.round((r / a) * alpha + bg[0] * (1 - alpha));
      out[o + 1] = Math.round((g / a) * alpha + bg[1] * (1 - alpha));
      out[o + 2] = Math.round((b / a) * alpha + bg[2] * (1 - alpha));
    }
  }
  return out;
}

/**
 * Centre `logoFile` on a canvas, scaled so the clear space on every side is
 * at least `clearRatio` × the logo's rendered height.
 */
function place(logoFile, out, canvasW, canvasH, clearRatio) {
  const src = decodePng(join(BRAND, logoFile));
  const aspect = src.h / src.w;
  const logoW = Math.min(
    Math.floor(canvasW / (1 + 2 * clearRatio * aspect)),
    Math.floor(canvasH / (aspect * (1 + 2 * clearRatio)))
  );
  const logoH = Math.max(1, Math.round(logoW * aspect));
  const ox = Math.round((canvasW - logoW) / 2);
  const oy = Math.round((canvasH - logoH) / 2);
  writeFileSync(
    join(IMG, out),
    encodePng(canvasW, canvasH, render(src, logoW, logoH, canvasW, canvasH, ox, oy, NAVY))
  );
  console.log(
    `[brand] ${out} — mark ${logoW}×${logoH} on ${canvasW}×${canvasH}, ` +
      `clear space ${Math.min(ox, oy)}px (min ${Math.ceil(clearRatio * logoH)}px)`
  );
}

// Favicons: the secondary rocket mark, clear space X = 1/3 of its height.
for (const size of [512, 180, 32]) {
  place("toledo-rocket-gold.png", `favicon-${size}.png`, size, size, 1 / 3);
}

// Social card: the full athletic logo, clear space X = 1/4 of its height.
place("toledo-primary-on-navy.png", "share-card.png", 1200, 630, 1 / 4);

writeFileSync(
  join(ROOT, "src/assets/site.webmanifest"),
  JSON.stringify(
    {
      name: "Rocket Fund · Toledo Athletics",
      short_name: "Rocket Fund",
      icons: [
        { src: "/assets/img/favicon-180.png", sizes: "180x180", type: "image/png" },
        { src: "/assets/img/favicon-512.png", sizes: "512x512", type: "image/png" },
      ],
      theme_color: "#0A2240",
      background_color: "#0A2240",
      display: "standalone",
    },
    null,
    2
  ) + "\n"
);
console.log("[brand] site.webmanifest");
