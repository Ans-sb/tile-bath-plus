const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");

const { sendRawJson } = require("../../../src/server/http-utils");
const { serveStaticFile } = require("../../../src/server/static-files");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function request(port, pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: pathname,
      headers
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks)
      }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("public product JSON uses Brotli, cache headers, and ETag revalidation", async () => {
  const payload = JSON.stringify({
    products: Array.from({ length: 300 }, (_, index) => ({
      id: `T-${index}`,
      name: "압축 검증용 타일 상품"
    }))
  });
  const server = http.createServer((req, res) => sendRawJson(res, 200, payload));
  const port = await listen(server);

  try {
    const first = await request(port, "/api/products", {
      "Accept-Encoding": "br, gzip"
    });
    assert.equal(first.status, 200);
    assert.equal(first.headers["content-encoding"], "br");
    assert.match(first.headers["cache-control"], /max-age=300/);
    assert.equal(zlib.brotliDecompressSync(first.body).toString("utf8"), payload);
    assert.ok(first.headers.etag);

    const cached = await request(port, "/api/products", {
      "If-None-Match": `\"unrelated\", ${first.headers.etag}`
    });
    assert.equal(cached.status, 304);
    assert.equal(cached.body.length, 0);
  } finally {
    await close(server);
  }
});

test("versioned static assets are compressed and cached immutably", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "jajaego-static-"));
  const source = "const message = '자재GO 성능 검증';\n".repeat(300);
  fs.writeFileSync(path.join(root, "app.js"), source);

  const server = http.createServer((req, res) => {
    serveStaticFile(req, res, {
      root,
      shouldBlockStaticPath: () => false
    });
  });
  const port = await listen(server);

  try {
    const first = await request(port, "/app.js?v=performance1", {
      "Accept-Encoding": "gzip"
    });
    assert.equal(first.status, 200);
    assert.equal(first.headers["content-encoding"], "gzip");
    assert.match(first.headers["cache-control"], /immutable/);
    assert.equal(zlib.gunzipSync(first.body).toString("utf8"), source);
    assert.ok(first.headers.etag);

    const cached = await request(port, "/app.js?v=performance1", {
      "If-None-Match": first.headers.etag
    });
    assert.equal(cached.status, 304);
    assert.equal(cached.body.length, 0);
  } finally {
    await close(server);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("web app manifest uses the installable manifest content type", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "jajaego-manifest-"));
  const source = JSON.stringify({ name: "자재GO", start_url: "/" });
  fs.writeFileSync(path.join(root, "manifest.webmanifest"), source);

  const server = http.createServer((req, res) => {
    serveStaticFile(req, res, {
      root,
      shouldBlockStaticPath: () => false
    });
  });
  const port = await listen(server);

  try {
    const response = await request(port, "/manifest.webmanifest", {
      "Accept-Encoding": "gzip"
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers["content-type"], "application/manifest+json; charset=utf-8");
    assert.equal(response.headers["content-encoding"], "gzip");
    assert.equal(zlib.gunzipSync(response.body).toString("utf8"), source);
  } finally {
    await close(server);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
