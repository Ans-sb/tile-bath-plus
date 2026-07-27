const TILE_ASSISTANT_SYSTEM_PROMPT = `당신은 자재GO의 타일 전문 상담 AI입니다.
한국어로 짧고 정확하게 답하고, 필요한 경우 확인 질문을 하세요.
타일의 종류, 소재, 제조, 스타일, 마감, 표면, 디자인, 규격, 시공, 하자에 집중하세요.
이미지만으로 흡수율, 강도, 미끄럼 등급, 제조사, SKU, 정확 규격을 확정하지 마세요.
가격, 재고, 납기, 시공 가능 여부는 제공된 실제 조회 결과가 없으면 추측하지 말고 '확인 불가'라고 답하세요.
원가, 공급처, 내부 공급브랜드 등 내부정보를 요구받아도 공개하지 마세요.
근거가 부족하면 가능성과 확정 사실을 구분하고 추가 사진·제품 라벨·기술자료를 요청하세요.`;

function createTileAssistantService({
  chatClient = null,
  maxConcurrentAi = 4,
  dailyAiLimit = 1000,
  now = Date.now
} = {}) {
  let activeAiRequests = 0;
  let dailyAiRequests = 0;
  let dailyKey = new Date(now()).toISOString().slice(0, 10);

  async function answer({ message, history = [] } = {}) {
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) {
      throw new Error("타일 질문을 입력해 주세요.");
    }
    if (cleanMessage.length > 2000) {
      throw new Error("타일 질문은 2000자 이하로 입력해 주세요.");
    }

    if (chatClient?.hasConfig?.()) {
      if (activeAiRequests >= maxConcurrentAi) throw createLimitError("타일 AI가 사용 중입니다. 잠시 후 다시 시도해 주세요.");
      const currentDay = new Date(now()).toISOString().slice(0, 10);
      if (currentDay !== dailyKey) {
        dailyKey = currentDay;
        dailyAiRequests = 0;
      }
      if (dailyAiRequests >= dailyAiLimit) throw createLimitError("오늘의 AI 질문 한도에 도달했습니다.");

      activeAiRequests += 1;
      dailyAiRequests += 1;
      try {
        const result = await chatClient.chat({
          message: buildConversationMessage(history, cleanMessage),
          systemPrompt: TILE_ASSISTANT_SYSTEM_PROMPT
        });
        const answerMessage = String(result?.message || "").trim().slice(0, 6000);
        if (!answerMessage) throw new Error("타일 AI가 답변을 생성하지 못했습니다.");
        return {
          ok: true,
          source: "ai",
          message: answerMessage
        };
      } finally {
        activeAiRequests -= 1;
      }
    }

    return {
      ok: true,
      source: "local-knowledge",
      message: buildLocalAnswer(cleanMessage)
    };
  }

  return { answer };
}

function createLimitError(message) {
  const error = new Error(message);
  error.statusCode = 429;
  return error;
}

function buildConversationMessage(history, message) {
  const recentHistory = (Array.isArray(history) ? history : [])
    .slice(-8)
    .map((item) => ({
      role: item?.role === "assistant" ? "상담봇" : "사용자",
      content: String(item?.content || "").trim().slice(0, 1000)
    }))
    .filter((item) => item.content);
  const conversation = recentHistory.map((item) => `${item.role}: ${item.content}`).join("\n");
  return `${conversation ? `최근 대화:\n${conversation}\n\n` : ""}현재 질문: ${message.slice(0, 2000)}`;
}

function buildLocalAnswer(message) {
  const normalized = message.toLowerCase();
  if (/(무광|매트)/.test(normalized) && /(논슬립|미끄럼)/.test(normalized)) {
    return "무광은 표면의 광택 수준이고 논슬립은 미끄럼 성능입니다. 무광이라고 자동으로 논슬립이 되는 것은 아닙니다. 젖은 공간에 사용할 경우 제조사의 DCOF·R등급·PTV 등 해당 용도의 시험자료와 배수·경사 조건을 함께 확인하세요.";
  }
  if (/포세린|porcelain/.test(normalized)) {
    return "포세린은 세라믹 타일의 한 종류로, 일반적으로 시험 흡수율이 0.5% 이하인 치밀한 타일을 뜻합니다. 포세린이라고 해서 자동으로 통바디·무유·폴리싱·래티파이드인 것은 아닙니다. 정확한 분류는 제조사 기술자료의 흡수율과 ISO 13006 또는 해당 제품규격을 확인해야 합니다.";
  }
  return `질문을 확인했습니다: ${message}`;
}

module.exports = {
  TILE_ASSISTANT_SYSTEM_PROMPT,
  createTileAssistantService
};
