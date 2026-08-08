const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "../../..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("SketchUp workspace is wired into the authenticated app shell", () => {
  const html = readProjectFile("index.html");
  const app = readProjectFile("app.js");

  assert.match(html, /id="sketchupPage"/);
  assert.match(html, /downloads\/jajaego-sketchup-local\.rbz/);
  assert.match(html, /src\/client\/features\/sketchup\/sketchup-workspace\.js\?v=/);
  assert.match(app, /sketchupPage/);
  assert.match(app, /TbpSketchupWorkspace\?\.render/);
});

test("SketchUp workspace keeps internal commercial fields out of the customer module", () => {
  const clientSource = readProjectFile("src/client/features/sketchup/sketchup-workspace.js");
  const forbiddenFields = [
    "internal_brand_id",
    "internal_brand_code",
    "internal_brand_name",
    "supplier_name",
    "margin_grade",
    "quality_grade"
  ];

  forbiddenFields.forEach((field) => assert.doesNotMatch(clientSource, new RegExp(field)));
});

test("SketchUp workspace has desktop and mobile layout rules", () => {
  const css = readProjectFile("styles.css");

  assert.match(css, /\.sketchup-layout\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.sketchup-layout/);
});

test("SketchUp workspace supports catalog search, project restore, and cart quantity sync", () => {
  const html = readProjectFile("index.html");
  const clientSource = readProjectFile("src/client/features/sketchup/sketchup-workspace.js");
  const appSource = readProjectFile("app.js");

  assert.match(html, /id="sketchupProductSearch"/);
  assert.match(html, /data-sketchup-source="catalog"/);
  assert.match(html, /id="sketchupRecentPackages"/);
  assert.match(clientSource, /loadRecentPackages/);
  assert.match(clientSource, /applyCartQuantity/);
  assert.match(appSource, /function applySketchupCartQuantity/);
});
