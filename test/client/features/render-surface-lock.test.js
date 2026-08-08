const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../../..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const serverJs = fs.readFileSync(path.join(rootDir, "server.js"), "utf8");

test("render workspace exposes manual region marking only for point tile", () => {
  assert.match(indexHtml, /id="renderSurfaceGuidePanel"/);
  assert.match(indexHtml, /data-render-guide-surface="point"/);
  assert.doesNotMatch(indexHtml, /data-render-guide-surface="wall"/);
  assert.doesNotMatch(indexHtml, /data-render-guide-surface="floor"/);
  assert.match(appJs, /strictSurfaceMapping:\s*Boolean\(pointSurface\)/);
  assert.match(appJs, /surfaceRegions:\s*pointSurface/);
  assert.match(appJs, /if \(pointSurface && !isRenderSurfaceRegionValid\(renderSurfaceRegions\.point\)\)/);
});

test("render server isolates only the selected point area with a same-size PNG mask", () => {
  assert.match(serverJs, /const orderedSurfaces = \["floor", "wall", "point"\]/);
  assert.match(serverJs, /const shouldMaskStage = strictSurfaceMapping && entry\.surface === "point"/);
  assert.match(serverJs, /createRenderSurfaceMaskDataUrl\(stageBaseImageDataUrl, surfaceRegions\.point\)/);
  assert.match(serverJs, /form\.append\("mask",/);
  assert.match(serverJs, /assertRenderMaskMatchesBaseImage\(baseImageDataUrl, maskImageDataUrl\)/);
  assert.match(serverJs, /const requestOutputFormat = maskImageDataUrl \? "png"/);
  assert.match(serverJs, /compositeRenderResultInsideMask\(stageBaseImageDataUrl, generatedImageDataUrl, maskImageDataUrl\)/);
  assert.match(serverJs, /const output = Buffer\.from\(baseImage\.data\)/);
});

test("wall and floor prompts prohibit swapping their target planes", () => {
  assert.match(serverJs, /only to vertical architectural wall planes/);
  assert.match(serverJs, /exclusively to the lowest horizontal walkable floor plane/);
  assert.match(serverJs, /HARD FLOOR-ONLY EDIT BOUNDARY/);
  assert.match(serverJs, /NON-NEGOTIABLE PLANE RULE/);
  assert.match(serverJs, /Every opaque pixel is locked and must remain identical to image 1/);
});

test("wall and floor can render without a manual region while point remains optional", () => {
  assert.match(appJs, /return getRenderSurfaceKeys\(\)/);
  assert.match(appJs, /포인트 타일이 없으면 영역 지정 없이 바로 보정을 시작할 수 있습니다/);
  assert.doesNotMatch(appJs, /const pointOnlyMode = Boolean\(renderSurfaceSelections\.point\.tileId\)/);
  assert.match(serverJs, /const normalizedSurfaces = normalizedSurfaceCandidates/);
  assert.match(serverJs, /entry\.surface === "point" && !isRenderSurfaceRegionValid\(surfaceRegions\.point\)/);
});

test("unfinished construction exposure is permanently cleaned during rendering", () => {
  assert.match(serverJs, /CONSTRUCTION COMPLETION CLEANUP/);
  assert.match(serverJs, /exposed plumbing supply pipes, drain pipes, rough-in pipe ends/);
  assert.match(serverJs, /Keep intended finished fixtures such as faucets, shower heads, floor drains, toilets, basins/);
  assert.match(serverJs, /stage: "construction-cleanup"/);
  assert.match(serverJs, /const hasBaseSurfaceStage = orderedSurfaces\.some/);
});

test("render prompts preserve every selected tile module ratio and surface finish", () => {
  assert.match(serverJs, /PHYSICAL TILE SCALE CONTRACT/);
  assert.match(serverJs, /PAIRWISE SCALE CHECK/);
  assert.match(serverJs, /for EVERY selected tile size, not from a preset example/);
  assert.match(serverJs, /actual module edges/);
  assert.match(serverJs, /Count grout joints from the actual module edges/);
  assert.match(serverJs, /Math\.round\(value \* 1000000\) \/ 1000000/);
  assert.match(serverJs, /정확한 타일 크기로 보정하려면 실제 가로×세로 규격이 필요합니다/);
  assert.match(appJs, /parseRenderTileSizeSpec/);
  assert.ok(appJs.includes("\\d{1,4}(?:\\.\\d{1,3})?"));
  assert.match(serverJs, /HARD FINISH RULE/);
  assert.match(serverJs, /render a smooth glossy or polished surface/);
  assert.match(serverJs, /render a diffuse low-sheen surface/);
  assert.match(appJs, /적용 스펙:/);
});
