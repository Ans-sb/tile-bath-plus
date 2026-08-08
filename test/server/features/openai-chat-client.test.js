const test = require("node:test");
const assert = require("node:assert/strict");

const { createOpenAiChatClient } = require("../../../src/server/services/openai-chat-client");

test("OpenAI tile chat client is configured only with an API key", () => {
  assert.equal(createOpenAiChatClient().hasConfig(), false);
  assert.equal(createOpenAiChatClient({ apiKey: "test-key" }).hasConfig(), true);
});

test("OpenAI tile chat client sends the safety prompt and returns only answer text", async () => {
  let captured;
  const client = createOpenAiChatClient({
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: async (_url, options) => {
      captured = options;
      return {
        ok: true,
        text: async () => JSON.stringify({ choices: [{ message: { content: "안전한 타일 답변" } }] })
      };
    }
  });
  const result = await client.chat({ message: "질문", systemPrompt: "내부정보를 숨기세요." });
  const body = JSON.parse(captured.body);
  assert.equal(body.model, "test-model");
  assert.equal(body.messages[0].role, "system");
  assert.match(body.messages[0].content, /내부정보/);
  assert.equal(result.message, "안전한 타일 답변");
  assert.equal("model" in result, false);
});
