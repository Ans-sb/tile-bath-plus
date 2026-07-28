const assert = require("node:assert/strict");
const test = require("node:test");
const {
  formatSocialProviderLabel,
  normalizeSignupProvider,
  normalizeSocialProviderOptional
} = require("../../../src/server/services/account-mapper");

test("account mapper stores Naver as the canonical social provider", () => {
  assert.equal(normalizeSocialProviderOptional("네이버"), "naver");
  assert.equal(normalizeSocialProviderOptional("custom:naver"), "naver");
  assert.equal(formatSocialProviderLabel("naver", "OWNER@EXAMPLE.COM"), "네이버 가입 <owner@example.com>");
});

test("Naver signup remains a social signup when the provider does not return email", () => {
  assert.equal(normalizeSignupProvider({
    socialProvider: "naver",
    socialEmail: "",
    provider: "일반 회원가입"
  }), "네이버 가입");
});
