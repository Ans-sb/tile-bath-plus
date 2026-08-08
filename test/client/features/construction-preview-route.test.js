const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../../..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");

test("construction preview entry points use the unified render workspace", () => {
  assert.doesNotMatch(indexHtml, /data-page-target="plannerPage"/);
  assert.match(indexHtml, /data-page-target="renderPage">시공 미리보기/);
  assert.match(appJs, /function applyInitialPageFromHash\(\) \{[\s\S]*?requestedPageId === "plannerPage"[\s\S]*?requestedPageId = "renderPage";/);
  assert.match(appJs, /if \(pageId === "plannerPage"\) \{\s*pageId = "renderPage";/);
});
