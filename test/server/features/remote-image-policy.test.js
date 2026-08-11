const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  assertSafeRemoteImageUrl,
  buildPinnedRequestOptions,
  isPrivateAddress,
  readRemoteImageDataUrlSafely
} = require("../../../src/server/security/remote-image-policy");

test("remote image policy rejects loopback URLs before fetching", async () => {
  await assert.rejects(
    assertSafeRemoteImageUrl("http://127.0.0.1:3000/api/health"),
    (error) => error.statusCode === 400
  );
});

test("private-address checks cover mapped IPv6 and multicast ranges", () => {
  assert.equal(isPrivateAddress("::ffff:7f00:1"), true);
  assert.equal(isPrivateAddress("::ffff:127.0.0.1"), true);
  assert.equal(isPrivateAddress("ff02::1"), true);
  assert.equal(isPrivateAddress("2001:4860:4860::8888"), false);
});

test("remote image policy rejects hostnames that resolve to private addresses", async () => {
  await assert.rejects(
    assertSafeRemoteImageUrl("https://images.example.test/tile.jpg", {
      lookup: async () => [{ address: "169.254.169.254", family: 4 }]
    }),
    (error) => error.statusCode === 400
  );
});

test("remote image requests pin the validated IP while preserving HTTPS identity", async () => {
  const url = await assertSafeRemoteImageUrl("https://images.example.test:8443/tile.jpg", {
    lookup: async () => [{ address: "93.184.216.34", family: 4 }]
  });
  const options = buildPinnedRequestOptions(url);

  assert.equal(options.hostname, "93.184.216.34");
  assert.equal(options.port, "8443");
  assert.equal(options.servername, "images.example.test");
  assert.equal(options.headers.Host, "images.example.test:8443");
  assert.equal(options.path, "/tile.jpg");
});

test("production image requests use the IP-pinned transport instead of global fetch", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../../src/server/security/remote-image-policy.js"), "utf8");
  assert.doesNotMatch(source, /options\.fetchImpl \|\| fetch/);
  assert.match(source, /options\.fetchImpl \|\| requestRemoteImagePinned/);
});

test("remote image fetch validates every redirect target", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    readRemoteImageDataUrlSafely("https://images.example.test/tile.jpg", {
      lookup: async () => [{ address: "203.0.113.10", family: 4 }],
      fetchImpl: async () => {
        fetchCalls += 1;
        return {
          status: 302,
          headers: new Headers({ location: "http://127.0.0.1:3000/api/health" })
        };
      }
    }),
    (error) => error.statusCode === 400 && /허용되지 않는/.test(error.message)
  );
  assert.equal(fetchCalls, 1);
});

test("remote image fetch returns a bounded image data URL", async () => {
  const result = await readRemoteImageDataUrlSafely("https://images.example.test/tile.jpg", {
    lookup: async () => [{ address: "203.0.113.10", family: 4 }],
    fetchImpl: async () => new Response(Uint8Array.from([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "image/jpeg", "content-length": "3" }
    })
  });

  assert.equal(result, "data:image/jpeg;base64,AQID");
});

test("remote image fetch aborts requests that exceed the timeout", async () => {
  await assert.rejects(
    readRemoteImageDataUrlSafely("https://images.example.test/tile.jpg", {
      timeoutMs: 1,
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      fetchImpl: async (_url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      })
    }),
    (error) => error.statusCode === 504
  );
});

test("remote image timeout remains active while reading the response body", async () => {
  await assert.rejects(
    readRemoteImageDataUrlSafely("https://images.example.test/slow.jpg", {
      timeoutMs: 2,
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: async () => new Promise((resolve) => setTimeout(() => resolve(Uint8Array.from([1, 2, 3]).buffer), 20))
      })
    }),
    (error) => error.statusCode === 504
  );
});

test("remote image streaming stops as soon as the size limit is exceeded", async () => {
  let cancelled = false;
  let reads = 0;
  const reader = {
    async read() {
      reads += 1;
      if (reads <= 2) return { done: false, value: Uint8Array.from([1, 2, 3, 4]) };
      return { done: true };
    },
    async cancel() { cancelled = true; }
  };

  await assert.rejects(
    readRemoteImageDataUrlSafely("https://images.example.test/large.jpg", {
      maxBytes: 6,
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "image/jpeg" }),
        body: { getReader: () => reader }
      })
    }),
    (error) => error.statusCode === 413
  );
  assert.equal(reads, 2);
  assert.equal(cancelled, true);
});
