const assert = require("node:assert/strict");
const test = require("node:test");
const { handleSystemRoutes } = require("../../../src/server/routes/system-routes");

test("Android asset links route publishes the app package and signing fingerprint", async () => {
  const response = createResponse();
  const assetLinks = [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.jajaego.app",
      sha256_cert_fingerprints: ["AA:BB:CC"]
    }
  }];

  const handled = await handleSystemRoutes({
    method: "GET",
    url: "/.well-known/assetlinks.json",
    headers: { host: "jajaego.com" }
  }, response, {
    getAndroidAssetLinks: () => assetLinks
  });

  assert.equal(handled, true);
  assert.equal(response.status, 200);
  assert.equal(response.headers["Cache-Control"], "public, max-age=3600");
  assert.deepEqual(JSON.parse(response.body), assetLinks);
});

test("Apple app site association route publishes iOS universal-link metadata", async () => {
  const response = createResponse();
  const association = {
    applinks: {
      apps: [],
      details: [{
        appIDs: ["TEAMID.com.jajaego.app"],
        components: [{ "/": "/" }]
      }]
    },
    webcredentials: {
      apps: ["TEAMID.com.jajaego.app"]
    }
  };

  const handled = await handleSystemRoutes({
    method: "GET",
    url: "/.well-known/apple-app-site-association",
    headers: { host: "jajaego.com" }
  }, response, {
    getAppleAppSiteAssociation: () => association
  });

  assert.equal(handled, true);
  assert.equal(response.status, 200);
  assert.equal(response.headers["Content-Type"], "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(response.body), association);
});

test("Social auth start forwards the Android client marker", async () => {
  const response = createResponse();
  const calls = [];

  const handled = await handleSystemRoutes({
    method: "GET",
    url: "/api/social-auth/start?provider=google&mode=login&client=android",
    headers: { host: "jajaego.com" }
  }, response, {
    startSocialAuth(...args) {
      calls.push(args);
      return {
        location: "https://accounts.google.com/o/oauth2/auth",
        setCookie: ""
      };
    }
  });

  assert.equal(handled, true);
  assert.equal(response.status, 302);
  assert.equal(response.headers.Location, "https://accounts.google.com/o/oauth2/auth");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "google");
  assert.equal(calls[0][1], "login");
  assert.equal(calls[0][3], "android");
});

test("Social auth start forwards the iOS client marker", async () => {
  const response = createResponse();
  const calls = [];

  const handled = await handleSystemRoutes({
    method: "GET",
    url: "/api/social-auth/start?provider=kakao&mode=signup&client=ios",
    headers: { host: "jajaego.com" }
  }, response, {
    startSocialAuth(...args) {
      calls.push(args);
      return {
        location: "https://kauth.kakao.com/oauth/authorize",
        setCookie: ""
      };
    }
  });

  assert.equal(handled, true);
  assert.equal(response.status, 302);
  assert.equal(calls[0][3], "ios");
});

function createResponse() {
  return {
    status: 0,
    headers: {},
    body: "",
    writeHead(status, headers = {}) {
      this.status = status;
      this.headers = { ...this.headers, ...headers };
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value = "") {
      this.body += String(value);
    }
  };
}
