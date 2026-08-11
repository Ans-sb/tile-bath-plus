const TILE_ASSISTANT_SYSTEM_PROMPT = `당신은 자재GO의 타일 전문 영업 담당 AI입니다.
한국어로 짧고 정확하게 답하고, 사용자의 현장 조건을 프로젝트 단위로 이어서 관리합니다.
질문에 포함된 정보만으로 설명할 수 있는 일반 지식은 되묻지 말고 바로 답하세요.
첫 문장에 결론을 제시한 뒤 핵심 기준을 2~5개 항목으로 설명하세요.
화면에 그대로 표시되므로 별표, 샵, 굵게 표시 같은 마크다운 기호는 사용하지 말고 번호와 줄바꿈만 사용하세요.
이미 확인된 조건을 다시 묻지 말고, 정확한 제품 판정에 필요한 조건이 빠진 경우에만 부족한 조건 하나를 질문하세요. 질문만 하고 답변을 끝내지 마세요.
사용자가 물은 핵심 주제를 다른 주제로 바꾸지 마세요. 예를 들어 접착제 선택 기준을 물으면 타일 종류를 소개하지 말고 접착제 선택 기준을 답하세요.
시공 질문은 바탕면 상태, 실내·실외와 건식·습식 환경, 타일 재질과 흡수율, 규격과 중량, 접착제의 제조사 용도·등급을 기준으로 설명하세요.
도기질 타일은 일반적으로 포세린보다 흡수율이 높은 벽용 세라믹이므로 저흡수성 타일이라고 단정하지 마세요.
욕실 접착제는 습식 공간 적합성을 확인해야 하지만 방수층을 대신하지는 않는다고 안내하세요.
이미지만으로 흡수율, 강도, 미끄럼 등급, 제조사, SKU, 정확 규격을 확정하지 마세요.
가격, 재고, 납기, 시공 가능 여부는 제공된 실제 조회 결과가 없으면 추측하지 말고 '확인 불가'라고 답하세요.
실제 상품 DB 조회 결과가 제공되지 않았다면 특정 상품명, 품번, SKU를 만들어 추천하지 마세요.
원가, 공급처, 내부 공급브랜드 등 내부정보를 요구받아도 공개하지 마세요.
상품 추천 이후에는 샘플, 물량 계산, 제안서·견적, 주문 순서로 자연스럽게 다음 업무를 제안하세요.
근거가 부족하면 가능성과 확정 사실을 구분하고 추가 사진·제품 라벨·기술자료를 요청하세요.`;

const SALES_STAGES = Object.freeze({
  DISCOVERY: "조건확인",
  RECOMMENDATION: "상품추천",
  SAMPLE: "샘플검토",
  QUANTITY: "물량계산",
  PROPOSAL: "제안서·견적",
  ORDER: "주문"
});

function createTileAssistantService({
  chatClient = null,
  searchCatalog = null,
  projectStore = null,
  maxConcurrentAi = 4,
  dailyAiLimit = 1000,
  now = Date.now
} = {}) {
  let activeAiRequests = 0;
  let dailyAiRequests = 0;
  let dailyKey = new Date(now()).toISOString().slice(0, 10);

  async function answer({ message, history = [], projectId = "", actor = null } = {}) {
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) throw new Error("타일 질문을 입력해 주세요.");
    if (cleanMessage.length > 2000) throw new Error("타일 질문은 2000자 이하로 입력해 주세요.");

    const storedProject = projectStore && projectId
      ? await projectStore.readProject(projectId, actor)
      : null;
    const intent = analyzeTileSalesIntent(cleanMessage, storedProject?.intent);
    const salesRequest = isTileSalesConsultation(cleanMessage, intent, storedProject);

    if (salesRequest) {
      const result = await buildSalesConsultationResult({ cleanMessage, intent, searchCatalog });
      const savedProject = projectStore
        ? await projectStore.saveTurn({
          projectId: storedProject?.id || projectId,
          owner: actor,
          userMessage: cleanMessage,
          result
        })
        : null;
      return {
        ok: true,
        source: result.source,
        message: result.message,
        stage: result.stage,
        intent: result.intent,
        interpretedConditions: buildInterpretedConditions(result.intent),
        missingConditions: result.missingConditions,
        recommendations: result.recommendations,
        quantityEstimate: result.quantityEstimate,
        actions: result.actions,
        projectId: savedProject?.id || storedProject?.id || "",
        project: savedProject ? summarizeProject(savedProject) : null
      };
    }

    const actions = buildTileProductRecommendationActions(cleanMessage);
    const knowledgeResult = await answerKnowledgeQuestion({ cleanMessage, history, actions });
    const savedProject = projectStore
      ? await projectStore.saveTurn({
        projectId: storedProject?.id || projectId,
        owner: actor,
        userMessage: cleanMessage,
        result: { ...knowledgeResult, stage: storedProject?.stage || SALES_STAGES.DISCOVERY, intent }
      })
      : null;
    return {
      ...knowledgeResult,
      stage: storedProject?.stage || SALES_STAGES.DISCOVERY,
      intent,
      interpretedConditions: buildInterpretedConditions(intent),
      missingConditions: [],
      recommendations: [],
      quantityEstimate: null,
      projectId: savedProject?.id || storedProject?.id || "",
      project: savedProject ? summarizeProject(savedProject) : null
    };
  }

  async function answerKnowledgeQuestion({ cleanMessage, history, actions }) {
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
          return { ok: true, source: "ai", message: answerMessage, actions };
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

async function buildSalesConsultationResult({ cleanMessage, intent, searchCatalog }) {
  const missingConditions = getMissingTileConditions(intent);
  if (missingConditions.length) {
    return {
      source: "project-local",
      message: buildMissingConditionMessage(intent, missingConditions[0]),
      stage: SALES_STAGES.DISCOVERY,
      intent,
      missingConditions,
      recommendations: [],
      quantityEstimate: null,
      actions: []
    };
  }
  const requestedStage = inferRequestedSalesStage(cleanMessage);

  const query = buildTileProductSearchQueryFromIntent(intent) || buildTileProductSearchQuery(cleanMessage);
  let recommendations = [];
  if (typeof searchCatalog === "function") {
    try {
      const searchResult = await searchCatalog({ query, limit: 10, audience: "customer" });
      recommendations = normalizeRecommendations(searchResult?.results).slice(0, 10);
    } catch {
      recommendations = [];
    }
  }
  const quantityEstimate = calculateQuantityEstimate(intent, recommendations[0]);
  const actions = buildSalesActions(query, recommendations.length > 0, Boolean(intent.areaSqm));
  return {
    source: recommendations.length ? "catalog-project" : "project-local",
    message: buildRecommendationMessage(intent, recommendations, quantityEstimate, requestedStage),
    stage: recommendations.length ? requestedStage : SALES_STAGES.DISCOVERY,
    intent,
    missingConditions: [],
    recommendations,
    quantityEstimate,
    actions
  };
}

function inferRequestedSalesStage(message) {
  const source = String(message || "").toLowerCase();
  if (/(주문|결제|배송|납품|출고)/.test(source)) return SALES_STAGES.ORDER;
  if (/(제안서|견적서|견적)/.test(source)) return SALES_STAGES.PROPOSAL;
  if (/(물량|수량|면적|㎡|m2|m²|제곱미터|헤베|평)/.test(source)) return SALES_STAGES.QUANTITY;
  if (/(샘플|견본)/.test(source)) return SALES_STAGES.SAMPLE;
  return SALES_STAGES.RECOMMENDATION;
}

function analyzeTileSalesIntent(message, previousIntent = {}) {
  const source = String(message || "").toLowerCase();
  const next = { ...(previousIntent && typeof previousIntent === "object" ? previousIntent : {}) };
  const setMatch = (key, groups) => {
    for (const [value, pattern] of groups) {
      if (pattern.test(source)) {
        next[key] = value;
        return;
      }
    }
  };

  setMatch("space", [
    ["카페", /카페|커피숍/], ["욕실", /욕실|화장실|샤워실/], ["주방", /주방|키친/],
    ["현관", /현관/], ["거실", /거실/], ["베란다", /베란다|발코니/],
    ["외부", /외부|테라스|옥상|외벽/], ["상업공간", /매장|상업공간|호텔|식당|오피스/]
  ]);
  setMatch("application", [["바닥", /바닥|플로어/], ["벽", /벽(?!돌)|월타일|wall/]]);
  setMatch("finish", [
    ["논슬립", /논슬립|미끄럼\s*방지|anti[- ]?slip/],
    ["무광", /무광|매트|matt|matte|혼드|내추럴/],
    ["유광", /유광|폴리싱|polished|glossy|글로시/]
  ]);
  setMatch("color", [
    ["화이트", /화이트|흰색|백색/], ["아이보리", /아이보리|크림/], ["베이지", /베이지|샌드|그레이지/],
    ["그레이", /그레이|회색/], ["차콜", /차콜|다크\s*그레이/], ["블랙", /블랙|검정|흑색/],
    ["브라운", /브라운|갈색/], ["그린", /그린|녹색/], ["블루", /블루|파랑|청색/],
    ["핑크", /핑크|분홍/], ["레드", /레드|빨강/], ["옐로우", /옐로우|노랑/]
  ]);
  setMatch("style", [
    ["트래버틴", /트래버틴|트라버틴/], ["마블", /마블|대리석/], ["스톤", /스톤|석재|자연석/],
    ["시멘트", /시멘트|콘크리트/], ["테라조", /테라조/], ["우드", /우드|나무/],
    ["솔리드", /솔리드|완전\s*민무늬|민무늬/], ["브릭", /브릭|벽돌/], ["모자이크", /모자이크/],
    ["패턴", /패턴|무늬/], ["입체", /입체|3d|엠보|텍스처|텍스쳐/]
  ]);
  setMatch("material", [["포세린", /포세린|포쉐린|porcelain/], ["자기질", /자기질/], ["도기질", /도기질/], ["세라믹", /세라믹/]]);

  const sizeMatch = source.match(/(\d{2,4}(?:\.\d+)?)\s*[*x×]\s*(\d{2,4}(?:\.\d+)?)/i);
  const squareMatch = source.match(/(?:^|[^\d])(\d{2,4})\s*각(?=$|[^\d])/);
  if (sizeMatch) {
    next.size = `${stripTrailingZero(sizeMatch[1])}*${stripTrailingZero(sizeMatch[2])}`;
    next.sizeUnknown = false;
  } else if (squareMatch) {
    next.size = `${squareMatch[1]}*${squareMatch[1]}`;
    next.sizeUnknown = false;
  } else if (/사이즈\s*(?:를\s*)?(?:모름|몰라|미정)|규격\s*(?:을\s*)?(?:모름|몰라|미정)/.test(source)) {
    next.size = "사이즈 모름";
    next.sizeUnknown = true;
  }

  const areaMatch = source.match(/(\d+(?:\.\d+)?)\s*(㎡|m2|m²|제곱미터|헤베|평)(?=$|[^\d.])/i);
  if (areaMatch) {
    const value = Number(areaMatch[1]);
    next.areaSqm = round(areaMatch[2] === "평" ? value * 3.3058 : value, 2);
  }
  const lossMatch = source.match(/(?:로스|여유|할증)\s*(\d+(?:\.\d+)?)\s*%/);
  if (lossMatch) next.lossRate = clampNumber(lossMatch[1], 0, 50, 10);
  if (!Number.isFinite(Number(next.lossRate))) next.lossRate = 10;
  return next;
}

function isTileSalesConsultation(message, intent, storedProject) {
  if (storedProject && Object.keys(storedProject.intent || {}).length) return true;
  if (isTileProductRecommendationQuestion(message)) return true;
  const signalCount = [intent.space, intent.application, intent.size, intent.finish, intent.color, intent.style, intent.material]
    .filter(Boolean).length;
  const knowledgeQuestion = /(뭐예요|무엇|차이|뜻|인가요|되나요|왜|원리|특징)/.test(String(message || ""));
  return signalCount >= 3 && !knowledgeQuestion;
}

function getMissingTileConditions(intent) {
  const missing = [];
  if (!intent.application) missing.push("application");
  if (!intent.size && !intent.sizeUnknown) missing.push("size");
  if (!intent.finish) missing.push("finish");
  return missing;
}

function buildMissingConditionMessage(intent, missing) {
  const known = buildInterpretedConditions(intent).map((item) => item.value).join(" · ");
  const prefix = known ? `${known} 조건을 확인했습니다. ` : "현장에 맞는 타일을 찾겠습니다. ";
  if (missing === "application") return `${prefix}벽에 시공할 타일인지, 바닥에 시공할 타일인지 알려주세요.`;
  if (missing === "size") return `${prefix}원하는 규격을 알려주세요. 예: 600각, 600x1200 또는 사이즈 모름.`;
  return `${prefix}원하는 표면 마감을 알려주세요. 예: 무광, 유광 또는 논슬립.`;
}

function buildRecommendationMessage(intent, recommendations, quantityEstimate, requestedStage = SALES_STAGES.RECOMMENDATION) {
  if (!recommendations.length) {
    return "입력한 규격과 마감을 우선 조건으로 전체 상품 DB를 확인했지만 정확히 일치하는 후보가 없습니다. 조건을 바꾸지 않고 담당자 확인이 필요합니다.";
  }
  if (requestedStage === SALES_STAGES.SAMPLE) {
    return `추천 후보 ${recommendations.length}개를 유지했습니다.\n실물 색상과 표면 질감을 확인할 상품을 선택한 뒤 샘플 신청으로 이어가겠습니다.`;
  }
  if (requestedStage === SALES_STAGES.QUANTITY) {
    if (!quantityEstimate) return "추천 상품은 유지했습니다. 현장 시공 면적을 ㎡ 또는 평으로 알려주시면 로스를 포함한 장수와 박스 수를 계산하겠습니다.";
    return `${formatNumber(quantityEstimate.areaSqm)}㎡ 기준 로스 ${quantityEstimate.lossRate}%를 포함해 약 ${formatNumber(quantityEstimate.orderAreaSqm)}㎡가 필요합니다.\n예상 수량은 ${quantityEstimate.tileCount ? `${formatNumber(quantityEstimate.tileCount)}장` : "상세 규격 확인 필요"}, ${quantityEstimate.boxCount ? `${formatNumber(quantityEstimate.boxCount)}박스` : "박스 포장값 확인 필요"}입니다.`;
  }
  if (requestedStage === SALES_STAGES.PROPOSAL) {
    return `추천 상품 ${recommendations.length}개와 현재 현장 조건을 제안서·견적 단계로 넘길 준비가 됐습니다.\n제안서에 넣을 상품을 장바구니에서 확정해 주세요.`;
  }
  if (requestedStage === SALES_STAGES.ORDER) {
    return `추천 상품 ${recommendations.length}개의 주문 단계로 이어가겠습니다.\n장바구니에서 수량과 납품 현장을 확인한 뒤 주문해 주세요.`;
  }
  const lines = [
    `조건에 맞는 타일 ${recommendations.length}개를 찾았습니다.`,
    "규격과 마감을 먼저 맞추고 색상·스타일·상품 상태를 비교했습니다.",
    "아래 후보에서 샘플로 확인할 상품을 골라주세요."
  ];
  if (quantityEstimate) {
    lines.push(`${formatNumber(quantityEstimate.areaSqm)}㎡ 기준 로스 ${quantityEstimate.lossRate}%를 포함하면 약 ${formatNumber(quantityEstimate.orderAreaSqm)}㎡가 필요합니다.`);
  } else {
    lines.push("현장 면적을 알려주시면 로스를 포함한 장수와 박스 수까지 계산하겠습니다.");
  }
  return lines.join("\n");
}

function buildInterpretedConditions(intent) {
  const definitions = [
    ["공간", "space"], ["용도", "application"], ["규격", "size"], ["마감", "finish"],
    ["색상", "color"], ["스타일", "style"], ["재질", "material"], ["면적", "areaSqm"]
  ];
  return definitions.flatMap(([label, key]) => {
    const value = intent?.[key];
    if (value === undefined || value === null || value === "") return [];
    return [{ key, label, value: key === "areaSqm" ? `${formatNumber(value)}㎡` : String(value) }];
  });
}

function normalizeRecommendations(entries, limit = 10) {
  const safeLimit = Math.min(30, Math.max(1, Math.round(Number(limit) || 10)));
  return (Array.isArray(entries) ? entries : []).slice(0, safeLimit).map((entry) => ({
    id: String(entry?.id || "").trim().slice(0, 120),
    name: String(entry?.name || "타일 상품").trim().slice(0, 240),
    size: String(entry?.size || "").trim().slice(0, 80),
    finish: String(entry?.finish || "").trim().slice(0, 80),
    color: String(entry?.color || "").trim().slice(0, 80),
    style: String(entry?.style || "").trim().slice(0, 160),
    material: String(entry?.material || "").trim().slice(0, 80),
    application: String(entry?.application || "").trim().slice(0, 80),
    image: String(entry?.image || "").trim().slice(0, 2000),
    sqmPerBox: toPositiveNumber(entry?.sqmPerBox),
    pcsPerBox: toPositiveNumber(entry?.pcsPerBox),
    widthMm: toPositiveNumber(entry?.widthMm),
    heightMm: toPositiveNumber(entry?.heightMm),
    reasons: (Array.isArray(entry?.reasons) ? entry.reasons : []).slice(0, 6).map((value) => String(value).slice(0, 80))
  }));
}

function calculateQuantityEstimate(intent, product) {
  const areaSqm = Number(intent?.areaSqm);
  if (!Number.isFinite(areaSqm) || areaSqm <= 0) return null;
  const lossRate = clampNumber(intent?.lossRate, 0, 50, 10);
  const orderAreaSqm = round(areaSqm * (1 + lossRate / 100), 2);
  const sqmPerBox = toPositiveNumber(product?.sqmPerBox);
  const widthMm = toPositiveNumber(product?.widthMm) || parseSize(intent?.size).widthMm;
  const heightMm = toPositiveNumber(product?.heightMm) || parseSize(intent?.size).heightMm;
  const tileAreaSqm = widthMm && heightMm ? (widthMm * heightMm) / 1_000_000 : 0;
  return {
    areaSqm: round(areaSqm, 2),
    lossRate,
    orderAreaSqm,
    boxCount: sqmPerBox > 0 ? Math.ceil(orderAreaSqm / sqmPerBox) : 0,
    tileCount: tileAreaSqm > 0 ? Math.ceil(orderAreaSqm / tileAreaSqm) : 0
  };
}

function buildSalesActions(query, hasRecommendations, hasArea) {
  const actions = [{ type: "open-product-search", label: "전체 검색 결과", targetPage: "productsPage", query }];
  if (!hasRecommendations) return actions;
  actions.push({ type: "open-page", label: "샘플 신청", targetPage: "samplePage" });
  actions.push({ type: "open-page", label: hasArea ? "물량 다시 계산" : "물량 계산", targetPage: "quantityCalculatorPage" });
  actions.push({ type: "open-page", label: "제안서·견적", targetPage: "proposalPage" });
  actions.push({ type: "open-page", label: "장바구니·주문", targetPage: "cartPage" });
  return actions;
}

function summarizeProject(project) {
  return {
    id: String(project?.id || ""),
    title: String(project?.title || "현장 타일 프로젝트"),
    status: String(project?.status || "상담중"),
    stage: String(project?.stage || SALES_STAGES.DISCOVERY),
    updatedAt: String(project?.updatedAt || ""),
    site: {
      clientName: String(project?.site?.clientName || "").slice(0, 120),
      siteName: String(project?.site?.siteName || "").slice(0, 120),
      siteAddress: String(project?.site?.siteAddress || "").slice(0, 240),
      spaceType: String(project?.site?.spaceType || "").slice(0, 60),
      neededBy: String(project?.site?.neededBy || "").slice(0, 20),
      notes: String(project?.site?.notes || "").slice(0, 1000)
    },
    messages: (Array.isArray(project?.messages) ? project.messages : []).slice(-30).map((entry) => ({
      role: entry?.role === "assistant" ? "assistant" : "user",
      content: String(entry?.content || "").slice(0, 6000)
    })),
    intent: project?.intent || {},
    recommendations: normalizeRecommendations(project?.recommendations),
    selectedProducts: normalizeRecommendations(project?.selectedProducts, 30),
    quantityEstimate: project?.quantityEstimate || null
  };
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
    return "말씀하신 조건을 기준으로 자재GO 상품 DB에서 후보를 확인할 수 있습니다. 규격과 마감은 우선 조건으로 적용하고, 색상과 스타일이 비슷한 순서로 비교해 보세요. 아래 추천 상품 보기 버튼을 누르면 관련 상품을 바로 검색합니다.";
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

function buildTileProductSearchQueryFromIntent(intent) {
  return [intent?.sizeUnknown ? "" : intent?.size, intent?.application, intent?.finish, intent?.color, intent?.style, intent?.material]
    .filter(Boolean)
    .join(" ")
    .slice(0, 180);
}

function buildTileProductSearchQuery(message) {
  const intent = analyzeTileSalesIntent(message);
  return buildTileProductSearchQueryFromIntent(intent) || "타일";
}

function parseSize(value) {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*[*x×]\s*(\d+(?:\.\d+)?)/i);
  return match ? { widthMm: Number(match[1]), heightMm: Number(match[2]) } : { widthMm: 0, heightMm: 0 };
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function stripTrailingZero(value) {
  return String(Number(value));
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

module.exports = {
  SALES_STAGES,
  TILE_ASSISTANT_SYSTEM_PROMPT,
  analyzeTileSalesIntent,
  buildTileProductRecommendationActions,
  calculateQuantityEstimate,
  createTileAssistantService,
  getMissingTileConditions,
  summarizeProject
};
