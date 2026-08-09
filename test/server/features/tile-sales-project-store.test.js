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
