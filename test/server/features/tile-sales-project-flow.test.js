const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createTileAssistantService } = require("../../../src/server/features/tile-assistant/tile-assistant-service");
const { createTileSalesProjectStore } = require("../../../src/server/features/tile-assistant/tile-sales-project-store");

test("tile sales agent continues one field project from discovery to quantity", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jajaego-tile-flow-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createTileSalesProjectStore({ filePath: path.join(directory, "projects.json") });
  const service = createTileAssistantService({
    projectStore: store,
    searchCatalog: async () => ({
      results: [{
        id: "tile-1",
        name: "베이지 스톤",
        size: "600*600",
        finish: "무광",
        color: "베이지",
        style: "스톤",
        widthMm: 600,
        heightMm: 600,
        sqmPerBox: 1.44
      }]
    })
  });
  const actor = { type: "guest", id: "browser-1" };

  const discovery = await service.answer({ message: "카페에 쓸 베이지 스톤 타일 추천해줘", actor });
  assert.equal(discovery.stage, "조건확인");
  assert.ok(discovery.projectId);

  const usage = await service.answer({ message: "바닥이야", projectId: discovery.projectId, actor });
  assert.equal(usage.missingConditions[0], "size");

  const size = await service.answer({ message: "600각이야", projectId: discovery.projectId, actor });
  assert.equal(size.missingConditions[0], "finish");

  const recommendation = await service.answer({ message: "무광으로", projectId: discovery.projectId, actor });
  assert.equal(recommendation.stage, "상품추천");
  assert.equal(recommendation.recommendations.length, 1);

  const quantity = await service.answer({ message: "면적은 32㎡야", projectId: discovery.projectId, actor });
  assert.equal(quantity.stage, "물량계산");
  assert.equal(quantity.quantityEstimate.orderAreaSqm, 35.2);

  const restored = await store.readProject(discovery.projectId, actor);
  assert.equal(restored.messages.length, 10);
  assert.equal(restored.stage, "물량계산");
  assert.equal(restored.intent.size, "600*600");
});
