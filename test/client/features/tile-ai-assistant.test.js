const test = require("node:test");
const assert = require("node:assert/strict");

const { buildRequestHistory } = require("../../../src/client/features/tile-assistant/tile-ai-assistant");

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
