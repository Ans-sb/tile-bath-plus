const test = require("node:test");
const assert = require("node:assert/strict");

const { createTileAssistantService } = require("../../../src/server/features/tile-assistant/tile-assistant-service");

test("tile assistant rejects an empty question", async () => {
  const service = createTileAssistantService();
  await assert.rejects(() => service.answer({ message: "   " }), /타일 질문을 입력해 주세요/);
});

test("tile assistant uses the configured AI with safety instructions and bounded history", async () => {
  let request;
  const service = createTileAssistantService({
    chatClient: {
      hasConfig: () => true,
      chat: async (payload) => {
        request = payload;
        return { message: "무광은 광택 수준이고 논슬립 성능은 시험값으로 확인해야 합니다.", model: "test-model" };
      }
    }
  });
  const result = await service.answer({
    message: " 무광이면 논슬립인가요? ",
    history: Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `이전 질문 ${index}` }))
  });
  assert.equal(result.ok, true);
  assert.equal(result.source, "ai");
  assert.match(request.systemPrompt, /일반 지식은 되묻지 말고 바로 답하세요/);
  assert.match(request.systemPrompt, /마크다운 기호는 사용하지 말고/);
  assert.match(request.systemPrompt, /질문만 하고 답변을 끝내지 마세요/);
  assert.match(request.systemPrompt, /접착제 선택 기준을 답하세요/);
  assert.match(request.systemPrompt, /도기질 타일은 일반적으로 포세린보다 흡수율이 높은/);
  assert.match(request.systemPrompt, /방수층을 대신하지는 않는다고/);
  assert.match(request.systemPrompt, /가격, 재고, 납기/);
  assert.match(request.systemPrompt, /내부정보/);
  assert.match(request.message, /현재 질문: 무광이면 논슬립인가요\?/);
  assert.doesNotMatch(request.message, /이전 질문 0/);
  assert.match(request.message, /이전 질문 11/);
});

test("tile assistant gives a safe local answer about matte and slip resistance", async () => {
  const result = await createTileAssistantService().answer({ message: "무광 타일이면 논슬립인가요?" });
  assert.equal(result.source, "local-knowledge");
  assert.match(result.message, /무광/);
  assert.match(result.message, /미끄럼/);
  assert.match(result.message, /시험/);
});

test("tile assistant rejects questions longer than 2000 characters", async () => {
  await assert.rejects(() => createTileAssistantService().answer({ message: "가".repeat(2001) }), /2000자 이하/);
});

test("tile assistant explains porcelain from verified properties in local mode", async () => {
  const result = await createTileAssistantService().answer({ message: "포세린 타일이 정확히 뭐예요?" });
  assert.match(result.message, /세라믹/);
  assert.match(result.message, /흡수율/);
  assert.match(result.message, /0\.5%/);
  assert.match(result.message, /통바디/);
});

test("tile assistant bounds upstream answer length and hides model details", async () => {
  const service = createTileAssistantService({
    chatClient: { hasConfig: () => true, chat: async () => ({ message: "가".repeat(7000), model: "private-model" }) }
  });
  const result = await service.answer({ message: "타일 질문" });
  assert.equal(result.message.length, 6000);
  assert.equal("model" in result, false);
});

test("tile assistant immediately falls back to local knowledge when AI fails", async () => {
  const service = createTileAssistantService({
    chatClient: {
      hasConfig: () => true,
      chat: async () => { throw new Error("upstream unavailable"); }
    }
  });
  const result = await service.answer({ message: "포세린 타일이 뭐예요?" });
  assert.equal(result.source, "local-fallback");
  assert.match(result.message, /흡수율/);
});

test("tile assistant limits concurrent and daily AI calls", async () => {
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  const service = createTileAssistantService({
    maxConcurrentAi: 1,
    dailyAiLimit: 1,
    chatClient: { hasConfig: () => true, chat: async () => blocked }
  });
  const first = service.answer({ message: "첫 질문" });
  await assert.rejects(() => service.answer({ message: "동시 질문" }), /잠시 후/);
  release({ message: "첫 답변" });
  await first;
  await assert.rejects(() => service.answer({ message: "일일 초과" }), /오늘의 AI 질문 한도/);
});

test("tile assistant adds a safe product search action for recommendation questions", async () => {
  const result = await createTileAssistantService().answer({
    message: "욕실 바닥에 쓸 600x600 무광 베이지 스톤 타일 추천해줘"
  });

  assert.equal(result.actions.length, 1);
  assert.deepEqual(result.actions[0], {
    type: "open-product-search",
    label: "전체 검색 결과",
    targetPage: "productsPage",
    query: "600*600 바닥 무광 베이지 스톤"
  });
  assert.doesNotMatch(JSON.stringify(result.actions), /brand|supplier|cost|원가|공급처/i);
});

test("tile sales agent interprets Korean field terms and asks only one missing condition", async () => {
  const service = createTileAssistantService();
  const result = await service.answer({ message: "카페에 쓸 베이지 타일 추천해줘" });

  assert.equal(result.stage, "조건확인");
  assert.deepEqual(result.missingConditions, ["application", "size", "finish"]);
  assert.match(result.message, /벽에 시공할 타일인지, 바닥에 시공할 타일인지/);
  assert.doesNotMatch(result.message, /원하는 규격을 알려주세요/);
});

test("tile sales agent returns five to ten safe catalog comparisons", async () => {
  let searched;
  const service = createTileAssistantService({
    searchCatalog: async (payload) => {
      searched = payload;
      return {
        results: Array.from({ length: 8 }, (_, index) => ({
          id: `tile-${index}`,
          name: `베이지 스톤 ${index + 1}`,
          size: "600*600",
          finish: "무광",
          color: "베이지",
          style: "스톤",
          material: "포세린",
          image: `/tiles/${index}.jpg`,
          widthMm: 600,
          heightMm: 600,
          sqmPerBox: 1.44,
          reasons: ["규격 일치", "마감 일치"],
          internalBrandName: "SHOULD_NOT_LEAK",
          supplierName: "SHOULD_NOT_LEAK",
          cost: 1000
        }))
      };
    }
  });

  const result = await service.answer({ message: "카페 바닥에 쓸 베이지 스톤 600각 무광" });

  assert.equal(searched.query, "600*600 바닥 무광 베이지 스톤");
  assert.equal(result.stage, "상품추천");
  assert.equal(result.recommendations.length, 8);
  assert.equal(result.actions.some((action) => action.targetPage === "samplePage"), true);
  assert.doesNotMatch(JSON.stringify(result), /SHOULD_NOT_LEAK|internalBrand|supplier|cost/i);
});

test("tile sales agent calculates quantity and advances the project stage", async () => {
  const service = createTileAssistantService({
    searchCatalog: async () => ({
      results: [{
        id: "tile-1",
        name: "베이지 스톤",
        size: "600*600",
        finish: "무광",
        widthMm: 600,
        heightMm: 600,
        sqmPerBox: 1.44
      }]
    })
  });
  const result = await service.answer({
    message: "카페 바닥 베이지 스톤 600각 무광, 면적은 32㎡이고 로스 10%로 계산해줘"
  });

  assert.equal(result.stage, "물량계산");
  assert.deepEqual(result.quantityEstimate, {
    areaSqm: 32,
    lossRate: 10,
    orderAreaSqm: 35.2,
    boxCount: 25,
    tileCount: 98
  });
  assert.match(result.message, /35\.2㎡/);
});

test("tile assistant does not add a product action to knowledge or accessory questions", async () => {
  const service = createTileAssistantService();
  const knowledge = await service.answer({ message: "포세린 타일이 뭐예요?" });
  const adhesive = await service.answer({ message: "욕실 타일 접착제 추천해줘" });

  assert.deepEqual(knowledge.actions, []);
  assert.deepEqual(adhesive.actions, []);
});
