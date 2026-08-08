const test = require("node:test");
const assert = require("node:assert/strict");
const {
  loginAsConfiguredAdmin,
  loginAsConfiguredSocialAdmin,
  parseAdminNaverIdentifiers
} = require("../../../src/server/services/auth-service");
const { verifyAdminToken } = require("../../../src/server/services/account-session");

const config = {
  adminUsername: "admin",
  adminPassword: "server-secret",
  adminDisplayName: "자재GO 관리자",
  adminNaverIdentifiers: "owner@example.com,naver-owner-id"
};

test("configured admin credentials receive a signed admin session", () => {
  const result = loginAsConfiguredAdmin({
    username: "admin",
    password: "server-secret"
  }, config);

  assert.equal(result.user.role, "admin");
  assert.equal(result.user.adminUsername, "admin");
  assert.equal(result.user.provider, "관리자 직접 로그인");
  assert.equal(result.user.pricingAccess, "approved");
  assert.ok(verifyAdminToken(result.user.adminToken, config));
});

test("direct admin login rejects a wrong id, password, or missing server secret", () => {
  assert.equal(loginAsConfiguredAdmin({ username: "wrong", password: "server-secret" }, config), null);
  assert.equal(loginAsConfiguredAdmin({ username: "admin", password: "wrong" }, config), null);
  assert.equal(loginAsConfiguredAdmin({ username: "admin", password: "server-secret" }, {
    ...config,
    adminPassword: ""
  }), null);
});

test("configured Naver email receives an admin session", () => {
  const result = loginAsConfiguredSocialAdmin({
    provider: "naver",
    providerId: "another-id",
    email: "OWNER@EXAMPLE.COM",
    name: "대표"
  }, config);

  assert.equal(result.user.role, "admin");
  assert.equal(result.user.adminUsername, "admin");
  assert.equal(result.user.provider, "네이버 로그인");
  assert.match(result.user.adminToken, /^admin\./);
});

test("configured Naver provider id receives an admin session", () => {
  const result = loginAsConfiguredSocialAdmin({
    provider: "naver",
    providerId: "naver-owner-id",
    email: ""
  }, config);

  assert.equal(result.user.role, "admin");
});

test("unconfigured or non-Naver accounts remain regular social logins", () => {
  assert.equal(loginAsConfiguredSocialAdmin({
    provider: "naver",
    providerId: "unknown",
    email: "member@example.com"
  }, config), null);
  assert.equal(loginAsConfiguredSocialAdmin({
    provider: "google",
    providerId: "naver-owner-id",
    email: "owner@example.com"
  }, config), null);
});

test("Naver admin identifier list accepts commas, semicolons, and newlines", () => {
  assert.deepEqual(
    parseAdminNaverIdentifiers("a@example.com;provider-1\nprovider-2,a@example.com"),
    ["a@example.com", "provider-1", "provider-2"]
  );
});
