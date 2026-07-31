import { createServer } from "node:http";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json"
};

/** Serve a static directory; returns { port, close }.
 *  Honors PATH_PREFIX (GitHub Pages base path) by stripping it from
 *  request paths, so prefix builds render correctly under local audit. */
export function serveDir(root, port = 8123) {
  const prefix = (process.env.PATH_PREFIX || "/").replace(/\/$/, "");
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (prefix && path.startsWith(prefix + "/")) path = path.slice(prefix.length);
    if (path.endsWith("/")) path += "index.html";
    const file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () =>
      resolve({ port, close: () => server.close() })
    );
  });
}

/** All page HTML files under root (relative paths), skipping the embed dir. */
export function htmlPages(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== "embed" && !name.startsWith("_")) walk(full);
      } else if (name.endsWith(".html")) {
        // Always POSIX-style: these become URL paths downstream.
        out.push(full.slice(root.length + 1).replaceAll("\\", "/"));
      }
    }
  };
  walk(root);
  return out.sort();
}

/** Resolve a Chromium executable that works in this environment. */
export function chromiumExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "/opt/pw-browsers/chromium",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return undefined; // fall back to Playwright's own resolution (CI)
}
