const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createTileSalesProjectStore } = require("../../../src/server/features/tile-assistant/tile-sales-project-store");

test("tile sales project store keeps a project conversation private to its owner", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jajaego-tile-project-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createTileSalesProjectStore({ filePath: path.join(directory, "projects.json") });
  const owner = { type: "guest", id: "browser-a" };

  const saved = await store.saveTurn({
    owner,
    userMessage: "카페 바닥 베이지 스톤 600각 무광",
    result: {
      stage: "상품추천",
      message: "추천 상품 6개를 찾았습니다.",
      intent: { space: "카페", application: "바닥", size: "600*600", finish: "무광" },
      recommendations: [{ id: "tile-1", name: "안전한 상품", internalBrandName: "PRIVATE" }]
    }
  });

  const restored = await store.readProject(saved.id, owner);
  assert.equal(restored.messages.length, 2);
  assert.equal(restored.intent.size, "600*600");
  assert.equal(restored.recommendations[0].name, "안전한 상품");
  assert.doesNotMatch(JSON.stringify(restored), /PRIVATE|internalBrand/i);
  assert.equal(await store.readProject(saved.id, { type: "guest", id: "browser-b" }), null);
});

test("tile sales project store manages site details and customer-safe selected products", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jajaego-tile-ledger-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createTileSalesProjectStore({ filePath: path.join(directory, "projects.json") });
  const owner = { type: "member", id: "123-45-67890" };

  const created = await store.createProject({
    owner,
    site: {
      siteName: "성수동 카페",
      clientName: "가나다 인테리어",
      siteAddress: "서울 성동구",
      spaceType: "카페",
      neededBy: "2026-08-20",
      notes: "베이지 스톤 선호"
    }
  });
  assert.equal(created.title, "성수동 카페");
  assert.equal(created.intent.space, "카페");

  const listed = await store.listProjects(owner);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].site.clientName, "가나다 인테리어");
  assert.equal(listed[0].selectedProductCount, 0);

  const selected = await store.setSelectedProduct({
    projectId: created.id,
    owner,
    selected: true,
    product: {
      id: "tile-safe-1",
      name: "베이지 스톤 600각",
      size: "600*600",
      finish: "무광",
      internal_brand_name: "PRIVATE_BRAND",
      supplier_name: "PRIVATE_SUPPLIER",
      cost: 12000
    }
  });
  assert.equal(selected.selectedProducts.length, 1);
  assert.doesNotMatch(JSON.stringify(selected.selectedProducts), /PRIVATE|supplier|cost|brand/i);

  const updated = await store.updateProject({
    projectId: created.id,
    owner,
    site: { siteName: "성수동 카페 2층", clientName: "가나다 인테리어", spaceType: "카페" }
  });
  assert.equal(updated.title, "성수동 카페 2층");
  assert.equal((await store.listProjects(owner))[0].selectedProductCount, 1);
  assert.deepEqual(await store.listProjects({ type: "member", id: "000-00-00000" }), []);
});
