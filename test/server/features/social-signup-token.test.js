const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createSocialSignupToken,
  verifySocialSignupToken
} = require("../../../src/server/services/account-session");

const secret = "test-member-secret";

test("social signup proof preserves the verified provider identity", () => {
  const token = createSocialSignupToken({
    accountId: "account-123",
    provider: "KAKAO",
    providerId: "kakao-user-456",
    email: "OWNER@EXAMPLE.COM"
  }, secret);
  const profile = verifySocialSignupToken(token, secret);

  assert.equal(profile.accountId, "account-123");
  assert.equal(profile.provider, "kakao");
  assert.equal(profile.providerId, "kakao-user-456");
  assert.equal(profile.email, "owner@example.com");
  assert.ok(profile.expiresAt > Date.now());
});

test("social signup proof rejects tampering and a different secret", () => {
  const token = createSocialSignupToken({
    provider: "google",
    providerId: "google-user-123"
  }, secret);

  assert.equal(verifySocialSignupToken(`${token}x`, secret), null);
  assert.equal(verifySocialSignupToken(token, "different-secret"), null);
});
