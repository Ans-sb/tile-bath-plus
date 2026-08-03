const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildRequestHistory,
  normalizeRecommendationActions
} = require("../../../src/client/features/tile-assistant/tile-ai-assistant");

test("tile assistant client sends only the eight most recent completed messages", () => {
  const messages = Array.from({ length: 12 }, (_, index) => ({
    role: index % 2 ? "assistant" : "user",
    content: `메시지 ${index}`,
    pending: index === 11
  }));

  const result = buildRequestHistory(messages);

  assert.equal(result.length, 8);
  assert.equal(result[0].content, "메시지 3");
  assert.equal(result[7].content, "메시지 10");
});

test("tile assistant mobile launcher stays above the fixed bottom navigation", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "../../../src/client/features/tile-assistant/tile-ai-assistant.css"),
    "utf8"
  );

  assert.match(css, /bottom:\s*calc\(96px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /height:\s*calc\(100dvh - 188px - env\(safe-area-inset-bottom\)\)/);
});

test("tile assistant client accepts only the fixed customer product action", () => {
  const result = normalizeRecommendationActions([
    { type: "open-product-search", label: "추천 상품 보기", targetPage: "adminPage", query: "600x600 무광 베이지" },
    { type: "open-external-url", label: "외부 이동", href: "https://example.com" }
  ]);

  assert.deepEqual(result, [{
    type: "open-product-search",
    label: "추천 상품 보기",
    targetPage: "productsPage",
    query: "600x600 무광 베이지"
  }]);
});
