const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../../..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const stylesCss = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

test("my page provides a task-first member workspace", () => {
  assert.match(indexHtml, /class="my-page-workspace"/);
  assert.match(indexHtml, /data-my-page-view-target="overview"/);
  assert.match(indexHtml, /data-my-page-view-target="orders"/);
  assert.match(indexHtml, /data-my-page-view-target="history"/);
  assert.match(indexHtml, /data-my-page-view-target="dispatch"/);
  assert.match(indexHtml, /data-my-page-view-target="cart"/);
  assert.match(indexHtml, /data-my-page-view-target="clients"/);
  assert.match(indexHtml, /data-my-page-view-target="account"/);
  assert.match(indexHtml, /data-page-target="renderPage"><span>08<\/span>실사보정/);
  assert.match(indexHtml, /data-page-target="proposalPage"><span>09<\/span>제안서/);
  assert.match(indexHtml, /id="myPageSearchInput"/);
});

test("my page navigation switches panels and derives dispatch orders", () => {
  assert.match(appJs, /function switchMyPageView\(/);
  assert.match(appJs, /function filterMyPageView\(/);
  assert.match(appJs, /function getDispatchOrders\(/);
  assert.match(appJs, /배차\|배송\|출고\|상차\|이동/);
  assert.match(appJs, /renderMyPageOverview\(pastOrders\)/);
  assert.match(appJs, /label: "실사보정"[\s\S]*?pageTarget: "renderPage"/);
  assert.match(appJs, /label: "제안서"[\s\S]*?pageTarget: "proposalPage"/);
});

test("proposal is available to signed-in members without internal product fields", () => {
  const adminOnlyPages = appJs.match(/const ADMIN_ONLY_PAGE_IDS = new Set\(\[([^\]]*)\]\)/)?.[1] || "";
  const proposalPayloadStart = appJs.indexOf("async function generateProfessionalProposalDeck()");
  const proposalPayloadEnd = appJs.indexOf("async function refreshServerConnection()", proposalPayloadStart);
  const proposalPayload = appJs.slice(proposalPayloadStart, proposalPayloadEnd);

  assert.equal(adminOnlyPages.includes("proposalPage"), false);
  assert.doesNotMatch(proposalPayload, /costPrice:/);
  assert.doesNotMatch(proposalPayload, /maker:/);
});

test("my page becomes a horizontal task bar on mobile", () => {
  assert.match(stylesCss, /\.my-page-workspace\s*\{[\s\S]*?grid-template-columns:\s*220px minmax\(0, 1fr\)/);
  assert.match(stylesCss, /@media \(max-width: 760px\)[\s\S]*?\.my-page-workspace\s*\{[\s\S]*?display:\s*block/);
  assert.match(stylesCss, /\.my-page-side-nav\s*\{[\s\S]*?display:\s*flex/);
  assert.match(stylesCss, /\.my-page-view-panel\[hidden\]\s*\{[\s\S]*?display:\s*none !important/);
});
