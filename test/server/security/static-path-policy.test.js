const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isPublicStaticPath,
  shouldBlockStaticPath
} = require("../../../src/server/security/static-path-policy");

test("static path policy exposes only storefront assets", () => {
  assert.equal(isPublicStaticPath("/index.html"), true);
  assert.equal(isPublicStaticPath("/app.js"), true);
  assert.equal(isPublicStaticPath("/src/client/features/products/product-cards.js"), true);
  assert.equal(isPublicStaticPath("/images/branding/logo.png"), true);
  assert.equal(isPublicStaticPath("/uploads/site-studio/home.webp"), true);
});

test("static path policy blocks source, configuration, data, and traversal", () => {
  for (const pathname of [
    "/server.js",
    "/package.json",
    "/src/server/routes/media-routes.js",
    "/test/server/features/launch-security-routes.test.js",
    "/mobile/README.md",
    "/backups/products.json",
    "/products-db.js",
    "/.env",
    "/images/../server.js",
    "/images/%2e%2e/server.js",
    "/images/%252e%252e/server.js"
  ]) {
    assert.equal(shouldBlockStaticPath(pathname), true, pathname);
  }
});
