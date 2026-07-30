const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../../..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");

test("logged-out customer features use a shared login gate", () => {
  assert.match(indexHtml, /id="authRequiredPage"/);
  assert.match(indexHtml, /id="authRequiredTitle"/);
  assert.match(indexHtml, /data-page-target="loginPage">로그인</);
  assert.match(indexHtml, /data-page-target="signupPage">회원가입</);
  assert.match(appJs, /const AUTH_REQUIRED_PAGE_IDS = new Set\(/);
  assert.match(appJs, /"productsPage"/);
  assert.match(appJs, /"plannerPage"/);
  assert.match(appJs, /"renderPage"/);
  assert.match(appJs, /AUTH_REQUIRED_PAGE_IDS\.has\(pageId\) && !authUser/);
});

test("product loading is skipped without an authenticated session", () => {
  assert.match(appJs, /async function loadProducts\(\) \{\s*if \(!authUser\) \{/);
  assert.match(appJs, /function pageRequiresProducts\(pageId = currentPageId\) \{\s*return Boolean\(authUser\)/);
  assert.match(appJs, /async function ensureProductsReady\(\) \{\s*if \(!authUser\) return;/);
});

test("successful login always opens the member home", () => {
  assert.match(appJs, /const AUTH_RETURN_PAGE_KEY = "tbpAuthReturnPage"/);
  assert.match(appJs, /function rememberAuthReturnPage/);
  assert.match(appJs, /function openMemberHomeAfterLogin\(options = \{\}\)/);
  assert.match(appJs, /clearAuthReturnPage\(\);\s*switchPage\("homePage", options\);/);
  assert.match(appJs, /loginForm\?\.reset\(\);\s*openMemberHomeAfterLogin\(\{ pushHistory: false \}\);/);
  assert.match(appJs, /loginForm\.reset\(\);\s*openMemberHomeAfterLogin\(\);/);
});

test("login started from the public home always opens the member home", () => {
  assert.match(
    appJs,
    /pageId === "loginPage" && currentPageId === "homePage" && !authUser[\s\S]*?clearAuthReturnPage\(\)/
  );
  assert.match(appJs, /openMemberHomeAfterLogin/);
});
