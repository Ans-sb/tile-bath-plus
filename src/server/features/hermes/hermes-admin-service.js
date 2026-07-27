const DEFAULT_STATUS_MESSAGE = "자재GO Hermes 연결 상태를 한 문장으로 확인해 주세요.";
const INTERNAL_SYSTEM_PROMPT = "당신은 자재GO 내부 운영 보조 AI입니다. 한국어로 짧고 명확하게 답하세요.";

function createHermesAdminService({ hermesClient }) {
  if (!hermesClient) {
    throw new Error("hermesClient is required");
  }

  async function readStatus() {
    if (!hermesClient.hasConfig()) {
      return {
        ok: true,
        configured: false,
        connected: false,
        status: "not_configured"
      };
    }

    try {
      return {
        ok: true,
        ...(await hermesClient.health())
      };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        connected: false,
        status: "unavailable",
        error: error.message
      };
    }
  }

  async function testConnection(payload) {
    const message = String(payload?.message || DEFAULT_STATUS_MESSAGE)
      .trim()
      .slice(0, 1000);

    return {
      ok: true,
      ...(await hermesClient.chat({
        message,
        systemPrompt: INTERNAL_SYSTEM_PROMPT
      }))
    };
  }

  return {
    readStatus,
    testConnection
  };
}

module.exports = {
  createHermesAdminService
};
