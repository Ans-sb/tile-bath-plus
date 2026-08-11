const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("server remote image conversion delegates to the SSRF-safe fetcher", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../..", "server.js"), "utf8");
  assert.match(source, /require\("\.\/src\/server\/security\/remote-image-policy"\)/);
  const start = source.indexOf("async function readRemoteImageDataUrl(imageUrl)");
  const end = source.indexOf("function normalizeImageContentType", start);
  const body = source.slice(start, end);
  assert.match(body, /readRemoteImageDataUrlSafely\(url/);
  assert.doesNotMatch(body, /await fetch\(url\)/);

  const bufferStart = source.indexOf("async function readImageBuffer(imageUrl");
  const bufferEnd = source.indexOf("function decodeImageBuffer", bufferStart);
  const bufferBody = source.slice(bufferStart, bufferEnd);
  assert.match(bufferBody, /readRemoteImageDataUrlSafely\(url/);
  assert.doesNotMatch(bufferBody, /await fetch\(url/);
});
