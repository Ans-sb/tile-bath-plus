const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  calculateMaterialUsage,
  createSketchupPackageStore,
  parseTileSize
} = require("../../../src/server/features/sketchup/sketchup-package-store");

test("SketchUp package keeps customer-safe tile fields and strips internal commerce data", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jajaego-sketchup-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createSketchupPackageStore({
    filePath: path.join(directory, "packages.json"),
    now: () => new Date("2026-08-03T00:00:00.000Z"),
    randomBytes: () => Buffer.from([0, 1, 2, 3, 4, 5])
  });

  const record = await store.createPackage({
    payload: {
      project: { name: "성수동 욕실", siteName: "성수 현장", roomName: "욕실 1" },
      groutMm: 3,
      groutColor: "#B7B1A7",
      offsetXmm: 150,
      offsetYmm: -25,
      wastePercent: 10,
      items: [{ productId: "tile-1", role: "wall" }]
    },
    requestOrigin: "http://localhost:4173",
    products: [{
      id: "tile-1",
      productType: "tile",
      name: "화이트 포세린",
      modelName: "WT-600",
      size: "600x1200x9T",
      finish: "무광",
      color: "화이트",
      material: "포세린",
      image: "images/tile.jpg",
      boxPcs: 2,
      boxSqm: 1.44,
      internal_brand_code: "SECRET-BRAND",
      supplier_name: "SECRET-SUPPLIER",
      costPrice: 1234,
      margin_grade: "A"
    }]
  });

  assert.equal(record.code, "ABCDEF");
  assert.equal(record.items[0].widthMm, 600);
  assert.equal(record.items[0].heightMm, 1200);
  assert.equal(record.items[0].thicknessMm, 9);
  assert.equal(record.items[0].imageUrl, "http://localhost:4173/images/tile.jpg");
  assert.deepEqual(record.grout, { widthMm: 3, color: "#B7B1A7" });
  assert.deepEqual(record.layout, { offsetXmm: 150, offsetYmm: -25 });

  const serialized = JSON.stringify(record);
  ["internal_brand", "supplier", "costPrice", "margin_grade", "SECRET-BRAND", "SECRET-SUPPLIER"]
    .forEach((forbidden) => assert.equal(serialized.includes(forbidden), false));
});

test("SketchUp report calculates order area, pieces, and boxes from applied face area", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jajaego-sketchup-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createSketchupPackageStore({
    filePath: path.join(directory, "packages.json"),
    randomBytes: () => Buffer.from([0, 1, 2, 3, 4, 5])
  });
  const record = await store.createPackage({
    payload: { wastePercent: 10, items: [{ productId: "tile-1", role: "floor" }] },
    requestOrigin: "http://localhost:4173",
    products: [{ id: "tile-1", productType: "tile", name: "600각", size: "600x600", boxPcs: 4, boxSqm: 1.44 }]
  });
  const result = await store.appendReport(record.code, {
    productId: "tile-1",
    role: "floor",
    surfaceId: "model:42",
    areaSqm: 10,
    rotation: 90,
    offsetXmm: 120,
    offsetYmm: 40
  });

  assert.equal(result.report.orderAreaSqm, 11);
  assert.equal(result.report.tileCount, 31);
  assert.equal(result.report.boxCount, 8);
  assert.equal(result.report.rotation, 90);
  assert.equal(result.report.offsetXmm, 120);
  assert.equal(result.report.offsetYmm, 40);
  assert.equal(result.report.groutColor, "#D8D5CF");
});

test("tile size and usage helpers normalize common Korean catalog values", () => {
  assert.deepEqual(parseTileSize("600*1200 / 9T"), { widthMm: 600, heightMm: 1200 });
  assert.deepEqual(parseTileSize("300×600"), { widthMm: 300, heightMm: 600 });
  assert.deepEqual(calculateMaterialUsage({ areaSqm: 20, widthMm: 600, heightMm: 600, boxPcs: 4, wastePercent: 10 }), {
    areaSqm: 20,
    orderAreaSqm: 22,
    tileCount: 62,
    boxCount: 16
  });
});
