const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../../..");
const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const stylesCss = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
const siteSettings = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "site-settings.json"), "utf8"));

test("site appearance uses the shared JAJAEGO palette and readable type scale", () => {
  assert.equal(siteSettings.appearance.primaryColor, "#1268ff");
  assert.equal(siteSettings.appearance.inkColor, "#081957");
  assert.equal(siteSettings.appearance.pageColor, "#f7f9fc");
  assert.match(stylesCss, /body\.site-font-default\s*\{\s*font-size:\s*15px;/);
  assert.match(stylesCss, /--brand-yellow:\s*#ffe500/);
  assert.match(stylesCss, /2026-08-02: unified member and operations interface/);
});

test("member proposal uses the customer experience mode", () => {
  assert.match(indexHtml, /<main class="app-page workspace customer-page" id="proposalPage">/);
  assert.match(appJs, /CUSTOMER_PAGE_IDS[^;]+"proposalPage"/);
});

test("mobile member pages prevent layout-wide horizontal overflow", () => {
  assert.match(stylesCss, /\.page-panel\.active:not\(#homePage\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(stylesCss, /\.customer-my-page \.my-page-workspace,[\s\S]*?max-width:\s*100%/);
});
