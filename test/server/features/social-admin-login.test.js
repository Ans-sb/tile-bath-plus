const test = require("node:test");
const assert = require("node:assert/strict");
const {
  loginAsConfiguredSocialAdmin,
  parseAdminNaverIdentifiers
} = require("../../../src/server/services/auth-service");

const config = {
  adminUsername: "admin",
  adminPassword: "server-secret",
  adminDisplayName: "자재GO 관리자",
  adminNaverIdentifiers: "owner@example.com,naver-owner-id"
};

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
