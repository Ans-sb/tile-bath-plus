const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../../..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const stylesCss = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

test("bathroom inspiration starts with a searchable image gallery", () => {
  assert.match(indexHtml, /id="bathInteriorGalleryView"/);
  assert.match(indexHtml, /id="bathInteriorGallerySearch"/);
  assert.match(indexHtml, /id="bathInteriorGalleryFilters"/);
  assert.match(indexHtml, /data-bath-interior-filter="modern"/);
  assert.match(indexHtml, /data-bath-interior-filter="minimal"/);
  assert.match(indexHtml, /data-bath-interior-filter="warm"/);
  assert.match(indexHtml, /data-bath-interior-filter="pattern"/);
  assert.match(appJs, /let bathInteriorViewMode = "gallery"/);
  assert.match(appJs, /function renderBathInteriorGallery\(\)/);
  assert.match(stylesCss, /\.bath-interior-gallery\s*\{\s*column-count: 5/);
});

test("clicking an inspiration image opens the existing shoppable detail", () => {
  assert.match(indexHtml, /id="bathInteriorDetailView"/);
  assert.match(indexHtml, /id="bathInteriorGalleryBack"/);
  assert.match(indexHtml, /id="bathInteriorStage"/);
  assert.match(indexHtml, /id="bathInteriorProducts"/);
  assert.match(appJs, /data-bath-interior-open=/);
  assert.match(appJs, /function openBathInteriorScene\(sceneId\)/);
  assert.match(appJs, /bathInteriorViewMode = "detail"/);
  assert.match(appJs, /bathInteriorViewMode = "gallery"/);
});

test("bathroom detail keeps bounded desktop and mobile image ratios", () => {
  assert.match(stylesCss, /\.bath-interior-page\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(stylesCss, /\.bath-interior-detail-view\s*\{[^}]*max-width:\s*100%/s);
  assert.match(stylesCss, /\.bath-interior-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.55fr\)\s+minmax\(330px,\s*0\.75fr\)/s);
  assert.match(stylesCss, /\.bath-interior-stage\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/s);
  assert.match(stylesCss, /@media \(max-width:\s*720px\)[\s\S]*?\.bath-interior-stage\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5/s);
});

test("bathroom scenes stay customer safe and contain no internal brand metadata", () => {
  const scenesStart = appJs.indexOf("const BATH_INTERIOR_SCENES = [");
  const scenesEnd = appJs.indexOf("const PLANNER_THREE_URL", scenesStart);
  const scenesSource = appJs.slice(scenesStart, scenesEnd);

  assert.ok(scenesStart >= 0);
  assert.ok(scenesEnd > scenesStart);
  assert.ok((scenesSource.match(/galleryGroup:/g) || []).length >= 12);
  assert.doesNotMatch(scenesSource, /internal_brand|supplier_name|margin_grade|quality_grade/);
});

test("logged-out promotion states the four core JAJAEGO strengths", () => {
  assert.match(indexHtml, /빠른 출고·현장 도착/);
  assert.match(indexHtml, /10,000\+ 제품/);
  assert.match(indexHtml, /실사 시공 이미지/);
  assert.match(indexHtml, /제안서·견적서 제작/);
});
