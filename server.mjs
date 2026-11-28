import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.resolve(ROOT, "public");
const INDEX_PATH = path.resolve(ROOT, "index.html");

const ALLOWED_PUBLIC_MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const BLOCKED_PATH_PATTERNS = [
  /(^|\/)\./,
  /\.(mjs|cjs|js|ts|json|env|lock|md|yml|yaml|sql|sh|log|map)$/i,
  /^\/(server|package|metadata|node_modules|src|skills)(\/|$)/i
];

function sendHeaders(res, statusCode, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  });
}

const server = http.createServer((req, res) => {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    sendHeaders(res, 405, "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return;
  }

  let rawPath = (req.url || "/").split("?")[0];
  let urlPath;
  try {
    urlPath = decodeURIComponent(rawPath);
  } catch {
    sendHeaders(res, 400, "text/plain; charset=utf-8");
    res.end("Bad Request");
    return;
  }

  if (urlPath.includes("\0") || urlPath.includes("\\")) {
    sendHeaders(res, 400, "text/plain; charset=utf-8");
    res.end("Bad Request");
    return;
  }

  if (urlPath === "/" || urlPath === "/index.html") {
    sendHeaders(res, 200, "text/html; charset=utf-8");
    if (method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(INDEX_PATH).pipe(res);
    return;
  }

  if (BLOCKED_PATH_PATTERNS.some((re) => re.test(urlPath))) {
    sendHeaders(res, 404, "text/plain; charset=utf-8");
    res.end("Not Found");
    return;
  }

  const relativePath = urlPath.replace(/^\/+/, "");
  const resolvedPublicPath = path.resolve(PUBLIC_DIR, relativePath);
  const ext = path.extname(resolvedPublicPath).toLowerCase();

  if (
    resolvedPublicPath.startsWith(PUBLIC_DIR + path.sep) &&
    Object.prototype.hasOwnProperty.call(ALLOWED_PUBLIC_MIME, ext) &&
    fs.existsSync(resolvedPublicPath) &&
    fs.statSync(resolvedPublicPath).isFile()
  ) {
    sendHeaders(res, 200, ALLOWED_PUBLIC_MIME[ext]);
    if (method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(resolvedPublicPath).pipe(res);
    return;
  }

  // SPA fallback only for clean extensionless routes; block missing asset probes
  if (ext) {
    sendHeaders(res, 404, "text/plain; charset=utf-8");
    res.end("Not Found");
    return;
  }

  sendHeaders(res, 200, "text/html; charset=utf-8");
  if (method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(INDEX_PATH).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`GHUMO BIKE STORE serving index.html on http://0.0.0.0:${PORT}`);
});
