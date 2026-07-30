const fs = require("fs");
const path = require("path");

const DEFAULT_PAGE_SETTINGS = {
  homePage: {
    label: "메인",
    eyebrow: "현장 자재를 위한 올인원 B2B 플랫폼",
    title: "현장에 필요한 모든 자재,\n자재GO 하나로",
    description: "타일·위생도기·수전금구·부자재를 빠르게 찾고 주문과 배차까지 한곳에서 관리하세요.",
    heroImage: "images/branding/web-storefront-hero-20260706.png"
  },
  productsPage: {
    label: "타일GO",
    eyebrow: "TileGO",
    title: "타일GO",
    description: "규격, 용도, 마감, 스타일과 색상으로 필요한 타일을 찾습니다.",
    heroImage: ""
  },
  bathProductsPage: {
    label: "바스GO",
    eyebrow: "BathGO",
    title: "바스GO",
    description: "욕실에 필요한 위생도기와 수전금구를 한 번에 찾습니다.",
    heroImage: "images/catalog/catalog_p04_img00.webp?v=20260728-performance1"
  },
  bathInteriorPage: {
    label: "욕실 인테리어",
    eyebrow: "Bathroom Inspiration",
    title: "욕실 인테리어",
    description: "마음에 드는 공간을 고르면 사진 속 타일과 욕실 자재를 바로 확인할 수 있습니다.",
    heroImage: ""
  },
  taxonomyTestPage: {
    label: "AI 상품검색",
    eyebrow: "AI Product Search",
    title: "AI 상품검색",
    description: "자연어와 필터로 필요한 현장 자재를 빠르게 찾습니다.",
    heroImage: ""
  },
  aiTileFinderPage: {
    label: "AI 타일찾기",
    eyebrow: "AI Tile Finder",
    title: "AI 타일찾기",
    description: "사진의 색상과 패턴을 분석해 비슷한 타일을 찾습니다.",
    heroImage: ""
  },
  samplePage: {
    label: "샘플GO",
    eyebrow: "SampleGO",
    title: "샘플GO",
    description: "샘플로 확인할 타일을 선택하고 신청합니다.",
    heroImage: ""
  },
  quantityCalculatorPage: {
    label: "물량계산",
    eyebrow: "Quantity Calculator",
    title: "타일·부자재 물량계산",
    description: "현장 면적을 기준으로 타일과 시공 부자재 물량을 계산합니다.",
    heroImage: ""
  },
  cartPage: {
    label: "장바구니",
    eyebrow: "Selected Items",
    title: "장바구니",
    description: "선택한 자재와 주문 수량을 확인합니다.",
    heroImage: ""
  },
  myPage: {
    label: "마이페이지",
    eyebrow: "My Page",
    title: "마이페이지",
    description: "내 정보와 주문 현황을 한곳에서 관리합니다.",
    heroImage: ""
  },
  plannerPage: {
    label: "시공 미리보기",
    eyebrow: "Image Based Tile Preview",
    title: "시공 미리보기",
    description: "현장 사진에 선택한 타일을 적용해 원본과 결과를 바로 비교합니다.",
    heroImage: ""
  },
  renderPage: {
    label: "실사 보정",
    eyebrow: "AI Rendering",
    title: "실사 이미지 보정",
    description: "장바구니 자재를 현장 사진에 적용해 완성 이미지를 만듭니다.",
    heroImage: ""
  },
  loginPage: {
    label: "로그인",
    eyebrow: "Quick Login",
    title: "간편로그인",
    description: "네이버, 카카오, Google 계정 또는 사업자 정보로 로그인합니다.",
    heroImage: ""
  },
  signupPage: {
    label: "회원가입",
    eyebrow: "Jajaego Membership",
    title: "간편 회원가입",
    description: "소셜 계정으로 가입한 뒤 파트너 등록을 진행합니다.",
    heroImage: ""
  },
  businessOnboardingPage: {
    label: "사업자 정보",
    eyebrow: "Business Verification",
    title: "사업자 정보를 등록해주세요.",
    description: "사업자등록증 또는 사업자등록번호를 등록할 수 있습니다.",
    heroImage: ""
  },
  partnerApplicationPage: {
    label: "파트너 신청",
    eyebrow: "Partner Membership",
    title: "파트너 등록신청",
    description: "사업자등록증과 담당자 정보를 등록해 회원 등급을 신청합니다.",
    heroImage: ""
  }
};

Object.values(DEFAULT_PAGE_SETTINGS).forEach((page) => {
  Object.assign(page, {
    backgroundColor: "#ffffff",
    surfaceColor: "#ffffff",
    accentColor: "#0b5cff",
    textColor: "#141922",
    mutedTextColor: "#667085",
    borderColor: "#d8dee7",
    buttonColor: "#0b5cff",
    buttonTextColor: "#ffffff",
    fontFamily: "inherit",
    headingWeight: 800,
    textAlign: "left",
    headingScale: 100,
    bodyScale: 100,
    sectionGap: 24,
    contentPadding: 24,
    contentWidth: 1480,
    borderWidth: 1,
    cornerRadius: 8,
    shadowStrength: 8,
    imageRatio: "auto",
    imageFit: "cover",
    imagePosition: "center",
    buttonStyle: "solid",
    cardStyle: "bordered",
    contentEnabled: false,
    imageEnabled: false,
    designEnabled: false
  });
});

const DEFAULT_SITE_SETTINGS = {
  version: 3,
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
    homeBathroomTitle: "욕실 인테리어",
    homeBathroomSubtitle: "시공된 욕실 공간에서 자재 아이디어 보기",
    homeSearchTitle: "수전금구",
    homeSearchSubtitle: "세면·샤워·주방 수전 한 번에 보기",
    homeSampleTitle: "샘플GO",
    homeSampleSubtitle: "클릭으로 샘플받기",
    homePlannerTitle: "시공 미리보기",
    homePlannerSubtitle: "내 공간에 자재를 적용해 미리 확인",
    homeCartTitle: "장바구니·배송",
    homeCartSubtitle: "주문 수량과 현장 배송 확인",
    homeRecommendTitle: "베스트 타일",
    homeRecommendSubtitle: "새롭게 만나는 타일 30개",
    homeMyTitle: "마이페이지",
    homeMySubtitle: "주문·등급·거래처 관리",
    homeMaterialTitle: "부자재",
    homeMaterialSubtitle: "접착제·줄눈·실리콘·시공도구",
    tileHeroEyebrow: "TileGO Search",
    tileHeroTitle: "찾는 타일을 말하듯 입력하세요.",
    tileHeroDescription: "규격, 용도, 마감, 스타일과 색상을 해석하고 조건에 맞는 상품을 이미지 중심으로 보여드립니다.",
    tileSearchLabel: "AI 자연어 상품검색",
    tileSearchHint: "검색 후 사이즈·용도·마감·스타일·색상을 바로 조정할 수 있습니다.",
    bathHeroEyebrow: "BathGO Collection",
    bathHeroTitle: "욕실에 필요한 자재를\n한 번에 찾으세요.",
    bathSearchLabel: "바스GO 상품 검색"
  },
  images: {
    homeAi: "images/branding/home-ai-tile-robot-gold-20260728.webp?v=20260728-performance1",
    homeSample: "images/branding/home-tile-samples-pastel-20260727.webp?v=20260728-performance1",
    homeFaucet: "images/branding/home-faucet-20260727.webp?v=20260728-performance1",
    homeBath: "images/branding/home-bathgo-toilet-white.png",
    homeBathroom: "images/catalog/catalog_p04_img00.webp?v=20260728-performance1",
    homePlanner: "images/branding/home-construction-preview-blue-20260728.webp?v=20260728-performance1",
    homeRecommended: "images/branding/home-best-tiles-stacked-20260727-v2.webp?v=20260728-performance1",
    homeMaterial: "images/branding/home-materials-installation-20260728.webp?v=20260728-performance1",
    homeQuantity: "images/branding/home-quantity-calculator-20260728.webp?v=20260728-performance1",
    bathHero: "images/catalog/catalog_p04_img00.webp?v=20260728-performance1"
  },
  pages: DEFAULT_PAGE_SETTINGS,
  menu: [
    { id: "homePage", label: "메인", visible: true, order: 1 },
    { id: "taxonomyTestPage", label: "상품검색", visible: true, order: 2 },
    { id: "productsPage", label: "타일GO", visible: true, order: 3 },
    { id: "bathProductsPage", label: "바스GO", visible: true, order: 4 },
    { id: "cartPage", label: "장바구니", visible: true, order: 5 },
    { id: "myPage", label: "마이페이지", visible: true, order: 6 },
    { id: "plannerPage", label: "시공 미리보기", visible: true, order: 7 }
  ]
};

const FONT_FAMILIES = new Set(["system", "pretendard", "noto", "serif"]);
const FONT_SCALES = new Set(["compact", "default", "large"]);
const PAGE_FONT_FAMILIES = new Set(["inherit", "system", "pretendard", "noto", "serif"]);
const PAGE_TEXT_ALIGNMENTS = new Set(["left", "center", "right"]);
const PAGE_IMAGE_RATIOS = new Set(["auto", "square", "landscape", "portrait", "wide"]);
const PAGE_IMAGE_FITS = new Set(["cover", "contain", "fill"]);
const PAGE_IMAGE_POSITIONS = new Set(["center", "top", "bottom", "left", "right"]);
const PAGE_BUTTON_STYLES = new Set(["solid", "outline", "minimal"]);
const PAGE_CARD_STYLES = new Set(["flat", "bordered", "elevated"]);
const MENU_IDS = new Set(DEFAULT_SITE_SETTINGS.menu.map((item) => item.id));
const PAGE_IDS = new Set(Object.keys(DEFAULT_PAGE_SETTINGS));

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

function cleanPageText(source, key, fallback, maxLength) {
  if (!Object.prototype.hasOwnProperty.call(source, key)) return fallback;
  return String(source[key] ?? "").replace(/\u0000/g, "").trim().slice(0, maxLength);
}

function cleanPageImage(source, fallback) {
  if (!Object.prototype.hasOwnProperty.call(source, "heroImage")) return fallback;
  const value = String(source.heroImage || "").trim();
  return value ? cleanImage(value, fallback) : "";
}

function sanitizeSiteSettings(input = {}) {
  const defaults = DEFAULT_SITE_SETTINGS;
  const appearanceInput = input.appearance && typeof input.appearance === "object" ? input.appearance : {};
  const textInput = input.text && typeof input.text === "object" ? input.text : {};
  const imageInput = input.images && typeof input.images === "object" ? input.images : {};
  const pageInput = input.pages && typeof input.pages === "object" ? input.pages : {};
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

  const pages = {};
  PAGE_IDS.forEach((pageId) => {
    const fallback = defaults.pages[pageId];
    const source = pageInput[pageId] && typeof pageInput[pageId] === "object" ? pageInput[pageId] : {};
    pages[pageId] = {
      label: fallback.label,
      eyebrow: cleanPageText(source, "eyebrow", fallback.eyebrow, 100),
      title: cleanPageText(source, "title", fallback.title, 180),
      description: cleanPageText(source, "description", fallback.description, 420),
      heroImage: cleanPageImage(source, fallback.heroImage),
      backgroundColor: cleanColor(source.backgroundColor, fallback.backgroundColor),
      surfaceColor: cleanColor(source.surfaceColor, fallback.surfaceColor),
      accentColor: cleanColor(source.accentColor, fallback.accentColor),
      textColor: cleanColor(source.textColor, fallback.textColor),
      mutedTextColor: cleanColor(source.mutedTextColor, fallback.mutedTextColor),
      borderColor: cleanColor(source.borderColor, fallback.borderColor),
      buttonColor: cleanColor(source.buttonColor, fallback.buttonColor),
      buttonTextColor: cleanColor(source.buttonTextColor, fallback.buttonTextColor),
      fontFamily: PAGE_FONT_FAMILIES.has(source.fontFamily) ? source.fontFamily : fallback.fontFamily,
      headingWeight: cleanNumber(source.headingWeight, fallback.headingWeight, 400, 900),
      textAlign: PAGE_TEXT_ALIGNMENTS.has(source.textAlign) ? source.textAlign : fallback.textAlign,
      headingScale: cleanNumber(source.headingScale, fallback.headingScale, 70, 180),
      bodyScale: cleanNumber(source.bodyScale, fallback.bodyScale, 80, 140),
      sectionGap: cleanNumber(source.sectionGap, fallback.sectionGap, 8, 96),
      contentPadding: cleanNumber(source.contentPadding, fallback.contentPadding, 0, 64),
      contentWidth: cleanNumber(source.contentWidth, fallback.contentWidth, 720, 1800),
      borderWidth: cleanNumber(source.borderWidth, fallback.borderWidth, 0, 4),
      cornerRadius: cleanNumber(source.cornerRadius, fallback.cornerRadius, 0, 32),
      shadowStrength: cleanNumber(source.shadowStrength, fallback.shadowStrength, 0, 40),
      imageRatio: PAGE_IMAGE_RATIOS.has(source.imageRatio) ? source.imageRatio : fallback.imageRatio,
      imageFit: PAGE_IMAGE_FITS.has(source.imageFit) ? source.imageFit : fallback.imageFit,
      imagePosition: PAGE_IMAGE_POSITIONS.has(source.imagePosition) ? source.imagePosition : fallback.imagePosition,
      buttonStyle: PAGE_BUTTON_STYLES.has(source.buttonStyle) ? source.buttonStyle : fallback.buttonStyle,
      cardStyle: PAGE_CARD_STYLES.has(source.cardStyle) ? source.cardStyle : fallback.cardStyle,
      contentEnabled: source.contentEnabled === true,
      imageEnabled: source.imageEnabled === true,
      designEnabled: source.designEnabled === true
    };
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
    pages,
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
