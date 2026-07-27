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
