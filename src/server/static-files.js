const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const COMPRESSIBLE_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".svg", ".txt"]);
const compressedFileCache = new Map();
const MAX_COMPRESSED_CACHE_ENTRIES = 128;

const DEFAULT_MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml"
};

async function serveStaticFile(request, response, options) {
  const root = options.root;
  const shouldBlockStaticPath = options.shouldBlockStaticPath || (() => false);
  const mimeTypes = options.mimeTypes || DEFAULT_MIME_TYPES;
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  if (shouldBlockStaticPath(pathname)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const resolved = path.resolve(root, `.${pathname}`);

  if (!resolved.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.promises.stat(resolved);
    if (!stat.isFile()) throw new Error("Not found");

    const extension = path.extname(resolved).toLowerCase();
    const isHtml = extension === ".html";
    const isVersioned = url.searchParams.has("v");
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const headers = {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": isHtml
        ? "no-store"
        : isVersioned
          ? "public, max-age=31536000, immutable"
          : "public, max-age=86400, stale-while-revalidate=604800",
      ETag: etag,
      "Last-Modified": stat.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff"
    };

    if (matchesEtag(request.headers["if-none-match"], etag)) {
      response.writeHead(304, headers);
      response.end();
      return;
    }

    const encoding = COMPRESSIBLE_EXTENSIONS.has(extension)
      ? selectContentEncoding(request.headers["accept-encoding"])
      : "";
    const cacheKey = encoding
      ? `${resolved}:${stat.size}:${stat.mtimeMs}:${encoding}`
      : "";
    let content = cacheKey ? compressedFileCache.get(cacheKey) : null;

    if (!content) {
      const source = await fs.promises.readFile(resolved);
      content = encoding ? await compressContent(source, encoding) : source;
      if (cacheKey) {
        if (compressedFileCache.size >= MAX_COMPRESSED_CACHE_ENTRIES) {
          compressedFileCache.clear();
        }
        compressedFileCache.set(cacheKey, content);
      }
    }

    response.writeHead(200, {
      ...headers,
      ...(encoding ? { "Content-Encoding": encoding, Vary: "Accept-Encoding" } : {}),
      "Content-Length": content.length
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

function selectContentEncoding(acceptEncoding = "") {
  const value = String(acceptEncoding).toLowerCase();
  if (value.includes("br")) return "br";
  if (value.includes("gzip")) return "gzip";
  return "";
}

function matchesEtag(headerValue = "", etag = "") {
  return String(headerValue)
    .split(",")
    .some((value) => value.trim() === "*" || value.trim() === etag);
}

function compressContent(content, encoding) {
  return new Promise((resolve, reject) => {
    const callback = (error, compressed) => error ? reject(error) : resolve(compressed);
    if (encoding === "br") {
      zlib.brotliCompress(content, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4
        }
      }, callback);
      return;
    }
    zlib.gzip(content, { level: 6 }, callback);
  });
}

module.exports = {
  DEFAULT_MIME_TYPES,
  serveStaticFile
};
