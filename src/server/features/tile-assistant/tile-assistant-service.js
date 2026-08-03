const TILE_ASSISTANT_SYSTEM_PROMPT = `당신은 자재GO의 타일 전문 상담 AI입니다.
한국어로 짧고 정확하게 답하고, 질문에 포함된 정보만으로 설명할 수 있는 일반 지식은 되묻지 말고 바로 답하세요.
첫 문장에 결론을 제시한 뒤 핵심 기준을 2~5개 항목으로 설명하세요.
화면에 그대로 표시되므로 별표, 샵, 굵게 표시 같은 마크다운 기호는 사용하지 말고 번호와 줄바꿈만 사용하세요.
정확한 제품 판정에 필수 정보가 빠진 경우에만 답변 끝에 확인 질문을 하나 덧붙이세요. 질문만 하고 답변을 끝내지 마세요.
사용자가 물은 핵심 주제를 다른 주제로 바꾸지 마세요. 예를 들어 접착제 선택 기준을 물으면 타일 종류를 소개하지 말고 접착제 선택 기준을 답하세요.
시공 질문은 바탕면 상태, 실내·실외와 건식·습식 환경, 타일 재질과 흡수율, 규격과 중량, 접착제의 제조사 용도·등급을 기준으로 설명하세요.
도기질 타일은 일반적으로 포세린보다 흡수율이 높은 벽용 세라믹이므로 저흡수성 타일이라고 단정하지 마세요.
욕실 접착제는 습식 공간 적합성을 확인해야 하지만 방수층을 대신하지는 않는다고 안내하세요.
타일의 종류, 소재, 제조, 스타일, 마감, 표면, 디자인, 규격, 시공, 하자에 집중하세요.
이미지만으로 흡수율, 강도, 미끄럼 등급, 제조사, SKU, 정확 규격을 확정하지 마세요.
가격, 재고, 납기, 시공 가능 여부는 제공된 실제 조회 결과가 없으면 추측하지 말고 '확인 불가'라고 답하세요.
실제 상품 DB 조회 결과가 제공되지 않았다면 특정 상품명, 품번, SKU를 만들어 추천하지 마세요.
상품 추천이 적합한 질문에는 선택 기준을 설명하고, 실제 자재GO 상품은 답변 아래의 '추천 상품 보기' 버튼에서 확인하도록 안내하세요.
상품 추천 질문에 '추천할 수 없습니다'라고 답하지 말고, 특정 SKU 대신 적합한 규격·용도·마감·색상·스타일 조건을 정리하세요.
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
    const actions = buildTileProductRecommendationActions(cleanMessage);

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
            message: answerMessage,
            actions
          };
        } catch {
          return {
            ok: true,
            source: "local-fallback",
            message: buildLocalAnswer(cleanMessage, actions.length > 0),
            actions
          };
        }
      } finally {
        activeAiRequests -= 1;
      }
    }

    return {
      ok: true,
      source: "local-knowledge",
      message: buildLocalAnswer(cleanMessage, actions.length > 0),
      actions
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

function buildLocalAnswer(message, hasProductRecommendation = false) {
  const normalized = message.toLowerCase();
  if (/(무광|매트)/.test(normalized) && /(논슬립|미끄럼)/.test(normalized)) {
    return "무광은 표면의 광택 수준이고 논슬립은 미끄럼 성능입니다. 무광이라고 자동으로 논슬립이 되는 것은 아닙니다. 젖은 공간에 사용할 경우 제조사의 DCOF·R등급·PTV 등 해당 용도의 시험자료와 배수·경사 조건을 함께 확인하세요.";
  }
  if (/포세린|porcelain/.test(normalized)) {
    return "포세린은 세라믹 타일의 한 종류로, 일반적으로 시험 흡수율이 0.5% 이하인 치밀한 타일을 뜻합니다. 포세린이라고 해서 자동으로 통바디·무유·폴리싱·래티파이드인 것은 아닙니다. 정확한 분류는 제조사 기술자료의 흡수율과 ISO 13006 또는 해당 제품규격을 확인해야 합니다.";
  }
  if (hasProductRecommendation) {
    return "말씀하신 조건을 기준으로 자재GO 상품 DB에서 후보를 확인할 수 있습니다. 규격과 마감은 우선 조건으로 적용하고, 색상과 스타일이 비슷한 순서로 비교해 보세요. 아래 '추천 상품 보기' 버튼을 누르면 관련 상품을 바로 검색합니다.";
  }
  return `질문을 확인했습니다: ${message}`;
}

function buildTileProductRecommendationActions(message) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage || !isTileProductRecommendationQuestion(cleanMessage)) return [];
  return [{
    type: "open-product-search",
    label: "추천 상품 보기",
    targetPage: "productsPage",
    query: buildTileProductSearchQuery(cleanMessage)
  }];
}

function isTileProductRecommendationQuestion(message) {
  const normalized = String(message || "").toLowerCase();
  const asksForRecommendation = /(추천|찾아\s*줘|찾아\s*주세요|골라\s*줘|골라\s*주세요|보여\s*줘|보여\s*주세요|어울리|비슷한|유사한|어떤\s*타일|살\s*수\s*있|구매)/.test(normalized);
  if (!asksForRecommendation) return false;
  if (/(접착제|타일본드|본드|줄눈|압착시멘트|몰탈|방수제|실리콘|공구)/.test(normalized)) return false;
  return /(타일|포세린|세라믹|자기질|도기질|모자이크|브릭|마블|스톤|테라조|트래버틴|시멘트|콘크리트|우드|솔리드|유광|무광|논슬립|벽|바닥|욕실|주방|현관|베란다|외부|\d{2,4}\s*[*x×]\s*\d{2,4}|\d{3,4}\s*각)/.test(normalized);
}

function buildTileProductSearchQuery(message) {
  const source = String(message || "").toLowerCase();
  const terms = [];
  const add = (value) => {
    if (value && !terms.includes(value)) terms.push(value);
  };

  const sizeMatches = source.match(/\d{2,4}(?:\.\d+)?\s*[*x×]\s*\d{2,4}(?:\.\d+)?/g) || [];
  sizeMatches.slice(0, 2).forEach((value) => add(value.replace(/\s+/g, "").replace(/[x×]/g, "*")));
  const squareSize = source.match(/\b(\d{3,4})\s*각\b/);
  if (squareSize) add(`${squareSize[1]}*${squareSize[1]}`);

  const groups = [
    ["바닥", /바닥/], ["벽", /벽(?!돌)/],
    ["무광", /무광|매트|matt|matte/], ["유광", /유광|폴리싱|polished|glossy/],
    ["논슬립", /논슬립|미끄럼\s*방지|anti[- ]?slip/],
    ["화이트", /화이트|흰색|백색/], ["아이보리", /아이보리|크림/], ["베이지", /베이지|샌드|그레이지/],
    ["그레이", /그레이|회색/], ["차콜", /차콜|다크\s*그레이/], ["블랙", /블랙|검정|흑색/],
    ["브라운", /브라운|갈색/], ["그린", /그린|녹색/], ["블루", /블루|파랑|청색/],
    ["핑크", /핑크|분홍/], ["레드", /레드|빨강/], ["옐로우", /옐로우|노랑/],
    ["마블", /마블|대리석/], ["스톤", /스톤|석재|자연석/], ["시멘트", /시멘트|콘크리트/],
    ["트래버틴", /트래버틴|트라버틴/], ["테라조", /테라조/], ["우드", /우드|나무/],
    ["솔리드", /솔리드|민무늬/], ["패턴", /패턴|무늬/], ["브릭", /브릭|벽돌/],
    ["모자이크", /모자이크/], ["입체", /입체|3d|엠보|텍스처|텍스쳐/],
    ["포세린", /포세린|포쉐린|porcelain/], ["자기질", /자기질/], ["도기질", /도기질/]
  ];
  groups.forEach(([value, pattern]) => {
    if (pattern.test(source)) add(value);
  });

  return terms.join(" ").slice(0, 180) || "타일";
}

module.exports = {
  TILE_ASSISTANT_SYSTEM_PROMPT,
  buildTileProductRecommendationActions,
  createTileAssistantService
};
