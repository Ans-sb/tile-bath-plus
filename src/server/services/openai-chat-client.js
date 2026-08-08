function createOpenAiChatClient({
  apiKey = "",
  model = "gpt-4o-mini",
  timeoutMs = 18000,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedApiKey = String(apiKey || "").trim();
  const normalizedModel = String(model || "gpt-4o-mini").trim() || "gpt-4o-mini";
  const normalizedTimeoutMs = Math.max(1000, Number(timeoutMs) || 18000);

  function hasConfig() {
    return Boolean(normalizedApiKey);
  }

  async function chat({ message, systemPrompt = "" } = {}) {
    if (!hasConfig()) throw new Error("OpenAI 상담 연결이 설정되어 있지 않습니다.");
    if (typeof fetchImpl !== "function") throw new Error("OpenAI 상담 연결을 사용할 수 없습니다.");

    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) throw new Error("타일 상담 질문이 필요합니다.");

    const messages = [];
    const cleanSystemPrompt = String(systemPrompt || "").trim();
    if (cleanSystemPrompt) messages.push({ role: "system", content: cleanSystemPrompt });
    messages.push({ role: "user", content: cleanMessage });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), normalizedTimeoutMs);
    try {
      const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${normalizedApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: normalizedModel,
          messages,
          temperature: 0.2,
          max_tokens: 900,
          stream: false
        }),
        signal: controller.signal
      });
      const result = safeJsonParse(await response.text());
      if (!response.ok) throw new Error("OpenAI 타일 상담에 연결하지 못했습니다.");

      const answer = String(result?.choices?.[0]?.message?.content || "").trim();
      if (!answer) throw new Error("OpenAI 타일 상담이 답변을 생성하지 못했습니다.");
      return { message: answer };
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("OpenAI 타일 상담 응답 시간이 초과되었습니다.");
      if (/OpenAI 타일 상담/.test(String(error?.message || ""))) throw error;
      throw new Error("OpenAI 타일 상담에 연결하지 못했습니다.");
    } finally {
      clearTimeout(timer);
    }
  }

  return { hasConfig, chat };
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

module.exports = { createOpenAiChatClient };
