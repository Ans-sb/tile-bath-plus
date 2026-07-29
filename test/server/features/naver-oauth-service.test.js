const assert = require("node:assert/strict");
const test = require("node:test");
const { createNaverOAuthService } = require("../../../src/server/services/naver-oauth-service");

test("Naver OAuth start creates a signed state and browser-bound cookie", () => {
  const service = createTestService();
  const redirect = service.buildAuthorizationRequest({
    mode: "login",
    requestOrigin: "https://jajaego.com"
  });
  const url = new URL(redirect.location);

  assert.equal(url.origin, "https://nid.naver.com");
  assert.equal(url.pathname, "/oauth2.0/authorize");
  assert.equal(url.searchParams.get("client_id"), "naver-client");
  assert.equal(url.searchParams.get("redirect_uri"), "https://jajaego.com/api/social-auth/naver/callback");
  assert.ok(url.searchParams.get("state"));
  assert.match(redirect.setCookie, /^jajaego_naver_oauth=/);
  assert.match(redirect.setCookie, /HttpOnly/);
  assert.match(redirect.setCookie, /SameSite=Lax/);
  assert.match(redirect.setCookie, /Secure/);
});

test("Naver OAuth callback exchanges code and creates an encrypted profile token", async () => {
  const requests = [];
  const service = createTestService({
    fetchImpl: async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (String(url).includes("/oauth2.0/token")) {
        return jsonResponse({ access_token: "naver-access-token" });
      }
      return jsonResponse({
        resultcode: "00",
        message: "success",
        response: {
          id: "naver-member-1",
          email: "owner@example.com",
          name: "대표님",
          profile_image: "https://example.com/profile.jpg"
        }
      });
    }
  });
  const start = service.buildAuthorizationRequest({
    mode: "signup",
    requestOrigin: "https://jajaego.com"
  });
  const startUrl = new URL(start.location);
  const state = startUrl.searchParams.get("state");
  const cookie = start.setCookie.split(";")[0];
  const callbackUrl = new URL("https://jajaego.com/api/social-auth/naver/callback");
  callbackUrl.searchParams.set("code", "authorization-code");
  callbackUrl.searchParams.set("state", state);

  const callback = await service.completeAuthorization({
    requestUrl: callbackUrl.toString(),
    cookieHeader: cookie,
    requestOrigin: "https://jajaego.com"
  });
  const appUrl = new URL(callback.location);
  const profileToken = new URLSearchParams(appUrl.hash.slice(1)).get("access_token");
  const profile = service.readProfileToken(profileToken);

  assert.equal(requests.length, 2);
  assert.equal(appUrl.origin, "https://jajaego.com");
  assert.equal(appUrl.searchParams.get("socialProvider"), "naver");
  assert.equal(appUrl.searchParams.get("socialMode"), "signup");
  assert.ok(profileToken.startsWith("naver."));
  assert.equal(profile.provider, "naver");
  assert.equal(profile.providerId, "naver-member-1");
  assert.equal(profile.email, "owner@example.com");
  assert.equal(profile.name, "대표님");
  assert.match(callback.setCookie, /Max-Age=0/);
});

test("Naver OAuth callback preserves the Android app return target", async () => {
  const service = createTestService({
    fetchImpl: async (url) => {
      if (String(url).includes("/oauth2.0/token")) {
        return jsonResponse({ access_token: "naver-access-token" });
      }
      return jsonResponse({
        resultcode: "00",
        message: "success",
        response: {
          id: "naver-member-android",
          email: "android@example.com",
          name: "안드로이드 회원"
        }
      });
    }
  });
  const start = service.buildAuthorizationRequest({
    mode: "login",
    requestOrigin: "https://jajaego.com",
    client: "android"
  });
  const state = new URL(start.location).searchParams.get("state");
  const callbackUrl = new URL("https://jajaego.com/api/social-auth/naver/callback");
  callbackUrl.searchParams.set("code", "authorization-code");
  callbackUrl.searchParams.set("state", state);

  const callback = await service.completeAuthorization({
    requestUrl: callbackUrl.toString(),
    cookieHeader: start.setCookie.split(";")[0],
    requestOrigin: "https://jajaego.com"
  });
  const appUrl = new URL(callback.location);

  assert.equal(appUrl.origin, "https://jajaego.com");
  assert.equal(appUrl.pathname, "/");
  assert.equal(appUrl.searchParams.get("mobileClient"), "android");
  assert.equal(appUrl.searchParams.get("socialProvider"), "naver");
  assert.equal(appUrl.searchParams.get("socialMode"), "login");
  assert.ok(new URLSearchParams(appUrl.hash.slice(1)).get("access_token"));
});

test("Naver OAuth callback rejects a state that is not bound to the browser cookie", async () => {
  const service = createTestService();
  const start = service.buildAuthorizationRequest({
    mode: "login",
    requestOrigin: "https://jajaego.com"
  });
  const state = new URL(start.location).searchParams.get("state");
  const callbackUrl = new URL("https://jajaego.com/api/social-auth/naver/callback");
  callbackUrl.searchParams.set("code", "authorization-code");
  callbackUrl.searchParams.set("state", state);

  await assert.rejects(
    service.completeAuthorization({
      requestUrl: callbackUrl.toString(),
      cookieHeader: "jajaego_naver_oauth=wrong-cookie",
      requestOrigin: "https://jajaego.com"
    }),
    /처음부터 다시 시도/
  );
});

function createTestService(overrides = {}) {
  return createNaverOAuthService({
    clientId: "naver-client",
    clientSecret: "naver-secret",
    redirectUri: "https://jajaego.com/api/social-auth/naver/callback",
    tokenSecret: "test-token-secret",
    now: () => 1_800_000_000_000,
    randomBytes: (size) => Buffer.alloc(size, 7),
    fetchImpl: async () => jsonResponse({}),
    ...overrides
  });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
