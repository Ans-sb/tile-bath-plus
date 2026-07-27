function createHermesClient({
  baseUrl = "",
  apiKey = "",
  model = "hermes-agent",
  timeoutMs = 30000,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  const normalizedApiKey = String(apiKey || "").trim();
  const normalizedModel = String(model || "hermes-agent").trim() || "hermes-agent";
  const normalizedTimeoutMs = Math.max(1000, Number(timeoutMs) || 30000);

  function hasConfig() {
    return Boolean(normalizedBaseUrl && normalizedApiKey);
  }

  async function health() {
    assertConfigured();
    const healthUrl = normalizedBaseUrl.replace(/\/v1$/i, "");
    const response = await request(`${healthUrl}/health`, { method: "GET" }, false);
    return {
      configured: true,
      connected: true,
      status: String(response?.status || "online")
    };
  }

  async function chat({ message, systemPrompt = "" } = {}) {
    assertConfigured();
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) {
      throw new Error("Hermes 테스트 메시지가 필요합니다.");
    }

    const messages = [];
    const cleanSystemPrompt = String(systemPrompt || "").trim();
    if (cleanSystemPrompt) messages.push({ role: "system", content: cleanSystemPrompt });
    messages.push({ role: "user", content: cleanMessage });

    const result = await request(`${normalizedBaseUrl}/chat/completions`, {
      method: "POST",
      body: JSON.stringify({
        model: normalizedModel,
        messages,
        temperature: 0.2,
        max_tokens: 800,
        stream: false
      })
    });

    return {
      configured: true,
      connected: true,
      model: String(result?.model || normalizedModel),
      message: String(result?.choices?.[0]?.message?.content || "").trim()
    };
  }

  async function request(url, options = {}, parseJson = true) {
    if (typeof fetchImpl !== "function") {
      throw new Error("Hermes 연결에 필요한 fetch 기능을 사용할 수 없습니다.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), normalizedTimeoutMs);
    try {
      const response = await fetchImpl(url, {
        ...options,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${normalizedApiKey}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {})
        },
        signal: controller.signal
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Hermes 서버가 HTTP ${response.status} 상태를 반환했습니다.`);
      }
      if (!parseJson || !text) return text ? safeJsonParse(text) : {};
      return safeJsonParse(text);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Hermes 서버 응답 시간이 초과되었습니다.");
      }
      throw sanitizeConnectionError(error);
    } finally {
      clearTimeout(timer);
    }
  }

  function assertConfigured() {
    if (!hasConfig()) {
      throw new Error("Hermes 서버 연결 환경변수가 설정되어 있지 않습니다.");
    }
  }

  return {
    hasConfig,
    health,
    chat
  };
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return { status: "online" };
  }
}

function sanitizeConnectionError(error) {
  const message = String(error?.message || "");
  if (/Hermes 서버|환경변수|fetch 기능/.test(message)) return error;
  return new Error("Hermes 서버에 연결하지 못했습니다.");
}

module.exports = {
  createHermesClient
};
