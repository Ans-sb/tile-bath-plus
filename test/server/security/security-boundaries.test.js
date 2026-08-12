const assert = require("node:assert/strict");
const test = require("node:test");

const { isLocalRequest } = require("../../../src/server/security/local-request-policy");
const {
  resolveClientAddress,
  shouldTrustProxy
} = require("../../../src/server/security/client-address-policy");
const { applySecurityHeaders } = require("../../../src/server/security/security-headers");

test("local request policy ignores spoofed Host headers", () => {
  assert.equal(isLocalRequest({
    headers: { host: "localhost" },
    socket: { remoteAddress: "10.0.0.7" }
  }), false);
  assert.equal(isLocalRequest({
    headers: { host: "jajaego.com" },
    socket: { remoteAddress: "::ffff:127.0.0.1" }
  }, {
    nodeEnvironment: "development",
    railwayProjectId: "",
    railwayEnvironmentId: "",
    railwayEnvironmentName: ""
  }), true);
});

test("local request policy rejects proxied and production requests", () => {
  const loopbackRequest = {
    headers: { "x-forwarded-for": "203.0.113.20" },
    socket: { remoteAddress: "127.0.0.1" }
  };
  assert.equal(isLocalRequest(loopbackRequest, {
    nodeEnvironment: "development",
    railwayProjectId: "",
    railwayEnvironmentId: "",
    railwayEnvironmentName: ""
  }), false);
  assert.equal(isLocalRequest({
    headers: {},
    socket: { remoteAddress: "127.0.0.1" }
  }, {
    nodeEnvironment: "production",
    railwayProjectId: "",
    railwayEnvironmentId: "",
    railwayEnvironmentName: ""
  }), false);
});

test("proxy trust is explicit or Railway-scoped", () => {
  assert.equal(shouldTrustProxy({ trustProxy: "", railwayProjectId: "project-1" }), true);
  assert.equal(shouldTrustProxy({ trustProxy: "0", railwayProjectId: "project-1" }), false);
  assert.equal(shouldTrustProxy({
    trustProxy: "",
    railwayProjectId: "",
    railwayEnvironmentId: "",
    railwayEnvironmentName: ""
  }), false);
});

test("client address prefers Railway X-Real-IP and safely falls back to right-most XFF", () => {
  const request = {
    headers: {
      "x-real-ip": "203.0.113.20",
      "x-forwarded-for": "1.1.1.1, 203.0.113.10"
    },
    socket: { remoteAddress: "10.0.0.5" }
  };
  assert.equal(resolveClientAddress(request, { trustProxy: true }), "203.0.113.20");
  assert.equal(resolveClientAddress(request, { trustProxy: false }), "10.0.0.5");
  delete request.headers["x-real-ip"];
  assert.equal(resolveClientAddress(request, { trustProxy: true }), "203.0.113.10");
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
