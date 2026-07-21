const fs = require("fs");
const path = require("path");

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

  fs.readFile(resolved, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(resolved).toLowerCase();
    const isHtml = extension === ".html";

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": isHtml ? "no-store" : "public, max-age=300"
    });
    response.end(content);
  });
}

module.exports = {
  DEFAULT_MIME_TYPES,
  serveStaticFile
};
