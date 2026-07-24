const fs = require("fs");
const path = require("path");

const DEFAULT_SITE_SETTINGS = {
  version: 1,
  appearance: {
    fontFamily: "system",
    fontScale: "default",
    primaryColor: "#0b5cff",
    inkColor: "#141922",
    pageColor: "#ffffff",
    surfaceColor: "#ffffff",
    cornerRadius: 8,
    contentWidth: 1480,
    productColumnsDesktop: 4,
    productColumnsMobile: 2,
    homeTileGap: 18
  },
  text: {
    homeHeadline: "자재GO,",
    homeDescription: "현장 자재를 찾는 가장 빠르고 명확한 방법.",
    homeDetails: "타일 · 위생도기 · 수전금구 · 욕실자재\n검색부터 주문과 시공 이미지까지",
    homeTileGoTitle: "타일GO",
    homeTileGoSubtitle: "사이즈·마감·스타일로 찾기",
    homeAiTitle: "AI 타일검색",
    homeAiSubtitle: "사진과 자연어로 비슷한 타일 찾기",
    homeBathTitle: "바스GO",
    homeBathSubtitle: "욕실 자재 한 번에 찾기",
    homeBathroomTitle: "욕실 공간",
    homeBathroomSubtitle: "위생도기·수전·욕실장",
    homeSearchTitle: "상품검색",
    homeSearchSubtitle: "필요한 조건만 빠르게 선택",
    homeSampleTitle: "샘플GO",
    homeSampleSubtitle: "SNT 샘플을 현장에서 확인",
    homePlannerTitle: "시공보기",
    homePlannerSubtitle: "공간에 자재를 미리 적용",
    homeCartTitle: "장바구니·배송",
    homeCartSubtitle: "주문 수량과 현장 배송 확인",
    homeRecommendTitle: "추천 타일",
    homeRecommendSubtitle: "현장에서 자주 찾는 디자인",
    homeMyTitle: "마이페이지",
    homeMySubtitle: "주문·등급·거래처 관리",
    tileHeroEyebrow: "TileGO Search",
    tileHeroTitle: "찾는 타일을 말하듯 입력하세요.",
    tileHeroDescription: "규격, 용도, 마감, 스타일과 색상을 해석하고 조건에 맞는 상품을 이미지 중심으로 보여드립니다.",
    tileSearchLabel: "AI 자연어 상품검색",
    tileSearchHint: "검색 후 사이즈·용도·마감·스타일·색상을 바로 조정할 수 있습니다.",
    bathHeroEyebrow: "BathGO Collection",
    bathHeroTitle: "욕실에 필요한 자재를\n한 번에 찾으세요.",
    bathHeroDescription: "수전, 세면대, 욕조, 양변기, 욕실장과 액세서리를 품목과 모델명으로 빠르게 검색할 수 있습니다.",
    bathSearchLabel: "바스GO 상품 검색"
  },
  images: {
    homeAi: "images/catalog/catalog_p16_img01.jpg",
    homeBathroom: "images/catalog/catalog_p04_img00.jpg",
    homePlanner: "images/catalog/catalog_p05_img00.jpg",
    homeRecommended: "images/catalog/catalog_p12_img01.jpg",
    bathHero: "images/catalog/catalog_p04_img00.jpg"
  },
  menu: [
    { id: "homePage", label: "메인", visible: true, order: 1 },
    { id: "taxonomyTestPage", label: "상품검색", visible: true, order: 2 },
    { id: "productsPage", label: "타일GO", visible: true, order: 3 },
    { id: "bathProductsPage", label: "바스GO", visible: true, order: 4 },
    { id: "cartPage", label: "장바구니", visible: true, order: 5 },
    { id: "myPage", label: "마이페이지", visible: true, order: 6 },
    { id: "plannerPage", label: "시공보기", visible: true, order: 7 }
  ]
};

const FONT_FAMILIES = new Set(["system", "pretendard", "noto", "serif"]);
const FONT_SCALES = new Set(["compact", "default", "large"]);
const MENU_IDS = new Set(DEFAULT_SITE_SETTINGS.menu.map((item) => item.id));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanText(value, fallback, maxLength = 240) {
  const clean = String(value ?? "").replace(/\u0000/g, "").trim();
  return clean ? clean.slice(0, maxLength) : fallback;
}

function cleanColor(value, fallback) {
  const clean = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(clean) ? clean.toLowerCase() : fallback;
}

function cleanNumber(value, fallback, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(Math.max(numeric, min), max) : fallback;
}

function cleanImage(value, fallback) {
  const clean = String(value || "").trim();
  if (!clean) return fallback;
  if (/^https:\/\/[^\s]+$/i.test(clean)) return clean.slice(0, 1600);
  if (/^(?:\/?uploads\/site-studio\/|images\/)[a-z0-9_./?=&%-]+$/i.test(clean)) return clean.slice(0, 1600);
  return fallback;
}

function sanitizeSiteSettings(input = {}) {
  const defaults = DEFAULT_SITE_SETTINGS;
  const appearanceInput = input.appearance && typeof input.appearance === "object" ? input.appearance : {};
  const textInput = input.text && typeof input.text === "object" ? input.text : {};
  const imageInput = input.images && typeof input.images === "object" ? input.images : {};
  const menuInput = Array.isArray(input.menu) ? input.menu : [];
  const menuById = new Map(menuInput.map((item) => [String(item?.id || ""), item]));

  const text = {};
  Object.entries(defaults.text).forEach(([key, fallback]) => {
    text[key] = cleanText(textInput[key], fallback, key.endsWith("Description") || key === "homeDetails" ? 420 : 100);
  });

  const images = {};
  Object.entries(defaults.images).forEach(([key, fallback]) => {
    images[key] = cleanImage(imageInput[key], fallback);
  });

  return {
    version: defaults.version,
    appearance: {
      fontFamily: FONT_FAMILIES.has(appearanceInput.fontFamily) ? appearanceInput.fontFamily : defaults.appearance.fontFamily,
      fontScale: FONT_SCALES.has(appearanceInput.fontScale) ? appearanceInput.fontScale : defaults.appearance.fontScale,
      primaryColor: cleanColor(appearanceInput.primaryColor, defaults.appearance.primaryColor),
      inkColor: cleanColor(appearanceInput.inkColor, defaults.appearance.inkColor),
      pageColor: cleanColor(appearanceInput.pageColor, defaults.appearance.pageColor),
      surfaceColor: cleanColor(appearanceInput.surfaceColor, defaults.appearance.surfaceColor),
      cornerRadius: cleanNumber(appearanceInput.cornerRadius, defaults.appearance.cornerRadius, 0, 24),
      contentWidth: cleanNumber(appearanceInput.contentWidth, defaults.appearance.contentWidth, 1080, 1800),
      productColumnsDesktop: cleanNumber(appearanceInput.productColumnsDesktop, defaults.appearance.productColumnsDesktop, 2, 6),
      productColumnsMobile: cleanNumber(appearanceInput.productColumnsMobile, defaults.appearance.productColumnsMobile, 1, 2),
      homeTileGap: cleanNumber(appearanceInput.homeTileGap, defaults.appearance.homeTileGap, 8, 36)
    },
    text,
    images,
    menu: defaults.menu.map((defaultItem, index) => {
      const source = menuById.get(defaultItem.id) || {};
      return {
        id: defaultItem.id,
        label: cleanText(source.label, defaultItem.label, 24),
        visible: source.visible !== false,
        order: cleanNumber(source.order, index + 1, 1, defaults.menu.length)
      };
    }).sort((left, right) => left.order - right.order)
  };
}

function createSiteSettingsService(options = {}) {
  const settingsPath = options.settingsPath;

  async function read() {
    try {
      const payload = JSON.parse(await fs.promises.readFile(settingsPath, "utf8"));
      return {
        ...sanitizeSiteSettings(payload),
        updatedAt: String(payload.updatedAt || ""),
        updatedBy: String(payload.updatedBy || "")
      };
    } catch {
      return clone(DEFAULT_SITE_SETTINGS);
    }
  }

  async function save(input, reviewer = "admin") {
    const current = await read();
    const next = {
      ...sanitizeSiteSettings(input),
      updatedAt: new Date().toISOString(),
      updatedBy: cleanText(reviewer, "admin", 80)
    };
    await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.promises.writeFile(`${settingsPath}.tmp`, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    await fs.promises.rename(`${settingsPath}.tmp`, settingsPath);
    return { settings: next, previous: current };
  }

  async function reset(reviewer = "admin") {
    return save(clone(DEFAULT_SITE_SETTINGS), reviewer);
  }

  return {
    defaults: clone(DEFAULT_SITE_SETTINGS),
    read,
    reset,
    sanitize: sanitizeSiteSettings,
    save
  };
}

module.exports = {
  DEFAULT_SITE_SETTINGS,
  createSiteSettingsService,
  sanitizeSiteSettings
};
