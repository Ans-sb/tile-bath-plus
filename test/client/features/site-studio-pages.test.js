const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../../..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const studioJs = fs.readFileSync(
  path.join(rootDir, "src/client/features/admin/site-studio.js"),
  "utf8"
);

test("admin studio exposes full-page editing and an admin-only quick edit entry", () => {
  assert.match(indexHtml, /id="siteStudioPageSection"/);
  assert.match(indexHtml, /id="siteStudioPageSelect"/);
  assert.match(indexHtml, /id="siteStudioPageList"/);
  assert.match(indexHtml, /id="siteStudioPageEditorFields"/);
  assert.match(indexHtml, /id="adminQuickPageEditBtn"/);
  assert.match(appJs, /syncAdminQuickEditButton/);
  assert.match(appJs, /openPageEditor\(sourcePageId\)/);
});

test("page editor supports independent content, image, and design overrides", () => {
  assert.match(studioJs, /contentEnabled:\s*false/);
  assert.match(studioJs, /imageEnabled:\s*false/);
  assert.match(studioJs, /designEnabled:\s*false/);
  assert.match(studioJs, /data-site-page-enabled="contentEnabled"/);
  assert.match(studioJs, /data-site-page-enabled="imageEnabled"/);
  assert.match(studioJs, /data-site-page-enabled="designEnabled"/);
  assert.match(studioJs, /function applyPageSettings/);
  assert.match(studioJs, /openPageEditor/);
});

test("customer page editor does not add internal product management fields", () => {
  [
    "internal_brand_id",
    "internal_brand_code",
    "internal_brand_name",
    "supplier_name",
    "margin_grade",
    "quality_grade"
  ].forEach((forbiddenField) => {
    assert.equal(studioJs.includes(forbiddenField), false);
  });
});
