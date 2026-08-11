const assert = require("node:assert/strict");
const test = require("node:test");

const { isLocalRequest } = require("../../../src/server/security/local-request-policy");
const { applySecurityHeaders } = require("../../../src/server/security/security-headers");

test("local request policy ignores spoofed Host headers", () => {
  assert.equal(isLocalRequest({
    headers: { host: "localhost" },
    socket: { remoteAddress: "10.0.0.7" }
  }), false);
  assert.equal(isLocalRequest({
    headers: { host: "jajaego.com" },
    socket: { remoteAddress: "::ffff:127.0.0.1" }
  }), true);
});

test("security headers include browser hardening and production HSTS", () => {
  const headers = new Map();
  applySecurityHeaders({ setHeader: (name, value) => headers.set(name, value) }, {
    isProduction: true,
    requestId: "request-1"
  });
  assert.match(headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(headers.get("Strict-Transport-Security"), /max-age=31536000/);
  assert.equal(headers.get("X-Request-Id"), "request-1");
});
