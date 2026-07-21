const TILE_KINDS = ["바닥 타일", "벽 타일", "타일"];
const TILE_DIRECT_KIND_OPTIONS = [
  "중국바닥타일",
  "국산바닥타일",
  "유럽바닥타일",
  "아시아바닥타일",
  "중국벽",
  "국산벽",
  "유럽벽",
  "아시아벽",
  "계단타일",
  "스톤",
  "벽돌",
  "모자이크",
  "복합대리석",
  "기타수입벽",
  "기타수입바닥",
  "빅슬랩",
  "석재타일",
  "외장타일",
  "쪽타일",
  "우드타일"
];
const TILE_DIRECT_KIND_OPTION_SET = new Set(TILE_DIRECT_KIND_OPTIONS);
const TILE_SIZES = ["600*600", "300*600", "600*1200", "300*300", "200*200", "100*300", "800*800", "400*800", "100*100", "150*600"];
const TILE_STYLE_OPTIONS = [
  "마블",
  "스톤",
  "시멘트",
  "트래버틴",
  "라임스톤",
  "슬레이트",
  "콘크리트",
  "테라조",
  "우드",
  "솔리드",
  "패턴",
  "데코",
  "브릭",
  "서브웨이",
  "모자이크",
  "육각",
  "라인",
  "입체",
  "핸드메이드",
  "메탈",
  "글라스"
];
const TILE_STYLE_OPTION_SET = new Set(TILE_STYLE_OPTIONS);
const TILE_FINDER_COLOR_OPTIONS = ["화이트", "아이보리", "베이지", "브라운", "그레이", "차콜", "블랙", "그린", "블루", "핑크", "레드", "옐로우", "테라코타", "멀티"];
const TILE_FINDER_PATTERN_PRESENCE_OPTIONS = ["있음", "없음"];
const TILE_FINDER_FINISH_OPTIONS = ["무광", "유광"];
const SANITARY_KINDS = ["양변기", "비데", "소변기", "세면기", "욕조", "위생도기"];
const FAUCET_KINDS = ["수전 금구", "세면수전", "샤워수전", "주방수전", "해바라기샤워"];
const ACCESSORY_KINDS = ["악세사리", "욕실장", "거울", "수건걸이", "휴지걸이", "선반", "유가"];
const MATERIAL_KINDS = ["부자재"];
const PRODUCT_TYPE_LABELS = {
  tile: "타일",
  sanitary: "위생도기",
  faucet: "수전금구",
  accessory: "악세사리",
  material: "부자재"
};
const PLANNER_THREE_URL = "https://unpkg.com/three@0.164.1/build/three.module.js";
const PLANNER_PLAN_DESKTOP_WIDTH = 960;

const DEFAULT_APPROVAL_RULES = {
  businessTypes: [
    "인테리어",
    "타일",
    "건축",
    "건설",
    "종합건설업",
    "전문건설업",
    "건물건설업",
    "건설장비운영업",
    "인테리어디자인업",
    "인테리어시공업",
    "리모델링공사업",
    "건축자재도매업",
    "건축자재소매업",
    "타일도매업",
    "타일소매업",
    "위생도기도매업",
    "위생도기소매업",
    "욕실용품도매업",
    "욕실용품소매업",
    "수전도매업",
    "수전소매업",
    "샤워기및욕실설비도매업",
    "샤워기및욕실설비소매업",
    "전자상거래소매업",
    "통신판매업"
  ],
  businessItems: [
    "종합건설업",
    "전문건설업",
    "실내건축공사업",
    "건물건설업",
    "주거용건물건설업",
    "비주거용건물건설업",
    "건축공사업",
    "토목공사업",
    "조경공사업",
    "시설물유지관리업",
    "건설장비운영업",
    "인테리어디자인업",
    "실내인테리어공사업",
    "인테리어시공업",
    "상업공간인테리어업",
    "주거공간인테리어업",
    "인테리어설계및시공업",
    "리모델링공사업",
    "타일및방수공사업",
    "도장및도배공사업",
    "미장타일방수공사업",
    "유리및창호공사업",
    "금속구조물창호온실공사업",
    "전기공사업",
    "설비공사업",
    "배관및냉난방공사업",
    "건축자재도매업",
    "건축자재소매업",
    "타일도매업",
    "타일소매업",
    "위생도기도매업",
    "위생도기소매업",
    "욕실용품도매업",
    "욕실용품소매업",
    "수전도매업",
    "수전소매업",
    "샤워기및욕실설비도매업",
    "샤워기및욕실설비소매업",
    "전자상거래소매업",
    "통신판매업"
  ]
};
const DEFAULT_APPROVAL_RULES_VERSION = "2026-04-24-approved-industries";
const ADMIN_ONLY_PAGE_IDS = new Set(["proposalPage", "dbPage", "adminPage", "tile114TestPage"]);
const IMAGE_SEARCH_RESULTS_PAGE_SIZE = 20;
const TILE_FINDER_RESULTS_PAGE_SIZE = 10;
const ADMIN_PRODUCT_TABLE_LIMIT = 300;
const UNKNOWN_TILE_SIZE_VALUE = "__unknown__";
const CUSTOM_TILE_SIZE_VALUE = "__custom__";
const PUBLIC_STOCK_EXCLUDE_THRESHOLD_QTY = 50;
const PUBLIC_EXPOSE_ALL_STOCK_PRODUCTS = true;
const STOCK_INQUIRY_THRESHOLD_QTY = 100;

const money = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0
});

const shortDate = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

let products = [];
let productCurrentPage = 1;
let productPageTransitioning = false;
let productPageCacheVersion = 0;
let productPageStateCache = null;
let productPageWarmupTimer = null;
const productSearchTextCache = new WeakMap();
const productImagePreloadCache = new Set();
let normalizedTaxonomyProducts = [];
let storedNormalizedTaxonomyProducts = [];
let normalizedTaxonomySourceKey = "";
let normalizedTaxonomyProductById = new Map();
let taxonomyLastSearchRaw = "";
let taxonomyDisabledIntentKeys = new Set();
let taxonomyResultFacetFilters = {};
let taxonomyCurrentPage = 1;
let taxonomySortMode = "match";
const TAXONOMY_PAGE_SIZE = 10;
const VISIBLE_TAXONOMY_RESULT_FACET_KEYS = new Set(["mainColor", "finishGroup", "sizeLabel", "styleCategories"]);
let tileFinderImageDataUrl = "";
let tileFinderImageFileName = "";
let tileFinderEditableAnalysis = createEmptyTileFinderEditableAnalysis();
let taxonomyImageSearchDataUrl = "";
let taxonomyImageSearchFileName = "";
let tileFinderMatches = [];
let tileFinderResultsPage = 1;
let tileFinderResultFilters = createEmptyTileFinderResultFilters();
let taxonomyImageMatches = [];
let taxonomyImageResultsPage = 1;
let suppressImageSearchClickUntil = 0;
let cart = loadCart();
let remoteOrders = [];
let proposalProductSelectionIds = new Set();
let proposalRenderSelectionIds = new Set();
let proposalSelectionsInitialized = false;
let knownProposalCartIds = new Set();
let selectedProductId = "";
let selectedDetailProduct = null;
let selectedRenderCartId = "";
let selectedRenderTileId = "";
let activeRenderSurfacePicker = "";
let renderSurfaceSelections = {
  wall: { tileId: "" },
  floor: { tileId: "" },
  point: { tileId: "" }
};
let pendingRenderResultImage = "";
let pendingSiteImage = "";
let renderJobRunning = false;
let renderCompareSliderValue = 50;
let lastRenderFeedbackCode = "";
const renderImageDataUrlCache = new Map();
let pendingPlannerSiteImage = "";
let pendingPlannerRealRenderImage = "";
let pendingPlannerPhotoPreviewImage = "";
let pendingPlannerPanoramaImage = "";
let pendingPlannerPanoramaSource = "";
let plannerPanoramaTexture = null;
let plannerRealRenderRunning = false;
let plannerRealRenderStartedAt = 0;
let plannerRealRenderProgressTimer = null;
let plannerSurfaceGuideMode = "floor";
let plannerSurfaceRegions = { floor: [], wall: [] };

const RENDER_ROOM_TYPES = {
  auto: "자동 분석",
  bathroom: "욕실 / 화장실",
  living: "거실",
  kitchen: "주방",
  exterior: "외벽 / 외부",
  commercial: "상업공간"
};

const RENDER_INTERIOR_STYLES = {
  "natural-modern": "내추럴 모던",
  "mid-century": "미드센추리",
  minimal: "미니멀",
  hotel: "호텔식",
  "warm-premium": "웜톤 고급",
  industrial: "인더스트리얼",
  nordic: "북유럽",
  zen: "재패니즈 / 젠",
  classic: "클래식"
};

const RENDER_FEEDBACK_OPTIONS = {
  good: "좋음",
  graphic: "그래픽 같음",
  tile_mismatch: "타일 다름",
  grout_issue: "줄눈 이상",
  room_changed: "공간 바뀜",
  color_issue: "색감 이상",
  regenerate: "다시 생성 필요"
};
let pendingPlannerPlanImage = "";
let plannerPlanPoints = [];
let plannerRenderTimer = null;
let plannerPhotoPreviewTimer = null;
let plannerPanoramaTimer = null;
let plannerPanoramaYaw = 0.5;
let plannerPanoramaPitch = 0;
let plannerPanoramaDrag = null;
let plannerThreeModulePromise = null;
let plannerThreeState = {
  renderer: null,
  scene: null,
  camera: null,
  animationId: 0,
  angle: 0,
  elevation: 0.55,
  zoom: 0.88,
  drag: null,
  pointers: new Map(),
  pinch: null
};
let pendingSignupAuthCode = "";
let isPhoneVerified = false;
let selectedSignupProvider = "일반 회원가입";
let socialSignupProfile = null;
let authUser = loadAuthSession();
let businessVerification = { status: "idle", message: "사업자등록번호를 입력하거나 등록증을 첨부하면 확인할 수 있습니다." };
let tesseractLoaderPromise = null;
let extractedBusinessInfo = {
  companyName: "",
  businessAddress: "",
  representative: "",
  openingDate: "",
  businessType: "",
  businessItem: "",
  businessCategorySection: "",
  approvalStatus: "판정 전"
};
let approvalRules = loadApprovalRules();
let currentPageId = document.querySelector(".app-page.active")?.id || "homePage";
const CUSTOMER_PAGE_IDS = new Set(["homePage", "productsPage", "aiTileFinderPage", "taxonomyTestPage", "productDetailPage", "cartPage", "myPage", "renderPage", "plannerPage", "samplePage"]);
const pageHistory = [];
const pageScrollPositions = new Map([[currentPageId, 0]]);
let productListReturnState = { scrollY: 0, productId: "", viewportTop: 0 };
let suppressHistoryState = false;
let serverConnection = { online: false, checked: false, failures: 0 };
let serverConnectionTimer = null;
let businessScanRequestId = 0;
let cartSyncTimer = null;
let productsLoadedFromRemote = false;
const productForm = document.querySelector("#productForm");
const proposalForm = document.querySelector("#proposalForm");
const signupForm = document.querySelector("#signupForm");
const loginForm = document.querySelector("#loginForm");
const adminLoginForm = document.querySelector("#adminLoginForm");
let adminOverview = null;
let currentAdminView = "operations";
let adminProductsHydrated = false;
let adminLaunchRenderedTasks = new Map();
const LAUNCH_PLAN_START_DATE = "2026-07-15";
const LAUNCH_PLAN_TARGET_DATE = "2026-08-31";
const LAUNCH_PLAN_PHASES = [
  {
    id: "db-structure",
    start: "2026-07-15",
    end: "2026-07-21",
    title: "DB 수동 정리",
    goal: "상품 DB는 대표자가 수동으로 1차 정리한 뒤 반영합니다.",
    skipped: true,
    tasks: [
      { id: "category-map", label: "대분류 기준 확정", detail: "타일·위생도기·수전금구·욕실장·악세사리·부자재 분리", view: "quality" },
      { id: "tile-fields", label: "타일 필수값 점검", detail: "규격·재질·마감·색상·스타일 미확인 상품 정리", view: "quality" },
      { id: "open-sku", label: "오픈 상품군 선정", detail: "정확도 높은 상품부터 우선 노출할 후보를 추립니다.", view: "products" }
    ]
  },
  {
    id: "auth-pricing",
    start: "2026-07-15",
    end: "2026-07-28",
    title: "회원·가격·보안 정리",
    goal: "간편가입, 사업자 인증, 등급별 가격 공개 흐름을 검증합니다.",
    tasks: [
      { id: "oauth-flow", label: "간편가입 검증", detail: "구글·카카오 로그인 후 로그인 상태 전환을 확인", view: "orders" },
      { id: "business-approval", label: "사업자 승인 흐름 점검", detail: "사업자등록증·명함 업로드 후 등급 반영 확인", view: "orders" },
      { id: "admin-price-hide", label: "권한별 가격 노출 확인", detail: "고객은 원가·브랜드 비노출, 관리자는 내부 정보 확인", view: "products" }
    ]
  },
  {
    id: "search-order",
    start: "2026-07-29",
    end: "2026-08-04",
    title: "검색·상품·장바구니 고도화",
    goal: "자연어·이미지·필터 검색과 장바구니 주문 흐름을 오픈 수준으로 맞춥니다.",
    tasks: [
      { id: "natural-search", label: "자연어 검색 테스트", detail: "현장 표현으로 검색해 조건 칩과 결과 정렬 검수", view: "products" },
      { id: "image-search", label: "이미지 검색 테스트", detail: "규격·마감 절대조건과 이미지 유사도 결과 확인", view: "searchTraining" },
      { id: "cart-proposal", label: "장바구니·제안서 점검", detail: "수량·박스 계산·제안서 다운로드 흐름 확인", view: "orders" }
    ]
  },
  {
    id: "internal-beta",
    start: "2026-08-05",
    end: "2026-08-11",
    title: "내부 베타",
    goal: "실제 운영자가 매일 주문·검색·DB 품질 업무를 반복 테스트합니다.",
    tasks: [
      { id: "daily-order-drill", label: "주문 처리 리허설", detail: "가입 승인부터 장바구니 주문 접수까지 끝까지 처리", view: "orders" },
      { id: "quality-drill", label: "품질 대시보드 처리", detail: "고위험 누락값을 우선 수정하고 재검색 확인", view: "quality" },
      { id: "search-feedback", label: "검색 학습 피드백", detail: "6장 훈련 방식으로 색상·스타일 판단 데이터 축적", view: "searchTraining" }
    ]
  },
  {
    id: "limited-open",
    start: "2026-08-12",
    end: "2026-08-18",
    title: "제한 오픈",
    goal: "소수 거래처에게 공개하고 실제 문의·주문 데이터를 받습니다.",
    tasks: [
      { id: "invite-members", label: "초기 거래처 초대", detail: "인증 사업자 회원 가입과 가격 공개를 확인", view: "orders" },
      { id: "real-search-log", label: "실사용 검색어 기록", detail: "못 찾은 검색어와 대체 추천 실패 사례를 모읍니다.", view: "searchTraining" },
      { id: "support-response", label: "상담 응대 기준 정리", detail: "재고 문의·대체품·납기 안내 템플릿을 점검", view: "orders" }
    ]
  },
  {
    id: "final-open",
    start: "2026-08-19",
    end: "2026-08-31",
    title: "최종 오픈 준비",
    goal: "공지·운영·장애 대응 기준을 갖추고 8월 오픈 상태로 마감합니다.",
    tasks: [
      { id: "release-check", label: "릴리즈 체크", detail: "로컬·온라인 기능 차이, 로그인, 검색, 주문 흐름 점검", view: "quality" },
      { id: "marketing-ready", label: "홍보 준비", detail: "초기 안내문, 거래처 초대 메시지, 서비스 소개 정리", view: "products" },
      { id: "ops-handbook", label: "운영 매뉴얼 정리", detail: "매일 처리할 관리자 업무와 예외 대응 기준 문서화", view: "orders" }
    ]
  }
];
let searchTrainingCurrentSample = null;
let searchTrainingHistory = [];
let searchTrainingHistoryIndex = -1;
let searchTrainingStats = { total: 0, agreeCount: 0, correctedCount: 0, latest: [] };
let searchTrainingVisitedIds = new Set();
let searchTrainingCandidatesCache = { key: "", items: [] };
let searchTrainingPreparedNextSample = null;
let searchTrainingPrefetchImage = null;
let searchTrainingBatchSamples = [];
let searchTrainingBatchSelectedIds = new Set();
let searchTrainingBatchVisitedIds = new Set();
let searchTrainingBatchQuestion = { type: "style", label: "스톤" };
const SEARCH_TRAINING_BATCH_SIZE = 6;
const SEARCH_TRAINING_COLOR_OPTIONS = [
  "화이트", "아이보리 / 크림", "베이지", "브라운", "그레이", "차콜 / 다크그레이",
  "블랙", "그린", "블루", "핑크", "레드", "옐로우", "테라코타 / 오렌지", "멀티컬러", "메탈릭", "색상 미확인"
];
const SEARCH_TRAINING_STYLE_BATCH_OPTIONS = [
  "스톤", "마블", "시멘트", "솔리드", "트래버틴", "테라조", "우드", "브릭", "모자이크",
  "패턴", "핸드메이드", "입체 / 텍스처", "메탈", "글라스", "기타"
];
const SEARCH_TRAINING_FINISH_OPTIONS = [
  "유광", "무광", "반무광", "폴리싱", "논슬립", "혼드", "내추럴", "엠보", "3D", "텍스쳐", "마감 미확인"
];
const SEARCH_TRAINING_MATERIAL_OPTIONS = [
  "포세린", "자기질", "도기질", "세라믹", "석재 타일", "복합대리석", "시멘트 타일", "메탈", "천연석", "유리", "재질 미확인"
];
const DEFAULT_PROPOSAL_PPT_STATUS = "템플릿을 고르고 상품과 보정 이미지를 선택한 뒤 최종 제안서를 생성하세요.";
const PROPOSAL_TEMPLATE_PREVIEWS = {
  "beige-black": {
    label: "Style A",
    title: "Beige & Black Simple Clean",
    headline: "Minimal Proposal",
    summary: "A restrained beige-and-black cover with clean product pages and a tidy rendering showcase.",
    meta: ["Minimal cover", "Calm stone tone", "Clean product grid", "Neat closing slide"]
  },
  "beige-red": {
    label: "Style B",
    title: "Beige Red Modern Creative",
    headline: "Creative Brief",
    summary: "A more editorial deck with stronger typography, warmer contrast, and a bolder proposal rhythm.",
    meta: ["Bold title page", "Warm accent tone", "Editorial layout", "Stronger visual emphasis"]
  },
  "beige-brown": {
    label: "Style C",
    title: "Beige Brown Neutral Modern",
    headline: "Warm Neutral",
    summary: "A softer, space-led presentation with warm neutrals that suits premium interior proposals.",
    meta: ["Warm neutral cover", "Balanced layout", "Interior-focused flow", "Premium closing tone"]
  }
};

async function init() {
  const socialRedirect = readSocialAuthRedirect();
  applyInitialPageFromHash();
  history.replaceState({ pageId: currentPageId }, "", `#${currentPageId}`);
  syncExperienceMode(currentPageId);
  bindEvents();
  setupDbForm();
  syncDefaultApprovalRules();
  renderApprovalRules();
  await loadProducts();
  await hydrateApprovalRulesFromServer();
  await refreshServerConnection();
  startServerConnectionWatcher();
  await hydrateCartFromServer();
  await hydrateOrdersFromServer();
  renderAll();
  if (currentPageId === "adminPage") {
    loadAdminOverview();
  }
  if (socialRedirect) await completeSocialAuthRedirect(socialRedirect);
  if (currentPageId === "proposalPage") {
    resetProposalPptState();
  }
  renderAuthControls();
}

function syncExperienceMode(pageId = currentPageId) {
  const isCustomerPage = CUSTOMER_PAGE_IDS.has(pageId);
  document.body.classList.toggle("customer-experience-mode", isCustomerPage);
  document.body.classList.toggle("admin-experience-mode", !isCustomerPage);
  document.body.dataset.page = pageId;
  syncTopbarControls(pageId);
}

function syncTopbarControls(pageId = currentPageId) {
  const printButton = document.querySelector("#printBtn");
  if (!printButton) return;
  printButton.classList.toggle("hidden", pageId !== "proposalPage");
}

function bindEvents() {
  document.querySelectorAll("[data-page-target]").forEach((button) => {
    button.addEventListener("click", () => {
      switchPage(button.dataset.pageTarget);
    });
  });

  document.querySelectorAll("[data-back-action]").forEach((button) => {
    button.addEventListener("click", goBackPage);
  });

  document.querySelectorAll("[data-main-category]").forEach((button) => {
    button.addEventListener("click", () => {
      openProductCategory(button.dataset.mainCategory);
    });
  });

  ["#mainCategoryFilter", "#productBrandFilter", "#sizeFilter", "#optionFilter", "#patternCategoryFilter", "#finishFilter", "#colorFilter", "#productSearch"].forEach((selector) => {
    const control = document.querySelector(selector);
    if (!control) return;
    control.addEventListener("input", () => {
      if (selector === "#mainCategoryFilter") syncProductFilters({ resetSubFilters: true });
      if (selector === "#productBrandFilter" || selector === "#optionFilter" || selector === "#patternCategoryFilter") syncProductFilters();
      productCurrentPage = 1;
      renderProducts();
    });
  });

  document.querySelector("#productPageSize")?.addEventListener("change", () => {
    productCurrentPage = 1;
    renderProducts();
  });
  document.querySelector("#productExpertGuide")?.addEventListener("click", handleExpertSearchSuggestionClick);

  ["#taxonomyAudienceMode", "#taxonomyAxisFilter", "#taxonomyBrandFilter", "#taxonomyOriginFilter", "#taxonomyApplicationFilter", "#taxonomyColorFilter", "#taxonomyStyleFilter", "#taxonomyFinishFilter", "#taxonomySizeFilter", "#taxonomyPriceFilter", "#taxonomyStockFilter"].forEach((selector) => {
    document.querySelector(selector)?.addEventListener("input", () => {
      taxonomyCurrentPage = 1;
      syncTaxonomyFilters();
      renderTaxonomyTestPage();
    });
  });
  document.querySelector("#taxonomySortMode")?.addEventListener("change", (event) => {
    taxonomySortMode = event.target.value || "match";
    taxonomyCurrentPage = 1;
    renderTaxonomyTestPage();
  });
  document.querySelector("#taxonomySearchBtn")?.addEventListener("click", runTaxonomySearch);
  document.querySelector("#taxonomySearch")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    runTaxonomySearch();
  });
  document.querySelector("#taxonomyAssistSizeBtn")?.addEventListener("click", () => {
    toggleTaxonomyAssistSizePanel();
  });
  document.querySelector("#taxonomyAssistSizePanel")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-taxonomy-assist-size]");
    if (!button) return;
    setTaxonomyAssistSize(button.dataset.taxonomyAssistSize || "");
  });
  document.querySelector("#taxonomyAssistFinishGroup")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-taxonomy-assist-finish]");
    if (!button) return;
    setTaxonomyAssistFinish(button.dataset.taxonomyAssistFinish || "all");
  });
  document.querySelector("#taxonomyAssistClearBtn")?.addEventListener("click", () => {
    setTaxonomyAssistSize("");
    setTaxonomyAssistFinish("all");
    clearTaxonomyImageSearch();
  });
  document.querySelector("#taxonomyImageSearchBtn")?.addEventListener("click", () => {
    document.querySelector("#taxonomyImageSearchFile")?.click();
  });
  document.querySelector("#taxonomyImageSearchFile")?.addEventListener("change", handleTaxonomyImageSearchFileChange);
  document.querySelector("#taxonomyImageResults")?.addEventListener("click", (event) => {
    if (shouldSuppressImageSearchClick()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const pageButton = event.target.closest("[data-taxonomy-image-page]");
    if (pageButton) {
      taxonomyImageResultsPage = Number(pageButton.dataset.taxonomyImagePage) || 1;
      renderTaxonomyImageResults(taxonomyImageMatches, { preservePage: true });
      document.querySelector("#taxonomyImageResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const addButton = event.target.closest("[data-add-product]");
    if (addButton) {
      addToCart(addButton.dataset.addProduct);
      return;
    }
    const viewButton = event.target.closest("[data-view-product]");
    if (viewButton) openProductDetail(viewButton.dataset.viewProduct, viewButton);
  });
  document.querySelector("#taxonomyIntentChips")?.addEventListener("click", (event) => {
    const resetButton = event.target.closest("[data-taxonomy-reset-facets]");
    if (resetButton) {
      taxonomyResultFacetFilters = {};
      taxonomyCurrentPage = 1;
      renderTaxonomyTestPage();
      return;
    }
    const button = event.target.closest("[data-taxonomy-facet-key]");
    if (!button) return;
    toggleTaxonomyResultFacet(button.dataset.taxonomyFacetKey || "", button.dataset.taxonomyFacetValue || "");
    taxonomyCurrentPage = 1;
    renderTaxonomyTestPage();
  });

  document.querySelector("#taxonomyPagination")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-taxonomy-page]");
    if (!button || button.disabled) return;
    taxonomyCurrentPage = Number(button.dataset.taxonomyPage) || 1;
    renderTaxonomyTestPage();
    document.querySelector("#taxonomyCollectionList")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#productPagination")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-page]");
    if (!button || button.disabled) return;
    goToProductPage(Number(button.dataset.productPage) || 1, { animate: true });
  });

  setupProductPageSwipe();

  document.querySelector("#tileFinderBtn")?.addEventListener("click", () => {
    document.querySelector("#tileFinderFile")?.click();
  });
  document.querySelector("#tileFinderSearchBtn")?.addEventListener("click", handleTileFinderSearch);
  document.querySelector("#tileFinderFile")?.addEventListener("change", handleTileFinderFileChange);
  document.querySelector("#tileFinderSize")?.addEventListener("change", syncTileFinderCustomSizeInput);
  document.querySelector("#tileFinderSizeCustom")?.addEventListener("input", () => {
    const status = document.querySelector("#tileFinderStatus");
    if (status && document.querySelector("#tileFinderSize")?.value === CUSTOM_TILE_SIZE_VALUE) {
      status.textContent = "직접입력 사이즈 예: 600*600, 300x600 처럼 가로x세로로 입력하세요.";
    }
  });
  document.querySelector("#tileFinderBrand")?.addEventListener("change", () => {
    if (!isAdminUser() || !tileFinderMatches.length) return;
    tileFinderResultsPage = 1;
    renderTileFinderResults(tileFinderMatches);
  });
  document.querySelector("#tileFinderResults")?.addEventListener("click", (event) => {
    if (shouldSuppressImageSearchClick()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const pageButton = event.target.closest("[data-tile-finder-page]");
    if (pageButton) {
      tileFinderResultsPage = Number(pageButton.dataset.tileFinderPage) || 1;
      renderTileFinderResults(tileFinderMatches, { preservePage: true });
      document.querySelector("#tileFinderResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const addButton = event.target.closest("[data-add-product]");
    if (addButton) {
      addToCart(addButton.dataset.addProduct);
      return;
    }
    const detailButton = event.target.closest("[data-view-product]");
    if (detailButton) openProductDetail(detailButton.dataset.viewProduct, detailButton);
  });
  document.querySelector("#tileFinderResultFilters")?.addEventListener("click", handleTileFinderResultFilterClick);
  document.querySelector("#tileFinderResultFilters")?.addEventListener("change", handleTileFinderResultFilterChange);
  document.querySelector("#tileFinderAnalysisPanel")?.addEventListener("click", handleTileFinderAnalysisPanelClick);
  bindImageSearchSwipeNavigation("#taxonomyImageResults", "taxonomy");
  bindImageSearchSwipeNavigation("#tileFinderResults", "tileFinder");

  document.querySelector("#productList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-product]");
    if (button) {
      addToCart(button.dataset.addProduct);
      return;
    }

    const productCard = event.target.closest("[data-view-product]");
    if (productCard) openProductDetail(productCard.dataset.viewProduct, productCard);
  });

  document.querySelector("#productList").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("[data-add-product]")) return;
    const productCard = event.target.closest("[data-view-product]");
    if (!productCard) return;
    event.preventDefault();
    openProductDetail(productCard.dataset.viewProduct, productCard);
  });

  document.querySelector("#productDetailPage")?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-preview-image]");
    if (!trigger) return;
    openImageSourcePreview(trigger.dataset.previewImage, trigger.dataset.previewTitle || "제품 이미지 확대");
  });

  document.querySelector("#taxonomyCollectionList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view-product]");
    if (button) openProductDetail(button.dataset.viewProduct, button);
  });

  const cartList = document.querySelector("#cartList");
  cartList.addEventListener("input", (event) => {
    const qtyInput = event.target.closest("[data-cart-qty]");
    const sqmInput = event.target.closest("[data-cart-sqm]");
    const pieceInput = event.target.closest("[data-cart-pieces]");
    const quoteInput = event.target.closest("[data-cart-price]");
    if (qtyInput && qtyInput.value !== "") updateCartLine(qtyInput.dataset.cartQty, { qty: Number(qtyInput.value) }, { rerenderList: false, removeEmpty: false });
    if (sqmInput && sqmInput.value !== "") updateCartLineFromTileMeasure(sqmInput.dataset.cartSqm, "sqm", Number(sqmInput.value), { rerenderList: false, removeEmpty: false });
    if (pieceInput && pieceInput.value !== "") updateCartLineFromTileMeasure(pieceInput.dataset.cartPieces, "pieces", Number(pieceInput.value), { rerenderList: false, removeEmpty: false });
    if (quoteInput && quoteInput.value !== "") updateCartLine(quoteInput.dataset.cartPrice, { quotePrice: Number(quoteInput.value) }, { rerenderList: false, removeEmpty: false });
  });

  cartList.addEventListener("change", (event) => {
    const qtyInput = event.target.closest("[data-cart-qty]");
    const sqmInput = event.target.closest("[data-cart-sqm]");
    const pieceInput = event.target.closest("[data-cart-pieces]");
    const quoteInput = event.target.closest("[data-cart-price]");
    if (qtyInput) updateCartLine(qtyInput.dataset.cartQty, { qty: Number(qtyInput.value) || 0 });
    if (sqmInput) updateCartLineFromTileMeasure(sqmInput.dataset.cartSqm, "sqm", Number(sqmInput.value) || 0);
    if (pieceInput) updateCartLineFromTileMeasure(pieceInput.dataset.cartPieces, "pieces", Number(pieceInput.value) || 0);
    if (quoteInput) updateCartLine(quoteInput.dataset.cartPrice, { quotePrice: Number(quoteInput.value) || 0 });
  });

  cartList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-product]");
    if (button) removeFromCart(button.dataset.removeProduct);
  });

  document.querySelectorAll("[data-doc-tab]").forEach((button) => {
    button.addEventListener("click", () => switchDoc(button.dataset.docTab));
  });

  document.querySelector("#proposalItems").addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-render-product]");
    if (trigger) openRenderForCartItem(trigger.dataset.renderProduct);
  });

  document.querySelector("#proposalProductSelectionList").addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-proposal-product-select]");
    if (!checkbox) return;
    toggleProposalProductSelection(checkbox.dataset.proposalProductSelect, checkbox.checked);
  });

  document.querySelector("#proposalProductSelectionList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-proposal-render-open]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openRenderForCartItem(button.dataset.proposalRenderOpen);
  });

  document.querySelector("#proposalRenderSelectionList").addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-proposal-render-select]");
    if (!checkbox) return;
    toggleProposalRenderSelection(checkbox.dataset.proposalRenderSelect, checkbox.checked);
  });

  document.querySelector("#selectAllProposalProductsBtn").addEventListener("click", selectAllProposalProducts);
  document.querySelector("#clearProposalProductsBtn").addEventListener("click", clearProposalProducts);
  document.querySelector("#selectAllProposalRendersBtn").addEventListener("click", selectAllProposalRenders);
  document.querySelector("#clearProposalRendersBtn").addEventListener("click", clearProposalRenders);
  document.querySelector("#openProposalRenderBtn")?.addEventListener("click", openProposalRenderWorkspace);
  document.querySelector("#renderCartTileList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-render-cart-tile]");
    if (button) selectRenderPrimaryTile(button.dataset.renderCartTile);
  });

  document.querySelector("#renderSiteImage").addEventListener("change", async (event) => {
    pendingSiteImage = await readImageFile(event.target.files[0], 1100, 0.88);
    pendingRenderResultImage = "";
    renderCompareSliderValue = 50;
    lastRenderFeedbackCode = "";
    renderRenderWorkspace();
  });

  document.querySelector("#renderRoomType")?.addEventListener("change", renderRenderWorkspace);
  document.querySelector("#renderInteriorStyle")?.addEventListener("change", renderRenderWorkspace);
  document.querySelector("#renderStyleMemo")?.addEventListener("input", renderRenderWorkspace);

  getRenderSurfaceKeys().forEach((surface) => {
    const selectButton = document.querySelector(`#render${surface.charAt(0).toUpperCase() + surface.slice(1)}TileButton`);
    const clearButton = document.querySelector(`#clearRender${surface.charAt(0).toUpperCase() + surface.slice(1)}TileBtn`);
    selectButton.addEventListener("click", () => openRenderSurfacePicker(surface));
    clearButton.addEventListener("click", () => clearRenderSurfaceTile(surface));
  });

  document.querySelector("#generateRenderBtn").addEventListener("click", generateRenderPreview);
  document.querySelector("#saveRenderResultBtn").addEventListener("click", saveRenderResultToProposal);
  document.querySelector("#openSitePreviewBtn").addEventListener("click", () => openImagePreview("site"));
  document.querySelector("#openRenderPreviewBtn").addEventListener("click", openRenderResultPreview);
  document.querySelector("#renderSitePreview").addEventListener("click", () => openImagePreview("site"));
  document.querySelector("#renderWallTilePreview").addEventListener("click", () => openImagePreview("surface", "wall"));
  document.querySelector("#renderFloorTilePreview").addEventListener("click", () => openImagePreview("surface", "floor"));
  document.querySelector("#renderPointTilePreview").addEventListener("click", () => openImagePreview("surface", "point"));
  document.querySelector("#renderResultPreview").addEventListener("click", (event) => {
    if (event.target.closest("#renderCompareSlider")) return;
    openRenderResultPreview();
  });
  document.querySelector("#renderResultPreview").addEventListener("input", handleRenderCompareSliderInput);
  document.querySelector("#renderFeedbackPanel")?.addEventListener("click", handleRenderFeedbackClick);
  document.querySelector("#closeImagePreviewBtn").addEventListener("click", closeImagePreview);
  document.querySelector("#imagePreviewBackdrop").addEventListener("click", closeImagePreview);
  document.querySelector("#closeTilePickerBtn").addEventListener("click", closeRenderSurfacePicker);
  document.querySelector("#tilePickerBackdrop").addEventListener("click", closeRenderSurfacePicker);
  document.querySelector("#plannerForm")?.addEventListener("input", () => {
    resetPlannerPhotoRenderResults();
    renderPlannerWorkspace();
  });
  document.querySelector("#plannerForm")?.addEventListener("change", () => {
    resetPlannerPhotoRenderResults();
    renderPlannerWorkspace();
  });
  document.querySelector("#plannerSiteImage")?.addEventListener("change", async (event) => {
    pendingPlannerSiteImage = await readImageFile(event.target.files[0], 1400);
    plannerSurfaceRegions = pendingPlannerSiteImage ? createPlannerDefaultSurfaceRegions() : { floor: [], wall: [] };
    pendingPlannerRealRenderImage = "";
    pendingPlannerPhotoPreviewImage = "";
    if (pendingPlannerSiteImage) {
      autoSelectPlannerCartTiles();
      const tiles = getPlannerCartTiles();
      setText("#plannerStatus", tiles.length
        ? "현장 사진 기준으로 벽/바닥 전체 영역과 장바구니 타일을 자동 적용했습니다."
        : "현장 사진 기준으로 벽/바닥 전체 영역을 자동 선택했습니다. 적용할 타일을 먼저 장바구니에 담아주세요.");
    }
    renderPlannerWorkspace();
  });
  document.querySelector("#plannerPlanImage")?.addEventListener("change", async (event) => {
    if (!isPlannerPlanAvailable()) {
      event.target.value = "";
      setText("#plannerStatus", "도면 적용은 PC 화면에서만 사용할 수 있습니다.");
      return;
    }
    pendingPlannerPlanImage = await readImageFile(event.target.files[0], 1600);
    plannerPlanPoints = [];
    renderPlannerPlanEditor();
    renderPlannerWorkspace();
  });
  document.querySelector("#plannerPlanCanvas")?.addEventListener("click", handlePlannerPlanCanvasClick);
  document.querySelector("#plannerSurfaceGuideCanvas")?.addEventListener("click", handlePlannerSurfaceGuideCanvasClick);
  document.querySelector("#plannerGuideFloorBtn")?.addEventListener("click", () => selectPlannerWholeSurface("floor"));
  document.querySelector("#plannerGuideWallBtn")?.addEventListener("click", () => selectPlannerWholeSurface("wall"));
  document.querySelector("#plannerGuideClearBtn")?.addEventListener("click", () => {
    plannerSurfaceRegions = { floor: [], wall: [] };
    pendingPlannerRealRenderImage = "";
    pendingPlannerPhotoPreviewImage = "";
    setText("#plannerStatus", "실사 시공 영역을 초기화했습니다.");
    renderPlannerWorkspace();
  });
  document.querySelector("#plannerClearPlanBtn")?.addEventListener("click", () => {
    plannerPlanPoints = [];
    renderPlannerPlanEditor();
    renderPlannerWorkspace();
  });
  document.querySelector("#plannerApplyPlanBtn")?.addEventListener("click", () => {
    if (!isPlannerPlanAvailable()) {
      setText("#plannerStatus", "도면 적용은 PC 화면에서만 사용할 수 있습니다.");
      return;
    }
    setText("#plannerStatus", plannerPlanPoints.length >= 3 ? "도면 외곽선을 3D 공간에 적용했습니다." : "도면 외곽 모서리를 3개 이상 찍어주세요.");
    renderPlannerWorkspace();
  });
  document.querySelector("#plannerApplyCartBtn")?.addEventListener("click", applyCartToPlanner);
  document.querySelector("#plannerResetCameraBtn")?.addEventListener("click", () => {
    plannerThreeState.angle = 0;
    plannerThreeState.elevation = 0.55;
    plannerThreeState.zoom = 0.88;
    schedulePlannerRender();
  });
  document.querySelector("#plannerRealRenderBtn")?.addEventListener("click", generatePlannerRealRender);
  document.querySelector("#plannerRealRenderPreview")?.addEventListener("click", openPlannerRealRenderPreview);
  document.querySelector("#plannerPanoramaCanvas")?.addEventListener("pointerdown", startPlannerPanoramaDrag);
  document.addEventListener("pointermove", movePlannerPanoramaDrag);
  document.addEventListener("pointerup", endPlannerPanoramaDrag);
  document.querySelector("#plannerPanoramaCanvas")?.addEventListener("wheel", handlePlannerPanoramaWheel, { passive: false });
  document.querySelectorAll("[data-planner-panorama-view]").forEach((button) => {
    button.addEventListener("click", () => setPlannerPanoramaView(button.dataset.plannerPanoramaView));
  });
  document.querySelector("#backToProductsBtn").addEventListener("click", returnToProductsPage);
  document.querySelector("#detailAddToCartBtn").addEventListener("click", () => {
    if (selectedProductId) addToCart(selectedProductId);
  });
  document.querySelector("#detailEditForm")?.addEventListener("submit", saveDetailProductSpecs);
  document.querySelector("#detailEditResetBtn")?.addEventListener("click", () => {
    if (selectedDetailProduct) fillDetailEditForm(selectedDetailProduct);
  });
  document.querySelector("#sendAuthBtn").addEventListener("click", requestSignupAuth);
  document.querySelector("#verifyAuthBtn").addEventListener("click", verifySignupAuth);
  document.querySelector("#signupPhone").addEventListener("input", resetPhoneVerification);
  document.querySelector("#signupBizFile").addEventListener("change", handleBusinessFileChange);
  document.querySelector("#signupBusinessCardFile")?.addEventListener("change", handleBusinessCardFileChange);
  document.querySelector("#toggleManualBusinessInputBtn")?.addEventListener("click", toggleManualBusinessInput);
  document.querySelector("#signupBizNo").addEventListener("input", () => resetBusinessVerification(false));
  document.querySelector("#scanBusinessFileBtn").addEventListener("click", scanBusinessRegistrationFile);
  document.querySelector("#verifyBusinessBtn").addEventListener("click", verifyBusinessRegistration);
  document.querySelector("#saveApprovalRulesBtn").addEventListener("click", saveApprovalRulesFromForm);
  document.querySelector("#socialBusinessUploadBtn")?.addEventListener("click", focusBusinessCertificateUpload);
  document.querySelector("#googleSignupBtn").addEventListener("click", () => startSocialSignup("Google"));
  document.querySelector("#kakaoSignupBtn").addEventListener("click", () => startSocialSignup("카카오톡"));
  document.querySelector("#openLoginBtn").addEventListener("click", () => switchPage("loginPage"));
  document.querySelector("#openSignupBtn").addEventListener("click", () => switchPage("signupPage"));
  document.querySelector("#createProProposalBtn").addEventListener("click", generateProfessionalProposalDeck);
  document.querySelector("#restartServerBtn")?.addEventListener("click", () => controlServer("restart"));
  document.querySelector("#stopServerBtn")?.addEventListener("click", () => controlServer("stop"));
  document.querySelector("#refreshServerBtn")?.addEventListener("click", async () => {
    setText("#serverControlStatus", "서버 상태를 다시 확인하고 있습니다...");
    const online = await refreshServerConnection();
    setText("#serverControlStatus", online ? "서버가 연결되어 있습니다." : getServerRequiredMessage());
  });
  document.querySelector("#refreshAdminBtn")?.addEventListener("click", loadAdminOverview);
  document.querySelector("#adminOperationsTab")?.addEventListener("click", () => switchAdminView("operations"));
  document.querySelector("#adminProductsTab")?.addEventListener("click", () => switchAdminView("products"));
  document.querySelector("#adminQualityTab")?.addEventListener("click", () => switchAdminView("quality"));
  document.querySelector("#adminSearchTrainingTab")?.addEventListener("click", () => switchAdminView("searchTraining"));
  document.querySelector("#adminOrdersTab")?.addEventListener("click", () => switchAdminView("orders"));
  document.querySelector("#adminLaunchTodoList")?.addEventListener("change", handleAdminLaunchTodoToggle);
  document.querySelector("#adminLaunchTodoList")?.addEventListener("click", handleAdminLaunchExecuteClick);
  document.querySelector("#adminLaunchResetBtn")?.addEventListener("click", resetAdminLaunchTodos);
  document.querySelector("#searchTrainingPrevBtn")?.addEventListener("click", goToPreviousSearchTrainingSample);
  document.querySelector("#searchTrainingNextBtn")?.addEventListener("click", goToNextSearchTrainingSample);
  document.querySelector("#searchTrainingAgreeBtn")?.addEventListener("click", () => saveSearchTrainingFeedback("agree"));
  document.querySelector("#searchTrainingForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSearchTrainingFeedback("corrected");
  });
  document.querySelector("#searchTrainingBatchType")?.addEventListener("change", () => {
    startSearchTrainingBatchQuestion({ keepType: true });
  });
  document.querySelector("#searchTrainingBatchLabel")?.addEventListener("change", renderSearchTrainingBatchPrompt);
  document.querySelector("#searchTrainingBatchLoadBtn")?.addEventListener("click", () => startSearchTrainingBatchQuestion({ keepType: true }));
  document.querySelector("#searchTrainingBatchClearBtn")?.addEventListener("click", clearSearchTrainingBatchSelection);
  document.querySelector("#searchTrainingBatchSaveBtn")?.addEventListener("click", saveSearchTrainingBatchFeedback);
  document.querySelector("#searchTrainingBatchGrid")?.addEventListener("click", handleSearchTrainingBatchGridClick);
  document.addEventListener("keydown", handleSearchTrainingKeyboardShortcuts);
  document.querySelector("#adminPage")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-view-target]");
    if (button) switchAdminView(button.dataset.adminViewTarget);
  });
  document.querySelector("#adminPage")?.addEventListener("click", handleAdminOperationsActionClick);
  document.querySelector("#tile114FetchBtn")?.addEventListener("click", fetchTile114SampleProducts);
  document.querySelector("#startServerGuideBtn")?.addEventListener("click", showServerStartGuide);
  document.querySelector("#saveCurrentOrderBtn")?.addEventListener("click", saveCurrentCartAsPastOrder);
  document.querySelector("#saveClientManagementBtn")?.addEventListener("click", saveClientManagementInfo);
  document.querySelector("#myPage")?.addEventListener("click", (event) => {
    if (event.target.closest("#saveMyContactInfoBtn")) saveMyContactInfo();
  });
  document.querySelector("#myPage")?.addEventListener("click", (event) => {
    const button = event.target.closest(".my-empty-actions [data-page-target]");
    if (button) switchPage(button.dataset.pageTarget);
  });
  document.querySelector("#logoutBtn").addEventListener("click", logoutUser);
  document.querySelector("#googleLoginBtn").addEventListener("click", () => startSocialLogin("Google"));
  document.querySelector("#kakaoLoginBtn").addEventListener("click", () => startSocialLogin("카카오톡"));
  window.addEventListener("popstate", handleBrowserBack);
  window.addEventListener("focus", handleServerReconnectCheck);
  window.addEventListener("resize", handlePlannerViewportChange);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") handleServerReconnectCheck();
  });

  proposalForm.addEventListener("input", renderDocuments);
  productForm.addEventListener("submit", addProductFromForm);
  signupForm.addEventListener("input", renderSignupSummary);
  signupForm.addEventListener("submit", submitSignupForm);
  loginForm.addEventListener("submit", submitLoginForm);
  adminLoginForm?.addEventListener("submit", submitAdminLoginForm);
  document.querySelector("#dbProductType").addEventListener("change", setupDbForm);
  document.querySelector("#resetCartBtn").addEventListener("click", clearCart);
  document.querySelector("#printBtn").addEventListener("click", () => window.print());
}

async function loadProducts() {
  const localProducts = loadLocalProducts();
  const bundledProducts = Array.isArray(window.PRODUCTS_DB) ? window.PRODUCTS_DB : [];
  products = mergeProducts(
    mapProductsForCurrentAudience(bundledProducts),
    mapProductsForCurrentAudience(localProducts)
  );
  productsLoadedFromRemote = false;
  if (currentPageId === "productsPage") {
    syncProductFilters();
    renderProducts();
  }

  try {
    const remoteProducts = await requestJson("/api/products", {}, { retries: 2, timeoutMs: 30000 });
    products = mergeProducts(
      mapProductsForCurrentAudience(remoteProducts),
      mapProductsForCurrentAudience(localProducts)
    );
    serverConnection = { online: true, checked: true, failures: 0 };
    productsLoadedFromRemote = true;
    if (shouldHydrateAdminProductsForCurrentView()) {
      await hydrateAdminProducts({ render: false });
    }
    await hydrateMemberPricingProducts({ render: false });
    if (["productsPage", "taxonomyTestPage"].includes(currentPageId)) {
      await loadStoredNormalizedTaxonomyProducts();
    }
  } catch (error) {
    console.warn(error);
    serverConnection = { ...serverConnection, online: false, checked: true, failures: (serverConnection.failures || 0) + 1 };
    products = mergeProducts(
      mapProductsForCurrentAudience(bundledProducts),
      mapProductsForCurrentAudience(localProducts)
    );
    if (["productsPage", "taxonomyTestPage"].includes(currentPageId)) {
      await loadStoredNormalizedTaxonomyProducts();
    }
    if (currentPageId === "productsPage") {
      syncProductFilters();
      renderProducts();
    }
    if (!products.length && currentPageId === "productsPage") {
      document.querySelector("#productList").innerHTML = `<div class="empty-state">상품 DB를 불러오지 못했습니다. 서버를 실행하거나 index.html을 다시 열어주세요.</div>`;
    }
    return;
  }

  if (currentPageId === "productsPage") {
    syncProductFilters();
    renderProducts();
  }
}

async function hydrateMemberPricingProducts(options = {}) {
  if (!authUser?.businessNumber || !authUser?.memberToken || authUser?.approvalStatus !== "승인") return false;

  try {
    const payload = await requestJson("/api/member/products", {
      headers: getMemberProductAuthHeaders()
    }, { retries: 1, timeoutMs: 30000 });
    if (!payload?.ok || !Array.isArray(payload.products)) return false;
    const localProducts = loadLocalProducts();
    products = mergeProducts(
      payload.products.map(mapPublicProductForClient),
      mapProductsForCurrentAudience(localProducts)
    );
    authUser = {
      ...authUser,
      approvalStatus: payload.user?.approvalStatus || authUser.approvalStatus,
      pricingAccess: payload.user?.pricingAccess || "approved",
      memberGrade: payload.user?.memberGrade || authUser.memberGrade || "사업자",
      priceTier: payload.user?.priceTier || authUser.priceTier || "wholesale"
    };
    saveAuthSession(authUser);
    syncProductFilters();
    if (options.render) renderAll();
    return true;
  } catch (error) {
    console.warn(error);
    return false;
  }
}

function mapProductsForCurrentAudience(rows) {
  if (!Array.isArray(rows)) return [];
  if (isAdminUser()) return rows;
  return rows
    .filter(isClientVisibleStockProduct)
    .map(mapPublicProductForClient);
}

function isClientVisibleStockProduct(product) {
  if (PUBLIC_EXPOSE_ALL_STOCK_PRODUCTS) return true;
  return Number(product?.stockQty || product?.stock_qty || product?.stock || 0) > PUBLIC_STOCK_EXCLUDE_THRESHOLD_QTY;
}

async function loadStoredNormalizedTaxonomyProducts() {
  try {
    const view = isAdminUser() ? "admin" : "customer";
    const response = await fetch(`/api/local/normalized-taxonomy?view=${encodeURIComponent(view)}&v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("정규화 파일을 불러오지 못했습니다.");
    const payload = await response.json();
    storedNormalizedTaxonomyProducts = Array.isArray(payload) ? payload : [];
    normalizedTaxonomyProducts = [];
    normalizedTaxonomySourceKey = "";
  } catch (error) {
    console.warn(error);
    storedNormalizedTaxonomyProducts = [];
    normalizedTaxonomyProducts = [];
    normalizedTaxonomySourceKey = "";
  }
}

async function ensureProductsReady() {
  const currentMarkup = document.querySelector("#productList")?.innerHTML?.trim() || "";
  const needsReload = !products.length || (!productsLoadedFromRemote && (!currentMarkup || currentMarkup.includes("상품 DB를 불러오지 못했습니다")));
  if (!needsReload) return;

  updateProductListStatus("상품 목록을 다시 불러오는 중입니다.");
  await loadProducts();
  renderProducts();
}

function loadLocalProducts() {
  try {
    return JSON.parse(localStorage.getItem("tbpLocalProducts")) || [];
  } catch {
    return [];
  }
}

function saveLocalProduct(product) {
  const localProducts = loadLocalProducts();
  const index = localProducts.findIndex((item) => item.id === product.id);
  if (index >= 0) localProducts[index] = product;
  else localProducts.push(product);
  localStorage.setItem("tbpLocalProducts", JSON.stringify(localProducts));
}

async function hydrateApprovalRulesFromServer() {
  try {
    const remoteRules = await requestJson("/api/approval-rules", {}, { retries: 1, timeoutMs: 5000 });
    if (Array.isArray(remoteRules.businessTypes) && Array.isArray(remoteRules.businessItems)
      && (remoteRules.businessTypes.length || remoteRules.businessItems.length)) {
      approvalRules = {
        businessTypes: remoteRules.businessTypes.map((item) => normalizeRuleValue(item)),
        businessItems: remoteRules.businessItems.map((item) => normalizeRuleValue(item))
      };
      localStorage.setItem("tbpApprovalRules", JSON.stringify(approvalRules));
      renderApprovalRules();
      extractedBusinessInfo.approvalStatus = evaluateBusinessApprovalStatus();
    }
  } catch (error) {
    console.warn(error);
  }
}

async function hydrateAdminProducts(options = {}) {
  if (!isAdminUser() || !authUser?.adminUsername || !authUser?.adminToken) return false;
  try {
    const payload = await requestJson("/api/admin/products", {
      headers: getAdminAuthHeaders()
    }, { retries: 1, timeoutMs: 30000 });
    if (!payload?.ok || !Array.isArray(payload.products)) return false;
    products = mergeProducts(products, payload.products);
    adminProductsHydrated = true;
    if (currentPageId === "productsPage") syncProductFilters();
    if (options.render) renderAll();
    return true;
  } catch (error) {
    console.warn(error);
    return false;
  }
}

function shouldHydrateAdminProductsForCurrentView() {
  if (!isAdminUser() || !authUser?.adminUsername || !authUser?.adminToken) return false;
  if (currentPageId === "adminPage") return ["products", "quality", "searchTraining"].includes(currentAdminView);
  return currentPageId === "productsPage" || currentPageId === "productDetailPage";
}

async function ensureAdminProductsForView(view) {
  if (!["products", "quality", "searchTraining"].includes(view) || adminProductsHydrated) return;
  if (!isAdminUser() || !authUser?.adminUsername || !authUser?.adminToken) return;
  setText("#adminStatus", "관리자 상품 원가/브랜드 정보를 불러오는 중입니다...");
  const ok = await hydrateAdminProducts({ render: false });
  if (ok) {
    if (view === "products") renderAdminOverview();
    if (view === "quality") renderQualityDashboard();
    if (view === "searchTraining") renderSearchTrainingView();
    setText("#adminStatus", "관리자 상품 원가/브랜드 정보가 반영되었습니다.");
  }
}

async function hydrateCartFromServer(options = {}) {
  if (!authUser?.businessNumber) return;

  try {
    const remoteCart = await requestJson(`/api/cart?businessNumber=${encodeURIComponent(authUser.businessNumber)}`, {
      headers: getMemberProductAuthHeaders()
    }, { retries: 1, timeoutMs: 5000 });
    const remoteItems = Array.isArray(remoteCart.items) ? remoteCart.items : [];
    cart = options.mergeLocal ? mergeCartCollections(remoteItems, cart) : remoteItems;
    saveCartToLocalOnly();
    renderCart();
    renderDocuments();
    if (options.mergeLocal && cart.length) scheduleCartSync();
  } catch (error) {
    console.warn(error);
  }
}

function mergeCartCollections(baseItems, overlayItems) {
  const merged = new Map();
  for (const item of Array.isArray(baseItems) ? baseItems : []) {
    if (item?.id) merged.set(item.id, { ...item });
  }
  for (const item of Array.isArray(overlayItems) ? overlayItems : []) {
    if (!item?.id) continue;
    if (!merged.has(item.id)) {
      merged.set(item.id, { ...item });
      continue;
    }
    const previous = merged.get(item.id);
    merged.set(item.id, {
      ...previous,
      ...item,
      qty: Math.max(Number(previous.qty || 0), Number(item.qty || 0)),
      quotePrice: Number(item.quotePrice ?? previous.quotePrice ?? 0)
    });
  }
  return [...merged.values()];
}

function mergeProducts(baseProducts, localProducts) {
  const merged = new Map();
  for (const product of baseProducts) merged.set(product.id, product);
  for (const product of localProducts) merged.set(product.id, product);
  return [...merged.values()];
}

function compareProductsForDisplay(left, right) {
  const leftHasImage = left?.image ? 1 : 0;
  const rightHasImage = right?.image ? 1 : 0;
  if (leftHasImage !== rightHasImage) return rightHasImage - leftHasImage;

  const leftHasCatalog = left?.catalogSource ? 1 : 0;
  const rightHasCatalog = right?.catalogSource ? 1 : 0;
  if (leftHasCatalog !== rightHasCatalog) return rightHasCatalog - leftHasCatalog;

  const leftKindRank = getKindDisplayRank(left);
  const rightKindRank = getKindDisplayRank(right);
  if (leftKindRank !== rightKindRank) return leftKindRank - rightKindRank;

  const makerOrder = String(left?.maker || "").localeCompare(String(right?.maker || ""), "ko");
  if (makerOrder !== 0) return makerOrder;

  return String(left?.name || "").localeCompare(String(right?.name || ""), "ko", { numeric: true });
}

function getKindDisplayRank(product) {
  const type = String(product?.productType || "");
  const kind = String(product?.kind || "");
  const kinds = type === "tile"
    ? TILE_KINDS
    : type === "sanitary"
      ? SANITARY_KINDS
      : type === "faucet"
        ? FAUCET_KINDS
        : type === "accessory"
          ? ACCESSORY_KINDS
          : MATERIAL_KINDS;
  const index = kinds.indexOf(kind);
  return index >= 0 ? index : kinds.length;
}

function setupDbForm() {
  const type = document.querySelector("#dbProductType").value;
  const kindSelect = document.querySelector("#dbKind");
  const sizeInput = document.querySelector("#dbSize");
  const finishSelect = document.querySelector("#dbFinish");
  const optionInput = document.querySelector("#dbOption");

  const kinds = getKinds(type);
  kindSelect.innerHTML = kinds.map((kind) => `<option value="${escapeHtml(kind)}">${escapeHtml(kind)}</option>`).join("");

  if (type === "tile") {
    sizeInput.placeholder = "예: 600*600";
    finishSelect.disabled = false;
    optionInput.placeholder = "타일 옵션 메모";
  } else {
    sizeInput.placeholder = type === "sanitary"
      ? "예: 원피스, 탑볼, 600mm"
      : type === "faucet"
        ? "예: 원홀, 샤워, 주방"
        : type === "accessory"
          ? "예: 600mm, 코너형, 매립형"
          : "예: 20kg, 25kg, 대형타일 겸용";
    finishSelect.value = "";
    finishSelect.disabled = true;
    optionInput.placeholder = type === "sanitary"
      ? "예: 절수형, 치마형"
      : type === "faucet"
        ? "예: 크롬, 무광 니켈, 샤워겸용"
        : type === "accessory"
          ? "예: 매립형, 코너형, 블랙"
          : "부자재 옵션";
  }
}

function getKinds(type) {
  if (type === "tile") return TILE_KINDS;
  if (type === "sanitary") return SANITARY_KINDS;
  if (type === "faucet") return FAUCET_KINDS;
  if (type === "accessory") return ACCESSORY_KINDS;
  if (type === "material") return MATERIAL_KINDS;
  return [...new Set(products.map((product) => product.kind))];
}

function fillProductFilterSelect(select, values, previousValue = "all", allLabel = "전체", config = {}) {
  if (!select) return "all";
  const normalizedValues = (values || []).map(normalizeDirectProductFilterValue).filter(Boolean);
  const cleanValues = config.preserveOrder ? unique(normalizedValues) : sortDirectProductFilterValues(normalizedValues);
  select.innerHTML = `<option value="all">${escapeHtml(allLabel)}</option>${cleanValues.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  select.value = cleanValues.includes(previousValue) ? previousValue : "all";
  return select.value;
}

function sortDirectProductFilterValues(values) {
  return sortTaxonomyValues(unique((values || []).map(normalizeDirectProductFilterValue).filter(Boolean)));
}

function sortDirectTileStyleValues(values) {
  const cleanValues = unique((values || []).map(normalizeDirectProductFilterValue).filter(Boolean));
  return [
    ...TILE_STYLE_OPTIONS.filter((value) => cleanValues.includes(value)),
    ...sortDirectProductFilterValues(cleanValues.filter((value) => !TILE_STYLE_OPTION_SET.has(value)))
  ];
}

function normalizeDirectProductFilterValue(value) {
  let text = String(value || "").trim();
  if (!text || /미확인/.test(text)) return "";
  text = text
    .replace(/\s+/g, " ")
    .replace(/\s*판매단위[\s\S]*$/i, "")
    .replace(/\s*ea\/box[\s\S]*$/i, "")
    .replace(/\s*pcs\/box[\s\S]*$/i, "")
    .replace(/계열$/g, "")
    .trim();
  if (!text || /미확인/.test(text)) return "";
  if (text === "아이보리") return "아이보리 / 크림";
  if (text === "다크그레이") return "차콜 / 다크그레이";
  if (text === "멀티") return "멀티컬러";
  if (text === "테라코타" || text === "오렌지") return "테라코타 / 오렌지";
  return text;
}

function getProductDirectKindValues(product) {
  if (!product) return [];
  if (product.productType !== "tile") {
    return unique([product.option, product.kind].map(normalizeDirectProductFilterValue).filter(Boolean));
  }

  const item = getNormalizedTaxonomyProductForProduct(product);
  const source = getDirectKindSource(product, item);
  const compact = normalizeDirectKindSource(source);
  const sizeInfo = parseDirectKindSize(product.size || product.name || source);
  const region = getDirectTileRegion(product, item, compact);
  const useGroup = getDirectTileUseGroup(product, item, compact, sizeInfo);
  const values = [];
  const add = (value) => {
    if (TILE_DIRECT_KIND_OPTION_SET.has(value) && !values.includes(value)) values.push(value);
  };

  const isMosaic = /모자이크|모자익|mosaic|정각모자이크|직각모자이크|육각모자이크|팔각모자이크|원형모자이크|랜턴모자이크|다이아모자이크|페니|penny|hexagon|헥사곤/.test(compact)
    || item?.materialCategory === "모자이크";
  const isBigSlab = /빅슬랩|빅슬립|대형슬랩|슬랩|bigslab/.test(compact);
  const isCompositeMarble = /복합대리|인조대리|엔지니어드스톤|engineeredstone/.test(compact);
  const isStoneTile = /석재타일|석재|석재타일/.test(compact) || item?.materialCategory === "석재 타일";
  const isBrick = /벽돌|고벽돌|브릭|brick/.test(compact);
  const isWood = /우드|wood|쪽마루|오크|월넛|티크|나뭇결/.test(compact);
  const isJjokTile = /쪽타일/.test(compact);
  const isExterior = /외장|외부|외벽|exterior|outdoor/.test(compact);
  const isStair = /계단/.test(compact);
  const isStoneLook = /스톤|stone|트라버틴|트래버틴|travertine|현무|산호|오로슬레|슬레이트|알프스톤/.test(compact)
    || (Array.isArray(item?.styleCategories) && item.styleCategories.some((value) => /스톤|트래버틴/.test(String(value || ""))));

  if (useGroup) add(getDirectRegionalTileKind(region, useGroup, compact));
  if (isStair) add("계단타일");
  if (isMosaic) add("모자이크");
  if (isCompositeMarble) add("복합대리석");
  if (isStoneTile) add("석재타일");
  if (isBrick) add("벽돌");
  if (isBigSlab) add("빅슬랩");
  if (isExterior) add("외장타일");
  if (isJjokTile) add("쪽타일");
  if (isWood) add("우드타일");
  if (isStoneLook && !isStoneTile && !isCompositeMarble) add("스톤");

  if (!values.length) {
    const fallbackUse = useGroup || (sizeInfo.width >= 600 && sizeInfo.height >= 600 ? "floor" : "wall");
    add(getDirectRegionalTileKind(region, fallbackUse, compact));
  }
  return values;
}

function getDirectKindSource(product, item = null) {
  return [
    product?.option,
    product?.sourceCategoryName,
    product?.name,
    product?.modelName,
    product?.size,
    product?.material,
    product?.patternCategory,
    product?.finish,
    product?.surface,
    product?.color,
    product?.features,
    product?.countryOfOrigin,
    item?.originRegion,
    item?.originCountry,
    item?.materialCategory,
    item?.patternDetail,
    ...(Array.isArray(item?.applicationCategories) ? item.applicationCategories : []),
    ...(Array.isArray(item?.styleCategories) ? item.styleCategories : []),
    ...(Array.isArray(item?.functionCategories) ? item.functionCategories : [])
  ].filter(Boolean).join(" ");
}

function normalizeDirectKindSource(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[×＊]/g, "*")
    .replace(/포쉐린/g, "포세린")
    .replace(/트라버틴/g, "트래버틴")
    .replace(/모자익/g, "모자이크")
    .replace(/[\s\-_/.,·()\[\]{}]+/g, "");
}

function parseDirectKindSize(value) {
  const normalized = String(value || "").replace(/[×xX＊]/g, "*");
  const match = normalized.match(/(\d{2,4})\s*\*\s*(\d{2,4})/);
  if (!match) return { width: 0, height: 0 };
  const width = Number(match[1]) || 0;
  const height = Number(match[2]) || 0;
  return { width, height };
}

function getDirectTileRegion(product, item, compactSource) {
  const source = normalizeDirectKindSource([
    product?.countryOfOrigin,
    item?.originRegion,
    item?.originCountry,
    product?.option,
    product?.sourceCategoryName,
    product?.name
  ].filter(Boolean).join(" "));
  const text = source || compactSource;
  if (/중국|china|cn/.test(text)) return "중국";
  if (/국산|한국|대한민국|korea|kr/.test(text)) return "국산";
  if (/유럽|이태리|이탈리아|스페인|italy|spain|europe/.test(text)) return "유럽";
  if (/아시아|인도|베트남|말레이|태국|asia|india|vietnam|indonesia/.test(text)) return "아시아";
  return "";
}

function getDirectTileUseGroup(product, item, compactSource, sizeInfo) {
  const material = normalizeDirectKindSource(product?.material || item?.materialCategory || "");
  const wallExplicit = /벽타일|벽용|수입벽|중국벽|국산벽|유럽벽|아시아벽|이누스벽|태영벽|대동벽|케이티벽|walltile/.test(compactSource);
  const floorExplicit = /바닥타일|바닥용|수입바닥|중국바닥|국산바닥|유럽바닥|아시아바닥|이누스바닥|태영바닥|대동바닥|floor|폴리싱/.test(compactSource);
  if (wallExplicit && !floorExplicit) return "wall";
  if (floorExplicit && !wallExplicit) return "floor";
  if (/도기질/.test(material)) return "wall";
  if (/자기질|포세린|폴리싱|석재/.test(material)) return "floor";

  const width = Number(sizeInfo?.width || 0);
  const height = Number(sizeInfo?.height || 0);
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  if (min >= 600 && max >= 600) return "floor";
  if ((min === 300 && max === 600) || (min === 250 && max === 400) || (min === 200 && max === 400) || (min === 150 && max === 400) || (min === 100 && max === 300) || (min === 75 && max === 300)) return "wall";
  if ((min === 300 && max === 300) || (min === 200 && max === 200)) return "floor";
  return "";
}

function getDirectRegionalTileKind(region, useGroup, compactSource = "") {
  const normalizedUse = useGroup === "wall" ? "wall" : "floor";
  if (normalizedUse === "wall") {
    if (region === "중국") return "중국벽";
    if (region === "국산") return "국산벽";
    if (region === "유럽") return "유럽벽";
    if (region === "아시아") return "아시아벽";
    return "기타수입벽";
  }
  if (region === "중국") return "중국바닥타일";
  if (region === "국산") return "국산바닥타일";
  if (region === "유럽") return "유럽바닥타일";
  if (region === "아시아") return "아시아바닥타일";
  if (/수입벽/.test(compactSource)) return "기타수입벽";
  return "기타수입바닥";
}

function getProductDirectTileCategories(product) {
  if (!product || product.productType !== "tile") return [];
  const storedStyle = normalizeDirectProductFilterValue(product.patternCategory);
  if (TILE_STYLE_OPTION_SET.has(storedStyle)) return [storedStyle];

  const item = getNormalizedTaxonomyProductForProduct(product);
  const styleValues = [];
  const addStyle = (value) => {
    if (TILE_STYLE_OPTION_SET.has(value) && !styleValues.includes(value)) styleValues.push(value);
  };
  const normalizedText = normalizeSearchText([
    ...(Array.isArray(item?.functionCategories) ? item.functionCategories : []),
    ...(Array.isArray(item?.applicationCategories) ? item.applicationCategories : []),
    item?.patternDetail,
    product.material,
    product.name,
    product.option,
    product.sourceCategoryName
  ].filter(Boolean).join(" "));

  if (/마블|marble|카라라|칼라카타|calacatta|carrara|비앙코|대리석|베인|네로|판다/.test(normalizedText)) addStyle("마블");
  if (/트래버틴|트라버틴|travertine/.test(normalizedText)) addStyle("트래버틴");
  if (/스톤|stone|라임스톤|슬레이트|현무|알프스톤|자연석|석회석|샌드스톤/.test(normalizedText)) addStyle("스톤");
  if (/시멘트|cement|cem|몰탈|모르타르/.test(normalizedText)) addStyle("시멘트");
  if (/콘크리트|concrete|노출콘크리트|마이크로시멘트/.test(normalizedText)) addStyle("콘크리트");
  if (/테라조|terrazzo|칩|chip|스페클|입자/.test(normalizedText)) addStyle("테라조");
  if (/우드|wood|쪽마루|오크|월넛|티크|나뭇결/.test(normalizedText)) addStyle("우드");
  if (/솔리드|solid|단색|무지|컬러솔리드|컬러\/솔리드|컬러룩/.test(normalizedText)) addStyle("솔리드");
  if (/패턴|pattern|데코|엔카우스틱|체크|플라워|지오메트릭|랜덤패턴|포인트/.test(normalizedText)) addStyle("패턴");
  if (/브릭|벽돌|brick|서브웨이|subway|롱브릭/.test(normalizedText)) addStyle("브릭");
  if (/입체|텍스처|텍스쳐|3d|양각|플루티드|리브드|골지/.test(normalizedText)) addStyle("입체");
  if (/핸드메이드|젤리지|수공예|불규칙엣지|유약흐름/.test(normalizedText)) addStyle("핸드메이드");
  return styleValues;
}

function getProductDirectFinishValues(product) {
  if (!product) return [];
  if (product.productType === "tile") {
    const item = getNormalizedTaxonomyProductForProduct(product);
    const direct = normalizeDirectTaxonomySurface(product.finish || product.surface || "");
    return unique([item?.finishGroup, direct].map(normalizeDirectProductFilterValue).filter(Boolean));
  }
  return unique([product.finish, product.surface].map(normalizeDirectProductFilterValue).filter(Boolean));
}

function getProductDirectColorValues(product) {
  if (!product) return [];
  if (product.productType === "tile") {
    const item = getNormalizedTaxonomyProductForProduct(product);
    const productColor = normalizeDirectProductFilterValue(product.color);
    const normalizedColor = normalizeDirectProductFilterValue(item?.mainColor);
    return unique([productColor || normalizedColor].filter(Boolean));
  }
  return unique([product.color].map(normalizeDirectProductFilterValue).filter(Boolean));
}

function productMatchesDirectFilter(product, selectedValue, valueGetter) {
  if (!selectedValue || selectedValue === "all") return true;
  return valueGetter(product).includes(selectedValue);
}

function productMatchesDirectOptionFilter(product, selectedValue) {
  if (!selectedValue || selectedValue === "all") return true;
  const normalizedSelected = normalizeDirectProductFilterValue(selectedValue);
  if (!normalizedSelected) return true;
  if (product?.productType === "tile") {
    return getProductDirectKindValues(product).includes(normalizedSelected)
      || normalizeDirectProductFilterValue(product.option) === normalizedSelected;
  }
  return unique([product?.option, product?.kind].map(normalizeDirectProductFilterValue).filter(Boolean)).includes(normalizedSelected);
}

function getDirectProductSizeScope(baseProducts, optionValue = "all", patternCategoryValue = "all") {
  return (baseProducts || []).filter((product) => (
    productMatchesDirectOptionFilter(product, optionValue)
      && productMatchesDirectFilter(product, patternCategoryValue, getProductDirectTileCategories)
  ));
}

function isDirectProductSizeLabel(value) {
  const text = normalizeDirectProductFilterValue(value);
  if (!text || /미확인|기타|타일|도기|수전|부자재|악세사리|욕실장|세면|양변|비데/.test(text)) return false;
  return /\d/.test(text);
}

function getDirectProductSizes(baseProducts) {
  const productSizes = unique((baseProducts || [])
    .map((product) => normalizeDirectProductFilterValue(product.size))
    .filter(isDirectProductSizeLabel));
  return [
    ...TILE_SIZES.filter((size) => productSizes.includes(size)),
    ...productSizes.filter((size) => !TILE_SIZES.includes(size))
  ];
}

function getProductDisplayColor(product) {
  return getProductDirectColorValues(product)[0] || product.color || "미확인";
}

function getProductDisplayFinish(product) {
  return getProductDirectFinishValues(product)[0] || product.finish || product.surface || product.option || "미확인";
}

function getProductAdminBrandLabel(product) {
  return [
    product?.catalogSource,
    product?.maker,
    product?.sourceSite
  ].map(normalizeDirectProductFilterValue).find(Boolean) || "";
}

function syncTileFinderBrandFilter() {
  const brandFilter = document.querySelector("#tileFinderBrand");
  if (!brandFilter) return;
  if (!isAdminUser()) {
    brandFilter.innerHTML = `<option value="all">전체 브랜드</option>`;
    brandFilter.value = "all";
    return;
  }
  const previousBrand = isAdminUser() ? brandFilter.value || "all" : "all";
  const brands = sortDirectProductFilterValues(products
    .filter((product) => product.productType === "tile")
    .map(getProductAdminBrandLabel)
    .filter(Boolean));
  fillProductFilterSelect(brandFilter, brands, previousBrand, "전체 브랜드");
}

function syncProductBrandFilter(scopeProducts, previousBrand = "all") {
  const brandFilter = document.querySelector("#productBrandFilter");
  if (!brandFilter) return "all";
  if (!isAdminUser()) {
    brandFilter.innerHTML = `<option value="all">전체</option>`;
    brandFilter.value = "all";
    return "all";
  }
  const brands = sortDirectProductFilterValues(scopeProducts
    .map(getProductAdminBrandLabel)
    .filter(Boolean));
  return fillProductFilterSelect(brandFilter, brands, previousBrand, "전체");
}

function productMatchesAdminBrandFilter(product, selectedBrand) {
  if (!isAdminUser() || !selectedBrand || selectedBrand === "all") return true;
  return getProductAdminBrandLabel(product) === selectedBrand;
}

function syncProductFilters(config = {}) {
  invalidateProductPageCache();
  const type = document.querySelector("#mainCategoryFilter")?.value || "all";
  const kindFilter = document.querySelector("#kindFilter");
  const sizeFilter = document.querySelector("#sizeFilter");
  const brandFilter = document.querySelector("#productBrandFilter");
  const optionFilter = document.querySelector("#optionFilter");
  const tileFeatureFilter = document.querySelector("#tileFeatureFilter");
  const patternCategoryFilter = document.querySelector("#patternCategoryFilter");
  const finishFilter = document.querySelector("#finishFilter");
  const colorFilter = document.querySelector("#colorFilter");
  const previousBrand = config.resetSubFilters ? "all" : brandFilter?.value || "all";
  const previousSize = config.resetSubFilters ? "all" : sizeFilter?.value || "all";
  const previousOption = config.resetSubFilters ? "all" : optionFilter?.value || "all";
  const previousPatternCategory = config.resetSubFilters ? "all" : patternCategoryFilter?.value || "all";
  const previousFinish = config.resetSubFilters ? "all" : finishFilter?.value || "all";
  const previousColor = config.resetSubFilters ? "all" : colorFilter?.value || "all";
  if (config.resetSubFilters && tileFeatureFilter) tileFeatureFilter.value = "all";

  const filteredByType = type === "all" ? products : products.filter((product) => product.productType === type);
  const selectedBrand = syncProductBrandFilter(filteredByType, previousBrand);
  const filteredByBrand = filteredByType.filter((product) => productMatchesAdminBrandFilter(product, selectedBrand));
  if (kindFilter) {
    kindFilter.innerHTML = `<option value="all">전체</option>`;
    kindFilter.value = "all";
  }

  const nonTileOptions = sortDirectProductFilterValues(filteredByBrand
    .filter((product) => product.productType !== "tile")
    .flatMap((product) => [product.option, product.kind])
    .filter(Boolean));
  const rawOptions = sortDirectProductFilterValues(filteredByBrand.map((product) => product.option).filter(Boolean));
  const preserveOptionOrder = type === "tile" || type === "all";
  const options = type === "tile"
    ? TILE_DIRECT_KIND_OPTIONS
    : type === "all"
      ? unique([...TILE_DIRECT_KIND_OPTIONS, ...nonTileOptions])
      : rawOptions;
  const selectedOption = fillProductFilterSelect(optionFilter, options, previousOption, "전체", { preserveOrder: preserveOptionOrder });
  const filteredByOption = filteredByBrand.filter((product) => productMatchesDirectOptionFilter(product, selectedOption));
  const patternCategories = sortDirectTileStyleValues(filteredByOption.flatMap(getProductDirectTileCategories));
  const selectedPatternCategory = fillProductFilterSelect(patternCategoryFilter, patternCategories, previousPatternCategory, "전체", { preserveOrder: true });
  const filteredForSize = getDirectProductSizeScope(filteredByBrand, selectedOption, selectedPatternCategory);
  const sizes = getDirectProductSizes(filteredForSize);
  const finishes = sortDirectProductFilterValues(filteredForSize.flatMap(getProductDirectFinishValues));
  const colors = sortDirectProductFilterValues(filteredForSize.flatMap(getProductDirectColorValues));

  fillProductFilterSelect(sizeFilter, sizes, previousSize);
  fillProductFilterSelect(finishFilter, finishes, previousFinish);
  fillProductFilterSelect(colorFilter, colors, previousColor);
  syncTileFinderBrandFilter();
}

function renderAll() {
  if (currentPageId === "productsPage") {
    renderProducts();
  }
  if (currentPageId === "aiTileFinderPage") {
    syncTileFinderBrandFilter();
  }
  if (currentPageId === "taxonomyTestPage") {
    prepareTaxonomyProducts();
    syncTaxonomyFilters();
    renderTaxonomyTestPage();
  }
  renderCart();
  if (currentPageId === "myPage") {
    renderMyPage();
  }
  if (currentPageId === "proposalPage") {
    renderDocuments();
    renderProposalTemplatePreview();
  }
  if (currentPageId === "renderPage") {
    renderRenderWorkspace();
  }
  if (currentPageId === "plannerPage") {
    renderPlannerWorkspace();
  }
  if (currentPageId === "signupPage") {
    renderSignupSummary();
  }
  if (currentPageId === "adminPage") {
    renderAdminOverview();
  }
}

function openProductCategory(productType) {
  document.querySelector("#mainCategoryFilter").value = productType;
  document.querySelector("#productSearch").value = "";
  syncProductFilters({ resetSubFilters: true });
  renderProducts();
  switchPage("productsPage");
}

function applyInitialPageFromHash() {
  let requestedPageId = String(window.location.hash || "").replace(/^#/, "").trim();
  if (!requestedPageId) return;
  const targetPage = document.getElementById(requestedPageId);
  if (!targetPage || !targetPage.classList.contains("app-page")) return;
  if (ADMIN_ONLY_PAGE_IDS.has(requestedPageId) && !isAdminUser()) {
    setText("#adminLoginStatus", "관리자 페이지는 관리자 로그인 후 사용할 수 있습니다.");
    requestedPageId = "loginPage";
  }

  document.querySelectorAll(".app-page").forEach((page) => {
    page.classList.toggle("active", page.id === requestedPageId);
  });

  currentPageId = requestedPageId;
  const activeNavPage = requestedPageId === "productDetailPage"
    ? "taxonomyTestPage"
    : requestedPageId === "samplePage"
      ? "homePage"
      : requestedPageId;
  document.querySelectorAll("[data-page-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.pageTarget === activeNavPage);
  });
}

function resetProposalPptState() {
  const status = document.querySelector("#proposalPptStatus");
  const downloadLink = document.querySelector("#proposalPptDownloadLink");
  if (status) {
    status.textContent = DEFAULT_PROPOSAL_PPT_STATUS;
  }
  if (downloadLink) {
    downloadLink.classList.add("hidden");
    downloadLink.removeAttribute("href");
    downloadLink.removeAttribute("download");
  }
}

function getSelectedProposalTheme() {
  return proposalForm?.querySelector('input[name="proposalTheme"]:checked')?.value || "beige-black";
}

function renderProposalTemplatePreview() {
  const board = document.querySelector("#proposalTemplatePreviewBoard");
  const stage = document.querySelector("#proposalTemplatePreviewStage");
  const label = document.querySelector("#proposalTemplatePreviewLabel");
  const title = document.querySelector("#proposalTemplatePreviewTitle");
  const summary = document.querySelector("#proposalTemplatePreviewSummary");
  const meta = document.querySelector("#proposalTemplatePreviewMeta");
  if (!board || !stage || !label || !title || !summary || !meta) return;

  const theme = getSelectedProposalTheme();
  const preview = PROPOSAL_TEMPLATE_PREVIEWS[theme] || PROPOSAL_TEMPLATE_PREVIEWS["beige-black"];

  board.dataset.theme = theme;
  stage.className = `proposal-template-preview-stage template-preview-${theme}`;
  const headline = stage.querySelector(".proposal-template-preview-headline");
  if (headline) headline.textContent = preview.headline;

  label.textContent = preview.label;
  title.textContent = preview.title;
  summary.textContent = preview.summary;
  meta.innerHTML = preview.meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("");

  document.querySelectorAll(".proposal-template-card").forEach((card) => {
    const input = card.querySelector('input[name="proposalTheme"]');
    card.classList.toggle("is-selected", input?.checked);
  });
}

function renderProducts() {
  syncTileFinderBrandFilter();
  const { totalPages } = getProductPageState();
  productCurrentPage = Math.min(Math.max(productCurrentPage, 1), totalPages);
  commitProductPageView(productCurrentPage);
}

function getFilteredProductsForProductPage() {
  return getProductPageState();
}

function invalidateProductPageCache() {
  productPageCacheVersion += 1;
  productPageStateCache = null;
}

function getProductFilterSnapshot() {
  return window.TbpProductFilters.readProductFilterSnapshot({
    documentRef: document,
    isAdmin: isAdminUser(),
    normalizeSearchText,
    parseNaturalSearch: parseTaxonomyNaturalSearch
  });
}

function getProductPriceCacheKey() {
  return [
    authUser?.role || "guest",
    authUser?.approvalStatus || "",
    authUser?.pricingAccess || "",
    authUser?.memberGrade || "",
    authUser?.priceTier || "",
    hasMemberPriceAccess() ? "price-open" : "price-locked"
  ].join("|");
}

function getProductPageState() {
  const snapshot = getProductFilterSnapshot();
  const cacheKey = JSON.stringify({
    version: productPageCacheVersion,
    products: products.length,
    first: products[0]?.id || "",
    last: products[products.length - 1]?.id || "",
    price: getProductPriceCacheKey(),
    ...snapshot
  });
  if (productPageStateCache?.key === cacheKey) return productPageStateCache.state;

  const filtered = window.TbpProductPageState.filterProductsForPage({
    products,
    snapshot,
    callbacks: {
      getProductSearchableText,
      getNormalizedTaxonomyProductForProduct,
      scoreProductPageNaturalSearch,
      productMatchesAdminBrandFilter,
      productMatchesDirectOptionFilter,
      matchesTileFeatureFilter,
      productMatchesDirectFilter,
      getProductDirectTileCategories,
      getProductDirectFinishValues,
      getProductDirectColorValues,
      hasActiveTaxonomyIntentCriteria,
      compareProductsForDisplay
    }
  });

  const pageSize = getProductPageSize();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activeFilters = window.TbpProductPageState.countActiveProductFilters(snapshot, {
    isAdmin: isAdminUser()
  });
  const state = {
    ...snapshot,
    filtered,
    pageSize,
    totalPages,
    activeFilters,
    pageHtmlCache: new Map()
  };
  productPageStateCache = { key: cacheKey, state };
  return state;
}

function getProductSearchableText(product) {
  if (!product || typeof product !== "object") return "";
  if (productSearchTextCache.has(product)) return productSearchTextCache.get(product);
  const text = window.TbpProductSearchText.buildProductSearchableText(product, normalizeSearchText);
  productSearchTextCache.set(product, text);
  return text;
}

function getNormalizedTaxonomyProductForProduct(product) {
  if (!product || product.productType !== "tile") return null;
  prepareTaxonomyProducts();
  return normalizedTaxonomyProductById.get(product.id)
    || normalizeProductForTaxonomy(product);
}

function scoreProductPageNaturalSearch(item, intent) {
  if (!item || !intent?.active) return 0;
  const searchText = item.customerSearchText || item.searchText || "";
  if (!passesTaxonomySearchHardRules(item, intent, "customer")) return 0;
  return scoreTaxonomySearchIntent(item, intent, searchText, "customer");
}

function getProductPageHtml(page) {
  const state = getProductPageState();
  const normalizedPage = Math.min(Math.max(Number(page) || 1, 1), state.totalPages);
  if (state.pageHtmlCache.has(normalizedPage)) return state.pageHtmlCache.get(normalizedPage);
  const pageProducts = getProductPageProducts(normalizedPage, state);
  const html = buildProductPageCardsHtml(pageProducts, state);
  state.pageHtmlCache.set(normalizedPage, html);
  return html;
}

function getProductPageProducts(page, state = getProductPageState()) {
  const normalizedPage = Math.min(Math.max(Number(page) || 1, 1), state.totalPages);
  const startIndex = (normalizedPage - 1) * state.pageSize;
  return state.filtered.slice(startIndex, startIndex + state.pageSize);
}

function commitProductPageView(page) {
  const state = getProductPageState();
  const normalizedPage = Math.min(Math.max(Number(page) || 1, 1), state.totalPages);
  productCurrentPage = normalizedPage;
  renderProductPageList(getProductPageHtml(normalizedPage), normalizedPage, state.totalPages);
  if (state.filtered.length) {
    updateProductListStatus(`총 ${number(state.filtered.length)}개 상품 · ${number(normalizedPage)}/${number(state.totalPages)}페이지${state.activeFilters ? ` · 필터 ${state.activeFilters}개 적용` : ""}`);
  } else if (products.length) {
    updateProductListStatus(state.activeFilters ? "필터 조건에 맞는 상품이 없습니다. 조건을 넓혀보세요." : "등록된 상품은 있지만 현재 표시할 목록이 없습니다.");
  } else {
    updateProductListStatus("상품 데이터를 아직 불러오지 못했습니다.");
  }
  renderProductExpertGuide(state);
  renderProductPagination(state.filtered.length, state.pageSize, state.totalPages);
  scheduleProductPageWarmup(normalizedPage);
}

function scheduleProductPageWarmup(currentPage) {
  if (productPageWarmupTimer) {
    if ("cancelIdleCallback" in window) {
      window.cancelIdleCallback(productPageWarmupTimer);
    } else {
      window.clearTimeout(productPageWarmupTimer);
    }
    productPageWarmupTimer = null;
  }
  const warmup = () => {
    productPageWarmupTimer = null;
    const state = getProductPageState();
    [currentPage + 1, currentPage - 1].forEach((page) => {
      if (page < 1 || page > state.totalPages) return;
      getProductPageHtml(page);
      preloadProductPageImages(page, state);
    });
  };
  if ("requestIdleCallback" in window) {
    productPageWarmupTimer = window.requestIdleCallback(warmup, { timeout: 700 });
  } else {
    productPageWarmupTimer = window.setTimeout(warmup, 120);
  }
}

function preloadProductPageImages(page, state = getProductPageState()) {
  getProductPageProducts(page, state).forEach((product) => {
    const src = product?.image;
    if (!src || productImagePreloadCache.has(src)) return;
    productImagePreloadCache.add(src);
    const image = new Image();
    image.decoding = "async";
    image.src = src;
  });
}

function renderProductPageList(pageHtml, currentPage, totalPages) {
  const productList = document.querySelector("#productList");
  if (!productList) return;
  productList.classList.remove("is-sliding");
  productList.style.transform = "";
  productList.style.minHeight = "";
  productList.dataset.currentPage = String(currentPage);
  productList.dataset.totalPages = String(totalPages);
  productList.innerHTML = pageHtml;
}

function buildProductPageCardsHtml(pageProducts, state = getProductPageState()) {
  return window.TbpProductCards.buildProductPageCardsHtml({
    pageProducts,
    state,
    callbacks: getProductCardCallbacks()
  });
}

function buildProductCardHtml(product, state = null) {
  return window.TbpProductCards.buildProductCardHtml({
    product,
    state,
    callbacks: getProductCardCallbacks()
  });
}

function getProductCardCallbacks() {
  return {
    escapeHtml,
    getProductDisplayColor,
    getProductDisplayFinish,
    getProductExpertReasons,
    hasStockValue,
    formatStockQuantity,
    renderProductCardAdminMeta,
    renderProductCardPriceLine
  };
}

function renderProductExpertGuide(state = getProductPageState()) {
  const panel = document.querySelector("#productExpertGuide");
  if (!panel) return;
  const mode = document.querySelector("#expertSearchMode");
  const intentWrap = document.querySelector("#expertIntentChips");
  const comment = document.querySelector("#expertSearchComment");
  const suggestionWrap = document.querySelector("#expertSuggestionChips");
  const hasKeyword = Boolean(state.keyword);
  const hasNaturalIntent = state.naturalIntent?.active && hasActiveTaxonomyIntentCriteria(state.naturalIntent);
  const hasFilter = state.activeFilters > 0;
  if (mode) mode.textContent = hasNaturalIntent ? "전문가 검색 중" : hasFilter ? "조건 탐색 중" : "검색 전";
  if (intentWrap) {
    const chips = getProductExpertIntentChips(state);
    intentWrap.innerHTML = chips.length
      ? chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")
      : `<span>공간, 용도, 색상, 스타일, 규격, 마감을 자연어로 입력해보세요.</span>`;
  }
  if (comment) comment.textContent = getProductExpertComment(state);
  if (suggestionWrap) {
    const suggestions = getProductExpertSuggestions(state);
    suggestionWrap.innerHTML = suggestions.length
      ? suggestions.map((item) => `
        <button type="button" data-expert-filter="${escapeHtml(item.filter)}" data-expert-value="${escapeHtml(item.value)}">
          ${escapeHtml(item.label)} <small>${number(item.count)}</small>
        </button>
      `).join("")
      : `<span>${hasKeyword || hasFilter ? "더 좁힐 조건이 부족합니다. 검색어를 조금 넓혀보세요." : "검색하면 색상, 마감, 규격, 스타일 추천 버튼이 나타납니다."}</span>`;
  }
}

function getProductExpertIntentChips(state) {
  const chips = [];
  const add = (label, value) => {
    const text = String(value || "").trim();
    if (text && text !== "all") chips.push(`${label} ${text}`);
  };
  add("대분류", PRODUCT_TYPE_LABELS[state.type] || state.type);
  add("종류", state.option);
  add("스타일", state.patternCategory);
  add("규격", state.size);
  add("마감", state.finish);
  add("색상", state.color);
  if (state.naturalIntent?.active) {
    getTaxonomyIntentChipEntries(state.naturalIntent).slice(0, 10).forEach((entry) => add(entry.label, entry.value));
  }
  return unique(chips).slice(0, 14);
}

function getProductExpertComment(state) {
  const total = state.filtered.length;
  const tileCount = state.filtered.filter((product) => product.productType === "tile").length;
  const stocked = state.filtered.filter((product) => Number(product.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY).length;
  if (!state.keyword && state.activeFilters === 0) {
    return "원하는 현장 조건을 말하듯 입력하면 색상, 마감, 규격, 스타일을 해석해서 후보를 좁혀드립니다.";
  }
  if (!total) {
    return "현재 조건은 너무 좁습니다. 사이즈나 마감 중 하나를 넓히거나, 색상 표현을 아이보리/베이지처럼 비슷한 말로 바꿔보세요.";
  }
  if (state.naturalIntent?.active && state.naturalIntent?.sizes?.length) {
    return `규격 조건을 먼저 고정하고 ${number(total)}개 후보를 찾았습니다. 이 중 타일 ${number(tileCount)}개, 바로 재고 확인 가능한 상품은 ${number(stocked)}개입니다.`;
  }
  if (state.naturalIntent?.active && state.naturalIntent?.finishes?.length) {
    return `마감 조건을 우선 반영해 ${number(total)}개 후보를 정리했습니다. 색상이나 스타일을 한 번 더 누르면 더 정확해집니다.`;
  }
  return `${number(total)}개 후보를 찾았습니다. 타일은 ${number(tileCount)}개이며, 재고가 충분한 상품을 우선 검토하는 흐름이 좋습니다.`;
}

function getProductExpertSuggestions(state) {
  if (!state.filtered.length) return [];
  const groups = [
    { filter: "color", label: "색상", selector: "#colorFilter", values: getProductDirectColorValues, intentValues: state.naturalIntent?.colors || [] },
    { filter: "finish", label: "마감", selector: "#finishFilter", values: getProductDirectFinishValues, intentValues: state.naturalIntent?.finishes || [] },
    { filter: "size", label: "규격", selector: "#sizeFilter", values: (product) => [product.size].filter(Boolean), intentValues: state.naturalIntent?.sizes || [] },
    { filter: "patternCategory", label: "스타일", selector: "#patternCategoryFilter", values: getProductDirectTileCategories, intentValues: state.naturalIntent?.styles || [] }
  ];
  const suggestions = [];
  for (const group of groups) {
    const current = document.querySelector(group.selector)?.value || "all";
    if (current !== "all") continue;
    const counts = new Map();
    for (const product of state.filtered) {
      for (const value of group.values(product)) {
        const clean = String(value || "").trim();
        if (!clean || clean === "all" || /미확인|확인 필요/.test(clean)) continue;
        if (productExpertValueAlreadyInIntent(clean, group.intentValues)) continue;
        counts.set(clean, (counts.get(clean) || 0) + 1);
      }
    }
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko", { numeric: true }))
      .slice(0, 3)
      .forEach(([value, count]) => {
        suggestions.push({ filter: group.filter, value, label: `${group.label} ${value}`, count });
      });
  }
  return suggestions.slice(0, 10);
}

function productExpertValueAlreadyInIntent(value, intentValues = []) {
  const normalizedValue = normalizeProductExpertCompareValue(value);
  return (intentValues || []).some((intentValue) => normalizeProductExpertCompareValue(intentValue) === normalizedValue);
}

function normalizeProductExpertCompareValue(value) {
  return normalizeTaxonomySearch(String(value || "").replace(/[×＊*]/g, "x"));
}

function handleExpertSearchSuggestionClick(event) {
  const button = event.target.closest("[data-expert-filter][data-expert-value]");
  if (!button) return;
  const selectorByFilter = {
    color: "#colorFilter",
    finish: "#finishFilter",
    size: "#sizeFilter",
    patternCategory: "#patternCategoryFilter"
  };
  const selector = selectorByFilter[button.dataset.expertFilter];
  const control = selector ? document.querySelector(selector) : null;
  if (!control) return;
  const value = button.dataset.expertValue || "all";
  if (![...control.options].some((option) => option.value === value)) return;
  control.value = value;
  if (button.dataset.expertFilter === "patternCategory") syncProductFilters();
  productCurrentPage = 1;
  renderProducts();
  document.querySelector("#productList")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getProductExpertReasons(product, state) {
  if (!state || (!state.keyword && state.activeFilters === 0)) return [];
  const reasons = [];
  const normalized = product.productType === "tile" ? getNormalizedTaxonomyProductForProduct(product) : null;
  if (state.size !== "all" && product.size === state.size) reasons.push(`규격 ${product.size}`);
  if (state.finish !== "all" && getProductDirectFinishValues(product).includes(state.finish)) reasons.push(`마감 ${state.finish}`);
  if (state.color !== "all" && getProductDirectColorValues(product).includes(state.color)) reasons.push(`색상 ${state.color}`);
  if (state.patternCategory !== "all" && getProductDirectTileCategories(product).includes(state.patternCategory)) reasons.push(`스타일 ${state.patternCategory}`);
  if (normalized && state.naturalIntent?.active) {
    if (state.naturalIntent.colors?.some((value) => taxonomyHasAny([normalized.mainColor, normalized.subColor, normalized.accentColor], [value]))) reasons.push("색상 의도 일치");
    if (state.naturalIntent.styles?.some((value) => taxonomyHasAny(normalized.styleCategories, [value]))) reasons.push("디자인 의도 일치");
    if (state.naturalIntent.sizes?.some((value) => taxonomySizeMatches(normalized, value))) reasons.push("규격 의도 일치");
  }
  if (Number(product.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY) reasons.push("재고 확인 가능");
  return unique(reasons).slice(0, 3);
}

function getAdminProductBrandLabel(product) {
  return String([
    product?.majorCategory,
    product?.internalBrandCode,
    product?.internalBrandName,
    product?.maker,
    product?.sourceSite,
    product?.catalogSource,
    product?.kind
  ].find((value) => String(value || "").trim()) || "").trim();
}

function renderProductCardAdminMeta(product) {
  if (!isAdminUser()) return "";
  const brand = getAdminProductBrandLabel(product) || "브랜드 미확인";
  const cost = Number(product?.costPrice || 0);
  return `
    <span class="admin-product-meta">브랜드 ${escapeHtml(brand)}</span>
    <span class="admin-product-meta">원가 ${escapeHtml(cost ? money.format(cost) : "미등록")}</span>
  `;
}

function matchesTileFeatureFilter(product, filterValue) {
  const text = normalizeSearchText([
    product.name,
    product.option,
    product.patternCategory,
    product.sourceCategoryName,
    product.features,
    product.material,
    product.finish
  ].filter(Boolean).join(" "));
  if (filterValue === "pattern") {
    return product.patternCategory === "패턴"
      || /패턴|pattern|ptn|데코|장식|꽃|플라워|라인|헥사|기하학|모자이크/.test(text);
  }
  if (filterValue === "special") {
    return /특수타일|특수|계단|기능성|발포세라믹|박판|후판|20t|18t|슬랩/.test(text);
  }
  return true;
}

function updateProductListStatus(message) {
  const status = document.querySelector("#productListStatus");
  if (status) status.textContent = String(message || "");
}

function getProductPageSize() {
  return 15;
}

function goToProductPage(page, options = {}) {
  const nextPage = Math.max(1, Number(page) || 1);
  const direction = Math.sign(nextPage - productCurrentPage);
  if (options.animate && direction && animateProductPageTransition(nextPage, direction)) return;
  productCurrentPage = nextPage;
  renderProducts();
  if (options.scroll !== false) {
    document.querySelector("#productList")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function animateProductPageTransition(nextPage, direction) {
  const productList = document.querySelector("#productList");
  if (!productList || productPageTransitioning) return false;
  const { totalPages } = getFilteredProductsForProductPage();
  const clampedNextPage = Math.min(Math.max(nextPage, 1), totalPages);
  if (clampedNextPage === productCurrentPage) return false;

  productPageTransitioning = true;
  const fromX = direction > 0 ? "0%" : "-50%";
  const toX = direction > 0 ? "-50%" : "0%";
  const track = renderProductPageSlideTrack(productList, clampedNextPage, direction, fromX);
  if (!track) {
    productPageTransitioning = false;
    return false;
  }

  requestAnimationFrame(() => {
    track.style.transform = `translateX(${toX})`;
  });

  finalizeProductPageSlide(clampedNextPage, 440);

  return true;
}

function renderProductPageSlideTrack(productList, nextPage, direction, transformX) {
  const listHeight = productList.getBoundingClientRect().height;
  const currentHtml = getProductPageHtml(productCurrentPage);
  const nextHtml = getProductPageHtml(nextPage);
  productList.classList.add("is-sliding");
  productList.style.transform = "";
  productList.style.minHeight = `${Math.max(1, Math.round(listHeight))}px`;
  productList.innerHTML = `
    <div class="product-page-slide-track" style="transform: translateX(${transformX});">
      <div class="product-page-slide-panel">${direction > 0 ? currentHtml : nextHtml}</div>
      <div class="product-page-slide-panel">${direction > 0 ? nextHtml : currentHtml}</div>
    </div>
  `;
  return productList.querySelector(".product-page-slide-track");
}

function finalizeProductPageSlide(nextPage, delay = 440) {
  window.setTimeout(() => {
    productPageTransitioning = false;
    commitProductPageView(nextPage);
    const productList = document.querySelector("#productList");
    if (productList) productList.style.minHeight = "";
  }, delay);
}

function setupProductPageSwipe() {
  const list = document.querySelector("#productList");
  if (!list) return;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerStartTime = 0;
  let dragState = null;

  const clampDragPercent = (value, direction) => {
    if (direction > 0) return Math.max(-50, Math.min(0, value));
    return Math.max(-50, Math.min(0, -50 + value));
  };

  const startProductDrag = (dx) => {
    if (productPageTransitioning || Math.abs(dx) < 12) return null;
    const direction = dx < 0 ? 1 : -1;
    const totalPages = Number(list.dataset.totalPages || 1);
    const currentPage = Number(list.dataset.currentPage || productCurrentPage || 1);
    const nextPage = currentPage + direction;
    if (nextPage < 1 || nextPage > totalPages) return null;
    const fromX = direction > 0 ? "0%" : "-50%";
    productPageTransitioning = true;
    const track = renderProductPageSlideTrack(list, nextPage, direction, fromX);
    if (!track) {
      productPageTransitioning = false;
      return null;
    }
    track.classList.add("is-dragging");
    return {
      direction,
      nextPage,
      track,
      width: Math.max(1, list.getBoundingClientRect().width)
    };
  };

  const updateProductDrag = (startX, startY, currentX, currentY) => {
    const dx = currentX - startX;
    const dy = currentY - startY;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (!dragState) dragState = startProductDrag(dx);
    if (!dragState) return;
    const deltaPercent = (dx / dragState.width) * 50;
    const translatePercent = clampDragPercent(deltaPercent, dragState.direction);
    dragState.track.style.transform = `translateX(${translatePercent}%)`;
  };

  const settleProductDrag = (accepted) => {
    if (!dragState) return false;
    const { direction, nextPage, track } = dragState;
    const target = accepted ? (direction > 0 ? -50 : 0) : (direction > 0 ? 0 : -50);
    track.classList.remove("is-dragging");
    requestAnimationFrame(() => {
      track.style.transform = `translateX(${target}%)`;
    });
    if (accepted) {
      finalizeProductPageSlide(nextPage, 440);
    } else {
      window.setTimeout(() => {
        productPageTransitioning = false;
        commitProductPageView(productCurrentPage);
      }, 300);
    }
    dragState = null;
    return true;
  };

  const finishSwipe = (startX, startY, endX, endY, startTime) => {
    if (!startTime) return;
    const dx = endX - startX;
    const dy = endY - startY;
    const elapsed = Date.now() - startTime;
    const accepted = elapsed <= 900 && Math.abs(dx) >= 70 && Math.abs(dx) >= Math.abs(dy) * 1.35;
    if (settleProductDrag(accepted)) return;
    if (!accepted) return;
    const totalPages = Number(list.dataset.totalPages || 1);
    const currentPage = Number(list.dataset.currentPage || productCurrentPage || 1);
    if (dx < 0 && currentPage < totalPages) {
      goToProductPage(currentPage + 1, { animate: true });
    } else if (dx > 0 && currentPage > 1) {
      goToProductPage(currentPage - 1, { animate: true });
    }
  };

  list.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  list.addEventListener("touchmove", (event) => {
    if (!touchStartTime || event.touches.length !== 1) return;
    updateProductDrag(touchStartX, touchStartY, event.touches[0].clientX, event.touches[0].clientY);
  }, { passive: true });

  list.addEventListener("touchend", (event) => {
    if (!touchStartTime || !event.changedTouches.length) return;
    finishSwipe(touchStartX, touchStartY, event.changedTouches[0].clientX, event.changedTouches[0].clientY, touchStartTime);
    touchStartTime = 0;
  }, { passive: true });

  list.addEventListener("touchcancel", () => {
    settleProductDrag(false);
    touchStartTime = 0;
  }, { passive: true });

  list.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.buttons !== 1) return;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerStartTime = Date.now();
  });

  list.addEventListener("pointermove", (event) => {
    if (!pointerStartTime) return;
    if (event.pointerType === "mouse" && event.buttons !== 1) return;
    updateProductDrag(pointerStartX, pointerStartY, event.clientX, event.clientY);
  });

  list.addEventListener("pointerup", (event) => {
    finishSwipe(pointerStartX, pointerStartY, event.clientX, event.clientY, pointerStartTime);
    pointerStartTime = 0;
  }, { passive: true });

  list.addEventListener("pointercancel", () => {
    settleProductDrag(false);
    pointerStartTime = 0;
  });
}

function renderProductPagination(totalItems, pageSize, totalPages) {
  const pagination = document.querySelector("#productPagination");
  if (!pagination) return;
  if (!totalItems || totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  const pages = getVisibleProductPages(productCurrentPage, totalPages);
  pagination.innerHTML = [
    `<button type="button" data-product-page="1" ${productCurrentPage === 1 ? "disabled" : ""}>처음</button>`,
    `<button type="button" data-product-page="${Math.max(1, productCurrentPage - 1)}" ${productCurrentPage === 1 ? "disabled" : ""}>이전</button>`,
    ...pages.map((page) => page === "..."
      ? `<span class="product-pagination-ellipsis">...</span>`
      : `<button type="button" data-product-page="${page}" class="${page === productCurrentPage ? "active" : ""}" ${page === productCurrentPage ? "aria-current=\"page\"" : ""}>${number(page)}</button>`),
    `<button type="button" data-product-page="${Math.min(totalPages, productCurrentPage + 1)}" ${productCurrentPage === totalPages ? "disabled" : ""}>다음</button>`,
    `<button type="button" data-product-page="${totalPages}" ${productCurrentPage === totalPages ? "disabled" : ""}>끝</button>`,
    `<span class="product-pagination-summary">${number(totalItems)}개 · ${number(pageSize)}개씩</span>`
  ].join("");
}

function getVisibleProductPages(currentPage, totalPages) {
  const pages = new Set([1, totalPages]);
  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const visible = [];
  for (const page of sorted) {
    const previous = visible[visible.length - 1];
    if (typeof previous === "number" && page - previous > 1) visible.push("...");
    visible.push(page);
  }
  return visible;
}

function prepareTaxonomyProducts() {
  const sourceKey = storedNormalizedTaxonomyProducts.length
    ? `stored:${storedNormalizedTaxonomyProducts.length}:${products.length}:${storedNormalizedTaxonomyProducts[0]?.taxonomyVersion || ""}`
    : `live:${products.length}:${products[0]?.id || ""}:${products[products.length - 1]?.id || ""}`;
  if (normalizedTaxonomyProducts.length && normalizedTaxonomySourceKey === sourceKey) return;
  normalizedTaxonomyProducts = storedNormalizedTaxonomyProducts.length
    ? mapStoredNormalizedTaxonomyProducts()
    : products.map(normalizeProductForTaxonomy);
  normalizedTaxonomyProductById = new Map(normalizedTaxonomyProducts.map((item) => [item.product?.id || item.id, item]));
  normalizedTaxonomySourceKey = sourceKey;
}

function mapStoredNormalizedTaxonomyProducts() {
  const productById = new Map(products.map((product) => [product.id, product]));
  return storedNormalizedTaxonomyProducts
    .filter((item) => item.productType === "tile")
    .map((item) => {
      const product = productById.get(item.productId);
      if (!product) return null;
      const internalBrandCode = item.internalBrandCode || item.brand || product.kind || product.catalogSource || product.maker || "BR-UNKNOWN";
      const internalBrandName = item.internalBrandName || item.supplierName || product.maker || `${internalBrandCode}_INTERNAL`;
      const sizeThicknessLabel = makeTaxonomySizeThicknessLabel(item.sizeLabel, item.thicknessMm);
      const thicknessBucket = item.thicknessBucket || getTaxonomyThicknessBucket(item.thicknessMm);
      const directSurfaceFinish = normalizeDirectTaxonomySurface(product.finish || product.surface);
      const surfaceFinish = directSurfaceFinish || item.surfaceFinish;
      const finishModel = getTaxonomyFinishModel([
        surfaceFinish,
        item.surfaceTexture,
        item.slipRating,
        product.name,
        product.option,
        product.finish,
        product.surface
      ].filter(Boolean).join(" "), surfaceFinish, item.surfaceTexture, Boolean(item.antiSlip));
      const priceRange = getTaxonomyPriceRange(product);
      const stockStatus = Number(item.stockQty || product.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY ? "재고 있음" : "주문시 재고 문의";
      const directStyle = normalizeDirectProductFilterValue(product.patternCategory);
      const styleCategories = TILE_STYLE_OPTION_SET.has(directStyle)
        ? [directStyle]
        : normalizeTaxonomyArray(item.styleCategories, "스타일 미확인");
      const mainColor = normalizeDirectProductFilterValue(product.color) || item.mainColor || "색상 미확인";
      return {
        id: item.productId,
        product,
        internalBrandCode,
        internalBrandName,
        supplierName: item.supplierName || product.maker || "",
        brand: internalBrandCode,
        mainCategory: item.productType || product.productType || "tile",
        collectionName: item.collectionName || product.name || "컬렉션 미확인",
        customerCollectionName: item.customerCollectionName || item.collectionName || product.name || "컬렉션 미확인",
        collectionKey: item.collectionId || normalizeSearchText(item.collectionName || product.name || item.productId),
        sizeLabel: item.sizeLabel || "",
        sizeThicknessLabel,
        thicknessBucket,
        sizeGroup: item.sizeGroup || "규격 미확인",
        widthMm: Number(item.widthMm || 0),
        heightMm: Number(item.heightMm || 0),
        thicknessMm: Number(item.thicknessMm || 0),
        originRegion: item.originRegion || item.origin_country || item.countryOfOrigin || product.countryOfOrigin || "원산지 미확인",
        originCountry: item.originCountry || item.countryOfOrigin || product.countryOfOrigin || "",
        priceRange,
        stockStatus,
        materialCategory: item.materialCategory || "재질 미확인",
        materialDetail: item.materialDetail || "",
        surfaceFinish: surfaceFinish === "마감 미확인" ? "" : surfaceFinish || "",
        finishGroup: directSurfaceFinish ? finishModel.finishGroup : item.finishGroup || finishModel.finishGroup,
        finishDetail: directSurfaceFinish ? finishModel.finishDetail : item.finishDetail || finishModel.finishDetail,
        finishPath: directSurfaceFinish ? finishModel.finishPath : item.finishPath || finishModel.finishPath,
        surfaceTexture: item.surfaceTexture || "",
        antiSlip: Boolean(item.antiSlip),
        slipRating: item.slipRating || "",
        mainColor,
        subColor: item.subColor || "",
        accentColor: Array.isArray(item.accentColors) ? item.accentColors.join(", ") : item.accentColors || "",
        patternDetail: item.patternDetail || "",
        moodTags: normalizeTaxonomyArray(item.moodTags, ""),
        searchKeywords: normalizeTaxonomyArray(item.searchKeywords, ""),
        styleCategories,
        applicationCategories: normalizeTaxonomyArray(item.applicationCategories, "용도 미확인"),
        spaceCategories: normalizeTaxonomyArray(item.spaceCategories, "공간 미확인"),
        functionCategories: normalizeTaxonomyArray(item.functionCategories, ""),
        hasMissingCore: Boolean(item.needsReview),
        customerSearchText: normalizeTaxonomySearch([
          item.customerSearchableText,
          item.patternDetail,
          ...(Array.isArray(item.moodTags) ? item.moodTags : []),
          ...(Array.isArray(item.searchKeywords) ? item.searchKeywords : [])
        ].filter(Boolean).join(" ")),
        adminSearchText: normalizeTaxonomySearch([
          item.adminSearchableText,
          item.patternDetail,
          ...(Array.isArray(item.moodTags) ? item.moodTags : []),
          ...(Array.isArray(item.searchKeywords) ? item.searchKeywords : [])
        ].filter(Boolean).join(" ")),
        searchText: normalizeTaxonomySearch([
          item.customerSearchableText,
          item.patternDetail,
          ...(Array.isArray(item.moodTags) ? item.moodTags : []),
          ...(Array.isArray(item.searchKeywords) ? item.searchKeywords : [])
        ].filter(Boolean).join(" "))
      };
    })
    .filter(Boolean);
}

function makeTaxonomySizeThicknessLabel(sizeLabel, thicknessMm) {
  const size = String(sizeLabel || "").trim();
  const thickness = Number(thicknessMm || 0);
  if (size && thickness) return `${size}x${thickness}T`;
  return size || (thickness ? `${thickness}T` : "규격 미확인");
}

function getTaxonomyThicknessBucket(thicknessMm) {
  const thickness = Number(thicknessMm || 0);
  if (thickness > 0 && thickness <= 6) return "6T 이하";
  if (thickness >= 7 && thickness <= 8) return "7~8T";
  if (thickness >= 9 && thickness <= 10) return "9~10T";
  if (thickness >= 11 && thickness <= 12) return "11~12T";
  if (thickness >= 18 && thickness <= 20) return "20T";
  return "기타";
}

function getTaxonomyFinishModel(source, surfaceFinish = "", surfaceTexture = "", antiSlip = false) {
  const directFinish = normalizeDirectTaxonomySurface(surfaceFinish);
  if (directFinish === "유광") {
    return { finishGroup: "유광", finishDetail: "유광", finishPath: "유광" };
  }

  const text = normalizeTaxonomyRaw([source, surfaceFinish, surfaceTexture].filter(Boolean).join(" "));
  let group = "";
  let detail = "";
  if (/폴리싱|polishing|polished/.test(text)) {
    group = "유광";
    detail = "폴리싱";
  } else if (/반무광|세미무광|새틴|satin|라파토|lappato/.test(text)) {
    group = "유광";
    detail = "반무광";
  } else if (/유광|글로시|gloss|glossy|gls/.test(text)) {
    group = "유광";
    detail = "유광";
  } else if (antiSlip || /논슬립|미끄럼|non-slip|nonslip|\bns\b|r10|r11|r12/.test(text)) {
    group = "무광";
    detail = "논슬립";
  } else if (/혼드|honed/.test(text)) {
    group = "무광";
    detail = "혼드";
  } else if (/엠보|emboss|양각/.test(text)) {
    group = "무광";
    detail = "엠보";
  } else if (/3d|입체/.test(text)) {
    group = "무광";
    detail = "3D";
  } else if (/텍스처|texture|텍스쳐|골지|리브드|플루티드|stripe|스트라이프|러프|rough|요철|거친|조면/.test(text)) {
    group = "무광";
    detail = "텍스쳐";
  } else if (/몰드|mold/.test(text)) {
    group = "무광";
    detail = "텍스쳐";
  } else if (/커팅|cutting|rectified/.test(text)) {
    group = "무광";
    detail = "내추럴";
  } else if (/내추럴|natural/.test(text)) {
    group = "무광";
    detail = "내추럴";
  } else if (directFinish === "무광" || /무광|매트|맷|matt|matte|mat/.test(text)) {
    group = "무광";
    detail = "무광";
  }
  const path = ["엠보", "3D", "텍스쳐"].includes(detail)
    ? `무광 > 내추럴 > ${detail}`
    : group && detail && group !== detail
      ? `${group} > ${detail}`
      : group || "마감 미확인";
  return {
    finishGroup: group || "마감 미확인",
    finishDetail: detail || "마감 미확인",
    finishPath: path
  };
}

function normalizeDirectTaxonomySurface(value) {
  const text = String(value || "").trim();
  if (text === "유광") return "유광";
  if (text === "무광") return "무광";
  if (/몰드|mold|커팅|cutting|rectified/i.test(text)) return "무광";
  return "";
}

function getTaxonomyPriceRange(product) {
  const price = Number(product?.retailPrice || 0);
  if (!price) return "금액 미설정";
  if (price < 10000) return "1만원 미만";
  if (price < 30000) return "1만-3만원";
  if (price < 50000) return "3만-5만원";
  if (price < 100000) return "5만-10만원";
  return "10만원 이상";
}

function normalizeTaxonomyArray(value, fallback) {
  if (Array.isArray(value)) return value.length ? value : fallback ? [fallback] : [];
  return value ? [value] : fallback ? [fallback] : [];
}

function syncTaxonomyFilters() {
  if (!document.querySelector("#taxonomyBrandFilter")) return;
  prepareTaxonomyProducts();
  syncTaxonomyAudienceControls();
  fillTaxonomySelect("#taxonomyBrandFilter", unique(normalizedTaxonomyProducts.map((item) => item.internalBrandCode || item.brand)), "전체");
  fillTaxonomySelect("#taxonomyOriginFilter", unique(normalizedTaxonomyProducts.map((item) => item.originRegion).filter(Boolean)), "전체");
  fillTaxonomySelect("#taxonomyApplicationFilter", collectTaxonomyValues("applicationCategories"), "전체");
  fillTaxonomySelect("#taxonomyColorFilter", unique(normalizedTaxonomyProducts.map((item) => item.mainColor).filter(Boolean)), "전체");
  fillTaxonomySelect("#taxonomyStyleFilter", collectTaxonomyValues("styleCategories"), "전체");
  fillTaxonomySelect("#taxonomyFinishFilter", unique(normalizedTaxonomyProducts.map((item) => item.finishGroup || "마감 미확인")), "전체");
  fillTaxonomySelect("#taxonomySizeFilter", unique(normalizedTaxonomyProducts.map((item) => item.thicknessBucket).filter(Boolean)), "전체");
  fillTaxonomySelect("#taxonomyPriceFilter", unique(normalizedTaxonomyProducts.map((item) => item.priceRange).filter(Boolean)), "전체");
  renderTaxonomyAssistSizePanel();
  syncTaxonomyAssistFinishButtons();
}

function getTaxonomyAudienceMode() {
  if (!isAdminUser()) return "customer";
  return document.querySelector("#taxonomyAudienceMode")?.value === "admin" ? "admin" : "customer";
}

function syncTaxonomyAudienceControls() {
  ensureTaxonomyAdminAudienceDefault();
  const isAdmin = getTaxonomyAudienceMode() === "admin";
  document.querySelector("#taxonomyAudienceField")?.classList.toggle("hidden", !isAdminUser());
  document.querySelector("#taxonomyAxisField")?.classList.toggle("hidden", !isAdminUser());
  const audienceMode = document.querySelector("#taxonomyAudienceMode");
  if (!isAdminUser() && audienceMode) audienceMode.value = "customer";
  document.querySelector("#taxonomyBrandField")?.classList.toggle("hidden", !isAdmin);
  const brandFilter = document.querySelector("#taxonomyBrandFilter");
  if (!isAdmin && brandFilter) brandFilter.value = "all";
  const axisFilter = document.querySelector("#taxonomyAxisFilter");
  const brandAxisOption = axisFilter?.querySelector('option[value="internalBrandCode"]');
  if (brandAxisOption) brandAxisOption.hidden = !isAdmin;
  if (!isAdmin && axisFilter?.value === "internalBrandCode") axisFilter.value = "originRegion";
}

function ensureTaxonomyAdminAudienceDefault() {
  const audienceMode = document.querySelector("#taxonomyAudienceMode");
  if (!audienceMode) return;
  if (!isAdminUser()) {
    audienceMode.dataset.adminDefaultApplied = "";
    return;
  }
  if (audienceMode.dataset.adminDefaultApplied === "true") return;
  audienceMode.value = "admin";
  audienceMode.dataset.adminDefaultApplied = "true";
}

function fillTaxonomySelect(selector, values, allLabel) {
  const select = document.querySelector(selector);
  if (!select) return;
  const previous = select.value || "all";
  const sorted = sortTaxonomyValues(values);
  select.innerHTML = `<option value="all">${escapeHtml(allLabel)}</option>${sorted.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  select.value = sorted.includes(previous) ? previous : "all";
}

function collectTaxonomyValues(key) {
  return unique(normalizedTaxonomyProducts.flatMap((item) => Array.isArray(item[key]) ? item[key] : [item[key]]).filter(Boolean));
}

function getTaxonomyAssistSize() {
  const value = getTaxonomyAssistSizeSelection();
  return value === UNKNOWN_TILE_SIZE_VALUE ? "" : value;
}

function getTaxonomyAssistSizeSelection() {
  return document.querySelector("#taxonomyAssistSizeBtn")?.dataset.selectedSize || "";
}

function getTaxonomyAssistSizeLabel() {
  const value = getTaxonomyAssistSizeSelection();
  if (value === UNKNOWN_TILE_SIZE_VALUE) return "사이즈 모름";
  return value || "전체 규격";
}

function getTaxonomyAssistFinish() {
  return document.querySelector("#taxonomyAssistFinishGroup button.active")?.dataset.taxonomyAssistFinish || "all";
}

function toggleTaxonomyAssistSizePanel() {
  const panel = document.querySelector("#taxonomyAssistSizePanel");
  const button = document.querySelector("#taxonomyAssistSizeBtn");
  if (!panel || !button) return;
  const willOpen = panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !willOpen);
  button.setAttribute("aria-expanded", String(willOpen));
}

function setTaxonomyAssistSize(value) {
  const button = document.querySelector("#taxonomyAssistSizeBtn");
  const panel = document.querySelector("#taxonomyAssistSizePanel");
  if (!button) return;
  button.dataset.selectedSize = value;
  button.textContent = getTaxonomyAssistSizeLabel();
  if (panel) panel.classList.add("hidden");
  button.setAttribute("aria-expanded", "false");
  taxonomyResultFacetFilters = {};
  taxonomyCurrentPage = 1;
  renderTaxonomyAssistSizePanel();
}

function setTaxonomyAssistFinish(value) {
  const nextValue = value && value !== "all" ? value : "all";
  document.querySelectorAll("#taxonomyAssistFinishGroup [data-taxonomy-assist-finish]").forEach((button) => {
    button.classList.toggle("active", button.dataset.taxonomyAssistFinish === nextValue);
  });
  taxonomyResultFacetFilters = {};
  taxonomyCurrentPage = 1;
}

function syncTaxonomyAssistFinishButtons() {
  const currentValue = getTaxonomyAssistFinish();
  document.querySelectorAll("#taxonomyAssistFinishGroup [data-taxonomy-assist-finish]").forEach((button) => {
    button.classList.toggle("active", button.dataset.taxonomyAssistFinish === currentValue);
  });
}

function renderTaxonomyAssistSizePanel() {
  const panel = document.querySelector("#taxonomyAssistSizePanel");
  if (!panel) return;
  const selectedSize = getTaxonomyAssistSizeSelection();
  const sizeCounts = new Map();
  products
    .filter((product) => product.productType === "tile")
    .forEach((product) => {
      const size = normalizeTaxonomyProductSizeLabel(product.size);
      if (!size) return;
      sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
    });
  const sizes = sortTileSizeLabels([...sizeCounts.keys()]);
  const buttons = [
    `<button type="button" class="${selectedSize ? "" : "active"}" data-taxonomy-assist-size="">전체</button>`,
    `<button type="button" class="${selectedSize === UNKNOWN_TILE_SIZE_VALUE ? "active" : ""}" data-taxonomy-assist-size="${UNKNOWN_TILE_SIZE_VALUE}">사이즈 모름 <span>전체</span></button>`,
    ...sizes.map((size) => {
      const count = sizeCounts.get(size) || 0;
      return `<button type="button" class="${selectedSize === size ? "active" : ""}" data-taxonomy-assist-size="${escapeHtml(size)}">${escapeHtml(size)} <span>${number(count)}</span></button>`;
    })
  ];
  panel.innerHTML = buttons.join("");
}

function sortTileSizeLabels(values) {
  return unique(values).sort((a, b) => {
    const [aw, ah] = parseTaxonomySizeLabel(a);
    const [bw, bh] = parseTaxonomySizeLabel(b);
    const areaA = aw * ah;
    const areaB = bw * bh;
    if (areaA !== areaB) return areaA - areaB;
    if (aw !== bw) return aw - bw;
    return String(a).localeCompare(String(b), "ko", { numeric: true });
  });
}

function parseTaxonomySizeLabel(value) {
  const match = String(value || "").match(/(\d{2,4})\s*x\s*(\d{2,4})/i);
  if (!match) return [999999, 999999];
  return [Number(match[1]) || 0, Number(match[2]) || 0];
}

function normalizeTaxonomyProductSizeLabel(value) {
  const source = String(value || "").replace(/[×＊]/g, "x");
  const match = source.match(/(\d{2,4})\s*[xX*]\s*(\d{2,4})/);
  if (!match) return "";
  return `${Number(match[1])}x${Number(match[2])}`;
}

function taxonomySizeMatches(item, expectedSize) {
  const expected = normalizeTaxonomyProductSizeLabel(expectedSize);
  if (!expected) return false;
  const size = normalizeTaxonomyProductSizeLabel(item?.sizeLabel);
  const sizeThickness = normalizeTaxonomySearch(item?.sizeThicknessLabel || "");
  return size === expected || sizeThickness.startsWith(expected);
}

function renderTaxonomyTestPage() {
  const list = document.querySelector("#taxonomyCollectionList");
  if (!list) return;
  prepareTaxonomyProducts();
  renderTaxonomyAssistSizePanel();
  syncTaxonomyAssistFinishButtons();

  const searchIntent = getCurrentTaxonomySearchIntent();
  const baseFiltered = filterTaxonomyProducts(searchIntent, { skipResultFacets: true });
  const filtered = applyTaxonomyResultFacetFilters(baseFiltered);
  const collections = sortTaxonomyCollections(groupTaxonomyCollections(filtered));
  renderTaxonomyResultFacets(searchIntent, baseFiltered, filtered);
  renderTaxonomyMetrics(filtered, collections);
  renderTaxonomyAxisBar(filtered);

  const totalPages = Math.max(1, Math.ceil(collections.length / TAXONOMY_PAGE_SIZE));
  taxonomyCurrentPage = Math.min(Math.max(taxonomyCurrentPage, 1), totalPages);
  const startIndex = (taxonomyCurrentPage - 1) * TAXONOMY_PAGE_SIZE;
  const visibleCollections = collections.slice(startIndex, startIndex + TAXONOMY_PAGE_SIZE);
  list.innerHTML = visibleCollections.map(renderTaxonomyCollectionCard).join("")
    || `<div class="empty-state">새 분류 조건에 맞는 상품군이 없습니다. 필터를 넓혀보세요.</div>`;
  renderTaxonomyPagination(collections.length, totalPages);

  const status = document.querySelector("#taxonomyStatus");
  if (status) {
    const sortLabel = getTaxonomySortLabel();
    status.textContent = getTaxonomyAudienceMode() === "admin"
      ? `${number(filtered.length)}개 SKU · ${number(collections.length)}개 예상 컬렉션 · ${number(taxonomyCurrentPage)}/${number(totalPages)}페이지 · ${sortLabel}`
      : `${number(collections.length)}개 상품군 · ${number(taxonomyCurrentPage)}/${number(totalPages)}페이지 · ${sortLabel}`;
  }
  return { filtered, baseFiltered, collections, searchIntent };
}

async function runTaxonomySearch() {
  const raw = document.querySelector("#taxonomySearch")?.value || "";
  if (raw !== taxonomyLastSearchRaw) {
    taxonomyLastSearchRaw = raw;
    taxonomyDisabledIntentKeys = new Set();
    taxonomyResultFacetFilters = {};
  }
  taxonomyCurrentPage = 1;
  syncTaxonomyFilters();
  const result = renderTaxonomyTestPage();
  recordTaxonomySearchLog(result?.searchIntent, result?.filtered?.length || 0);
  if (taxonomyImageSearchDataUrl) await runTaxonomyImageSearch();
  document.querySelector("#taxonomyCollectionList")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderTaxonomyPagination(totalItems, totalPages) {
  const pagination = document.querySelector("#taxonomyPagination");
  if (!pagination) return;
  if (!totalItems || totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  const pages = getVisibleProductPages(taxonomyCurrentPage, totalPages);
  pagination.innerHTML = [
    `<button type="button" data-taxonomy-page="1" ${taxonomyCurrentPage === 1 ? "disabled" : ""}>처음</button>`,
    `<button type="button" data-taxonomy-page="${Math.max(1, taxonomyCurrentPage - 1)}" ${taxonomyCurrentPage === 1 ? "disabled" : ""}>이전</button>`,
    ...pages.map((page) => page === "..."
      ? `<span class="product-pagination-ellipsis">...</span>`
      : `<button type="button" data-taxonomy-page="${page}" class="${page === taxonomyCurrentPage ? "active" : ""}" ${page === taxonomyCurrentPage ? "aria-current=\"page\"" : ""}>${number(page)}</button>`),
    `<button type="button" data-taxonomy-page="${Math.min(totalPages, taxonomyCurrentPage + 1)}" ${taxonomyCurrentPage === totalPages ? "disabled" : ""}>다음</button>`,
    `<button type="button" data-taxonomy-page="${totalPages}" ${taxonomyCurrentPage === totalPages ? "disabled" : ""}>끝</button>`,
    `<span class="product-pagination-summary">${number(totalItems)}개 컬렉션 · ${number(TAXONOMY_PAGE_SIZE)}개씩</span>`
  ].join("");
}

function filterTaxonomyProducts(searchIntent = getCurrentTaxonomySearchIntent()) {
  const audience = getTaxonomyAudienceMode();
  const brand = getTaxonomyValue("#taxonomyBrandFilter");
  const origin = getTaxonomyValue("#taxonomyOriginFilter");
  const application = getTaxonomyValue("#taxonomyApplicationFilter");
  const color = getTaxonomyValue("#taxonomyColorFilter");
  const style = getTaxonomyValue("#taxonomyStyleFilter");
  const finish = getTaxonomyValue("#taxonomyFinishFilter");
  const thickness = getTaxonomyValue("#taxonomySizeFilter");
  const price = getTaxonomyValue("#taxonomyPriceFilter");
  const stock = getTaxonomyValue("#taxonomyStockFilter");
  return normalizedTaxonomyProducts.map((item) => {
    const searchText = audience === "admin" ? (item.adminSearchText || item.searchText) : (item.customerSearchText || item.searchText);
    const filterPassed = (audience !== "admin" || brand === "all" || item.internalBrandCode === brand || item.brand === brand)
      && (origin === "all" || item.originRegion === origin)
      && (application === "all" || item.applicationCategories.includes(application))
      && (color === "all" || item.mainColor === color)
      && (style === "all" || item.styleCategories.includes(style))
      && (finish === "all" || (item.finishGroup || "마감 미확인") === finish)
      && (thickness === "all" || item.thicknessBucket === thickness)
      && (price === "all" || item.priceRange === price)
      && (stock === "all" || (stock === "stocked" ? Number(item.product.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY : Number(item.product.stockQty || 0) <= STOCK_INQUIRY_THRESHOLD_QTY))
      && passesTaxonomySearchHardRules(item, searchIntent, audience);
    if (!filterPassed) return null;
    const searchScore = scoreTaxonomySearchIntent(item, searchIntent, searchText, audience);
    if (searchIntent.active && hasActiveTaxonomyIntentCriteria(searchIntent) && searchScore <= 0) return null;
    item.taxonomySearchScore = searchScore;
    return item;
  }).filter(Boolean).sort(sortTaxonomySearchResults);
}

function getCurrentTaxonomySearchIntent() {
  const raw = document.querySelector("#taxonomySearch")?.value || "";
  if (raw !== taxonomyLastSearchRaw) {
    taxonomyLastSearchRaw = raw;
    taxonomyDisabledIntentKeys = new Set();
    taxonomyResultFacetFilters = {};
    taxonomyCurrentPage = 1;
  }
  return augmentTaxonomyIntentWithAssistOptions(parseTaxonomyNaturalSearch(raw, getTaxonomyAudienceMode()));
}

function augmentTaxonomyIntentWithAssistOptions(intent) {
  const selectedSize = getTaxonomyAssistSize();
  const selectedFinish = getTaxonomyAssistFinish();
  if (!selectedSize && selectedFinish === "all") return intent;
  const next = {
    tokenGroups: [],
    origins: [],
    spaces: [],
    applications: [],
    colors: [],
    styles: [],
    patternDetails: [],
    finishes: [],
    textures: [],
    materials: [],
    moods: [],
    specialTypes: [],
    sizes: [],
    priceRanges: [],
    internalBrands: [],
    freeTokens: [],
    antiSlipRequired: false,
    stockRequired: false,
    stockEmpty: false,
    ...intent,
    active: true
  };
  if (selectedSize) next.sizes = unique([...(next.sizes || []), selectedSize]);
  if (selectedFinish !== "all") next.finishes = unique([...(next.finishes || []), selectedFinish]);
  next.tokenGroups = unique([
    ...(next.origins || []),
    ...(next.spaces || []),
    ...(next.applications || []),
    ...(next.colors || []),
    ...(next.styles || []),
    ...(next.patternDetails || []),
    ...(next.finishes || []),
    ...(next.textures || []),
    ...(next.materials || []),
    ...(next.moods || []),
    ...(next.specialTypes || []),
    ...(next.sizes || []),
    ...(next.priceRanges || []),
    ...(next.freeTokens || [])
  ]).map(makeTaxonomyTokenGroup);
  return next;
}

function applyTaxonomyIntentSelections(intent) {
  if (!intent?.active) return intent;
  intent.allChipEntries = getTaxonomyIntentChipEntries(intent);
  const isEnabled = (label, value) => !taxonomyDisabledIntentKeys.has(makeTaxonomyIntentKey(label, value));
  const filterField = (field, label) => {
    intent[field] = (intent[field] || []).filter((value) => isEnabled(label, value));
  };
  filterField("origins", "원산지");
  filterField("spaces", "공간");
  filterField("applications", "제품군");
  filterField("colors", "색상");
  filterField("styles", "디자인");
  filterField("patternDetails", "패턴");
  filterField("finishes", "마감");
  filterField("textures", "질감");
  filterField("materials", "소재");
  filterField("moods", "무드");
  filterField("specialTypes", "특수");
  filterField("sizes", "규격");
  filterField("priceRanges", "금액");
  filterField("internalBrands", "브랜드");
  intent.freeTokens = (intent.freeTokens || []).filter((value) => isEnabled("유사어", value));
  if (!isEnabled("기능", "논슬립")) intent.antiSlipRequired = false;
  if (!isEnabled("재고", "재고 있음")) intent.stockRequired = false;
  if (!isEnabled("재고", "주문시 재고 문의")) intent.stockEmpty = false;
  intent.tokenGroups = unique([
    ...intent.origins,
    ...intent.spaces,
    ...intent.applications,
    ...intent.colors,
    ...intent.styles,
    ...intent.patternDetails,
    ...intent.finishes,
    ...intent.textures,
    ...intent.materials,
    ...intent.moods,
    ...intent.specialTypes,
    ...intent.sizes,
    ...intent.priceRanges,
    ...intent.freeTokens
  ]).map(makeTaxonomyTokenGroup);
  return intent;
}

function recordTaxonomySearchLog(intent, resultCount) {
  if (!intent?.active) return;
  fetch("/api/local/taxonomy-search-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience: getTaxonomyAudienceMode(),
      query: intent.raw || "",
      resultCount,
      interpreted: intent
    })
  }).catch(() => {});
}

function applyTaxonomyResultFacetFilters(items) {
  const activeEntries = Object.entries(taxonomyResultFacetFilters)
    .map(([key, values]) => [key, Array.isArray(values) ? values : []])
    .filter(([key, values]) => values.length && VISIBLE_TAXONOMY_RESULT_FACET_KEYS.has(key));
  if (!activeEntries.length) return items;
  return items.filter((item) => activeEntries.every(([key, selectedValues]) => {
    const itemValues = getTaxonomyFacetValues(item, key);
    return selectedValues.some((value) => itemValues.includes(value));
  }));
}

function toggleTaxonomyResultFacet(key, value) {
  if (!key || !value) return;
  const selected = new Set(taxonomyResultFacetFilters[key] || []);
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  taxonomyResultFacetFilters = {
    ...taxonomyResultFacetFilters,
    [key]: [...selected]
  };
  if (!taxonomyResultFacetFilters[key].length) {
    const next = { ...taxonomyResultFacetFilters };
    delete next[key];
    taxonomyResultFacetFilters = next;
  }
}

function passesTaxonomySearchHardRules(item, intent, audience) {
  if (!intent?.active) return true;
  if (intent.stockRequired && Number(item.product.stockQty || 0) <= STOCK_INQUIRY_THRESHOLD_QTY) return false;
  if (intent.stockEmpty && Number(item.product.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY) return false;
  if (intent.internalBrands?.length && audience === "admin" && !intent.internalBrands.includes(item.internalBrandCode)) return false;
  if (intent.sizes?.length && !intent.sizes.some((value) => taxonomySizeMatches(item, value))) return false;
  if (intent.origins?.length && !taxonomyHasAny([item.originRegion, item.originCountry], intent.origins)) return false;
  if (intent.colors?.length && !taxonomyHasAny([item.mainColor, item.subColor, item.accentColor], intent.colors)) return false;
  if (intent.finishes?.length && !taxonomyHasAny([item.finishGroup, item.finishDetail, item.finishPath, item.surfaceFinish], intent.finishes)) return false;
  if (intent.styles?.length && !taxonomyHasAny(item.styleCategories, intent.styles)) return false;
  if (intent.patternDetails?.length && !taxonomyPatternMatches(item, intent.patternDetails)) return false;
  if (intent.materials?.length && !taxonomyHasAny([item.materialCategory, item.materialDetail], intent.materials)) return false;
  if (intent.applications?.length && !taxonomyHasAny(item.applicationCategories, intent.applications)) return false;
  if (intent.antiSlipRequired && !item.antiSlip && !taxonomyHasAny(item.functionCategories, ["논슬립"])) return false;
  if (intent.specialTypes?.length && !taxonomySpecialTypesMatch(item, intent.specialTypes)) return false;
  if (isTaxonomyShapeIntent(intent) && !isTaxonomyShapeItem(item, intent)) return false;
  if (isTaxonomyMosaicIntent(intent)) {
    const searchText = audience === "admin" ? (item.adminSearchText || item.searchText) : (item.customerSearchText || item.searchText);
    if (!isTaxonomyMosaicItem(item, searchText)) return false;
  }
  return true;
}

function taxonomyHasAny(values = [], needles = []) {
  const normalizedValues = normalizeTaxonomyArray(values, "").map(normalizeTaxonomySearch);
  return (needles || []).some((needle) => normalizedValues.includes(normalizeTaxonomySearch(needle)));
}

function taxonomyPatternMatches(item, patternDetails = []) {
  const values = [
    item.patternDetail,
    ...(item.styleCategories || []),
    ...(item.applicationCategories || []),
    ...(item.functionCategories || [])
  ];
  return (patternDetails || []).every((pattern) => taxonomyHasAny(values, [pattern]));
}

function taxonomySpecialTypesMatch(item, specialTypes = []) {
  return (specialTypes || []).every((special) => {
    if (special === "논슬립") return item.antiSlip || taxonomyHasAny(item.functionCategories, ["논슬립"]);
    if (special === "20T 외부용") return taxonomyHasAny(item.functionCategories, ["20T 외부용"]) || Number(item.thicknessMm || 0) >= 18;
    if (special === "모자이크") return isTaxonomyMosaicItem(item);
    return taxonomyHasAny(item.functionCategories, [special]);
  });
}

function isTaxonomyShapeIntent(intent) {
  const raw = normalizeTaxonomySearch(intent?.raw || "");
  return /육각|헥사|헥사곤|hex|팔각|oct|랜턴|다이아|dia|원형|페니|penny|스틱|stick|조약돌|pebble/.test(raw);
}

function isTaxonomyShapeItem(item, intent) {
  const raw = normalizeTaxonomySearch(intent?.raw || "");
  const text = normalizeTaxonomySearch([
    item.shape,
    item.customerSearchText,
    item.searchText,
    item.product?.name,
    item.product?.option,
    item.product?.sourceCategoryName
  ].filter(Boolean).join(" "));
  if (/육각|헥사|헥사곤|hex/.test(raw)) return /육각|헥사|헥사곤|hex|hx/.test(text);
  if (/팔각|oct/.test(raw)) return /팔각|oct/.test(text);
  if (/랜턴/.test(raw)) return /랜턴|lantern/.test(text);
  if (/다이아|dia/.test(raw)) return /다이아|dia/.test(text);
  if (/원형|페니|penny/.test(raw)) return /원형|페니|penny|round|rd/.test(text);
  if (/스틱|stick/.test(raw)) return /스틱|stick|롱|long/.test(text);
  if (/조약돌|pebble/.test(raw)) return /조약돌|pebble/.test(text);
  return true;
}

function scoreTaxonomySearchIntent(item, intent, searchText = item.searchText, audience = "customer") {
  const stockQty = Number(item.product.stockQty || 0);
  if (!intent?.active || !hasActiveTaxonomyIntentCriteria(intent)) return (stockQty > STOCK_INQUIRY_THRESHOLD_QTY ? 20 : 1) + Math.min(item.product.retailPrice ? 3 : 0, 3);
  let score = stockQty > STOCK_INQUIRY_THRESHOLD_QTY ? 24 : 0;
  score += scoreExactList(intent.origins, [item.originRegion, item.originCountry], 12);
  score += scoreExactList(intent.spaces, item.spaceCategories, 18);
  score += scoreExactList(intent.applications, item.applicationCategories, 20);
  score += scoreExactList(intent.colors, [item.mainColor, item.subColor, item.accentColor], 24);
  score += scoreExactList(intent.styles, item.styleCategories, 22);
  score += scoreExactList(intent.finishes, [item.finishGroup, item.finishDetail, item.finishPath, item.surfaceFinish], 24);
  score += scoreExactList(intent.materials, [item.materialCategory, item.materialDetail], 16);
  score += scoreExactList(intent.patternDetails, [item.patternDetail, ...item.styleCategories], 14);
  score += scoreExactList(intent.textures, [item.surfaceTexture], 10);
  score += scoreExactList(intent.moods, item.moodTags, 10);
  score += scoreExactList(intent.specialTypes, item.functionCategories, 24);
  if (intent.antiSlipRequired && item.antiSlip) score += 18;
  if (intent.sizes?.length && intent.sizes.some((value) => taxonomySizeMatches(item, value))) score += 42;
  if (intent.internalBrands?.length && audience === "admin" && intent.internalBrands.includes(item.internalBrandCode)) score += 28;
  const tokenScore = scoreTaxonomyTokenGroups(intent.tokenGroups, searchText);
  score += tokenScore;
  score += scoreTaxonomySimilarity(intent.freeTokens, searchText, 22);
  score += scoreTaxonomyTileKnowledge(item, intent, searchText);
  return score;
}

function scoreTaxonomyTileKnowledge(item, intent, searchText = "") {
  if (!intent?.active) return 0;
  const text = normalizeTaxonomySearch([
    searchText,
    item.materialCategory,
    item.materialDetail,
    item.finishGroup,
    item.finishDetail,
    item.finishPath,
    item.surfaceFinish,
    item.surfaceTexture,
    item.slipRating,
    ...(item.functionCategories || []),
    ...(item.applicationCategories || []),
    ...(item.spaceCategories || [])
  ].filter(Boolean).join(" "));
  const raw = normalizeTaxonomySearch(intent.raw || "");
  const hasSpace = (value) => (intent.spaces || []).includes(value) || raw.includes(normalizeTaxonomySearch(value));
  const hasApp = (value) => (intent.applications || []).includes(value) || raw.includes(normalizeTaxonomySearch(value));
  const hasMood = (value) => (intent.moods || []).includes(value) || raw.includes(normalizeTaxonomySearch(value));
  const isFloorIntent = hasApp("바닥타일") || /바닥|floor/.test(raw);
  const isWallIntent = hasApp("벽타일") || /벽|wall/.test(raw);
  const isWetFloor = isFloorIntent && (hasSpace("욕실") || hasSpace("외부공간") || hasSpace("상업공간") || /샤워|수영장|베란다|현관/.test(raw));
  const isMosaicIntent = /모자이크|모자익|mosaic|페니|헥사|헥사곤|육각|팔각|랜턴|다이아|스틱|조약돌|pebble|penny|hex/.test(raw);
  const isAccessoryLike = /부자재|접착|접착제|줄눈|메지|홈멘트|시멘트|실리콘|방수|아덱스|ardex|grout|adhesive|몰딩|스커팅|코너|엣지|클립|웨지|레벨링/.test(text);
  let score = 0;

  if (isMosaicIntent) {
    if ((item.applicationCategories || []).includes("모자이크 타일")) score += 42;
    if ((item.functionCategories || []).includes("모자이크")) score += 30;
    if (/모자이크|모자익|mosaic|페니|헥사|헥사곤|육각|팔각|랜턴|다이아|스틱|조약돌|pebble|penny|hex|시트/.test(text)) score += 20;
    if (/소형타일|특수형|패턴|데코|글라스|유리/.test(text)) score += 8;
    if (isAccessoryLike || (item.applicationCategories || []).includes("부자재 / 마감재")) score -= 70;
  }

  if (isWetFloor) {
    if (item.antiSlip || text.includes("논슬립")) score += 30;
    if (/포세린|자기질|컬러바디|풀바디|더블로딩/.test(text)) score += 18;
    if (/무광|세미무광|러프|매트|r10|r11|r12/.test(text)) score += 14;
    if (/유광|글로시|폴리싱/.test(text)) score -= 18;
  }

  if (hasSpace("외부공간") || hasApp("외부용 타일")) {
    if (/포세린|자기질|컬러바디|풀바디/.test(text)) score += 20;
    if (item.antiSlip || /논슬립|러프|r10|r11|r12/.test(text)) score += 24;
    if (/uv|내오염|방오|20t|외부용/.test(text)) score += 12;
    if (/유광|글로시|폴리싱/.test(text)) score -= 16;
  }

  if (hasSpace("상업공간") || hasApp("상업용 바닥타일")) {
    if (/풀바디|컬러바디|더블로딩|언글레이즈드/.test(text)) score += 18;
    if (/포세린|자기질/.test(text)) score += 14;
    if (item.antiSlip || /논슬립|러프|r10|r11/.test(text)) score += 10;
    if (/메탈|메탈룩|글라스룩/.test(text) && !isFloorIntent) score += 10;
  }

  if (isWallIntent && !isFloorIntent) {
    if (/도기질|세라믹|화이트바디|레드바디|글레이즈드/.test(text)) score += 14;
    if (/글로시|유광|화이트바디/.test(text)) score += 6;
    if (/글라스|글라스룩|모자이크|메탈|메탈룩/.test(text)) score += 12;
    if (/풀바디|20t|외부용/.test(text)) score -= 6;
  }

  if (/주방|싱크|백스플래시/.test(raw) && isWallIntent) {
    if (/글레이즈드|유광|글로시|글라스|서브웨이|브릭/.test(text)) score += 16;
    if (/조면|러프/.test(text)) score -= 8;
  }

  if (/현관|외부|보도블럭|보도블록|보행/.test(raw)) {
    if (/석기질|stoneware|석재타일|조면|러프|논슬립/.test(text)) score += 22;
    if (/글로시|유광|폴리싱/.test(text)) score -= 16;
  }

  if (/로비|아트월|공항|호텔벽|상업벽/.test(raw)) {
    if (/메탈|메탈룩|글라스|글라스룩|폴리싱|마블룩/.test(text)) score += 16;
  }

  if (/포인트|장식|모자이크|곡면|둥근|작은/.test(raw)) {
    if (/모자이크|글라스|글라스룩|패턴/.test(text)) score += 18;
    const maxSide = Math.max(Number(item.widthMm || 0), Number(item.heightMm || 0));
    if (maxSide && maxSide <= 50) score += 10;
  }

  if (/수영장|스파|풀사이드|샤워장|침수/.test(raw)) {
    if (/수영장용|모자이크|글라스|포세린|논슬립|내산|내화학/.test(text)) score += 26;
    if (/시트|모자이크/.test(text)) score += 8;
  }

  if (/20t|20mm|페데스탈|옥상|정원|테라스/.test(raw)) {
    if (/20t외부용|포세린|외부용|논슬립|러프/.test(text)) score += 30;
    if (/도기질|벽전용|글라스/.test(text)) score -= 24;
  }

  if (/빅슬랩|대형판|1200x2400|1600x3200|상판|가구마감/.test(raw)) {
    if (/빅슬랩|박판|포세린|대형슬랩|마블룩|스톤룩/.test(text)) score += 28;
    if (/모자이크|소형/.test(text)) score -= 18;
  }

  if (/복합대리석|엔지니어드|인조석/.test(raw)) {
    if (/복합대리석|복합타일|스톤룩|마블룩/.test(text)) score += 24;
    if (/외부|uv/.test(raw) && !/외부용|uv/.test(text)) score -= 8;
  }

  if (/시멘트타일|엔카우스틱|빈티지패턴/.test(raw)) {
    if (/엔카우스틱|시멘트타일|패턴|데코|빈티지/.test(text)) score += 28;
    if (/시멘트룩|콘크리트룩/.test(text)) score += 10;
  }

  if (/광촉매|셀프클리닝|자가세정|공기정화|탈취/.test(raw)) {
    if (/광촉매|셀프클리닝|uv코팅|내오염/.test(text)) score += 32;
  }

  if (/점자|유도타일|시각장애|촉지도/.test(raw)) {
    if (/점자|유도|조면|논슬립/.test(text)) score += 34;
  }

  if (/esd|정전기|서버실|전자장비실|실험실/.test(raw)) {
    if (/esd|정전기|내산|내화학|고하중/.test(text)) score += 30;
  }

  if (/내산|내화학|화학공장|식품공장|산성|약품/.test(raw)) {
    if (/내산|내화학|포세린|석기질|방오|내오염/.test(text)) score += 30;
  }

  if (/주차장|고하중|창고|물류|차량/.test(raw)) {
    if (/고하중|20t외부용|석기질|포세린|풀바디|컬러바디|논슬립/.test(text)) score += 32;
    if (/벽전용|도기질|글라스/.test(text)) score -= 22;
  }

  if (/졸리컷|조적|타일세면대|파티션|모서리/.test(raw)) {
    if (/포세린|자기질|컬러바디|풀바디/.test(text)) score += 28;
    if (/도기질|레드바디/.test(text)) score -= 18;
  }

  if (/청소|관리|줄눈/.test(raw)) {
    const maxSide = Math.max(Number(item.widthMm || 0), Number(item.heightMm || 0));
    if (maxSide >= 600) score += 12;
    if (/내오염|방오|글레이즈드/.test(text)) score += 8;
    if (/조면|러프/.test(text)) score -= 10;
  }

  if (/위생|병원|의료|항균|항바이러스/.test(raw)) {
    if (/항균|항바이러스|위생/.test(text)) score += 26;
    if (/내오염|방오/.test(text)) score += 8;
  }

  if (hasMood("호텔") || /호텔|고급|프리미엄/.test(raw)) {
    if ((item.styleCategories || []).some((style) => ["마블룩", "트래버틴룩", "스톤룩"].includes(style))) score += 14;
    if (["베이지", "아이보리 / 크림", "화이트", "그레이"].includes(item.mainColor)) score += 8;
    if (/포세린|자기질/.test(text)) score += 8;
    if (/폴리싱|글로시|메탈룩|글라스룩/.test(text) && !isWetFloor) score += 8;
  }

  if (/온기|난방|따뜻|보온/.test(raw)) {
    if (/포세린|폴리싱|자기질|우드룩/.test(text)) score += 8;
  }

  if (/아이|노인|어르신|안전/.test(raw) && isFloorIntent) {
    if (item.antiSlip || /논슬립|무광|러프|r10|r11/.test(text)) score += 18;
    if (/폴리싱|글로시|유광/.test(text)) score -= 20;
  }

  return score;
}

function hasActiveTaxonomyIntentCriteria(intent) {
  if (!intent?.active) return false;
  return [
    "origins", "spaces", "applications", "colors", "styles", "patternDetails",
    "finishes", "textures", "materials", "moods", "specialTypes", "sizes", "priceRanges",
    "internalBrands", "freeTokens"
  ].some((field) => Array.isArray(intent[field]) && intent[field].length)
    || Boolean(intent.antiSlipRequired || intent.stockRequired || intent.stockEmpty);
}

function scoreExactList(needles, values, weight) {
  const normalizedValues = normalizeTaxonomyArray(values, "").map(normalizeTaxonomySearch);
  return (needles || []).some((needle) => normalizedValues.includes(normalizeTaxonomySearch(needle))) ? weight : 0;
}

function scoreTaxonomyTokenGroups(groups, searchText) {
  if (!groups?.length) return 0;
  const text = String(searchText || "");
  return groups.reduce((sum, group) => sum + (group.some((token) => text.includes(token)) ? 7 : 0), 0);
}

function scoreTaxonomySimilarity(tokens, searchText, maxScore) {
  const usableTokens = (tokens || []).filter((token) => token.length >= 2);
  if (!usableTokens.length) return 0;
  const text = String(searchText || "");
  const matched = usableTokens.filter((token) => text.includes(token) || getTaxonomyPartialTokenScore(token, text) > 0.72).length;
  return Math.round((matched / usableTokens.length) * maxScore);
}

function getTaxonomyPartialTokenScore(token, searchText) {
  if (!token || !searchText) return 0;
  if (searchText.includes(token)) return 1;
  const chunks = searchText.split(/\s+/).filter((part) => part.length >= 2);
  let best = 0;
  for (const chunk of chunks) {
    const common = [...token].filter((char) => chunk.includes(char)).length;
    best = Math.max(best, common / Math.max(token.length, chunk.length));
  }
  return best;
}

function sortTaxonomySearchResults(a, b) {
  const score = Number(b.taxonomySearchScore || 0) - Number(a.taxonomySearchScore || 0);
  if (score) return score;
  const stock = Number(b.product.stockQty || 0) - Number(a.product.stockQty || 0);
  if (stock) return stock;
  return String(a.collectionName || a.product.name || "").localeCompare(String(b.collectionName || b.product.name || ""), "ko", { numeric: true });
}

function getTaxonomyValue(selector) {
  return document.querySelector(selector)?.value || "all";
}

function renderTaxonomyMetrics(filtered, collections) {
  const metrics = document.querySelector("#taxonomyMetrics");
  if (!metrics) return;
  const isAdmin = getTaxonomyAudienceMode() === "admin";
  const stockProducts = filtered.filter((item) => Number(item.product.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY).length;
  const missingCore = filtered.filter((item) => item.hasMissingCore).length;
  const mappedRate = filtered.length ? Math.round(((filtered.length - missingCore) / filtered.length) * 100) : 0;
  metrics.innerHTML = [
    ["필터 상품", `${number(filtered.length)}개`, "새 구조 기준 SKU 수"],
    ["예상 컬렉션", `${number(collections.length)}개`, "시리즈/상품군 기준 묶음"],
    ["재고보유", `${number(stockProducts)}개`, "stockQty 기준"],
    ["보기 기준", isAdmin ? "내부관리자" : "고객노출", isAdmin ? "브랜드 포함" : "브랜드 제외"],
    ["분류 완성도", `${mappedRate}%`, "원산지·제품군·색상·디자인 기준"]
  ].map(([label, value, desc]) => `
    <article class="taxonomy-metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(desc)}</small>
    </article>
  `).join("");
}

function renderTaxonomyResultFacets(intent, baseFiltered, filtered) {
  const wrap = document.querySelector("#taxonomyIntentChips");
  if (!wrap) return;
  if (!intent?.active) {
    wrap.innerHTML = `<span><strong>검색 대기</strong> 먼저 자연어로 검색하면 결과 안에서 색상, 마감, 규격, 디자인 필터가 나타납니다.</span>`;
    return;
  }
  const facetGroups = buildTaxonomyResultFacetGroups(baseFiltered);
  const visibleFacetGroups = getVisibleTaxonomyResultFacetGroups(facetGroups);
  const visibleFacetKeys = new Set(visibleFacetGroups.map((group) => group.key));
  const activeCount = Object.entries(taxonomyResultFacetFilters)
    .filter(([key]) => visibleFacetKeys.has(key))
    .reduce((sum, [, values]) => sum + (Array.isArray(values) ? values.length : 0), 0);
  const reset = activeCount
    ? `<button class="taxonomy-intent-reset" type="button" data-taxonomy-reset-facets>결과 필터 초기화</button>`
    : "";
  wrap.innerHTML = visibleFacetGroups.length
    ? `<span class="taxonomy-intent-help"><strong>결과 필터</strong>${number(baseFiltered.length)}개 검색 결과 안에서 색상, 마감, 규격, 디자인만 좁혀보세요. 현재 ${number(filtered.length)}개 표시 중입니다.</span>${reset}${visibleFacetGroups.map(renderTaxonomyFacetGroup).join("")}`
    : `<span><strong>결과 필터 없음</strong>${number(filtered.length)}개 후보를 점수순으로 정렬했습니다.</span>`;
}

function makeIntentChipRows(label, values) {
  return unique(values || []).map((value) => [label, value]);
}

function buildTaxonomyResultFacetGroups(items) {
  const configs = [
    { key: "mainColor", label: "색상", limit: 12, visibleInResultFilters: true },
    { key: "finishGroup", label: "마감", limit: 4, visibleInResultFilters: true },
    { key: "sizeLabel", label: "규격", limit: 12, visibleInResultFilters: true },
    { key: "styleCategories", label: "디자인", limit: 10, visibleInResultFilters: true },
    { key: "finishDetail", label: "세부 마감", limit: 10, visibleInResultFilters: false },
    { key: "originRegion", label: "원산지", limit: 10, visibleInResultFilters: false },
    { key: "thickness", label: "두께", limit: 10, visibleInResultFilters: false },
    { key: "applicationCategories", label: "제품군", limit: 10, visibleInResultFilters: false },
    { key: "materialCategory", label: "소재", limit: 10, visibleInResultFilters: false },
    { key: "functionCategories", label: "특수", limit: 12, visibleInResultFilters: false },
    { key: "stockStatus", label: "재고", limit: 4, visibleInResultFilters: false }
  ];
  return configs.map((config) => {
    const counts = new Map();
    for (const item of items) {
      for (const value of getTaxonomyFacetValues(item, config.key)) {
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }
    const selected = new Set(taxonomyResultFacetFilters[config.key] || []);
    const values = [...counts.entries()]
      .map(([value, count]) => ({ value, count, selected: selected.has(value) }))
      .filter((entry) => entry.value && !/미확인/.test(entry.value))
      .sort((a, b) => Number(b.selected) - Number(a.selected) || b.count - a.count || a.value.localeCompare(b.value, "ko", { numeric: true }))
      .slice(0, config.limit);
    return { ...config, values };
  }).filter((group) => group.values.length);
}

function getVisibleTaxonomyResultFacetGroups(groups) {
  return groups.filter((group) => group.visibleInResultFilters && VISIBLE_TAXONOMY_RESULT_FACET_KEYS.has(group.key));
}

function renderTaxonomyFacetGroup(group) {
  return `<div class="taxonomy-facet-group">
    <strong>${escapeHtml(group.label)}</strong>
    <div>
      ${group.values.map((entry) => `<button class="taxonomy-intent-chip${entry.selected ? " is-selected" : ""}" type="button" data-taxonomy-facet-key="${escapeHtml(group.key)}" data-taxonomy-facet-value="${escapeHtml(entry.value)}">
        ${escapeHtml(entry.value)} <small>${number(entry.count)}</small>
      </button>`).join("")}
    </div>
  </div>`;
}

function getTaxonomyFacetValues(item, key) {
  if (!item) return [];
  if (key === "mainColor") return [item.mainColor, item.subColor].filter(Boolean);
  if (key === "finishGroup") return [item.finishGroup || "마감 미확인"];
  if (key === "finishDetail") return [item.finishDetail || item.surfaceFinish || "마감 미확인"];
  if (key === "originRegion") return [item.originRegion || "원산지 미확인"];
  if (key === "thickness") return [item.thicknessBucket || getTaxonomyThicknessBucket(item.thicknessMm)];
  if (key === "sizeLabel") return [item.sizeLabel || item.sizeThicknessLabel].filter(Boolean);
  if (key === "styleCategories") return normalizeTaxonomyArray(item.styleCategories, "");
  if (key === "applicationCategories") return normalizeTaxonomyArray(item.applicationCategories, "");
  if (key === "materialCategory") return [item.materialCategory || "소재 미확인"];
  if (key === "functionCategories") return normalizeTaxonomyArray(item.functionCategories, "");
  if (key === "stockStatus") return Number(item.product?.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY ? ["재고 있음"] : ["주문시 재고 문의"];
  return normalizeTaxonomyArray(item[key], "");
}

function getTaxonomyIntentChipEntries(intent) {
  if (!intent?.active) return [];
  const entries = [
    ...makeIntentChipRows("원산지", intent.origins),
    ...makeIntentChipRows("공간", intent.spaces),
    ...makeIntentChipRows("제품군", intent.applications),
    ...makeIntentChipRows("색상", intent.colors),
    ...makeIntentChipRows("디자인", intent.styles),
    ...makeIntentChipRows("패턴", intent.patternDetails),
    ...makeIntentChipRows("마감", intent.finishes),
    ...makeIntentChipRows("질감", intent.textures),
    ...makeIntentChipRows("소재", intent.materials),
    ...makeIntentChipRows("무드", intent.moods),
    ...makeIntentChipRows("규격", intent.sizes),
    ...makeIntentChipRows("금액", intent.priceRanges),
    ...(intent.antiSlipRequired ? [["기능", "논슬립"]] : []),
    ...(intent.stockRequired ? [["재고", "재고 있음"]] : []),
    ...(intent.stockEmpty ? [["재고", "주문시 재고 문의"]] : []),
    ...(getTaxonomyAudienceMode() === "admin" ? makeIntentChipRows("브랜드", intent.internalBrands) : []),
    ...(intent.freeTokens || []).slice(0, 8).map((token) => ["유사어", token])
  ];
  return entries.map(([label, value]) => ({
    label,
    value,
    key: makeTaxonomyIntentKey(label, value)
  }));
}

function makeTaxonomyIntentKey(label, value) {
  return `${normalizeTaxonomySearch(label)}:${normalizeTaxonomySearch(value)}`;
}

function renderTaxonomyAxisBar(filtered) {
  const bar = document.querySelector("#taxonomyAxisBar");
  if (!bar) return;
  const axis = document.querySelector("#taxonomyAxisFilter")?.value || "spaceCategories";
  const counts = new Map();
  for (const item of filtered) {
    const values = Array.isArray(item[axis]) ? item[axis] : [item[axis]];
    for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  bar.innerHTML = entries.map(([label, count]) => `
    <button class="taxonomy-axis-chip" type="button" disabled>
      <strong>${escapeHtml(label)}</strong>
      <span>${number(count)}</span>
    </button>
  `).join("") || `<span class="empty-state compact-empty-state">표시할 분류 축이 없습니다.</span>`;
}

function renderTaxonomyCollectionCard(collection) {
  const first = collection.products[0];
  const image = first.product.image;
  const isAdmin = getTaxonomyAudienceMode() === "admin";
  const displayTitle = isAdmin ? collection.title : collection.customerTitle || collection.title;
  const tags = unique([
    ...collection.styles.slice(0, 2),
    collection.origin,
    ...collection.applications.slice(0, 2),
    ...collection.functions.slice(0, 2)
  ]).slice(0, 6);
  return `
    <article class="taxonomy-collection-card">
      <button class="product-detail-trigger" type="button" data-view-product="${escapeHtml(first.id)}" aria-label="${escapeHtml(displayTitle)} 상세 보기">
        ${image ? `<img class="taxonomy-collection-thumb" src="${escapeHtml(image)}" alt="${escapeHtml(displayTitle)}" loading="lazy" />` : `<div class="taxonomy-collection-thumb product-thumb-empty">이미지 없음</div>`}
      </button>
      <div class="taxonomy-collection-body">
        <div>
          ${isAdmin ? `<span class="product-code-badge">${escapeHtml(collection.brand)} / ${escapeHtml(collection.internalBrandName || "내부브랜드")}</span>` : ""}
          <strong>${escapeHtml(displayTitle)}</strong>
          <p>${escapeHtml(collection.origin || "원산지 미확인")} · ${escapeHtml(collection.color || "색상 미확인")} · ${escapeHtml(collection.style || "디자인 미확인")} · ${escapeHtml(collection.finish || "마감 미확인")}</p>
        </div>
        <div class="taxonomy-mini-grid">
          <span>SKU ${number(collection.products.length)}개</span>
          <span>재고 ${number(collection.stockQty)}</span>
          <span>${escapeHtml(collection.sizes.slice(0, 4).join(" / ") || "규격 미확인")}</span>
          <span>${escapeHtml(collection.priceRange || "금액 미설정")}</span>
          <span>일치도 ${number(collection.searchScore || 0)}</span>
        </div>
        <div class="taxonomy-tag-row">
          ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function groupTaxonomyCollections(items) {
  const map = new Map();
  const isAdmin = getTaxonomyAudienceMode() === "admin";
  for (const item of items) {
    const key = isAdmin ? `${item.internalBrandCode || item.brand}__${item.collectionKey}` : item.collectionKey;
    if (!map.has(key)) {
      map.set(key, {
        key,
        brand: item.internalBrandCode || item.brand,
        internalBrandName: item.internalBrandName,
        title: item.collectionName,
        customerTitle: item.customerCollectionName || item.collectionName,
        products: [],
        sizes: [],
        styles: [],
        spaces: [],
        applications: [],
        functions: [],
        stockQty: 0,
        searchScore: 0,
        minPrice: Number.POSITIVE_INFINITY,
        maxPrice: 0,
        origin: item.originRegion,
        material: item.materialCategory,
        color: item.mainColor,
        style: item.styleCategories[0],
        finish: item.finishPath || item.finishDetail || item.surfaceFinish,
        priceRange: item.priceRange
      });
    }
    const collection = map.get(key);
    collection.products.push(item);
    collection.sizes.push(item.sizeThicknessLabel || item.sizeLabel);
    collection.styles.push(...item.styleCategories);
    collection.spaces.push(...item.spaceCategories);
    collection.applications.push(...item.applicationCategories);
    collection.functions.push(...item.functionCategories);
    collection.stockQty += Number(item.product.stockQty || 0);
    collection.searchScore = Math.max(collection.searchScore, Number(item.taxonomySearchScore || 0));
    const productPrice = getTaxonomySortPrice(item.product);
    if (productPrice > 0) {
      collection.minPrice = Math.min(collection.minPrice, productPrice);
      collection.maxPrice = Math.max(collection.maxPrice, productPrice);
    }
    if (!collection.origin && item.originRegion) collection.origin = item.originRegion;
    if (!collection.material && item.materialCategory) collection.material = item.materialCategory;
    if (!collection.color && item.mainColor) collection.color = item.mainColor;
    if (!collection.style && item.styleCategories[0]) collection.style = item.styleCategories[0];
    if (!collection.finish && (item.finishPath || item.finishDetail || item.surfaceFinish)) collection.finish = item.finishPath || item.finishDetail || item.surfaceFinish;
    if (!collection.priceRange && item.priceRange) collection.priceRange = item.priceRange;
  }
  return [...map.values()]
    .map((collection) => {
      const minPrice = Number.isFinite(collection.minPrice) ? collection.minPrice : 0;
      const maxPrice = Number(collection.maxPrice || 0);
      return {
        ...collection,
        minPrice,
        maxPrice,
        sortPrice: minPrice || maxPrice || 0,
        sizes: unique(collection.sizes.filter(Boolean)),
        styles: unique(collection.styles.filter(Boolean)),
        spaces: unique(collection.spaces.filter(Boolean)),
        applications: unique(collection.applications.filter(Boolean)),
        functions: unique(collection.functions.filter(Boolean))
      };
    });
}

function getTaxonomySortMode() {
  return document.querySelector("#taxonomySortMode")?.value || taxonomySortMode || "match";
}

function getTaxonomySortLabel() {
  return {
    match: "일치도 높은순",
    priceAsc: "금액 낮은순",
    priceDesc: "금액 높은순",
    stockDesc: "재고 많은순"
  }[getTaxonomySortMode()] || "일치도 높은순";
}

function getTaxonomySortPrice(product) {
  return Number(
    product?.priceSortRank
    || product?.retailPrice
    || product?.wholesalePrice
    || product?.gradeAPrice
    || product?.gradeBPrice
    || product?.gradeCPrice
    || 0
  );
}

function sortTaxonomyCollections(collections) {
  const mode = getTaxonomySortMode();
  return [...collections].sort((a, b) => {
    if (mode === "priceAsc") return compareTaxonomyCollectionPrice(a, b, "asc") || compareTaxonomyCollectionsByRelevance(a, b);
    if (mode === "priceDesc") return compareTaxonomyCollectionPrice(a, b, "desc") || compareTaxonomyCollectionsByRelevance(a, b);
    if (mode === "stockDesc") return compareTaxonomyCollectionStock(a, b) || compareTaxonomyCollectionsByRelevance(a, b);
    return compareTaxonomyCollectionsByRelevance(a, b);
  });
}

function compareTaxonomyCollectionPrice(a, b, direction) {
  const aPrice = Number(a.sortPrice || 0);
  const bPrice = Number(b.sortPrice || 0);
  const aMissing = aPrice <= 0;
  const bMissing = bPrice <= 0;
  if (aMissing !== bMissing) return aMissing ? 1 : -1;
  if (aMissing && bMissing) return 0;
  return direction === "asc" ? aPrice - bPrice : bPrice - aPrice;
}

function compareTaxonomyCollectionStock(a, b) {
  return Number(b.stockQty || 0) - Number(a.stockQty || 0);
}

function compareTaxonomyCollectionsByRelevance(a, b) {
  const score = Number(b.searchScore || 0) - Number(a.searchScore || 0);
  if (score) return score;
  const stock = Number(b.stockQty > STOCK_INQUIRY_THRESHOLD_QTY) - Number(a.stockQty > STOCK_INQUIRY_THRESHOLD_QTY);
  if (stock) return stock;
  const sku = b.products.length - a.products.length;
  if (sku) return sku;
  return a.title.localeCompare(b.title, "ko");
}

function normalizeProductForTaxonomy(product) {
  const source = [
    product.name,
    product.modelName,
    product.option,
    product.features,
    product.material,
    product.patternCategory,
    product.finish,
    product.surface,
    product.color,
    product.sourceCategoryName,
    product.maker
  ].filter(Boolean).join(" ");
  const customerSource = [
    product.name,
    product.modelName,
    product.option,
    product.features,
    product.material,
    product.patternCategory,
    product.finish,
    product.surface,
    product.color
  ].filter(Boolean).join(" ");
  const sizeInfo = parseTaxonomySize(product.size || product.name || source);
  const directSurfaceFinish = normalizeDirectTaxonomySurface(product.finish || product.surface);
  const surfaceFinish = directSurfaceFinish || inferTaxonomySurface(source);
  const surfaceTexture = inferTaxonomyTexture(source);
  const antiSlip = /논슬립|미끄럼|nonslip|non-slip|\bns\b|r10|r11|r12/i.test(source);
  const finishModel = getTaxonomyFinishModel(source, surfaceFinish, surfaceTexture, antiSlip);
  const materialCategory = inferTaxonomyMaterial(source);
  const mainColor = inferTaxonomyMainColor(source);
  const styleCategories = inferTaxonomyStyles(source, product.patternCategory);
  const applicationCategories = inferTaxonomyApplications(source, sizeInfo, styleCategories);
  const spaceCategories = inferTaxonomySpaces(source, applicationCategories, styleCategories);
  const functionCategories = inferTaxonomyFunctions(product, source, sizeInfo, applicationCategories);
  const collectionName = makeTaxonomyCollectionName(product, source, sizeInfo, mainColor, surfaceFinish);
  const internalBrandCode = product.kind || product.catalogSource || product.maker || "BR-UNKNOWN";
  const sizeThicknessLabel = makeTaxonomySizeThicknessLabel(sizeInfo.label, 0);
  const priceRange = getTaxonomyPriceRange(product);
  const normalized = {
    id: product.id,
    product,
    internalBrandCode,
    internalBrandName: product.maker || `${internalBrandCode}_INTERNAL`,
    supplierName: product.maker || "",
    brand: internalBrandCode,
    mainCategory: product.productType || "tile",
    collectionName,
    customerCollectionName: collectionName,
    collectionKey: normalizeSearchText(collectionName),
    sizeLabel: sizeInfo.label,
    sizeThicknessLabel,
    thicknessBucket: getTaxonomyThicknessBucket(0),
    sizeGroup: sizeInfo.group,
    widthMm: sizeInfo.width,
    heightMm: sizeInfo.height,
    thicknessMm: 0,
    originRegion: product.countryOfOrigin || "원산지 미확인",
    originCountry: product.countryOfOrigin || "",
    priceRange,
    stockStatus: Number(product.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY ? "재고 있음" : "주문시 재고 문의",
    materialCategory,
    surfaceFinish,
    finishGroup: finishModel.finishGroup,
    finishDetail: finishModel.finishDetail,
    finishPath: finishModel.finishPath,
    surfaceTexture,
    antiSlip,
    mainColor,
    subColor: inferTaxonomySubColor(source, mainColor),
    accentColor: inferTaxonomyAccentColor(source),
    styleCategories,
    applicationCategories,
    spaceCategories,
    functionCategories,
    searchText: ""
  };
  normalized.hasMissingCore = [normalized.sizeLabel, normalized.materialCategory, normalized.mainColor, normalized.surfaceFinish].filter(Boolean).length < 2
    || normalized.spaceCategories.includes("공간 미확인")
    || normalized.applicationCategories.includes("용도 미확인")
    || normalized.styleCategories.includes("스타일 미확인");
  normalized.searchText = normalizeTaxonomySearch([
    customerSource,
    normalized.collectionName,
    normalized.sizeLabel,
    normalized.sizeLabel.replace("x", "*"),
    normalized.sizeLabel.replace("x", " X "),
    normalized.widthMm && normalized.widthMm === normalized.heightMm ? `${normalized.widthMm}각` : "",
    ...normalized.spaceCategories,
    ...normalized.applicationCategories,
    ...normalized.styleCategories,
    normalized.materialCategory,
    normalized.finishGroup,
    normalized.finishDetail,
    normalized.finishPath,
    normalized.surfaceFinish,
    normalized.surfaceTexture,
    normalized.mainColor,
    normalized.subColor,
    normalized.accentColor,
    ...normalized.functionCategories
  ].filter(Boolean).join(" "));
  normalized.customerSearchText = normalized.searchText;
  normalized.adminSearchText = normalizeTaxonomySearch([
    normalized.internalBrandCode,
    normalized.internalBrandName,
    normalized.supplierName,
    source,
    normalized.searchText
  ].filter(Boolean).join(" "));
  return normalized;
}

function parseTaxonomySize(value) {
  const text = String(value || "").replace(/[×＊]/g, "x");
  const square = /(\d{2,4})\s*각/.exec(text);
  const pair = /(\d{2,4})\s*[xX*]\s*(\d{2,4})/.exec(text);
  const width = pair ? Number(pair[1]) : square ? Number(square[1]) : 0;
  const height = pair ? Number(pair[2]) : square ? Number(square[1]) : 0;
  const label = width && height ? `${width}x${height}` : "";
  const maxSide = Math.max(width, height);
  let group = "규격 미확인";
  if (/모자이크|mosaic|hex|dia|penny|원형|육각|다이아|쉐브론|헤링본/i.test(text)) group = "특수형";
  else if (maxSide > 0 && maxSide <= 150) group = "소형 타일";
  else if (maxSide <= 400) group = "중형 타일";
  else if (maxSide <= 1200) group = "대형 타일";
  else if (maxSide > 1200) group = "초대형 / 슬랩";
  return { width, height, label, group };
}

function inferTaxonomySpaces(source, applications, styles) {
  const text = normalizeTaxonomyRaw(source);
  const spaces = [];
  if (/욕실|화장실|bath|샤워|모자이크|논슬립/.test(text)) spaces.push("욕실");
  if (/주방|싱크|백스플래시|backsplash|서브웨이|브릭/.test(text)) spaces.push("주방");
  if (/거실|아트월|포세린|슬랩|마블|스톤|트래버틴/.test(text) || styles.some((style) => ["마블룩", "스톤룩", "트래버틴룩"].includes(style))) spaces.push("거실");
  if (/현관|논슬립|패턴|테라코타|200x200|300x300/.test(text)) spaces.push("현관");
  if (/베란다|발코니|외부|테라스|논슬립|테라코타/.test(text)) spaces.push("베란다");
  if (/카페|상업|호텔|오피스|식당|매장|commercial/.test(text) || applications.includes("상업용 바닥타일")) spaces.push("상업공간");
  if (/외부|외장|테라스|수영장|계단|20t|페데스탈|포장/.test(text)) spaces.push("외부공간");
  return unique(spaces.length ? spaces : ["공간 미확인"]);
}

function inferTaxonomyApplications(source, sizeInfo, styles) {
  const text = normalizeTaxonomyRaw(source);
  const apps = [];
  const accessoryLike = isAccessoryLikeTaxonomyText(text);
  if (/벽|wall|백스플래시|서브웨이|브릭/.test(text)) apps.push("벽타일");
  if (/바닥|floor|논슬립|포세린|자기질|600x600|300x300/.test(text) || sizeInfo.width >= 300 || sizeInfo.height >= 300) apps.push("바닥타일");
  if (/벽바닥|겸용|포세린|porcelain/.test(text)) apps.push("벽·바닥 겸용 타일");
  if (/외부|외장|테라스|outdoor|20t/.test(text)) apps.push("외부용 타일");
  if (/상업|commercial|카페|호텔|매장/.test(text)) apps.push("상업용 바닥타일");
  if (/수영장|pool/.test(text)) apps.push("수영장 타일");
  if (/계단|stair|노즈/.test(text)) apps.push("계단 타일");
  if (!accessoryLike && /모자이크|모자익|mosaic|g\d+|hex|hexagon|dia|penny|랜턴|원형|육각|팔각|페니|헥사|헥사곤|스틱|조약돌|pebble/.test(text)) apps.push("모자이크 타일");
  if (sizeInfo.group === "초대형 / 슬랩") apps.push("슬랩 / 대형타일");
  if (/부자재|접착|줄눈|몰딩|스커팅|코너|엣지/.test(text)) apps.push("부자재 / 마감재");
  if (!apps.length && styles.includes("패턴 / 데코")) apps.push("벽타일");
  return unique(apps.length ? apps : ["용도 미확인"]);
}

function inferTaxonomyStyles(source, existingPattern) {
  const text = normalizeTaxonomyRaw(`${source} ${existingPattern || ""}`);
  const styles = [];
  if (/마블|대리석|marble|calacatta|carrara|statuario|arabescato|onyx|네로|판다|베인/.test(text)) styles.push("마블룩");
  if (/스톤|stone|라임스톤|샌드스톤|슬레이트|화강석|그라니트|자연석/.test(text)) styles.push("스톤룩");
  if (/트래버틴|트라버틴|travertine/.test(text)) styles.push("트래버틴룩");
  if (/콘크리트|시멘트|cement|concrete|노출콘크리트|모던무지/.test(text)) styles.push("콘크리트룩");
  if (/테라조|terrazzo|칩|chip/.test(text)) styles.push("테라조룩");
  if (/우드|wood|오크|월넛|티크|헤링본우드/.test(text)) styles.push("우드룩");
  if (/화이트|아이보리|베이지|그레이|블랙|그린|블루|핑크|옐로우|솔리드|solid|무지/.test(text)) styles.push("컬러 / 솔리드");
  if (/패턴|pattern|데코|엔카우스틱|체크|플라워|지오메트릭|랜덤|포인트|모자이크|mosaic|육각|팔각|다이아|랜턴|원형|레트로/.test(text)) styles.push("패턴 / 데코");
  if (/젤리지|핸드메이드|수공예|유약|불규칙/.test(text)) styles.push("핸드메이드룩");
  if (/브릭|서브웨이|subway|brick|longbrick/.test(text)) styles.push("브릭 / 서브웨이");
  if (/3d|입체|텍스처|리브드|골지|플루티드|스트라이프|양각/.test(text)) styles.push("입체 / 텍스처");
  return unique(styles.length ? styles : ["스타일 미확인"]);
}

function inferTaxonomyMaterial(source) {
  const text = normalizeTaxonomyRaw(source);
  if (/포세린|포쉐린|porcelain|풀바디|컬러바디|글레이즈드/.test(text)) return "포세린";
  if (/세라믹|ceramic/.test(text)) return "세라믹";
  if (/자기질|바닥/.test(text)) return "자기질";
  if (/도기질|벽전용/.test(text)) return "도기질";
  if (/천연석|대리석|라임스톤|슬레이트|화강석|travertine|트래버틴/.test(text)) return "천연석";
  if (/유리|glass/.test(text)) return "유리";
  if (/테라조|terrazzo/.test(text)) return "테라조";
  if (/테라코타/.test(text)) return "테라코타";
  if (/메탈|스테인리스|metal|stainless/.test(text)) return "메탈 / 스테인리스";
  if (/부자재|접착|줄눈|실리콘|시멘트/.test(text)) return "복합소재 / 기타";
  if (!isAccessoryLikeTaxonomyText(text) && /모자이크|모자익|mosaic/.test(text)) return "세라믹";
  return "재질 미확인";
}

function inferTaxonomyFunctions(product, source, sizeInfo, applications) {
  const text = normalizeTaxonomyRaw(source);
  const functions = [];
  const accessoryLike = isAccessoryLikeTaxonomyText(text);
  if (/논슬립|미끄럼|non-slip|nonslip|\bns\b|r10|r11|r12/.test(text)) functions.push("논슬립");
  if (/외부|외장|outdoor|20t|페데스탈/.test(text)) functions.push("외부용");
  if (sizeInfo.group === "초대형 / 슬랩" || /슬랩|대형/.test(text)) functions.push("대형슬랩");
  if (/박판|6t|얇은/.test(text)) functions.push("박판");
  if (/계단|stair/.test(text)) functions.push("계단");
  if (!accessoryLike && /모자이크|모자익|mosaic|육각|팔각|다이아|랜턴|원형|페니|헥사|헥사곤|스틱|조약돌|pebble/.test(text)) functions.push("모자이크");
  if (/상업|commercial|카페|호텔|매장/.test(text) || applications.includes("상업용 바닥타일")) functions.push("상업용");
  if (Number(product.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY) {
    functions.push("재고보유");
    functions.push("빠른출고");
  }
  return unique(functions);
}

function isAccessoryLikeTaxonomyText(text) {
  return /부자재|접착|접착제|줄눈|메지|홈멘트|시멘트|실리콘|방수|아덱스|ardex|grout|adhesive|몰딩|스커팅|코너|엣지|클립|웨지|레벨링/.test(text);
}

function inferTaxonomySurface(source) {
  const text = normalizeTaxonomyRaw(source);
  if (/폴리싱|polished/.test(text)) return "폴리싱";
  if (/라파토|lappato/.test(text)) return "라파토";
  if (/세미무광|반무광|새틴|satin/.test(text)) return "세미무광";
  if (/유광|gloss|glossy/.test(text)) return "유광";
  if (/무광|매트|matt|matte/.test(text)) return "무광";
  if (/러프|rough|r11|r12/.test(text)) return "러프";
  return "";
}

function inferTaxonomyTexture(source) {
  const text = normalizeTaxonomyRaw(source);
  if (/3d|입체|양각/.test(text)) return "3D";
  if (/골지|리브드|플루티드|stripe|스트라이프/.test(text)) return "골지";
  if (/러프|rough|요철|거친|잔다듬/.test(text)) return "러프";
  if (/매끈|유광|폴리싱/.test(text)) return "매끈함";
  return "";
}

function inferTaxonomyMainColor(source) {
  const text = normalizeTaxonomyRaw(source);
  const matches = [
    [/화이트|white|bianco|백색/, "화이트"],
    [/아이보리|ivory|크림|cream|오프화이트/, "아이보리 / 크림"],
    [/베이지|beige|sand|샌드|그레이지|travertine/, "베이지"],
    [/브라운|brown|월넛|walnut/, "브라운"],
    [/다크그레이|차콜|charcoal|darkgrey|darkgray/, "차콜 / 다크그레이"],
    [/그레이|grey|gray|회색|시멘트/, "그레이"],
    [/블랙|black|nero|bk/, "블랙"],
    [/그린|green/, "그린"],
    [/블루|blue|navy/, "블루"],
    [/핑크|pink/, "핑크"],
    [/레드|red/, "레드"],
    [/옐로우|yellow|giallo/, "옐로우"],
    [/테라코타|오렌지|orange|terracotta/, "테라코타 / 오렌지"],
    [/골드|실버|메탈|gold|silver|metal/, "메탈릭"],
    [/믹스|mix|multi|멀티/, "멀티컬러"]
  ];
  return matches.find(([regex]) => regex.test(text))?.[1] || "색상 미확인";
}

function inferTaxonomySubColor(source, mainColor) {
  const text = normalizeTaxonomyRaw(source);
  if (mainColor === "화이트" && /웜|warm/.test(text)) return "웜화이트";
  if (mainColor === "화이트" && /쿨|cool/.test(text)) return "쿨화이트";
  if (mainColor === "베이지" && /트래버틴|travertine/.test(text)) return "트래버틴베이지";
  if (mainColor === "베이지" && /그레이지|greige/.test(text)) return "그레이지";
  if (mainColor === "그레이" && /라이트|light|lg/.test(text)) return "라이트그레이";
  if (mainColor === "그레이" && /시멘트|cement/.test(text)) return "시멘트그레이";
  if (mainColor === "블랙" && /마블|골드|gold/.test(text)) return "블랙마블";
  return "";
}

function inferTaxonomyAccentColor(source) {
  const text = normalizeTaxonomyRaw(source);
  const accents = [];
  if (/골드|gold/.test(text)) accents.push("골드");
  if (/그레이|grey|gray/.test(text)) accents.push("그레이");
  if (/브라운|brown/.test(text)) accents.push("브라운");
  if (/화이트|white/.test(text)) accents.push("화이트");
  if (/블랙|black|nero/.test(text)) accents.push("블랙");
  return accents.join(", ");
}

function makeTaxonomyCollectionName(product, source, sizeInfo, mainColor, surfaceFinish) {
  let name = String(product.name || product.modelName || "이름 미확인")
    .replace(/\([^)]*(유광|무광|반무광|논슬립|NS|matt|matte|gloss|glossy)[^)]*\)/gi, "")
    .replace(/\b\d{2,4}\s*[xX*×]\s*\d{2,4}\b/g, "")
    .replace(/\b(white|black|grey|gray|beige|ivory|brown|green|blue|pink|yellow|red|gold|silver)\b/gi, "")
    .replace(/[._-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || name.length < 3) {
    name = [product.kind, product.option, sizeInfo.label, mainColor, surfaceFinish].filter(Boolean).join(" ");
  }
  return name || "컬렉션 미확인";
}

function normalizeTaxonomyRaw(value) {
  return String(value || "").toLowerCase().replace(/[×＊]/g, "x").replace(/\s+/g, "");
}

function normalizeTaxonomySearch(value) {
  return normalizeSearchText(String(value || "")
    .replace(/중국산/g, "중국")
    .replace(/국산/g, "한국")
    .replace(/국내산/g, "한국")
    .replace(/재고있는/g, "재고")
    .replace(/재고있/g, "재고")
    .replace(/재고보유/g, "재고")
    .replace(/출고가능/g, "재고")
    .replace(/바로출고/g, "재고")
    .replace(/당일출고/g, "재고")
    .replace(/육백각/g, "600x600")
    .replace(/삼백각/g, "300x300")
    .replace(/(\d{3,4})각/g, "$1x$1")
    .replace(/포쉐린/g, "포세린")
    .replace(/화장실/g, "욕실")
    .replace(/샤워부스/g, "욕실")
    .replace(/대리석/g, "마블")
    .replace(/트라버틴/g, "트래버틴")
    .replace(/모자익/g, "모자이크")
    .replace(/모자이크타일/g, "모자이크 타일")
    .replace(/모자이크용/g, "모자이크")
    .replace(/페니라운드/g, "페니 원형")
    .replace(/헥사곤/g, "헥사 육각")
    .replace(/호텔느낌/g, "호텔")
    .replace(/카페느낌/g, "카페")
    .replace(/따뜻한느낌/g, "따뜻한")
    .replace(/매트|맷/g, "무광")
    .replace(/글로시/g, "유광")
    .replace(/미끄럼방지/g, "논슬립")
    .replace(/[×＊]/g, "x"));
}

function parseTaxonomyNaturalSearch(value, audience = "customer") {
  const raw = String(value || "").trim();
  if (!raw) return { active: false, tokenGroups: [] };
  const normalizedRaw = normalizeTaxonomySearch(raw);
  const compactRaw = normalizeTaxonomyRaw(raw);
  const intent = {
    active: true,
    raw,
    tokenGroups: [],
    origins: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.origins),
    spaces: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.spaces),
    applications: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.applications),
    colors: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.colors),
    styles: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.styles),
    patternDetails: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.patternDetails),
    finishes: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.finishes),
    textures: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.textures),
    materials: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.materials),
    moods: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.moods),
    specialTypes: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.specialTypes),
    sizes: detectTaxonomySizes(raw),
    priceRanges: detectTaxonomyValues(compactRaw, TAXONOMY_QUERY_DICTIONARY.priceRanges),
    antiSlipRequired: /논슬립|미끄럼방지|안미끄|안전한바닥|r10|r11|r12|nonslip|non-slip/.test(compactRaw),
    stockRequired: /재고|보유|빠른출고|출고가능|있는|있어/.test(compactRaw) && !/재고없|품절|없는/.test(compactRaw),
    stockEmpty: /재고없|품절|없는/.test(compactRaw),
    internalBrands: audience === "admin" ? detectTaxonomyInternalBrands(raw) : [],
    freeTokens: []
  };

  const consumed = new Set([
    ...intent.origins.map(normalizeTaxonomySearch),
    ...intent.spaces.map(normalizeTaxonomySearch),
    ...intent.applications.map(normalizeTaxonomySearch),
    ...intent.colors.map(normalizeTaxonomySearch),
    ...intent.styles.map(normalizeTaxonomySearch),
    ...intent.patternDetails.map(normalizeTaxonomySearch),
    ...intent.finishes.map(normalizeTaxonomySearch),
    ...intent.textures.map(normalizeTaxonomySearch),
    ...intent.materials.map(normalizeTaxonomySearch),
    ...intent.moods.map(normalizeTaxonomySearch),
    ...intent.specialTypes.map(normalizeTaxonomySearch),
    ...intent.sizes.map(normalizeTaxonomySearch),
    ...intent.priceRanges.map(normalizeTaxonomySearch),
    ...intent.internalBrands.map(normalizeTaxonomySearch),
    "재고", "보유", "빠른출고", "출고가능", "있는", "있어", "타일", "상품", "제품"
  ]);
  const rawTokens = raw
    .split(/[\s,./·]+/)
    .map((part) => normalizeTaxonomySearch(part.replace(/(으로|로|을|를|이|가|은|는|의|도|만|좀|중|인|한|있는|없는|보여줘|찾아줘|추천해줘|추천|검색)$/g, "")))
    .filter((token) => token && token.length >= 2 && !consumed.has(token) && !TAXONOMY_QUERY_STOPWORDS.has(token));

  intent.freeTokens = rawTokens;
  intent.tokenGroups = unique([
    ...intent.origins,
    ...intent.spaces,
    ...intent.applications,
    ...intent.colors,
    ...intent.styles,
    ...intent.patternDetails,
    ...intent.finishes,
    ...intent.textures,
    ...intent.materials,
    ...intent.moods,
    ...intent.specialTypes,
    ...intent.sizes,
    ...intent.priceRanges,
    ...rawTokens
  ]).map(makeTaxonomyTokenGroup);

  if (!intent.tokenGroups.length && normalizedRaw) {
    intent.tokenGroups = [makeTaxonomyTokenGroup(normalizedRaw)];
  }
  return intent;
}

function matchesTaxonomySearchIntent(item, intent, searchText = item.searchText, audience = "customer") {
  if (!intent?.active) return true;
  if (intent.stockRequired && Number(item.product.stockQty || 0) <= STOCK_INQUIRY_THRESHOLD_QTY) return false;
  if (intent.stockEmpty && Number(item.product.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY) return false;
  if (intent.internalBrands?.length && audience === "admin" && !intent.internalBrands.includes(item.internalBrandCode)) return false;
  if (intent.sizes?.length && !intent.sizes.some((value) => taxonomySizeMatches(item, value))) return false;
  if (isTaxonomyMosaicIntent(intent) && !isTaxonomyMosaicItem(item, searchText)) return false;

  if (!intent.tokenGroups?.length) return true;
  const matched = intent.tokenGroups.filter((group) => group.some((token) => String(searchText || "").includes(token))).length;
  const required = intent.tokenGroups.length <= 2 ? intent.tokenGroups.length : Math.ceil(intent.tokenGroups.length * 0.45);
  return matched >= required;
}

function isTaxonomyMosaicIntent(intent) {
  const raw = normalizeTaxonomySearch(intent?.raw || "");
  return (intent?.applications || []).includes("모자이크 타일")
    || (intent?.patternDetails || []).includes("모자이크")
    || (intent?.specialTypes || []).includes("모자이크")
    || /모자이크|모자익|mosaic|페니|헥사|헥사곤|육각|팔각|랜턴|다이아|스틱|조약돌|pebble|penny|hex/.test(raw);
}

function isTaxonomyMosaicItem(item, searchText = "") {
  const text = normalizeTaxonomySearch([
    searchText,
    item.patternDetail,
    ...(item.applicationCategories || []),
    ...(item.functionCategories || [])
  ].filter(Boolean).join(" "));
  if (/부자재|접착|접착제|줄눈|메지|홈멘트|시멘트|실리콘|방수|아덱스|ardex|grout|adhesive/.test(text)) return false;
  return (item.applicationCategories || []).includes("모자이크 타일")
    || (item.functionCategories || []).includes("모자이크")
    || /모자이크|모자익|mosaic|페니|헥사|헥사곤|육각|팔각|랜턴|다이아|스틱|조약돌|pebble|penny|hex/.test(text);
}

function detectTaxonomyValues(compactRaw, entries) {
  return unique(entries.filter((entry) => entry.terms.some((term) => compactRaw.includes(normalizeTaxonomyRaw(term)))).map((entry) => entry.value));
}

function detectTaxonomySizes(raw) {
  const text = String(raw || "").replace(/[×＊]/g, "x");
  const sizes = [];
  const explicit = text.match(/(\d{2,4})\s*[xX*]\s*(\d{2,4})/);
  if (explicit) sizes.push(`${Number(explicit[1])}x${Number(explicit[2])}`);
  const square = text.match(/(\d{2,4})\s*각/);
  if (square) sizes.push(`${Number(square[1])}x${Number(square[1])}`);
  const spaced = text.match(/(\d{3,4})\s+(\d{3,4})/);
  if (!sizes.length && spaced) sizes.push(`${Number(spaced[1])}x${Number(spaced[2])}`);
  return unique(sizes);
}

function detectTaxonomyInternalBrands(raw) {
  const source = String(raw || "").toUpperCase();
  return unique(normalizedTaxonomyProducts
    .map((item) => item.internalBrandCode)
    .filter((code) => code && new RegExp(`(^|[^A-Z0-9])${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Z0-9]|$)`).test(source)));
}

function makeTaxonomyTokenGroup(value) {
  const base = normalizeTaxonomySearch(value);
  const aliases = [base];
  const aliasMap = [
    ["중국", ["중국산", "china", "cn"]],
    ["한국", ["국산", "국내산", "korea", "kr"]],
    ["베이지", ["beige", "beg", "샌드", "그레이지"]],
    ["그레이", ["grey", "gray", "회색", "gr"]],
    ["화이트", ["white", "백색", "wht"]],
    ["블랙", ["black", "검정", "blk", "nero"]],
    ["마블룩", ["마블", "대리석", "marble", "카라라", "칼라카타"]],
    ["스톤룩", ["스톤", "stone", "석재"]],
    ["트래버틴룩", ["트래버틴", "트라버틴", "travertine"]],
    ["콘크리트룩", ["콘크리트", "시멘트", "cement", "concrete"]],
    ["테라조룩", ["테라조", "terrazzo"]],
    ["우드룩", ["우드", "wood", "나뭇결"]],
    ["패턴 / 데코", ["패턴", "데코", "pattern"]],
    ["모자이크 타일", ["모자이크", "모자이크타일", "mosaic", "페니", "penny", "헥사", "헥사곤", "hex", "육각", "팔각", "랜턴", "다이아", "스틱", "조약돌", "pebble"]],
    ["모자이크", ["모자이크", "모자이크타일", "mosaic", "페니", "penny", "헥사", "헥사곤", "hex", "육각", "팔각", "랜턴", "다이아", "스틱", "조약돌", "pebble"]],
    ["메탈룩", ["메탈", "metal", "티타늄", "알루미늄"]],
    ["글라스룩", ["글라스", "glass", "유리"]],
    ["엔카우스틱 / 시멘트타일", ["엔카우스틱", "시멘트타일", "빈티지패턴"]],
    ["유광", ["glossy", "gloss", "글로시", "gls"]],
    ["무광", ["matte", "matt", "매트", "맷", "mat"]],
    ["논슬립", ["미끄럼방지", "nonslip", "non-slip", "nsp"]],
    ["바닥타일", ["바닥", "floor"]],
    ["벽타일", ["벽", "wall"]],
    ["벽·바닥 겸용 타일", ["겸용", "벽바닥"]]
  ];
  for (const [canonical, values] of aliasMap) {
    const canonicalToken = normalizeTaxonomySearch(canonical);
    const valueTokens = values.map(normalizeTaxonomySearch);
    if (base === canonicalToken || valueTokens.includes(base)) aliases.push(canonicalToken, ...valueTokens);
  }
  if (/^\d{3,4}x\d{3,4}$/.test(base)) aliases.push(base.replace("x", "*"), base.replace("x", "x"));
  return unique(aliases.filter(Boolean));
}

const TAXONOMY_QUERY_STOPWORDS = new Set([
  "찾아줘", "찾아", "검색", "검색해줘", "보여줘", "추천", "추천해줘", "해줘", "좀", "타일", "상품", "제품", "있어", "있는", "으로", "에서"
].map(normalizeTaxonomySearch));

const TAXONOMY_QUERY_DICTIONARY = {
  origins: [
    { value: "중국", terms: ["중국", "중국산", "china", "cn"] },
    { value: "한국", terms: ["한국", "국산", "국내산", "대한민국", "korea", "kr"] },
    { value: "이탈리아", terms: ["이탈리아", "이태리", "italy"] },
    { value: "스페인", terms: ["스페인", "spain"] },
    { value: "인도", terms: ["인도", "india"] },
    { value: "베트남", terms: ["베트남", "vietnam"] },
    { value: "유럽", terms: ["유럽", "europe"] }
  ],
  spaces: [
    { value: "욕실", terms: ["욕실", "화장실", "샤워부스", "bathroom", "bath"] },
    { value: "주방", terms: ["주방", "싱크대", "백스플래시", "backsplash", "kitchen"] },
    { value: "거실", terms: ["거실", "아트월", "living"] },
    { value: "현관", terms: ["현관", "입구", "entrance"] },
    { value: "베란다", terms: ["베란다", "발코니", "balcony"] },
    { value: "상업공간", terms: ["상업", "카페", "호텔", "매장", "식당", "오피스", "commercial"] },
    { value: "외부공간", terms: ["외부", "테라스", "옥상", "정원", "outdoor"] }
  ],
  applications: [
    { value: "바닥타일", terms: ["바닥", "floor", "플로어"] },
    { value: "벽타일", terms: ["벽", "wall", "벽용"] },
    { value: "벽·바닥 겸용 타일", terms: ["겸용", "벽바닥", "벽 바닥"] },
    { value: "외부용 타일", terms: ["외부", "외장", "테라스", "outdoor"] },
    { value: "모자이크 타일", terms: ["모자이크", "모자이크타일", "모자익", "mosaic", "페니", "페니라운드", "penny", "헥사", "헥사곤", "hex", "육각", "팔각", "랜턴", "다이아", "스틱", "조약돌", "pebble"] },
    { value: "슬랩 / 대형타일", terms: ["슬랩", "빅슬랩", "대형", "초대형"] },
    { value: "계단 타일", terms: ["계단", "stair"] }
  ],
  colors: [
    { value: "화이트", terms: ["화이트", "백색", "white", "wht"] },
    { value: "아이보리 / 크림", terms: ["아이보리", "크림", "ivory", "cream"] },
    { value: "베이지", terms: ["베이지", "beige", "샌드", "sand", "그레이지"] },
    { value: "브라운", terms: ["브라운", "갈색", "brown"] },
    { value: "그레이", terms: ["그레이", "회색", "grey", "gray"] },
    { value: "차콜 / 다크그레이", terms: ["차콜", "다크그레이", "darkgray", "darkgrey"] },
    { value: "블랙", terms: ["블랙", "검정", "black", "nero"] },
    { value: "그린", terms: ["그린", "초록", "green"] },
    { value: "블루", terms: ["블루", "파랑", "blue", "navy"] },
    { value: "핑크", terms: ["핑크", "분홍", "pink"] },
    { value: "레드", terms: ["레드", "빨강", "red"] },
    { value: "옐로우", terms: ["옐로우", "노랑", "yellow"] },
    { value: "테라코타 / 오렌지", terms: ["테라코타", "오렌지", "orange", "terracotta"] }
  ],
  styles: [
    { value: "마블룩", terms: ["마블", "마블룩", "대리석", "marble", "카라라", "칼라카타", "베인"] },
    { value: "스톤룩", terms: ["스톤", "스톤룩", "석재", "stone", "라임스톤"] },
    { value: "트래버틴룩", terms: ["트래버틴", "트라버틴", "travertine"] },
    { value: "콘크리트룩", terms: ["콘크리트", "시멘트", "cement", "concrete"] },
    { value: "테라조룩", terms: ["테라조", "terrazzo"] },
    { value: "우드룩", terms: ["우드", "wood", "나뭇결", "오크", "월넛"] },
    { value: "컬러 / 솔리드", terms: ["솔리드", "무지", "단색", "solid"] },
    { value: "패턴 / 데코", terms: ["패턴", "데코", "pattern", "포인트", "장식"] },
    { value: "브릭 / 서브웨이", terms: ["브릭", "서브웨이", "brick", "subway"] },
    { value: "입체 / 텍스처", terms: ["입체", "3d", "텍스처", "골지", "리브드"] },
    { value: "메탈룩", terms: ["메탈", "metal", "티타늄", "알루미늄", "로비"] },
    { value: "글라스룩", terms: ["글라스", "glass", "유리", "반짝"] }
  ],
  patternDetails: [
    { value: "칼라카타", terms: ["칼라카타", "calacatta", "골드베인"] },
    { value: "카라라", terms: ["카라라", "carrara", "잔잔한베인"] },
    { value: "스타투아리오", terms: ["스타투아리오", "statuario"] },
    { value: "베인컷", terms: ["베인컷", "직선결", "세로결"] },
    { value: "크로스컷", terms: ["크로스컷", "구름결", "자연결"] },
    { value: "라임스톤", terms: ["라임스톤", "limestone", "잔결"] },
    { value: "슬레이트", terms: ["슬레이트", "slate", "층무늬"] },
    { value: "시멘트", terms: ["시멘트", "cement", "마이크로시멘트"] },
    { value: "테라조", terms: ["테라조", "terrazzo", "잔칩", "대칩"] },
    { value: "솔리드", terms: ["솔리드", "무지", "단색"] },
    { value: "브릭", terms: ["브릭", "brick", "롱브릭"] },
    { value: "서브웨이", terms: ["서브웨이", "subway"] },
    { value: "모자이크", terms: ["모자이크", "모자이크타일", "모자익", "mosaic", "페니", "페니라운드", "penny", "헥사", "헥사곤", "hex", "육각", "팔각", "랜턴", "다이아", "스틱", "조약돌", "pebble"] }
  ],
  finishes: [
    { value: "유광", terms: ["유광", "글로시", "gloss", "glossy", "gls"] },
    { value: "무광", terms: ["무광", "매트", "맷", "matte", "matt", "mat"] },
    { value: "반무광", terms: ["반무광", "세미무광", "새틴", "satin", "라파토", "lappato"] },
    { value: "폴리싱", terms: ["폴리싱", "polishing", "polished"] },
    { value: "논슬립", terms: ["논슬립", "미끄럼방지", "r10", "r11", "r12", "nonslip", "non-slip"] },
    { value: "혼드", terms: ["혼드", "honed"] },
    { value: "내추럴", terms: ["내추럴", "natural"] },
    { value: "엠보", terms: ["엠보", "emboss", "양각"] },
    { value: "3D", terms: ["3d", "입체"] },
    { value: "텍스쳐", terms: ["텍스쳐", "텍스처", "texture", "러프", "rough", "요철", "거친", "골지", "리브드", "플루티드"] }
  ],
  textures: [
    { value: "매끈함", terms: ["매끈", "스무스", "smooth"] },
    { value: "텍스쳐", terms: ["거친", "러프", "요철", "rough", "텍스쳐", "텍스처", "texture"] },
    { value: "3D", terms: ["3d", "입체", "양각"] },
    { value: "엠보", terms: ["엠보", "emboss", "양각"] },
    { value: "골지", terms: ["골지", "리브드", "플루티드", "스트라이프"] }
  ],
  materials: [
    { value: "포세린", terms: ["포세린", "포쉐린", "porcelain"] },
    { value: "세라믹", terms: ["세라믹", "ceramic"] },
    { value: "자기질", terms: ["자기질"] },
    { value: "도기질", terms: ["도기질"] },
    { value: "석기질", terms: ["석기질", "stoneware", "보도블럭", "보도블록"] },
    { value: "석재 타일", terms: ["석재", "석재타일", "stone tile", "돌성분"] },
    { value: "복합 타일", terms: ["복합", "복합타일", "compound"] },
    { value: "복합대리석", terms: ["복합대리석", "엔지니어드스톤", "engineered stone", "인조석"] },
    { value: "시멘트 타일", terms: ["시멘트타일", "엔카우스틱", "cement tile"] },
    { value: "메탈", terms: ["메탈", "metal", "티타늄", "알루미늄", "스테인리스"] },
    { value: "천연석", terms: ["천연석", "대리석", "라임스톤", "슬레이트"] },
    { value: "유리", terms: ["유리", "glass"] },
    { value: "테라조", terms: ["테라조", "terrazzo"] }
  ],
  moods: [
    { value: "고급스러운", terms: ["고급", "프리미엄", "럭셔리", "호텔느낌", "호텔스타일"] },
    { value: "따뜻한", terms: ["따뜻", "웜톤", "포근", "warm"] },
    { value: "내추럴", terms: ["내추럴", "자연스러운", "natural"] },
    { value: "모던", terms: ["모던", "modern"] },
    { value: "미니멀", terms: ["미니멀", "minimal"] },
    { value: "카페", terms: ["카페", "cafe"] },
    { value: "호텔", terms: ["호텔", "hotel"] }
  ],
  specialTypes: [
    { value: "논슬립", terms: ["논슬립", "미끄럼방지", "r10", "r11", "r12"] },
    { value: "20T 외부용", terms: ["20t", "20mm", "페데스탈", "옥상", "정원", "외부보행"] },
    { value: "수영장용", terms: ["수영장", "pool", "스파", "풀사이드", "침수"] },
    { value: "계단", terms: ["계단", "스텝", "노즈", "홈파기", "stair"] },
    { value: "빅슬랩", terms: ["빅슬랩", "대형판", "large format", "1200x2400", "1600x3200"] },
    { value: "박판", terms: ["박판", "thin panel", "덧방", "6t", "6.5t"] },
    { value: "항균", terms: ["항균", "항바이러스", "위생", "병원", "학교"] },
    { value: "광촉매 / 셀프클리닝", terms: ["광촉매", "셀프클리닝", "자가세정", "공기정화", "탈취"] },
    { value: "점자 / 유도", terms: ["점자", "유도타일", "시각장애", "촉지도"] },
    { value: "ESD", terms: ["esd", "정전기", "서버실", "전자장비실"] },
    { value: "내산 / 내화학", terms: ["내산", "내화학", "화학공장", "실험실", "식품공장"] },
    { value: "고하중", terms: ["고하중", "주차장", "parking", "창고", "물류"] }
  ],
  priceRanges: [
    { value: "1만원 미만", terms: ["저가", "만원미만", "1만원미만"] },
    { value: "1만-3만원", terms: ["1만", "2만", "3만원이하", "저렴"] },
    { value: "3만-5만원", terms: ["3만", "4만", "5만원이하"] },
    { value: "5만-10만원", terms: ["5만", "6만", "7만", "8만", "9만", "10만원이하"] },
    { value: "10만원 이상", terms: ["고가", "프리미엄", "10만원이상"] }
  ]
};

function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null && value !== "")));
}

function sortTaxonomyValues(values) {
  const order = [
    "욕실", "주방", "거실", "현관", "베란다", "상업공간", "외부공간", "공간 미확인",
    "벽타일", "바닥타일", "벽·바닥 겸용 타일", "외부용 타일", "상업용 바닥타일", "수영장 타일", "계단 타일", "모자이크 타일", "슬랩 / 대형타일", "부자재 / 마감재", "용도 미확인",
    "마블룩", "스톤룩", "트래버틴룩", "콘크리트룩", "테라조룩", "우드룩", "컬러 / 솔리드", "패턴 / 데코", "핸드메이드룩", "브릭 / 서브웨이", "입체 / 텍스처", "스타일 미확인",
    "소형 타일", "중형 타일", "대형 타일", "초대형 / 슬랩", "특수형", "규격 미확인",
    "6T 이하", "7~8T", "9~10T", "11~12T", "20T", "기타",
    "유광", "반무광", "폴리싱", "무광", "논슬립", "혼드", "내추럴", "엠보", "3D", "텍스쳐", "마감 미확인",
    "포세린", "세라믹", "자기질", "도기질", "천연석", "유리", "테라조", "테라코타", "메탈 / 스테인리스", "복합소재 / 기타", "재질 미확인",
    "논슬립", "외부용", "대형슬랩", "박판", "계단", "모자이크", "상업용", "재고보유", "빠른출고",
    "화이트", "아이보리 / 크림", "베이지", "브라운", "그레이", "차콜 / 다크그레이", "블랙", "그린", "블루", "핑크", "레드", "옐로우", "테라코타 / 오렌지", "멀티컬러", "메탈릭", "색상 미확인"
  ];
  return unique(values).sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return String(a).localeCompare(String(b), "ko", { numeric: true });
  });
}

async function handleTileFinderFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = document.querySelector("#tileFinderStatus");
  const previewWrap = document.querySelector("#tileFinderPreviewWrap");
  const preview = document.querySelector("#tileFinderPreview");
  const results = document.querySelector("#tileFinderResults");
  const tags = document.querySelector("#tileFinderTags");

  if (!file.type.startsWith("image/")) {
    if (status) status.textContent = "이미지 파일만 업로드할 수 있습니다.";
    return;
  }

  if (status) status.textContent = "사진을 읽는 중입니다.";
  if (results) {
    results.classList.add("hidden");
    results.innerHTML = "";
  }
  hideTileFinderResultFilters();
  if (tags) tags.innerHTML = "";
  tileFinderMatches = [];
  tileFinderResultsPage = 1;
  tileFinderResultFilters = createEmptyTileFinderResultFilters();
  tileFinderEditableAnalysis = createEmptyTileFinderEditableAnalysis();
  hideTileFinderAnalysisPanel();

  const imageDataUrl = await readImageFile(file, 1200, 0.82);
  if (!imageDataUrl) {
    if (status) status.textContent = "사진을 읽지 못했습니다.";
    return;
  }
  tileFinderImageDataUrl = imageDataUrl;
  tileFinderImageFileName = file.name || "";
  if (preview && previewWrap) {
    preview.src = imageDataUrl;
    previewWrap.classList.remove("hidden");
  }

  if (status) status.textContent = "사진이 준비됐습니다. 사이즈를 모르시면 '사이즈 모름'을 선택하고 표면을 선택한 뒤 검색하세요.";
  if (tags) tags.innerHTML = `<span>검색 전</span>`;
  event.target.value = "";
}

async function handleTaxonomyImageSearchFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = document.querySelector("#taxonomyImageSearchStatus");
  const previewWrap = document.querySelector("#taxonomyImagePreviewWrap");
  const preview = document.querySelector("#taxonomyImagePreview");
  const results = document.querySelector("#taxonomyImageResults");
  const tags = document.querySelector("#taxonomyImageTags");

  if (!file.type.startsWith("image/")) {
    if (status) status.textContent = "이미지 파일만 업로드할 수 있습니다.";
    return;
  }

  if (status) status.textContent = "사진을 읽는 중입니다.";
  if (results) {
    results.classList.add("hidden");
    results.innerHTML = "";
  }
  if (tags) tags.innerHTML = "";
  taxonomyImageMatches = [];
  taxonomyImageResultsPage = 1;

  const imageDataUrl = await readImageFile(file, 1200, 0.82);
  if (!imageDataUrl) {
    if (status) status.textContent = "사진을 읽지 못했습니다.";
    return;
  }

  taxonomyImageSearchDataUrl = imageDataUrl;
  taxonomyImageSearchFileName = file.name || "";
  if (preview && previewWrap) {
    preview.src = imageDataUrl;
    previewWrap.classList.remove("hidden");
  }
  if (tags) tags.innerHTML = `<span>사진 준비됨</span>`;
  if (status) status.textContent = "사진이 준비됐습니다. 규격을 모르시면 '사이즈 모름'을 선택하고 표면을 선택한 뒤 검색하세요.";
  event.target.value = "";
}

function clearTaxonomyImageSearch() {
  taxonomyImageSearchDataUrl = "";
  taxonomyImageSearchFileName = "";
  taxonomyImageMatches = [];
  taxonomyImageResultsPage = 1;
  const previewWrap = document.querySelector("#taxonomyImagePreviewWrap");
  const preview = document.querySelector("#taxonomyImagePreview");
  const results = document.querySelector("#taxonomyImageResults");
  const tags = document.querySelector("#taxonomyImageTags");
  const status = document.querySelector("#taxonomyImageSearchStatus");
  if (preview) preview.removeAttribute("src");
  if (previewWrap) previewWrap.classList.add("hidden");
  if (results) {
    results.classList.add("hidden");
    results.innerHTML = "";
  }
  if (tags) tags.innerHTML = "";
  if (status) status.textContent = "사진 없이 AI검색 가능";
}

async function runTaxonomyImageSearch() {
  const status = document.querySelector("#taxonomyImageSearchStatus");
  const results = document.querySelector("#taxonomyImageResults");
  const tags = document.querySelector("#taxonomyImageTags");
  const sizeSelection = getTaxonomyAssistSizeSelection();
  const size = getTaxonomyAssistSize();
  const sizeLabel = getTaxonomyAssistSizeLabel();
  const finish = getTaxonomyAssistFinish();
  const query = document.querySelector("#taxonomySearch")?.value || "";

  if (!taxonomyImageSearchDataUrl) return;
  if (!sizeSelection) {
    if (status) status.textContent = "규격을 모르시면 규격에서 '사이즈 모름'을 선택해주세요.";
    if (results) results.classList.add("hidden");
    return;
  }
  if (!finish || finish === "all") {
    if (status) status.textContent = "이미지검색은 같은 표면만 찾도록 유광 또는 무광을 선택해야 합니다.";
    if (results) results.classList.add("hidden");
    return;
  }

  if (results) {
    results.classList.add("hidden");
    results.innerHTML = "";
  }
  hideTileFinderResultFilters();
  if (tags) {
    tags.innerHTML = [
      taxonomyImageSearchFileName ? `사진 ${taxonomyImageSearchFileName}` : "사진 업로드됨",
      `AI검색 ${query || "전체"}`,
      `규격 ${size || sizeLabel}`,
      `표면 ${finish}`
    ].map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  }
  if (status) status.textContent = `${size || sizeLabel} · ${finish} 조건으로 이미지와 가장 유사한 타일을 찾는 중입니다.`;

  try {
    const payload = await requestJson("/api/tile-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataUrl: taxonomyImageSearchDataUrl,
        size,
        sizeUnknown: sizeSelection === UNKNOWN_TILE_SIZE_VALUE,
        finish,
        query,
        searchMode: "strict",
        allSimilar: true
      })
    }, { retries: 0, timeoutMs: 120000 });

    taxonomyImageMatches = payload.matches || [];
    taxonomyImageResultsPage = 1;
    products = mergeProducts(products, taxonomyImageMatches.map(mapPublicProductForClient));
    renderTaxonomyImageAnalysis(payload.analysis || {});
    renderTaxonomyImageResults(taxonomyImageMatches);
    if (status) status.textContent = taxonomyImageMatches.length
      ? `${size || sizeLabel} · ${finish} 조건에서 이미지 유사 타일 ${taxonomyImageMatches.length}개를 찾았습니다.`
      : `${size || sizeLabel} · ${finish} 조건의 이미지 유사 타일을 찾지 못했습니다. 표면 조건 또는 DB 이미지를 점검해주세요.`;
  } catch (error) {
    if (status) status.textContent = error.message || "이미지 통합검색에 실패했습니다.";
  }
}

function renderTaxonomyImageAnalysis(analysis) {
  const tags = document.querySelector("#taxonomyImageTags");
  if (!tags) return;
  const values = [
    taxonomyImageSearchFileName ? `사진 ${taxonomyImageSearchFileName}` : "사진 업로드됨",
    analysis.requestedSize ? `규격 ${analysis.requestedSize}` : "",
    analysis.sizeUnknown ? "규격 사이즈 모름" : "",
    analysis.requestedFinish ? `표면 ${analysis.requestedFinish}` : "",
    ...(analysis.colors || []).map((item) => `색상 ${item}`),
    ...(analysis.patterns || []).map((item) => `패턴 ${item}`),
    ...(analysis.shapes || []).map((item) => `형태 ${item}`),
    ...(analysis.motifs || []).map((item) => `무늬 ${item}`)
  ].filter(Boolean);
  tags.innerHTML = values.map((item) => `<span>${escapeHtml(item)}</span>`).join("")
    || `<span>분석값 없음</span>`;
}

function renderTaxonomyImageResults(matches, options = {}) {
  const results = document.querySelector("#taxonomyImageResults");
  if (!results) return;
  if (!options.preservePage) taxonomyImageResultsPage = 1;
  const totalPages = Math.max(1, Math.ceil(matches.length / IMAGE_SEARCH_RESULTS_PAGE_SIZE));
  taxonomyImageResultsPage = Math.min(Math.max(taxonomyImageResultsPage, 1), totalPages);
  const startIndex = (taxonomyImageResultsPage - 1) * IMAGE_SEARCH_RESULTS_PAGE_SIZE;
  const pageMatches = matches.slice(startIndex, startIndex + IMAGE_SEARCH_RESULTS_PAGE_SIZE);
  results.classList.toggle("hidden", !matches.length);
  results.innerHTML = matches.length ? [
    `<div class="taxonomy-image-results-heading">
      <strong>이미지 유사 결과</strong>
      <span>총 ${number(matches.length)}개 · ${number(taxonomyImageResultsPage)}/${number(totalPages)}페이지 · 20개씩 표시</span>
    </div>`,
    ...pageMatches.map(renderTaxonomyImageMatchCard),
    renderImageSearchPagination(taxonomyImageResultsPage, totalPages, "taxonomy")
  ].join("") : "";
}

function renderTaxonomyImageMatchCard(product) {
  return `
    <article class="tile-match-card">
      <button class="product-detail-trigger" type="button" data-view-product="${escapeHtml(product.id)}" aria-label="${escapeHtml(product.name)} 상세 보기">
        ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />` : `<div class="product-thumb-empty">이미지 없음</div>`}
      </button>
      <strong>${escapeHtml(product.name || "-")}</strong>
      <span>${escapeHtml(product.size || "-")} · ${escapeHtml(product.finish || product.option || "-")}</span>
      <span>재고 ${escapeHtml(formatStockQuantity(product))}</span>
      <small>${escapeHtml((product.matchReasons || []).slice(0, 3).join(" · ") || "이미지 유사 후보")}</small>
      <span class="tile-match-score">유사도 ${number(product.matchScore || 0)}</span>
      <div class="tile-match-actions">
        <button class="secondary-action" type="button" data-view-product="${escapeHtml(product.id)}">상세</button>
        <button class="primary-action" type="button" data-add-product="${escapeHtml(product.id)}">담기</button>
      </div>
    </article>
  `;
}

function renderImageSearchPagination(currentPage, totalPages, mode) {
  if (totalPages <= 1) return "";
  const dataName = mode === "taxonomy" ? "taxonomy-image-page" : "tile-finder-page";
  const buttons = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  buttons.push(`<button type="button" data-${dataName}="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>이전</button>`);
  if (start > 1) {
    buttons.push(`<button type="button" data-${dataName}="1">1</button>`);
    if (start > 2) buttons.push(`<span class="product-pagination-ellipsis">...</span>`);
  }
  for (let page = start; page <= end; page += 1) {
    buttons.push(`<button type="button" class="${page === currentPage ? "active" : ""}" data-${dataName}="${page}">${number(page)}</button>`);
  }
  if (end < totalPages) {
    if (end < totalPages - 1) buttons.push(`<span class="product-pagination-ellipsis">...</span>`);
    buttons.push(`<button type="button" data-${dataName}="${totalPages}">${number(totalPages)}</button>`);
  }
  buttons.push(`<button type="button" data-${dataName}="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>다음</button>`);
  buttons.push(`<span class="product-pagination-summary">${number(currentPage)} / ${number(totalPages)}</span>`);
  return `<div class="product-pagination image-search-pagination">${buttons.join("")}</div>`;
}

function bindImageSearchSwipeNavigation(selector, mode) {
  const container = document.querySelector(selector);
  if (!container) return;
  let start = null;
  container.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    start = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now()
    };
  }, { passive: true });
  container.addEventListener("pointercancel", () => {
    start = null;
  });
  container.addEventListener("pointerup", (event) => {
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const elapsed = Date.now() - start.time;
    start = null;
    if (elapsed > 1400) return;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
    const moved = mode === "taxonomy"
      ? moveTaxonomyImageResultsPage(deltaX < 0 ? 1 : -1)
      : moveTileFinderResultsPage(deltaX < 0 ? 1 : -1);
    if (!moved) return;
    suppressImageSearchClickBriefly();
    event.preventDefault();
  });
}

function moveTaxonomyImageResultsPage(delta) {
  const totalPages = getImageSearchTotalPages(taxonomyImageMatches);
  if (totalPages <= 1) return false;
  const nextPage = Math.min(Math.max(taxonomyImageResultsPage + delta, 1), totalPages);
  if (nextPage === taxonomyImageResultsPage) return false;
  taxonomyImageResultsPage = nextPage;
  renderTaxonomyImageResults(taxonomyImageMatches, { preservePage: true });
  return true;
}

function moveTileFinderResultsPage(delta) {
  const totalPages = getImageSearchTotalPages(tileFinderMatches, TILE_FINDER_RESULTS_PAGE_SIZE);
  if (totalPages <= 1) return false;
  const nextPage = Math.min(Math.max(tileFinderResultsPage + delta, 1), totalPages);
  if (nextPage === tileFinderResultsPage) return false;
  tileFinderResultsPage = nextPage;
  renderTileFinderResults(tileFinderMatches, { preservePage: true });
  return true;
}

function getImageSearchTotalPages(matches, pageSize = IMAGE_SEARCH_RESULTS_PAGE_SIZE) {
  return Math.max(1, Math.ceil((matches || []).length / pageSize));
}

function suppressImageSearchClickBriefly() {
  suppressImageSearchClickUntil = Date.now() + 350;
}

function shouldSuppressImageSearchClick() {
  return Date.now() < suppressImageSearchClickUntil;
}

function syncTileFinderCustomSizeInput() {
  const sizeSelect = document.querySelector("#tileFinderSize");
  const customInput = document.querySelector("#tileFinderSizeCustom");
  if (!sizeSelect || !customInput) return;
  const isCustom = sizeSelect.value === CUSTOM_TILE_SIZE_VALUE;
  customInput.classList.toggle("hidden", !isCustom);
  customInput.disabled = !isCustom;
  if (isCustom) {
    customInput.focus();
    const status = document.querySelector("#tileFinderStatus");
    if (status) status.textContent = "직접입력 사이즈 예: 600*600, 300x600 처럼 가로x세로로 입력하세요.";
  }
}

async function handleTileFinderSearch() {
  const status = document.querySelector("#tileFinderStatus");
  const results = document.querySelector("#tileFinderResults");
  const tags = document.querySelector("#tileFinderTags");
  const sizeSelection = document.querySelector("#tileFinderSize")?.value || "";
  const customSize = document.querySelector("#tileFinderSizeCustom")?.value.trim() || "";
  const isCustomSize = sizeSelection === CUSTOM_TILE_SIZE_VALUE;
  const size = sizeSelection === UNKNOWN_TILE_SIZE_VALUE ? "" : (isCustomSize ? customSize : sizeSelection);
  const sizeLabel = sizeSelection === UNKNOWN_TILE_SIZE_VALUE ? "사이즈 모름" : size;
  const finish = document.querySelector("#tileFinderFinish")?.value || "";
  const application = document.querySelector("#tileFinderApplication")?.value || "";
  const applicationLabel = getTileFinderApplicationLabel(application);
  if (tileFinderEditableAnalysis.finish && tileFinderEditableAnalysis.finish !== finish) {
    tileFinderEditableAnalysis.finish = finish;
  }

  if (!tileFinderImageDataUrl) {
    if (status) status.textContent = "먼저 타일 사진을 업로드해주세요.";
    return;
  }
  if (!sizeSelection) {
    if (status) status.textContent = "사이즈를 선택하거나 '직접입력' 또는 '사이즈 모름'을 선택해주세요.";
    return;
  }
  if (isCustomSize && !customSize) {
    if (status) status.textContent = "직접입력 사이즈를 적어주세요. 예: 600*600, 300x600";
    return;
  }
  if (!finish) {
    if (status) status.textContent = "같은 마감 타일만 찾기 위해 표면을 선택해주세요.";
    return;
  }
  if (!application) {
    if (status) status.textContent = "바닥에 사용할지, 벽에 사용할지 선택해주세요.";
    return;
  }

  if (results) {
    results.classList.add("hidden");
    results.innerHTML = "";
  }
  if (tags) {
    tags.innerHTML = [
      `사진 ${tileFinderImageFileName || "업로드됨"}`,
      `사이즈 ${sizeLabel}`,
      `표면 ${finish}`,
      `사용 위치 ${applicationLabel}`
    ].filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  }

  const conditionLabel = [sizeLabel, finish, applicationLabel].filter(Boolean).join(" · ");
  if (status) status.textContent = `${conditionLabel} 조건으로 이미지 색상과 패턴이 가장 비슷한 상품을 찾는 중입니다.`;
  try {
    const payload = await requestJson("/api/tile-match", {
      method: "POST",
      headers: isAdminUser()
        ? getAdminAuthHeaders({ "Content-Type": "application/json" })
        : { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataUrl: tileFinderImageDataUrl,
        size,
        sizeUnknown: sizeSelection === UNKNOWN_TILE_SIZE_VALUE,
        finish,
        application,
        analysisOverrides: buildTileFinderAnalysisOverrides(),
        searchMode: "strict",
        allSimilar: true
      })
    }, { retries: 0, timeoutMs: 60000 });

    tileFinderMatches = payload.matches || [];
    tileFinderResultsPage = 1;
    tileFinderResultFilters = createEmptyTileFinderResultFilters();
    products = mergeProducts(products, tileFinderMatches.map((product) => (
      isAdminUser() ? product : mapPublicProductForClient(product)
    )));
    renderTileFinderAnalysis(payload.analysis || {});
    renderTileFinderResults(tileFinderMatches);
    if (status) status.textContent = tileFinderMatches.length
      ? `${conditionLabel} 조건에서 이미지와 유사한 상품 ${tileFinderMatches.length}개를 찾았습니다.`
      : `${conditionLabel} 조건의 유사 타일을 찾지 못했습니다. 다른 사진으로 다시 시도하거나 DB 마감/사용 위치 값을 점검해주세요.`;
  } catch (error) {
    if (status) status.textContent = error.message || "타일찾기 분석에 실패했습니다.";
  }
}

function getTileFinderApplicationLabel(value) {
  if (value === "floor") return "바닥";
  if (value === "wall") return "벽";
  return "";
}

function renderTileFinderAnalysis(analysis) {
  const tags = document.querySelector("#tileFinderTags");
  if (!tags) return;
  tileFinderEditableAnalysis = mergeTileFinderEditableAnalysis(analysis, tileFinderEditableAnalysis);
  const values = [
    analysis.requestedSize ? `사이즈 ${analysis.requestedSize}` : "",
    analysis.sizeUnknown ? "사이즈 모름" : "",
    tileFinderEditableAnalysis.finish ? `표면조건 ${tileFinderEditableAnalysis.finish}` : (analysis.requestedFinish ? `표면조건 ${analysis.requestedFinish}` : ""),
    analysis.requestedApplication ? `사용 위치 ${getTileFinderApplicationLabel(analysis.requestedApplication) || analysis.requestedApplication}` : "",
    tileFinderEditableAnalysis.color ? `대표색 ${tileFinderEditableAnalysis.color}` : "",
    tileFinderEditableAnalysis.secondaryColor ? `보조색 ${tileFinderEditableAnalysis.secondaryColor}` : "",
    tileFinderEditableAnalysis.style ? `스타일 ${tileFinderEditableAnalysis.style}` : "",
    tileFinderEditableAnalysis.patternPresence ? `무늬 ${tileFinderEditableAnalysis.patternPresence}` : "",
    ...(analysis.colors || []).filter((item) => item !== tileFinderEditableAnalysis.color).slice(0, 2).map((item) => `보조색 ${item}`),
    ...(analysis.patterns || []).filter((item) => item !== tileFinderEditableAnalysis.style).slice(0, 2).map((item) => `보조패턴 ${item}`),
    ...(analysis.shapes || []).map((item) => `형태 ${item}`),
    ...(analysis.motifs || []).map((item) => `무늬 ${item}`)
  ].filter(Boolean);
  tags.innerHTML = values.map((item) => `<span>${escapeHtml(item)}</span>`).join("")
    || `<span>분석값 없음</span>`;
  renderTileFinderAnalysisPanel();
}

function createEmptyTileFinderEditableAnalysis() {
  return {
    color: "",
    secondaryColor: "",
    style: "",
    patternPresence: "",
    finish: ""
  };
}

function mergeTileFinderEditableAnalysis(analysis = {}, current = createEmptyTileFinderEditableAnalysis()) {
  const requestedFinish = document.querySelector("#tileFinderFinish")?.value || analysis.requestedFinish || "";
  return {
    color: current.color || inferTileFinderColor(analysis),
    secondaryColor: current.secondaryColor || inferTileFinderSecondaryColor(analysis, current.color || inferTileFinderColor(analysis)),
    style: current.style || inferTileFinderStyle(analysis),
    patternPresence: current.patternPresence || inferTileFinderPatternPresence(analysis),
    finish: current.finish || requestedFinish || inferTileFinderFinish(analysis)
  };
}

function inferTileFinderColor(analysis = {}) {
  const source = [...(analysis.colors || []), ...(analysis.keywords || [])].join(" ");
  const aliases = [
    ["아이보리", /아이보리|크림|오프화이트/],
    ["화이트", /화이트|흰색|백색/],
    ["베이지", /베이지|샌드|크림/],
    ["브라운", /브라운|갈색|우드|나무/],
    ["그레이", /그레이|회색|실버/],
    ["차콜", /차콜|다크그레이|먹색/],
    ["블랙", /블랙|검정|흑색/],
    ["그린", /그린|녹색/],
    ["블루", /블루|파랑|청색/],
    ["핑크", /핑크|분홍/],
    ["레드", /레드|빨강|적색/],
    ["옐로우", /옐로우|노랑|황색/],
    ["테라코타", /테라코타|오렌지|주황/],
    ["멀티", /멀티|혼합|컬러풀/]
  ];
  return aliases.find(([, pattern]) => pattern.test(source))?.[0] || "";
}

function inferTileFinderSecondaryColor(analysis = {}, primaryColor = "") {
  const colors = (analysis.colors || []).map((item) => inferTileFinderColor({ colors: [item] })).filter(Boolean);
  return colors.find((item) => item && item !== primaryColor) || "";
}

function inferTileFinderStyle(analysis = {}) {
  const source = [
    ...(analysis.patterns || []),
    ...(analysis.motifs || []),
    ...(analysis.shapes || []),
    ...(analysis.keywords || []),
    analysis.material,
    analysis.summary
  ].join(" ");
  const aliases = [
    ["트래버틴", /트래버틴|travertine/],
    ["라임스톤", /라임스톤|limestone/],
    ["슬레이트", /슬레이트|slate/],
    ["콘크리트", /콘크리트|시멘트|cement|concrete/],
    ["마블", /마블|대리석|베인|vein|marble/],
    ["스톤", /스톤|석재|돌|stone/],
    ["테라조", /테라조|terrazzo|입자/],
    ["우드", /우드|나뭇결|wood/],
    ["솔리드", /솔리드|단색|무지/],
    ["모자이크", /모자이크|mosaic/],
    ["서브웨이", /서브웨이|subway/],
    ["브릭", /브릭|서브웨이|벽돌/],
    ["육각", /육각|헥사|hex/],
    ["라인", /라인|선형|줄무늬|세로|가로|stripe|linear|line/],
    ["입체", /입체|3d|골지|웨이브|텍스처/],
    ["데코", /데코|장식|art|decor/],
    ["패턴", /패턴|기하학|반복|데코/],
    ["메탈", /메탈|metal|스테인리스/],
    ["글라스", /글라스|유리|glass/],
    ["시멘트", /시멘트|cement/]
  ];
  return aliases.find(([, pattern]) => pattern.test(source))?.[0] || "";
}

function inferTileFinderPatternPresence(analysis = {}) {
  const source = [
    analysis.patternScale,
    analysis.patternFlow,
    analysis.summary,
    ...(analysis.patterns || []),
    ...(analysis.motifs || [])
  ].join(" ");
  if (/무지|무늬없|무늬 없음|단색|솔리드|solid|plain/.test(source)) return "없음";
  if (/마블|스톤|테라조|우드|패턴|모자이크|브릭|베인|결|입자|점박이|기하학|라인|나뭇결|pattern|vein|grain/.test(source)) return "있음";
  return "";
}

function inferTileFinderFinish(analysis = {}) {
  const source = [analysis.surface, analysis.summary, ...(analysis.keywords || [])].join(" ");
  if (/유광|폴리싱|광택|gloss|polished/.test(source)) return "유광";
  if (/무광|매트|matte|matt/.test(source)) return "무광";
  return "";
}

function renderTileFinderAnalysisPanel() {
  const panel = document.querySelector("#tileFinderAnalysisPanel");
  if (!panel) return;
  const hasAny = Object.values(tileFinderEditableAnalysis).some(Boolean);
  panel.classList.toggle("hidden", !hasAny);
  if (!hasAny) {
    panel.innerHTML = "";
    return;
  }
  const rows = [
    { key: "color", label: "대표색", value: tileFinderEditableAnalysis.color, options: TILE_FINDER_COLOR_OPTIONS },
    { key: "secondaryColor", label: "보조색", value: tileFinderEditableAnalysis.secondaryColor, options: ["없음", ...TILE_FINDER_COLOR_OPTIONS] },
    { key: "style", label: "스타일", value: tileFinderEditableAnalysis.style, options: TILE_STYLE_OPTIONS },
    { key: "patternPresence", label: "무늬", value: tileFinderEditableAnalysis.patternPresence, options: TILE_FINDER_PATTERN_PRESENCE_OPTIONS },
    { key: "finish", label: "표면", value: tileFinderEditableAnalysis.finish, options: TILE_FINDER_FINISH_OPTIONS }
  ];
  panel.innerHTML = `
    <div class="tile-finder-analysis-heading">
      <div>
        <strong>AI 분석 결과 보정</strong>
        <span>사진을 보고 추정한 기준입니다. 다르면 바로 바꾼 뒤 다시 찾으세요.</span>
      </div>
      <button class="secondary-action" type="button" data-tile-finder-analysis-retry>이 기준으로 다시 찾기</button>
    </div>
    <div class="tile-finder-analysis-grid">
      ${rows.map((row) => `
        <div class="tile-finder-analysis-row">
          <span>${escapeHtml(row.label)}</span>
          <div class="tile-finder-analysis-chips">
            ${row.options.map((option) => `
              <button class="${option === row.value ? "active" : ""}" type="button" data-tile-finder-analysis-field="${escapeHtml(row.key)}" data-tile-finder-analysis-value="${escapeHtml(option)}">
                ${escapeHtml(option)}
              </button>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function hideTileFinderAnalysisPanel() {
  const panel = document.querySelector("#tileFinderAnalysisPanel");
  if (!panel) return;
  panel.classList.add("hidden");
  panel.innerHTML = "";
}

function handleTileFinderAnalysisPanelClick(event) {
  const retryButton = event.target.closest("[data-tile-finder-analysis-retry]");
  if (retryButton) {
    handleTileFinderSearch();
    return;
  }
  const button = event.target.closest("[data-tile-finder-analysis-field]");
  if (!button) return;
  const field = button.dataset.tileFinderAnalysisField || "";
  const value = button.dataset.tileFinderAnalysisValue || "";
  if (!Object.prototype.hasOwnProperty.call(tileFinderEditableAnalysis, field)) return;
  tileFinderEditableAnalysis[field] = field === "secondaryColor" && value === "없음" ? "" : value;
  if (field === "finish") {
    const finishSelect = document.querySelector("#tileFinderFinish");
    if (finishSelect) finishSelect.value = value;
  }
  renderTileFinderAnalysisPanel();
  const status = document.querySelector("#tileFinderStatus");
  if (status) status.textContent = "분석 기준을 수정했습니다. '이 기준으로 다시 찾기'를 누르면 보정값이 반영됩니다.";
}

function buildTileFinderAnalysisOverrides() {
  return {
    color: tileFinderEditableAnalysis.color,
    secondaryColor: tileFinderEditableAnalysis.secondaryColor,
    style: tileFinderEditableAnalysis.style,
    patternPresence: tileFinderEditableAnalysis.patternPresence,
    finish: tileFinderEditableAnalysis.finish
  };
}

function createEmptyTileFinderResultFilters() {
  return {
    includeStyles: [],
    excludeStyles: [],
    includeColors: [],
    excludeColors: [],
    priceSort: "match",
    maxPrice: "",
    minStock: ""
  };
}

function hideTileFinderResultFilters() {
  const filters = document.querySelector("#tileFinderResultFilters");
  if (!filters) return;
  filters.classList.add("hidden");
  filters.innerHTML = "";
}

function handleTileFinderResultFilterClick(event) {
  const clearButton = event.target.closest("[data-tile-finder-filter-clear]");
  if (clearButton) {
    const scope = clearButton.dataset.tileFinderFilterClear || "all";
    if (scope === "all") tileFinderResultFilters = createEmptyTileFinderResultFilters();
    if (scope === "style") {
      tileFinderResultFilters.includeStyles = [];
      tileFinderResultFilters.excludeStyles = [];
    }
    if (scope === "color") {
      tileFinderResultFilters.includeColors = [];
      tileFinderResultFilters.excludeColors = [];
    }
    if (scope === "price") {
      tileFinderResultFilters.priceSort = "match";
      tileFinderResultFilters.maxPrice = "";
    }
    if (scope === "stock") {
      tileFinderResultFilters.minStock = "";
    }
    tileFinderResultsPage = 1;
    renderTileFinderResults(tileFinderMatches);
    return;
  }

  const chip = event.target.closest("[data-tile-finder-filter-chip]");
  if (!chip) return;
  cycleTileFinderFilterValue(chip.dataset.filterKind, chip.dataset.filterValue);
  tileFinderResultsPage = 1;
  renderTileFinderResults(tileFinderMatches);
}

function handleTileFinderResultFilterChange(event) {
  const target = event.target;
  if (!target) return;
  if (target.id === "tileFinderPriceSort") {
    tileFinderResultFilters.priceSort = target.value || "match";
  } else if (target.id === "tileFinderMaxPrice") {
    tileFinderResultFilters.maxPrice = target.value || "";
  } else if (target.id === "tileFinderMinStock") {
    tileFinderResultFilters.minStock = target.value || "";
  } else {
    return;
  }
  tileFinderResultsPage = 1;
  renderTileFinderResults(tileFinderMatches);
}

function cycleTileFinderFilterValue(kind, value) {
  const normalized = String(value || "").trim();
  if (!normalized) return;
  const includeKey = kind === "color" ? "includeColors" : "includeStyles";
  const excludeKey = kind === "color" ? "excludeColors" : "excludeStyles";
  const includes = new Set(tileFinderResultFilters[includeKey] || []);
  const excludes = new Set(tileFinderResultFilters[excludeKey] || []);

  if (!includes.has(normalized) && !excludes.has(normalized)) {
    includes.add(normalized);
  } else if (includes.has(normalized)) {
    includes.delete(normalized);
    excludes.add(normalized);
  } else {
    excludes.delete(normalized);
  }

  tileFinderResultFilters[includeKey] = [...includes];
  tileFinderResultFilters[excludeKey] = [...excludes];
}

function applyTileFinderResultFilters(matches) {
  const rawMatches = Array.isArray(matches) ? matches : [];
  const includeStyles = new Set(tileFinderResultFilters.includeStyles || []);
  const excludeStyles = new Set(tileFinderResultFilters.excludeStyles || []);
  const includeColors = new Set(tileFinderResultFilters.includeColors || []);
  const excludeColors = new Set(tileFinderResultFilters.excludeColors || []);
  const maxPrice = parseTileFinderPriceInput(tileFinderResultFilters.maxPrice);
  const minStock = parseTileFinderStockInput(tileFinderResultFilters.minStock);
  const indexed = rawMatches.map((product, index) => ({ product, index }));
  let filtered = indexed.filter(({ product }) => {
    const style = getTileFinderStyleValue(product);
    const color = getTileFinderColorValue(product);
    if (includeStyles.size && !includeStyles.has(style)) return false;
    if (excludeStyles.has(style)) return false;
    if (includeColors.size && !includeColors.has(color)) return false;
    if (excludeColors.has(color)) return false;
    if (maxPrice > 0) {
      const price = getTileFinderComparablePrice(product);
      if (!price || price > maxPrice) return false;
    }
    if (minStock > 0 && getTileFinderStockQuantity(product) < minStock) return false;
    return true;
  });

  if (tileFinderResultFilters.priceSort === "priceAsc" || tileFinderResultFilters.priceSort === "priceDesc") {
    const direction = tileFinderResultFilters.priceSort === "priceAsc" ? 1 : -1;
    filtered = filtered.sort((left, right) => {
      const leftPrice = getTileFinderComparablePrice(left.product);
      const rightPrice = getTileFinderComparablePrice(right.product);
      if (Boolean(leftPrice) !== Boolean(rightPrice)) return leftPrice ? -1 : 1;
      if (leftPrice !== rightPrice) return (leftPrice - rightPrice) * direction;
      return left.index - right.index;
    });
  }

  return filtered.map((entry) => entry.product);
}

function renderTileFinderResultFilters(rawMatches, filteredMatches) {
  const container = document.querySelector("#tileFinderResultFilters");
  if (!container) return;
  if (!rawMatches.length) {
    hideTileFinderResultFilters();
    return;
  }
  container.classList.remove("hidden");
  const styleFacets = getTileFinderFacetCounts(rawMatches, getTileFinderStyleValue);
  const colorFacets = getTileFinderFacetCounts(rawMatches, getTileFinderColorValue);
  container.innerHTML = `
    <div class="tile-finder-filter-head">
      <div>
        <strong>결과 필터</strong>
        <span>검색 결과 ${number(rawMatches.length)}개 중 ${number(filteredMatches.length)}개 표시</span>
      </div>
      <button class="secondary-action" type="button" data-tile-finder-filter-clear="all">전체 해제</button>
    </div>
    <div class="tile-finder-price-filter">
      <label>
        금액 정렬
        <select id="tileFinderPriceSort">
          <option value="match"${tileFinderResultFilters.priceSort === "match" ? " selected" : ""}>유사도순</option>
          <option value="priceAsc"${tileFinderResultFilters.priceSort === "priceAsc" ? " selected" : ""}>낮은순</option>
          <option value="priceDesc"${tileFinderResultFilters.priceSort === "priceDesc" ? " selected" : ""}>높은순</option>
        </select>
      </label>
      <label>
        얼마 이하
        <input id="tileFinderMaxPrice" type="text" inputmode="numeric" placeholder="예: 30000" value="${escapeHtml(tileFinderResultFilters.maxPrice || "")}" />
      </label>
      <button class="secondary-action" type="button" data-tile-finder-filter-clear="price">금액 해제</button>
    </div>
    <div class="tile-finder-stock-filter">
      <label>
        예상 필요재고
        <input id="tileFinderMinStock" type="text" inputmode="numeric" placeholder="예: 120" value="${escapeHtml(tileFinderResultFilters.minStock || "")}" />
      </label>
      <span>입력한 수량 이상 보유한 상품만 표시합니다.</span>
      <button class="secondary-action" type="button" data-tile-finder-filter-clear="stock">재고 해제</button>
    </div>
    ${renderTileFinderFacetFilter("style", "스타일", styleFacets)}
    ${renderTileFinderFacetFilter("color", "색상", colorFacets)}
  `;
}

function renderTileFinderFacetFilter(kind, label, facets) {
  const clearScope = kind === "color" ? "color" : "style";
  return `
    <div class="tile-finder-facet-filter">
      <div class="tile-finder-facet-title">
        <strong>${escapeHtml(label)}</strong>
        <span>칩 클릭: 원함 → 제외 → 해제</span>
        <button class="secondary-action" type="button" data-tile-finder-filter-clear="${escapeHtml(clearScope)}">${escapeHtml(label)} 해제</button>
      </div>
      <div class="tile-finder-filter-chips">
        ${facets.map(({ value, count }) => renderTileFinderFilterChip(kind, value, count)).join("")}
      </div>
    </div>
  `;
}

function renderTileFinderFilterChip(kind, value, count) {
  const includeValues = kind === "color" ? tileFinderResultFilters.includeColors : tileFinderResultFilters.includeStyles;
  const excludeValues = kind === "color" ? tileFinderResultFilters.excludeColors : tileFinderResultFilters.excludeStyles;
  const isInclude = (includeValues || []).includes(value);
  const isExclude = (excludeValues || []).includes(value);
  const stateClass = isInclude ? " is-include" : isExclude ? " is-exclude" : "";
  const stateText = isInclude ? "원함" : isExclude ? "제외" : `${number(count)}개`;
  return `<button class="tile-finder-filter-chip${stateClass}" type="button" data-tile-finder-filter-chip data-filter-kind="${escapeHtml(kind)}" data-filter-value="${escapeHtml(value)}">
    <span>${escapeHtml(value)}</span>
    <small>${escapeHtml(stateText)}</small>
  </button>`;
}

function getTileFinderFacetCounts(matches, getter) {
  const counts = new Map();
  for (const product of matches || []) {
    const value = getter(product);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || String(left.value).localeCompare(String(right.value), "ko"));
}

function getTileFinderStyleValue(product) {
  return normalizeDirectProductFilterValue(product?.patternCategory)
    || normalizeDirectProductFilterValue(product?.style)
    || normalizeDirectProductFilterValue(product?.option)
    || "스타일 미확인";
}

function getTileFinderColorValue(product) {
  return getProductDisplayColor(product) || "색상 미확인";
}

function parseTileFinderPriceInput(value) {
  return Number(String(value || "").replace(/[^\d]/g, "")) || 0;
}

function parseTileFinderStockInput(value) {
  return Math.max(0, Number(String(value || "").replace(/[^\d]/g, "")) || 0);
}

function getTileFinderStockQuantity(product) {
  if (isHsBrandProduct(product)) return 0;
  const value = Number(product?.stockQty);
  return Number.isFinite(value) ? value : 0;
}

function getTileFinderComparablePrice(product) {
  const memberPrice = getMemberBaseUnitPrice(product);
  if (memberPrice) return memberPrice;
  const rawPrice = Number(
    product?.retailPrice
    || product?.wholesalePrice
    || product?.gradeAPrice
    || product?.gradeBPrice
    || product?.gradeCPrice
    || 0
  );
  if (rawPrice) return rawPrice;
  return getTileFinderPriceBandUpper(product?.priceSortRank);
}

function getTileFinderPriceBandUpper(rank) {
  const bands = [5000, 10000, 15000, 20000, 30000, 50000, 80000, 120000, 200000, 500000, 1000000];
  const index = Number(rank || 0) - 1;
  return index >= 0 && index < bands.length ? bands[index] : 0;
}

function getTileFinderPriceBandLabel(rank) {
  const price = getTileFinderPriceBandUpper(rank);
  return price ? `${money.format(price)} 이하` : "";
}

function renderTileFinderPriceLine(product) {
  if (hasMemberPriceAccess()) return renderProductCardPriceLine(product);
  const band = getTileFinderPriceBandLabel(product?.priceSortRank);
  return `<span>${escapeHtml(band ? `금액대 ${band}` : "가격 협의")}</span>`;
}

function renderTileFinderResults(matches, options = {}) {
  const results = document.querySelector("#tileFinderResults");
  if (!results) return;
  if (!options.preservePage) tileFinderResultsPage = 1;
  const rawMatches = Array.isArray(matches) ? matches : [];
  const visibleMatches = applyTileFinderResultFilters(rawMatches);
  renderTileFinderResultFilters(rawMatches, visibleMatches);
  const totalPages = Math.max(1, Math.ceil(visibleMatches.length / TILE_FINDER_RESULTS_PAGE_SIZE));
  tileFinderResultsPage = Math.min(Math.max(tileFinderResultsPage, 1), totalPages);
  const startIndex = (tileFinderResultsPage - 1) * TILE_FINDER_RESULTS_PAGE_SIZE;
  const pageMatches = visibleMatches.slice(startIndex, startIndex + TILE_FINDER_RESULTS_PAGE_SIZE);
  const pageGroups = groupTileFinderPageMatches(pageMatches, visibleMatches);
  results.classList.toggle("hidden", !rawMatches.length);
  results.innerHTML = rawMatches.length ? [
    `<div class="taxonomy-image-results-heading">
      <strong>이미지 유사 결과</strong>
      <span>총 ${number(rawMatches.length)}개 · 표시 ${number(visibleMatches.length)}개 · ${number(tileFinderResultsPage)}/${number(totalPages)}페이지 · 10개씩 표시</span>
    </div>`,
    ...(pageMatches.length ? pageGroups.map((group) => `
    <section class="tile-finder-result-group">
      <div class="tile-finder-result-group-title">
        <strong>${escapeHtml(group.label)}</strong>
        <span>${escapeHtml(group.summary)}</span>
      </div>
      ${group.items.map((entry) => {
        const product = entry.product;
        return `
    <article class="tile-match-card" data-tile-finder-group="${escapeHtml(group.key)}">
      <button class="product-detail-trigger" type="button" data-view-product="${escapeHtml(product.id)}" aria-label="${escapeHtml(product.name)} 상세 보기">
        ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />` : `<div class="product-thumb-empty">이미지 없음</div>`}
      </button>
      <strong>${escapeHtml(product.name)}</strong>
      <span>${escapeHtml(product.size || "-")} · ${escapeHtml(getTileFinderStyleValue(product))} · ${escapeHtml(getTileFinderColorValue(product))}</span>
      <span>${escapeHtml(product.finish || product.option || "-")}</span>
      ${renderTileFinderPriceLine(product)}
      <span>재고 ${escapeHtml(formatStockQuantity(product))}</span>
      <small>${escapeHtml(getTileFinderHumanReason(product, entry.index, group.key))}</small>
      <span class="tile-match-score">유사도 ${number(product.matchScore || 0)}</span>
      <div class="tile-match-actions">
        <button class="secondary-action" type="button" data-view-product="${escapeHtml(product.id)}">상세</button>
        <button class="primary-action" type="button" data-add-product="${escapeHtml(product.id)}">담기</button>
      </div>
    </article>`;
      }).join("")}
    </section>
  `) : [`<div class="empty-state">선택한 스타일/색상/금액 조건에 맞는 결과가 없습니다.</div>`]),
    renderImageSearchPagination(tileFinderResultsPage, totalPages, "tileFinder")
  ].join("") : "";
}

function groupTileFinderPageMatches(pageMatches, allVisibleMatches) {
  const priceValues = allVisibleMatches.map(getTileFinderComparablePrice).filter(Boolean).sort((a, b) => a - b);
  const lowPriceCutoff = priceValues.length ? priceValues[Math.max(0, Math.floor(priceValues.length * 0.35) - 1)] : 0;
  const grouped = [
    { key: "best", label: "가장 유사", summary: "사진과 가까운 후보", items: [] },
    { key: "value", label: "저가 대체", summary: "가격 부담을 낮춘 후보", items: [] },
    { key: "stock", label: "재고 여유", summary: "수량 확보가 쉬운 후보", items: [] },
    { key: "more", label: "추가 후보", summary: "같은 조건의 다른 후보", items: [] }
  ];
  pageMatches.forEach((product, index) => {
    const globalIndex = allVisibleMatches.findIndex((item) => String(item.id) === String(product.id));
    const price = getTileFinderComparablePrice(product);
    const stock = getTileFinderStockQuantity(product);
    const matchScore = Number(product.matchScore || 0);
    let key = "more";
    if (globalIndex >= 0 && globalIndex < 4 || matchScore >= 96) key = "best";
    else if (price && lowPriceCutoff && price <= lowPriceCutoff) key = "value";
    else if (stock > STOCK_INQUIRY_THRESHOLD_QTY) key = "stock";
    grouped.find((group) => group.key === key)?.items.push({ product, index: globalIndex >= 0 ? globalIndex : index });
  });
  return grouped.filter((group) => group.items.length);
}

function getTileFinderHumanReason(product, index = 0, groupKey = "more") {
  const reasons = (product.matchReasons || []).join(" ");
  if (groupKey === "value") return "비슷한 저가 후보입니다.";
  if (groupKey === "stock") return "재고 여유가 있습니다.";
  if (/상세이미지 일치|이미지유사도 9\d|이미지유사도 100/.test(reasons) || index === 0) return "사진과 가장 가깝습니다.";
  if (/색상|색상이미지/.test(reasons)) return "색상이 비슷합니다.";
  if (/패턴|무늬|형태/.test(reasons)) return "느낌이 비슷합니다.";
  if (/사이즈일치|표면일치/.test(reasons)) return "조건에 맞는 후보입니다.";
  return "비슷한 후보입니다.";
}

function hasStockValue(product) {
  if (isHsBrandProduct(product)) return true;
  return product && product.stockQty !== undefined && product.stockQty !== null && product.stockQty !== "";
}

function formatStockQuantity(product) {
  if (isHsBrandProduct(product)) return "문의";
  const value = Number(product?.stockQty);
  if (!Number.isFinite(value)) return "주문시 재고 문의";
  return value > STOCK_INQUIRY_THRESHOLD_QTY ? number(value) : "주문시 재고 문의";
}

function isHsBrandProduct(product) {
  return String(product?.id || "").startsWith("hwashin-")
    || /^HS$/i.test(String(product?.catalogSource || product?.catalog_source || "").trim())
    || /myhwashin|화신/i.test(String(product?.sourceSite || product?.source_site || "").trim());
}

function getProductStockText(product) {
  if (isHsBrandProduct(product)) return "";
  return String(product?.stockText || "").trim();
}

async function openProductDetail(id, sourceElement = null) {
  let product = products.find((item) => item.id === id);
  if (!product) return;
  const card = sourceElement?.closest(".product-card") || document.querySelector(`[data-view-product="${cssEscape(id)}"]`)?.closest(".product-card");
  productListReturnState = {
    scrollY: window.scrollY,
    productId: id,
    viewportTop: card ? card.getBoundingClientRect().top : 0
  };
  pageScrollPositions.set("productsPage", window.scrollY);
  selectedProductId = id;
  selectedDetailProduct = product;
  renderProductDetail(product);
  switchPage("productDetailPage");

  if (authUser?.role === "admin" && authUser.adminUsername && authUser.adminToken) {
    setText("#detailEditStatus", "관리자 상세정보 불러오는 중");
    try {
      const result = await requestJson(`/api/admin/product?id=${encodeURIComponent(id)}`, {
        headers: getAdminAuthHeaders()
      }, { retries: 1, timeoutMs: 8000 });
      if (result?.product) {
        product = result.product;
        selectedDetailProduct = product;
        products = mergeProducts(products, [isAdminUser() ? product : mapPublicProductForClient(product)]);
        renderProductDetail(product);
        setText("#detailEditStatus", "수정 가능");
      }
    } catch (error) {
      setText("#detailEditStatus", error.message || "관리자 상세정보를 불러오지 못했습니다.");
    }
  }
}

function renderProductDetail(product) {
  selectedDetailProduct = product;
  const detailView = window.TbpProductDetail.buildProductDetailView({
    product,
    callbacks: getProductDetailCallbacks()
  });
  setText("#detailProductTitle", detailView.title);
  document.querySelector("#detailMainMedia").innerHTML = detailView.mainMediaHtml;
  document.querySelector("#detailSpecGrid").innerHTML = detailView.specGridHtml;

  renderDetailAdminEditor(product);
  document.querySelector("#detailGalleryGrid").innerHTML = detailView.galleryHtml;
}

function getProductDetailAdminSpecs(product) {
  return window.TbpProductDetail.buildAdminSpecs(product, getProductDetailCallbacks());
}

function getProductDetailCallbacks() {
  return {
    escapeHtml,
    money,
    isAdmin: isAdminUser(),
    productTypeLabels: PRODUCT_TYPE_LABELS,
    getProductImage,
    getProductDetailPriceSpecs,
    getAdminProductBrandLabel,
    hasStockValue,
    formatStockQuantity,
    getProductStockText
  };
}

function renderDetailAdminEditor(product) {
  const editor = document.querySelector("#detailAdminEditor");
  if (!editor) return;
  const canEdit = authUser?.role === "admin" && authUser.adminUsername && authUser.adminToken;
  editor.classList.toggle("hidden", !canEdit);
  if (!canEdit) return;
  fillDetailEditForm(product);
  setText("#detailEditStatus", product.managementCode ? "수정 가능" : "관리자 상세정보 확인 필요");
}

function fillDetailEditForm(product) {
  const form = document.querySelector("#detailEditForm");
  if (!form || !product) return;
  setFormValue(form, "managementCode", product.managementCode || "");
  setFormValue(form, "name", product.name || "");
  setFormValue(form, "productType", product.productType || "tile");
  setFormValue(form, "kind", product.kind || "");
  setFormValue(form, "size", product.size || "");
  setFormValue(form, "maker", product.maker || "");
  setFormValue(form, "unit", product.unit || "");
  setFormValue(form, "finish", product.finish || "");
  setFormValue(form, "option", product.option || "");
  setFormValue(form, "retailPrice", product.retailPrice ?? 0);
  setFormValue(form, "wholesalePrice", product.wholesalePrice ?? 0);
  setFormValue(form, "costPrice", product.costPrice ?? 0);
  setFormValue(form, "stockQty", product.stockQty ?? 0);
  setFormValue(form, "catalogSource", product.catalogSource || "");
  setFormValue(form, "catalogPage", product.catalogPage ?? 0);
}

function setFormValue(form, name, value) {
  const field = form.elements[name];
  if (field) field.value = value;
}

async function saveDetailProductSpecs(event) {
  event.preventDefault();
  if (authUser?.role !== "admin" || !authUser.adminUsername || !authUser.adminToken) {
    setText("#detailEditStatus", "관리자 로그인 후 수정할 수 있습니다.");
    return;
  }
  if (!selectedDetailProduct?.id) {
    setText("#detailEditStatus", "수정할 상품을 찾을 수 없습니다.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const product = {
    ...selectedDetailProduct,
    managementCode: String(formData.get("managementCode") || "").trim(),
    productType: String(formData.get("productType") || "").trim(),
    kind: String(formData.get("kind") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    size: String(formData.get("size") || "").trim(),
    maker: String(formData.get("maker") || "").trim(),
    unit: String(formData.get("unit") || "").trim(),
    finish: String(formData.get("finish") || "").trim(),
    option: String(formData.get("option") || "").trim(),
    retailPrice: Number(formData.get("retailPrice")) || 0,
    wholesalePrice: Number(formData.get("wholesalePrice")) || 0,
    costPrice: Number(formData.get("costPrice")) || 0,
    stockQty: Number(formData.get("stockQty")) || 0,
    catalogSource: String(formData.get("catalogSource") || "").trim(),
    catalogPage: Number(formData.get("catalogPage")) || 0
  };

  setText("#detailEditStatus", "저장 중...");
  try {
    const result = await requestJson("/api/admin/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminUsername: authUser.adminUsername,
        adminToken: authUser.adminToken,
        product
      })
    }, { retries: 1, timeoutMs: 10000 });
    selectedDetailProduct = result.product || product;
    products = mergeProducts(products, [isAdminUser() ? selectedDetailProduct : mapPublicProductForClient(selectedDetailProduct)]);
    syncProductFilters();
    renderProducts();
    renderProductDetail(selectedDetailProduct);
    setText("#detailEditStatus", "저장 완료");
  } catch (error) {
    setText("#detailEditStatus", error.message || "저장하지 못했습니다.");
  }
}

function mapPublicProductForClient(product) {
  return window.TbpProductDto.mapPublicProductForClient(product, {
    includeMemberPrices: Boolean(product?.memberPriceVisible) || hasMemberPriceAccess()
  });
}

const CUSTOMER_SENSITIVE_PRODUCT_FIELDS = window.TbpProductDto.CUSTOMER_SENSITIVE_PRODUCT_FIELDS;

function stripCustomerSensitiveProductFields(product) {
  return window.TbpProductDto.stripCustomerSensitiveProductFields(product);
}

function hasMemberPriceAccess(user = authUser) {
  return isAdminUser()
    || Boolean(user?.businessNumber && user?.memberToken && user?.approvalStatus === "승인" && user?.pricingAccess === "approved");
}

function getPriceLockedMessage() {
  return "사업자등록증 승인 후 등급별 가격 공개";
}

function getGradePriceRows(product) {
  return [
    ["A등급", Number(product?.gradeAPrice || 0)],
    ["B등급", Number(product?.gradeBPrice || 0)],
    ["C등급", Number(product?.gradeCPrice || 0)]
  ].filter(([, value]) => value > 0);
}

function getMemberGradePriceRow(product, user = authUser) {
  const gradeRows = getGradePriceRows(product);
  if (!gradeRows.length) return null;
  const gradeSource = String([
    user?.priceTier,
    user?.memberGrade,
    user?.grade
  ].filter(Boolean).join(" ")).toUpperCase();
  if (/(^|[^A-Z])C([^A-Z]|$)|C등급|GRADE C/.test(gradeSource)) {
    return gradeRows.find(([label]) => label.startsWith("C")) || gradeRows[gradeRows.length - 1];
  }
  if (/(^|[^A-Z])B([^A-Z]|$)|B등급|GRADE B/.test(gradeSource)) {
    return gradeRows.find(([label]) => label.startsWith("B")) || gradeRows[0];
  }
  return gradeRows.find(([label]) => label.startsWith("A")) || gradeRows[0];
}

function renderProductCardPriceLine(product) {
  if (!hasMemberPriceAccess()) {
    return `<span class="price-locked">사업자 인증 후 가격 공개</span>`;
  }

  const gradeRow = getMemberGradePriceRow(product);
  if (gradeRow) {
    const [label, value] = gradeRow;
    return `<span class="member-price-line">${escapeHtml(label)} ${money.format(value)}</span>`;
  }

  const tier = getMemberPriceTier();
  const price = tier === "wholesale"
    ? Number(product?.wholesalePrice || 0)
    : Number(product?.retailPrice || 0);
  const label = tier === "wholesale" ? "도매가" : "소매가";
  return `<span class="member-price-line">${price ? `${escapeHtml(label)} ${money.format(price)}` : "가격 협의"}</span>`;
}

function renderProductPriceLine(product) {
  if (!hasMemberPriceAccess()) {
    return `<span class="price-locked">${escapeHtml(getPriceLockedMessage())}</span>`;
  }

  const gradeRows = getGradePriceRows(product);
  if (gradeRows.length) {
    return `<span class="member-price-line">${gradeRows.map(([label, value]) => `${escapeHtml(label)} ${money.format(value)}`).join(" · ")}</span>`;
  }

  const prices = [
    Number(product?.retailPrice || 0) ? `소매가 ${money.format(product.retailPrice)}` : "",
    Number(product?.wholesalePrice || 0) ? `도매가 ${money.format(product.wholesalePrice)}` : ""
  ].filter(Boolean);
  return `<span class="member-price-line">${escapeHtml(prices.join(" · ") || "가격 협의")}</span>`;
}

function getProductDetailPriceSpecs(product) {
  if (!hasMemberPriceAccess()) return [["가격", getPriceLockedMessage()]];
  const gradeRows = getGradePriceRows(product);
  if (gradeRows.length) return gradeRows;
  return [
    ...(Number(product.retailPrice || 0) ? [["소매가", money.format(product.retailPrice)]] : []),
    ...(Number(product.wholesalePrice || 0) ? [["도매가", money.format(product.wholesalePrice)]] : []),
    ...(!Number(product.retailPrice || 0) && !Number(product.wholesalePrice || 0) ? [["가격", "협의"]] : [])
  ];
}

function getProductImage(product, keys, allowPrimary = false) {
  for (const key of keys) {
    const value = readImageValue(product, key);
    if (value) return value;
  }
  if (allowPrimary && product.image) return product.image;
  return "";
}

function readImageValue(product, key) {
  const direct = product[key];
  if (Array.isArray(direct)) return direct.find(Boolean) || "";
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const imageMap = product.images || product.detailImages || {};
  const mapped = imageMap[key];
  if (Array.isArray(mapped)) return mapped.find(Boolean) || "";
  if (typeof mapped === "string" && mapped.trim()) return mapped.trim();
  return "";
}

function normalizeMemberPriceTier(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "retail";
  if ([
    "wholesale", "dealer", "partner", "contractor", "business", "member",
    "도매", "도매가", "회원도매", "사업자", "파트너"
  ].includes(normalized)) return "wholesale";
  if ([
    "retail", "consumer", "guest",
    "소매", "소매가", "일반", "일반회원"
  ].includes(normalized)) return "retail";
  return "retail";
}

function getMemberPriceTier(user = authUser) {
  return normalizeMemberPriceTier(
    user?.priceTier
    || user?.pricingTier
    || user?.memberPriceTier
    || user?.memberGrade
    || user?.grade
    || ""
  );
}

function getMemberBaseUnitPrice(product, user = authUser) {
  if (!hasMemberPriceAccess(user)) return 0;
  const gradeRows = getGradePriceRows(product);
  if (gradeRows.length) return gradeRows[0][1];
  const tier = getMemberPriceTier(user);
  return tier === "wholesale"
    ? Number(product?.wholesalePrice || 0)
    : Number(product?.retailPrice || 0);
}

function getMemberBasePriceCaption(user = authUser) {
  if (!hasMemberPriceAccess(user)) return "가격 승인 필요";
  return getMemberPriceTier(user) === "wholesale" ? "도매 기준" : "소매 기준";
}

function renderCartMemberPriceReadout(item) {
  return window.TbpCartRendering.renderCartMemberPriceReadout({
    item,
    callbacks: getCartRenderingCallbacks()
  });
}

function renderCart() {
  renderCartSummary();
  renderCartList();
  renderMemberHomeBoard();
  renderMyPage();
}

function getOrderHistoryStorageKey(user = authUser) {
  return `tbpOrderHistory:${String(user?.businessNumber || "guest").trim() || "guest"}`;
}

function loadPastOrders(user = authUser) {
  try {
    const rows = JSON.parse(localStorage.getItem(getOrderHistoryStorageKey(user)) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function savePastOrders(orders, user = authUser) {
  localStorage.setItem(getOrderHistoryStorageKey(user), JSON.stringify(Array.isArray(orders) ? orders : []));
}

function normalizeOrderHistoryRow(order) {
  return {
    orderNumber: order?.orderNumber || order?.order_number || "",
    createdAt: order?.createdAt || order?.created_at || order?.updatedAt || order?.updated_at || new Date().toISOString(),
    updatedAt: order?.updatedAt || order?.updated_at || order?.createdAt || order?.created_at || "",
    status: order?.status || order?.statusLabel || order?.order_status || "접수대기",
    totalQuote: Number(order?.totalQuote || order?.total_quote || 0),
    items: Array.isArray(order?.items) ? order.items : []
  };
}

function mergeOrderHistory(localOrders = [], serverOrders = []) {
  const map = new Map();
  [...serverOrders, ...localOrders].forEach((order) => {
    const normalized = normalizeOrderHistoryRow(order);
    const key = normalized.orderNumber || `${normalized.createdAt}:${normalized.totalQuote}`;
    map.set(key, normalized);
  });
  return Array.from(map.values())
    .sort((a, b) => Date.parse(b.createdAt || b.updatedAt || "") - Date.parse(a.createdAt || a.updatedAt || ""));
}

async function hydrateOrdersFromServer() {
  if (!authUser?.businessNumber || !authUser?.memberToken || authUser?.approvalStatus !== "승인") {
    remoteOrders = [];
    return false;
  }
  try {
    const query = new URLSearchParams({ businessNumber: authUser.businessNumber });
    const payload = await requestJson(`/api/orders?${query}`, {
      headers: getMemberProductAuthHeaders()
    }, { retries: 1, timeoutMs: 8000 });
    remoteOrders = Array.isArray(payload?.orders) ? payload.orders.map(normalizeOrderHistoryRow) : [];
    return true;
  } catch (error) {
    console.warn(error);
    remoteOrders = [];
    return false;
  }
}

function getClientManagementStorageKey(user = authUser) {
  return `tbpClientManagement:${String(user?.businessNumber || "guest").trim() || "guest"}`;
}

function loadClientManagementInfo(user = authUser) {
  try {
    const row = JSON.parse(localStorage.getItem(getClientManagementStorageKey(user)) || "{}");
    return row && typeof row === "object" ? row : {};
  } catch {
    return {};
  }
}

function saveClientManagementInfo() {
  const panel = document.querySelector("#myClientManagementPanel");
  if (!panel || !authUser) return;
  const data = {
    clientName: panel.querySelector("[name='clientName']")?.value.trim() || "",
    clientPhone: panel.querySelector("[name='clientPhone']")?.value.trim() || "",
    requirements: panel.querySelector("[name='clientRequirements']")?.value.trim() || "",
    siteName: panel.querySelector("[name='siteName']")?.value.trim() || "",
    siteAddress: panel.querySelector("[name='siteAddress']")?.value.trim() || "",
    siteSchedule: panel.querySelector("[name='siteSchedule']")?.value.trim() || "",
    tradeStatus: panel.querySelector("[name='tradeStatus']")?.value || "상담중",
    tradeMemo: panel.querySelector("[name='tradeMemo']")?.value.trim() || "",
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(getClientManagementStorageKey(), JSON.stringify(data));
  renderClientManagementPanel();
}

function getUserContactInfo(user = authUser) {
  const source = user?.contactInfo && typeof user.contactInfo === "object" ? user.contactInfo : {};
  return {
    name: source.name || user?.contactName || user?.name || "",
    title: source.title || user?.contactTitle || user?.title || "",
    companyName: source.companyName || user?.contactCompanyName || user?.companyName || "",
    phone: source.phone || user?.contactPhone || user?.phone || "",
    email: source.email || user?.contactEmail || user?.email || user?.socialEmail || "",
    address: source.address || user?.contactAddress || user?.companyAddress || "",
    businessCardFileName: source.businessCardFileName || user?.businessCardFileName || "",
    updatedAt: source.updatedAt || ""
  };
}

function renderMyContactInfoPanel(user = authUser) {
  const contact = getUserContactInfo(user);
  return `
    <section class="my-contact-info-panel" id="myContactInfoPanel">
      <div class="my-contact-info-head">
        <div>
          <span>담당자정보</span>
          <strong>명함 정보</strong>
        </div>
        <small>${contact.businessCardFileName ? `명함: ${escapeHtml(contact.businessCardFileName)}` : "명함 파일 없음"}</small>
      </div>
      <div class="my-contact-info-grid">
        <label>
          이름
          <input name="contactName" type="text" value="${escapeHtml(contact.name)}" />
        </label>
        <label>
          직함
          <input name="contactTitle" type="text" value="${escapeHtml(contact.title)}" />
        </label>
        <label>
          회사명
          <input name="contactCompanyName" type="text" value="${escapeHtml(contact.companyName)}" />
        </label>
        <label>
          번호
          <input name="contactPhone" type="text" value="${escapeHtml(contact.phone)}" />
        </label>
        <label>
          이메일
          <input name="contactEmail" type="email" value="${escapeHtml(contact.email)}" />
        </label>
        <label class="wide">
          주소
          <input name="contactAddress" type="text" value="${escapeHtml(contact.address)}" />
        </label>
      </div>
      <div class="my-contact-info-actions">
        <span id="myContactInfoStatus">${contact.updatedAt ? `${escapeHtml(formatDateTime(contact.updatedAt))} 저장됨` : "저장된 담당자정보를 확인하세요."}</span>
        <button class="secondary-action compact-action" id="saveMyContactInfoBtn" type="button">담당자정보 저장</button>
      </div>
    </section>
  `;
}

function saveMyContactInfo() {
  const panel = document.querySelector("#myContactInfoPanel");
  if (!panel || !authUser) return;
  const contactInfo = {
    ...getUserContactInfo(authUser),
    name: panel.querySelector("[name='contactName']")?.value.trim() || "",
    title: panel.querySelector("[name='contactTitle']")?.value.trim() || "",
    companyName: panel.querySelector("[name='contactCompanyName']")?.value.trim() || "",
    phone: panel.querySelector("[name='contactPhone']")?.value.trim() || "",
    email: panel.querySelector("[name='contactEmail']")?.value.trim() || "",
    address: panel.querySelector("[name='contactAddress']")?.value.trim() || "",
    updatedAt: new Date().toISOString()
  };
  authUser = {
    ...authUser,
    name: contactInfo.name || authUser.name,
    title: contactInfo.title || authUser.title,
    companyName: contactInfo.companyName || authUser.companyName,
    phone: contactInfo.phone || authUser.phone,
    email: contactInfo.email || authUser.email,
    companyAddress: contactInfo.address || authUser.companyAddress,
    contactInfo
  };
  saveAuthSession(authUser);
  renderAuthControls();
  renderMyPage();
}

function getReturnOrderStorageKey(user = authUser) {
  return `tbpReturnOrders:${String(user?.businessNumber || "guest").trim() || "guest"}`;
}

function loadReturnOrders(user = authUser) {
  try {
    const rows = JSON.parse(localStorage.getItem(getReturnOrderStorageKey(user)) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function getCartQuoteTotal(items = cart) {
  return items.reduce((sum, item) => sum + (Number(item.quotePrice || 0) * Number(item.qty || 0)), 0);
}

function getMemberGradeLabel(user = authUser) {
  if (!user) return "비회원";
  if (isAdminUser()) return "관리자";
  if (hasMemberPriceAccess(user)) return `${user.memberGrade || "사업자"} · 등급별 가격 공개`;
  if (user.approvalStatus === "보류") return "사업자 승인 대기";
  return "사업자등록증 등록 필요";
}

function renderMemberHomeBoard() {
  const board = document.querySelector("#memberHomeBoard");
  if (!board) return;
  const showBoard = Boolean(authUser && !isAdminUser());
  board.classList.toggle("hidden", !showBoard);
  if (!showBoard) return;

  const pastOrders = mergeOrderHistory(loadPastOrders(), remoteOrders);
  const returnOrders = loadReturnOrders();
  const currentOrderCount = cart.length ? 1 : 0;
  const totalOrderCount = pastOrders.length + currentOrderCount;
  setText("#memberBoardTitle", `${authUser.companyName || authUser.name || "회원"}님 현황`);
  setText("#memberBoardGrade", getMemberGradeLabel());
  setText("#memberBoardPriceAccess", hasMemberPriceAccess() ? "상품 금액 확인 가능" : "사업자 승인 후 금액 공개");
  setText("#memberBoardOrderCount", `${number(totalOrderCount)}건`);
  setText("#memberBoardCartSummary", cart.length ? `장바구니 ${number(cart.length)}개 품목` : "장바구니 비어 있음");
  setText("#memberBoardReturnCount", `${number(returnOrders.length)}건`);
}

function renderMyPage() {
  const profile = document.querySelector("#myProfileSummary");
  const current = document.querySelector("#myCurrentOrderSummary");
  const myCart = document.querySelector("#myCartList");
  const clientPanel = document.querySelector("#myClientManagementPanel");
  const past = document.querySelector("#myPastOrderList");
  if (!profile || !current || !myCart || !clientPanel || !past) return;

  if (!authUser) {
    const loginPrompt = `
      <div class="empty-state">
        마이페이지는 회원 로그인 후 사용할 수 있습니다.
        <div class="my-empty-actions">
          <button class="primary-action" type="button" data-page-target="loginPage">로그인</button>
          <button class="secondary-action" type="button" data-page-target="signupPage">회원가입</button>
        </div>
      </div>
    `;
    profile.innerHTML = loginPrompt;
    current.innerHTML = `<div class="empty-state">로그인 후 현재 주문내역을 확인할 수 있습니다.</div>`;
    myCart.innerHTML = `<div class="empty-state">로그인 후 내 장바구니를 확인할 수 있습니다.</div>`;
    clientPanel.innerHTML = `<div class="empty-state">로그인 후 거래처 요구사항과 현장정보를 관리할 수 있습니다.</div>`;
    past.innerHTML = `<div class="empty-state">로그인 후 지난 주문내역을 확인할 수 있습니다.</div>`;
    return;
  }

  const totalQuote = getCartQuoteTotal(cart);
  const pastOrders = mergeOrderHistory(loadPastOrders(), remoteOrders);
  profile.innerHTML = `
    <div class="my-profile-card">
      <div>
        <span>회원</span>
        <strong>${escapeHtml(authUser.companyName || authUser.name || "-")}</strong>
      </div>
      <div>
        <span>담당자</span>
        <strong>${escapeHtml(authUser.name || "-")}</strong>
      </div>
      <div>
        <span>사업자등록번호</span>
        <strong>${escapeHtml(authUser.businessNumber || "-")}</strong>
      </div>
      <div>
        <span>내 등급</span>
        <strong>${escapeHtml(getMemberGradeLabel())}</strong>
      </div>
      <div>
        <span>가입 방식</span>
        <strong>${escapeHtml(authUser.provider || "일반 회원가입")}</strong>
      </div>
      <div>
        <span>가격 공개</span>
        <strong>${hasMemberPriceAccess() ? "가능" : "승인 필요"}</strong>
      </div>
    </div>
    ${renderMyContactInfoPanel(authUser)}
  `;

  current.innerHTML = `
    <div class="my-current-order-summary">
      <div><span>현재 품목</span><strong>${number(cart.length)}개</strong></div>
      <div><span>현재 견적 합계</span><strong>${money.format(totalQuote)}</strong></div>
      <div><span>지난 주문</span><strong>${number(pastOrders.length)}건</strong></div>
      <div><span>상태</span><strong>${cart.length ? "주문 저장 가능" : "장바구니 비어 있음"}</strong></div>
    </div>
  `;

  myCart.innerHTML = renderMyOrderItems(cart, "장바구니에 담긴 상품이 없습니다.");
  renderClientManagementPanel();
  past.innerHTML = pastOrders.map(renderPastOrderCard).join("") || `<div class="empty-state">아직 지난 주문내역이 없습니다.</div>`;
}

function renderClientManagementPanel() {
  const panel = document.querySelector("#myClientManagementPanel");
  if (!panel) return;
  if (!authUser) {
    panel.innerHTML = `<div class="empty-state">로그인 후 거래처 정보를 관리할 수 있습니다.</div>`;
    return;
  }

  const info = loadClientManagementInfo();
  const tradeStatus = info.tradeStatus || (cart.length ? "견적중" : "상담중");
  const lastUpdated = info.updatedAt ? formatDateTime(info.updatedAt) : "저장 전";
  panel.innerHTML = `
    <div class="client-management-grid">
      <article class="client-management-card">
        <div>
          <span>클라이언트 요구사항</span>
          <strong>요청 내용</strong>
        </div>
        <label>
          고객명
          <input name="clientName" type="text" value="${escapeHtml(info.clientName || authUser.companyName || "")}" placeholder="고객 또는 거래처명" />
        </label>
        <label>
          연락처
          <input name="clientPhone" type="text" value="${escapeHtml(info.clientPhone || authUser.phone || "")}" placeholder="010-0000-0000" />
        </label>
        <label class="wide">
          요구사항
          <textarea name="clientRequirements" rows="5" placeholder="원하는 타일 스타일, 예산, 납기, 배송 요청 등을 입력하세요.">${escapeHtml(info.requirements || "")}</textarea>
        </label>
      </article>

      <article class="client-management-card">
        <div>
          <span>현장정보</span>
          <strong>시공/배송 현장</strong>
        </div>
        <label>
          현장명
          <input name="siteName" type="text" value="${escapeHtml(info.siteName || "")}" placeholder="예: 강남 욕실 리모델링" />
        </label>
        <label>
          일정
          <input name="siteSchedule" type="text" value="${escapeHtml(info.siteSchedule || "")}" placeholder="예: 6월 20일 입고 희망" />
        </label>
        <label class="wide">
          현장주소
          <input name="siteAddress" type="text" value="${escapeHtml(info.siteAddress || authUser.companyAddress || "")}" placeholder="배송 또는 시공 현장 주소" />
        </label>
      </article>

      <article class="client-management-card">
        <div>
          <span>거래현황</span>
          <strong>${escapeHtml(tradeStatus)}</strong>
        </div>
        <div class="client-status-strip">
          <div><span>장바구니</span><strong>${number(cart.length)}개</strong></div>
          <div><span>현재 견적</span><strong>${money.format(getCartQuoteTotal(cart))}</strong></div>
          <div><span>최종 저장</span><strong>${escapeHtml(lastUpdated)}</strong></div>
        </div>
        <label>
          진행 상태
          <select name="tradeStatus">
            ${["상담중", "견적중", "발주대기", "배송준비", "거래완료", "보류"].map((status) => `
              <option value="${escapeHtml(status)}"${status === tradeStatus ? " selected" : ""}>${escapeHtml(status)}</option>
            `).join("")}
          </select>
        </label>
        <label class="wide">
          거래 메모
          <textarea name="tradeMemo" rows="4" placeholder="견적 조건, 결제 예정일, 반품/교환 요청 등을 기록하세요.">${escapeHtml(info.tradeMemo || "")}</textarea>
        </label>
      </article>
    </div>
  `;
}

function renderMyOrderItems(items, emptyText) {
  return (items || []).map((item) => `
    <article class="my-order-item">
      ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />` : `<div class="my-order-thumb-empty">이미지 없음</div>`}
      <div>
        <strong>${escapeHtml(item.name || "-")}</strong>
        <span>${escapeHtml(item.kind || "-")} · ${escapeHtml(item.size || "-")} · ${escapeHtml(item.finish || item.option || "-")}</span>
        <span>${number(item.qty || 0)}${escapeHtml(item.unit || "")} · ${money.format(Number(item.quotePrice || 0))}</span>
      </div>
    </article>
  `).join("") || `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
}

function renderPastOrderCard(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  return `
    <article class="my-past-order-card">
      <div class="my-past-order-head">
        <div>
          <span>${escapeHtml(formatDateTime(order.createdAt))}</span>
          <strong>${escapeHtml(order.orderNumber || "-")}</strong>
        </div>
      <div>
        <span>${number(items.length)}개 품목</span>
        <strong>${money.format(Number(order.totalQuote || 0))}</strong>
        <em>${escapeHtml(order.status || "접수대기")}</em>
      </div>
      </div>
      <div class="my-order-list compact-my-order-list">
        ${renderMyOrderItems(items.slice(0, 4), "저장된 상품이 없습니다.")}
      </div>
    </article>
  `;
}

async function saveCurrentCartAsPastOrder() {
  if (!authUser) {
    switchPage("loginPage");
    return;
  }
  if (!hasMemberPriceAccess()) {
    setText("#loginStatus", "사업자등록증 승인 후 주문 접수가 가능합니다.");
    renderMyPage();
    return;
  }
  if (!cart.length) {
    renderMyPage();
    return;
  }
  const createdAt = new Date().toISOString();
  const existingOrders = loadPastOrders();
  let order = {
    orderNumber: `TBP-${createdAt.slice(0, 10).replaceAll("-", "")}-${String(existingOrders.length + 1).padStart(3, "0")}`,
    createdAt,
    status: "접수대기",
    totalQuote: getCartQuoteTotal(cart),
    items: cart.map((item) => ({ ...item }))
  };
  try {
    const payload = await requestJson("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getMemberProductAuthHeaders()
      },
      body: JSON.stringify({
        businessNumber: authUser.businessNumber,
        companyName: authUser.companyName || "",
        contactName: authUser.name || "",
        items: cart,
        status: "접수대기"
      })
    }, { retries: 1, timeoutMs: 10000 });
    if (payload?.order) {
      order = normalizeOrderHistoryRow(payload.order);
      remoteOrders = mergeOrderHistory([order], remoteOrders);
    }
  } catch (error) {
    console.warn(error);
  }
  savePastOrders([order, ...existingOrders].slice(0, 50));
  renderMemberHomeBoard();
  renderMyPage();
}

const QUALITY_CORE_FIELDS = [
  ["size", "규격"],
  ["material", "재질"],
  ["finish", "마감"],
  ["color", "색상"],
  ["patternCategory", "스타일"]
];

function isQualityMissingValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return true;
  return /미확인|확인\s*필요|unknown|null|undefined/i.test(text);
}

function getProductQualityFieldValue(product, key) {
  if (!product) return "";
  if (key === "size") return product.size || product.sizeLabel || product.spec || product.tileSize || product.sizeThicknessLabel || "";
  if (key === "material") return product.material || product.materialCategory || product.tileMaterial || product.bodyType || "";
  if (key === "finish") return product.finish || product.surfaceFinish || product.finishGroup || product.finishDetail || "";
  if (key === "color") return product.color || product.mainColor || product.subColor || product.colorName || "";
  if (key === "patternCategory") {
    return product.patternCategory || product.style || product.styleMain || product.style_primary || product.styleCategories?.[0] || "";
  }
  return product[key] || "";
}

function getQualityBrand(product) {
  return getAdminProductBrandLabel(product) || "브랜드 미확인";
}

function hasQualityImage(product) {
  return Boolean(getProductImage(product, [
    "image",
    "mainImageUrl",
    "main_image_url",
    "originalImage",
    "detailImage",
    "textureImage",
    "closeImage"
  ], true));
}

function getProductQualityIssues(product) {
  const issues = [];
  if (product?.productType === "tile") {
    QUALITY_CORE_FIELDS.forEach(([key, label]) => {
      if (isQualityMissingValue(getProductQualityFieldValue(product, key))) issues.push(label);
    });
  }
  if (!hasQualityImage(product)) issues.push("이미지");
  if (!Number(product?.costPrice || 0)) issues.push("원가");
  if (!hasStockValue(product)) issues.push("재고");
  return issues;
}

function getQualityPriority(issues, product) {
  let score = issues.length;
  if (product?.productType === "tile") score += 2;
  if (issues.includes("규격")) score += 2;
  if (issues.includes("재질")) score += 2;
  if (issues.includes("마감")) score += 2;
  if (issues.includes("색상")) score += 1;
  if (issues.includes("이미지")) score += 1;
  if (score >= 8) return "높음";
  if (score >= 4) return "중간";
  return "낮음";
}

function getQualityPriorityClass(priority) {
  if (priority === "높음") return "is-high";
  if (priority === "중간") return "is-mid";
  return "is-low";
}

function buildQualityDashboardModel() {
  const brandMap = new Map();
  const missingByField = QUALITY_CORE_FIELDS.map(([, label]) => ({ label, count: 0 }));
  const missingFieldIndex = new Map(missingByField.map((entry, index) => [entry.label, index]));
  const issueProducts = [];
  let tileCount = 0;
  let tileMissingCoreCount = 0;
  let noImageCount = 0;
  let noCostCount = 0;
  let noStockCount = 0;

  products.forEach((product) => {
    const brand = getQualityBrand(product);
    const brandStat = brandMap.get(brand) || {
      brand,
      totalCount: 0,
      tileCount: 0,
      missing: Object.fromEntries(QUALITY_CORE_FIELDS.map(([, label]) => [label, 0])),
      noImage: 0,
      noCost: 0,
      noStock: 0,
      issueCount: 0
    };
    brandStat.totalCount += 1;

    const issues = getProductQualityIssues(product);
    if (product.productType === "tile") {
      tileCount += 1;
      brandStat.tileCount += 1;
      const coreIssues = issues.filter((issue) => missingFieldIndex.has(issue));
      if (coreIssues.length) tileMissingCoreCount += 1;
      coreIssues.forEach((issue) => {
        brandStat.missing[issue] += 1;
        missingByField[missingFieldIndex.get(issue)].count += 1;
      });
    }

    if (issues.includes("이미지")) {
      noImageCount += 1;
      brandStat.noImage += 1;
    }
    if (issues.includes("원가")) {
      noCostCount += 1;
      brandStat.noCost += 1;
    }
    if (issues.includes("재고")) {
      noStockCount += 1;
      brandStat.noStock += 1;
    }
    if (issues.length) {
      brandStat.issueCount += 1;
      issueProducts.push({
        product,
        brand,
        issues,
        priority: getQualityPriority(issues, product)
      });
    }
    brandMap.set(brand, brandStat);
  });

  const brandStats = Array.from(brandMap.values()).map((entry) => {
    const coreTotal = entry.tileCount * QUALITY_CORE_FIELDS.length;
    const coreMissing = QUALITY_CORE_FIELDS.reduce((sum, [, label]) => sum + entry.missing[label], 0);
    const completeness = coreTotal ? Math.round((1 - coreMissing / coreTotal) * 100) : 100;
    return { ...entry, coreMissing, completeness };
  }).sort((a, b) => {
    if (a.completeness !== b.completeness) return a.completeness - b.completeness;
    if (a.coreMissing !== b.coreMissing) return b.coreMissing - a.coreMissing;
    return a.brand.localeCompare(b.brand, "ko");
  });

  issueProducts.sort((a, b) => {
    const priorityWeight = { "높음": 3, "중간": 2, "낮음": 1 };
    const weightDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (weightDiff) return weightDiff;
    if (a.issues.length !== b.issues.length) return b.issues.length - a.issues.length;
    return a.brand.localeCompare(b.brand, "ko");
  });

  return {
    totalCount: products.length,
    tileCount,
    tileMissingCoreCount,
    tileCompleteness: tileCount ? Math.round((1 - tileMissingCoreCount / tileCount) * 100) : 100,
    noImageCount,
    noCostCount,
    noStockCount,
    missingByField,
    brandStats,
    issueProducts
  };
}

function renderQualityMissingBadge(count, total) {
  const tone = count ? "is-high" : "is-low";
  const suffix = total ? ` / ${number(total)}` : "";
  return `<span class="quality-badge ${tone}">${number(count)}${suffix}</span>`;
}

function renderQualityDashboard() {
  const summaryGrid = document.querySelector("#qualitySummaryGrid");
  const fieldList = document.querySelector("#qualityMissingFieldList");
  const priorityList = document.querySelector("#qualityPriorityList");
  const brandRows = document.querySelector("#qualityBrandRows");
  const issueRows = document.querySelector("#qualityIssueRows");
  if (!summaryGrid || !fieldList || !priorityList || !brandRows || !issueRows) return;

  const model = buildQualityDashboardModel();
  summaryGrid.innerHTML = [
    ["전체 상품", `${number(model.totalCount)}개`, "현재 관리자 DB에 로드된 전체 상품"],
    ["타일 상품", `${number(model.tileCount)}개`, "품질 점검 기준이 적용되는 타일 상품"],
    ["타일 핵심 완성도", `${number(model.tileCompleteness)}%`, "규격·재질·마감·색상·스타일 기준"],
    ["핵심 누락 타일", `${number(model.tileMissingCoreCount)}개`, "타일 검색 품질에 직접 영향이 있는 상품"],
    ["이미지 누락", `${number(model.noImageCount)}개`, "이미지 검색과 상품 카드 보강 필요"],
    ["원가 누락", `${number(model.noCostCount)}개`, "관리자 원가/마진 점검 필요"]
  ].map(([label, value, note]) => `
    <article class="admin-summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(note)}</p>
    </article>
  `).join("");

  fieldList.innerHTML = model.missingByField.map((entry) => {
    const percent = model.tileCount ? Math.round((entry.count / model.tileCount) * 100) : 0;
    return `
      <article class="quality-field-row">
        <div>
          <strong>${escapeHtml(entry.label)}</strong>
          <span>${number(entry.count)}개 · ${number(percent)}%</span>
        </div>
        <div class="quality-progress" aria-label="${escapeHtml(entry.label)} 누락률 ${number(percent)}%">
          <i style="width:${Math.min(100, percent)}%"></i>
        </div>
      </article>
    `;
  }).join("") || `<div class="empty-state compact-empty-state">누락 필드가 없습니다.</div>`;

  priorityList.innerHTML = model.brandStats.slice(0, 6).map((entry) => `
    <article class="quality-priority-card">
      <div>
        <strong>${escapeHtml(entry.brand)}</strong>
        <span class="quality-badge ${entry.completeness >= 90 ? "is-low" : entry.completeness >= 70 ? "is-mid" : "is-high"}">${number(entry.completeness)}%</span>
      </div>
      <p>타일 ${number(entry.tileCount)}개 · 핵심 누락 ${number(entry.coreMissing)}건 · 점검 상품 ${number(entry.issueCount)}개</p>
    </article>
  `).join("") || `<div class="empty-state compact-empty-state">정리 우선순위 데이터가 없습니다.</div>`;

  brandRows.innerHTML = model.brandStats.map((entry) => `
    <tr>
      <td>${escapeHtml(entry.brand)}</td>
      <td>${number(entry.totalCount)}개</td>
      <td>${number(entry.tileCount)}개</td>
      <td><span class="quality-badge ${entry.completeness >= 90 ? "is-low" : entry.completeness >= 70 ? "is-mid" : "is-high"}">${number(entry.completeness)}%</span></td>
      ${QUALITY_CORE_FIELDS.map(([, label]) => `<td>${renderQualityMissingBadge(entry.missing[label], entry.tileCount)}</td>`).join("")}
      <td>${renderQualityMissingBadge(entry.noImage, entry.totalCount)}</td>
      <td>${renderQualityMissingBadge(entry.noCost, entry.totalCount)}</td>
    </tr>
  `).join("") || `<tr><td colspan="11">브랜드별 품질 데이터가 없습니다.</td></tr>`;

  issueRows.innerHTML = model.issueProducts.slice(0, 160).map(({ product, brand, issues, priority }) => `
    <tr>
      <td>${escapeHtml(brand)}</td>
      <td>${escapeHtml(product.managementCode || product.id || "-")}</td>
      <td>${escapeHtml(product.name || "-")}</td>
      <td>${escapeHtml(PRODUCT_TYPE_LABELS[product.productType] || product.productType || "-")}</td>
      <td>${escapeHtml(getProductQualityFieldValue(product, "size") || "-")}</td>
      <td class="quality-issue-list">${issues.map((issue) => `<span class="quality-badge is-high">${escapeHtml(issue)}</span>`).join(" ")}</td>
      <td><span class="quality-badge ${getQualityPriorityClass(priority)}">${escapeHtml(priority)}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="7">우선 검수 상품이 없습니다.</td></tr>`;
}

function renderSearchTrainingView() {
  prepareTaxonomyProducts();
  if (!searchTrainingCurrentSample) renderSearchTrainingRandomSample(false);
  else renderSearchTrainingSample(searchTrainingCurrentSample);
  renderSearchTrainingBatchControls();
  if (!searchTrainingBatchSamples.length) startSearchTrainingBatchQuestion({ keepType: true });
  else renderSearchTrainingBatchGrid();
  renderSearchTrainingStats();
  renderSearchTrainingRecentRows();
  prepareSearchTrainingNextSample();
  void loadSearchTrainingStats();
}

function getSearchTrainingCandidates() {
  prepareTaxonomyProducts();
  const cacheKey = [
    normalizedTaxonomySourceKey,
    normalizedTaxonomyProducts.length,
    products.length,
    products[0]?.id || "",
    products[products.length - 1]?.id || "",
    adminProductsHydrated ? "admin" : "public"
  ].join(":");
  if (searchTrainingCandidatesCache.key === cacheKey && Array.isArray(searchTrainingCandidatesCache.items)) {
    return searchTrainingCandidatesCache.items;
  }
  searchTrainingPreparedNextSample = null;
  const productById = new Map(products.map((entry) => [entry.id, entry]));
  const candidates = normalizedTaxonomyProducts
    .filter((item) => item?.product?.productType === "tile" || item?.productType === "tile" || item?.mainCategory === "tile")
    .map((item) => {
      const product = item.product || productById.get(item.id) || productById.get(item.productId);
      if (!product) return null;
      const image = getProductImage(product, [
        "image",
        "mainImageUrl",
        "main_image_url",
        "imageUrl",
        "thumbnail",
        "textureImage",
        "detailImage",
        "originalImage",
        "closeImage"
      ], true);
      if (!image) return null;
      return { item, product, image };
    })
    .filter(Boolean);
  searchTrainingCandidatesCache = { key: cacheKey, items: candidates };
  return candidates;
}

function renderSearchTrainingRandomSample(force = false) {
  const candidates = getSearchTrainingCandidates();
  if (!candidates.length) {
    searchTrainingCurrentSample = null;
    updateSearchTrainingNavigationButtons();
    setText("#searchTrainingStatus", "이미지가 있는 타일 상품을 찾지 못했습니다.");
    return;
  }
  if (force || !searchTrainingCurrentSample) {
    const sample = searchTrainingPreparedNextSample || buildRandomSearchTrainingSample(candidates);
    searchTrainingPreparedNextSample = null;
    if (!sample) {
      setText("#searchTrainingStatus", "검수할 타일 이미지를 준비하지 못했습니다.");
      updateSearchTrainingNavigationButtons();
      return;
    }
    setSearchTrainingCurrentSample(sample, { addToHistory: true });
    return;
  }
  renderSearchTrainingSample(searchTrainingCurrentSample);
  prepareSearchTrainingNextSample();
}

function buildRandomSearchTrainingSample(candidates = getSearchTrainingCandidates()) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const unseen = candidates.filter((entry) => !searchTrainingVisitedIds.has(entry.product.id));
  const pool = unseen.length ? unseen : candidates;
  if (!unseen.length) searchTrainingVisitedIds = new Set();
  const picked = pool[Math.floor(Math.random() * pool.length)];
  if (!picked) return null;
  searchTrainingVisitedIds.add(picked.product.id);
  return buildSearchTrainingSample(picked);
}

function prepareSearchTrainingNextSample() {
  if (searchTrainingPreparedNextSample) return;
  window.setTimeout(() => {
    if (searchTrainingPreparedNextSample) return;
    const sample = buildRandomSearchTrainingSample();
    if (!sample) return;
    searchTrainingPreparedNextSample = sample;
    if (sample.image && typeof Image !== "undefined") {
      searchTrainingPrefetchImage = new Image();
      searchTrainingPrefetchImage.src = sample.image;
    }
  }, 0);
}

function renderSearchTrainingBatchControls() {
  const type = searchTrainingBatchQuestion.type || document.querySelector("#searchTrainingBatchType")?.value || "style";
  const typeSelect = document.querySelector("#searchTrainingBatchType");
  if (typeSelect) typeSelect.value = type;
  const labelSelect = document.querySelector("#searchTrainingBatchLabel");
  if (!labelSelect) return;
  const previousValue = searchTrainingBatchQuestion.label || labelSelect.value;
  const options = unique([previousValue, ...(type === "color" ? SEARCH_TRAINING_COLOR_OPTIONS : SEARCH_TRAINING_STYLE_BATCH_OPTIONS)].filter(Boolean));
  labelSelect.innerHTML = options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  labelSelect.value = options.includes(previousValue) ? previousValue : options[0] || "";
  searchTrainingBatchQuestion = { type, label: labelSelect.value };
  renderSearchTrainingBatchPrompt();
}

function renderSearchTrainingBatchPrompt() {
  const type = document.querySelector("#searchTrainingBatchType")?.value || searchTrainingBatchQuestion.type || "style";
  const label = document.querySelector("#searchTrainingBatchLabel")?.value || searchTrainingBatchQuestion.label || "";
  searchTrainingBatchQuestion = { type, label };
  const typeLabel = type === "color" ? "색상" : "스타일";
  setText("#searchTrainingBatchPrompt", label
    ? `다음 중 ${formatSearchTrainingQuizLabel(type, label)} 타일은? 해당되는 사진을 모두 선택하세요.`
    : "다음 중 해당되는 타일을 모두 선택하면 DB 정리와 학습 저장을 함께 진행합니다.");
}

function startSearchTrainingBatchQuestion(options = {}) {
  const type = options.keepType
    ? document.querySelector("#searchTrainingBatchType")?.value || searchTrainingBatchQuestion.type || "style"
    : Math.random() > 0.78 ? "color" : "style";
  searchTrainingBatchSamples = buildSearchTrainingBatchSamples(SEARCH_TRAINING_BATCH_SIZE);
  const label = pickSearchTrainingBatchLabelFromSamples(searchTrainingBatchSamples, type, searchTrainingBatchQuestion.label)
    || pickSearchTrainingBatchLabel(type, searchTrainingBatchQuestion.label);
  searchTrainingBatchQuestion = { type, label };
  renderSearchTrainingBatchControls();
  searchTrainingBatchSelectedIds = new Set();
  renderSearchTrainingBatchGrid();
}

function pickSearchTrainingBatchLabel(type = "style", previousLabel = "") {
  const options = (type === "color" ? SEARCH_TRAINING_COLOR_OPTIONS : SEARCH_TRAINING_STYLE_BATCH_OPTIONS)
    .filter((value) => value && !/미확인|기타/.test(value));
  const pool = options.length > 1 ? options.filter((value) => value !== previousLabel) : options;
  return pool[Math.floor(Math.random() * pool.length)] || options[0] || "";
}

function pickSearchTrainingBatchLabelFromSamples(samples = [], type = "style", previousLabel = "") {
  const counts = new Map();
  for (const sample of samples) {
    for (const value of getSearchTrainingBatchDbLabels(sample, type)) {
      const label = normalizeSearchTrainingBatchLabel(type, value);
      if (!label || /미확인|확인\s*필요|기타/.test(label)) continue;
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }
  const entries = [...counts.entries()]
    .filter(([label]) => label !== previousLabel || counts.size === 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  if (!entries.length && counts.size) {
    return [...counts.keys()][Math.floor(Math.random() * counts.size)] || "";
  }
  if (!entries.length) return "";
  const topCount = entries[0][1];
  const topPool = entries.filter(([, count]) => count === topCount);
  return topPool[Math.floor(Math.random() * topPool.length)]?.[0] || entries[0][0] || "";
}

function getSearchTrainingBatchDbLabels(sample, type = "style") {
  if (!sample) return [];
  if (type === "color") {
    return [
      sample.product?.color,
      sample.item?.mainColor,
      sample.predicted?.color
    ];
  }
  return [
    sample.product?.patternCategory,
    sample.item?.stylePrimary,
    ...(Array.isArray(sample.item?.styleCategories) ? sample.item.styleCategories : []),
    sample.predicted?.style,
    ...getProductDirectTileCategories(sample.product)
  ];
}

function normalizeSearchTrainingBatchLabel(type, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const compact = normalizeSearchText(raw);
  if (!compact || /미확인|확인필요|unknown/.test(compact)) return "";
  if (type === "color") {
    if (/아이보리|크림|ivory|cream|offwhite/.test(compact)) return "아이보리 / 크림";
    if (/다크그레이|차콜|charcoal|darkgray|darkgrey/.test(compact)) return "차콜 / 다크그레이";
    if (/테라코타|오렌지|terracotta|orange/.test(compact)) return "테라코타 / 오렌지";
    if (/화이트|white/.test(compact)) return "화이트";
    if (/베이지|beige/.test(compact)) return "베이지";
    if (/브라운|brown/.test(compact)) return "브라운";
    if (/그레이|회색|gray|grey/.test(compact)) return "그레이";
    if (/블랙|black/.test(compact)) return "블랙";
    if (/그린|green/.test(compact)) return "그린";
    if (/블루|blue/.test(compact)) return "블루";
    if (/핑크|pink/.test(compact)) return "핑크";
    if (/레드|red/.test(compact)) return "레드";
    if (/옐로우|노랑|yellow/.test(compact)) return "옐로우";
    if (/메탈|metal/.test(compact)) return "메탈릭";
    if (/멀티|multi/.test(compact)) return "멀티컬러";
    return raw;
  }
  if (/마블|marble|대리석|칼라카타|카라라|베인/.test(compact)) return "마블";
  if (/트래버틴|트라버틴|travertine/.test(compact)) return "트래버틴";
  if (/스톤|stone|석재|라임스톤|슬레이트|현무|자연석/.test(compact)) return "스톤";
  if (/시멘트|cement|콘크리트|concrete|몰탈|모르타르/.test(compact)) return compact.includes("콘크리트") ? "콘크리트" : "시멘트";
  if (/테라조|terrazzo|칩|chip|입자/.test(compact)) return "테라조";
  if (/우드|wood|쪽마루|오크|월넛|티크|나뭇결/.test(compact)) return "우드";
  if (/솔리드|solid|무지|단색|민자/.test(compact)) return "솔리드";
  if (/브릭|벽돌|brick|서브웨이|subway/.test(compact)) return "브릭";
  if (/핸드메이드|젤리지|수공예/.test(compact)) return "핸드메이드";
  if (/입체|텍스처|텍스쳐|3d|양각|골지|리브드/.test(compact)) return "입체";
  if (/모자이크|mosaic/.test(compact)) return "모자이크";
  if (/패턴|pattern|데코|체크|플라워|지오메트릭/.test(compact)) return "패턴";
  return raw.replace(/룩$/, "");
}

function formatSearchTrainingQuizLabel(type, label) {
  if (type === "color") return `${label} 계열`;
  if (["스톤", "마블", "시멘트", "트래버틴", "테라조", "우드", "핸드메이드"].includes(label)) return `${label}룩`;
  return label;
}

function buildSearchTrainingBatchSamples(count = SEARCH_TRAINING_BATCH_SIZE) {
  const candidates = getSearchTrainingCandidates();
  if (!candidates.length) return [];
  let pool = candidates.filter((entry) => !searchTrainingBatchVisitedIds.has(entry.product.id));
  if (pool.length < count) {
    searchTrainingBatchVisitedIds = new Set();
    pool = candidates;
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);
  picked.forEach((entry) => searchTrainingBatchVisitedIds.add(entry.product.id));
  return picked.map((entry) => buildSearchTrainingSample(entry));
}

function renderSearchTrainingBatchGrid() {
  renderSearchTrainingBatchPrompt();
  renderSearchTrainingBatchControls();
  const grid = document.querySelector("#searchTrainingBatchGrid");
  if (!grid) return;
  if (!searchTrainingBatchSamples.length) {
    grid.innerHTML = `<div class="empty-state">이미지가 있는 타일 상품을 찾지 못했습니다.</div>`;
    setText("#searchTrainingBatchStatus", "교육할 이미지가 없습니다.");
    return;
  }
  grid.innerHTML = searchTrainingBatchSamples.map((sample) => {
    const selected = searchTrainingBatchSelectedIds.has(sample.product.id);
    const savedLabels = Array.isArray(sample.batchSavedLabels) ? sample.batchSavedLabels : [];
    return `
      <button class="search-training-batch-card ${selected ? "is-selected" : ""}" type="button" data-batch-sample-id="${escapeHtml(sample.product.id)}">
        <span class="search-training-batch-check">${selected ? "선택됨" : "선택"}</span>
        <img src="${escapeHtml(sample.image)}" alt="${escapeHtml(sample.product.name || "타일 이미지")}" loading="lazy" />
        <strong>${escapeHtml(sample.product.name || "상품명 미확인")}</strong>
        <small>${escapeHtml(sample.predicted.color || "-")} · ${escapeHtml(sample.predicted.style || "-")}</small>
        ${savedLabels.length ? `<em>${savedLabels.map(escapeHtml).join(" / ")}</em>` : ""}
      </button>
    `;
  }).join("");
  const { type, label } = searchTrainingBatchQuestion;
  setText("#searchTrainingBatchStatus", `${formatSearchTrainingQuizLabel(type, label)} 문제: 현재 6장 DB 값 기준으로 출제했습니다. ${number(searchTrainingBatchSelectedIds.size)}장을 선택했습니다. 저장하면 DB ${type === "color" ? "색상" : "스타일"}도 함께 업데이트됩니다.`);
}

function handleSearchTrainingBatchGridClick(event) {
  const card = event.target.closest("[data-batch-sample-id]");
  if (!card) return;
  const id = card.dataset.batchSampleId || "";
  if (!id) return;
  if (searchTrainingBatchSelectedIds.has(id)) searchTrainingBatchSelectedIds.delete(id);
  else searchTrainingBatchSelectedIds.add(id);
  renderSearchTrainingBatchGrid();
}

function clearSearchTrainingBatchSelection() {
  searchTrainingBatchSelectedIds = new Set();
  renderSearchTrainingBatchGrid();
}

function setSearchTrainingCurrentSample(sample, options = {}) {
  searchTrainingCurrentSample = sample;
  if (options.addToHistory) {
    if (searchTrainingHistoryIndex < searchTrainingHistory.length - 1) {
      searchTrainingHistory = searchTrainingHistory.slice(0, searchTrainingHistoryIndex + 1);
    }
    searchTrainingHistory.push(sample);
    if (searchTrainingHistory.length > 80) searchTrainingHistory.shift();
    searchTrainingHistoryIndex = searchTrainingHistory.length - 1;
  }
  renderSearchTrainingSample(sample);
  updateSearchTrainingNavigationButtons();
  if (options.addToHistory) prepareSearchTrainingNextSample();
}

function goToPreviousSearchTrainingSample() {
  if (searchTrainingHistoryIndex <= 0) {
    setText("#searchTrainingStatus", "이전 검수 이미지가 없습니다.");
    updateSearchTrainingNavigationButtons();
    return;
  }
  searchTrainingHistoryIndex -= 1;
  searchTrainingCurrentSample = searchTrainingHistory[searchTrainingHistoryIndex];
  renderSearchTrainingSample(searchTrainingCurrentSample);
  updateSearchTrainingNavigationButtons();
  setText("#searchTrainingStatus", "이전에 검수한 이미지와 저장했던 수정값을 다시 불러왔습니다. 고친 뒤 다시 저장할 수 있습니다.");
}

function goToNextSearchTrainingSample() {
  if (searchTrainingHistoryIndex >= 0 && searchTrainingHistoryIndex < searchTrainingHistory.length - 1) {
    searchTrainingHistoryIndex += 1;
    searchTrainingCurrentSample = searchTrainingHistory[searchTrainingHistoryIndex];
    renderSearchTrainingSample(searchTrainingCurrentSample);
    updateSearchTrainingNavigationButtons();
    return;
  }
  renderSearchTrainingRandomSample(true);
}

function updateSearchTrainingNavigationButtons() {
  const prevButton = document.querySelector("#searchTrainingPrevBtn");
  const nextButton = document.querySelector("#searchTrainingNextBtn");
  if (prevButton) prevButton.disabled = searchTrainingHistoryIndex <= 0;
  if (nextButton) {
    const hasForwardHistory = searchTrainingHistoryIndex >= 0 && searchTrainingHistoryIndex < searchTrainingHistory.length - 1;
    nextButton.textContent = hasForwardHistory ? "다음 검수" : "다음 랜덤 이미지";
  }
}

function handleSearchTrainingKeyboardShortcuts(event) {
  if (currentPageId !== "adminPage" || currentAdminView !== "searchTraining") return;
  const tagName = event.target?.tagName || "";
  const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(tagName);
  if (isTyping && !(event.ctrlKey && event.key === "Enter")) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToPreviousSearchTrainingSample();
    return;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    goToNextSearchTrainingSample();
    return;
  }
  if (!isTyping && event.key.toLowerCase() === "a") {
    event.preventDefault();
    saveSearchTrainingFeedback("agree");
    return;
  }
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    saveSearchTrainingFeedback("corrected");
  }
}

function buildSearchTrainingSample({ item, product, image }) {
  const directStyles = getProductDirectTileCategories(product);
  const predicted = {
    finish: firstKnownValue([item.finishGroup, item.finishDetail, getProductDisplayFinish(product)], "마감 미확인"),
    color: firstKnownValue([item.mainColor, getProductDisplayColor(product)], "색상 미확인"),
    style: firstKnownValue([directStyles[0], item.styleCategories?.[0], item.stylePrimary, product.patternCategory], "스타일 미확인"),
    material: firstKnownValue([item.materialCategory, product.material], "재질 미확인"),
    size: firstKnownValue([item.sizeLabel, product.size], "규격 미확인"),
    origin: firstKnownValue([item.originRegion, product.countryOfOrigin], "원산지 미확인"),
    pattern: firstKnownValue([item.patternDetail, directStyles[1]], ""),
    texture: firstKnownValue([item.surfaceTexture, item.finishDetail], "")
  };
  return { item, product, image, predicted };
}

function renderSearchTrainingSample(sample) {
  if (!sample) return;
  const image = document.querySelector("#searchTrainingImage");
  if (image) {
    image.src = sample.image;
    image.alt = `${sample.product.name || "타일"} 이미지`;
  }
  const meta = document.querySelector("#searchTrainingProductMeta");
  if (meta) {
    meta.innerHTML = [
      `<strong>${escapeHtml(sample.product.name || "상품명 미확인")}</strong>`,
      `<span>코드 ${escapeHtml(sample.product.managementCode || sample.product.id || "-")}</span>`,
      `<span>브랜드 ${escapeHtml(getAdminProductBrandLabel(sample.product) || "-")}</span>`,
      `<span>규격 ${escapeHtml(sample.predicted.size || "-")} · 재고 ${escapeHtml(hasStockValue(sample.product) ? formatStockQuantity(sample.product) : "확인 필요")}</span>`
    ].join("");
  }
  renderSearchTrainingPrediction(sample.predicted);
  const correctionSeed = sample.lastCorrected || sample.predicted;
  fillSearchTrainingInputs(correctionSeed, sample.lastMemo || "");
  updateSearchTrainingNavigationButtons();
  setText("#searchTrainingStatus", sample.lastCorrected
    ? "이전에 저장한 수정값을 불러왔습니다. 필요하면 다시 고쳐 저장하세요."
    : "이미지를 보고 예측값이 맞으면 바로 저장하고, 다르면 오른쪽에서 고쳐 저장하세요.");
}

function renderSearchTrainingPrediction(predicted) {
  const wrap = document.querySelector("#searchTrainingPredictionGrid");
  if (!wrap) return;
  const rows = [
    ["마감", predicted.finish],
    ["색상", predicted.color],
    ["스타일", predicted.style],
    ["재질", predicted.material],
    ["규격", predicted.size],
    ["원산지", predicted.origin],
    ["패턴", predicted.pattern],
    ["질감", predicted.texture]
  ];
  wrap.innerHTML = rows.map(([label, value]) => `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "-")}</strong>
    </div>
  `).join("");
}

function fillSearchTrainingInputs(predicted, memo = "") {
  fillTrainingSelect("#searchTrainingFinishInput", SEARCH_TRAINING_FINISH_OPTIONS, predicted.finish);
  fillTrainingSelect("#searchTrainingColorInput", SEARCH_TRAINING_COLOR_OPTIONS, predicted.color);
  fillTrainingSelect("#searchTrainingStyleInput", [...TILE_STYLE_OPTIONS, "모자이크", "글라스", "메탈", "스타일 미확인"], predicted.style);
  fillTrainingSelect("#searchTrainingMaterialInput", SEARCH_TRAINING_MATERIAL_OPTIONS, predicted.material);
  const patternInput = document.querySelector("#searchTrainingPatternInput");
  const memoInput = document.querySelector("#searchTrainingMemoInput");
  if (patternInput) patternInput.value = predicted.pattern || "";
  if (memoInput) memoInput.value = memo;
}

function fillTrainingSelect(selector, options, selectedValue) {
  const select = document.querySelector(selector);
  if (!select) return;
  const values = unique([selectedValue, ...options].filter(Boolean));
  select.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  select.value = selectedValue || values[0] || "";
}

function firstKnownValue(values, fallback = "") {
  return (Array.isArray(values) ? values : [values])
    .map((value) => String(value || "").trim())
    .find((value) => value && !/미확인|확인\s*필요/i.test(value)) || fallback;
}

async function loadSearchTrainingStats() {
  if (!isAdminUser()) return;
  try {
    const payload = await requestJson("/api/admin/search-training/stats", {
      headers: getAdminAuthHeaders()
    }, { retries: 1, timeoutMs: 10000 });
    if (payload?.ok) {
      searchTrainingStats = payload.stats || searchTrainingStats;
      renderSearchTrainingStats();
      renderSearchTrainingRecentRows();
    }
  } catch (error) {
    console.warn(error);
  }
}

async function saveSearchTrainingFeedback(status) {
  if (!searchTrainingCurrentSample) {
    setText("#searchTrainingStatus", "먼저 검수할 타일 이미지를 불러와주세요.");
    return;
  }
  const predicted = searchTrainingCurrentSample.predicted;
  const corrected = status === "agree" ? { ...predicted } : {
    ...predicted,
    finish: document.querySelector("#searchTrainingFinishInput")?.value || predicted.finish,
    color: document.querySelector("#searchTrainingColorInput")?.value || predicted.color,
    style: document.querySelector("#searchTrainingStyleInput")?.value || predicted.style,
    material: document.querySelector("#searchTrainingMaterialInput")?.value || predicted.material,
    pattern: document.querySelector("#searchTrainingPatternInput")?.value || predicted.pattern
  };
  const memo = document.querySelector("#searchTrainingMemoInput")?.value || "";
  setText("#searchTrainingStatus", "학습 피드백을 저장하는 중입니다...");
  try {
    const payload = await requestJson("/api/admin/search-training/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify({
        status,
        product: {
          id: searchTrainingCurrentSample.product.id,
          managementCode: searchTrainingCurrentSample.product.managementCode,
          productName: searchTrainingCurrentSample.product.name,
          brand: getAdminProductBrandLabel(searchTrainingCurrentSample.product),
          image: searchTrainingCurrentSample.image
        },
        predicted,
        corrected,
        memo
      })
    }, { retries: 1, timeoutMs: 10000 });
    if (payload?.ok) {
      searchTrainingCurrentSample.lastCorrected = { ...corrected };
      searchTrainingCurrentSample.lastStatus = status;
      searchTrainingCurrentSample.lastMemo = memo;
      searchTrainingCurrentSample.lastSavedAt = new Date().toISOString();
      if (searchTrainingHistoryIndex >= 0) {
        searchTrainingHistory[searchTrainingHistoryIndex] = searchTrainingCurrentSample;
      }
      searchTrainingStats = payload.stats || searchTrainingStats;
      renderSearchTrainingStats();
      renderSearchTrainingRecentRows();
      setText("#searchTrainingStatus", status === "agree" ? "맞음 피드백을 저장했습니다. 다음 이미지를 불러옵니다." : "수정 피드백을 저장했습니다. 다음 이미지를 불러옵니다.");
      renderSearchTrainingRandomSample(true);
    }
  } catch (error) {
    setText("#searchTrainingStatus", error.message || "학습 피드백 저장에 실패했습니다.");
  }
}

async function saveSearchTrainingBatchFeedback() {
  const type = document.querySelector("#searchTrainingBatchType")?.value || searchTrainingBatchQuestion.type || "style";
  const label = document.querySelector("#searchTrainingBatchLabel")?.value || searchTrainingBatchQuestion.label || "";
  const selectedSamples = searchTrainingBatchSamples.filter((sample) => searchTrainingBatchSelectedIds.has(sample.product.id));
  if (!selectedSamples.length) {
    setText("#searchTrainingBatchStatus", "선택한 사진이 없습니다. 해당되는 상품이 없으면 '다음 문제'를 눌러 건너뛰세요.");
    return;
  }
  const field = type === "color" ? "color" : "style";
  const productField = type === "color" ? "color" : "patternCategory";
  const typeLabel = type === "color" ? "색상" : "스타일";
  const entries = selectedSamples.map((sample) => {
    const corrected = {
      ...sample.predicted,
      [field]: label
    };
    return {
      status: "corrected",
      product: {
        id: sample.product.id,
        managementCode: sample.product.managementCode,
        productName: sample.product.name,
        brand: getAdminProductBrandLabel(sample.product),
        image: sample.image
      },
      predicted: sample.predicted,
      corrected,
      updateProduct: {
        id: sample.product.id,
        field: productField,
        value: label
      },
      memo: `퀴즈형 ${typeLabel} 교육 및 DB 정리: ${label}`
    };
  });
  setText("#searchTrainingBatchStatus", `${number(entries.length)}건의 ${label} ${typeLabel} 값을 DB와 학습 데이터에 저장하는 중입니다...`);
  try {
    const payload = await requestJson("/api/admin/search-training/batch-feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify({ entries, applyToDb: true })
    }, { retries: 1, timeoutMs: 30000 });
    if (payload?.ok) {
      selectedSamples.forEach((sample) => {
        const savedLabel = `${typeLabel}: ${label}`;
        sample.batchSavedLabels = unique([...(sample.batchSavedLabels || []), savedLabel]);
        sample.product[productField] = label;
        const productIndex = products.findIndex((product) => product.id === sample.product.id);
        if (productIndex >= 0) products[productIndex] = { ...products[productIndex], [productField]: label };
      });
      searchTrainingBatchSelectedIds = new Set();
      searchTrainingCandidatesCache = { key: "", items: [] };
      normalizedTaxonomySourceKey = "";
      searchTrainingStats = payload.stats || searchTrainingStats;
      renderSearchTrainingStats();
      renderSearchTrainingRecentRows();
      setText("#searchTrainingBatchStatus", `${number(payload.applied?.updated || payload.count || entries.length)}건 DB 업데이트와 학습 저장 완료. 다음 문제를 불러옵니다.`);
      window.setTimeout(() => startSearchTrainingBatchQuestion({ keepType: true }), 450);
    }
  } catch (error) {
    setText("#searchTrainingBatchStatus", error.message || "일괄 학습 저장에 실패했습니다.");
  }
}

function renderSearchTrainingStats() {
  const grid = document.querySelector("#searchTrainingSummaryGrid");
  if (!grid) return;
  const candidates = getSearchTrainingCandidates();
  const stats = searchTrainingStats || {};
  grid.innerHTML = [
    ["검수 가능 이미지", `${number(candidates.length)}개`, "이미지가 등록된 타일 상품"],
    ["누적 피드백", `${number(stats.total || 0)}건`, "사람 기준으로 저장된 학습 데이터"],
    ["예측 맞음", `${number(stats.agreeCount || 0)}건`, "현재 검색엔진 판단이 맞았던 사례"],
    ["수정 필요", `${number(stats.correctedCount || 0)}건`, "색상·마감·스타일을 사람이 고친 사례"]
  ].map(([label, value, note]) => `
    <article class="admin-summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(note)}</p>
    </article>
  `).join("");
}

function renderSearchTrainingRecentRows() {
  const rows = document.querySelector("#searchTrainingRecentRows");
  if (!rows) return;
  const latest = Array.isArray(searchTrainingStats?.latest) ? searchTrainingStats.latest : [];
  rows.innerHTML = latest.map((entry) => `
    <tr>
      <td>${escapeHtml(formatDateTime(entry.createdAt))}</td>
      <td><span class="quality-badge ${entry.status === "agree" ? "is-low" : "is-mid"}">${entry.status === "agree" ? "맞음" : "수정"}</span></td>
      <td>${escapeHtml(entry.product?.productName || "-")}</td>
      <td>${escapeHtml(formatTrainingLabels(entry.predicted))}</td>
      <td>${escapeHtml(formatTrainingLabels(entry.corrected))}</td>
      <td>${escapeHtml(entry.memo || "-")}</td>
    </tr>
  `).join("") || `<tr><td colspan="6">아직 저장된 학습 피드백이 없습니다.</td></tr>`;
}

function formatTrainingLabels(labels = {}) {
  return [
    labels.finish,
    labels.color,
    labels.style,
    labels.material
  ].filter(Boolean).join(" · ") || "-";
}

function isRecentAdminDate(value, dayWindow = 1) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= dayWindow * 24 * 60 * 60 * 1000;
}

function buildAdminOperationsModel(signupRequests, cartRecords, orderRecords) {
  const qualityModel = buildQualityDashboardModel();
  const pendingSignups = signupRequests
    .filter((entry) => entry.approvalStatus !== "승인")
    .sort((a, b) => Date.parse(b.submittedAt || "") - Date.parse(a.submittedAt || ""));
  const approvedMembers = signupRequests.filter((entry) => entry.approvalStatus === "승인");
  const waitingOrders = orderRecords.filter((entry) => entry.stageKey === "waiting");
  const selectingOrders = orderRecords.filter((entry) => entry.stageKey === "selecting");
  const reviewOrders = orderRecords.filter((entry) => entry.stageKey === "review");
  const todaySignups = signupRequests.filter((entry) => isRecentAdminDate(entry.submittedAt, 1));
  const todayCartUpdates = cartRecords.filter((entry) => isRecentAdminDate(entry.updatedAt, 1));
  const lowStockProducts = products
    .filter((product) => hasStockValue(product) && Number(product.stockQty || 0) <= STOCK_INQUIRY_THRESHOLD_QTY)
    .sort((a, b) => Number(a.stockQty || 0) - Number(b.stockQty || 0));
  const highQualityIssues = qualityModel.issueProducts.filter((entry) => entry.priority === "높음");
  const gmvDraftTotal = cartRecords.reduce((sum, entry) => sum + Number(entry.totalQuote || 0), 0);
  const actionCount = pendingSignups.length + waitingOrders.length + lowStockProducts.length;

  return {
    qualityModel,
    pendingSignups,
    approvedMembers,
    waitingOrders,
    selectingOrders,
    reviewOrders,
    todaySignups,
    todayCartUpdates,
    lowStockProducts,
    highQualityIssues,
    gmvDraftTotal,
    actionCount
  };
}

function renderAdminTaskItem(label, value, note, tone, viewTarget) {
  return `
    <button class="admin-task-item ${tone ? `is-${tone}` : ""}" type="button" data-admin-view-target="${escapeHtml(viewTarget)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </button>
  `;
}

function getLocalDateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getAdminLaunchTodoStorageKey(dateKey = getLocalDateKey()) {
  return `tbpAdminLaunchTodos:${dateKey}`;
}

function loadAdminLaunchTodoState(dateKey = getLocalDateKey()) {
  try {
    const raw = localStorage.getItem(getAdminLaunchTodoStorageKey(dateKey));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("Failed to load launch todo state", error);
    return {};
  }
}

function saveAdminLaunchTodoState(dateKey, state) {
  try {
    localStorage.setItem(getAdminLaunchTodoStorageKey(dateKey), JSON.stringify(state || {}));
  } catch (error) {
    console.warn("Failed to save launch todo state", error);
  }
}

function getAdminLaunchPhase(dateKey = getLocalDateKey()) {
  const activePhases = LAUNCH_PLAN_PHASES.filter((phase) => !phase.skipped);
  return activePhases.find((phase) => phase.start <= dateKey && dateKey <= phase.end)
    || (dateKey < activePhases[0].start ? activePhases[0] : activePhases[activePhases.length - 1]);
}

function getDateDistanceInDays(fromDateKey, toDateKey) {
  const from = Date.parse(`${fromDateKey}T00:00:00`);
  const to = Date.parse(`${toDateKey}T00:00:00`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86400000);
}

function getAdminLaunchProgress(dateKey = getLocalDateKey()) {
  const totalDays = Math.max(1, getDateDistanceInDays(LAUNCH_PLAN_START_DATE, LAUNCH_PLAN_TARGET_DATE));
  const elapsedDays = Math.min(Math.max(0, getDateDistanceInDays(LAUNCH_PLAN_START_DATE, dateKey)), totalDays);
  return Math.round((elapsedDays / totalDays) * 100);
}

function buildAdminLaunchDailyTasks(model, phase) {
  const isDbManualReview = LAUNCH_PLAN_PHASES.some((entry) => entry.id === "db-structure" && entry.skipped);
  const dailyTasks = [
    {
      id: "daily-member-order",
      label: "회원 승인·주문 접수 확인",
      detail: `승인대기 ${number(model.pendingSignups.length)}건, 주문접수 ${number(model.waitingOrders.length)}건을 확인합니다.`,
      view: "orders",
      priority: model.pendingSignups.length || model.waitingOrders.length ? "높음" : "보통"
    },
    {
      id: "daily-search-note",
      label: "검색 실패·대체품 메모",
      detail: "오늘 나온 검색 실패어, 이미지검색 오답, 대체품 후보를 기록합니다.",
      view: "searchTraining",
      priority: "보통"
    }
  ];
  if (!isDbManualReview) {
    dailyTasks.unshift({
      id: "daily-quality-risk",
      label: "DB 고위험 항목 확인",
      detail: `오늘 품질 리스크 ${number(model.highQualityIssues.length)}건을 먼저 확인합니다.`,
      view: "quality",
      priority: model.highQualityIssues.length ? "높음" : "보통"
    });
  }

  return [
    ...dailyTasks,
    ...phase.tasks.map((task) => ({
      ...task,
      id: `${phase.id}:${task.id}`,
      priority: "단계"
    }))
  ];
}

function renderAdminLaunchPlan(model) {
  const phaseSummary = document.querySelector("#adminLaunchPhaseSummary");
  const progressBar = document.querySelector("#adminLaunchProgressBar");
  const todoList = document.querySelector("#adminLaunchTodoList");
  const timeline = document.querySelector("#adminLaunchTimeline");
  if (!phaseSummary || !progressBar || !todoList || !timeline) return;

  const todayKey = getLocalDateKey();
  const phase = getAdminLaunchPhase(todayKey);
  const progress = getAdminLaunchProgress(todayKey);
  const dDay = getDateDistanceInDays(todayKey, LAUNCH_PLAN_TARGET_DATE);
  const state = loadAdminLaunchTodoState(todayKey);
  const tasks = buildAdminLaunchDailyTasks(model, phase);
  const completedCount = tasks.filter((task) => state[task.id]).length;
  adminLaunchRenderedTasks = new Map(tasks.map((task) => [task.id, task]));

  phaseSummary.innerHTML = `
    <div>
      <span>오늘 ${escapeHtml(todayKey)}</span>
      <strong>${escapeHtml(phase.title)}</strong>
      <p>${escapeHtml(phase.goal)}</p>
    </div>
    <div>
      <span>8월 오픈까지</span>
      <strong>${dDay >= 0 ? `D-${number(dDay)}` : "오픈 이후"}</strong>
      <p>일정 진행률 ${number(progress)}% · 오늘 완료 ${number(completedCount)}/${number(tasks.length)}</p>
    </div>
  `;
  progressBar.style.width = `${progress}%`;

  todoList.innerHTML = tasks.map((task) => {
    const checked = Boolean(state[task.id]);
    return `
      <article class="admin-launch-todo ${checked ? "is-done" : ""}">
        <label>
          <input type="checkbox" data-launch-todo-id="${escapeHtml(task.id)}" ${checked ? "checked" : ""} />
          <span>
            <small>${escapeHtml(task.priority)}</small>
            <strong>${escapeHtml(task.label)}</strong>
            <em>${escapeHtml(task.detail)}</em>
          </span>
        </label>
        <div class="admin-launch-todo-actions">
          <button class="secondary-action" type="button" data-admin-view-target="${escapeHtml(task.view || "operations")}">보기</button>
          <button class="primary-action" type="button" data-launch-execute-id="${escapeHtml(task.id)}">실행요청</button>
        </div>
      </article>
    `;
  }).join("");

  timeline.innerHTML = LAUNCH_PLAN_PHASES.map((entry, index) => {
    const isCurrent = entry.id === phase.id;
    const isPast = entry.end < todayKey;
    const isSkipped = Boolean(entry.skipped);
    return `
      <article class="admin-launch-phase ${isCurrent ? "is-current" : ""} ${isPast ? "is-done" : ""} ${isSkipped ? "is-skipped" : ""}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(entry.title)}${isSkipped ? " · 건너뜀" : ""}</strong>
          <small>${escapeHtml(entry.start)} ~ ${escapeHtml(entry.end)}</small>
          <p>${escapeHtml(entry.goal)}</p>
        </div>
      </article>
    `;
  }).join("");
}

function setAdminLaunchRequestStatus(message, tone = "") {
  const status = document.querySelector("#adminLaunchRequestStatus");
  if (status) {
    status.textContent = message;
    status.classList.toggle("is-success", tone === "success");
    status.classList.toggle("is-error", tone === "error");
  }
  setText("#adminStatus", message);
}

function handleAdminLaunchTodoToggle(event) {
  const checkbox = event.target.closest("[data-launch-todo-id]");
  if (!checkbox) return;
  const todayKey = getLocalDateKey();
  const state = loadAdminLaunchTodoState(todayKey);
  state[checkbox.dataset.launchTodoId] = Boolean(checkbox.checked);
  saveAdminLaunchTodoState(todayKey, state);
  const signupRequests = Array.isArray(adminOverview?.signupRequests) ? adminOverview.signupRequests : [];
  const cartRecords = Array.isArray(adminOverview?.carts) ? adminOverview.carts : [];
  const submittedOrders = Array.isArray(adminOverview?.orders) ? adminOverview.orders : [];
  const orderRecords = buildAdminOrderRecords(signupRequests, cartRecords, submittedOrders);
  renderAdminLaunchPlan(buildAdminOperationsModel(signupRequests, cartRecords, orderRecords));
}

async function handleAdminLaunchExecuteClick(event) {
  const button = event.target.closest("[data-launch-execute-id]");
  if (!button) return;
  const taskId = button.dataset.launchExecuteId;
  const task = adminLaunchRenderedTasks.get(taskId);
  if (!task) {
    setAdminLaunchRequestStatus("실행 요청할 업무 정보를 찾지 못했습니다. 새로고침 후 다시 시도해주세요.", "error");
    return;
  }
  const todayKey = getLocalDateKey();
  const state = loadAdminLaunchTodoState(todayKey);
  if (!state[taskId]) {
    state[taskId] = true;
    saveAdminLaunchTodoState(todayKey, state);
    const checkbox = document.querySelector(`[data-launch-todo-id="${cssEscape(taskId)}"]`);
    if (checkbox) checkbox.checked = true;
    button.closest(".admin-launch-todo")?.classList.add("is-done");
  }
  if (!isAdminUser() || !authUser?.adminUsername || !authUser?.adminToken) {
    setAdminLaunchRequestStatus("관리자 로그인 후 실행 요청을 등록할 수 있습니다.", "error");
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "요청중";
  setAdminLaunchRequestStatus(`${task.label} 실행 요청을 등록하는 중입니다...`);
  try {
    const payload = await requestJson("/api/admin/action-request", {
      method: "POST",
      headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        source: "admin-launch-todo",
        taskId,
        label: task.label,
        detail: task.detail,
        priority: task.priority,
        view: task.view,
        dateKey: todayKey,
        checked: true
      })
    }, { timeoutMs: 12000 });
    setAdminLaunchRequestStatus(`작업 요청이 등록되었습니다. 요청번호 ${payload.request?.id || "-"} · 제가 확인해서 이어서 처리할 수 있습니다.`, "success");
  } catch (error) {
    setAdminLaunchRequestStatus(error.message || "작업 요청 등록에 실패했습니다.", "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function handleAdminOperationsActionClick(event) {
  const signupButton = event.target.closest("[data-admin-signup-status]");
  if (signupButton) {
    await updateAdminSignupStatus(signupButton);
    return;
  }
  const orderButton = event.target.closest("[data-admin-order-status]");
  if (orderButton) {
    await updateAdminOrderStatus(orderButton);
  }
}

async function updateAdminSignupStatus(button) {
  if (!isAdminUser() || !authUser?.adminUsername || !authUser?.adminToken) {
    setText("#adminStatus", "관리자 로그인 후 회원 승인 처리를 할 수 있습니다.");
    return;
  }
  const businessNumber = String(button.dataset.businessNumber || "").trim();
  const approvalStatus = String(button.dataset.adminSignupStatus || "").trim();
  if (!businessNumber || !approvalStatus) {
    setText("#adminStatus", "처리할 회원 정보를 찾지 못했습니다.");
    return;
  }
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "처리중";
  setText("#adminStatus", `${businessNumber} 회원 상태를 ${approvalStatus}으로 변경하는 중입니다...`);
  try {
    await requestJson("/api/admin/signup-request/status", {
      method: "POST",
      headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ businessNumber, approvalStatus })
    }, { timeoutMs: 12000 });
    setText("#adminStatus", `${businessNumber} 회원 상태를 ${approvalStatus}으로 변경했습니다.`);
    await loadAdminOverview();
  } catch (error) {
    setText("#adminStatus", error.message || "회원 승인 처리에 실패했습니다.");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function updateAdminOrderStatus(button) {
  if (!isAdminUser() || !authUser?.adminUsername || !authUser?.adminToken) {
    setText("#adminStatus", "관리자 로그인 후 주문 상태를 변경할 수 있습니다.");
    return;
  }
  const orderNumber = String(button.dataset.orderNumber || "").trim();
  const status = String(button.dataset.adminOrderStatus || "").trim();
  if (!orderNumber || !status) {
    setText("#adminStatus", "처리할 주문 정보를 찾지 못했습니다.");
    return;
  }
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "처리중";
  setText("#adminStatus", `${orderNumber} 주문 상태를 ${status}으로 변경하는 중입니다...`);
  try {
    await requestJson("/api/admin/order/status", {
      method: "POST",
      headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ orderNumber, status })
    }, { timeoutMs: 12000 });
    setText("#adminStatus", `${orderNumber} 주문 상태를 ${status}으로 변경했습니다.`);
    await loadAdminOverview();
  } catch (error) {
    setText("#adminStatus", error.message || "주문 상태 변경에 실패했습니다.");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function resetAdminLaunchTodos() {
  const todayKey = getLocalDateKey();
  saveAdminLaunchTodoState(todayKey, {});
  const signupRequests = Array.isArray(adminOverview?.signupRequests) ? adminOverview.signupRequests : [];
  const cartRecords = Array.isArray(adminOverview?.carts) ? adminOverview.carts : [];
  const submittedOrders = Array.isArray(adminOverview?.orders) ? adminOverview.orders : [];
  const orderRecords = buildAdminOrderRecords(signupRequests, cartRecords, submittedOrders);
  renderAdminLaunchPlan(buildAdminOperationsModel(signupRequests, cartRecords, orderRecords));
}

function getOrderStageFromStatus(status) {
  const text = String(status || "").trim();
  if (["완료", "취소"].includes(text)) return "done";
  return "waiting";
}

function buildAdminOrderRecords(signupRequests, cartRecords, submittedOrders = []) {
  const signupRequestMap = new Map(signupRequests.map((entry) => [entry.businessNumber, entry]));
  const orderRows = (Array.isArray(submittedOrders) ? submittedOrders : []).map((entry) => {
    const signup = signupRequestMap.get(entry.businessNumber);
    const statusLabel = entry.statusLabel || entry.status || "접수대기";
    return {
      ...entry,
      itemNames: Array.isArray(entry.items) ? entry.items.map((item) => item.name).filter(Boolean) : entry.itemNames || [],
      contactName: entry.contactName || signup?.name || "-",
      sourceType: "order",
      stageKey: signup && signup.approvalStatus !== "승인" ? "review" : getOrderStageFromStatus(statusLabel),
      statusLabel
    };
  });
  const orderBusinessNumbers = new Set(orderRows.map((entry) => entry.businessNumber).filter(Boolean));
  const cartRows = cartRecords.filter((entry) => !orderBusinessNumbers.has(entry.businessNumber)).map((entry) => {
    const signup = signupRequestMap.get(entry.businessNumber);
    let stageKey = "waiting";
    let statusLabel = "주문 접수 대기";
    if (signup && signup.approvalStatus !== "승인") {
      stageKey = "review";
      statusLabel = "가입 검토중";
    } else if (!entry.itemCount || !entry.totalQuote) {
      stageKey = "selecting";
      statusLabel = "상품 선택중";
    }

    return {
      ...entry,
      contactName: signup?.name || "-",
      sourceType: "cart",
      stageKey,
      statusLabel
    };
  });
  return [...orderRows, ...cartRows]
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || ""));
}

function renderAdminOperations(signupRequests, cartRecords, orderRecords) {
  const headline = document.querySelector("#adminOpsHeadline");
  const subline = document.querySelector("#adminOpsSubline");
  const kpiGrid = document.querySelector("#adminOpsKpiGrid");
  const taskList = document.querySelector("#adminOpsTaskList");
  const flowSummary = document.querySelector("#adminOpsFlowSummary");
  const signupRows = document.querySelector("#adminOpsSignupRows");
  const orderRows = document.querySelector("#adminOpsOrderRows");
  const riskRows = document.querySelector("#adminOpsRiskRows");
  if (!headline || !subline || !kpiGrid || !taskList || !flowSummary || !signupRows || !orderRows || !riskRows) return;

  const model = buildAdminOperationsModel(signupRequests, cartRecords, orderRecords);
  headline.textContent = model.actionCount
    ? `오늘 우선 처리할 업무 ${number(model.actionCount)}건`
    : "오늘 급한 처리 업무는 없습니다.";
  subline.textContent = `승인대기 ${number(model.pendingSignups.length)}건 · 주문접수 ${number(model.waitingOrders.length)}건 · 재고문의 ${number(model.lowStockProducts.length)}건 · DB고위험 ${number(model.highQualityIssues.length)}건`;

  kpiGrid.innerHTML = [
    ["인증 회원", `${number(model.approvedMembers.length)}명`, "사업자 인증이 완료된 회원"],
    ["승인 대기", `${number(model.pendingSignups.length)}건`, "사업자등록증/명함 확인 필요"],
    ["주문 접수 대기", `${number(model.waitingOrders.length)}건`, "주문 확정 또는 상담 연결 필요"],
    ["저장 장바구니", `${number(cartRecords.length)}건`, `잠재 견적 ${money.format(model.gmvDraftTotal)}`],
    ["오늘 활동", `${number(model.todaySignups.length + model.todayCartUpdates.length)}건`, "최근 24시간 가입/장바구니 변경"],
    ["재고 문의", `${number(model.lowStockProducts.length)}개`, `재고 ${STOCK_INQUIRY_THRESHOLD_QTY} 이하 상품`],
    ["DB 고위험", `${number(model.highQualityIssues.length)}건`, "검색 품질에 영향이 큰 누락"],
    ["타일 완성도", `${number(model.qualityModel.tileCompleteness)}%`, "규격·재질·마감·색상·스타일 기준"]
  ].map(([label, value, note]) => `
    <article class="admin-summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(note)}</p>
    </article>
  `).join("");

  taskList.innerHTML = [
    renderAdminTaskItem("회원 승인", `${number(model.pendingSignups.length)}건`, "신규 사업자 가입 승인/보류 처리", model.pendingSignups.length ? "danger" : "stable", "orders"),
    renderAdminTaskItem("주문 접수", `${number(model.waitingOrders.length)}건`, "견적 확인 후 주문 확정 처리", model.waitingOrders.length ? "warning" : "stable", "orders"),
    renderAdminTaskItem("재고 문의", `${number(model.lowStockProducts.length)}개`, `${STOCK_INQUIRY_THRESHOLD_QTY} 이하 상품 문의 안내/대체품 추천`, model.lowStockProducts.length ? "warning" : "stable", "products"),
    renderAdminTaskItem("DB 품질", `${number(model.highQualityIssues.length)}건`, "규격·재질·마감·이미지 누락 우선 정리", model.highQualityIssues.length ? "danger" : "stable", "quality")
  ].join("");

  renderAdminLaunchPlan(model);

  const flowItems = [
    ["회원가입", signupRequests.length, "가입 신청 누적"],
    ["사업자 승인", model.approvedMembers.length, "가격 공개 가능"],
    ["상품 탐색", model.selectingOrders.length, "장바구니 작성중"],
    ["주문 접수", model.waitingOrders.length, "관리자 처리 필요"],
    ["재고/발주", model.lowStockProducts.length, "문의 또는 대체 필요"],
    ["DB 정리", model.highQualityIssues.length, "검색 정확도 개선"]
  ];
  flowSummary.innerHTML = flowItems.map(([label, count, note], index) => `
    <article class="admin-process-step">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(label)}</strong>
      <b>${number(count)}</b>
      <small>${escapeHtml(note)}</small>
    </article>
  `).join("");

  signupRows.innerHTML = model.pendingSignups.slice(0, 12).map((entry) => `
    <tr>
      <td>${escapeHtml(entry.companyName || entry.contactCompanyName || "-")}</td>
      <td>${escapeHtml(entry.name || entry.contactName || "-")}</td>
      <td>${escapeHtml(entry.provider || "-")}</td>
      <td><span class="quality-badge is-mid">${escapeHtml(entry.approvalStatus || "검토중")}</span></td>
      <td>${escapeHtml(formatDateTime(entry.submittedAt))}</td>
      <td>
        <div class="admin-inline-actions">
          <button class="secondary-action compact-action" type="button" data-admin-signup-status="승인" data-business-number="${escapeHtml(entry.businessNumber || "")}">승인</button>
          <button class="secondary-action compact-action" type="button" data-admin-signup-status="보류" data-business-number="${escapeHtml(entry.businessNumber || "")}">보류</button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6">승인 대기 회원이 없습니다.</td></tr>`;

  orderRows.innerHTML = window.TbpAdminOrders.buildOperationOrderRowsHtml({
    orderRecords,
    callbacks: getAdminOrdersCallbacks()
  });

  const stockRisks = model.lowStockProducts.slice(0, 6).map((product) => ({
    type: "재고",
    target: product.managementCode || product.name || "-",
    detail: `${product.name || "-"} · ${formatStockQuantity(product)}`,
    priority: "중간"
  }));
  const qualityRisks = model.highQualityIssues.slice(0, 6).map(({ product, issues }) => ({
    type: "DB",
    target: product.managementCode || product.name || "-",
    detail: `${product.name || "-"} · ${issues.join(", ")}`,
    priority: "높음"
  }));
  riskRows.innerHTML = [...qualityRisks, ...stockRisks].slice(0, 12).map((entry) => `
    <tr>
      <td>${escapeHtml(entry.type)}</td>
      <td>${escapeHtml(entry.target)}</td>
      <td>${escapeHtml(entry.detail)}</td>
      <td><span class="quality-badge ${entry.priority === "높음" ? "is-high" : "is-mid"}">${escapeHtml(entry.priority)}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="4">현재 표시할 운영 리스크가 없습니다.</td></tr>`;
}

function renderAdminOverview() {
  const summaryGrid = document.querySelector("#adminSummaryGrid");
  const categoryRows = document.querySelector("#adminCategoryRows");
  const priceRows = document.querySelector("#adminPriceRows");
  const cartRows = document.querySelector("#adminCartRows");
  if (!summaryGrid || !categoryRows || !priceRows || !cartRows) return;

  const signupRequests = Array.isArray(adminOverview?.signupRequests) ? adminOverview.signupRequests : [];
  const cartRecords = Array.isArray(adminOverview?.carts) ? adminOverview.carts : [];
  const submittedOrders = Array.isArray(adminOverview?.orders) ? adminOverview.orders : [];
  const orderRecords = buildAdminOrderRecords(signupRequests, cartRecords, submittedOrders);

  if (currentAdminView === "operations") {
    renderAdminOperations(signupRequests, cartRecords, orderRecords);
  }

  if (currentAdminView === "products") {
    const html = window.TbpAdminProductsOverview.buildAdminProductsOverview({
      products,
      signupRequests,
      cartRecords,
      approvalRules: adminOverview?.approvalRules || {},
      tableLimit: ADMIN_PRODUCT_TABLE_LIMIT,
      stockInquiryThresholdQty: STOCK_INQUIRY_THRESHOLD_QTY,
      callbacks: getAdminProductsOverviewCallbacks()
    });
    summaryGrid.innerHTML = html.summaryHtml;
    categoryRows.innerHTML = html.categoryRowsHtml;
    priceRows.innerHTML = html.priceRowsHtml;
  }

  if (currentAdminView === "quality") {
    renderQualityDashboard();
  }

  if (currentAdminView === "orders") {
    renderAdminOrderFlow(orderRecords);
    cartRows.innerHTML = window.TbpAdminOrders.buildAdminCartRowsHtml({
      orderRecords,
      callbacks: getAdminOrdersCallbacks()
    });
  }
}

function getAdminProductsOverviewCallbacks() {
  return {
    escapeHtml,
    number,
    money,
    productTypeLabels: PRODUCT_TYPE_LABELS,
    formatStockQuantity
  };
}

function getAdminOrdersCallbacks() {
  return {
    escapeHtml,
    number,
    money,
    formatDateTime
  };
}

function renderAdminOrderFlow(orderRecords) {
  const stages = [
    ["review", "#adminFlowReview", "#adminFlowReviewCount"],
    ["selecting", "#adminFlowSelecting", "#adminFlowSelectingCount"],
    ["waiting", "#adminFlowWaiting", "#adminFlowWaitingCount"]
  ];

  stages.forEach(([stageKey, listSelector, countSelector]) => {
    const list = document.querySelector(listSelector);
    const count = document.querySelector(countSelector);
    if (!list || !count) return;
    const rendered = window.TbpAdminOrders.buildAdminFlowCardsHtml({
      orderRecords,
      stageKey,
      callbacks: getAdminOrdersCallbacks()
    });
    count.textContent = String(rendered.count);
    list.innerHTML = rendered.html;
  });
}

function switchAdminView(view) {
  currentAdminView = view;
  document.querySelector("#adminOperationsTab")?.classList.toggle("active", view === "operations");
  document.querySelector("#adminProductsTab")?.classList.toggle("active", view === "products");
  document.querySelector("#adminQualityTab")?.classList.toggle("active", view === "quality");
  document.querySelector("#adminSearchTrainingTab")?.classList.toggle("active", view === "searchTraining");
  document.querySelector("#adminOrdersTab")?.classList.toggle("active", view === "orders");
  document.querySelector("#adminOperationsView")?.classList.toggle("hidden", view !== "operations");
  document.querySelector("#adminProductsView")?.classList.toggle("hidden", view !== "products");
  document.querySelector("#adminQualityView")?.classList.toggle("hidden", view !== "quality");
  document.querySelector("#adminSearchTrainingView")?.classList.toggle("hidden", view !== "searchTraining");
  document.querySelector("#adminOrdersView")?.classList.toggle("hidden", view !== "orders");
  if (["operations", "products", "orders"].includes(view)) renderAdminOverview();
  if (view === "quality") renderQualityDashboard();
  if (view === "searchTraining") renderSearchTrainingView();
  void ensureAdminProductsForView(view);
}

function renderCartSummary() {
  const itemCount = cart.length;
  const totalQuote = cart.reduce((sum, item) => sum + Number(item.quotePrice || 0) * Number(item.qty || 0), 0);
  document.querySelector("#navCartCount").textContent = String(itemCount);
  const stickyCartCount = document.querySelector("#stickyCartCount");
  if (stickyCartCount) stickyCartCount.textContent = String(itemCount);
  document.querySelector("#cartSummary").textContent = `${itemCount}개 품목 · 견적 ${money.format(totalQuote)}`;
  document.querySelector("#costSummary").innerHTML = `
    <div><span>견적 합계</span><strong>${money.format(totalQuote)}</strong></div>
    <div><span>선택 상품 수</span><strong>${itemCount}개</strong></div>
    <div><span>평균 견적단가</span><strong>${itemCount ? money.format(Math.round(totalQuote / itemCount)) : money.format(0)}</strong></div>
    <div><span>다음 단계</span><strong>제안서 설정</strong></div>
  `;
}

function syncProposalSelections() {
  const currentIds = new Set(cart.map((item) => item.id));
  const renderedIds = new Set(cart.filter((item) => item.renderedImage).map((item) => item.id));

  if (!proposalSelectionsInitialized) {
    proposalProductSelectionIds = new Set(currentIds);
    proposalRenderSelectionIds = new Set(renderedIds);
    proposalSelectionsInitialized = true;
    knownProposalCartIds = new Set(currentIds);
  } else {
    currentIds.forEach((id) => {
      if (!knownProposalCartIds.has(id)) {
        proposalProductSelectionIds.add(id);
        if (renderedIds.has(id)) proposalRenderSelectionIds.add(id);
      }
    });
    knownProposalCartIds = new Set(currentIds);
    proposalProductSelectionIds = new Set([...proposalProductSelectionIds].filter((id) => currentIds.has(id)));
    proposalRenderSelectionIds = new Set([...proposalRenderSelectionIds].filter((id) => renderedIds.has(id) && proposalProductSelectionIds.has(id)));
  }
}

function getSelectedProposalProducts() {
  syncProposalSelections();
  return cart.filter((item) => proposalProductSelectionIds.has(item.id));
}

function getSelectedProposalRenderedItems() {
  const selectedProducts = getSelectedProposalProducts();
  return selectedProducts.filter((item) => item.renderedImage && proposalRenderSelectionIds.has(item.id));
}

function toggleProposalProductSelection(id, checked) {
  if (checked) proposalProductSelectionIds.add(id);
  else {
    proposalProductSelectionIds.delete(id);
    proposalRenderSelectionIds.delete(id);
  }
  renderDocuments();
}

function toggleProposalRenderSelection(id, checked) {
  if (checked) proposalRenderSelectionIds.add(id);
  else proposalRenderSelectionIds.delete(id);
  renderDocuments();
}

function selectAllProposalProducts() {
  proposalProductSelectionIds = new Set(cart.map((item) => item.id));
  cart.filter((item) => item.renderedImage).forEach((item) => proposalRenderSelectionIds.add(item.id));
  renderDocuments();
}

function clearProposalProducts() {
  proposalProductSelectionIds = new Set();
  proposalRenderSelectionIds = new Set();
  renderDocuments();
}

function selectAllProposalRenders() {
  getSelectedProposalProducts()
    .filter((item) => item.renderedImage)
    .forEach((item) => proposalRenderSelectionIds.add(item.id));
  renderDocuments();
}

function clearProposalRenders() {
  proposalRenderSelectionIds = new Set([...proposalRenderSelectionIds].filter((id) => !proposalProductSelectionIds.has(id)));
  renderDocuments();
}

function renderProposalSelectionControls(selectedProducts, selectedRenderedItems) {
  const productList = document.querySelector("#proposalProductSelectionList");
  const renderSection = document.querySelector("#proposalRenderSelectionControl");
  const renderList = document.querySelector("#proposalRenderSelectionList");
  const summary = document.querySelector("#proposalSelectionSummary");
  const renderStatus = document.querySelector("#proposalRenderWorkflowStatus");
  if (!productList || !renderSection || !renderList || !summary) return;

  productList.innerHTML = cart.map((item) => `
    <label class="proposal-select-card ${proposalProductSelectionIds.has(item.id) ? "is-selected" : ""}">
      <input type="checkbox" data-proposal-product-select="${escapeHtml(item.id)}" ${proposalProductSelectionIds.has(item.id) ? "checked" : ""} />
      ${item.image ? `<img class="proposal-select-thumb" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />` : `<div class="proposal-select-thumb proposal-item-image-empty">No Image</div>`}
      <div class="proposal-select-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.kind || "-")} / ${escapeHtml(item.size || "-")}</span>
        <span>${money.format(Number(item.quotePrice || 0))} / ${number(item.qty)}${escapeHtml(item.unit || "")}</span>
      </div>
      <button class="secondary-action proposal-render-open-btn" type="button" data-proposal-render-open="${escapeHtml(item.id)}">이 상품 보정</button>
      ${item.renderedImage ? `<span class="proposal-select-badge">Rendered</span>` : ""}
    </label>
  `).join("") || `<div class="empty-state">No cart items available for the proposal.</div>`;

  const availableRenderedItems = selectedProducts.filter((item) => item.renderedImage);
  renderSection.classList.toggle("hidden", !availableRenderedItems.length);
  renderList.innerHTML = availableRenderedItems.map((item) => `
    <label class="proposal-select-card proposal-render-select-card ${proposalRenderSelectionIds.has(item.id) ? "is-selected" : ""}">
      <input type="checkbox" data-proposal-render-select="${escapeHtml(item.id)}" ${proposalRenderSelectionIds.has(item.id) ? "checked" : ""} />
      <img class="proposal-select-thumb proposal-render-select-thumb" src="${escapeHtml(item.renderedImage)}" alt="${escapeHtml(item.name)} rendered preview" loading="lazy" />
      <div class="proposal-select-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.renderTarget || "Rendered Preview")}</span>
        <span>${escapeHtml(item.renderPointMemo || "")}</span>
      </div>
    </label>
  `).join("");

  summary.textContent = `${selectedProducts.length} products selected / ${selectedRenderedItems.length} renders selected`;
  if (renderStatus) {
    const renderableCount = cart.filter((item) => item.productType === "tile").length;
    const renderedCount = cart.filter((item) => item.renderedImage).length;
    renderStatus.textContent = cart.length
      ? `보정 가능 타일 ${number(renderableCount)}개 · 생성된 보정 이미지 ${number(renderedCount)}개`
      : "장바구니에 상품을 먼저 담으면 실사 보정을 시작할 수 있습니다.";
  }
}

function openProposalRenderWorkspace() {
  const firstSelected = getSelectedProposalProducts().find((item) => item.productType === "tile")
    || cart.find((item) => item.productType === "tile")
    || getSelectedProposalProducts()[0]
    || cart[0];
  if (!firstSelected) {
    setText("#proposalRenderWorkflowStatus", "장바구니에 상품을 먼저 담아주세요.");
    switchPage("cartPage");
    return;
  }
  openRenderForCartItem(firstSelected.id);
}

function formatMeasureNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits }).format(Number(value) || 0);
}

function getTileBoxMetrics(item) {
  return window.TbpCartTileMetrics.getTileBoxMetrics(item);
}

function getCartTileMeasureState(item) {
  return window.TbpCartTileMetrics.getCartTileMeasureState(item);
}

function getCartTileMeasurePanel(item) {
  return window.TbpCartRendering.getCartTileMeasurePanel({
    item,
    callbacks: getCartRenderingCallbacks()
  });
}

function renderCartList() {
  document.querySelector("#cartList").innerHTML = window.TbpCartRendering.buildCartListHtml({
    items: cart,
    callbacks: getCartRenderingCallbacks()
  });
}

function getCartRenderingCallbacks() {
  return {
    escapeHtml,
    number,
    money,
    productTypeLabels: PRODUCT_TYPE_LABELS,
    hasMemberPriceAccess,
    getPriceLockedMessage,
    getMemberBaseUnitPrice,
    getMemberBasePriceCaption,
    getCartTileMeasureState,
    formatMeasureNumber,
    formatStockQuantity
  };
}

function renderDocuments() {
  renderProposalTemplatePreview();
  syncProposalSelections();
  const proposalState = getProposalState();
  const { customer, address, validDate, date, subtotal, vat, total, memo, companyName, managerName, managerTitle, managerPhone } = proposalState;
  const selectedProducts = getSelectedProposalProducts();
  const selectedRenderedItems = getSelectedProposalRenderedItems();

  setText("#proposalDate", shortDate.format(date));
  setText("#estimateDate", shortDate.format(date));
  setText("#docCustomer", customer);
  setText("#docAddress", address);
  setText("#docItemCount", `${cart.length}개 품목`);
  setText("#docTotal", money.format(total));
  setText("#proposalIntro", `${customer}의 ${address} 현장에 맞춰 장바구니에 선정한 타일, 위생도기, 부자재를 기준으로 제안드립니다.`);
  setText("#proposalNote", `본 제안은 ${shortDate.format(validDate)}까지 유효합니다. 현장 실측, 재고, 시공 조건에 따라 최종 금액은 조정될 수 있습니다. ${memo}`);

  setText("#proposalCompanyName", companyName || "자재GO 바스GO");
  setText("#proposalManagerName", [managerName, managerTitle].filter(Boolean).join(" / ") || "Add contact details above to include them in the proposal.");
  setText("#proposalManagerPhone", managerPhone || "");
  renderProposalSelectionControls(selectedProducts, selectedRenderedItems);

  document.querySelector("#proposalItems").innerHTML = cart.map((item) => `
    <li class="proposal-item-card">
      <button class="proposal-image-button" type="button" data-render-product="${escapeHtml(item.id)}" title="실사 보정으로 이동">
        ${item.image ? `<img class="proposal-item-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />` : `<div class="proposal-item-image proposal-item-image-empty">이미지 없음</div>`}
      </button>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.kind)} · ${escapeHtml(item.option || item.finish || "-")}</span>
        <span class="proposal-item-size">규격 ${escapeHtml(item.size || "-")}</span>
      </div>
    </li>
  `).join("") || `<li class="proposal-item-card proposal-item-empty">선정된 품목이 없습니다.</li>`;
  document.querySelector("#estimateRows").innerHTML = cart.map((item) => {
    return `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.size || "-")}</td><td>${number(item.qty)}${escapeHtml(item.unit)}</td><td>${money.format(item.quotePrice)}</td></tr>`;
  }).join("");
  setText("#estimateSubtotal", money.format(subtotal));
  setText("#estimateVat", money.format(vat));
  setText("#estimateTotal", money.format(total));
  renderProposalRenderedItems();

  setText("#docItemCount", `${selectedProducts.length} items`);
  document.querySelector("#proposalItems").innerHTML = selectedProducts.map((item) => `
    <li class="proposal-item-card">
      <button class="proposal-image-button" type="button" data-render-product="${escapeHtml(item.id)}" title="Open render workspace">
        ${item.image ? `<img class="proposal-item-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />` : `<div class="proposal-item-image proposal-item-image-empty">No Image</div>`}
      </button>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.kind)} / ${escapeHtml(item.option || item.finish || "-")}</span>
        <span class="proposal-item-size">${escapeHtml(item.size || "-")}</span>
      </div>
    </li>
  `).join("") || `<li class="proposal-item-card proposal-item-empty">No selected products.</li>`;
  document.querySelector("#estimateRows").innerHTML = selectedProducts.map((item) => {
    return `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.size || "-")}</td><td>${number(item.qty)}${escapeHtml(item.unit)}</td><td>${money.format(item.quotePrice)}</td></tr>`;
  }).join("");
  renderProposalRenderedItems(selectedRenderedItems);
}

function renderProposalRenderedItems(selectedRenderedItems = null) {
  const section = document.querySelector("#proposalRenderedSection");
  const list = document.querySelector("#proposalRenderedItems");
  if (!section || !list) return;

  const renderedItems = selectedRenderedItems || cart.filter((item) => item.renderedImage);
  section.classList.toggle("hidden", !renderedItems.length);

  if (!renderedItems.length) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = renderedItems.map((item) => `
    <article class="proposal-render-result-card">
      <div class="proposal-render-result-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <span>실사 보정 이미지${item.renderTarget ? ` · ${escapeHtml(item.renderTarget)}` : ""}${item.renderPointMemo ? ` · ${escapeHtml(item.renderPointMemo)}` : ""}</span>
      </div>
      ${buildProposalRenderSurfaceDetails(item)}
      <div class="proposal-rendered-preview">
        <img src="${escapeHtml(item.renderedImage)}" alt="${escapeHtml(item.name)} 실사 보정 이미지" loading="lazy" />
      </div>
    </article>
  `).join("");
}

function buildProposalRenderSurfaceDetails(item) {
  const selections = item?.renderSurfaceSelections || {};
  const surfaces = getRenderSurfaceKeys()
    .map((surface) => {
      const tileId = selections[surface]?.tileId || "";
      if (!tileId) return null;
      const tile = cart.find((entry) => entry.id === tileId && entry.productType === "tile");
      if (!tile) return null;
      return { surface, tile };
    })
    .filter(Boolean);

  if (!surfaces.length) return "";

  return `
    <div class="proposal-render-surface-list">
      ${surfaces.map(({ surface, tile }) => `
        <section class="proposal-render-surface-card">
          <div class="proposal-render-surface-header">
            <strong>${escapeHtml(getRenderSurfaceLabel(surface))} 타일 적용</strong>
            ${surface === "point" && item.renderPointMemo ? `<span>${escapeHtml(item.renderPointMemo)}</span>` : ""}
          </div>
          <div class="proposal-render-surface-body">
            ${tile.image ? `<img class="proposal-render-surface-image" src="${escapeHtml(tile.image)}" alt="${escapeHtml(tile.name)}" loading="lazy" />` : `<div class="proposal-render-surface-image proposal-item-image-empty">이미지 없음</div>`}
            <div class="proposal-render-surface-copy">
              <strong>${escapeHtml(tile.name)}</strong>
              <span>모델명 ${escapeHtml(tile.name)}</span>
              <span>규격 ${escapeHtml(tile.size || "-")}</span>
            </div>
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function getProposalState() {
  const data = new FormData(proposalForm);
  const customer = String(data.get("customerName") || "고객님");
  const address = String(data.get("siteAddress") || "현장 주소 미입력");
  const validDays = Number(data.get("validDays") || 14);
  const date = new Date();
  const validDate = new Date(date);
  validDate.setDate(validDate.getDate() + validDays);

  const selectedProducts = getSelectedProposalProducts();
  const subtotal = selectedProducts.reduce((sum, item) => sum + Number(item.quotePrice || 0) * Number(item.qty || 0), 0);
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;
  const memo = String(data.get("memo") || "").trim();

  return {
    customer,
    phone: String(data.get("customerPhone") || "").trim(),
    address,
    startDate: String(data.get("startDate") || "").trim(),
    validDays,
    validDate,
    date,
    theme: String(data.get("proposalTheme") || "beige-black").trim(),
    companyName: String(data.get("companyName") || "자재GO 바스GO").trim(),
    managerName: String(data.get("managerName") || "").trim(),
    managerTitle: String(data.get("managerTitle") || "").trim(),
    managerPhone: String(data.get("managerPhone") || "").trim(),
    memo,
    subtotal,
    vat,
    total
  };
}

async function generateProfessionalProposalDeck() {
  const status = document.querySelector("#proposalPptStatus");
  const downloadLink = document.querySelector("#proposalPptDownloadLink");
  const button = document.querySelector("#createProProposalBtn");
  const selectedProducts = getSelectedProposalProducts();
  const selectedRenderedIds = new Set(getSelectedProposalRenderedItems().map((item) => item.id));

  if (!selectedProducts.length) {
    status.textContent = "장바구니에 상품이 있어야 프로 제안서를 만들 수 있습니다.";
    status.textContent = "Select at least one product for the proposal.";
    downloadLink.classList.add("hidden");
    downloadLink.removeAttribute("href");
    return;
  }

  const serverOnline = await refreshServerConnection();
  if (!serverOnline) {
    status.textContent = getServerRequiredMessage();
    downloadLink.classList.add("hidden");
    downloadLink.removeAttribute("href");
    return;
  }

  const proposalState = getProposalState();
  const payload = {
    proposal: {
      customerName: proposalState.customer,
      customerPhone: proposalState.phone,
      siteAddress: proposalState.address,
      startDate: proposalState.startDate,
      validDays: proposalState.validDays,
      proposalDate: proposalState.date.toISOString(),
      validDate: proposalState.validDate.toISOString(),
      memo: proposalState.memo,
      theme: proposalState.theme
    },
    company: {
      name: proposalState.companyName,
      managerName: proposalState.managerName,
      managerTitle: proposalState.managerTitle,
      managerPhone: proposalState.managerPhone
    },
    summary: {
      itemCount: selectedProducts.length,
      subtotal: proposalState.subtotal,
      vat: proposalState.vat,
      total: proposalState.total
    },
    cart: selectedProducts.map((item) => ({
      id: item.id,
      productType: item.productType || "",
      kind: item.kind || "",
      name: item.name || "",
      size: item.size || "",
      option: item.option || "",
      finish: item.finish || "",
      maker: item.maker || "",
      unit: item.unit || "",
      qty: Number(item.qty || 0),
      quotePrice: Number(item.quotePrice || 0),
      costPrice: Number(item.costPrice || 0),
      image: item.image || "",
      renderedImage: selectedRenderedIds.has(item.id) ? (item.renderedImage || "") : "",
      renderTarget: selectedRenderedIds.has(item.id) ? (item.renderTarget || "") : "",
      renderPointMemo: selectedRenderedIds.has(item.id) ? (item.renderPointMemo || "") : "",
      renderSurfaceSelections: selectedRenderedIds.has(item.id) ? (item.renderSurfaceSelections || {}) : {}
    }))
  };

  button.disabled = true;
  status.textContent = "프로 제안서를 생성하고 있습니다...";
  downloadLink.classList.add("hidden");
  downloadLink.removeAttribute("href");

  try {
    const result = await requestJson("/api/proposal-ppt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, { retries: 1, timeoutMs: 15000 });

    status.textContent = "프로 제안서가 준비되었습니다. 바로 다운로드할 수 있습니다.";
    downloadLink.href = result.downloadUrl;
    downloadLink.download = result.fileName || "";
    downloadLink.classList.remove("hidden");
    downloadLink.click();
  } catch (error) {
    status.textContent = error.message || "프로 제안서 생성 중 오류가 발생했습니다.";
  } finally {
    button.disabled = false;
  }
}

async function refreshServerConnection() {
  const wasOnline = serverConnection.online;

  try {
    await requestJson("/api/health", { cache: "no-store" }, { retries: 2, timeoutMs: 2500 });
    serverConnection = { online: true, checked: true, failures: 0 };
  } catch {
    const failures = (serverConnection.failures || 0) + 1;
    serverConnection = {
      online: failures >= 2 ? false : Boolean(serverConnection.online),
      checked: true,
      failures
    };
  }

  if (!wasOnline && serverConnection.online) {
    try {
      await loadProducts();
      renderProducts();
    } catch (error) {
      console.warn(error);
    }
  }

  renderServerConnection();
  return serverConnection.online;
}

function renderServerConnection() {
  const pill = document.querySelector("#serverStatusPill");
  const homeStatus = document.querySelector("#homeServerStatus");
  if (!pill) return;

  pill.classList.remove("online", "offline");
  homeStatus?.classList.remove("online", "offline");
  if (!serverConnection.checked) {
    pill.textContent = "서버 확인 중";
    if (homeStatus) homeStatus.textContent = "상태 확인 중";
    return;
  }

  if (serverConnection.online) {
    pill.classList.add("online");
    pill.textContent = "서버 연결됨";
    if (homeStatus) {
      homeStatus.classList.add("online");
      homeStatus.textContent = "서버 연결됨";
    }
    return;
  }

  if (serverConnection.failures < 2) {
    pill.textContent = "서버 재확인 중";
    if (homeStatus) homeStatus.textContent = "상태 재확인 중";
    return;
  }

  pill.classList.add("offline");
  pill.textContent = "서버 연결 안 됨";
  if (homeStatus) {
    homeStatus.classList.add("offline");
    homeStatus.textContent = "서버 연결 안 됨";
  }
}

function getServerRequiredMessage() {
  return "프로 제안서는 서버 연결이 필요합니다. run-app.bat 실행 후 서버 주소로 다시 접속해주세요.";
}

async function controlServer(action) {
  const status = document.querySelector("#serverControlStatus");
  const actionLabel = action === "restart" ? "재시작" : "종료";
  status.textContent = `서버 ${actionLabel} 요청을 보내는 중입니다...`;

  try {
    const result = await requestJson("/api/server-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    }, { retries: 0, timeoutMs: 5000 });

    status.textContent = result.message || `서버 ${actionLabel} 요청을 완료했습니다.`;

    if (action === "restart") {
      serverConnection = { online: false, checked: true, failures: 1 };
      renderServerConnection();
      setTimeout(() => refreshServerConnection(), 3000);
      setTimeout(() => refreshServerConnection(), 7000);
      return;
    }

    serverConnection = { online: false, checked: true, failures: 2 };
    renderServerConnection();
    status.textContent = "서버를 종료했습니다. 다시 켜려면 run-app.bat 또는 run-server.bat를 실행해주세요.";
  } catch (error) {
    status.textContent = error.message || `서버 ${actionLabel} 요청 중 오류가 발생했습니다.`;
  }
}

function showServerStartGuide() {
  setText("#serverControlStatus", "서버 켜기는 브라우저 보안 때문에 페이지 안에서 직접 실행할 수 없습니다. run-app.bat 또는 run-server.bat를 실행해주세요.");
}

function startServerConnectionWatcher() {
  if (serverConnectionTimer) clearInterval(serverConnectionTimer);
  serverConnectionTimer = window.setInterval(() => {
    refreshServerConnection();
  }, 12000);
}

function handleServerReconnectCheck() {
  refreshServerConnection();
}

async function requestJson(url, options = {}, config = {}) {
  const retries = Number(config.retries ?? 0);
  const timeoutMs = Number(config.timeoutMs ?? 8000);
  const timeoutMessage = config.timeoutMessage || `요청 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다.`;

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      let payload = null;
      const text = await response.text();
      payload = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "request failed");
      }

      return payload;
    } catch (error) {
      lastError = (error?.name === "AbortError" || error?.message === "timeout")
        ? new Error(timeoutMessage)
        : error;
      if (attempt < retries) {
        await delay(500 * (attempt + 1));
        continue;
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw lastError || new Error("request failed");
}

function getAdminAuthHeaders(extraHeaders = {}) {
  return {
    ...extraHeaders,
    "X-Admin-Username": authUser?.adminUsername || "",
    "X-Admin-Token": authUser?.adminToken || ""
  };
}

function getMemberProductAuthHeaders(extraHeaders = {}) {
  return {
    ...extraHeaders,
    "X-Business-Number": authUser?.businessNumber || "",
    "X-Member-Token": authUser?.memberToken || ""
  };
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeRenderTargetValue(value) {
  if (value === "wall" || value === "\uBCBD" || value === "?") return "wall";
  if (value === "point" || value === "\uD3EC\uC778\uD2B8" || value === "???") return "point";
  return "floor";
}

function getRenderTargetLabel(value) {
  const normalized = normalizeRenderTargetValue(value);
  if (normalized === "wall") return "\uBCBD";
  if (normalized === "point") return "\uD3EC\uC778\uD2B8";
  return "\uBC14\uB2E5";
}

function getRenderSurfaceKeys() {
  return ["wall", "floor", "point"];
}

function getRenderSurfaceLabel(surface) {
  if (surface === "wall") return "\uBCBD";
  if (surface === "point") return "\uD3EC\uC778\uD2B8";
  return "\uBC14\uB2E5";
}

function getRenderSurfaceFixedPointLabel() {
  return "\uC0E4\uC6CC\uBD80\uC2A4 \uB4B7\uBCBD";
}

function getSelectedRenderSurfaces() {
  return getRenderSurfaceKeys()
    .filter((surface) => renderSurfaceSelections[surface].tileId)
    .map((surface) => {
      const tile = cart.find((entry) => entry.id === renderSurfaceSelections[surface].tileId && entry.productType === "tile");
      return tile ? { surface, tile } : null;
    })
    .filter(Boolean);
}

function getRenderSurfaceSelection(surface) {
  return renderSurfaceSelections[surface] || { tileId: "" };
}

function ensureRenderSelection() {
  if (!cart.length) {
    selectedRenderCartId = "";
    selectedRenderTileId = "";
    renderSurfaceSelections = {
      wall: { tileId: "" },
      floor: { tileId: "" },
      point: { tileId: "" }
    };
    return;
  }

  const currentItem = cart.find((entry) => entry.id === selectedRenderCartId);
  if (!currentItem) {
    selectedRenderCartId = cart[0].id;
  }

  const cartTiles = getRenderableCartTiles();
  const currentTile = cartTiles.find((entry) => entry.id === selectedRenderTileId);
  if (!currentTile) {
    const selectedItem = cart.find((entry) => entry.id === selectedRenderCartId);
    const preferredTileId = selectedItem?.productType === "tile" ? selectedItem.id : "";
    selectedRenderTileId = cartTiles.some((entry) => entry.id === preferredTileId)
      ? preferredTileId
      : (cartTiles[0]?.id || "");
  }

  getRenderSurfaceKeys().forEach((surface) => {
    const selection = renderSurfaceSelections[surface] || { tileId: "" };
    if (selection.tileId && !cartTiles.some((entry) => entry.id === selection.tileId)) {
      selection.tileId = "";
    }
    renderSurfaceSelections[surface] = selection;
  });
}

function openRenderForCartItem(id) {
  selectedRenderCartId = id;
  const item = cart.find((entry) => entry.id === id);
  const cartTiles = getRenderableCartTiles();
  const preferredTileId = item?.renderTileId || (item?.productType === "tile" ? item.id : "");
  selectedRenderTileId = cartTiles.some((entry) => entry.id === preferredTileId)
    ? preferredTileId
    : (cartTiles[0]?.id || "");
  const storedSelections = item?.renderSurfaceSelections || {};
  renderSurfaceSelections = {
    wall: {
      tileId: storedSelections.wall?.tileId || ""
    },
    floor: {
      tileId: storedSelections.floor?.tileId || ""
    },
    point: {
      tileId: storedSelections.point?.tileId || ""
    }
  };
  pendingRenderResultImage = item?.renderedImage || "";
  pendingSiteImage = "";
  renderJobRunning = false;
  document.querySelector("#renderSiteImage").value = "";
  document.querySelector("#renderPointMemo").value = item?.renderPointMemo || "";
  setText("#renderStatus", "");
  syncRenderPointPreset();
  renderRenderWorkspace();
  switchPage("renderPage");
}

function getRenderableCartTiles() {
  return cart.filter((entry) => entry.productType === "tile");
}

function syncRenderPointPreset() {
  const pointInput = document.querySelector("#renderPointMemo");
  pointInput.value = getRenderSurfaceFixedPointLabel();
}

function openRenderSurfacePicker(surface) {
  ensureRenderSelection();
  activeRenderSurfacePicker = surface;
  const modal = document.querySelector("#tilePickerModal");
  const title = document.querySelector("#tilePickerTitle");
  const options = document.querySelector("#tilePickerOptions");
  const tiles = getRenderableCartTiles();

  title.textContent = `${getRenderSurfaceLabel(surface)} 타일 선택`;
  if (!tiles.length) {
    options.innerHTML = '<div class="tile-picker-empty">장바구니에 담긴 타일이 없습니다.</div>';
  } else {
    options.innerHTML = tiles.map((tile) => {
      const isActive = getRenderSurfaceSelection(surface).tileId === tile.id;
      return [
        `<button class="tile-picker-option${isActive ? " active" : ""}" type="button" data-render-surface-choice="${escapeHtml(surface)}" data-render-tile-choice="${escapeHtml(tile.id)}">`,
        tile.image
          ? `<img src="${escapeHtml(tile.image)}" alt="${escapeHtml(tile.name)}" />`
          : '<div class="tile-picker-option-empty">이미지 없음</div>',
        '<div class="tile-picker-option-copy">',
        `<strong>${escapeHtml(tile.name)}</strong>`,
        `<span>${escapeHtml(tile.size || "-")} · ${escapeHtml(tile.finish || "-")}</span>`,
        '</div>',
        '</button>'
      ].join("");
    }).join("");

    options.querySelectorAll("[data-render-surface-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        selectRenderSurfaceTile(button.dataset.renderSurfaceChoice, button.dataset.renderTileChoice);
      });
    });
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeRenderSurfacePicker() {
  activeRenderSurfacePicker = "";
  const modal = document.querySelector("#tilePickerModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function selectRenderSurfaceTile(surface, tileId) {
  renderSurfaceSelections[surface].tileId = tileId;
  if (tileId) selectedRenderTileId = tileId;
  syncRenderPointPreset();
  closeRenderSurfacePicker();
  renderRenderWorkspace();
}

function clearRenderSurfaceTile(surface) {
  renderSurfaceSelections[surface].tileId = "";
  if (surface === "point") syncRenderPointPreset();
  renderRenderWorkspace();
}

function selectRenderPrimaryTile(tileId) {
  const tile = getRenderableCartTiles().find((entry) => entry.id === tileId);
  if (!tile) return;
  selectedRenderCartId = tile.id;
  selectedRenderTileId = tile.id;
  renderRenderWorkspace();
}

function getRenderRoomTypeLabel(value) {
  return RENDER_ROOM_TYPES[value] || RENDER_ROOM_TYPES.auto;
}

function getRenderInteriorStyleLabel(value) {
  return RENDER_INTERIOR_STYLES[value] || RENDER_INTERIOR_STYLES["natural-modern"];
}

function getSelectedRenderRoomContext() {
  const roomType = document.querySelector("#renderRoomType")?.value || "auto";
  const interiorStyle = document.querySelector("#renderInteriorStyle")?.value || "natural-modern";
  const styleMemo = document.querySelector("#renderStyleMemo")?.value.trim() || "";
  const selectedSurfaceLabels = getRenderSurfaceKeys()
    .filter((surface) => getRenderSurfaceSelection(surface).tileId)
    .map(getRenderSurfaceLabel);

  return {
    roomType,
    roomTypeLabel: getRenderRoomTypeLabel(roomType),
    autoDetect: roomType === "auto",
    interiorStyle,
    interiorStyleLabel: getRenderInteriorStyleLabel(interiorStyle),
    styleMemo,
    selectedSurfaces: selectedSurfaceLabels
  };
}

function renderRenderRoomAnalysis() {
  const target = document.querySelector("#renderRoomAnalysis");
  if (!target) return;
  const context = getSelectedRenderRoomContext();
  const surfaceText = context.selectedSurfaces.length
    ? `적용면: ${context.selectedSurfaces.join(", ")}`
    : "적용면을 선택하면 보정 정확도가 높아집니다.";
  const roomText = context.autoDetect
    ? "공간은 업로드한 현장 사진을 기준으로 AI가 자동 판별합니다."
    : `${context.roomTypeLabel} 기준으로 공간을 고정합니다.`;
  const memoText = context.styleMemo ? `메모: ${context.styleMemo}` : "";
  target.textContent = [roomText, `방향: ${context.interiorStyleLabel}`, surfaceText, memoText].filter(Boolean).join(" · ");
}

function buildRenderComparisonHtml() {
  const value = Math.max(0, Math.min(100, Number(renderCompareSliderValue) || 50));
  return `
    <div class="render-before-after" style="--compare: ${value}%">
      <img class="render-before-image" src="${escapeHtml(pendingSiteImage)}" alt="원본 현장 사진" />
      <div class="render-after-layer">
        <img class="render-after-image" src="${escapeHtml(pendingRenderResultImage)}" alt="보정 결과 이미지" />
      </div>
      <span class="render-compare-label render-compare-label-before">원본</span>
      <span class="render-compare-label render-compare-label-after">보정</span>
      <span class="render-compare-divider" aria-hidden="true"></span>
    </div>
    <input class="render-compare-range" id="renderCompareSlider" type="range" min="0" max="100" value="${value}" aria-label="원본과 보정 결과 비교" />
  `;
}

function handleRenderCompareSliderInput(event) {
  const slider = event.target.closest("#renderCompareSlider");
  if (!slider) return;
  event.stopPropagation();
  renderCompareSliderValue = Math.max(0, Math.min(100, Number(slider.value) || 50));
  updateRenderCompareSlider();
}

function updateRenderCompareSlider() {
  const preview = document.querySelector("#renderResultPreview");
  const compare = preview?.querySelector(".render-before-after");
  const slider = preview?.querySelector("#renderCompareSlider");
  if (!compare) return;
  const value = Math.max(0, Math.min(100, Number(renderCompareSliderValue) || 50));
  compare.style.setProperty("--compare", `${value}%`);
  if (slider && Number(slider.value) !== value) slider.value = String(value);
}

function getImageDataUrlExtension(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/([a-z0-9.+-]+);/i);
  const type = match ? match[1].toLowerCase() : "";
  if (type === "jpeg" || type === "jpg") return "jpg";
  if (type === "webp") return "webp";
  return "png";
}

function renderRenderFeedbackPanel() {
  const panel = document.querySelector("#renderFeedbackPanel");
  if (!panel) return;
  const visible = Boolean(pendingRenderResultImage);
  panel.classList.toggle("hidden", !visible);
  panel.querySelectorAll("[data-render-feedback]").forEach((button) => {
    const code = button.dataset.renderFeedback || "";
    button.disabled = !visible || renderJobRunning;
    button.classList.toggle("active", code === lastRenderFeedbackCode);
  });
}

function renderRenderLoadingOverlay() {
  const overlay = document.querySelector("#renderLoadingOverlay");
  if (!overlay) return;
  const title = document.querySelector("#renderLoadingTitle");
  const text = document.querySelector("#renderLoadingText");
  const context = getSelectedRenderRoomContext();
  overlay.classList.toggle("hidden", !renderJobRunning);
  overlay.setAttribute("aria-hidden", renderJobRunning ? "false" : "true");
  if (title) title.textContent = renderJobRunning ? "실사 보정 중" : "실사 보정";
  if (text) {
    text.textContent = renderJobRunning
      ? `${context.roomTypeLabel} · ${context.interiorStyleLabel} 방향으로 현장 사진과 타일 이미지를 맞춰보고 있습니다.`
      : "현장 사진과 선택한 타일을 분석해 보정 이미지를 만듭니다.";
  }
}

function renderRenderWorkspace() {
  ensureRenderSelection();
  const tileList = document.querySelector("#renderCartTileList");
  const sitePreview = document.querySelector("#renderSitePreview");
  const wallPreview = document.querySelector("#renderWallTilePreview");
  const floorPreview = document.querySelector("#renderFloorTilePreview");
  const pointPreview = document.querySelector("#renderPointTilePreview");
  const resultPreview = document.querySelector("#renderResultPreview");
  const sitePreviewTrigger = document.querySelector("#openSitePreviewBtn");
  const previewTrigger = document.querySelector("#openRenderPreviewBtn");
  const downloadLink = document.querySelector("#downloadRenderResultBtn");
  const saveButton = document.querySelector("#saveRenderResultBtn");
  const generateButton = document.querySelector("#generateRenderBtn");
  const wallSummary = document.querySelector("#renderWallTileSummary");
  const floorSummary = document.querySelector("#renderFloorTileSummary");
  const pointSummary = document.querySelector("#renderPointTileSummary");
  const clearWallButton = document.querySelector("#clearRenderWallTileBtn");
  const clearFloorButton = document.querySelector("#clearRenderFloorTileBtn");
  const clearPointButton = document.querySelector("#clearRenderPointTileBtn");
  const item = cart.find((entry) => entry.id === selectedRenderCartId);
  const cartTiles = getRenderableCartTiles();

  renderRenderRoomAnalysis();
  renderRenderLoadingOverlay();
  renderRenderFeedbackPanel();
  generateButton.disabled = renderJobRunning;
  saveButton.disabled = !item || !pendingRenderResultImage;
  sitePreviewTrigger.disabled = !pendingSiteImage;
  previewTrigger.disabled = !pendingRenderResultImage;
  clearWallButton.disabled = !renderSurfaceSelections.wall.tileId;
  clearFloorButton.disabled = !renderSurfaceSelections.floor.tileId;
  clearPointButton.disabled = !renderSurfaceSelections.point.tileId;
  generateButton.textContent = renderJobRunning ? "\uC2E4\uC0AC \uBCF4\uC815 \uC0DD\uC131 \uC911..." : "\uC2E4\uC0AC \uC774\uBBF8\uC9C0 \uBCF4\uC815 \uC2E4\uD589";
  renderRenderCartTileList(tileList, cartTiles);

  if (!item) {
    sitePreview.innerHTML = "\uBBF8\uB9AC\uBCF4\uAE30 \uC5C6\uC74C";
    wallPreview.innerHTML = "\uBBF8\uB9AC\uBCF4\uAE30 \uC5C6\uC74C";
    floorPreview.innerHTML = "\uBBF8\uB9AC\uBCF4\uAE30 \uC5C6\uC74C";
    pointPreview.innerHTML = "\uBBF8\uB9AC\uBCF4\uAE30 \uC5C6\uC74C";
    resultPreview.innerHTML = "\uBBF8\uB9AC\uBCF4\uAE30 \uC5C6\uC74C";
    sitePreview.classList.remove("has-image");
    wallPreview.classList.remove("has-image");
    floorPreview.classList.remove("has-image");
    pointPreview.classList.remove("has-image");
    resultPreview.classList.remove("has-image", "has-comparison");
    document.querySelector("#renderFeedbackPanel")?.classList.add("hidden");
    wallSummary.textContent = "\uC120\uD0DD\uD55C \uD0C0\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4";
    floorSummary.textContent = "\uC120\uD0DD\uD55C \uD0C0\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4";
    pointSummary.textContent = "\uC120\uD0DD\uD55C \uD0C0\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4";
    downloadLink.classList.add("hidden");
    downloadLink.removeAttribute("href");
    return;
  }

  sitePreview.innerHTML = pendingSiteImage
    ? '<img src="' + escapeHtml(pendingSiteImage) + '" alt="\uD604\uC7A5 \uC0AC\uC9C4 \uBBF8\uB9AC\uBCF4\uAE30" />'
    : "\uBBF8\uB9AC\uBCF4\uAE30 \uC5C6\uC74C";
  resultPreview.innerHTML = pendingRenderResultImage
    ? pendingSiteImage
      ? buildRenderComparisonHtml()
      : '<img src="' + escapeHtml(pendingRenderResultImage) + '" alt="\uBCF4\uC815 \uACB0\uACFC \uC774\uBBF8\uC9C0 \uBBF8\uB9AC\uBCF4\uAE30" />'
    : "\uBBF8\uB9AC\uBCF4\uAE30 \uC5C6\uC74C";

  getRenderSurfaceKeys().forEach((surface) => {
    const tile = cartTiles.find((entry) => entry.id === getRenderSurfaceSelection(surface).tileId);
    const summary = surface === "wall" ? wallSummary : surface === "floor" ? floorSummary : pointSummary;
    const preview = surface === "wall" ? wallPreview : surface === "floor" ? floorPreview : pointPreview;
    summary.textContent = tile
      ? `${tile.name}${tile.size ? ` \u00B7 ${tile.size}` : ""}${tile.finish ? ` \u00B7 ${tile.finish}` : ""}`
      : "\uC120\uD0DD\uD55C \uD0C0\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4";
    preview.innerHTML = tile?.image
      ? '<img src="' + escapeHtml(tile.image) + '" alt="' + escapeHtml(tile.name) + ' ' + escapeHtml(getRenderSurfaceLabel(surface)) + '" />'
      : "\uBBF8\uB9AC\uBCF4\uAE30 \uC5C6\uC74C";
    preview.classList.toggle("has-image", Boolean(tile?.image));
  });

  sitePreview.classList.toggle("has-image", Boolean(pendingSiteImage));
  resultPreview.classList.toggle("has-image", Boolean(pendingRenderResultImage));
  resultPreview.classList.toggle("has-comparison", Boolean(pendingRenderResultImage && pendingSiteImage));
  updateRenderCompareSlider();
  renderRenderFeedbackPanel();
  if (pendingRenderResultImage) {
    downloadLink.href = pendingRenderResultImage;
    downloadLink.download = `render-result.${getImageDataUrlExtension(pendingRenderResultImage)}`;
    downloadLink.classList.remove("hidden");
  } else {
    downloadLink.classList.add("hidden");
    downloadLink.removeAttribute("href");
  }
}

function renderRenderCartTileList(container, tiles) {
  if (!container) return;
  if (!tiles.length) {
    container.innerHTML = '<div class="empty-state compact-empty-state">장바구니에 담긴 타일 상품이 없습니다.</div>';
    return;
  }

  container.innerHTML = tiles.map((tile) => {
    const isActive = tile.id === selectedRenderTileId || tile.id === selectedRenderCartId;
    const modelName = tile.modelName || tile.name || "모델명 미확인";
    return `
      <button class="render-cart-tile${isActive ? " active" : ""}" type="button" data-render-cart-tile="${escapeHtml(tile.id)}">
        ${tile.image ? `<img src="${escapeHtml(tile.image)}" alt="${escapeHtml(modelName)}" loading="lazy" />` : '<span class="render-cart-tile-empty">이미지 없음</span>'}
        <span>
          <strong>${escapeHtml(modelName)}</strong>
          <small>${escapeHtml(tile.size || "규격 미확인")}</small>
        </span>
      </button>
    `;
  }).join("");
}

function openRenderResultPreview() {
  if (!pendingRenderResultImage) {
    setText("#renderStatus", "\uBA3C\uC800 \uC2E4\uC0AC \uBCF4\uC815 \uACB0\uACFC\uB97C \uC0DD\uC131\uD574\uC8FC\uC138\uC694.");
    return;
  }

  const modal = document.querySelector("#imagePreviewModal");
  const modalImage = document.querySelector("#imagePreviewModalImage");
  modalImage.src = pendingRenderResultImage;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function openImagePreview(type, surfaceKey = "") {
  const modal = document.querySelector("#imagePreviewModal");
  const modalImage = document.querySelector("#imagePreviewModalImage");
  const modalTitle = document.querySelector("#imagePreviewTitle");
  let src = "";
  let title = "";

  if (type === "site") {
    src = pendingSiteImage;
    title = "\uD604\uC7A5 \uC0AC\uC9C4 \uBBF8\uB9AC\uBCF4\uAE30";
  } else if (type === "surface") {
    const tile = cart.find((entry) => entry.id === getRenderSurfaceSelection(surfaceKey).tileId && entry.productType === "tile");
    src = tile?.image || "";
    title = `${getRenderSurfaceLabel(surfaceKey)} \uD0C0\uC77C \uBBF8\uB9AC\uBCF4\uAE30`;
  } else {
    src = pendingRenderResultImage;
    title = "\uBCF4\uC815 \uACB0\uACFC \uBBF8\uB9AC\uBCF4\uAE30";
  }

  if (!src) {
    setText("#renderStatus", "\uD574\uB2F9 \uC774\uBBF8\uC9C0\uB97C \uBA3C\uC800 \uC900\uBE44\uD574\uC8FC\uC138\uC694.");
    return;
  }

  modalTitle.textContent = title;
  modalImage.src = src;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function openImageSourcePreview(src, title = "이미지 미리보기") {
  if (!src) return;
  const modal = document.querySelector("#imagePreviewModal");
  const modalImage = document.querySelector("#imagePreviewModalImage");
  const modalTitle = document.querySelector("#imagePreviewTitle");
  modalTitle.textContent = title;
  modalImage.src = src;
  modalImage.alt = title;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeImagePreview() {
  const modal = document.querySelector("#imagePreviewModal");
  const modalImage = document.querySelector("#imagePreviewModalImage");
  const modalTitle = document.querySelector("#imagePreviewTitle");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  modalImage.removeAttribute("src");
  modalTitle.textContent = "\uC774\uBBF8\uC9C0 \uBBF8\uB9AC\uBCF4\uAE30";
}

function rememberRenderImageDataUrl(cacheKey, dataUrl) {
  if (!cacheKey || !dataUrl) return dataUrl;
  renderImageDataUrlCache.set(cacheKey, dataUrl);
  while (renderImageDataUrlCache.size > 80) {
    const firstKey = renderImageDataUrlCache.keys().next().value;
    renderImageDataUrlCache.delete(firstKey);
  }
  return dataUrl;
}

async function resizeRenderReferenceDataUrl(dataUrl, maxWidth = 1000, quality = 0.88) {
  if (!dataUrl || !/^data:image\//i.test(dataUrl)) return dataUrl;
  return await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(image.width || 1, image.height || 1));
      if (scale >= 1 && /^data:image\/jpe?g/i.test(dataUrl)) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function imageUrlToDataUrl(url) {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  if (renderImageDataUrlCache.has(url)) return renderImageDataUrlCache.get(url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("\uD0C0\uC77C \uC774\uBBF8\uC9C0\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    const blob = await response.blob();
    const rawDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("\uC774\uBBF8\uC9C0 \uB370\uC774\uD130 \uBCC0\uD658\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
      reader.readAsDataURL(blob);
    });
    const optimizedDataUrl = await resizeRenderReferenceDataUrl(rawDataUrl);
    return rememberRenderImageDataUrl(url, optimizedDataUrl);
  } catch {
    const payload = await requestJson(`/api/image-data-url?url=${encodeURIComponent(url)}`, {}, { retries: 1, timeoutMs: 30000 });
    const imageDataUrl = String(payload?.imageDataUrl || "");
    if (!imageDataUrl) throw new Error("\uD0C0\uC77C \uC774\uBBF8\uC9C0\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    const optimizedDataUrl = await resizeRenderReferenceDataUrl(imageDataUrl);
    return rememberRenderImageDataUrl(url, optimizedDataUrl);
  }
}

function buildRenderFeedbackPayload(code) {
  const item = cart.find((entry) => entry.id === selectedRenderCartId);
  const selectedSurfaces = getSelectedRenderSurfaces();
  return {
    code,
    label: RENDER_FEEDBACK_OPTIONS[code] || code,
    memo: document.querySelector("#renderFeedbackMemo")?.value.trim() || "",
    roomContext: getSelectedRenderRoomContext(),
    cartItem: item ? {
      id: item.id,
      managementCode: item.managementCode || "",
      productType: item.productType || "",
      kind: item.kind || "",
      name: item.name || "",
      size: item.size || "",
      finish: item.finish || "",
      color: item.color || "",
      material: item.material || "",
      image: item.image || ""
    } : null,
    surfaces: selectedSurfaces.map(({ surface, tile }) => ({
      surface,
      surfaceLabel: getRenderSurfaceLabel(surface),
      tileId: tile.id,
      managementCode: tile.managementCode || "",
      name: tile.name || "",
      size: tile.size || "",
      finish: tile.finish || "",
      color: tile.color || "",
      material: tile.material || "",
      image: tile.image || ""
    })),
    images: {
      siteImageDataUrl: pendingSiteImage,
      renderImageDataUrl: pendingRenderResultImage
    },
    ui: {
      compareSliderValue: renderCompareSliderValue
    },
    user: {
      role: authUser?.role || "",
      adminUsername: authUser?.adminUsername || "",
      businessNumber: authUser?.businessNumber || "",
      displayName: authUser?.displayName || authUser?.name || ""
    }
  };
}

async function handleRenderFeedbackClick(event) {
  const button = event.target.closest("[data-render-feedback]");
  if (!button) return;
  event.preventDefault();
  const code = button.dataset.renderFeedback || "";
  if (!pendingRenderResultImage) {
    setText("#renderStatus", "먼저 보정 결과를 생성해주세요.");
    return;
  }
  if (!RENDER_FEEDBACK_OPTIONS[code]) return;

  button.disabled = true;
  try {
    const payload = await requestJson(
      "/api/render-feedback",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderFeedbackPayload(code))
      },
      { timeoutMs: 30000 }
    );
    lastRenderFeedbackCode = code;
    renderRenderFeedbackPanel();
    setText("#renderStatus", `보정 평가가 저장되었습니다. (${payload?.feedback?.label || RENDER_FEEDBACK_OPTIONS[code]})`);
  } catch (error) {
    console.warn(error);
    setText("#renderStatus", error?.message || "보정 평가 저장 중 오류가 발생했습니다.");
  } finally {
    button.disabled = false;
  }
}

async function generateRenderPreview() {
  const item = cart.find((entry) => entry.id === selectedRenderCartId);
  const pointMemo = document.querySelector("#renderPointMemo").value.trim();
  const selectedSurfaces = getSelectedRenderSurfaces();
  const roomContext = getSelectedRenderRoomContext();

  if (!item) {
    setText("#renderStatus", "\uBCF4\uC815\uD560 \uB300\uC0C1 \uD488\uBAA9\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }
  if (!pendingSiteImage) {
    setText("#renderStatus", "\uD604\uC7A5 \uC0AC\uC9C4\uC744 \uBA3C\uC800 \uC5C5\uB85C\uB4DC\uD574\uC8FC\uC138\uC694.");
    return;
  }
  if (!selectedSurfaces.length) {
    setText("#renderStatus", "\uBCBD, \uBC14\uB2E5, \uD3EC\uC778\uD2B8 \uC911 \uD558\uB098 \uC774\uC0C1\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.");
    return;
  }
  if (selectedSurfaces.some(({ tile }) => !tile.image)) {
    setText("#renderStatus", "\uC120\uD0DD\uD55C \uD0C0\uC77C \uC911 \uC774\uBBF8\uC9C0\uAC00 \uC5C6\uB294 \uD488\uBAA9\uC774 \uC788\uC5B4 \uBCF4\uC815\uC744 \uC2E4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  renderJobRunning = true;
  renderRenderWorkspace();
  setText("#renderStatus", `${roomContext.roomTypeLabel} · ${roomContext.interiorStyleLabel} 방향으로 실사 보정 이미지를 생성하고 있습니다...`);

  try {
    const surfacesPayload = await Promise.all(selectedSurfaces.map(async ({ surface, tile }) => ({
      surface,
      tileName: tile.name,
      tileSize: tile.size || "",
      tileFinish: tile.finish || "",
      tileImageDataUrl: await imageUrlToDataUrl(tile.image)
    })));
    const payload = await requestJson(
      "/api/render",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteImageDataUrl: pendingSiteImage,
          surfaces: surfacesPayload,
          pointMemo,
          roomContext,
          qualityMode: "premium-photoreal"
        })
      },
      { timeoutMs: 180000 }
    );

    pendingRenderResultImage = String(payload?.imageDataUrl || "");
    if (!pendingRenderResultImage) throw new Error("\uBCF4\uC815 \uACB0\uACFC \uC774\uBBF8\uC9C0\uB97C \uBC1B\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    lastRenderFeedbackCode = "";
    setText("#renderStatus", "\uC2E4\uC0AC \uBCF4\uC815\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC81C\uC548\uC11C\uC5D0 \uBC18\uC601\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
    document.querySelector("#renderResultPreview")?.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    console.warn(error);
    setText("#renderStatus", error?.message || "\uC2E4\uC0AC \uC774\uBBF8\uC9C0 \uBCF4\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
  } finally {
    renderJobRunning = false;
    renderRenderWorkspace();
  }
}

function saveRenderResultToProposal() {
  const item = cart.find((entry) => entry.id === selectedRenderCartId);
  const selectedSurfaces = getSelectedRenderSurfaces();
  const roomContext = getSelectedRenderRoomContext();
  if (!item) {
    setText("#renderStatus", "\uBCF4\uC815 \uACB0\uACFC\uB97C \uC800\uC7A5\uD560 \uD488\uBAA9\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }
  if (!pendingRenderResultImage) {
    setText("#renderStatus", "\uBA3C\uC800 \uC2E4\uC0AC \uBCF4\uC815 \uACB0\uACFC\uB97C \uC0DD\uC131\uD574\uC8FC\uC138\uC694.");
    return;
  }

  item.renderedImage = pendingRenderResultImage;
  item.renderTileId = selectedSurfaces[0]?.tile.id || "";
  item.renderSurfaceSelections = getRenderSurfaceKeys().reduce((accumulator, surface) => {
    accumulator[surface] = {
      tileId: renderSurfaceSelections[surface].tileId || ""
    };
    return accumulator;
  }, {});
  item.renderTarget = getRenderSurfaceKeys()
    .filter((surface) => renderSurfaceSelections[surface].tileId)
    .map(getRenderSurfaceLabel)
    .join(", ");
  item.renderPointMemo = document.querySelector("#renderPointMemo").value.trim();
  item.renderRoomType = roomContext.roomTypeLabel;
  item.renderInteriorStyle = roomContext.interiorStyleLabel;
  item.renderStyleMemo = roomContext.styleMemo || "";
  if (!saveCart()) {
    setText("#renderStatus", "\uC7A5\uBC14\uAD6C\uB2C8 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uD55C \uBC88 \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.");
    return;
  }

  renderCartSummary();
  renderDocuments();
  switchDoc("proposalDoc");
  switchPage("proposalPage");
}

function requestSignupAuth() {
  const phone = document.querySelector("#signupPhone").value.trim();
  if (!phone) {
    setText("#authStatus", "전화번호를 먼저 입력해주세요.");
    return;
  }

  pendingSignupAuthCode = String(Math.floor(100000 + Math.random() * 900000));
  isPhoneVerified = false;
  document.querySelector("#signupAuthCode").value = pendingSignupAuthCode;
  setText("#authStatus", `인증번호가 발급되었습니다. 테스트용 인증번호 ${pendingSignupAuthCode}`);
  renderSignupSummary();
}

function verifySignupAuth() {
  const input = document.querySelector("#signupAuthCheck").value.trim();
  if (!pendingSignupAuthCode) {
    setText("#authStatus", "먼저 인증 요청을 진행해주세요.");
    return;
  }

  isPhoneVerified = input === pendingSignupAuthCode;
  setText("#authStatus", isPhoneVerified ? "전화번호 인증이 완료되었습니다." : "인증번호가 일치하지 않습니다.");
  renderSignupSummary();
}

function resetPhoneVerification() {
  isPhoneVerified = false;
  pendingSignupAuthCode = "";
  document.querySelector("#signupAuthCode").value = "";
  document.querySelector("#signupAuthCheck").value = "";
  setText("#authStatus", "전화번호가 변경되었습니다. 다시 인증해주세요.");
  renderSignupSummary();
}

async function handleBusinessFileChange() {
  const file = document.querySelector("#signupBizFile")?.files?.[0];
  setText("#businessFileName", file ? file.name : "첨부 전");
  setText("#businessScanStatus", file ? "등록증 파일이 첨부되었습니다. 자동으로 스캔을 시작합니다." : "사업자 회원은 사업자등록증 첨부가 필수입니다.");
  extractedBusinessInfo = {
    companyName: "",
    businessAddress: "",
    representative: "",
    openingDate: "",
    businessType: "",
    businessItem: "",
    businessCategorySection: "",
    approvalStatus: "판정 전"
  };
  resetBusinessVerification(false);
  renderSignupSummary();
  if (file) {
    await scanBusinessRegistrationFile({ autoTriggered: true });
  }
}

function handleBusinessCardFileChange() {
  const file = document.querySelector("#signupBusinessCardFile")?.files?.[0];
  if (file) {
    const emailInput = signupForm?.elements?.namedItem("contactEmail");
    const phoneInput = signupForm?.elements?.namedItem("contactPhone");
    const addressInput = signupForm?.elements?.namedItem("contactAddress");
    if (emailInput && !emailInput.value && socialSignupProfile?.email) emailInput.value = socialSignupProfile.email;
    if (phoneInput && !phoneInput.value) phoneInput.value = signupForm?.elements?.namedItem("phone")?.value || "";
    if (addressInput && !addressInput.value) addressInput.value = signupForm?.elements?.namedItem("companyAddress")?.value || extractedBusinessInfo.businessAddress || "";
    toggleManualBusinessInput(true);
  }
  setText("#businessCardFileStatus", file
    ? `${file.name} 첨부됨. 이름, 직함, 회사명, 번호, 이메일, 주소가 담당자정보로 저장됩니다.`
    : "명함 사진이 있으면 등급 심사가 더 빠릅니다. 없으면 직접 입력만으로 신청할 수 있습니다.");
  renderSignupSummary();
}

function toggleManualBusinessInput(forceOpen) {
  const panel = document.querySelector("#manualBusinessInputPanel");
  const button = document.querySelector("#toggleManualBusinessInputBtn");
  if (!panel) return;
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !shouldOpen);
  if (button) button.textContent = shouldOpen ? "직접 입력 닫기" : "명함 직접 입력";
  if (shouldOpen) {
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function resetBusinessVerification(resetNumber = true) {
  if (resetNumber) document.querySelector("#signupBizNo").value = "";
  businessVerification = { status: "idle", message: "사업자등록번호를 입력하거나 등록증을 첨부하면 확인할 수 있습니다." };
  extractedBusinessInfo.approvalStatus = evaluateBusinessApprovalStatus();
  setText("#businessVerifyStatus", businessVerification.message);
  renderSignupSummary();
}

async function scanBusinessRegistrationFile(options = {}) {
  const { autoTriggered = false } = options;
  const file = document.querySelector("#signupBizFile")?.files?.[0];
  if (!file) {
    setText("#businessScanStatus", "사업자등록증 파일을 먼저 첨부해주세요.");
    return;
  }

  const requestId = Date.now();
  businessScanRequestId = requestId;
  setText("#businessScanStatus", autoTriggered ? "등록증을 자동 스캔하는 중입니다..." : "사업자등록증을 스캔하는 중입니다...");
  try {
    const documentData = await extractBusinessDocumentData(file);
    if (businessScanRequestId !== requestId) return;
    const combinedText = Object.values(documentData).filter(Boolean).join("\n");
    const businessNumber = extractBusinessNumber(combinedText);
    extractedBusinessInfo = extractBusinessInfo(documentData.text, documentData);
    autofillSignupFieldsFromBusinessInfo(extractedBusinessInfo);
    extractedBusinessInfo.approvalStatus = evaluateBusinessApprovalStatus();
    if (!businessNumber) {
      setText(
        "#businessScanStatus",
        file.type.startsWith("image/")
          ? "스캔은 완료됐지만 사업자등록번호를 찾지 못했습니다. 추출된 업체명과 주소는 반영했고, 사업자번호는 직접 입력해주세요."
          : "파일에서 사업자등록번호를 찾지 못했습니다. 추출된 업체명과 주소는 반영했고, 사업자번호는 직접 입력해주세요."
      );
      renderSignupSummary();
      return;
    }

    document.querySelector("#signupBizNo").value = formatBusinessNumber(businessNumber);
    businessVerification = { status: "scanned", message: `등록증에서 사업자등록번호 ${formatBusinessNumber(businessNumber)}를 추출했습니다.` };
    setText("#businessScanStatus", businessVerification.message);
    setText("#businessVerifyStatus", "사업자등록번호가 자동 입력되었습니다. 사업자 확인 버튼으로 상태를 검증해주세요.");
    renderSignupSummary();
  } catch (error) {
    if (businessScanRequestId !== requestId) return;
    console.warn(error);
    setText("#businessScanStatus", "등록증 스캔에 실패했습니다. PDF 텍스트형 파일인지 확인하거나 직접 입력해주세요.");
  }
}

async function extractBusinessDocumentData(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const buffer = await file.arrayBuffer();
    return {
      text: decodePdfText(buffer),
      registrationText: "",
      companyText: "",
      representativeText: "",
      openingDateText: "",
      addressText: "",
      typeText: "",
      itemText: "",
      categoryText: ""
    };
  }

  if (file.type.startsWith("image/")) {
    const tesseract = await loadTesseract();
    if (!tesseract) throw new Error("OCR unavailable");
    const preparedImage = await prepareBusinessImageForOcr(file);
    const text = await runBusinessOcr(tesseract, preparedImage, "등록증 전체 OCR 진행 중...");
    const regionTexts = await extractBusinessRegionTexts(tesseract, preparedImage);
    return {
      text,
      ...regionTexts
    };
  }

  return {
    text: "",
    registrationText: "",
    companyText: "",
    representativeText: "",
    openingDateText: "",
    addressText: "",
    typeText: "",
    itemText: "",
    categoryText: ""
  };
}

async function extractBusinessDocumentText(file) {
  const data = await extractBusinessDocumentData(file);
  return [
    data.text,
    data.registrationText,
    data.companyText,
    data.representativeText,
    data.openingDateText,
    data.addressText,
    data.typeText,
    data.itemText,
    data.categoryText
  ].filter(Boolean).join("\n");
}

async function runBusinessOcr(tesseract, imageSource, statusPrefix) {
  const result = await tesseract.recognize(imageSource, "kor+eng", {
    logger: (message) => {
      if (message.status === "recognizing text") {
        const progress = Math.round((message.progress || 0) * 100);
        setText("#businessScanStatus", `${statusPrefix} ${progress}%`);
      }
    }
  });
  return result?.data?.text || "";
}

async function extractBusinessRegionTexts(tesseract, preparedImage) {
  const image = await loadImageFromUrl(preparedImage);
  if (!image) {
    return {
      registrationText: "",
      companyText: "",
      representativeText: "",
      openingDateText: "",
      addressText: "",
      typeText: "",
      itemText: "",
      categoryText: ""
    };
  }

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const regions = [
    {
      key: "registrationText",
      status: "등록번호 영역 OCR 진행 중...",
      crop: { left: Math.round(width * 0.22), top: Math.round(height * 0.10), width: Math.round(width * 0.46), height: Math.round(height * 0.10) }
    },
    {
      key: "companyText",
      status: "상호 영역 OCR 진행 중...",
      crop: { left: Math.round(width * 0.07), top: Math.round(height * 0.24), width: Math.round(width * 0.58), height: Math.round(height * 0.045) }
    },
    {
      key: "representativeText",
      status: "대표자 영역 OCR 진행 중...",
      crop: { left: Math.round(width * 0.07), top: Math.round(height * 0.29), width: Math.round(width * 0.34), height: Math.round(height * 0.04) }
    },
    {
      key: "openingDateText",
      status: "개업일자 영역 OCR 진행 중...",
      crop: { left: Math.round(width * 0.07), top: Math.round(height * 0.36), width: Math.round(width * 0.34), height: Math.round(height * 0.045) }
    },
    {
      key: "addressText",
      status: "사업장주소 영역 OCR 진행 중...",
      crop: { left: Math.round(width * 0.05), top: Math.round(height * 0.40), width: Math.round(width * 0.76), height: Math.round(height * 0.12) }
    },
    {
      key: "typeText",
      status: "업태 영역 OCR 진행 중...",
      crop: { left: Math.round(width * 0.28), top: Math.round(height * 0.53), width: Math.round(width * 0.16), height: Math.round(height * 0.12) }
    },
    {
      key: "itemText",
      status: "종목 영역 OCR 진행 중...",
      crop: { left: Math.round(width * 0.61), top: Math.round(height * 0.53), width: Math.round(width * 0.21), height: Math.round(height * 0.12) }
    }
  ];

  const extracted = {};
  for (const region of regions) {
    const crop = cropBusinessImageRegion(image, region.crop);
    extracted[region.key] = crop ? await runBusinessOcr(tesseract, crop, region.status) : "";
  }

  extracted.categoryText = [extracted.typeText, extracted.itemText].filter(Boolean).join("\n");
  return extracted;
}

function cropBusinessImageRegion(image, crop) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return "";

  canvas.width = Math.max(1, crop.width);
  canvas.height = Math.max(1, crop.height);
  context.drawImage(
    image,
    crop.left,
    crop.top,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas.toDataURL("image/png");
}

async function prepareBusinessImageForOcr(file) {
  const dataUrl = await readImageFile(file, 2200);
  if (!dataUrl) return file;

  const image = await loadImageFromUrl(dataUrl);
  if (!image) return file;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return file;

  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const frame = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = frame.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const gray = Math.round((r * 0.299) + (g * 0.587) + (b * 0.114));
    const boosted = gray > 180 ? 255 : gray < 125 ? 0 : Math.min(255, Math.round(gray * 1.08));
    pixels[index] = boosted;
    pixels[index + 1] = boosted;
    pixels[index + 2] = boosted;
  }
  context.putImageData(frame, 0, 0);

  return canvas.toDataURL("image/png");
}

function decodePdfText(buffer) {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const latin1 = new TextDecoder("latin1").decode(buffer);
  return `${utf8}\n${latin1}`.replace(/\u0000/g, " ");
}

function extractBusinessNumber(text) {
  const normalized = String(text || "").replace(/\s+/g, " ");
  const labeledMatch = normalized.match(/사업자\s*등록\s*번호[^0-9]{0,20}([0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{5})/i);
  if (labeledMatch) return cleanBusinessNumber(labeledMatch[1]);

  const genericMatches = normalized.match(/([0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{5})/g) || [];
  for (const candidate of genericMatches) {
    const clean = cleanBusinessNumber(candidate);
    if (clean.length === 10) return clean;
  }
  return "";
}

function extractBusinessInfo(text, regionTexts = {}) {
  const source = String(text || "");
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const registrationLines = getTrimmedLines(regionTexts.registrationText);
  const companyLines = getTrimmedLines(regionTexts.companyText);
  const representativeLines = getTrimmedLines(regionTexts.representativeText);
  const openingDateLines = getTrimmedLines(regionTexts.openingDateText);
  const addressLines = String(regionTexts.addressText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const typeLines = getTrimmedLines(regionTexts.typeText);
  const itemLines = getTrimmedLines(regionTexts.itemText);
  const businessCategoryInfo = extractBusinessCategoryInfo(lines, source, regionTexts.categoryText || "");
  const focusedBusinessTypes = extractFieldListFromCrop(regionTexts.typeText, ["업태", "업태명"]);
  const focusedBusinessItems = extractFieldListFromCrop(regionTexts.itemText, ["종목", "업종", "업종명"]);
  const focusedBusinessCategorySection = [focusedBusinessTypes.join(", "), focusedBusinessItems.join(", ")].filter(Boolean).join(" / ");
  const businessCategorySection = focusedBusinessCategorySection || businessCategoryInfo.section;
  const semanticInfo = extractBusinessInfoByMeaning(source, regionTexts);
  const normalizedText = lines.join("\n");
  const normalizedCompanyText = companyLines.join("\n");
  const normalizedRepresentativeText = representativeLines.join("\n");
  const normalizedOpeningDateText = openingDateLines.join("\n");
  const normalizedAddressText = addressLines.join("\n");
  const companyNameFromCrop = extractCompanyNameFromCrop(regionTexts.companyText);
  const representativeFromCrop = extractRepresentativeNameFromCrop(regionTexts.representativeText);
  const openingDateFromCrop = normalizeOpeningDate(regionTexts.openingDateText || "");
  const businessAddressFromCrop = extractBusinessAddressFromCrop(regionTexts.addressText);

  return {
    companyName: sanitizeExtractedField(
      semanticInfo.companyName
      || companyNameFromCrop
      || extractLabeledLineValue(companyLines, ["상호", "법인명", "법인명(단체명)", "단체명", "업체명"], ["성명", "대표자", "대표자명"])
      || extractFieldFromWholeText(normalizedCompanyText, ["상호", "법인명", "법인명(단체명)", "단체명", "업체명"], ["성명", "대표자", "대표자명"])
      ||
      extractLabeledLineValue(lines, ["상호", "법인명", "단체명"], ["성명", "대표자", "대표자명", "생년월일", "개업연월일"])
      || extractFieldFromWholeText(normalizedText, ["상호", "법인명", "단체명"], ["성명", "대표자", "대표자명", "생년월일", "개업연월일"])
      || ""
    ),
    businessAddress: normalizeBusinessAddress(
      semanticInfo.businessAddress
      || businessAddressFromCrop
      || extractAddressCandidateFromText(normalizedAddressText)
      || extractLabeledLineValue(addressLines, ["사업장소재지", "사업장 주소", "주소"], ["사업의종류", "업태", "업종", "종목", "발급사유"])
      || extractFieldFromWholeText(normalizedAddressText, ["사업장소재지", "사업장 주소", "주소"], ["사업의종류", "업태", "업종", "종목", "발급사유"])
      ||
      extractLabeledLineValue(lines, ["사업장소재지", "사업장 주소", "주소"], ["사업의종류", "업태", "업종", "종목", "발급사유"])
      || extractFieldFromWholeText(normalizedText, ["사업장소재지", "사업장 주소", "주소"], ["사업의종류", "업태", "업종", "종목", "발급사유"])
      || ""
    ),
    representative: sanitizeExtractedField(
      semanticInfo.representative
      || representativeFromCrop
      || extractLabeledLineValue(representativeLines, ["성명", "대표자", "대표자명"], ["생년월일", "개업연월일", "사업장소재지"])
      || extractFieldFromWholeText(normalizedRepresentativeText, ["성명", "대표자", "대표자명"], ["생년월일", "개업연월일", "사업장소재지"])
      ||
      extractLabeledLineValue(lines, ["성명", "대표자", "대표자명"], ["생년월일", "개업연월일", "사업장소재지"])
      || extractFieldFromWholeText(normalizedText, ["성명", "대표자", "대표자명"], ["생년월일", "개업연월일", "사업장소재지"])
      || ""
    ),
    openingDate: normalizeOpeningDate(
      sanitizeExtractedField(
        semanticInfo.openingDate
        || openingDateFromCrop
        || extractLabeledLineValue(openingDateLines, ["개업연월일", "개업일자", "개업년월일"], ["사업장소재지", "사업의종류", "업태", "업종", "종목"])
        || extractFieldFromWholeText(normalizedOpeningDateText, ["개업연월일", "개업일자", "개업년월일"], ["사업장소재지", "사업의종류", "업태", "업종", "종목"])
        ||
        extractLabeledLineValue(lines, ["개업연월일", "개업일자", "개업년월일"], ["사업장소재지", "사업의종류", "업태", "업종", "종목"])
        || extractFieldFromWholeText(normalizedText, ["개업연월일", "개업일자", "개업년월일"], ["사업장소재지", "사업의종류", "업태", "업종", "종목"])
        || ""
      )
    ),
    businessType: sanitizeExtractedField(
      semanticInfo.businessType
      || focusedBusinessTypes.join(", ")
      || extractLabeledLineValue(typeLines, ["업태", "업태명"], ["업종", "종목", "발급사유"])
      || extractFieldFromWholeText(regionTexts.typeText || "", ["업태", "업태명"], ["업종", "종목", "발급사유"])
      ||
      extractLabeledLineValue(lines, ["업태", "업태명"], ["업종", "종목", "발급사유"])
      || businessCategoryInfo.businessType
      || businessCategorySection
      || ""
    ),
    businessItem: sanitizeExtractedField(
      semanticInfo.businessItem
      || focusedBusinessItems.join(", ")
      || extractLabeledLineValue(itemLines, ["종목", "업종", "업종명"], ["발급사유", "공동사업자"])
      || extractFieldFromWholeText(regionTexts.itemText || "", ["종목", "업종", "업종명"], ["발급사유", "공동사업자"])
      || extractLabeledLineValue(lines, ["종목", "업종", "업종명"], ["발급사유", "공동사업자"])
      || businessCategoryInfo.businessItem
      || businessCategorySection
      || ""
    ),
    businessCategorySection: semanticInfo.businessCategorySection || businessCategorySection,
    approvalStatus: "판정 전"
  };
}

function extractBusinessInfoByMeaning(source, regionTexts = {}) {
  const prioritizedLines = [
    ...getTrimmedLines(regionTexts.companyText),
    ...getTrimmedLines(regionTexts.representativeText),
    ...getTrimmedLines(regionTexts.openingDateText),
    ...getTrimmedLines(regionTexts.addressText),
    ...getTrimmedLines(regionTexts.typeText),
    ...getTrimmedLines(regionTexts.itemText),
    ...getTrimmedLines(regionTexts.categoryText),
    ...getTrimmedLines(source)
  ].map((line) => normalizeBusinessMeaningLine(line)).filter(Boolean);

  const uniqueLines = [...new Set(prioritizedLines)];
  const companyName = detectBusinessCompanyName(uniqueLines);
  const representative = detectBusinessRepresentative(uniqueLines);
  const openingDate = detectBusinessOpeningDate(uniqueLines);
  const businessAddress = detectBusinessAddress(uniqueLines);
  const categoryInfo = detectBusinessCategoryByMeaning(uniqueLines);

  return {
    companyName,
    representative,
    openingDate,
    businessAddress,
    businessType: categoryInfo.businessType,
    businessItem: categoryInfo.businessItem,
    businessCategorySection: categoryInfo.businessCategorySection
  };
}

function getTrimmedLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripLabelPrefix(value, labels = []) {
  let cleaned = String(value || "").trim();
  for (const label of labels) {
    cleaned = cleaned.replace(new RegExp(`^${buildLooseLabelPattern(label)}\\s*[:：]?[\\s]*`, "i"), "").trim();
  }
  return sanitizeExtractedField(cleaned);
}

function extractFieldListFromCrop(text, labels = []) {
  const lines = getTrimmedLines(text);
  const values = [];

  for (const line of lines) {
    const cleaned = cleanupCategoryNoise(stripLabelPrefix(line, labels));
    if (!cleaned || /^(업태|업종|종목|업태명|업종명)$/i.test(cleaned)) continue;
    if (/@|fax|mail|naver|co\.|www|http/i.test(cleaned)) continue;
    if (/개업|연월일|사업장|소재지|발급|정정|등록번호|법인등록번호|대표자|세무서|국세청/i.test(cleaned)) continue;
    if (!/[가-힣]/.test(cleaned)) continue;
    if (/[A-Za-z]{4,}/.test(cleaned)) continue;
    if (cleaned.length > 40) continue;
    values.push(cleaned);
  }

  return [...new Set(values)];
}

function extractCompanyNameFromCrop(text) {
  const lines = getTrimmedLines(text);
  for (const line of lines) {
    const cleaned = sanitizeExtractedField(
      stripLabelPrefix(line, ["상호", "법인명", "법인명(단체명)", "단체명", "업체명"])
        .replace(/개\s*업.*$/i, "")
        .replace(/연\s*월\s*일.*$/i, "")
        .replace(/등록번호.*$/i, "")
        .replace(/사업장.*$/i, "")
        .trim()
    );
    if (!cleaned) continue;
    if (!/[가-힣]/.test(cleaned)) continue;
    if (/@|fax|mail|naver/i.test(cleaned)) continue;
    if (/개업|연월일|등록번호|사업장|소재지|대표자|업태|종목/i.test(cleaned)) continue;
    return cleaned;
  }
  return "";
}

function extractRepresentativeNameFromCrop(text) {
  const source = stripLabelPrefix(text, ["성명", "대표자", "대표자명"]);
  const matches = String(source || "").match(/[가-힣]{2,5}/g) || [];
  return matches[0] || "";
}

function extractBusinessAddressFromCrop(text) {
  const source = String(text || "");
  return normalizeBusinessAddress(
    extractAddressCandidateFromText(source)
    || stripLabelPrefix(source, ["사업장소재지", "사업장 주소", "주소", "본점소재지", "본점 소재지"])
  );
}

function normalizeBusinessMeaningLine(line) {
  return String(line || "")
    .replace(/\s{2,}/g, " ")
    .replace(/[|]/g, " ")
    .trim();
}

function isMostlyKoreanText(value) {
  const source = String(value || "");
  const koreanCount = (source.match(/[가-힣]/g) || []).length;
  const alphaNumCount = (source.match(/[가-힣A-Za-z0-9]/g) || []).length;
  if (!alphaNumCount) return false;
  return koreanCount / alphaNumCount >= 0.45;
}

function looksLikeBusinessNoise(value) {
  const source = String(value || "");
  return !source
    || /@|fax|mail|naver|co\.|http|www/i.test(source)
    || /정정|발급사유|세무서|국세청|전자세금계산서|사업자단위|과세적용/i.test(source);
}

function detectBusinessCompanyName(lines) {
  const companyPattern = /(주식회사|유한회사|합자회사|합명회사|㈜|\(주\))/;
  const candidates = [];

  for (const line of lines) {
    const cleaned = sanitizeExtractedField(stripLabelPrefix(line, ["상호", "법인명", "법인명(단체명)", "단체명", "업체명"]));
    if (!cleaned || looksLikeBusinessNoise(cleaned)) continue;
    if (/대표자|개업|연월일|사업장|소재지|업태|종목|등록번호|법인등록번호/i.test(cleaned)) continue;
    if (!isMostlyKoreanText(cleaned)) continue;
    if (!companyPattern.test(cleaned) && cleaned.length < 5) continue;
    candidates.push(cleaned);
  }

  return candidates.sort((a, b) => {
    const aScore = (companyPattern.test(a) ? 10 : 0) + a.length;
    const bScore = (companyPattern.test(b) ? 10 : 0) + b.length;
    return bScore - aScore;
  })[0] || "";
}

function detectBusinessRepresentative(lines) {
  const candidates = [];

  for (const line of lines) {
    if (looksLikeBusinessNoise(line)) continue;
    const cleaned = stripLabelPrefix(line, ["성명", "대표자", "대표자명", "대 표 자"]);
    const matches = cleaned.match(/[가-힣]{2,5}/g) || [];
    for (const match of matches) {
      if (/주식회사|사업장|경기도|서울|부산|업태|종목/.test(match)) continue;
      candidates.push(match);
    }
  }

  return candidates[0] || "";
}

function detectBusinessOpeningDate(lines) {
  for (const line of lines) {
    if (!/\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일/.test(line) && !/\b(20\d{2}|19\d{2})(\d{2})(\d{2})\b/.test(line)) continue;
    const normalized = normalizeOpeningDate(line);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  }
  return "";
}

function detectBusinessAddress(lines) {
  const candidates = [];

  for (const line of lines) {
    if (looksLikeBusinessNoise(line)) continue;
    const address = normalizeBusinessAddress(
      extractAddressCandidateFromText(line)
      || stripLabelPrefix(line, ["사업장소재지", "사업장 주소", "주소", "본점소재지", "본점 소재지"])
    );
    if (!address) continue;
    if (!/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/.test(address)) continue;
    if (address.length < 8) continue;
    candidates.push(address);
  }

  return candidates.sort((a, b) => b.length - a.length)[0] || "";
}

function detectBusinessCategoryByMeaning(lines) {
  const typeMatches = [];
  const itemMatches = [];

  for (const line of lines) {
    const cleaned = cleanupCategoryNoise(stripLabelPrefix(line, ["사업의종류", "업태", "업태명", "업종", "업종명", "종목"]));
    if (!cleaned || looksLikeBusinessNoise(cleaned)) continue;
    if (!isMostlyKoreanText(cleaned)) continue;

    if (looksLikeBusinessType(cleaned)) typeMatches.push(cleaned);
    if (looksLikeBusinessItem(cleaned)) itemMatches.push(cleaned);
  }

  const businessType = [...new Set(typeMatches)].slice(0, 3).join(", ");
  const businessItem = [...new Set(itemMatches)].slice(0, 5).join(", ");
  return {
    businessType,
    businessItem,
    businessCategorySection: [businessType, businessItem].filter(Boolean).join(" / ")
  };
}

function looksLikeBusinessType(value) {
  return /(도매\s*및\s*소매업|건설업|제조업|서비스업|부동산업|정보통신업|전문[, ]*과학\s*및\s*기술서비스업|전자상거래업|통신판매업)/.test(value);
}

function looksLikeBusinessItem(value) {
  return /(공사업|무역|건축자재|타일|위생도기|조명기구|소매업|도매업|인테리어|실내건축|방수|설비|창호|금구|욕실용품)/.test(value)
    && !looksLikeBusinessType(value);
}

function extractBusinessCategoryInfo(lines, sourceText = "", focusedCategoryText = "") {
  const section = extractBusinessCategorySection(lines, focusedCategoryText);
  const sectionSource = focusedCategoryText
    ? [focusedCategoryText, section].filter(Boolean).join("\n")
    : [section, String(sourceText || "").trim()].filter(Boolean).join("\n");
  const typeMatches = collectCategoryValues(sectionSource, ["업태", "업태명"], ["업종", "종목", "업종명", "발급사유", "공동사업자"]);
  const itemMatches = collectCategoryValues(sectionSource, ["업종", "종목", "업종명"], ["업태", "업태명", "발급사유", "공동사업자"]);
  const inferredTypes = typeMatches.length ? typeMatches : inferBusinessTypes(section);
  const inferredItems = itemMatches.length ? itemMatches : inferBusinessItems(section);

  return {
    section,
    businessType: [...new Set(inferredTypes)].slice(0, 3).join(", "),
    businessItem: [...new Set(inferredItems)].slice(0, 5).join(", ")
  };
}

function extractBusinessCategorySection(lines, focusedCategoryText = "") {
  const focusedLines = String(focusedCategoryText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sourceLines = focusedLines.length ? focusedLines : lines;
  if (!Array.isArray(sourceLines) || !sourceLines.length) return "";

  const startIndex = sourceLines.findIndex((line) => /사\s*업\s*의\s*종\s*류|업\s*태|업\s*종|종\s*목/i.test(line));
  const actualStartIndex = startIndex === -1 ? 0 : startIndex;

  const collected = [];
  for (let index = actualStartIndex; index < sourceLines.length; index += 1) {
    const line = sourceLines[index].trim();
    if (!line) continue;
    if (
      index > actualStartIndex &&
      /발\s*급\s*사\s*유|공\s*동\s*사\s*업\s*자|사\s*업\s*자\s*단\s*위|과\s*세\s*적\s*용|전\s*자\s*세\s*금\s*계\s*산\s*서|개\s*업\s*연\s*월\s*일|사\s*업\s*장\s*소\s*재\s*지/i.test(line)
    ) {
      break;
    }
    collected.push(sanitizeExtractedField(line.replace(/사\s*업\s*의\s*종\s*류\s*[:：]?\s*/i, "").trim()));
  }

  return [...new Set(collected)]
    .map((line) => cleanupCategoryNoise(line))
    .filter(Boolean)
    .join(" ");
}

function collectCategoryValues(text, labels, stopLabels = []) {
  const source = String(text || "").replace(/\r/g, " ").replace(/\n/g, " ");
  const values = [];

  for (const label of labels) {
    const regex = new RegExp(`${buildLooseLabelPattern(label)}\\s*[:：]?\\s*([^\\n]+?)\\s*(?=${stopLabels.map((item) => buildLooseLabelPattern(item)).join("|")}|$)`, "gi");
    let match;
    while ((match = regex.exec(source))) {
      const cleaned = cleanupValueAfterLabel(match[1] || "", stopLabels);
      if (cleaned && !/^(업태|업종|종목)$/i.test(cleaned)) values.push(cleaned);
    }
  }

  return values.map((value) => cleanupCategoryNoise(value)).filter(Boolean);
}

function extractLabeledLineValue(lines, labels, stopLabels = []) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const label of labels) {
      const regex = new RegExp(`${buildLooseLabelPattern(label)}\\s*[:：]?\\s*(.+)?$`, "i");
      const match = line.match(regex);
      if (!match) continue;

      const value = cleanupValueAfterLabel(match[1] || "", stopLabels);
      if (value && value !== label) return value;
      const nextLine = lines[index + 1]?.trim() || "";
      if (nextLine && !labels.some((item) => nextLine.startsWith(item))) {
        return cleanupValueAfterLabel(nextLine, stopLabels);
      }
    }
  }
  return "";
}

function extractFieldFromWholeText(text, labels, stopLabels = []) {
  const source = String(text || "").replace(/\r/g, " ");
  for (const label of labels) {
    const regex = new RegExp(`${buildLooseLabelPattern(label)}\\s*[:：]?\\s*([^\\n]+)`, "i");
    const match = source.match(regex);
    if (!match) continue;
    const value = cleanupValueAfterLabel(match[1] || "", stopLabels);
    if (value) return value;
  }
  return "";
}

function buildLooseLabelPattern(label) {
  return String(label || "")
    .split("")
    .map((character) => escapeRegex(character))
    .join("\\s*");
}

function cleanupValueAfterLabel(value, stopLabels = []) {
  let cleaned = String(value || "").trim();
  if (!cleaned) return "";

  for (const stopLabel of stopLabels) {
    const regex = new RegExp(`\\s+${buildLooseLabelPattern(stopLabel)}\\s*[:：]?.*$`, "i");
    cleaned = cleaned.replace(regex, "").trim();
  }

  return sanitizeExtractedField(cleaned);
}

function inferBusinessTypes(section) {
  const text = cleanupCategoryNoise(section);
  if (!text) return [];

  const patterns = [
    /도매\s*및\s*소매업/gi,
    /건설업/gi,
    /제조업/gi,
    /서비스업/gi,
    /부동산업/gi,
    /정보통신업/gi,
    /전문[, ]*과학\s*및\s*기술서비스업/gi,
    /전자상거래업/gi,
    /통신판매업/gi
  ];

  const matches = [];
  for (const pattern of patterns) {
    const found = text.match(pattern) || [];
    for (const item of found) matches.push(sanitizeExtractedField(item));
  }
  return [...new Set(matches)];
}

function inferBusinessItems(section) {
  const text = cleanupCategoryNoise(section);
  if (!text) return [];

  const preferred = extractRuleMatchesFromSection(text, approvalRules.businessItems);
  if (preferred.length) return preferred;

  const patterns = [
    /[가-힣A-Za-z0-9(),\s]+공사업/gi,
    /건축자재\s*\([^)]+\)/gi,
    /[가-힣A-Za-z0-9(),\s]+무역/gi,
    /[가-힣A-Za-z0-9(),\s]+도매업/gi,
    /[가-힣A-Za-z0-9(),\s]+소매업/gi
  ];

  const matches = [];
  for (const pattern of patterns) {
    const found = text.match(pattern) || [];
    for (const item of found) matches.push(cleanupCategoryNoise(item));
  }
  return [...new Set(matches)].filter((item) => item.length <= 40);
}

function extractRuleMatchesFromSection(section, rules) {
  const normalizedSection = normalizeRuleValue(section);
  return (Array.isArray(rules) ? rules : [])
    .filter((rule) => normalizedSection.includes(normalizeRuleValue(rule)))
    .map((rule) => formatRuleLabel(rule));
}

function formatRuleLabel(rule) {
  const value = String(rule || "").trim();
  return value
    .replaceAll("및", " 및 ")
    .replaceAll("도매업", " 도매업")
    .replaceAll("소매업", " 소매업")
    .replaceAll("공사업", " 공사업")
    .replaceAll("판매업", " 판매업")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanupCategoryNoise(value) {
  return String(value || "")
    .replace(/국세청.*$/i, "")
    .replace(/등록번호.*$/i, "")
    .replace(/법인등록번호.*$/i, "")
    .replace(/대표자.*$/i, "")
    .replace(/대표명.*$/i, "")
    .replace(/정정.*$/i, "")
    .replace(/사유.*$/i, "")
    .replace(/발행.*$/i, "")
    .replace(/세무서.*$/i, "")
    .replace(/사업자단위.*$/i, "")
    .replace(/과세적용.*$/i, "")
    .replace(/전자세금계산서.*$/i, "")
    .replace(/발급사유.*$/i, "")
    .replace(/소재지.*$/i, "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .replace(/\b\d{4}\s*년\s*\d{2}\s*월\s*\d{2}\s*일\b/g, "")
    .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{5}\b/g, "")
    .replace(/\b\d{6}[-\s]?\d{7}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.;:)\]-]+/g, "")
    .trim();
}

function normalizeBusinessAddress(value) {
  const cleaned = cleanupAddressNoise(value);
  const match = cleaned.match(/((서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\n]*)/);
  return sanitizeExtractedField(match ? match[1] : cleaned);
}

function extractAddressCandidateFromText(text) {
  const source = cleanupAddressNoise(text);
  const lineMatch = source.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^0-9\n]*(?:\d+[^\n]*)?/);
  return lineMatch ? lineMatch[0].trim() : "";
}

function cleanupAddressNoise(value) {
  return String(value || "")
    .replace(/^\d{4}\s*년\s*\d{2}\s*월\s*\d{2}\s*일\s*/g, "")
    .replace(/\b\d{4}\s*년\s*\d{2}\s*월\s*\d{2}\s*일\b/g, "")
    .replace(/개업연월일.*$/i, "")
    .replace(/법인등록번호.*$/i, "")
    .replace(/사업의종류.*$/i, "")
    .replace(/업태.*$/i, "")
    .replace(/업종.*$/i, "")
    .replace(/종목.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function autofillSignupFieldsFromBusinessInfo(info) {
  const companyNameInput = signupForm?.elements?.namedItem("companyName");
  const companyAddressInput = signupForm?.elements?.namedItem("companyAddress");
  const representativeInput = signupForm?.elements?.namedItem("representative");
  const openingDateInput = signupForm?.elements?.namedItem("openingDate");
  const businessTypeInput = signupForm?.elements?.namedItem("businessType");
  const businessItemInput = signupForm?.elements?.namedItem("businessItem");

  if (companyNameInput && info.companyName) {
    companyNameInput.value = info.companyName;
  }

  if (companyAddressInput && info.businessAddress) {
    companyAddressInput.value = info.businessAddress;
  }

  if (representativeInput && info.representative) {
    representativeInput.value = info.representative;
  }

  if (openingDateInput && info.openingDate) {
    openingDateInput.value = info.openingDate;
  }

  if (businessTypeInput && info.businessType) {
    businessTypeInput.value = info.businessType;
  }

  if (businessItemInput && info.businessItem) {
    businessItemInput.value = info.businessItem;
  }
}

function sanitizeExtractedField(value) {
  return String(value || "")
    .replace(/^[)\]}>」』]+/g, "")
    .replace(/^[^가-힣A-Za-z0-9(주)\[]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeOpeningDate(value) {
  const source = String(value || "").trim();
  const koreanDateMatch = source.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (koreanDateMatch) {
    return `${koreanDateMatch[1]}-${String(koreanDateMatch[2]).padStart(2, "0")}-${String(koreanDateMatch[3]).padStart(2, "0")}`;
  }

  const compactDateMatch = source.match(/\b(20\d{2}|19\d{2})(\d{2})(\d{2})\b/);
  if (compactDateMatch) {
    return `${compactDateMatch[1]}-${compactDateMatch[2]}-${compactDateMatch[3]}`;
  }

  const digits = source.replace(/\D/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  return source;
}

function cleanBusinessNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatBusinessNumber(value) {
  const digits = cleanBusinessNumber(value);
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  if (tesseractLoaderPromise) return tesseractLoaderPromise;

  tesseractLoaderPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return tesseractLoaderPromise;
}

async function verifyBusinessRegistration() {
  const businessNumber = cleanBusinessNumber(document.querySelector("#signupBizNo").value);
  if (businessNumber.length !== 10) {
    businessVerification = { status: "invalid", message: "사업자등록번호 10자리를 먼저 입력해주세요." };
    setText("#businessVerifyStatus", businessVerification.message);
    renderSignupSummary();
    return;
  }

  businessVerification = { status: "checking", message: "국세청 사업자 상태를 확인하는 중입니다..." };
  setText("#businessVerifyStatus", businessVerification.message);

  try {
    const payload = await requestJson("/api/business-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessNumber })
    }, { retries: 1, timeoutMs: 10000 });

    businessVerification = {
      status: payload.valid ? "verified" : "rejected",
      message: payload.message,
      data: payload
    };
  } catch (error) {
    businessVerification = {
      status: "error",
      message: error.message || "사업자 확인 중 오류가 발생했습니다."
    };
  }

  extractedBusinessInfo.approvalStatus = evaluateBusinessApprovalStatus();
  setText("#businessVerifyStatus", businessVerification.message);
  renderSignupSummary();
}

function evaluateBusinessApprovalStatus() {
  if (businessVerification.status !== "verified") return "판정 전";
  if (!approvalRules.businessTypes.length && !approvalRules.businessItems.length) return "기준 미설정";

  const normalizedType = normalizeRuleValue(`${extractedBusinessInfo.businessType} ${extractedBusinessInfo.businessCategorySection}`);
  const normalizedItem = normalizeRuleValue(`${extractedBusinessInfo.businessItem} ${extractedBusinessInfo.businessCategorySection}`);
  const typeMatched = approvalRules.businessTypes.length
    ? approvalRules.businessTypes.some((rule) => normalizedType.includes(rule))
    : false;
  const itemMatched = approvalRules.businessItems.length
    ? approvalRules.businessItems.some((rule) => normalizedItem.includes(rule))
    : false;

  return typeMatched || itemMatched ? "가입승인" : "가입보류";
}

function normalizeRuleValue(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function loadApprovalRules() {
  try {
    const stored = JSON.parse(localStorage.getItem("tbpApprovalRules") || "null");
    if (!stored) return cloneApprovalRules(DEFAULT_APPROVAL_RULES);
    return {
      businessTypes: Array.isArray(stored.businessTypes) && stored.businessTypes.length ? stored.businessTypes : DEFAULT_APPROVAL_RULES.businessTypes,
      businessItems: Array.isArray(stored.businessItems) && stored.businessItems.length ? stored.businessItems : DEFAULT_APPROVAL_RULES.businessItems
    };
  } catch {
    return cloneApprovalRules(DEFAULT_APPROVAL_RULES);
  }
}

function cloneApprovalRules(source) {
  return {
    businessTypes: [...source.businessTypes],
    businessItems: [...source.businessItems]
  };
}

function syncDefaultApprovalRules() {
  const savedVersion = localStorage.getItem("tbpApprovalRulesVersion");
  if (savedVersion === DEFAULT_APPROVAL_RULES_VERSION) return;

  approvalRules = cloneApprovalRules(DEFAULT_APPROVAL_RULES);
  localStorage.setItem("tbpApprovalRules", JSON.stringify(approvalRules));
  localStorage.setItem("tbpApprovalRulesVersion", DEFAULT_APPROVAL_RULES_VERSION);
}

function renderApprovalRules() {
  document.querySelector("#allowedBusinessTypes").value = approvalRules.businessTypes.join(", ");
  document.querySelector("#allowedBusinessItems").value = approvalRules.businessItems.join(", ");
}

async function saveApprovalRulesFromForm() {
  const businessTypes = parseRuleInput(document.querySelector("#allowedBusinessTypes").value);
  const businessItems = parseRuleInput(document.querySelector("#allowedBusinessItems").value);
  approvalRules = { businessTypes, businessItems };
  localStorage.setItem("tbpApprovalRules", JSON.stringify(approvalRules));
  try {
    await requestJson("/api/approval-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessTypes: businessTypes.map((item) => formatRuleLabel(item)),
        businessItems: businessItems.map((item) => formatRuleLabel(item))
      })
    }, { retries: 1, timeoutMs: 5000 });
  } catch (error) {
    console.warn(error);
  }
  extractedBusinessInfo.approvalStatus = evaluateBusinessApprovalStatus();
  setText("#approvalRuleStatus", "가입 승인 기준이 저장되었습니다. 이후 스캔 결과와 자동 비교합니다.");
  renderSignupSummary();
}

function parseRuleInput(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => normalizeRuleValue(item))
    .filter(Boolean);
}

function selectSignupProvider(provider) {
  selectedSignupProvider = provider;
  setText("#signupStatus", `${provider}으로 회원가입을 시작했습니다. 사업자등록증 승인 후 등급별 가격을 볼 수 있습니다.`);
  renderSignupSummary();
}

function startSocialSignup(provider) {
  selectedSignupProvider = `${provider} 가입`;
  window.location.href = `/api/social-auth/start?provider=${encodeURIComponent(provider)}&mode=signup`;
}

function startSocialLogin(provider) {
  window.location.href = `/api/social-auth/start?provider=${encodeURIComponent(provider)}&mode=login`;
}

function isSocialSignupSelected() {
  return Boolean(socialSignupProfile?.provider && socialSignupProfile?.email)
    || /google|kakao|카카오/i.test(selectedSignupProvider);
}

function readSocialAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
  const accessToken = hashParams.get("access_token") || params.get("access_token") || "";
  const provider = params.get("socialProvider") || "";
  const mode = params.get("socialMode") || "signup";
  const error = hashParams.get("error_description")
    || params.get("error_description")
    || hashParams.get("error")
    || params.get("error")
    || "";
  const code = params.get("code") || "";
  if (error && provider) return { error, provider, mode };
  if (!accessToken && code && provider) {
    return {
      error: "인증은 완료됐지만 앱으로 로그인 토큰이 전달되지 않았습니다. Supabase Auth URL 설정과 Provider callback URL을 다시 확인해주세요.",
      provider,
      mode
    };
  }
  if (!accessToken || !provider) return null;
  return { accessToken, provider, mode };
}

async function completeSocialAuthRedirect({ accessToken, provider, mode, error = "" }) {
  const providerLabel = provider === "kakao" ? "카카오톡" : "Google";
  if (!accessToken) {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
    const errorMessage = hashParams.get("error_description")
      || params.get("error_description")
      || hashParams.get("error")
      || params.get("error")
      || error
      || "소셜 로그인 토큰이 전달되지 않았습니다.";
    switchPage(mode === "login" ? "loginPage" : "signupPage");
    setText(mode === "login" ? "#loginStatus" : "#signupStatus", `${providerLabel} 인증 오류: ${errorMessage}`);
    history.replaceState({ pageId: currentPageId }, "", `#${currentPageId}`);
    return;
  }
  try {
    const profile = await requestJson("/api/social-auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken })
    }, { retries: 1, timeoutMs: 10000 });

    if (mode === "login") {
      try {
        const result = await requestJson("/api/social-auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken })
        }, { retries: 1, timeoutMs: 10000 });
        await applyAuthenticatedUser(result.user, `${providerLabel} 계정으로 로그인되었습니다.`);
        loginForm?.reset();
        switchPage("homePage", { pushHistory: false });
        return;
      } catch (loginError) {
        socialSignupProfile = {
          accountId: profile.accountId || "",
          provider,
          providerLabel,
          providerId: profile.providerId || "",
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl || ""
        };
        selectedSignupProvider = `${providerLabel} 가입`;
        applyPendingSocialUser(socialSignupProfile, `${providerLabel} 계정이 확인되었습니다. 사업자등록증 등록을 완료하면 상품 금액을 볼 수 있습니다.`);
        switchPage("signupPage");
        setText("#authStatus", `${providerLabel} 계정은 확인됐지만 가입된 사업자 정보가 없습니다. 사업자등록증을 등록해 가입을 완료해주세요.`);
        setText("#signupStatus", loginError.message || `${providerLabel} 가입을 계속 진행해주세요.`);
        renderSignupSummary();
        return;
      }
    }

    socialSignupProfile = {
      accountId: profile.accountId || "",
      provider,
      providerLabel,
      providerId: profile.providerId || "",
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl || ""
    };
    selectedSignupProvider = `${providerLabel} 가입`;
    const nameInput = signupForm?.elements?.namedItem("name");
    const emailInput = signupForm?.elements?.namedItem("contactEmail");
    if (nameInput && !nameInput.value && profile.name) nameInput.value = profile.name;
    if (emailInput && !emailInput.value && profile.email) emailInput.value = profile.email;
    applyPendingSocialUser(socialSignupProfile, `${providerLabel} 계정이 확인되었습니다. 사업자 인증을 이어서 진행해주세요.`);
    switchPage("signupPage");
    const emailNotice = profile.email
      ? `${providerLabel} 계정(${profile.email})이 확인되었습니다.`
      : `${providerLabel} 계정은 확인됐지만 이메일이 전달되지 않았습니다. 카카오 동의항목의 이메일 제공 설정을 확인해주세요.`;
    setText("#authStatus", `${emailNotice} 사업자등록증 승인 후 등급별 가격을 볼 수 있습니다.`);
    setText("#signupStatus", `${getSocialWelcomeName()}님 안녕하세요. 이제 사업자 인증이 필요합니다. 사업자등록증을 업로드해 가입을 완료해주세요.`);
    renderSignupSummary();
  } catch (error) {
    selectedSignupProvider = `${providerLabel} 가입`;
    switchPage(mode === "login" ? "loginPage" : "signupPage");
    setText(mode === "login" ? "#loginStatus" : "#signupStatus", error.message || `${providerLabel} 인증 정보를 확인하지 못했습니다.`);
  } finally {
    history.replaceState({ pageId: currentPageId }, "", `#${currentPageId}`);
  }
}

function applyPendingSocialUser(profile, message = "") {
  const displayName = String(profile?.name || profile?.email || "회원").trim();
  authUser = {
    phone: "",
    businessNumber: "",
    name: displayName,
    title: "",
    companyName: "사업자 인증 대기",
    companyAddress: "",
    provider: profile?.email
      ? `${profile?.providerLabel || "소셜"} 가입 <${profile.email}>`
      : `${profile?.providerLabel || "소셜"} 가입`,
    role: "member",
    approvalStatus: "사업자등록증 등록 필요",
    pricingAccess: "pending",
    memberToken: "",
    memberGrade: "인증 대기",
    priceTier: "retail",
    socialProvider: profile?.provider || "",
    socialProviderId: profile?.providerId || "",
    socialEmail: profile?.email || "",
    socialAvatarUrl: profile?.avatarUrl || ""
  };
  saveAuthSession(authUser);
  renderAuthControls();
  renderMyPage();
  if (message) setText("#loginStatus", message);
}

function getSocialWelcomeName() {
  const profileName = String(socialSignupProfile?.name || "").trim();
  const emailName = String(socialSignupProfile?.email || "").split("@")[0]?.trim();
  return profileName || emailName || "회원";
}

function focusBusinessCertificateUpload() {
  const fileInput = document.querySelector("#signupBizFile");
  if (!fileInput) return;
  fileInput.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => fileInput.click(), 240);
}

function renderSocialBusinessGate() {
  const gate = document.querySelector("#socialBusinessGate");
  if (!gate) return;
  const isSocial = Boolean(socialSignupProfile?.provider);
  gate.classList.toggle("hidden", !isSocial);
  if (!isSocial) return;
  setText("#socialWelcomeName", getSocialWelcomeName());
  setText("#socialBusinessAccount", socialSignupProfile.email
    ? `${socialSignupProfile.providerLabel || "소셜"} 계정: ${socialSignupProfile.email}`
    : `${socialSignupProfile.providerLabel || "소셜"} 계정 연결 완료`);
}

function renderSignupSummary() {
  const file = document.querySelector("#signupBizFile")?.files?.[0];
  const businessCardFile = document.querySelector("#signupBusinessCardFile")?.files?.[0];
  const data = signupForm ? new FormData(signupForm) : new FormData();
  const name = data.get("name") || "미입력";
  const company = data.get("companyName") || "미입력";
  const socialAccount = socialSignupProfile?.provider
    ? `${socialSignupProfile.providerLabel || socialSignupProfile.provider} · ${socialSignupProfile.email || "이메일 미제공"}`
    : "없음";
  const summary = [
    ["전화번호 인증", isPhoneVerified ? "완료" : "미완료"],
    ["사업자등록증", file ? file.name : "첨부 필수"],
    ["명함", businessCardFile ? businessCardFile.name : "직접 입력 가능"],
    ["사업자 확인", businessVerification.status === "verified" ? "확인 완료" : businessVerification.status === "rejected" ? "확인 실패" : "미확인"],
    ["가입 방식", selectedSignupProvider],
    ["연결 계정", socialAccount],
    ["상태", name !== "미입력" && company !== "미입력" ? "입력 진행 중" : "입력 대기"]
  ];

  document.querySelector("#signupSummary").innerHTML = summary.map(([label, value]) => `
    <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join("");
  renderSocialBusinessGate();

  const extractedSummary = [
    ["상호", extractedBusinessInfo.companyName || "미추출"],
    ["사업장주소", extractedBusinessInfo.businessAddress || "미추출"],
    ["대표자명", extractedBusinessInfo.representative || "미추출"],
    ["개업일자", extractedBusinessInfo.openingDate || "미추출"],
    ["업태", extractedBusinessInfo.businessType || "미추출"],
    ["종목", extractedBusinessInfo.businessItem || "미추출"],
    ["가입판정", extractedBusinessInfo.approvalStatus]
  ];
  if (extractedBusinessInfo.businessCategorySection) {
    extractedSummary.splice(5, 0, ["추출 업태/종목", extractedBusinessInfo.businessCategorySection]);
  }
  document.querySelector("#businessExtractSummary").innerHTML = extractedSummary.map(([label, value]) => `
    <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join("");
}

async function submitSignupForm(event) {
  event.preventDefault();
  const socialSignup = isSocialSignupSelected();
  if (!isPhoneVerified && !socialSignup) {
    setText("#signupStatus", "전화번호 인증을 완료한 뒤 회원가입을 진행해주세요.");
    return;
  }

  const formData = new FormData(signupForm);
  let password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("passwordConfirm") || "");
  if (!socialSignup && (!password || password.length < 6)) {
    setText("#signupStatus", "비밀번호는 6자 이상으로 입력해주세요.");
    return;
  }
  if (!socialSignup && password !== passwordConfirm) {
    setText("#signupStatus", "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
    return;
  }
  if (socialSignup && password && passwordConfirm && password !== passwordConfirm) {
    setText("#signupStatus", "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
    return;
  }
  if (socialSignup && !password) {
    password = `SOCIAL:${socialSignupProfile?.provider || "social"}:${socialSignupProfile?.providerId || socialSignupProfile?.email || "pending"}:${Date.now()}`;
  }
  if (businessVerification.status !== "verified") {
    setText("#signupStatus", "사업자 확인 버튼으로 올바른 사업자인지 먼저 확인해주세요.");
    return;
  }
  if (extractedBusinessInfo.approvalStatus === "기준 미설정") {
    setText("#signupStatus", "허용 업태/업종 승인 기준을 먼저 저장해주세요.");
    return;
  }

  const businessFile = document.querySelector("#signupBizFile").files?.[0];
  const businessCardFile = document.querySelector("#signupBusinessCardFile")?.files?.[0];
  if (!businessFile) {
    setText("#signupStatus", "사업자 회원은 사업자등록증 첨부가 필수입니다.");
    return;
  }
  const manualContactName = String(formData.get("name") || "").trim();
  const manualContactTitle = String(formData.get("title") || "").trim();
  const manualCompanyName = String(formData.get("companyName") || "").trim();
  const manualContactPhone = String(formData.get("contactPhone") || "").trim();
  const manualContactEmail = String(formData.get("contactEmail") || "").trim();
  const manualContactAddress = String(formData.get("contactAddress") || "").trim();
  const businessCardContactInfo = {
    name: manualContactName || socialSignupProfile?.name || "",
    title: manualContactTitle || "",
    companyName: manualCompanyName || extractedBusinessInfo.companyName || "",
    phone: manualContactPhone || String(formData.get("phone") || "").trim(),
    email: manualContactEmail || socialSignupProfile?.email || "",
    address: manualContactAddress || String(formData.get("companyAddress") || "").trim() || extractedBusinessInfo.businessAddress || "",
    businessCardFileName: businessCardFile?.name || "",
    businessCardFileMime: businessCardFile?.type || "",
    updatedAt: new Date().toISOString()
  };
  if (!businessCardFile && (!businessCardContactInfo.name || !businessCardContactInfo.title || !businessCardContactInfo.companyName)) {
    toggleManualBusinessInput(true);
    setText("#signupStatus", "명함 사진이 없으면 이름, 직함, 업체명을 직접 입력해주세요.");
    return;
  }
  const businessFileDataUrl = businessFile ? await readFileAsDataUrl(businessFile) : "";
  const businessCardFileDataUrl = businessCardFile ? await readFileAsDataUrl(businessCardFile) : "";
  const approvalStatus = extractedBusinessInfo.approvalStatus === "가입승인" ? "승인" : "보류";
  const manualBusinessType = String(formData.get("businessType") || "").trim();
  const manualBusinessItem = String(formData.get("businessItem") || "").trim();
  const signupPayload = {
    phone: formData.get("phone"),
    businessNumber: formData.get("businessNumber"),
    name: manualContactName || socialSignupProfile?.name || "명함 확인 필요",
    title: manualContactTitle || "명함 확인 필요",
    companyName: manualCompanyName || extractedBusinessInfo.companyName || "명함 확인 필요",
    companyAddress: businessCardContactInfo.address || formData.get("companyAddress") || extractedBusinessInfo.businessAddress,
    contactName: businessCardContactInfo.name,
    contactTitle: businessCardContactInfo.title,
    contactCompanyName: businessCardContactInfo.companyName,
    contactPhone: businessCardContactInfo.phone,
    contactEmail: businessCardContactInfo.email,
    contactAddress: businessCardContactInfo.address,
    contactInfo: businessCardContactInfo,
    password,
    provider: selectedSignupProvider,
    accountId: socialSignupProfile?.accountId || "",
    socialProvider: socialSignupProfile?.provider || "",
    socialEmail: socialSignupProfile?.email || "",
    socialProviderId: socialSignupProfile?.providerId || "",
    socialName: socialSignupProfile?.name || "",
    socialAvatarUrl: socialSignupProfile?.avatarUrl || "",
    extractedCompanyName: extractedBusinessInfo.companyName,
    extractedBusinessAddress: extractedBusinessInfo.businessAddress,
    representative: formData.get("representative") || extractedBusinessInfo.representative,
    openingDate: formData.get("openingDate") || extractedBusinessInfo.openingDate,
    businessType: manualBusinessType || extractedBusinessInfo.businessType,
    businessItem: manualBusinessItem || extractedBusinessInfo.businessItem,
    businessCategorySection: extractedBusinessInfo.businessCategorySection || [manualBusinessType, manualBusinessItem].filter(Boolean).join(" / "),
    approvalStatus,
    memberGrade: "사업자",
    priceTier: approvalStatus === "승인" ? "wholesale" : "retail",
    businessFileName: businessFile?.name || "",
    businessFileMime: businessFile?.type || "",
    businessFileDataUrl,
    businessCardFileName: businessCardFile?.name || "",
    businessCardFileMime: businessCardFile?.type || "",
    businessCardFileDataUrl,
    submittedAt: new Date().toISOString()
  };

  let savedSignupResult = null;
  try {
    savedSignupResult = await requestJson("/api/signup-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupPayload)
    }, { retries: 1, timeoutMs: 8000 });
  } catch (error) {
    console.warn(error);
    saveSignupRequest(signupPayload);
  }
  setText("#signupStatus", approvalStatus === "승인"
    ? `${signupPayload.companyName} 회원가입이 승인 상태로 저장되었습니다.`
    : `${signupPayload.companyName} 회원가입은 업태/업종 기준에 맞지 않아 가입보류로 저장되었습니다.`);
  setText("#loginStatus", approvalStatus === "승인"
    ? `${signupPayload.companyName} 회원가입이 저장되었습니다. 등급별 가격을 볼 수 있습니다.`
    : `${signupPayload.companyName} 계정은 가입되었고 사업자 승인 대기 상태입니다. 승인 후 상품 금액이 공개됩니다.`);
  const signupUser = savedSignupResult?.user || {
    phone: signupPayload.phone,
    businessNumber: signupPayload.businessNumber,
    name: signupPayload.name,
    title: signupPayload.title,
    companyName: signupPayload.companyName,
    companyAddress: signupPayload.companyAddress,
    provider: signupPayload.provider,
    approvalStatus,
    pricingAccess: approvalStatus === "승인" ? "approved" : "pending",
    memberGrade: signupPayload.memberGrade,
    priceTier: signupPayload.priceTier,
    memberToken: ""
  };
  const authenticatedSignupUser = {
    ...signupUser,
    contactName: signupPayload.contactName,
    contactTitle: signupPayload.contactTitle,
    contactCompanyName: signupPayload.contactCompanyName,
    contactPhone: signupPayload.contactPhone,
    contactEmail: signupPayload.contactEmail,
    contactAddress: signupPayload.contactAddress,
    businessCardFileName: signupPayload.businessCardFileName,
    contactInfo: {
      ...businessCardContactInfo,
      businessCardFileName: signupPayload.businessCardFileName,
      businessCardFileMime: signupPayload.businessCardFileMime
    }
  };
  await applyAuthenticatedUser(authenticatedSignupUser, approvalStatus === "승인"
    ? `${signupPayload.companyName} 계정으로 로그인되었습니다.`
    : `${signupPayload.companyName} 계정으로 로그인되었습니다. 사업자 승인 후 상품 금액이 공개됩니다.`);
  signupForm.reset();
  isPhoneVerified = false;
  pendingSignupAuthCode = "";
  socialSignupProfile = null;
  selectedSignupProvider = "일반 회원가입";
  businessVerification = { status: "idle", message: "사업자등록번호를 입력하거나 등록증을 첨부하면 확인할 수 있습니다." };
  extractedBusinessInfo = {
    companyName: "",
    businessAddress: "",
    representative: "",
    openingDate: "",
    businessType: "",
    businessItem: "",
    businessCategorySection: "",
    approvalStatus: "판정 전"
  };
  setText("#authStatus", "간편인증 시스템 연동 전 단계입니다. 현재는 화면에서 인증 흐름을 먼저 설정합니다.");
  setText("#businessVerifyStatus", businessVerification.message);
  setText("#businessScanStatus", "사업자 회원은 사업자등록증 첨부가 필수입니다.");
  setText("#businessFileName", "첨부 전");
  setText("#businessCardFileStatus", "명함 사진이 있으면 등급 심사가 더 빠릅니다. 없으면 직접 입력만으로 신청할 수 있습니다.");
  toggleManualBusinessInput(false);
  renderSignupSummary();
  switchPage("myPage");
}

function saveSignupRequest(payload) {
  try {
    const current = JSON.parse(localStorage.getItem("tbpSignupRequests") || "[]");
    const safePayload = { ...payload };
    delete safePayload.password;
    delete safePayload.passwordConfirm;
    current.push(safePayload);
    localStorage.setItem("tbpSignupRequests", JSON.stringify(current));
  } catch (error) {
    console.warn(error);
  }
}

async function submitLoginForm(event) {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const businessNumber = String(formData.get("businessNumber") || "").trim();
  const password = String(formData.get("password") || "");
  let matchedUser = null;

  try {
    const result = await requestJson("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessNumber, password })
    }, { retries: 1, timeoutMs: 8000 });
    matchedUser = result.user;
  } catch (error) {
    const requests = loadSignupRequests();
    const localMatchedUser = requests.find((item) => item.businessNumber === businessNumber && item.password === password);
    if (!localMatchedUser) {
      setText("#loginStatus", error.message || "사업자등록번호 또는 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (localMatchedUser.approvalStatus !== "승인") {
      setText("#loginStatus", `${localMatchedUser.companyName} 계정은 현재 가입보류 상태입니다. 업태/업종 승인 후 로그인할 수 있습니다.`);
      return;
    }
    matchedUser = {
      phone: localMatchedUser.phone,
      businessNumber: localMatchedUser.businessNumber,
      name: localMatchedUser.name,
      title: localMatchedUser.title,
      companyName: localMatchedUser.companyName,
      companyAddress: localMatchedUser.companyAddress,
      provider: localMatchedUser.provider || "일반 회원가입",
      approvalStatus: localMatchedUser.approvalStatus,
      pricingAccess: "approved",
      memberGrade: localMatchedUser.memberGrade || "사업자",
      priceTier: localMatchedUser.priceTier || "wholesale",
      memberToken: localMatchedUser.memberToken || ""
    };
  }

  await applyAuthenticatedUser(matchedUser, `${matchedUser.companyName} 계정으로 로그인되었습니다.`);
  loginForm.reset();
  switchPage("homePage");
}

async function applyAuthenticatedUser(matchedUser, message = "") {
  authUser = {
    phone: matchedUser.phone,
    businessNumber: matchedUser.businessNumber,
    name: matchedUser.name,
    title: matchedUser.title,
    companyName: matchedUser.companyName,
    companyAddress: matchedUser.companyAddress,
    provider: matchedUser.provider || "일반 회원가입",
    role: matchedUser.role || "member",
    approvalStatus: matchedUser.approvalStatus || "승인",
    pricingAccess: matchedUser.pricingAccess || "approved",
    memberToken: matchedUser.memberToken || "",
    memberGrade: matchedUser.memberGrade || matchedUser.grade || "",
    priceTier: matchedUser.priceTier || matchedUser.pricingTier || matchedUser.memberPriceTier || ""
  };
  saveAuthSession(authUser);
  await hydrateMemberPricingProducts({ render: false });
  if (authUser.role !== "admin") {
    await hydrateCartFromServer({ mergeLocal: true });
    await hydrateOrdersFromServer();
  }
  renderAuthControls();
  renderMyPage();
  if (message) setText("#loginStatus", message);
}

async function submitAdminLoginForm(event) {
  event.preventDefault();
  const formData = new FormData(adminLoginForm);
  const adminUsername = String(formData.get("adminUsername") || "").trim();
  const adminPassword = String(formData.get("adminPassword") || "");

  try {
    const result = await requestJson("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminUsername, adminPassword })
    }, { retries: 1, timeoutMs: 8000 });

    authUser = {
      role: "admin",
      adminUsername: result.user.adminUsername,
      adminToken: result.user.adminToken,
      name: result.user.name,
      companyName: result.user.companyName,
      provider: "관리자 로그인"
    };
    saveAuthSession(authUser);
    adminProductsHydrated = false;
    renderAuthControls();
    setText("#adminLoginStatus", `${result.user.name} 계정으로 관리자 로그인이 완료되었습니다.`);
    adminLoginForm.reset();
    switchPage("adminPage");
  } catch (error) {
    setText("#adminLoginStatus", error.message || "관리자 아이디 또는 비밀번호가 일치하지 않습니다.");
  }
}

function loadSignupRequests() {
  try {
    return JSON.parse(localStorage.getItem("tbpSignupRequests") || "[]");
  } catch {
    return [];
  }
}

function loadAuthSession() {
  try {
    return JSON.parse(localStorage.getItem("tbpAuthSession") || "null");
  } catch {
    return null;
  }
}

function saveAuthSession(user) {
  localStorage.setItem("tbpAuthSession", JSON.stringify(user));
}

async function logoutUser() {
  authUser = null;
  adminOverview = null;
  adminProductsHydrated = false;
  localStorage.removeItem("tbpAuthSession");
  if (cartSyncTimer) window.clearTimeout(cartSyncTimer);
  await loadProducts();
  renderAuthControls();
  if (currentPageId === "productsPage") renderProducts();
  renderCart();
  switchPage("homePage");
}

function renderAuthControls() {
  const authActions = document.querySelector("#authActions");
  const authSession = document.querySelector("#authSession");
  const authBadge = document.querySelector("#authBadge");
  const adminNavBtn = document.querySelector("#adminNavBtn");
  const tile114NavBtn = document.querySelector("#tile114NavBtn");

  const isLoggedIn = Boolean(authUser);
  const isAdmin = isAdminUser();
  document.body.classList.toggle("admin-authenticated", isAdmin);
  authActions.classList.toggle("hidden", isLoggedIn);
  authSession.classList.toggle("hidden", !isLoggedIn);
  document.querySelectorAll(".admin-nav-button").forEach((button) => {
    button.classList.toggle("hidden", !isAdmin);
  });
  adminNavBtn?.classList.toggle("hidden", !isAdmin);
  tile114NavBtn?.classList.toggle("hidden", !isAdmin);
  syncTileFinderBrandFilter();
  syncProductBrandFilter(products);
  if (currentPageId === "productsPage") {
    syncProductFilters();
    renderProducts();
  }
  if (currentPageId === "taxonomyTestPage") {
    syncTaxonomyFilters();
    renderTaxonomyTestPage();
  }

  if (isLoggedIn) {
    const company = authUser.companyName || "사업자 인증 대기";
    const name = authUser.name || "회원";
    authBadge.textContent = isAdmin
      ? `${authUser.name} · 관리자`
      : `${company} · ${name}`;
  }
  renderMemberHomeBoard();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function readImageFile(file, maxWidth, quality = 0.84) {
  if (!file) return Promise.resolve("");
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(String(reader.result || ""));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file) {
  if (!file) return Promise.resolve("");
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function loadImageFromUrl(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function addProductFromForm(event) {
  event.preventDefault();
  const formData = new FormData(productForm);
  const product = {
    id: createProductId(formData),
    productType: formData.get("productType"),
    kind: formData.get("kind"),
    name: formData.get("name").trim(),
    size: formData.get("size") || "",
    finish: formData.get("finish") || "",
    maker: formData.get("maker").trim(),
    unit: formData.get("unit").trim(),
    option: formData.get("option").trim(),
    costPrice: Number(formData.get("costPrice")),
    retailPrice: Number(formData.get("retailPrice")),
    wholesalePrice: Number(formData.get("wholesalePrice")),
    stockQty: Number(formData.get("stockQty")),
    image: formData.get("image").trim(),
    originalImage: formData.get("originalImage").trim(),
    closeImage: formData.get("closeImage").trim(),
    detailImage: formData.get("detailImage").trim(),
    daylightImage: formData.get("daylightImage").trim(),
    fluorescentImage: formData.get("fluorescentImage").trim(),
    sceneImage: formData.get("sceneImage").trim()
  };
  product.managementCode = createManagementCode(product, products);

  try {
    const endpoint = authUser?.role === "admin" && authUser.adminUsername && authUser.adminToken ? "/api/admin/product" : "/api/products";
    const body = endpoint === "/api/admin/product"
      ? { adminUsername: authUser.adminUsername, adminToken: authUser.adminToken, product }
      : product;
    const result = await requestJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }, { retries: 1, timeoutMs: 8000 });
    products = Array.isArray(result) ? result : mergeProducts(products, [mapPublicProductForClient(result.product || product)]);
    serverConnection = { online: true, checked: true, failures: 0 };
  } catch {
    saveLocalProduct(product);
    products = mergeProducts(products, [product]);
  }

  productForm.reset();
  setupDbForm();
  syncProductFilters();
  renderProducts();
  setText("#dbStatus", "등록 완료");
}

function createProductId(formData) {
  const source = `${formData.get("productType")}-${formData.get("kind")}-${formData.get("name")}-${Date.now()}`;
  return source.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
}

function isAdminUser() {
  return authUser?.role === "admin";
}

function createManagementCode(product, existingProducts = products) {
  const base = buildManagementCodeBase(product);
  const sequence = existingProducts
    .map((item) => String(item.managementCode || ""))
    .filter((code) => code.startsWith(`${base}-`))
    .map((code) => Number(code.slice(base.length + 1)))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0) + 1;
  return `${base}-${String(sequence).padStart(3, "0")}`;
}

function buildManagementCodeBase(product) {
  const kind = String(product.kind || "").trim();
  const source = [
    product.name,
    product.kind,
    product.size,
    product.finish,
    product.option,
    product.maker,
    product.catalogType,
    product.catalogCode
  ].filter(Boolean).join(" ").toLowerCase();

  if (product.productType === "tile") {
    return ["TIL", tileMaterialCode(source, kind), tileFinishCode(source, product.finish), tileSizeCode(product.size, source), tileColorCode(source)].join("-");
  }
  if (product.productType === "material" || kind === "부자재") {
    return ["MAT", materialItemCode(source), brandCode(product.maker, source), materialPackCode(product.size, source)].filter(Boolean).join("-");
  }
  if (kind === "양변기") return ["TOI", toiletTypeCode(source), brandCode(product.maker, source)].join("-");
  if (kind === "세면대") return ["BAS", basinTypeCode(source), brandCode(product.maker, source)].join("-");
  if (kind === "비데") return [source.includes("일체형") ? "IBD" : "SBD", brandCode(product.maker, source)].join("-");
  if (kind === "악세사리") return ["BAC", accessoryItemCode(source), finishOrColorCode(source)].join("-");
  if (kind === "욕실장") return ["CAB", cabinetSizeCode(product.size, source), finishOrColorCode(source)].join("-");
  if (kind === "수전 금구") return faucetCode(product, source);
  return ["MAT", materialItemCode(source), brandCode(product.maker, source)].join("-");
}

function tileMaterialCode(source, kind) {
  if (/모자이크|mosaic/.test(source)) return "MOS";
  if (/외장|exterior/.test(source)) return "EXT";
  if (/수영장|pool/.test(source)) return "POO";
  if (/폴리싱|polished|polishing/.test(source)) return "POL";
  if (/포세린|pos/.test(source)) return "POS";
  if (/자기질|porcelain|por/.test(source)) return "POR";
  if (/도기질|ceramic|cer/.test(source) || kind.includes("벽")) return "CER";
  return "POR";
}

function tileFinishCode(source, finish) {
  const value = `${finish || ""} ${source}`;
  if (/논슬립|non.?slip|nsp/.test(value)) return "NSP";
  if (/반무광|satin|sat/.test(value)) return "SAT";
  if (/러프|rough|ruf/.test(value)) return "RUF";
  if (/혼드|honed|hon/.test(value)) return "HON";
  if (/래핑|lappato|lap/.test(value)) return "LAP";
  if (/폴리싱광|polished|polishing/.test(value)) return "POL";
  if (/유광|gloss|glossy|gls/.test(value)) return "GLS";
  return "MAT";
}

function tileSizeCode(size, source) {
  const text = `${size || ""} ${source}`.replace(/[×x]/gi, "*");
  const pair = text.match(/(1200|800|600|400|300|250|200|150|100)\s*\*\s*(3600|2400|1200|800|600|400|300|250|200|150|100)/);
  if (pair) return `${pair[1]}${pair[2]}`;
  if (/대형|빅슬랩|slab/.test(text)) return "12003600";
  return "600600";
}

function tileColorCode(source) {
  if (/다크\s*그레이|dark\s*gray|dark\s*grey|charcoal|차콜/.test(source)) return "DGY";
  if (/화이트|white|snow|ivory white/.test(source)) return "WHT";
  if (/아이보리|ivory/.test(source)) return "IVR";
  if (/베이지|beige|cream|크림/.test(source)) return "BEG";
  if (/그레이|gray|grey|silver|실버|ash|애쉬/.test(source)) return "GRY";
  if (/블랙|black/.test(source)) return "BLK";
  if (/브라운|brown|coffee|월넛|walnut/.test(source)) return "BRN";
  if (/우드|wood|oak|오크/.test(source)) return "WOD";
  if (/마블|marble|carrara|카라라/.test(source)) return "MAR";
  if (/테라조|terrazzo/.test(source)) return "TRZ";
  if (/콘크리트|concrete/.test(source)) return "CON";
  if (/시멘트|cement/.test(source)) return "CEM";
  if (/스톤|stone|rock|석재/.test(source)) return "STN";
  return "PTN";
}

function faucetCode(product, source) {
  const brand = brandCode(product.maker, source);
  const model = faucetModelCode(source);
  if (/해바라기|레인|rain/.test(source)) return ["RSH", brand, model].join("-");
  if (/주방|싱크|sink|kitchen/.test(source)) return ["KFA", brand, model].join("-");
  if (/샤워|욕조|bath|shower/.test(source)) return ["SFA", brand, model].join("-");
  return ["BFA", brand, model].join("-");
}

function faucetModelCode(source) {
  if (/블랙|black/.test(source)) return "BLK";
  if (/인출|pull|pul/.test(source)) return "PUL";
  if (/매립|wall|벽/.test(source)) return "WAL";
  if (/센서|sensor/.test(source)) return "SNS";
  return "STD";
}

function toiletTypeCode(source) {
  if (/투피스|two/.test(source)) return "TWO";
  if (/벽걸이|wall|wal/.test(source)) return "WAL";
  return "ONE";
}

function basinTypeCode(source) {
  if (/반다리|half|hlf/.test(source)) return "HLF";
  if (/긴다리|pedestal|ped/.test(source)) return "PED";
  if (/벽걸이|wall|wal/.test(source)) return "WAL";
  return "CNT";
}

function accessoryItemCode(source) {
  if (/휴지|paper|toilet roll/.test(source)) return "THD";
  if (/수건|타월|towel/.test(source)) return "TOW";
  if (/컵/.test(source)) return "CUP";
  if (/비누|soap/.test(source)) return "SOP";
  if (/코너/.test(source)) return "CSF";
  if (/선반|shelf/.test(source)) return "SHF";
  return "ACC";
}

function materialItemCode(source) {
  if (/본드|접착|adhesive/.test(source)) return "ADH";
  if (/압착|pcm/.test(source)) return "PCM";
  if (/홈멘트|cmt/.test(source)) return "CMT";
  if (/줄눈|grout|epoxy/.test(source)) return "GRT";
  if (/메지|joint/.test(source)) return "JOI";
  if (/실리콘|silicone/.test(source)) return "SIL";
  if (/방수|waterproof/.test(source)) return "WPR";
  return "ETC";
}

function cabinetSizeCode(size, source) {
  const text = `${size || ""} ${source}`;
  if (/1200/.test(text)) return "1200";
  if (/800/.test(text)) return "800";
  return "600";
}

function materialPackCode(size, source) {
  const text = `${size || ""} ${source}`.toUpperCase();
  const kg = text.match(/([0-9]{1,3})\s*KG/);
  if (kg) return `${kg[1]}KG`;
  return finishOrColorCode(source);
}

function finishOrColorCode(source) {
  if (/스테인리스|스텐|stainless|steel|stl/.test(source)) return "STL";
  return tileColorCode(source);
}

function brandCode(maker, source) {
  const text = `${maker || ""} ${source || ""}`.toLowerCase();
  if (/대림도비도스|도비도스|dobidos/.test(text)) return "DBD";
  if (/대림/.test(text)) return "DL";
  if (/로얄|royal/.test(text)) return "RC";
  if (/엘림/.test(text)) return "ELM";
  if (/american|아메리칸/.test(text)) return "AST";
  if (/계림/.test(text)) return "KLM";
  if (/쌍곰/.test(text)) return "SGB";
  if (/노루/.test(text)) return "NRP";
  if (/kcc/.test(text)) return "KCC";
  if (/삼화/.test(text)) return "SHP";
  if (/오공/.test(text)) return "OGC";
  if (/헨켈/.test(text)) return "HNK";
  if (/마페이/.test(text)) return "MPY";
  if (/테라코/.test(text)) return "TRC";
  if (/다우/.test(text)) return "DOW";
  return "TBP";
}

function addToCart(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  const existing = cart.find((item) => item.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ ...product, qty: 1, quotePrice: getMemberBaseUnitPrice(product) });

  saveCart();
  renderCart();
  renderDocuments();
  renderPlannerWorkspace();
}

function updateCartLine(id, changes, options = {}) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;

  if (changes.qty !== undefined) item.qty = Math.max(Number(changes.qty) || 0, 0);
  if (changes.quotePrice !== undefined) item.quotePrice = Math.max(Number(changes.quotePrice) || 0, 0);
  if (options.removeEmpty !== false) cart = cart.filter((entry) => entry.qty > 0);
  saveCart();
  if (options.rerenderList === false) renderCartSummary();
  else renderCart();
  renderDocuments();
  renderPlannerWorkspace();
}

function updateCartTileMeasureDisplay(id) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  const measure = getCartTileMeasureState(item);
  const qtyInput = document.querySelector(`[data-cart-qty="${CSS.escape(id)}"]`);
  const boxResult = document.querySelector(`[data-cart-box-result="${CSS.escape(id)}"]`);
  const measureResult = document.querySelector(`[data-cart-measure-result="${CSS.escape(id)}"]`);
  if (qtyInput) qtyInput.value = measure.boxQty;
  if (boxResult) boxResult.textContent = `${number(measure.boxQty)}BOX`;
  if (measureResult) {
    measureResult.textContent = `${measure.estimatedSqm ? `${formatMeasureNumber(measure.estimatedSqm)}㎡` : "-㎡"}${measure.estimatedPieces ? ` · 약 ${number(measure.estimatedPieces)}장` : ""}`;
  }
}

function updateCartLineFromTileMeasure(id, measureType, value, options = {}) {
  const item = cart.find((entry) => entry.id === id);
  if (!item || item.productType !== "tile") return;

  const measureValue = Math.max(Number(value) || 0, 0);
  const { pcsPerBox, sqmPerBox } = getTileBoxMetrics(item);
  const divisor = measureType === "pieces" ? pcsPerBox : sqmPerBox;
  if (!divisor) return;

  const boxQty = measureValue > 0 ? Math.ceil(measureValue / divisor) : 0;
  updateCartLine(id, { qty: boxQty }, options);
  if (options.rerenderList === false) updateCartTileMeasureDisplay(id);
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  renderCart();
  renderDocuments();
  renderPlannerWorkspace();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
  renderDocuments();
  renderPlannerWorkspace();
}

function renderPlannerWorkspace() {
  const form = document.querySelector("#plannerForm");
  const floorSelect = document.querySelector("#plannerFloorTile");
  const wallSelect = document.querySelector("#plannerWallTile");
  const summary = document.querySelector("#plannerSummary");
  const cartProducts = document.querySelector("#plannerCartProducts");
  const meta = document.querySelector("#plannerSceneMeta");
  const realRenderButton = document.querySelector("#plannerRealRenderBtn");
  const realRenderPreview = document.querySelector("#plannerRealRenderPreview");
  const realRenderDownload = document.querySelector("#plannerRealRenderDownload");
  if (!form || !floorSelect || !wallSelect || !summary || !cartProducts) return;
  document.body.classList.toggle("planner-plan-disabled", !isPlannerPlanAvailable());

  const tiles = getPlannerCartTiles();
  syncPlannerTileSelect(floorSelect, tiles, "바닥 타일 선택");
  syncPlannerTileSelect(wallSelect, tiles, "벽 타일 선택");
  autoSelectPlannerCartTiles({ onlyEmpty: true });

  const config = readPlannerConfig();
  const footprint = getPlannerFootprint(config);
  const floorArea = footprint.area;
  const wallArea = footprint.perimeter * config.height;
  renderPlannerSurfaceGuide();
  renderPlannerPlanEditor();
  summary.innerHTML = [
    `<div><span>바닥 면적</span><strong>${number(floorArea)}㎡</strong></div>`,
    `<div><span>벽 면적</span><strong>${number(wallArea)}㎡</strong></div>`,
    `<div><span>줄눈</span><strong>${number(config.grout)}mm</strong></div>`,
    `<div><span>시공 방향</span><strong>바닥 ${config.floorOrientation === "vertical" ? "세로" : "가로"} · 벽 ${config.wallOrientation === "vertical" ? "세로" : "가로"}</strong></div>`
  ].join("");

  cartProducts.innerHTML = '<div class="planner-empty-note">현장 이미지를 올리면 벽과 바닥 전체 영역이 자동 선택되고, 선택 타일이 사진 기준으로 적용됩니다. 그래픽 3D 모델 렌더는 사용하지 않습니다.</div>';

  if (realRenderButton) {
    realRenderButton.disabled = plannerRealRenderRunning;
    realRenderButton.textContent = plannerRealRenderRunning ? "자체 실사 엔진 렌더링 중..." : "자체 실사 엔진 렌더 만들기";
  }
  updatePlannerRealRenderPreviewDisplay();
  if (realRenderDownload) {
    const downloadableImage = pendingPlannerRealRenderImage || pendingPlannerPhotoPreviewImage;
    if (downloadableImage) {
      realRenderDownload.href = downloadableImage;
      realRenderDownload.classList.remove("hidden");
    } else {
      realRenderDownload.classList.add("hidden");
      realRenderDownload.removeAttribute("href");
    }
  }

  if (meta) {
    const floorTile = getPlannerSelectedTile("floor");
    const wallTile = getPlannerSelectedTile("wall");
    meta.textContent = `${floorTile?.name || "바닥 타일 없음"} / ${wallTile?.name || "벽 타일 없음"}`;
  }

  renderPlannerGraphicPreviewDisabled();
  schedulePlannerPhotoPreviewRender();
  schedulePlannerPanoramaRender();
}

function isPlannerGraphic3DEnabled() {
  return false;
}

function renderPlannerGraphicPreviewDisabled() {
  if (plannerThreeState.renderer || plannerThreeState.animationId) disposePlannerScene();
  const mount = document.querySelector("#plannerCanvasMount");
  if (!mount) return;
  mount.innerHTML = '<div class="planner-canvas-empty">그래픽 3D 미리보기는 사용하지 않습니다. 현장 사진 기반 실사 렌더를 기준으로 확인해주세요.</div>';
}

function syncPlannerTileSelect(select, tiles, placeholder) {
  const previousValue = select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${tiles.map((tile) => (
    `<option value="${escapeHtml(tile.id)}">${escapeHtml(tile.name)}${tile.size ? ` · ${escapeHtml(tile.size)}` : ""}</option>`
  )).join("")}`;
  select.value = tiles.some((tile) => tile.id === previousValue) ? previousValue : "";
}

function getPlannerCartTiles() {
  return cart.filter((entry) => entry.productType === "tile");
}

function findPlannerDefaultTileForSurface(tiles, surface, otherTile = null) {
  if (!tiles.length) return null;
  const surfacePattern = surface === "wall" ? /벽|wall/i : /바닥|floor/i;
  const matched = tiles.find((tile) => surfacePattern.test(`${tile.kind || ""} ${tile.name || ""} ${tile.option || ""}`));
  if (matched) return matched;
  if (surface === "wall" && otherTile) return tiles.find((tile) => tile.id !== otherTile.id) || otherTile;
  return tiles[0];
}

function autoSelectPlannerCartTiles(options = {}) {
  const tiles = getPlannerCartTiles();
  const floorSelect = document.querySelector("#plannerFloorTile");
  const wallSelect = document.querySelector("#plannerWallTile");
  if (!floorSelect || !wallSelect || !tiles.length) return false;
  const onlyEmpty = options.onlyEmpty !== false;
  const floorTile = findPlannerDefaultTileForSurface(tiles, "floor");
  const wallTile = findPlannerDefaultTileForSurface(tiles, "wall", floorTile);
  if (floorTile && (!onlyEmpty || !floorSelect.value)) floorSelect.value = floorTile.id;
  if (wallTile && (!onlyEmpty || !wallSelect.value)) wallSelect.value = wallTile.id;
  return Boolean((floorTile && floorSelect.value) || (wallTile && wallSelect.value));
}

function getPlannerSanitaryItems() {
  return cart.filter((entry) => {
    if (entry.productType === "tile" || entry.productType === "material") return false;
    return /양변기|세면|수전|욕실장|비데|샤워|악세사리|거울|선반|휴지|수건|컵대|비누/.test(`${entry.kind || ""} ${entry.name || ""} ${entry.option || ""}`);
  });
}

function readPlannerConfig() {
  const config = {
    width: clampNumber(document.querySelector("#plannerWidth")?.value, 2.4, 1, 12),
    depth: clampNumber(document.querySelector("#plannerDepth")?.value, 1.8, 1, 12),
    height: clampNumber(document.querySelector("#plannerHeight")?.value, 2.3, 1.8, 4),
    grout: clampNumber(document.querySelector("#plannerGrout")?.value, 3, 1, 12),
    floorOrientation: readPlannerTileOrientation("floor"),
    wallOrientation: readPlannerTileOrientation("wall")
  };
  config.footprint = getPlannerFootprint(config);
  return config;
}

function readPlannerTileOrientation(surface) {
  const selector = surface === "wall" ? "#plannerWallOrientation" : "#plannerFloorOrientation";
  return document.querySelector(selector)?.value === "vertical" ? "vertical" : "horizontal";
}

function clampNumber(value, fallback, min, max) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(Math.max(numberValue, min), max);
}

function getPlannerSelectedTile(surface) {
  const id = document.querySelector(surface === "floor" ? "#plannerFloorTile" : "#plannerWallTile")?.value || "";
  return cart.find((entry) => entry.id === id) || null;
}

function isPlannerPlanAvailable() {
  return window.matchMedia(`(min-width: ${PLANNER_PLAN_DESKTOP_WIDTH}px)`).matches;
}

function setPlannerSurfaceGuideMode(mode) {
  plannerSurfaceGuideMode = mode === "wall" ? "wall" : "floor";
  renderPlannerSurfaceGuide();
}

function createPlannerDefaultSurfaceRegions() {
  return {
    wall: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.62 },
      { x: 0, y: 0.62 }
    ],
    floor: [
      { x: 0.06, y: 0.58 },
      { x: 0.94, y: 0.58 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ]
  };
}

function selectPlannerWholeSurface(surface) {
  if (!pendingPlannerSiteImage) {
    setText("#plannerStatus", "먼저 현장 이미지를 올려주세요.");
    return;
  }
  plannerSurfaceGuideMode = surface === "wall" ? "wall" : "floor";
  const defaults = createPlannerDefaultSurfaceRegions();
  plannerSurfaceRegions[plannerSurfaceGuideMode] = defaults[plannerSurfaceGuideMode];
  pendingPlannerRealRenderImage = "";
  pendingPlannerPhotoPreviewImage = "";
  const label = plannerSurfaceGuideMode === "wall" ? "벽 전체" : "바닥 전체";
  setText("#plannerStatus", `${label} 영역을 자동 선택했습니다.`);
  renderPlannerWorkspace();
}

function renderPlannerSurfaceGuide() {
  const canvas = document.querySelector("#plannerSurfaceGuideCanvas");
  if (!canvas) return;
  document.querySelector("#plannerGuideFloorBtn")?.classList.toggle("active", plannerSurfaceGuideMode === "floor");
  document.querySelector("#plannerGuideWallBtn")?.classList.toggle("active", plannerSurfaceGuideMode === "wall");

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f5f1ea";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (!pendingPlannerSiteImage) {
    canvas.dataset.guideLeft = "0";
    canvas.dataset.guideTop = "0";
    canvas.dataset.guideWidth = String(canvas.width);
    canvas.dataset.guideHeight = String(canvas.height);
    context.fillStyle = "#7b7469";
    context.font = "700 18px sans-serif";
    context.textAlign = "center";
    context.fillText("현장 이미지를 올리면 시공 영역이 자동 선택됩니다.", canvas.width / 2, canvas.height / 2 - 10);
    context.font = "500 13px sans-serif";
    context.fillText("필요하면 바닥 전체 선택 또는 벽 전체 선택을 누르세요.", canvas.width / 2, canvas.height / 2 + 18);
    return;
  }

  loadImageFromUrl(pendingPlannerSiteImage).then((image) => {
    if (!image || pendingPlannerSiteImage !== image.src) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const left = (canvas.width - width) / 2;
    const top = (canvas.height - height) / 2;
    canvas.dataset.guideLeft = String(left);
    canvas.dataset.guideTop = String(top);
    canvas.dataset.guideWidth = String(width);
    canvas.dataset.guideHeight = String(height);
    context.fillStyle = "#f5f1ea";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, left, top, width, height);
    drawPlannerSurfaceRegions(context, canvas);
  });
}

function drawPlannerSurfaceRegions(context, canvas) {
  drawPlannerSurfaceRegion(context, canvas, "floor", "#00a896", "바닥");
  drawPlannerSurfaceRegion(context, canvas, "wall", "#2f6fed", "벽");
}

function drawPlannerSurfaceRegion(context, canvas, surface, color, label) {
  const frame = getPlannerSurfaceGuideFrame(canvas);
  const points = (plannerSurfaceRegions[surface] || []).map((point) => ({
    x: frame.left + point.x * frame.width,
    y: frame.top + point.y * frame.height
  }));
  if (!points.length) return;

  context.fillStyle = surface === "floor" ? "rgba(0, 168, 150, 0.22)" : "rgba(47, 111, 237, 0.2)";
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  if (points.length >= 3) context.closePath();
  context.fill();
  context.stroke();

  if (points.length >= 3) {
    const center = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    center.x /= points.length;
    center.y /= points.length;
    context.fillStyle = color;
    context.font = "800 14px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, center.x, center.y);
  }
}

function handlePlannerSurfaceGuideCanvasClick(event) {
  if (!pendingPlannerSiteImage) setText("#plannerStatus", "먼저 현장 이미지를 올려주세요.");
  else setText("#plannerStatus", "점 선택 없이 바닥 전체 선택 또는 벽 전체 선택 버튼으로 영역을 적용합니다.");
}

function getPlannerSurfaceGuideFrame(canvas) {
  return {
    left: Number(canvas.dataset.guideLeft) || 0,
    top: Number(canvas.dataset.guideTop) || 0,
    width: Number(canvas.dataset.guideWidth) || canvas.width,
    height: Number(canvas.dataset.guideHeight) || canvas.height
  };
}

function handlePlannerViewportChange() {
  if (currentPageId !== "plannerPage") return;
  if (!isPlannerPlanAvailable() && plannerPlanPoints.length) {
    setText("#plannerStatus", "모바일에서는 도면 적용이 비활성화되어 치수 입력 기준으로 표시됩니다.");
  }
  renderPlannerWorkspace();
}

function renderPlannerPlanEditor() {
  const canvas = document.querySelector("#plannerPlanCanvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f5f1ea";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (!isPlannerPlanAvailable()) {
    context.fillStyle = "#7b7469";
    context.font = "700 18px sans-serif";
    context.textAlign = "center";
    context.fillText("도면 적용은 PC 화면에서만 사용할 수 있습니다.", canvas.width / 2, canvas.height / 2 - 8);
    context.font = "500 13px sans-serif";
    context.fillText("모바일에서는 공간 치수 입력으로 3D를 생성합니다.", canvas.width / 2, canvas.height / 2 + 20);
    return;
  }

  if (!pendingPlannerPlanImage) {
    context.fillStyle = "#7b7469";
    context.font = "700 18px sans-serif";
    context.textAlign = "center";
    context.fillText("도면 이미지를 올리면 외곽 모서리를 찍을 수 있습니다.", canvas.width / 2, canvas.height / 2 - 10);
    context.font = "500 13px sans-serif";
    context.fillText("도면이 없으면 위 공간 치수로 3D가 생성됩니다.", canvas.width / 2, canvas.height / 2 + 18);
    return;
  }

  loadImageFromUrl(pendingPlannerPlanImage).then((image) => {
    if (!image) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const left = (canvas.width - width) / 2;
    const top = (canvas.height - height) / 2;
    canvas.dataset.planLeft = String(left);
    canvas.dataset.planTop = String(top);
    canvas.dataset.planWidth = String(width);
    canvas.dataset.planHeight = String(height);
    context.fillStyle = "#f5f1ea";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, left, top, width, height);
    drawPlannerPlanPoints(context, canvas);
  });
}

function drawPlannerPlanPoints(context, canvas) {
  const frame = getPlannerPlanFrame(canvas);
  const points = plannerPlanPoints.map((point) => ({
    x: frame.left + point.x * frame.width,
    y: frame.top + point.y * frame.height
  }));
  if (points.length) {
    context.fillStyle = "rgba(0, 183, 166, 0.14)";
    context.strokeStyle = "#00a896";
    context.lineWidth = 3;
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    if (points.length >= 3) context.closePath();
    context.fill();
    context.stroke();
  }
  points.forEach((point, index) => {
    context.fillStyle = "#00a896";
    context.beginPath();
    context.arc(point.x, point.y, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "700 12px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(index + 1), point.x, point.y + 0.5);
  });
}

function handlePlannerPlanCanvasClick(event) {
  if (!isPlannerPlanAvailable()) {
    setText("#plannerStatus", "도면 적용은 PC 화면에서만 사용할 수 있습니다.");
    return;
  }
  if (!pendingPlannerPlanImage) {
    setText("#plannerStatus", "먼저 도면 이미지를 올려주세요.");
    return;
  }
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const frame = getPlannerPlanFrame(canvas);
  const canvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const canvasY = (event.clientY - rect.top) * (canvas.height / rect.height);
  const x = (canvasX - frame.left) / frame.width;
  const y = (canvasY - frame.top) / frame.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  if (plannerPlanPoints.length >= 12) plannerPlanPoints = [];
  plannerPlanPoints.push({ x, y });
  renderPlannerPlanEditor();
  setText("#plannerStatus", plannerPlanPoints.length >= 3 ? "도면 적용 준비가 되었습니다." : "도면 외곽 모서리를 3개 이상 순서대로 찍어주세요.");
  renderPlannerWorkspace();
}

function getPlannerPlanFrame(canvas) {
  return {
    left: Number(canvas.dataset.planLeft) || 0,
    top: Number(canvas.dataset.planTop) || 0,
    width: Number(canvas.dataset.planWidth) || canvas.width,
    height: Number(canvas.dataset.planHeight) || canvas.height
  };
}

function getPlannerFootprint(config) {
  const points = getPlannerShapePoints(config);
  return {
    points,
    area: Math.abs(polygonArea(points)),
    perimeter: polygonPerimeter(points),
    usesPlan: isPlannerPlanAvailable() && plannerPlanPoints.length >= 3
  };
}

function getPlannerShapePoints(config) {
  if (!isPlannerPlanAvailable() || plannerPlanPoints.length < 3) {
    return [
      { x: -config.width / 2, z: -config.depth / 2 },
      { x: config.width / 2, z: -config.depth / 2 },
      { x: config.width / 2, z: config.depth / 2 },
      { x: -config.width / 2, z: config.depth / 2 }
    ];
  }
  const minX = Math.min(...plannerPlanPoints.map((point) => point.x));
  const maxX = Math.max(...plannerPlanPoints.map((point) => point.x));
  const minY = Math.min(...plannerPlanPoints.map((point) => point.y));
  const maxY = Math.max(...plannerPlanPoints.map((point) => point.y));
  const widthRange = Math.max(maxX - minX, 0.001);
  const heightRange = Math.max(maxY - minY, 0.001);
  return plannerPlanPoints.map((point) => ({
    x: ((point.x - minX) / widthRange - 0.5) * config.width,
    z: ((point.y - minY) / heightRange - 0.5) * config.depth
  }));
}

function polygonArea(points) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.z - next.x * point.z;
  }, 0) / 2;
}

function polygonPerimeter(points) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + Math.hypot(next.x - point.x, next.z - point.z);
  }, 0);
}

function applyCartToPlanner() {
  const tiles = getPlannerCartTiles();
  autoSelectPlannerCartTiles({ onlyEmpty: false });
  resetPlannerPhotoRenderResults();
  setText("#plannerStatus", tiles.length ? "장바구니 타일을 현장 사진 기반 렌더에 적용했습니다." : "먼저 장바구니에 타일을 담아주세요.");
  renderPlannerWorkspace();
}

function resetPlannerPhotoRenderResults() {
  if (plannerRealRenderRunning) return;
  pendingPlannerRealRenderImage = "";
  pendingPlannerPhotoPreviewImage = "";
  pendingPlannerPanoramaSource = "";
  pendingPlannerPanoramaImage = "";
  plannerPanoramaTexture = null;
}

function updatePlannerRealRenderPreviewDisplay() {
  const realRenderPreview = document.querySelector("#plannerRealRenderPreview");
  if (!realRenderPreview) return;
  const image = pendingPlannerRealRenderImage || pendingPlannerPhotoPreviewImage;
  if (image) {
    const label = pendingPlannerRealRenderImage ? "자체 실사 엔진 결과 이미지" : "현장 사진 기반 타일 투영 미리보기";
    realRenderPreview.innerHTML = `<img src="${escapeHtml(image)}" alt="${escapeHtml(label)}" />`;
  } else if (pendingPlannerSiteImage) {
    realRenderPreview.innerHTML = "현장 사진에 자동 선택된 벽/바닥 전체 영역 기준으로 사진 기반 미리보기가 표시됩니다.";
  } else {
    realRenderPreview.innerHTML = "현장 이미지를 올리면 사진 기반 렌더 미리보기가 표시됩니다.";
  }
  realRenderPreview.classList.toggle("has-image", Boolean(image));
  realRenderPreview.classList.toggle("is-ai-result", Boolean(pendingPlannerRealRenderImage));
  realRenderPreview.classList.toggle("is-photo-preview", Boolean(!pendingPlannerRealRenderImage && pendingPlannerPhotoPreviewImage));
  realRenderPreview.classList.toggle("is-render-loading", Boolean(plannerRealRenderRunning));
  if (plannerRealRenderRunning) {
    realRenderPreview.insertAdjacentHTML("beforeend", buildPlannerRenderLoadingOverlayHtml());
  }
  schedulePlannerPanoramaRender();
}

function buildPlannerRenderLoadingOverlayHtml() {
  const elapsedSeconds = plannerRealRenderStartedAt
    ? Math.max(0, Math.floor((Date.now() - plannerRealRenderStartedAt) / 1000))
    : 0;
  const stage = getPlannerRenderLoadingStage(elapsedSeconds);
  const progress = Math.min(96, Math.max(8, Math.round((elapsedSeconds / 240) * 100)));
  return `
    <div class="planner-render-loading" role="status" aria-live="polite">
      <div class="planner-render-spinner" aria-hidden="true"></div>
      <strong>자체 실사 엔진 렌더링 중</strong>
      <span>${escapeHtml(stage)}</span>
      <small>평균 소요시간 약 90~180초 · 최대 5분까지 대기 · 현재 ${number(elapsedSeconds)}초 경과</small>
      <div class="planner-render-progress" aria-hidden="true">
        <i style="width: ${progress}%"></i>
      </div>
    </div>
  `;
}

function getPlannerRenderLoadingStage(elapsedSeconds) {
  if (elapsedSeconds < 12) return "현장 사진과 시공 영역을 분석하고 있습니다.";
  if (elapsedSeconds < 32) return "타일 규격, 줄눈, 가로/세로 시공 방향을 맞추는 중입니다.";
  if (elapsedSeconds < 68) return "조명, 그림자, 질감을 실제 시공 사진처럼 보정하고 있습니다.";
  if (elapsedSeconds < 105) return "문, 창문, 가구를 보존하면서 타일 마감을 정리하고 있습니다.";
  if (elapsedSeconds < 180) return "고해상도 결과 이미지를 마무리하고 있습니다. 고품질 렌더는 시간이 더 걸릴 수 있습니다.";
  return "서버가 아직 AI 응답을 기다리고 있습니다. 5분을 넘기면 자동으로 오류를 표시합니다.";
}

function startPlannerRenderLoadingTimer() {
  stopPlannerRenderLoadingTimer();
  plannerRealRenderStartedAt = Date.now();
  updatePlannerRealRenderPreviewDisplay();
  plannerRealRenderProgressTimer = window.setInterval(() => {
    updatePlannerRealRenderPreviewDisplay();
  }, 1000);
}

function stopPlannerRenderLoadingTimer() {
  if (plannerRealRenderProgressTimer) window.clearInterval(plannerRealRenderProgressTimer);
  plannerRealRenderProgressTimer = null;
  plannerRealRenderStartedAt = 0;
}

function schedulePlannerPhotoPreviewRender() {
  if (plannerPhotoPreviewTimer) window.clearTimeout(plannerPhotoPreviewTimer);
  if (currentPageId !== "plannerPage" || !pendingPlannerSiteImage || pendingPlannerRealRenderImage) return;
  plannerPhotoPreviewTimer = window.setTimeout(() => {
    updatePlannerPhotoPreviewRender().catch((error) => {
      console.warn(error);
    });
  }, 120);
}

async function updatePlannerPhotoPreviewRender() {
  const previewImage = await createPlannerPhotoMaterialPreviewDataUrl();
  if (!previewImage || pendingPlannerRealRenderImage) return;
  pendingPlannerPhotoPreviewImage = previewImage;
  updatePlannerRealRenderPreviewDisplay();
  schedulePlannerPanoramaRender();
}

function getPlannerPanoramaSourceImage() {
  return pendingPlannerRealRenderImage || pendingPlannerPhotoPreviewImage || pendingPlannerSiteImage || "";
}

function getPlannerPanoramaSourceMode() {
  if (pendingPlannerRealRenderImage) return "ai-render";
  if (pendingPlannerPhotoPreviewImage) return "draft-preview";
  if (pendingPlannerSiteImage) return "site-photo";
  return "empty";
}

function updatePlannerPanoramaSourceLabel() {
  const label = document.querySelector("#plannerPanoramaSourceLabel");
  if (!label) return;
  const mode = getPlannerPanoramaSourceMode();
  if (mode === "ai-render") {
    label.textContent = "현재 3D 보기 기준: 자체 실사 엔진 렌더";
  } else if (mode === "draft-preview") {
    label.textContent = "현재 3D 보기 기준: 임시 타일 미리보기";
  } else if (mode === "site-photo") {
    label.textContent = "현재 3D 보기 기준: 원본 현장 사진";
  } else {
    label.textContent = "렌더 생성 후 3D화됩니다.";
  }
}

function schedulePlannerPanoramaRender() {
  if (plannerPanoramaTimer) window.clearTimeout(plannerPanoramaTimer);
  const canvas = document.querySelector("#plannerPanoramaCanvas");
  const empty = document.querySelector("#plannerPanoramaEmpty");
  const source = getPlannerPanoramaSourceImage();
  const sourceMode = getPlannerPanoramaSourceMode();
  updatePlannerPanoramaSourceLabel();
  if (!canvas || !empty) return;
  if (!source) {
    pendingPlannerPanoramaImage = "";
    pendingPlannerPanoramaSource = "";
    plannerPanoramaTexture = null;
    empty.textContent = "자체 실사 엔진 렌더를 만들면 그 결과 이미지 기준으로 3D 현장 보기가 준비됩니다.";
    empty.classList.remove("hidden");
    clearPlannerPanoramaCanvas();
    return;
  }
  if (source === pendingPlannerPanoramaSource && plannerPanoramaTexture) {
    empty.classList.add("hidden");
    renderPlannerPanoramaViewport();
    return;
  }
  empty.textContent = sourceMode === "ai-render"
    ? "자체 실사 엔진 기반 3D 현장 보기를 만드는 중입니다."
    : "임시 3D 현장 보기를 준비하고 있습니다. 자체 실사 엔진 렌더가 완성되면 다시 3D화됩니다.";
  empty.classList.remove("hidden");
  plannerPanoramaTimer = window.setTimeout(() => {
    updatePlannerPanoramaRender(source).catch((error) => {
      console.warn(error);
      const currentEmpty = document.querySelector("#plannerPanoramaEmpty");
      if (currentEmpty) {
        currentEmpty.textContent = "360 현장 보기를 만들지 못했습니다.";
        currentEmpty.classList.remove("hidden");
      }
    });
  }, 160);
}

async function updatePlannerPanoramaRender(source) {
  const panoramaImage = await createPlannerPseudoPanoramaDataUrl(source);
  if (!panoramaImage || source !== getPlannerPanoramaSourceImage()) return;
  pendingPlannerPanoramaSource = source;
  pendingPlannerPanoramaImage = panoramaImage;
  plannerPanoramaTexture = await loadImageFromUrl(panoramaImage);
  document.querySelector("#plannerPanoramaEmpty")?.classList.add("hidden");
  renderPlannerPanoramaViewport();
}

async function createPlannerPseudoPanoramaDataUrl(source) {
  const image = await loadImageFromUrl(source);
  if (!image) return "";
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  const segmentWidth = canvas.width / 4;

  context.fillStyle = "#111816";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.filter = "blur(18px) saturate(1.1)";
  drawPlannerImageCover(context, image, -120, -90, canvas.width + 240, canvas.height + 180, false);
  context.restore();

  for (let index = 0; index < 4; index += 1) {
    context.save();
    context.globalAlpha = index === 2 ? 0.96 : 0.72;
    drawPlannerImageCover(context, image, index * segmentWidth, 0, segmentWidth, canvas.height, index % 2 === 1);
    context.restore();
  }

  context.save();
  context.globalAlpha = 0.98;
  drawPlannerImageCover(context, image, segmentWidth * 1.5, 0, segmentWidth, canvas.height, false);
  context.restore();

  const ceilingGradient = context.createLinearGradient(0, 0, 0, canvas.height * 0.34);
  ceilingGradient.addColorStop(0, "rgba(245,248,244,0.84)");
  ceilingGradient.addColorStop(1, "rgba(245,248,244,0)");
  context.fillStyle = ceilingGradient;
  context.fillRect(0, 0, canvas.width, canvas.height * 0.34);

  const floorGradient = context.createLinearGradient(0, canvas.height * 0.58, 0, canvas.height);
  floorGradient.addColorStop(0, "rgba(255,255,255,0)");
  floorGradient.addColorStop(1, "rgba(0,0,0,0.24)");
  context.fillStyle = floorGradient;
  context.fillRect(0, canvas.height * 0.58, canvas.width, canvas.height * 0.42);

  context.fillStyle = "rgba(0,0,0,0.12)";
  context.fillRect(0, 0, segmentWidth * 0.55, canvas.height);
  context.fillRect(canvas.width - segmentWidth * 0.55, 0, segmentWidth * 0.55, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function drawPlannerImageCover(context, image, x, y, width, height, flipX = false) {
  const imageRatio = image.width / Math.max(image.height, 1);
  const frameRatio = width / Math.max(height, 1);
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;
  if (imageRatio > frameRatio) {
    sourceWidth = image.height * frameRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / frameRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  if (flipX) {
    context.translate(x + width, y);
    context.scale(-1, 1);
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  } else {
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }
  context.restore();
}

function clearPlannerPanoramaCanvas() {
  const canvas = document.querySelector("#plannerPanoramaCanvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#f7f3ec");
  gradient.addColorStop(1, "#e7edf0");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function renderPlannerPanoramaViewport() {
  const canvas = document.querySelector("#plannerPanoramaCanvas");
  const texture = plannerPanoramaTexture;
  if (!canvas || !texture) {
    clearPlannerPanoramaCanvas();
    return;
  }
  const context = canvas.getContext("2d");
  const sourceWidth = texture.width;
  const sourceHeight = texture.height;
  const viewWidth = sourceWidth * 0.28;
  const viewHeight = sourceHeight * 0.48;
  const normalizedYaw = ((plannerPanoramaYaw % 1) + 1) % 1;
  const centerX = normalizedYaw * sourceWidth;
  const centerY = clampNumber(sourceHeight * (0.5 + plannerPanoramaPitch * 0.28), sourceHeight / 2, viewHeight / 2, sourceHeight - viewHeight / 2);
  const sourceY = Math.max(0, Math.min(sourceHeight - viewHeight, centerY - viewHeight / 2));
  let sourceX = centerX - viewWidth / 2;
  sourceX = ((sourceX % sourceWidth) + sourceWidth) % sourceWidth;

  context.clearRect(0, 0, canvas.width, canvas.height);
  let drawn = 0;
  let readX = sourceX;
  while (drawn < viewWidth - 0.5) {
    const part = Math.min(viewWidth - drawn, sourceWidth - readX);
    context.drawImage(
      texture,
      readX,
      sourceY,
      part,
      viewHeight,
      (drawn / viewWidth) * canvas.width,
      0,
      (part / viewWidth) * canvas.width,
      canvas.height
    );
    drawn += part;
    readX = 0;
  }

  const vignette = context.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.18, canvas.width / 2, canvas.height / 2, canvas.width * 0.68);
  vignette.addColorStop(0, "rgba(255,255,255,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(0,0,0,0.5)";
  context.fillRect(18, canvas.height - 48, 310, 30);
  context.fillStyle = "#fff";
  context.font = "800 14px sans-serif";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(`${getPlannerPanoramaViewLabel()} · ${getPlannerPanoramaSourceShortLabel()}`, 32, canvas.height - 33);
}

function getPlannerPanoramaSourceShortLabel() {
  const mode = getPlannerPanoramaSourceMode();
  if (mode === "ai-render") return "자체 실사 엔진 기반";
  if (mode === "draft-preview") return "임시 미리보기 기반";
  if (mode === "site-photo") return "원본 사진 기반";
  return "대기";
}

function getPlannerPanoramaViewLabel() {
  if (plannerPanoramaPitch < -0.65) return "천장 방향";
  if (plannerPanoramaPitch > 0.65) return "바닥 방향";
  const yaw = ((plannerPanoramaYaw % 1) + 1) % 1;
  if (yaw > 0.375 && yaw <= 0.625) return "정면 방향";
  if (yaw > 0.875 || yaw <= 0.125) return "후면 방향";
  return yaw <= 0.375 ? "좌측 방향" : "우측 방향";
}

function startPlannerPanoramaDrag(event) {
  if (!plannerPanoramaTexture) return;
  plannerPanoramaDrag = { x: event.clientX, y: event.clientY, yaw: plannerPanoramaYaw, pitch: plannerPanoramaPitch };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function movePlannerPanoramaDrag(event) {
  if (!plannerPanoramaDrag) return;
  const canvas = document.querySelector("#plannerPanoramaCanvas");
  if (!canvas) return;
  plannerPanoramaYaw = plannerPanoramaDrag.yaw - (event.clientX - plannerPanoramaDrag.x) / Math.max(canvas.clientWidth, 1) * 0.42;
  plannerPanoramaPitch = Math.max(-1, Math.min(1, plannerPanoramaDrag.pitch + (event.clientY - plannerPanoramaDrag.y) / Math.max(canvas.clientHeight, 1) * 1.4));
  renderPlannerPanoramaViewport();
}

function endPlannerPanoramaDrag() {
  plannerPanoramaDrag = null;
}

function handlePlannerPanoramaWheel(event) {
  if (!plannerPanoramaTexture) return;
  event.preventDefault();
  plannerPanoramaPitch = Math.max(-1, Math.min(1, plannerPanoramaPitch + event.deltaY / 900));
  renderPlannerPanoramaViewport();
}

function setPlannerPanoramaView(view) {
  if (view === "back") plannerPanoramaYaw = 0;
  else if (view === "ceiling") plannerPanoramaPitch = -1;
  else if (view === "floor") plannerPanoramaPitch = 1;
  else {
    plannerPanoramaYaw = 0.5;
    plannerPanoramaPitch = 0;
  }
  if (view === "back") plannerPanoramaPitch = 0;
  renderPlannerPanoramaViewport();
}

async function createPlannerPhotoMaterialPreviewDataUrl() {
  if (!pendingPlannerSiteImage) return "";
  const config = readPlannerConfig();
  const surfaces = [
    { surface: "floor", tile: getPlannerSelectedTile("floor"), opacity: 0.78 },
    { surface: "wall", tile: getPlannerSelectedTile("wall"), opacity: 0.68 }
  ];
  const renderSurfaces = await Promise.all(surfaces.map(async (entry) => {
    const points = plannerSurfaceRegions[entry.surface] || [];
    if (!entry.tile?.image || points.length < 3) return null;
    try {
      return {
        surface: entry.surface,
        points,
        tileSize: entry.tile.size || "",
        finish: entry.tile.finish || "",
        orientation: getPlannerSurfaceOrientation(config, entry.surface),
        groutMillimeters: config.grout,
        opacity: entry.opacity,
        room: {
          widthMeters: config.width,
          depthMeters: config.depth,
          heightMeters: config.height
        },
        tileImageDataUrl: await imageUrlToDataUrl(entry.tile.image)
      };
    } catch (error) {
      console.warn(error);
      return null;
    }
  }));

  if (window.TbpPlannerPhotoRenderEngine?.renderPhotoTileComposition) {
    return window.TbpPlannerPhotoRenderEngine.renderPhotoTileComposition({
      siteImageDataUrl: pendingPlannerSiteImage,
      outputWidth: 1400,
      surfaces: renderSurfaces.filter(Boolean)
    });
  }

  return "";
}

function createPlannerPhotoTilePattern(tileImage, tile, surface, config, surfaceBounds) {
  const tileSize = parseTileDimensionsMeters(tile?.size, surface, getPlannerSurfaceOrientation(config, surface));
  const canvas = document.createElement("canvas");
  const scale = getPlannerPhotoSurfaceScale(surface, config, surfaceBounds);
  const cellWidth = Math.max(18, Math.min(900, Math.round(tileSize.width * scale.x)));
  const cellHeight = Math.max(18, Math.min(900, Math.round(tileSize.height * scale.y)));
  canvas.width = cellWidth * 3;
  canvas.height = cellHeight * 3;
  const context = canvas.getContext("2d");
  context.fillStyle = "#e7e1d6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const grout = Math.max(1, Math.min(18, Math.round((Number(config.grout) || 3) / 1000 * ((scale.x + scale.y) / 2))));
  for (let y = 0; y < canvas.height; y += cellHeight) {
    for (let x = 0; x < canvas.width; x += cellWidth) {
      context.drawImage(tileImage, x + grout, y + grout, Math.max(cellWidth - grout * 2, 1), Math.max(cellHeight - grout * 2, 1));
      context.strokeStyle = "rgba(246,241,232,0.78)";
      context.lineWidth = grout;
      context.strokeRect(x + grout / 2, y + grout / 2, cellWidth - grout, cellHeight - grout);
      context.fillStyle = "rgba(255,255,255,0.08)";
      context.fillRect(x + grout, y + grout, Math.max(cellWidth - grout * 2, 1), 1.2);
    }
  }
  return canvas;
}

function getPlannerPhotoSurfaceScale(surface, config, bounds) {
  const realWidth = Math.max(Number(config.width) || 2.4, 0.1);
  const realHeight = surface === "floor"
    ? Math.max(Number(config.depth) || 1.8, 0.1)
    : Math.max(Number(config.height) || 2.3, 0.1);
  return {
    x: Math.max(Number(bounds?.width) || 1, 1) / realWidth,
    y: Math.max(Number(bounds?.height) || 1, 1) / realHeight
  };
}

function drawPlannerPhotoTileSurface(context, siteImage, canvas, points, tilePattern, surface, opacity) {
  const bounds = getCanvasPolygonBounds(points, canvas.width, canvas.height);
  context.save();
  clipCanvasPolygon(context, points);
  context.globalAlpha = opacity;
  const pattern = context.createPattern(tilePattern, "repeat");
  const angle = surface === "floor" && points.length >= 2
    ? Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x)
    : 0;
  context.translate(bounds.left, bounds.top);
  context.rotate(angle * 0.18);
  context.fillStyle = pattern;
  context.fillRect(-bounds.width, -bounds.height, bounds.width * 3, bounds.height * 3);
  context.restore();

  context.save();
  clipCanvasPolygon(context, points);
  context.globalCompositeOperation = "multiply";
  context.globalAlpha = surface === "floor" ? 0.38 : 0.3;
  context.drawImage(siteImage, 0, 0, canvas.width, canvas.height);
  context.restore();

  context.save();
  clipCanvasPolygon(context, points);
  context.globalAlpha = surface === "floor" ? 0.16 : 0.11;
  const gradient = context.createLinearGradient(bounds.left, bounds.top, bounds.right, bounds.bottom);
  gradient.addColorStop(0, "rgba(255,255,255,0.34)");
  gradient.addColorStop(0.58, "rgba(255,255,255,0.02)");
  gradient.addColorStop(1, "rgba(0,0,0,0.22)");
  context.fillStyle = gradient;
  context.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
  context.restore();

  context.save();
  context.strokeStyle = surface === "floor" ? "rgba(20,28,25,0.2)" : "rgba(18,24,32,0.16)";
  context.lineWidth = Math.max(2, Math.round(canvas.width * 0.002));
  clipCanvasPolygon(context, points);
  context.stroke();
  context.restore();
}

function clipCanvasPolygon(context, points) {
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.clip();
}

function getCanvasPolygonBounds(points, width, height) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.max(0, Math.min(...xs));
  const top = Math.max(0, Math.min(...ys));
  const right = Math.min(width, Math.max(...xs));
  const bottom = Math.min(height, Math.max(...ys));
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(right - left, 1),
    height: Math.max(bottom - top, 1)
  };
}

async function generatePlannerRealRender() {
  const floorTile = getPlannerSelectedTile("floor");
  const wallTile = getPlannerSelectedTile("wall");
  const selectedTiles = [
    floorTile ? { surface: "floor", tile: floorTile } : null,
    wallTile ? { surface: "wall", tile: wallTile } : null
  ].filter(Boolean);

  if (!pendingPlannerSiteImage) {
    setText("#plannerStatus", "실사 렌더를 만들 현장 이미지를 먼저 올려주세요.");
    return;
  }
  if (!selectedTiles.length) {
    setText("#plannerStatus", "실사 렌더에 적용할 바닥 또는 벽 타일을 선택해주세요.");
    return;
  }
  if (selectedTiles.some(({ tile }) => !tile.image)) {
    setText("#plannerStatus", "선택한 타일 중 이미지가 없는 상품이 있어 실사 렌더를 만들 수 없습니다.");
    return;
  }

  plannerRealRenderRunning = true;
  pendingPlannerRealRenderImage = "";
  startPlannerRenderLoadingTimer();
  renderPlannerWorkspace();
  setText("#plannerStatus", "현장 사진, 타일 규격, 줄눈, 시공 방향을 기준으로 자체 실사 엔진 렌더를 생성하고 있습니다...");

  try {
    const compositionImageDataUrl = await createPlannerPhotoMaterialPreviewDataUrl();
    pendingPlannerRealRenderImage = String(compositionImageDataUrl || "");
    if (!pendingPlannerRealRenderImage) throw new Error("실사 렌더 결과 이미지를 받지 못했습니다.");
    pendingPlannerPanoramaSource = "";
    pendingPlannerPanoramaImage = "";
    plannerPanoramaTexture = null;
    plannerPanoramaYaw = 0.5;
    plannerPanoramaPitch = 0;
    setText("#plannerStatus", "자체 실사 엔진 렌더가 생성되었습니다. 결과 이미지를 기준으로 360 현장 보기를 준비합니다.");
    renderPlannerWorkspace();
    schedulePlannerPanoramaRender();
    window.setTimeout(() => {
      document.querySelector("#plannerPanoramaShell")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 260);
  } catch (error) {
    setText("#plannerStatus", error?.message || "실사 렌더 생성 중 오류가 발생했습니다.");
  } finally {
    plannerRealRenderRunning = false;
    stopPlannerRenderLoadingTimer();
    renderPlannerWorkspace();
  }
}

async function createPlannerSurfaceGuideImageDataUrl() {
  const hasGuide = Object.values(plannerSurfaceRegions).some((points) => points.length >= 3);
  if (!pendingPlannerSiteImage || !hasGuide) return "";

  const image = await loadImageFromUrl(pendingPlannerSiteImage);
  if (!image) return "";
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = Math.max(780, Math.round((image.height / image.width) * canvas.width));
  const context = canvas.getContext("2d");
  context.fillStyle = "#f5f1ea";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  [
    { surface: "floor", color: "#00a896", fill: "rgba(0, 168, 150, 0.24)", label: "FLOOR TILE AREA" },
    { surface: "wall", color: "#2f6fed", fill: "rgba(47, 111, 237, 0.22)", label: "WALL TILE AREA" }
  ].forEach(({ surface, color, fill, label }) => {
    const points = plannerSurfaceRegions[surface] || [];
    if (points.length < 3) return;
    const scaledPoints = points.map((point) => ({
      x: point.x * canvas.width,
      y: point.y * canvas.height
    }));
    context.fillStyle = fill;
    context.strokeStyle = color;
    context.lineWidth = 8;
    context.beginPath();
    scaledPoints.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fill();
    context.stroke();
    const center = scaledPoints.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    center.x /= scaledPoints.length;
    center.y /= scaledPoints.length;
    context.fillStyle = color;
    context.font = "800 34px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, center.x, center.y);
  });

  return canvas.toDataURL("image/png");
}

function openPlannerRealRenderPreview() {
  if (!pendingPlannerRealRenderImage) {
    setText("#plannerStatus", "먼저 실사 렌더를 생성해주세요.");
    return;
  }
  const modal = document.querySelector("#imagePreviewModal");
  const modalImage = document.querySelector("#imagePreviewModalImage");
  const modalTitle = document.querySelector("#imagePreviewTitle");
  modalTitle.textContent = "실사 렌더 결과";
  modalImage.src = pendingPlannerRealRenderImage;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function schedulePlannerRender() {
  if (!isPlannerGraphic3DEnabled()) {
    renderPlannerGraphicPreviewDisabled();
    return;
  }
  if (currentPageId !== "plannerPage") return;
  if (plannerRenderTimer) window.clearTimeout(plannerRenderTimer);
  plannerRenderTimer = window.setTimeout(() => {
    renderPlannerScene().catch((error) => {
      console.warn(error);
      const mount = document.querySelector("#plannerCanvasMount");
      if (mount) mount.innerHTML = '<div class="planner-canvas-empty">3D 미리보기를 불러오지 못했습니다.</div>';
      setText("#plannerStatus", "3D 엔진을 불러오지 못했습니다. 네트워크 연결을 확인해주세요.");
    });
  }, 80);
}

async function loadPlannerThree() {
  if (!plannerThreeModulePromise) plannerThreeModulePromise = import(PLANNER_THREE_URL);
  return plannerThreeModulePromise;
}

async function renderPlannerScene() {
  const mount = document.querySelector("#plannerCanvasMount");
  if (!mount || currentPageId !== "plannerPage") return;
  const THREE = await loadPlannerThree();
  const config = readPlannerConfig();
  const floorTile = getPlannerSelectedTile("floor");
  const wallTile = getPlannerSelectedTile("wall");
  disposePlannerScene();

  const width = Math.max(mount.clientWidth || 900, 320);
  const height = Math.max(mount.clientHeight || 560, 320);
  mount.innerHTML = "";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeee6da);
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  plannerThreeState.renderer = renderer;
  plannerThreeState.scene = scene;
  plannerThreeState.camera = camera;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8aa97, 1.25));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.15);
  keyLight.position.set(-3.6, 5.2, 3.4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 12;
  keyLight.shadow.camera.left = -5;
  keyLight.shadow.camera.right = 5;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -5;
  scene.add(keyLight);
  const softLight = new THREE.DirectionalLight(0xfff4df, 0.65);
  softLight.position.set(3.4, 3.2, -2.2);
  scene.add(softLight);

  const floorTexture = await createPlannerTileTexture(THREE, floorTile, config.grout, "floor", config);
  const wallTexture = await createPlannerTileTexture(THREE, wallTile, config.grout, "wall", config);
  addPlannerRoom(THREE, scene, config, floorTexture, wallTexture);
  await addPlannerSiteImage(THREE, scene, config);
  attachPlannerPointerControls(renderer.domElement);

  const animate = () => {
    plannerThreeState.animationId = requestAnimationFrame(animate);
    updatePlannerCamera(camera, config);
    renderer.render(scene, camera);
  };
  animate();
  const plannerStatusText = document.querySelector("#plannerStatus")?.textContent || "";
  if (!plannerStatusText.includes("실사 렌더")) {
    setText("#plannerStatus", "3D 공간 미리보기가 준비되었습니다.");
  }
}

function disposePlannerScene() {
  if (plannerThreeState.animationId) cancelAnimationFrame(plannerThreeState.animationId);
  plannerThreeState.animationId = 0;
  if (plannerThreeState.renderer) {
    plannerThreeState.renderer.dispose();
    plannerThreeState.renderer.domElement?.remove();
  }
  plannerThreeState.renderer = null;
  plannerThreeState.scene = null;
  plannerThreeState.camera = null;
  plannerThreeState.drag = null;
  plannerThreeState.pinch = null;
  plannerThreeState.pointers.clear();
}

async function createPlannerTileTexture(THREE, tile, grout, surface, config) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  const baseColor = surface === "floor" ? "#c9c5bc" : "#e1ddd3";
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (tile?.image) {
    const image = await loadImageFromUrl(tile.image);
    if (image) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      context.fillStyle = surface === "floor" ? "rgba(30,26,20,0.08)" : "rgba(255,255,255,0.12)";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  const tileSize = parseTileDimensionsMeters(tile?.size, surface, getPlannerSurfaceOrientation(config, surface));
  const cellsX = Math.max(2, Math.round(3 / tileSize.width));
  const cellsY = Math.max(2, Math.round(3 / tileSize.height));
  const stepX = canvas.width / cellsX;
  const stepY = canvas.height / cellsY;
  const lineWidth = Math.max(2, Math.min(14, Number(grout) || 3));
  context.strokeStyle = "rgba(245, 241, 232, 0.74)";
  context.lineWidth = lineWidth;
  context.shadowColor = "rgba(26, 24, 20, 0.24)";
  context.shadowBlur = 2;
  for (let position = 0; position <= canvas.width; position += stepX) {
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, canvas.height);
    context.stroke();
  }
  for (let position = 0; position <= canvas.height; position += stepY) {
    context.beginPath();
    context.moveTo(0, position);
    context.lineTo(canvas.width, position);
    context.stroke();
  }
  context.shadowBlur = 0;
  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  for (let y = 0; y < canvas.height; y += stepY) {
    for (let x = 0; x < canvas.width; x += stepX) {
      context.fillRect(x + lineWidth, y + lineWidth, Math.max(stepX - lineWidth * 2, 1), 1.2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    surface === "floor" ? Math.max(config.width / tileSize.width, 1) : Math.max(config.width / tileSize.width, 1),
    surface === "floor" ? Math.max(config.depth / tileSize.height, 1) : Math.max(config.height / tileSize.height, 1)
  );
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getPlannerSurfaceOrientation(config, surface) {
  return surface === "wall" ? config?.wallOrientation : config?.floorOrientation;
}

function parseTileDimensionsMeters(size, surface = "floor", orientation = "horizontal") {
  const matches = String(size || "").match(/(\d{2,4})\D+(\d{2,4})/);
  const dimensions = !matches
    ? (surface === "floor"
      ? { width: 0.6, height: 0.6 }
      : { width: 0.3, height: 0.6 })
    : {
    width: Math.max(Number(matches[1]) / 1000, 0.05),
    height: Math.max(Number(matches[2]) / 1000, 0.05)
  };
  if (orientation === "vertical" && Math.abs(dimensions.width - dimensions.height) > 0.001) {
    return { width: dimensions.height, height: dimensions.width };
  }
  return dimensions;
}

function addPlannerRoom(THREE, scene, config, floorTexture, wallTexture) {
  const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.48, metalness: 0.02, side: THREE.DoubleSide });
  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.58, metalness: 0.01, side: THREE.DoubleSide });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x3d3831, transparent: true, opacity: 0.45 });
  const points = config.footprint?.points?.length ? config.footprint.points : getPlannerShapePoints(config);

  const floorGeometry = config.footprint?.usesPlan
    ? new THREE.ShapeGeometry(new THREE.Shape(points.map((point) => new THREE.Vector2(point.x, point.z))))
    : new THREE.PlaneGeometry(config.width, config.depth);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  const slabGeometry = config.footprint?.usesPlan
    ? new THREE.ShapeGeometry(new THREE.Shape(points.map((point) => new THREE.Vector2(point.x, point.z))))
    : new THREE.PlaneGeometry(config.width, config.depth);
  const slab = new THREE.Mesh(slabGeometry, new THREE.MeshStandardMaterial({ color: 0xb7ada0, roughness: 0.72, side: THREE.DoubleSide }));
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = -0.035;
  slab.receiveShadow = true;
  scene.add(slab);

  const openWallIndex = getPlannerOpenWallIndex(points);
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const dx = next.x - point.x;
    const dz = next.z - point.z;
    const length = Math.hypot(dx, dz);
    if (length <= 0.01) return;
    if (index === openWallIndex) return;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(length, config.height), wallMaterial.clone());
    wall.position.set((point.x + next.x) / 2, config.height / 2, (point.z + next.z) / 2);
    wall.rotation.y = -Math.atan2(dz, dx);
    wall.receiveShadow = true;
    scene.add(wall);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.06, 0.025),
      new THREE.MeshStandardMaterial({ color: 0xd8d0c3, roughness: 0.52 })
    );
    trim.position.set((point.x + next.x) / 2, 0.035, (point.z + next.z) / 2);
    trim.rotation.y = -Math.atan2(dz, dx);
    trim.castShadow = true;
    trim.receiveShadow = true;
    scene.add(trim);
  });

  const linePoints = [];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    linePoints.push(new THREE.Vector3(point.x, 0.01, point.z), new THREE.Vector3(next.x, 0.01, next.z));
    linePoints.push(new THREE.Vector3(point.x, 0, point.z), new THREE.Vector3(point.x, config.height, point.z));
    linePoints.push(new THREE.Vector3(point.x, config.height, point.z), new THREE.Vector3(next.x, config.height, next.z));
  });
  const edges = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePoints), edgeMaterial);
  scene.add(edges);
}

function getPlannerOpenWallIndex(points) {
  let openIndex = 0;
  let frontScore = -Infinity;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const score = (point.z + next.z) / 2;
    if (score > frontScore) {
      frontScore = score;
      openIndex = index;
    }
  });
  return openIndex;
}

async function addPlannerSiteImage(THREE, scene, config) {
  if (!pendingPlannerSiteImage) return;
  const texture = await loadPlannerTexture(THREE, pendingPlannerSiteImage);
  if (!texture) return;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.92 });
  const planeWidth = Math.min(config.width * 0.42, 1.25);
  const planeHeight = planeWidth * 0.7;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, planeHeight), material);
  plane.position.set(config.width / 2 - planeWidth / 2 - 0.08, config.height - planeHeight / 2 - 0.14, -config.depth / 2 + 0.012);
  plane.castShadow = true;
  scene.add(plane);
}

function loadPlannerTexture(THREE, src) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(src, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      resolve(texture);
    }, undefined, () => resolve(null));
  });
}

function addPlannerProducts(THREE, scene, config, items) {
  items.forEach((item, index) => {
    const group = new THREE.Group();
    const columnCount = Math.min(Math.max(items.length, 1), 4);
    const row = Math.floor(index / columnCount);
    const column = index % columnCount;
    const spacing = config.width / (columnCount + 1);
    const x = -config.width / 2 + spacing * (column + 1);
    const z = -config.depth / 2 + 0.34 + row * 0.58;
    group.position.set(
      Math.min(Math.max(x, -config.width / 2 + 0.34), config.width / 2 - 0.34),
      0,
      Math.min(Math.max(z, -config.depth / 2 + 0.28), config.depth / 2 - 0.36)
    );
    buildPlannerProductModel(THREE, group, item);
    scene.add(group);
  });
}

function buildPlannerProductModel(THREE, group, item) {
  const source = `${item.kind || ""} ${item.name || ""} ${item.option || ""}`;
  if (/양변기|toilet/i.test(source)) {
    addBox(THREE, group, [0, 0.18, 0.02], [0.34, 0.26, 0.42], 0xf2eee4);
    addBox(THREE, group, [0, 0.5, -0.18], [0.46, 0.44, 0.16], 0xf9f7f0);
    addCylinder(THREE, group, [0, 0.33, 0.06], 0.22, 0.16, 0xf9f8f3);
    addCylinder(THREE, group, [0, 0.355, 0.065], 0.15, 0.172, 0xd7d4cc);
    addTorus(THREE, group, [0, 0.43, 0.07], [0.19, 0.13, 0.028], 0xfdfbf7);
    addBox(THREE, group, [0, 0.72, -0.18], [0.52, 0.04, 0.18], 0xfdfbf7);
  } else if (/세면|basin|lavatory/i.test(source)) {
    addBox(THREE, group, [0, 0.28, -0.18], [0.18, 0.54, 0.16], 0xdfd7c9);
    addBox(THREE, group, [0, 0.52, -0.18], [0.64, 0.1, 0.36], 0xf8f5ed);
    addCylinder(THREE, group, [0, 0.6, -0.18], 0.22, 0.08, 0xfdfbf7);
    addCylinder(THREE, group, [0, 0.62, -0.18], 0.14, 0.084, 0xd9d4ca);
    addCylinder(THREE, group, [0.2, 0.72, -0.18], 0.025, 0.2, 0x8f9aa2, true);
    addCylinder(THREE, group, [0.3, 0.72, -0.18], 0.035, 0.07, 0xa9b2b6);
  } else if (/욕실장|cabinet|장/i.test(source)) {
    addBox(THREE, group, [0, 0.74, -0.22], [0.82, 0.92, 0.2], 0x6b6f6b);
    addBox(THREE, group, [0, 1.44, -0.235], [0.76, 0.48, 0.04], 0xb8c9cc, { metalness: 0.12, roughness: 0.18 });
    addBox(THREE, group, [-0.22, 0.74, -0.095], [0.025, 0.62, 0.03], 0xd9d0bf);
    addBox(THREE, group, [0.22, 0.74, -0.095], [0.025, 0.62, 0.03], 0xd9d0bf);
  } else if (/수전|샤워|faucet|shower/i.test(source)) {
    addCylinder(THREE, group, [0, 0.92, -0.25], 0.024, 1.22, 0x8f9aa2, true);
    addBox(THREE, group, [0.18, 1.42, -0.25], [0.36, 0.035, 0.035], 0x8f9aa2, { metalness: 0.38, roughness: 0.24 });
    addCylinder(THREE, group, [0.39, 1.42, -0.25], 0.09, 0.035, 0xaab3b7);
    addCylinder(THREE, group, [0, 0.38, -0.25], 0.07, 0.04, 0xaab3b7);
  } else {
    addBox(THREE, group, [0, 0.35, 0], [0.42, 0.7, 0.28], 0xd4c8b5);
  }
}

function addBox(THREE, group, position, size, color, materialOptions = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshStandardMaterial({ color, roughness: materialOptions.roughness ?? 0.48, metalness: materialOptions.metalness ?? 0.02 })
  );
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addCylinder(THREE, group, position, radius, height, color, horizontal = false) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: color > 0x700000 ? 0.38 : 0.02 })
  );
  if (horizontal) mesh.rotation.z = Math.PI / 2;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addTorus(THREE, group, position, scale, color) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.22, 20, 48),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.02 })
  );
  mesh.scale.set(scale[0], scale[2], scale[1]);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function attachPlannerPointerControls(canvas) {
  canvas.onwheel = (event) => {
    event.preventDefault();
    zoomPlannerCamera(Math.exp(event.deltaY * 0.001));
  };

  canvas.onpointerdown = (event) => {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {}
    plannerThreeState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (plannerThreeState.pointers.size === 2) {
      plannerThreeState.drag = null;
      plannerThreeState.pinch = {
        distance: getPlannerPointerDistance(),
        zoom: plannerThreeState.zoom
      };
      return;
    }
    plannerThreeState.drag = { x: event.clientX, y: event.clientY, angle: plannerThreeState.angle, elevation: plannerThreeState.elevation };
  };

  canvas.onpointermove = (event) => {
    if (plannerThreeState.pointers.has(event.pointerId)) {
      plannerThreeState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (plannerThreeState.pointers.size >= 2 && plannerThreeState.pinch) {
      const distance = getPlannerPointerDistance();
      if (distance > 0) {
        const scale = plannerThreeState.pinch.distance / distance;
        plannerThreeState.zoom = clampPlannerZoom(plannerThreeState.pinch.zoom * scale);
      }
      return;
    }
    if (!plannerThreeState.drag) return;
    const dx = event.clientX - plannerThreeState.drag.x;
    const dy = event.clientY - plannerThreeState.drag.y;
    plannerThreeState.angle = plannerThreeState.drag.angle + dx * 0.006;
    plannerThreeState.elevation = Math.min(Math.max(plannerThreeState.drag.elevation + dy * 0.003, 0.22), 1.05);
  };

  canvas.onpointerup = (event) => {
    releasePlannerPointer(event.pointerId);
  };
  canvas.onpointercancel = (event) => {
    releasePlannerPointer(event.pointerId);
  };
  canvas.onlostpointercapture = (event) => {
    releasePlannerPointer(event.pointerId);
  };
}

function releasePlannerPointer(pointerId) {
  plannerThreeState.pointers.delete(pointerId);
  plannerThreeState.pinch = null;
  if (plannerThreeState.pointers.size === 1) {
    const pointer = [...plannerThreeState.pointers.values()][0];
    plannerThreeState.drag = { x: pointer.x, y: pointer.y, angle: plannerThreeState.angle, elevation: plannerThreeState.elevation };
  } else {
    plannerThreeState.drag = null;
  }
}

function zoomPlannerCamera(multiplier) {
  plannerThreeState.zoom = clampPlannerZoom(plannerThreeState.zoom * multiplier);
}

function clampPlannerZoom(value) {
  return Math.min(Math.max(Number(value) || 1, 0.42), 2.35);
}

function getPlannerPointerDistance() {
  const points = [...plannerThreeState.pointers.values()];
  if (points.length < 2) return 0;
  const dx = points[0].x - points[1].x;
  const dy = points[0].y - points[1].y;
  return Math.hypot(dx, dy);
}

function updatePlannerCamera(camera, config) {
  const radius = (Math.max(config.width, config.depth) * 1.35 + 1.5) * plannerThreeState.zoom;
  camera.position.set(
    Math.sin(plannerThreeState.angle) * radius,
    config.height * plannerThreeState.elevation + 1.1,
    Math.cos(plannerThreeState.angle) * radius
  );
  camera.lookAt(0, config.height * 0.42, 0);
}

function switchPage(pageId, options = {}) {
  if (ADMIN_ONLY_PAGE_IDS.has(pageId) && !isAdminUser()) {
    setText("#adminLoginStatus", "관리자 페이지는 관리자 로그인 후 사용할 수 있습니다.");
    pageId = "loginPage";
  }

  if (pageId === currentPageId) {
    restorePageScroll(pageId, options.scrollY ?? window.scrollY);
    return;
  }

  if (currentPageId) {
    pageScrollPositions.set(currentPageId, window.scrollY);
    if (options.pushHistory !== false) {
      pageHistory.push({ pageId: currentPageId, scrollY: window.scrollY });
    }
  }

  document.querySelectorAll(".app-page").forEach((page) => {
    page.classList.toggle("active", page.id === pageId);
  });

  currentPageId = pageId;
  syncExperienceMode(pageId);
  const activeNavPage = pageId === "productDetailPage"
    ? "taxonomyTestPage"
    : pageId === "samplePage"
      ? "homePage"
      : pageId;
  document.querySelectorAll("[data-page-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.pageTarget === activeNavPage);
  });

  const targetScroll = options.scrollY ?? 0;
  restorePageScroll(pageId, targetScroll);

  if (options.updateBrowserHistory !== false) {
    history.pushState({ pageId }, "", `#${pageId}`);
  }

  if (pageId === "proposalPage") {
    resetProposalPptState();
  }

  if (pageId === "productsPage") {
    syncProductFilters();
    renderProducts();
    void ensureProductsReady();
  }

  if (pageId === "aiTileFinderPage") {
    syncTileFinderBrandFilter();
    void ensureProductsReady();
  }

  if (pageId === "myPage") {
    renderMyPage();
  }

  if (pageId === "taxonomyTestPage") {
    prepareTaxonomyProducts();
    syncTaxonomyFilters();
    renderTaxonomyTestPage();
  }

  if (pageId === "renderPage") {
    ensureRenderSelection();
    renderRenderWorkspace();
  }

  if (pageId === "plannerPage") {
    renderPlannerWorkspace();
  }

  if (pageId === "adminPage") {
    switchAdminView(currentAdminView);
    loadAdminOverview();
  }

  if (pageId === "tile114TestPage") {
    renderTile114SampleGrid([]);
    setText("#tile114Status", authUser?.role === "admin" ? "카테고리와 개수를 선택한 뒤 샘플 가져오기를 눌러주세요." : "관리자 로그인 후 사용할 수 있습니다.");
  }
}

function restorePageScroll(pageId, scrollY) {
  const targetScroll = Math.max(Number(scrollY) || 0, 0);
  const restore = () => {
    if (pageId === "productsPage" && productListReturnState.productId) {
      restoreProductListPosition(targetScroll);
      return;
    }
    window.scrollTo({ top: targetScroll, behavior: "auto" });
  };

  requestAnimationFrame(() => {
    restore();
  });

  setTimeout(restore, 80);
  setTimeout(restore, 250);
  setTimeout(restore, 600);
}

function restoreProductListPosition(fallbackScrollY) {
  const productTrigger = document.querySelector(`[data-view-product="${cssEscape(productListReturnState.productId)}"]`);
  const card = productTrigger?.closest(".product-card");
  if (!card) {
    window.scrollTo({ top: fallbackScrollY, behavior: "auto" });
    return;
  }

  window.scrollTo({ top: fallbackScrollY, behavior: "auto" });
  const rect = card.getBoundingClientRect();
  const targetTop = window.scrollY + rect.top - productListReturnState.viewportTop;
  window.scrollTo({ top: Math.max(targetTop, 0), behavior: "auto" });
}

function goBackPage() {
  pageScrollPositions.set(currentPageId, window.scrollY);
  const previous = pageHistory.pop();
  if (!previous) {
    switchPage("homePage", { pushHistory: false, updateBrowserHistory: false, scrollY: pageScrollPositions.get("homePage") || 0 });
    return;
  }

  switchPage(previous.pageId, { pushHistory: false, updateBrowserHistory: false, scrollY: previous.scrollY });
}

function returnToProductsPage() {
  pageScrollPositions.set(currentPageId, window.scrollY);
  const previous = pageHistory[pageHistory.length - 1];
  if (previous?.pageId === "productsPage") {
    goBackPage();
    return;
  }

  switchPage("productsPage", {
    pushHistory: false,
    updateBrowserHistory: false,
    scrollY: productListReturnState.scrollY || pageScrollPositions.get("productsPage") || 0
  });
}

function handleBrowserBack() {
  if (suppressHistoryState) return;
  if (currentPageId === "productDetailPage") {
    suppressHistoryState = true;
    returnToProductsPage();
    history.replaceState({ pageId: "productsPage" }, "", "#productsPage");
    suppressHistoryState = false;
    return;
  }
  goBackPage();
}

function switchDoc(docId) {
  document.querySelectorAll("[data-doc-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.docTab === docId);
  });
  document.querySelectorAll(".document-view").forEach((view) => {
    view.classList.toggle("hidden", view.id !== docId);
  });
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("tbpCart")) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  const stored = saveCartToLocalOnly();
  if (stored && authUser?.businessNumber) scheduleCartSync();
  return stored;
}

function saveCartToLocalOnly() {
  try {
    localStorage.setItem("tbpCart", JSON.stringify(cart));
    return true;
  } catch (error) {
    console.warn(error);
    return false;
  }
}

function scheduleCartSync() {
  if (!authUser?.businessNumber) return;
  if (cartSyncTimer) window.clearTimeout(cartSyncTimer);
  cartSyncTimer = window.setTimeout(() => {
    pushCartToServer().catch((error) => console.warn(error));
  }, 300);
}

async function loadAdminOverview() {
  if (authUser?.role !== "admin" || !authUser?.adminUsername || !authUser?.adminToken) {
    setText("#adminStatus", "관리자 로그인 후 내부관리자 페이지를 사용할 수 있습니다.");
    return;
  }

  setText("#adminStatus", "내부관리자 정보를 불러오는 중입니다...");
  try {
    adminOverview = await requestJson("/api/admin/overview", {
      headers: getAdminAuthHeaders()
    }, { retries: 1, timeoutMs: 8000 });
    renderAdminOverview();
    setText("#adminStatus", `${authUser.name} 관리자 페이지 정보가 업데이트되었습니다.`);
  } catch (error) {
    setText("#adminStatus", error.message || "내부관리자 정보를 불러오지 못했습니다.");
  }
}

async function fetchTile114SampleProducts() {
  if (authUser?.role !== "admin" || !authUser?.adminUsername || !authUser?.adminToken) {
    setText("#tile114Status", "관리자 로그인 후 거래사이트 샘플을 가져올 수 있습니다.");
    switchPage("loginPage");
    return;
  }

  const category = document.querySelector("#tile114Category")?.value || "5";
  const limit = Math.min(Math.max(Number(document.querySelector("#tile114Limit")?.value) || 5, 1), 10);
  const button = document.querySelector("#tile114FetchBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "가져오는 중...";
  }
  setText("#tile114Status", "거래사이트에 로그인해서 상품 샘플을 가져오는 중입니다...");

  try {
    const query = new URLSearchParams({
      category,
      limit: String(limit)
    });
    const result = await requestJson(`/api/admin/tile114-sample?${query}`, {
      headers: getAdminAuthHeaders()
    }, { retries: 1, timeoutMs: 60000 });
    renderTile114SampleGrid(result.products || []);
    setText("#tile114Status", `${result.categoryName || category} 카테고리에서 ${number(result.count || 0)}개 샘플을 가져왔습니다.`);
  } catch (error) {
    renderTile114SampleGrid([]);
    setText("#tile114Status", error.message || "거래사이트 샘플을 가져오지 못했습니다.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "샘플 가져오기";
    }
  }
}

function renderTile114SampleGrid(products) {
  const grid = document.querySelector("#tile114SampleGrid");
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = '<div class="empty-state">아직 가져온 샘플 상품이 없습니다.</div>';
    return;
  }

  grid.innerHTML = products.map((product) => `
    <article class="tile114-sample-card">
      ${product.imageDataUrl || product.imageUrl || product.thumbnailUrl
        ? `<img src="${escapeHtml(product.imageDataUrl || product.imageUrl || product.thumbnailUrl)}" alt="${escapeHtml(product.name || "거래사이트 상품")}" loading="lazy" />`
        : '<div class="tile114-sample-image-empty">이미지 없음</div>'}
      <div class="tile114-sample-copy">
        <span>${escapeHtml(product.categoryName || "-")}</span>
        <strong>${escapeHtml(product.name || "-")}</strong>
        <dl>
          <div><dt>거래처 ID</dt><dd>${escapeHtml(product.sourceId || "-")}</dd></div>
          <div><dt>규격</dt><dd>${escapeHtml(product.size || "-")}</dd></div>
          <div><dt>제조사</dt><dd>${escapeHtml(product.maker || "-")}</dd></div>
          <div><dt>단위</dt><dd>${escapeHtml(product.unit || "-")}</dd></div>
          <div><dt>도매가</dt><dd>${escapeHtml(product.wholesalePriceText || "-")}</dd></div>
          <div><dt>재고</dt><dd>${escapeHtml(product.stockText || "-")}</dd></div>
        </dl>
      </div>
    </article>
  `).join("");
}

async function pushCartToServer() {
  if (!authUser?.businessNumber) return;
  await requestJson("/api/cart", {
    method: "PUT",
    headers: getMemberProductAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      businessNumber: authUser.businessNumber,
      companyName: authUser.companyName || "",
      items: cart
    })
  }, { retries: 1, timeoutMs: 8000 });
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function number(value) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function normalizeSearchText(value) {
  return String(value ?? "").toLowerCase().replace(/[\s\-_./]/g, "");
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value));
  return String(value).replace(/["\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
