(function attachSiteStudio(global) {
  const DEFAULT_SETTINGS = {
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
    pages: {
      homePage: pageDefaults("메인", "현장 자재를 위한 올인원 B2B 플랫폼", "현장에 필요한 모든 자재,\n자재GO 하나로", "타일·위생도기·수전금구·부자재를 빠르게 찾고 주문과 배차까지 한곳에서 관리하세요.", "images/branding/web-storefront-hero-20260706.png"),
      productsPage: pageDefaults("타일GO", "TileGO", "타일GO", "규격, 용도, 마감, 스타일과 색상으로 필요한 타일을 찾습니다."),
      bathProductsPage: pageDefaults("바스GO", "BathGO", "바스GO", "욕실에 필요한 위생도기와 수전금구를 한 번에 찾습니다.", "images/catalog/catalog_p04_img00.webp?v=20260728-performance1"),
      bathInteriorPage: pageDefaults("욕실 인테리어", "Bathroom Inspiration", "욕실 인테리어", "마음에 드는 공간을 고르면 사진 속 타일과 욕실 자재를 바로 확인할 수 있습니다."),
      taxonomyTestPage: pageDefaults("AI 상품검색", "AI Product Search", "AI 상품검색", "자연어와 필터로 필요한 현장 자재를 빠르게 찾습니다."),
      aiTileFinderPage: pageDefaults("AI 타일찾기", "AI Tile Finder", "AI 타일찾기", "사진의 색상과 패턴을 분석해 비슷한 타일을 찾습니다."),
      samplePage: pageDefaults("샘플GO", "SampleGO", "샘플GO", "샘플로 확인할 타일을 선택하고 신청합니다."),
      quantityCalculatorPage: pageDefaults("물량계산", "Quantity Calculator", "타일·부자재 물량계산", "현장 면적을 기준으로 타일과 시공 부자재 물량을 계산합니다."),
      cartPage: pageDefaults("장바구니", "Selected Items", "장바구니", "선택한 자재와 주문 수량을 확인합니다."),
      myPage: pageDefaults("마이페이지", "My Page", "마이페이지", "내 정보와 주문 현황을 한곳에서 관리합니다."),
      plannerPage: pageDefaults("시공 미리보기", "Image Based Tile Preview", "시공 미리보기", "현장 사진에 선택한 타일을 적용해 원본과 결과를 바로 비교합니다."),
      renderPage: pageDefaults("실사 보정", "AI Rendering", "실사 이미지 보정", "장바구니 자재를 현장 사진에 적용해 완성 이미지를 만듭니다."),
      loginPage: pageDefaults("로그인", "Quick Login", "간편로그인", "네이버, 카카오, Google 계정 또는 사업자 정보로 로그인합니다."),
      signupPage: pageDefaults("회원가입", "Jajaego Membership", "간편 회원가입", "소셜 계정으로 가입한 뒤 파트너 등록을 진행합니다."),
      businessOnboardingPage: pageDefaults("사업자 정보", "Business Verification", "사업자 정보를 등록해주세요.", "사업자등록증 또는 사업자등록번호를 등록할 수 있습니다."),
      partnerApplicationPage: pageDefaults("파트너 신청", "Partner Membership", "파트너 등록신청", "사업자등록증과 담당자 정보를 등록해 회원 등급을 신청합니다.")
    },
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

  function pageDefaults(label, eyebrow, title, description, heroImage = "") {
    return {
      label,
      eyebrow,
      title,
      description,
      heroImage,
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
    };
  }

  const PAGE_DEFINITIONS = [
    ["homePage", "메인", { eyebrow: "#homePage .guest-promotion-kicker", title: "#guestPromotionTitle", description: "#homePage .guest-promotion-hero-copy > p", image: "#homePage .guest-promotion-hero-image" }],
    ["productsPage", "타일GO"],
    ["bathProductsPage", "바스GO", { image: "#bathProductsPage .bath-editorial-hero > img" }],
    ["bathInteriorPage", "욕실 인테리어"],
    ["taxonomyTestPage", "AI 상품검색"],
    ["aiTileFinderPage", "AI 타일찾기"],
    ["samplePage", "샘플GO"],
    ["quantityCalculatorPage", "물량계산"],
    ["cartPage", "장바구니"],
    ["myPage", "마이페이지"],
    ["plannerPage", "시공 미리보기"],
    ["renderPage", "실사 보정"],
    ["loginPage", "로그인", { eyebrow: "#loginPage .login-card .eyebrow", title: "#loginPage .login-card h2", description: "#loginPage .login-card > p:not(.eyebrow)" }],
    ["signupPage", "회원가입", { eyebrow: "#signupPage .eyebrow", title: "#signupPage h2", description: "#signupPage .social-signup-copy" }],
    ["businessOnboardingPage", "사업자 정보", { eyebrow: "#businessOnboardingPage .eyebrow", title: "#businessOnboardingPage h2", description: "#businessOnboardingPage .business-onboarding-copy" }],
    ["partnerApplicationPage", "파트너 신청", { eyebrow: "#partnerApplicationPage .eyebrow", title: "#partnerApplicationPage h2", description: "#partnerApplicationPage .partner-application-copy" }]
  ].map(([id, label, selectors = {}]) => ({
    id,
    label,
    selectors: {
      eyebrow: selectors.eyebrow || `#${id} > .page-heading .eyebrow`,
      title: selectors.title || `#${id} > .page-heading h2`,
      description: selectors.description || `#${id} > .page-heading > div:first-child > p:not(.eyebrow)`,
      image: selectors.image || ""
    }
  }));

  const PAGE_DEFINITION_BY_ID = new Map(PAGE_DEFINITIONS.map((page) => [page.id, page]));
  const originalPageNodes = new WeakMap();

  const TEXT_FIELDS = [
    ["메인", "homeHeadline", "메인 제목", "input"],
    ["메인", "homeDescription", "메인 설명", "textarea"],
    ["메인", "homeDetails", "메인 상세 문구", "textarea"],
    ["메인 카드", "homeTileGoTitle", "타일GO 제목", "input"],
    ["메인 카드", "homeTileGoSubtitle", "타일GO 설명", "input"],
    ["메인 카드", "homeAiTitle", "AI 검색 제목", "input"],
    ["메인 카드", "homeAiSubtitle", "AI 검색 설명", "input"],
    ["메인 카드", "homeBathTitle", "바스GO 제목", "input"],
    ["메인 카드", "homeBathSubtitle", "바스GO 설명", "input"],
    ["메인 카드", "homeBathroomTitle", "욕실 인테리어 제목", "input"],
    ["메인 카드", "homeBathroomSubtitle", "욕실 인테리어 설명", "input"],
    ["메인 카드", "homeSearchTitle", "수전금구 제목", "input"],
    ["메인 카드", "homeSearchSubtitle", "수전금구 설명", "input"],
    ["메인 카드", "homeSampleTitle", "샘플GO 제목", "input"],
    ["메인 카드", "homeSampleSubtitle", "샘플GO 설명", "input"],
    ["메인 카드", "homePlannerTitle", "시공 미리보기 제목", "input"],
    ["메인 카드", "homePlannerSubtitle", "시공 미리보기 설명", "input"],
    ["메인 카드", "homeCartTitle", "장바구니 제목", "input"],
    ["메인 카드", "homeCartSubtitle", "장바구니 설명", "input"],
    ["메인 카드", "homeRecommendTitle", "베스트 타일 제목", "input"],
    ["메인 카드", "homeRecommendSubtitle", "베스트 타일 설명", "input"],
    ["메인 카드", "homeMyTitle", "마이페이지 제목", "input"],
    ["메인 카드", "homeMySubtitle", "마이페이지 설명", "input"],
    ["메인 카드", "homeMaterialTitle", "부자재 제목", "input"],
    ["메인 카드", "homeMaterialSubtitle", "부자재 설명", "input"],
    ["타일GO", "tileHeroEyebrow", "검색 영문 라벨", "input"],
    ["타일GO", "tileHeroTitle", "검색 제목", "input"],
    ["타일GO", "tileHeroDescription", "검색 설명", "textarea"],
    ["타일GO", "tileSearchLabel", "검색 입력 라벨", "input"],
    ["타일GO", "tileSearchHint", "검색 도움말", "textarea"],
    ["바스GO", "bathHeroEyebrow", "컬렉션 영문 라벨", "input"],
    ["바스GO", "bathHeroTitle", "히어로 제목", "textarea"],
    ["바스GO", "bathSearchLabel", "검색 입력 라벨", "input"]
  ];

  const IMAGE_FIELDS = [
    ["homeAi", "메인 AI 타일검색", "권장 1200×1200 이상"],
    ["homeSample", "메인 샘플GO", "권장 1200×1200 이상"],
    ["homeFaucet", "메인 수전금구", "권장 1200×1200 이상"],
    ["homeBath", "메인 바스GO", "권장 1200×1200 이상"],
    ["homeBathroom", "메인 욕실 인테리어", "권장 1200×1200 이상"],
    ["homePlanner", "메인 시공 미리보기", "권장 1200×1200 이상"],
    ["homeRecommended", "메인 베스트 타일", "권장 1200×1200 이상"],
    ["homeMaterial", "메인 부자재", "권장 1200×1200 이상"],
    ["homeQuantity", "메인 물량계산", "권장 1200×1200 이상"],
    ["bathHero", "바스GO 대표 이미지", "권장 1800×900 이상"]
  ];

  const state = {
    callbacks: null,
    saved: clone(DEFAULT_SETTINGS),
    draft: clone(DEFAULT_SETTINGS),
    defaults: clone(DEFAULT_SETTINGS),
    initialized: false,
    loading: false,
    activeSection: "siteStudioOverviewSection",
    activePageId: "homePage",
    activeTextGroup: "all",
    textSearch: "",
    previewDevice: "desktop",
    history: [],
    future: [],
    lastHistoryKey: "",
    lastHistoryAt: 0
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function changedValueCount(savedValue = state.saved, draftValue = state.draft) {
    let count = 0;
    function visit(left, right) {
      if (Array.isArray(left) || Array.isArray(right)) {
        if (JSON.stringify(left) !== JSON.stringify(right)) count += 1;
        return;
      }
      if ((left && typeof left === "object") || (right && typeof right === "object")) {
        const keys = new Set([
          ...Object.keys(left && typeof left === "object" ? left : {}),
          ...Object.keys(right && typeof right === "object" ? right : {})
        ]);
        keys.forEach((key) => visit(left?.[key], right?.[key]));
        return;
      }
      if (left !== right) count += 1;
    }
    visit(savedValue, draftValue);
    return count;
  }

  function recordHistory(key = "edit") {
    const now = Date.now();
    if (state.lastHistoryKey === key && now - state.lastHistoryAt < 700) {
      state.lastHistoryAt = now;
      return;
    }
    state.history.push(clone(state.draft));
    if (state.history.length > 40) state.history.shift();
    state.future = [];
    state.lastHistoryKey = key;
    state.lastHistoryAt = now;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const canUndo = state.history.length > 0;
    const canRedo = state.future.length > 0;
    ["#siteStudioUndoBtn", "#siteStudioUndoBottomBtn"].forEach((selector) => {
      const button = document.querySelector(selector);
      if (button) button.disabled = !canUndo;
    });
    const redoButton = document.querySelector("#siteStudioRedoBtn");
    if (redoButton) redoButton.disabled = !canRedo;
  }

  function restoreDraft(snapshot) {
    state.draft = mergeSettings(snapshot);
    applySettings(state.draft);
    renderAllEditors();
    setActiveSection(state.activeSection);
  }

  function undoDraft() {
    if (!state.history.length) return;
    state.future.push(clone(state.draft));
    restoreDraft(state.history.pop());
    state.lastHistoryKey = "";
    updateHistoryButtons();
    setStatus("직전 변경을 취소했습니다.");
  }

  function redoDraft() {
    if (!state.future.length) return;
    state.history.push(clone(state.draft));
    restoreDraft(state.future.pop());
    state.lastHistoryKey = "";
    updateHistoryButtons();
    setStatus("취소한 변경을 다시 적용했습니다.");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function mergeSettings(input) {
    const source = input && typeof input === "object" ? input : {};
    const sourcePages = source.pages && typeof source.pages === "object" ? source.pages : {};
    return {
      ...clone(DEFAULT_SETTINGS),
      ...source,
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(source.appearance || {}) },
      text: { ...DEFAULT_SETTINGS.text, ...(source.text || {}) },
      images: { ...DEFAULT_SETTINGS.images, ...(source.images || {}) },
      pages: Object.fromEntries(PAGE_DEFINITIONS.map(({ id }) => [
        id,
        { ...DEFAULT_SETTINGS.pages[id], ...(sourcePages[id] || {}) }
      ])),
      menu: Array.isArray(source.menu) && source.menu.length ? source.menu.map((item) => ({ ...item })) : clone(DEFAULT_SETTINGS.menu)
    };
  }

  function fontStack(fontFamily) {
    if (fontFamily === "pretendard") return '"Pretendard", "Noto Sans KR", "Segoe UI", sans-serif';
    if (fontFamily === "noto") return '"Noto Sans KR", "Segoe UI", Arial, sans-serif';
    if (fontFamily === "serif") return '"Noto Serif KR", "Nanum Myeongjo", Georgia, serif';
    return '"Segoe UI", "Noto Sans KR", Arial, sans-serif';
  }

  function pageFontStack(fontFamily) {
    return fontFamily === "inherit" ? "var(--site-font-family)" : fontStack(fontFamily);
  }

  function imageRatioValue(imageRatio) {
    return {
      square: "1 / 1",
      landscape: "4 / 3",
      portrait: "3 / 4",
      wide: "16 / 9"
    }[imageRatio] || "auto";
  }

  function backgroundImageFitValue(imageFit) {
    return imageFit === "fill" ? "100% 100%" : imageFit;
  }

  function flexAlignmentValue(textAlign) {
    if (textAlign === "center") return "center";
    if (textAlign === "right") return "flex-end";
    return "flex-start";
  }

  function setMenuLabel(node, label) {
    const copy = node.querySelector(".nav-copy");
    if (copy) {
      const cartCount = copy.querySelector("#navCartCount");
      copy.textContent = label;
      if (cartCount) {
        copy.append(" ");
        copy.append(cartCount);
      }
      return;
    }
    const mobileCopy = node.querySelector(":scope > span:last-child");
    if (mobileCopy) mobileCopy.textContent = label;
  }

  function rememberOriginalNode(node) {
    if (!node || originalPageNodes.has(node)) return;
    originalPageNodes.set(node, {
      html: node.innerHTML,
      src: node.getAttribute?.("src"),
      style: node.getAttribute?.("style")
    });
  }

  function restoreOriginalContent(node) {
    if (!node) return;
    rememberOriginalNode(node);
    const original = originalPageNodes.get(node);
    node.innerHTML = original.html;
    node.classList.remove("site-page-editor-text");
  }

  function applyPageText(selector, value, enabled, settings) {
    const node = selector ? document.querySelector(selector) : null;
    if (!node) return;
    rememberOriginalNode(node);
    if (!enabled) {
      if (!node.classList.contains("site-page-editor-text")) return;
      const sharedKey = node.dataset.siteText;
      if (sharedKey && Object.prototype.hasOwnProperty.call(settings.text, sharedKey)) {
        node.textContent = settings.text[sharedKey];
        node.classList.remove("site-page-editor-text");
      } else {
        restoreOriginalContent(node);
      }
      return;
    }
    node.textContent = value || "";
    node.classList.add("site-page-editor-text");
  }

  function applyPageImage(pageNode, definition, pageSettings, settings) {
    const imageNode = definition.selectors.image
      ? document.querySelector(definition.selectors.image)
      : null;
    if (imageNode) {
      rememberOriginalNode(imageNode);
      const original = originalPageNodes.get(imageNode);
      if (pageSettings.imageEnabled && pageSettings.heroImage) {
        imageNode.setAttribute("src", pageSettings.heroImage);
        imageNode.classList.add("site-page-editor-image");
      } else if (imageNode.classList.contains("site-page-editor-image")) {
        const sharedKey = imageNode.dataset.siteImage;
        if (sharedKey && settings.images[sharedKey]) imageNode.setAttribute("src", settings.images[sharedKey]);
        else if (original.src) imageNode.setAttribute("src", original.src);
        else imageNode.removeAttribute("src");
        imageNode.classList.remove("site-page-editor-image");
      }
      imageNode.classList.toggle("site-page-managed-image", pageSettings.designEnabled);
      if (pageSettings.designEnabled) {
        imageNode.style.setProperty("--site-page-image-ratio", imageRatioValue(pageSettings.imageRatio));
        imageNode.style.setProperty("--site-page-image-fit", pageSettings.imageFit);
        imageNode.style.setProperty("--site-page-image-position", pageSettings.imagePosition);
      } else {
        [
          "--site-page-image-ratio",
          "--site-page-image-fit",
          "--site-page-image-position"
        ].forEach((property) => imageNode.style.removeProperty(property));
      }
    }
    pageNode.classList.toggle(
      "site-page-image-enabled",
      !imageNode && pageSettings.imageEnabled && Boolean(pageSettings.heroImage)
    );
    if (!imageNode && pageSettings.imageEnabled && pageSettings.heroImage) {
      pageNode.style.setProperty("--site-page-hero-image", `url("${String(pageSettings.heroImage).replace(/"/g, '\\"')}")`);
    } else {
      pageNode.style.removeProperty("--site-page-hero-image");
    }
  }

  function applyPageSettings(pageSettingsInput = {}, settings = state.draft) {
    PAGE_DEFINITIONS.forEach((definition) => {
      const pageNode = document.querySelector(`#${definition.id}`);
      const pageSettings = pageSettingsInput[definition.id];
      if (!pageNode || !pageSettings) return;

      applyPageText(definition.selectors.eyebrow, pageSettings.eyebrow, pageSettings.contentEnabled, settings);
      applyPageText(definition.selectors.title, pageSettings.title, pageSettings.contentEnabled, settings);
      applyPageText(definition.selectors.description, pageSettings.description, pageSettings.contentEnabled, settings);
      applyPageImage(pageNode, definition, pageSettings, settings);

      pageNode.classList.toggle("site-page-designed", pageSettings.designEnabled);
      if (pageSettings.designEnabled) {
        pageNode.style.setProperty("--site-page-background", pageSettings.backgroundColor);
        pageNode.style.setProperty("--site-page-surface", pageSettings.surfaceColor);
        pageNode.style.setProperty("--site-page-accent", pageSettings.accentColor);
        pageNode.style.setProperty("--site-page-text", pageSettings.textColor);
        pageNode.style.setProperty("--site-page-muted", pageSettings.mutedTextColor);
        pageNode.style.setProperty("--site-page-border", pageSettings.borderColor);
        pageNode.style.setProperty("--site-page-button", pageSettings.buttonColor);
        pageNode.style.setProperty("--site-page-button-text", pageSettings.buttonTextColor);
        pageNode.style.setProperty("--site-page-font-family", pageFontStack(pageSettings.fontFamily));
        pageNode.style.setProperty("--site-page-heading-weight", String(pageSettings.headingWeight));
        pageNode.style.setProperty("--site-page-text-align", pageSettings.textAlign);
        pageNode.style.setProperty("--site-page-heading-scale", String(Number(pageSettings.headingScale || 100) / 100));
        pageNode.style.setProperty("--site-page-body-scale", String(Number(pageSettings.bodyScale || 100) / 100));
        pageNode.style.setProperty("--site-page-section-gap", `${Number(pageSettings.sectionGap || 24)}px`);
        pageNode.style.setProperty("--site-page-content-padding", `${Number(pageSettings.contentPadding || 24)}px`);
        pageNode.style.setProperty("--site-page-content-width", `${Number(pageSettings.contentWidth || 1480)}px`);
        pageNode.style.setProperty("--site-page-border-width", `${Number(pageSettings.borderWidth || 0)}px`);
        pageNode.style.setProperty("--site-page-corner-radius", `${Number(pageSettings.cornerRadius || 0)}px`);
        pageNode.style.setProperty(
          "--site-page-shadow",
          `0 12px 32px rgb(16 24 40 / ${Number(pageSettings.shadowStrength || 0)}%)`
        );
        pageNode.style.setProperty("--site-page-image-ratio", imageRatioValue(pageSettings.imageRatio));
        pageNode.style.setProperty("--site-page-image-fit", pageSettings.imageFit);
        pageNode.style.setProperty("--site-page-background-fit", backgroundImageFitValue(pageSettings.imageFit));
        pageNode.style.setProperty("--site-page-image-position", pageSettings.imagePosition);
        pageNode.dataset.siteButtonStyle = pageSettings.buttonStyle;
        pageNode.dataset.siteCardStyle = pageSettings.cardStyle;
      } else {
        [
          "--site-page-background",
          "--site-page-surface",
          "--site-page-accent",
          "--site-page-text",
          "--site-page-muted",
          "--site-page-border",
          "--site-page-button",
          "--site-page-button-text",
          "--site-page-font-family",
          "--site-page-heading-weight",
          "--site-page-text-align",
          "--site-page-heading-scale",
          "--site-page-body-scale",
          "--site-page-section-gap",
          "--site-page-content-padding",
          "--site-page-content-width",
          "--site-page-border-width",
          "--site-page-corner-radius",
          "--site-page-shadow",
          "--site-page-image-ratio",
          "--site-page-image-fit",
          "--site-page-background-fit",
          "--site-page-image-position"
        ].forEach((property) => pageNode.style.removeProperty(property));
        delete pageNode.dataset.siteButtonStyle;
        delete pageNode.dataset.siteCardStyle;
      }
    });
  }

  function applySettings(settingsInput) {
    const settings = mergeSettings(settingsInput);
    const root = document.documentElement;
    const appearance = settings.appearance;
    root.style.setProperty("--site-primary", appearance.primaryColor);
    root.style.setProperty("--site-ink", appearance.inkColor);
    root.style.setProperty("--site-page", appearance.pageColor);
    root.style.setProperty("--site-surface", appearance.surfaceColor);
    root.style.setProperty("--site-radius", `${appearance.cornerRadius}px`);
    root.style.setProperty("--site-content-width", `${appearance.contentWidth}px`);
    root.style.setProperty("--site-product-columns-desktop", String(appearance.productColumnsDesktop));
    root.style.setProperty("--site-product-columns-mobile", String(appearance.productColumnsMobile));
    root.style.setProperty("--site-home-gap", `${appearance.homeTileGap}px`);
    root.style.setProperty("--site-font-family", fontStack(appearance.fontFamily));

    document.body.classList.remove("site-font-compact", "site-font-default", "site-font-large");
    document.body.classList.add(`site-font-${appearance.fontScale}`);

    Object.entries(settings.text).forEach(([key, value]) => {
      document.querySelectorAll(`[data-site-text="${key}"]`).forEach((node) => {
        node.textContent = value;
      });
    });
    Object.entries(settings.images).forEach(([key, value]) => {
      document.querySelectorAll(`[data-site-image="${key}"]`).forEach((node) => {
        node.setAttribute("src", value);
      });
    });
    applyPageSettings(settings.pages, settings);

    settings.menu.forEach((item) => {
      document.querySelectorAll(`.customer-nav-button[data-page-target="${item.id}"], .square-main-mobile-nav [data-page-target="${item.id}"]`).forEach((node) => {
        node.classList.toggle("site-menu-hidden", item.visible === false);
        node.style.order = String(item.order || 0);
        setMenuLabel(node, item.label);
      });
    });
    document.body.dataset.siteSettingsReady = "true";
  }

  async function loadPublicSettings(callbacks = null) {
    try {
      const request = callbacks?.requestJson
        ? callbacks.requestJson("/api/site-settings", {}, { retries: 1, timeoutMs: 5000 })
        : fetch("/api/site-settings", { cache: "no-store" }).then((response) => response.json());
      const payload = await request;
      const settings = mergeSettings(payload?.settings || payload);
      state.saved = clone(settings);
      state.draft = clone(settings);
      applySettings(settings);
      return settings;
    } catch (error) {
      console.warn("[site-studio] Failed to load settings", error);
      applySettings(state.saved);
      return state.saved;
    }
  }

  function setStatus(message, tone = "") {
    const node = document.querySelector("#siteStudioStatus");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("is-success", tone === "success");
    node.classList.toggle("is-error", tone === "error");
  }

  function isDirty() {
    return JSON.stringify(state.saved) !== JSON.stringify(state.draft);
  }

  function updateDirtyState() {
    const dirty = isDirty();
    const count = changedValueCount();
    const node = document.querySelector("#siteStudioDraftState");
    if (node) {
      node.textContent = dirty ? `${count}개 설정이 변경되었습니다. 저장 전까지 고객 화면에는 반영되지 않습니다.` : "운영 서버에 저장된 상태입니다.";
      node.classList.toggle("is-dirty", dirty);
    }
    const countNode = document.querySelector("#siteStudioChangeCount");
    if (countNode) countNode.textContent = dirty ? `저장 전 변경 ${count}개` : "저장된 상태";
    document.querySelector("#siteStudioSaveBtn")?.classList.toggle("has-unsaved", dirty);
    document.querySelector("#siteStudioSaveBottomBtn")?.classList.toggle("has-unsaved", dirty);
    updateHistoryButtons();
  }

  function renderSavedAt() {
    const node = document.querySelector("#siteStudioSavedAt");
    if (!node) return;
    const raw = state.saved?.updatedAt;
    if (!raw) {
      node.textContent = "기본 설정 사용 중";
      return;
    }
    const date = new Date(raw);
    node.textContent = Number.isNaN(date.getTime())
      ? "최근 저장 정보 없음"
      : `최근 저장 ${date.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
  }

  function setActiveSection(sectionId, options = {}) {
    const nextId = document.querySelector(`#${sectionId}[data-site-studio-panel]`)
      ? sectionId
      : "siteStudioOverviewSection";
    state.activeSection = nextId;
    document.querySelectorAll("[data-site-studio-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.id === nextId);
    });
    document.querySelectorAll("[data-site-studio-section]").forEach((button) => {
      button.classList.toggle("active", button.dataset.siteStudioSection === nextId);
    });
    const activeButton = document.querySelector(`[data-site-studio-section="${nextId}"]`);
    const label = activeButton?.dataset.sectionLabel || activeButton?.querySelector("b")?.textContent || "운영 홈";
    const labelNode = document.querySelector("#siteStudioCurrentSectionLabel");
    if (labelNode) labelNode.textContent = label;
    if (options.scroll !== false) {
      document.querySelector("#siteStudioPage")?.scrollIntoView({ behavior: options.behavior || "smooth", block: "start" });
    }
  }

  function applyThemePreset(name) {
    const presets = {
      jajaego: {
        primaryColor: "#0b5cff",
        inkColor: "#081957",
        pageColor: "#ffffff",
        surfaceColor: "#ffffff",
        fontFamily: "system"
      },
      clean: {
        primaryColor: "#175cd3",
        inkColor: "#101828",
        pageColor: "#f8fafc",
        surfaceColor: "#ffffff",
        fontFamily: "pretendard"
      },
      graphite: {
        primaryColor: "#2563eb",
        inkColor: "#111827",
        pageColor: "#f3f4f6",
        surfaceColor: "#ffffff",
        fontFamily: "system"
      }
    };
    const preset = presets[name];
    if (!preset) return;
    recordHistory(`theme:${name}`);
    state.draft.appearance = { ...state.draft.appearance, ...preset };
    applySettings(state.draft);
    renderAllEditors();
    setActiveSection("siteStudioAppearanceSection", { scroll: false });
    setStatus("테마 프리셋을 적용했습니다. 미리보기 확인 후 저장하세요.", "success");
  }

  function applyLayoutPreset(name) {
    const presets = {
      compact: { contentWidth: 1600, cornerRadius: 4, homeTileGap: 10, productColumnsDesktop: 5, productColumnsMobile: 2 },
      balanced: { contentWidth: 1480, cornerRadius: 8, homeTileGap: 18, productColumnsDesktop: 4, productColumnsMobile: 2 },
      visual: { contentWidth: 1380, cornerRadius: 8, homeTileGap: 24, productColumnsDesktop: 3, productColumnsMobile: 2 }
    };
    const preset = presets[name];
    if (!preset) return;
    recordHistory(`layout:${name}`);
    state.draft.appearance = { ...state.draft.appearance, ...preset };
    applySettings(state.draft);
    renderAllEditors();
    setActiveSection("siteStudioLayoutSection", { scroll: false });
    setStatus("레이아웃 프리셋을 적용했습니다. 저장 전 미리보기를 확인하세요.", "success");
  }

  function getActivePageSettings() {
    if (!PAGE_DEFINITION_BY_ID.has(state.activePageId)) state.activePageId = "homePage";
    return state.draft.pages[state.activePageId];
  }

  function renderPageColorField(key, label, value) {
    return `
      <label>${escapeHtml(label)}
        <span class="site-studio-color-control">
          <input type="color" value="${escapeHtml(value)}" data-site-page-design-field="${escapeHtml(key)}" />
          <input type="text" value="${escapeHtml(value)}" data-site-page-design-field="${escapeHtml(key)}" maxlength="7" />
        </span>
      </label>
    `;
  }

  function renderPagePreviewOptions() {
    const select = document.querySelector("#siteStudioPreviewPage");
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = PAGE_DEFINITIONS.map(({ id, label }) => (
      `<option value="page:${escapeHtml(id)}">${escapeHtml(label)}</option>`
    )).join("");
    select.value = PAGE_DEFINITION_BY_ID.has(currentValue.replace(/^page:/, ""))
      ? currentValue
      : `page:${state.activePageId}`;
  }

  function renderPageEditor() {
    const list = document.querySelector("#siteStudioPageList");
    const fields = document.querySelector("#siteStudioPageEditorFields");
    const select = document.querySelector("#siteStudioPageSelect");
    if (!list || !fields || !select) return;
    const page = getActivePageSettings();
    const definition = PAGE_DEFINITION_BY_ID.get(state.activePageId);

    select.innerHTML = PAGE_DEFINITIONS.map(({ id, label }) => (
      `<option value="${escapeHtml(id)}" ${id === state.activePageId ? "selected" : ""}>${escapeHtml(label)}</option>`
    )).join("");
    list.innerHTML = PAGE_DEFINITIONS.map(({ id, label }) => {
      const settings = state.draft.pages[id];
      const edited = settings.contentEnabled || settings.imageEnabled || settings.designEnabled;
      return `
        <button type="button" class="${id === state.activePageId ? "active" : ""}" data-site-page-id="${escapeHtml(id)}">
          <span>${escapeHtml(label)}</span>
          <small>${edited ? "편집 적용 중" : "기본 화면"}</small>
        </button>
      `;
    }).join("");

    fields.innerHTML = `
      <div class="site-studio-page-editor-head">
        <div>
          <p class="eyebrow">Selected Page</p>
          <h4>${escapeHtml(definition.label)}</h4>
        </div>
        <div class="site-studio-page-editor-actions">
          <button class="secondary-action" id="siteStudioOpenSelectedPageBtn" type="button">실제 화면 열기</button>
          <button class="site-studio-quiet-button" id="siteStudioResetSelectedPageBtn" type="button">이 화면만 초기화</button>
        </div>
      </div>

      <section class="site-studio-page-setting-group">
        <header>
          <div><strong>문구</strong><small>페이지 제목과 설명</small></div>
          <label class="site-studio-switch">
            <input type="checkbox" data-site-page-enabled="contentEnabled" ${page.contentEnabled ? "checked" : ""} />
            <span>적용</span>
          </label>
        </header>
        <div class="site-studio-page-copy-grid">
          <label>영문·작은 제목
            <input type="text" value="${escapeHtml(page.eyebrow)}" data-site-page-field="eyebrow" maxlength="100" />
          </label>
          <label>페이지 제목
            <textarea rows="2" data-site-page-field="title" maxlength="180">${escapeHtml(page.title)}</textarea>
          </label>
          <label class="is-wide">설명
            <textarea rows="3" data-site-page-field="description" maxlength="420">${escapeHtml(page.description)}</textarea>
          </label>
        </div>
      </section>

      <section class="site-studio-page-setting-group">
        <header>
          <div><strong>대표 이미지</strong><small>이미지가 없는 화면은 제목 영역 배경으로 사용</small></div>
          <label class="site-studio-switch">
            <input type="checkbox" data-site-page-enabled="imageEnabled" ${page.imageEnabled ? "checked" : ""} />
            <span>적용</span>
          </label>
        </header>
        <div class="site-studio-page-image-editor">
          <div class="site-studio-page-image-preview ${page.heroImage ? "" : "is-empty"}">
            ${page.heroImage ? `<img src="${escapeHtml(page.heroImage)}" alt="" loading="lazy" decoding="async" />` : "<span>이미지 없음</span>"}
          </div>
          <div>
            <label>이미지 주소
              <input type="text" value="${escapeHtml(page.heroImage)}" data-site-page-image-input />
            </label>
            <label class="secondary-action site-studio-file-button">
              이미지 업로드
              <input type="file" accept="image/png,image/jpeg,image/webp" data-site-page-image-file />
            </label>
          </div>
        </div>
      </section>

      <section class="site-studio-page-setting-group">
        <header>
          <div><strong>화면 디자인</strong><small>글꼴부터 이미지·버튼·카드까지 이 페이지에만 적용</small></div>
          <label class="site-studio-switch">
            <input type="checkbox" data-site-page-enabled="designEnabled" ${page.designEnabled ? "checked" : ""} />
            <span>적용</span>
          </label>
        </header>
        <div class="site-studio-advanced-design">
          <details open>
            <summary>색상</summary>
            <div class="site-studio-form-grid site-studio-page-design-grid">
              ${renderPageColorField("backgroundColor", "페이지 배경", page.backgroundColor)}
              ${renderPageColorField("surfaceColor", "콘텐츠 배경", page.surfaceColor)}
              ${renderPageColorField("accentColor", "강조 색상", page.accentColor)}
              ${renderPageColorField("textColor", "기본 글자", page.textColor)}
              ${renderPageColorField("mutedTextColor", "보조 글자", page.mutedTextColor)}
              ${renderPageColorField("borderColor", "테두리", page.borderColor)}
              ${renderPageColorField("buttonColor", "버튼 배경", page.buttonColor)}
              ${renderPageColorField("buttonTextColor", "버튼 글자", page.buttonTextColor)}
            </div>
          </details>

          <details open>
            <summary>글자</summary>
            <div class="site-studio-form-grid site-studio-page-option-grid">
              <label>글꼴
                <select data-site-page-design-field="fontFamily">
                  <option value="inherit" ${page.fontFamily === "inherit" ? "selected" : ""}>전체 설정 따름</option>
                  <option value="system" ${page.fontFamily === "system" ? "selected" : ""}>시스템 고딕</option>
                  <option value="pretendard" ${page.fontFamily === "pretendard" ? "selected" : ""}>Pretendard</option>
                  <option value="noto" ${page.fontFamily === "noto" ? "selected" : ""}>Noto Sans KR</option>
                  <option value="serif" ${page.fontFamily === "serif" ? "selected" : ""}>명조·세리프</option>
                </select>
              </label>
              <label>제목 굵기
                <select data-site-page-design-field="headingWeight">
                  ${[400, 500, 600, 700, 800, 900].map((weight) => `<option value="${weight}" ${Number(page.headingWeight) === weight ? "selected" : ""}>${weight}</option>`).join("")}
                </select>
              </label>
              <label>텍스트 정렬
                <select data-site-page-design-field="textAlign">
                  <option value="left" ${page.textAlign === "left" ? "selected" : ""}>왼쪽</option>
                  <option value="center" ${page.textAlign === "center" ? "selected" : ""}>가운데</option>
                  <option value="right" ${page.textAlign === "right" ? "selected" : ""}>오른쪽</option>
                </select>
              </label>
            </div>
            <div class="site-studio-layout-list site-studio-page-range-grid">
              <label class="site-studio-range-field">
                <span>제목 크기 <b data-site-page-range-value="headingScale">${escapeHtml(page.headingScale)}%</b></span>
                <input type="range" min="70" max="180" value="${escapeHtml(page.headingScale)}" data-site-page-design-field="headingScale" data-site-range-unit="%" />
              </label>
              <label class="site-studio-range-field">
                <span>본문 크기 <b data-site-page-range-value="bodyScale">${escapeHtml(page.bodyScale)}%</b></span>
                <input type="range" min="80" max="140" value="${escapeHtml(page.bodyScale)}" data-site-page-design-field="bodyScale" data-site-range-unit="%" />
              </label>
            </div>
          </details>

          <details>
            <summary>폭과 여백</summary>
            <div class="site-studio-layout-list site-studio-page-range-grid">
              <label class="site-studio-range-field">
                <span>콘텐츠 폭 <b data-site-page-range-value="contentWidth">${escapeHtml(page.contentWidth)}px</b></span>
                <input type="range" min="720" max="1800" step="20" value="${escapeHtml(page.contentWidth)}" data-site-page-design-field="contentWidth" data-site-range-unit="px" />
              </label>
              <label class="site-studio-range-field">
                <span>안쪽 여백 <b data-site-page-range-value="contentPadding">${escapeHtml(page.contentPadding)}px</b></span>
                <input type="range" min="0" max="64" value="${escapeHtml(page.contentPadding)}" data-site-page-design-field="contentPadding" data-site-range-unit="px" />
              </label>
              <label class="site-studio-range-field">
                <span>섹션 간격 <b data-site-page-range-value="sectionGap">${escapeHtml(page.sectionGap)}px</b></span>
                <input type="range" min="8" max="96" value="${escapeHtml(page.sectionGap)}" data-site-page-design-field="sectionGap" data-site-range-unit="px" />
              </label>
            </div>
          </details>

          <details>
            <summary>테두리와 카드</summary>
            <div class="site-studio-form-grid site-studio-page-option-grid">
              <label>카드 표현
                <select data-site-page-design-field="cardStyle">
                  <option value="flat" ${page.cardStyle === "flat" ? "selected" : ""}>평면</option>
                  <option value="bordered" ${page.cardStyle === "bordered" ? "selected" : ""}>테두리</option>
                  <option value="elevated" ${page.cardStyle === "elevated" ? "selected" : ""}>그림자</option>
                </select>
              </label>
              <label>버튼 표현
                <select data-site-page-design-field="buttonStyle">
                  <option value="solid" ${page.buttonStyle === "solid" ? "selected" : ""}>채움</option>
                  <option value="outline" ${page.buttonStyle === "outline" ? "selected" : ""}>외곽선</option>
                  <option value="minimal" ${page.buttonStyle === "minimal" ? "selected" : ""}>최소형</option>
                </select>
              </label>
            </div>
            <div class="site-studio-layout-list site-studio-page-range-grid">
              <label class="site-studio-range-field">
                <span>테두리 굵기 <b data-site-page-range-value="borderWidth">${escapeHtml(page.borderWidth)}px</b></span>
                <input type="range" min="0" max="4" value="${escapeHtml(page.borderWidth)}" data-site-page-design-field="borderWidth" data-site-range-unit="px" />
              </label>
              <label class="site-studio-range-field">
                <span>모서리 <b data-site-page-range-value="cornerRadius">${escapeHtml(page.cornerRadius)}px</b></span>
                <input type="range" min="0" max="32" value="${escapeHtml(page.cornerRadius)}" data-site-page-design-field="cornerRadius" data-site-range-unit="px" />
              </label>
              <label class="site-studio-range-field">
                <span>그림자 <b data-site-page-range-value="shadowStrength">${escapeHtml(page.shadowStrength)}%</b></span>
                <input type="range" min="0" max="40" value="${escapeHtml(page.shadowStrength)}" data-site-page-design-field="shadowStrength" data-site-range-unit="%" />
              </label>
            </div>
          </details>

          <details>
            <summary>이미지</summary>
            <div class="site-studio-form-grid site-studio-page-option-grid">
              <label>이미지 비율
                <select data-site-page-design-field="imageRatio">
                  <option value="auto" ${page.imageRatio === "auto" ? "selected" : ""}>원본 비율</option>
                  <option value="square" ${page.imageRatio === "square" ? "selected" : ""}>정사각형 1:1</option>
                  <option value="landscape" ${page.imageRatio === "landscape" ? "selected" : ""}>가로 4:3</option>
                  <option value="wide" ${page.imageRatio === "wide" ? "selected" : ""}>와이드 16:9</option>
                  <option value="portrait" ${page.imageRatio === "portrait" ? "selected" : ""}>세로 3:4</option>
                </select>
              </label>
              <label>이미지 맞춤
                <select data-site-page-design-field="imageFit">
                  <option value="cover" ${page.imageFit === "cover" ? "selected" : ""}>영역 채우기</option>
                  <option value="contain" ${page.imageFit === "contain" ? "selected" : ""}>전체 보이기</option>
                  <option value="fill" ${page.imageFit === "fill" ? "selected" : ""}>영역에 맞추기</option>
                </select>
              </label>
              <label>이미지 기준점
                <select data-site-page-design-field="imagePosition">
                  <option value="center" ${page.imagePosition === "center" ? "selected" : ""}>가운데</option>
                  <option value="top" ${page.imagePosition === "top" ? "selected" : ""}>위</option>
                  <option value="bottom" ${page.imagePosition === "bottom" ? "selected" : ""}>아래</option>
                  <option value="left" ${page.imagePosition === "left" ? "selected" : ""}>왼쪽</option>
                  <option value="right" ${page.imagePosition === "right" ? "selected" : ""}>오른쪽</option>
                </select>
              </label>
            </div>
          </details>
        </div>
      </section>
    `;
    renderPagePreviewOptions();
  }

  function renderAppearanceEditor() {
    const container = document.querySelector("#siteStudioAppearanceFields");
    if (!container) return;
    const appearance = state.draft.appearance;
    container.innerHTML = `
      <label>폰트
        <select data-site-appearance="fontFamily">
          <option value="system" ${appearance.fontFamily === "system" ? "selected" : ""}>시스템 고딕</option>
          <option value="pretendard" ${appearance.fontFamily === "pretendard" ? "selected" : ""}>Pretendard</option>
          <option value="noto" ${appearance.fontFamily === "noto" ? "selected" : ""}>Noto Sans KR</option>
          <option value="serif" ${appearance.fontFamily === "serif" ? "selected" : ""}>명조·세리프</option>
        </select>
      </label>
      <label>텍스트 크기
        <select data-site-appearance="fontScale">
          <option value="compact" ${appearance.fontScale === "compact" ? "selected" : ""}>작게</option>
          <option value="default" ${appearance.fontScale === "default" ? "selected" : ""}>기본</option>
          <option value="large" ${appearance.fontScale === "large" ? "selected" : ""}>크게</option>
        </select>
      </label>
      ${renderColorField("primaryColor", "강조 색상", appearance.primaryColor)}
      ${renderColorField("inkColor", "기본 글자색", appearance.inkColor)}
      ${renderColorField("pageColor", "페이지 배경", appearance.pageColor)}
      ${renderColorField("surfaceColor", "패널 배경", appearance.surfaceColor)}
    `;
  }

  function renderColorField(key, label, value) {
    return `
      <label>${escapeHtml(label)}
        <span class="site-studio-color-control">
          <input type="color" value="${escapeHtml(value)}" data-site-appearance="${escapeHtml(key)}" />
          <input type="text" value="${escapeHtml(value)}" data-site-appearance="${escapeHtml(key)}" maxlength="7" />
        </span>
      </label>
    `;
  }

  function renderTextEditor() {
    const container = document.querySelector("#siteStudioTextFields");
    if (!container) return;
    const keyword = state.textSearch.trim().toLowerCase();
    const visibleFields = TEXT_FIELDS.filter(([group, key, label]) => {
      const groupMatches = state.activeTextGroup === "all" || state.activeTextGroup === group;
      const searchMatches = !keyword || `${group} ${key} ${label} ${state.draft.text[key] || ""}`.toLowerCase().includes(keyword);
      return groupMatches && searchMatches;
    });
    container.innerHTML = visibleFields.map(([group, key, label, type]) => `
      <div class="site-studio-text-field">
        <span><small>${escapeHtml(group)}</small>${escapeHtml(label)}</span>
        <span class="site-studio-text-control">
          ${type === "textarea"
            ? `<textarea rows="2" aria-label="${escapeHtml(`${group} ${label}`)}" data-site-text-input="${escapeHtml(key)}">${escapeHtml(state.draft.text[key] || "")}</textarea>`
            : `<input type="text" aria-label="${escapeHtml(`${group} ${label}`)}" value="${escapeHtml(state.draft.text[key] || "")}" data-site-text-input="${escapeHtml(key)}" />`}
          <button type="button" data-site-reset-text="${escapeHtml(key)}" title="${escapeHtml(label)} 기본값 복원">기본값</button>
        </span>
      </div>
    `).join("") || `<div class="site-studio-empty-search">조건에 맞는 문구가 없습니다.</div>`;
    document.querySelectorAll("[data-site-text-group]").forEach((button) => {
      button.classList.toggle("active", button.dataset.siteTextGroup === state.activeTextGroup);
    });
    const search = document.querySelector("#siteStudioTextSearch");
    if (search && search.value !== state.textSearch) search.value = state.textSearch;
  }

  function renderImageEditor() {
    const container = document.querySelector("#siteStudioImageFields");
    if (!container) return;
    container.innerHTML = IMAGE_FIELDS.map(([key, label, hint]) => `
      <article class="site-studio-image-row">
        <img src="${escapeHtml(state.draft.images[key] || "")}" alt="" loading="lazy" decoding="async" />
        <div>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(hint)}</small>
          <input type="text" value="${escapeHtml(state.draft.images[key] || "")}" data-site-image-input="${escapeHtml(key)}" />
        </div>
        <div class="site-studio-image-actions">
          <label class="secondary-action site-studio-file-button">
            이미지 선택
            <input type="file" accept="image/png,image/jpeg,image/webp" data-site-image-file="${escapeHtml(key)}" />
          </label>
          <button class="site-studio-quiet-button" type="button" data-site-reset-image="${escapeHtml(key)}">기본값</button>
        </div>
      </article>
    `).join("");
  }

  function renderLayoutEditor() {
    const container = document.querySelector("#siteStudioLayoutFields");
    if (!container) return;
    const appearance = state.draft.appearance;
    container.innerHTML = [
      ["contentWidth", "콘텐츠 최대 너비", appearance.contentWidth, 1080, 1800, "px"],
      ["cornerRadius", "모서리 둥글기", appearance.cornerRadius, 0, 24, "px"],
      ["homeTileGap", "메인 타일 간격", appearance.homeTileGap, 8, 36, "px"],
      ["productColumnsDesktop", "PC 상품 열 수", appearance.productColumnsDesktop, 2, 6, "열"],
      ["productColumnsMobile", "모바일 상품 열 수", appearance.productColumnsMobile, 1, 2, "열"]
    ].map(([key, label, value, min, max, unit]) => `
      <label class="site-studio-range-field">
        <span>${escapeHtml(label)} <b data-site-range-value="${escapeHtml(key)}">${escapeHtml(value)}${escapeHtml(unit)}</b></span>
        <input type="range" min="${min}" max="${max}" value="${value}" data-site-appearance="${escapeHtml(key)}" data-site-range-unit="${escapeHtml(unit)}" />
      </label>
    `).join("");
  }

  function renderMenuEditor() {
    const container = document.querySelector("#siteStudioMenuFields");
    if (!container) return;
    const menu = [...state.draft.menu].sort((left, right) => left.order - right.order);
    container.innerHTML = menu.map((item, index) => `
      <article class="site-studio-menu-row" data-menu-id="${escapeHtml(item.id)}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <input type="text" value="${escapeHtml(item.label)}" data-site-menu-label="${escapeHtml(item.id)}" />
        <label class="site-studio-toggle">
          <input type="checkbox" data-site-menu-visible="${escapeHtml(item.id)}" ${item.visible !== false ? "checked" : ""} />
          <span>노출</span>
        </label>
        <div>
          <button type="button" title="위로" data-site-menu-move="${escapeHtml(item.id)}" data-direction="-1">↑</button>
          <button type="button" title="아래로" data-site-menu-move="${escapeHtml(item.id)}" data-direction="1">↓</button>
        </div>
      </article>
    `).join("");
  }

  function renderPreview() {
    const preview = document.querySelector("#siteStudioLivePreview");
    if (!preview) return;
    const stage = document.querySelector("#siteStudioPreviewStage");
    if (stage) stage.classList.toggle("is-mobile", state.previewDevice === "mobile");
    document.querySelectorAll("[data-site-preview-device]").forEach((button) => {
      button.classList.toggle("active", button.dataset.sitePreviewDevice === state.previewDevice);
    });
    const mode = document.querySelector("#siteStudioPreviewPage")?.value || "home";
    const settings = state.draft;
    const style = [
      `--preview-primary:${settings.appearance.primaryColor}`,
      `--preview-ink:${settings.appearance.inkColor}`,
      `--preview-page:${settings.appearance.pageColor}`,
      `--preview-surface:${settings.appearance.surfaceColor}`,
      `--preview-radius:${settings.appearance.cornerRadius}px`,
      `font-family:${fontStack(settings.appearance.fontFamily).replace(/"/g, "'")}`
    ].join(";");
    const visibleMenu = [...settings.menu].filter((item) => item.visible !== false).sort((a, b) => a.order - b.order);
    const navigation = visibleMenu.map((item) => `<span>${escapeHtml(item.label)}</span>`).join("");

    if (mode.startsWith("page:")) {
      const pageId = mode.slice(5);
      const page = settings.pages[pageId] || settings.pages.homePage;
      const pageStyle = [
        `--preview-page-bg:${page.designEnabled ? page.backgroundColor : settings.appearance.pageColor}`,
        `--preview-page-surface:${page.designEnabled ? page.surfaceColor : settings.appearance.surfaceColor}`,
        `--preview-page-accent:${page.designEnabled ? page.accentColor : settings.appearance.primaryColor}`,
        `--preview-page-text:${page.designEnabled ? page.textColor : settings.appearance.inkColor}`,
        `--preview-page-muted:${page.designEnabled ? page.mutedTextColor : "#667085"}`,
        `--preview-page-border:${page.designEnabled ? page.borderColor : "#d8dee7"}`,
        `--preview-page-button:${page.designEnabled ? page.buttonColor : settings.appearance.primaryColor}`,
        `--preview-page-button-text:${page.designEnabled ? page.buttonTextColor : "#ffffff"}`,
        `--preview-page-font:${page.designEnabled ? pageFontStack(page.fontFamily).replace(/"/g, "'") : fontStack(settings.appearance.fontFamily).replace(/"/g, "'")}`,
        `--preview-page-heading-weight:${Number(page.designEnabled ? page.headingWeight : 800)}`,
        `--preview-page-text-align:${page.designEnabled ? page.textAlign : "left"}`,
        `--preview-page-flex-align:${flexAlignmentValue(page.designEnabled ? page.textAlign : "left")}`,
        `--preview-page-heading-scale:${Number(page.designEnabled ? page.headingScale : 100) / 100}`,
        `--preview-page-body-scale:${Number(page.designEnabled ? page.bodyScale : 100) / 100}`,
        `--preview-page-gap:${Number(page.designEnabled ? page.sectionGap : 24)}px`,
        `--preview-page-padding:${Number(page.designEnabled ? page.contentPadding : 24)}px`,
        `--preview-page-border-width:${Number(page.designEnabled ? page.borderWidth : 1)}px`,
        `--preview-page-radius:${Number(page.designEnabled ? page.cornerRadius : 8)}px`,
        `--preview-page-shadow:0 10px 24px rgb(16 24 40 / ${Number(page.designEnabled ? page.shadowStrength : 8)}%)`,
        `--preview-page-image-ratio:${imageRatioValue(page.designEnabled ? page.imageRatio : "auto")}`,
        `--preview-page-image-fit:${page.designEnabled ? page.imageFit : "cover"}`,
        `--preview-page-background-fit:${backgroundImageFitValue(page.designEnabled ? page.imageFit : "cover")}`,
        `--preview-page-image-position:${page.designEnabled ? page.imagePosition : "center"}`
      ].join(";");
      const image = page.imageEnabled ? page.heroImage : DEFAULT_SETTINGS.pages[pageId]?.heroImage;
      preview.innerHTML = `
        <div class="site-studio-preview-shell site-studio-preview-page-shell" data-preview-button-style="${escapeHtml(page.buttonStyle)}" data-preview-card-style="${escapeHtml(page.cardStyle)}" style="${style};${pageStyle}">
          <nav>${navigation}</nav>
          <section class="site-studio-preview-page-card ${image ? "has-image" : ""}" ${image ? `style="background-image:linear-gradient(90deg,rgba(8,25,87,.88),rgba(8,25,87,.18)),url('${escapeHtml(image)}')"` : ""}>
            <small>${escapeHtml(page.eyebrow)}</small>
            <h4>${escapeHtml(page.title).replace(/\n/g, "<br>")}</h4>
            <p>${escapeHtml(page.description)}</p>
            <button type="button">주요 기능</button>
          </section>
          <div class="site-studio-preview-page-content">
            <article><i></i><strong>대표 콘텐츠</strong><small>이미지와 핵심 정보를 표시합니다.</small></article>
            <article><i></i><strong>상세 기능</strong><small>화면별 기능은 그대로 유지됩니다.</small></article>
          </div>
        </div>
      `;
      return;
    }

    if (mode === "tile") {
      preview.innerHTML = `
        <div class="site-studio-preview-shell" style="${style}">
          <nav>${navigation}</nav>
          <section class="site-studio-preview-tile-hero">
            <small>${escapeHtml(settings.text.tileHeroEyebrow)}</small>
            <h4>${escapeHtml(settings.text.tileHeroTitle)}</h4>
            <p>${escapeHtml(settings.text.tileHeroDescription)}</p>
            <div><span>${escapeHtml(settings.text.tileSearchLabel)}</span><button>검색</button></div>
          </section>
          <div class="site-studio-preview-products">${[1, 2, 3, 4].map((index) => `<article><i></i><strong>타일 상품 ${index}</strong><small>600×600 · 무광</small></article>`).join("")}</div>
        </div>
      `;
      return;
    }

    if (mode === "bath") {
      preview.innerHTML = `
        <div class="site-studio-preview-shell" style="${style}">
          <nav>${navigation}</nav>
          <section class="site-studio-preview-bath-hero" style="background-image:linear-gradient(90deg,rgba(10,14,20,.78),rgba(10,14,20,.15)),url('${escapeHtml(settings.images.bathHero)}')">
            <small>${escapeHtml(settings.text.bathHeroEyebrow)}</small>
            <h4>${escapeHtml(settings.text.bathHeroTitle).replace(/\n/g, "<br>")}</h4>
          </section>
          <div class="site-studio-preview-bath-categories"><span>수전</span><span>세면대</span><span>양변기</span><span>욕실장</span></div>
        </div>
      `;
      return;
    }

    preview.innerHTML = `
      <div class="site-studio-preview-shell" style="${style}">
        <nav>${navigation}</nav>
        <section class="site-studio-preview-home">
          <article>
            <h4>${escapeHtml(settings.text.homeHeadline)}</h4>
            <p>${escapeHtml(settings.text.homeDescription)}</p>
          </article>
          <article class="is-dark"><strong>${escapeHtml(settings.text.homeTileGoTitle)}</strong><small>${escapeHtml(settings.text.homeTileGoSubtitle)}</small></article>
          <article class="has-image" style="background-image:linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.7)),url('${escapeHtml(settings.images.homeAi)}')"><strong>${escapeHtml(settings.text.homeAiTitle)}</strong><small>${escapeHtml(settings.text.homeAiSubtitle)}</small></article>
          <article class="is-primary"><strong>${escapeHtml(settings.text.homeBathTitle)}</strong><small>${escapeHtml(settings.text.homeBathSubtitle)}</small></article>
          <article class="has-image" style="background-image:linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.7)),url('${escapeHtml(settings.images.homePlanner)}')"><strong>${escapeHtml(settings.text.homePlannerTitle)}</strong><small>${escapeHtml(settings.text.homePlannerSubtitle)}</small></article>
        </section>
      </div>
    `;
  }

  function renderAllEditors() {
    renderPageEditor();
    renderAppearanceEditor();
    renderTextEditor();
    renderImageEditor();
    renderLayoutEditor();
    renderMenuEditor();
    renderPreview();
    renderSavedAt();
    updateDirtyState();
    updateHistoryButtons();
  }

  function updateAppearanceValue(key, rawValue, source) {
    recordHistory(`appearance:${key}`);
    const numericKeys = new Set(["cornerRadius", "contentWidth", "productColumnsDesktop", "productColumnsMobile", "homeTileGap"]);
    state.draft.appearance[key] = numericKeys.has(key) ? Number(rawValue) : rawValue;
    if (source?.type === "color" || (source?.type === "text" && /^#[0-9a-f]{6}$/i.test(rawValue))) {
      document.querySelectorAll(`[data-site-appearance="${key}"]`).forEach((node) => {
        if (node !== source) node.value = rawValue;
      });
    }
    const rangeValue = document.querySelector(`[data-site-range-value="${key}"]`);
    if (rangeValue) rangeValue.textContent = `${rawValue}${source?.dataset.siteRangeUnit || ""}`;
    applySettings(state.draft);
    renderPreview();
    updateDirtyState();
  }

  function findMenuItem(id) {
    return state.draft.menu.find((item) => item.id === id);
  }

  function moveMenuItem(id, direction) {
    const menu = [...state.draft.menu].sort((left, right) => left.order - right.order);
    const index = menu.findIndex((item) => item.id === id);
    const nextIndex = index + Number(direction);
    if (index < 0 || nextIndex < 0 || nextIndex >= menu.length) return;
    recordHistory(`menu-order:${id}`);
    [menu[index], menu[nextIndex]] = [menu[nextIndex], menu[index]];
    menu.forEach((item, itemIndex) => {
      item.order = itemIndex + 1;
    });
    state.draft.menu = menu;
    applySettings(state.draft);
    renderMenuEditor();
    renderPreview();
    updateDirtyState();
  }

  function selectPageEditor(pageId, options = {}) {
    if (!PAGE_DEFINITION_BY_ID.has(pageId)) return;
    state.activePageId = pageId;
    renderPageEditor();
    const previewSelect = document.querySelector("#siteStudioPreviewPage");
    if (previewSelect) previewSelect.value = `page:${pageId}`;
    renderPreview();
    if (options.section !== false) {
      setActiveSection("siteStudioPageSection", { scroll: options.scroll !== false });
    }
  }

  function updateActivePageField(key, rawValue, enabledKey) {
    const page = getActivePageSettings();
    recordHistory(`page:${state.activePageId}:${key}`);
    const numericKeys = new Set([
      "headingWeight",
      "headingScale",
      "bodyScale",
      "sectionGap",
      "contentPadding",
      "contentWidth",
      "borderWidth",
      "cornerRadius",
      "shadowStrength"
    ]);
    page[key] = numericKeys.has(key) ? Number(rawValue) : rawValue;
    if (enabledKey) page[enabledKey] = true;
    applySettings(state.draft);
    renderPreview();
    updateDirtyState();
  }

  function resetSelectedPage() {
    const page = PAGE_DEFINITION_BY_ID.get(state.activePageId);
    if (!page) return;
    if (!global.confirm(`${page.label} 화면의 편집 설정만 기본값으로 되돌릴까요?`)) return;
    recordHistory(`page-reset:${state.activePageId}`);
    state.draft.pages[state.activePageId] = clone(state.defaults.pages[state.activePageId]);
    applySettings(state.draft);
    renderPageEditor();
    renderPreview();
    updateDirtyState();
    setStatus(`${page.label} 화면을 기본 상태로 되돌렸습니다. 저장하면 최종 반영됩니다.`, "success");
  }

  async function uploadPageImage(input) {
    const file = input.files?.[0];
    if (!file) return;
    setStatus(`${file.name} 이미지를 최적화하고 업로드하는 중입니다.`);
    try {
      const dataUrl = await state.callbacks.readImageFile(file, 2200, 0.9);
      const payload = await state.callbacks.requestJson("/api/admin/site-media", {
        method: "POST",
        headers: state.callbacks.getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dataUrl, fileName: file.name })
      }, { timeoutMs: 30000 });
      recordHistory(`page-image-upload:${state.activePageId}`);
      const page = getActivePageSettings();
      page.heroImage = payload.url;
      page.imageEnabled = true;
      applySettings(state.draft);
      renderPageEditor();
      renderPreview();
      updateDirtyState();
      setStatus("페이지 이미지를 업로드했습니다. 변경사항 저장을 눌러 최종 반영하세요.", "success");
    } catch (error) {
      setStatus(error.message || "페이지 이미지 업로드에 실패했습니다.", "error");
    } finally {
      input.value = "";
    }
  }

  async function saveSettings() {
    if (!state.callbacks?.isAdminUser?.()) {
      setStatus("관리자 로그인 후 저장할 수 있습니다.", "error");
      return;
    }
    const buttons = ["#siteStudioSaveBtn", "#siteStudioSaveBottomBtn"]
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);
    buttons.forEach((button) => {
      button.disabled = true;
      button.textContent = "저장 중";
    });
    setStatus("운영 서버에 디자인 설정을 저장하고 있습니다.");
    try {
      const payload = await state.callbacks.requestJson("/api/admin/site-settings", {
        method: "POST",
        headers: state.callbacks.getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ settings: state.draft })
      }, { timeoutMs: 15000 });
      state.saved = mergeSettings(payload.settings);
      state.draft = clone(state.saved);
      state.history = [];
      state.future = [];
      applySettings(state.saved);
      renderAllEditors();
      setStatus("저장 완료. 고객 화면에 새 디자인이 즉시 적용되었습니다.", "success");
    } catch (error) {
      setStatus(error.message || "설정 저장에 실패했습니다.", "error");
    } finally {
      buttons.forEach((button) => {
        button.disabled = false;
        button.textContent = "변경사항 저장";
      });
    }
  }

  async function resetSettings() {
    if (!state.callbacks?.isAdminUser?.()) {
      setStatus("관리자 로그인 후 초기화할 수 있습니다.", "error");
      return;
    }
    if (!global.confirm("사이트 디자인 설정을 기본값으로 되돌릴까요?")) return;
    try {
      const payload = await state.callbacks.requestJson("/api/admin/site-settings/reset", {
        method: "POST",
        headers: state.callbacks.getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: "{}"
      }, { timeoutMs: 15000 });
      state.saved = mergeSettings(payload.settings);
      state.draft = clone(state.saved);
      state.history = [];
      state.future = [];
      applySettings(state.saved);
      renderAllEditors();
      setStatus("기본 디자인으로 복원했습니다.", "success");
    } catch (error) {
      setStatus(error.message || "기본값 복원에 실패했습니다.", "error");
    }
  }

  async function uploadImage(input) {
    const file = input.files?.[0];
    const key = input.dataset.siteImageFile;
    if (!file || !key) return;
    setStatus(`${file.name} 이미지를 최적화하고 업로드하는 중입니다.`);
    try {
      const dataUrl = await state.callbacks.readImageFile(file, 2000, 0.9);
      const payload = await state.callbacks.requestJson("/api/admin/site-media", {
        method: "POST",
        headers: state.callbacks.getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dataUrl, fileName: file.name })
      }, { timeoutMs: 30000 });
      recordHistory(`image-upload:${key}`);
      state.draft.images[key] = payload.url;
      applySettings(state.draft);
      renderImageEditor();
      renderPreview();
      updateDirtyState();
      setStatus("이미지를 업로드했습니다. 변경사항 저장을 눌러 최종 반영하세요.", "success");
    } catch (error) {
      setStatus(error.message || "이미지 업로드에 실패했습니다.", "error");
    } finally {
      input.value = "";
    }
  }

  function exportSettings() {
    const blob = new Blob([`${JSON.stringify(state.draft, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jajaego-site-design-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importSettings(input) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      recordHistory("settings-import");
      state.draft = mergeSettings(JSON.parse(await file.text()));
      applySettings(state.draft);
      renderAllEditors();
      setStatus("설정 파일을 불러왔습니다. 검토 후 변경사항 저장을 눌러주세요.", "success");
    } catch (error) {
      setStatus("올바른 자재GO 디자인 설정 JSON 파일이 아닙니다.", "error");
    } finally {
      input.value = "";
    }
  }

  function resetTextField(key) {
    if (!(key in state.defaults.text)) return;
    recordHistory(`text-reset:${key}`);
    state.draft.text[key] = state.defaults.text[key];
    applySettings(state.draft);
    renderTextEditor();
    renderPreview();
    updateDirtyState();
  }

  function resetImageField(key) {
    if (!(key in state.defaults.images)) return;
    recordHistory(`image-reset:${key}`);
    state.draft.images[key] = state.defaults.images[key];
    applySettings(state.draft);
    renderImageEditor();
    renderPreview();
    updateDirtyState();
  }

  function handleGlobalSearch(value) {
    const keyword = String(value || "").trim().toLowerCase();
    if (!keyword) return;
    const sectionTerms = [
      ["siteStudioPageSection", `전체 페이지 화면별 문구 이미지 디자인 ${PAGE_DEFINITIONS.map((page) => page.label).join(" ")}`],
      ["siteStudioAppearanceSection", "폰트 컬러 색상 글자 배경 브랜드 강조"],
      ["siteStudioLayoutSection", "레이아웃 구성 밀도 간격 열 너비 모서리"],
      ["siteStudioMenuSection", "메뉴 내비게이션 순서 노출"],
      ["siteStudioImageSection", `이미지 사진 미디어 ${IMAGE_FIELDS.map((item) => item[1]).join(" ")}`],
      ["siteStudioTextSection", `문구 텍스트 제목 설명 ${TEXT_FIELDS.map((item) => `${item[0]} ${item[2]}`).join(" ")}`]
    ];
    const match = sectionTerms.find(([, terms]) => terms.toLowerCase().includes(keyword));
    if (!match) {
      setStatus(`"${value}"에 맞는 설정을 찾지 못했습니다.`, "error");
      return;
    }
    if (match[0] === "siteStudioTextSection") {
      state.activeTextGroup = "all";
      state.textSearch = value;
      renderTextEditor();
    }
    setActiveSection(match[0]);
    setStatus(`"${value}" 관련 설정으로 이동했습니다.`);
  }

  function bindEvents() {
    const page = document.querySelector("#siteStudioPage");
    if (!page || page.dataset.siteStudioBound === "true") return;
    page.dataset.siteStudioBound = "true";

    page.addEventListener("input", (event) => {
      const pageField = event.target.closest("[data-site-page-field]");
      if (pageField) {
        updateActivePageField(pageField.dataset.sitePageField, pageField.value, "contentEnabled");
        const contentEnabled = document.querySelector('[data-site-page-enabled="contentEnabled"]');
        if (contentEnabled) contentEnabled.checked = true;
        return;
      }
      const pageImage = event.target.closest("[data-site-page-image-input]");
      if (pageImage) {
        updateActivePageField("heroImage", pageImage.value, "imageEnabled");
        const imageEnabled = document.querySelector('[data-site-page-enabled="imageEnabled"]');
        if (imageEnabled) imageEnabled.checked = true;
        return;
      }
      const pageDesign = event.target.closest("[data-site-page-design-field]");
      if (pageDesign) {
        const key = pageDesign.dataset.sitePageDesignField;
        const colorKeys = new Set([
          "backgroundColor",
          "surfaceColor",
          "accentColor",
          "textColor",
          "mutedTextColor",
          "borderColor",
          "buttonColor",
          "buttonTextColor"
        ]);
        if (pageDesign.type === "text" && colorKeys.has(key) && !/^#[0-9a-f]{6}$/i.test(pageDesign.value)) {
          return;
        }
        updateActivePageField(key, pageDesign.value, "designEnabled");
        document.querySelectorAll(`[data-site-page-design-field="${key}"]`).forEach((node) => {
          if (node !== pageDesign) node.value = pageDesign.value;
        });
        const rangeValue = document.querySelector(`[data-site-page-range-value="${key}"]`);
        if (rangeValue) rangeValue.textContent = `${pageDesign.value}${pageDesign.dataset.siteRangeUnit || ""}`;
        const designEnabled = document.querySelector('[data-site-page-enabled="designEnabled"]');
        if (designEnabled) designEnabled.checked = true;
        return;
      }
      const appearance = event.target.closest("[data-site-appearance]");
      if (appearance) {
        updateAppearanceValue(appearance.dataset.siteAppearance, appearance.value, appearance);
        return;
      }
      const textInput = event.target.closest("[data-site-text-input]");
      if (textInput) {
        recordHistory(`text:${textInput.dataset.siteTextInput}`);
        state.draft.text[textInput.dataset.siteTextInput] = textInput.value;
        applySettings(state.draft);
        renderPreview();
        updateDirtyState();
        return;
      }
      const imageInput = event.target.closest("[data-site-image-input]");
      if (imageInput) {
        recordHistory(`image:${imageInput.dataset.siteImageInput}`);
        state.draft.images[imageInput.dataset.siteImageInput] = imageInput.value;
        applySettings(state.draft);
        renderPreview();
        updateDirtyState();
        return;
      }
      const menuLabel = event.target.closest("[data-site-menu-label]");
      if (menuLabel) {
        const item = findMenuItem(menuLabel.dataset.siteMenuLabel);
        if (item) {
          recordHistory(`menu-label:${menuLabel.dataset.siteMenuLabel}`);
          item.label = menuLabel.value;
        }
        applySettings(state.draft);
        renderPreview();
        updateDirtyState();
        return;
      }
      if (event.target.matches("#siteStudioTextSearch")) {
        state.textSearch = event.target.value;
        renderTextEditor();
      }
    });

    page.addEventListener("change", (event) => {
      const pageEnabled = event.target.closest("[data-site-page-enabled]");
      if (pageEnabled) {
        const key = pageEnabled.dataset.sitePageEnabled;
        recordHistory(`page-enabled:${state.activePageId}:${key}`);
        getActivePageSettings()[key] = pageEnabled.checked;
        applySettings(state.draft);
        renderPageEditor();
        renderPreview();
        updateDirtyState();
        return;
      }
      if (event.target.matches("#siteStudioPageSelect")) {
        selectPageEditor(event.target.value, { scroll: false });
        return;
      }
      const pageImageFile = event.target.closest("[data-site-page-image-file]");
      if (pageImageFile) {
        void uploadPageImage(pageImageFile);
        return;
      }
      const visible = event.target.closest("[data-site-menu-visible]");
      if (visible) {
        const item = findMenuItem(visible.dataset.siteMenuVisible);
        if (item) {
          recordHistory(`menu-visible:${visible.dataset.siteMenuVisible}`);
          item.visible = visible.checked;
        }
        applySettings(state.draft);
        renderPreview();
        updateDirtyState();
        return;
      }
      const fileInput = event.target.closest("[data-site-image-file]");
      if (fileInput) {
        void uploadImage(fileInput);
        return;
      }
      if (event.target.matches("#siteStudioImportInput")) {
        void importSettings(event.target);
        return;
      }
      if (event.target.matches("#siteStudioPreviewPage")) renderPreview();
    });

    page.addEventListener("click", (event) => {
      const pageButton = event.target.closest("[data-site-page-id]");
      if (pageButton) {
        selectPageEditor(pageButton.dataset.sitePageId, { scroll: false });
        return;
      }
      if (event.target.closest("#siteStudioOpenSelectedPageBtn")) {
        state.callbacks.switchPage(state.activePageId);
        return;
      }
      if (event.target.closest("#siteStudioResetSelectedPageBtn")) {
        resetSelectedPage();
        return;
      }
      const textGroup = event.target.closest("[data-site-text-group]");
      if (textGroup) {
        state.activeTextGroup = textGroup.dataset.siteTextGroup;
        renderTextEditor();
        return;
      }
      const previewDevice = event.target.closest("[data-site-preview-device]");
      if (previewDevice) {
        state.previewDevice = previewDevice.dataset.sitePreviewDevice;
        renderPreview();
        return;
      }
      const themePreset = event.target.closest("[data-site-theme-preset]");
      if (themePreset) {
        applyThemePreset(themePreset.dataset.siteThemePreset);
        return;
      }
      const layoutPreset = event.target.closest("[data-site-layout-preset]");
      if (layoutPreset) {
        applyLayoutPreset(layoutPreset.dataset.siteLayoutPreset);
        return;
      }
      const resetText = event.target.closest("[data-site-reset-text]");
      if (resetText) {
        resetTextField(resetText.dataset.siteResetText);
        return;
      }
      const resetImage = event.target.closest("[data-site-reset-image]");
      if (resetImage) {
        resetImageField(resetImage.dataset.siteResetImage);
        return;
      }
      const move = event.target.closest("[data-site-menu-move]");
      if (move) {
        moveMenuItem(move.dataset.siteMenuMove, move.dataset.direction);
        return;
      }
      const section = event.target.closest("[data-site-studio-section]");
      if (section) {
        setActiveSection(section.dataset.siteStudioSection);
        return;
      }
      const adminView = event.target.closest("[data-studio-admin-view]");
      if (adminView) {
        state.callbacks.switchPage("adminPage");
        state.callbacks.switchAdminView(adminView.dataset.studioAdminView);
      }
    });

    document.querySelector("#siteStudioSaveBtn")?.addEventListener("click", saveSettings);
    document.querySelector("#siteStudioSaveBottomBtn")?.addEventListener("click", saveSettings);
    document.querySelector("#siteStudioUndoBtn")?.addEventListener("click", undoDraft);
    document.querySelector("#siteStudioUndoBottomBtn")?.addEventListener("click", undoDraft);
    document.querySelector("#siteStudioRedoBtn")?.addEventListener("click", redoDraft);
    document.querySelector("#siteStudioDiscardBtn")?.addEventListener("click", () => {
      state.draft = clone(state.saved);
      state.history = [];
      state.future = [];
      applySettings(state.saved);
      renderAllEditors();
      setActiveSection(state.activeSection, { scroll: false });
      setStatus("저장 전 변경사항을 취소했습니다.");
    });
    document.querySelector("#siteStudioResetBtn")?.addEventListener("click", resetSettings);
    document.querySelector("#siteStudioExportBtn")?.addEventListener("click", exportSettings);
    document.querySelector("#siteStudioImportBtn")?.addEventListener("click", () => document.querySelector("#siteStudioImportInput")?.click());
    document.querySelector("#siteStudioOpenPreviewBtn")?.addEventListener("click", () => state.callbacks.switchPage("homePage"));
    document.querySelector("#siteStudioGlobalSearch")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleGlobalSearch(event.currentTarget.value);
    });
    page.addEventListener("keydown", (event) => {
      const keyboardAction = event.target.closest('[data-studio-admin-view][role="button"]');
      if (keyboardAction && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        state.callbacks.switchPage("adminPage");
        state.callbacks.switchAdminView(keyboardAction.dataset.studioAdminView);
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = String(event.key || "").toLowerCase();
      if (key === "s") {
        event.preventDefault();
        void saveSettings();
        return;
      }
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redoDraft();
        return;
      }
      if (key === "z") {
        event.preventDefault();
        undoDraft();
      }
    });
  }

  async function enter() {
    if (state.loading) return;
    state.loading = true;
    setStatus("저장된 디자인 설정을 불러오는 중입니다.");
    try {
      const payload = await state.callbacks.requestJson("/api/admin/site-settings", {
        headers: state.callbacks.getAdminAuthHeaders()
      }, { retries: 1, timeoutMs: 8000 });
      state.defaults = mergeSettings(payload.defaults);
      state.saved = mergeSettings(payload.settings);
      state.draft = clone(state.saved);
      state.history = [];
      state.future = [];
      applySettings(state.saved);
      renderAllEditors();
      setActiveSection(state.activeSection, { scroll: false });
      setStatus("운영 서버 설정을 불러왔습니다. 수정 후 저장하면 고객 화면에 즉시 반영됩니다.", "success");
    } catch (error) {
      renderAllEditors();
      setStatus(error.message || "디자인 설정을 불러오지 못했습니다.", "error");
    } finally {
      state.loading = false;
    }
  }

  function renderOperationsSummary(summary = {}) {
    const container = document.querySelector("#siteStudioOpsSummary");
    if (!container) return;
    const items = [
      ["전체 상품", `${Number(summary.products || 0).toLocaleString("ko-KR")}개`, "상품 관리 열기", "products"],
      ["타일 상품", `${Number(summary.tiles || 0).toLocaleString("ko-KR")}개`, "타일 현황 보기", "products"],
      ["승인 대기", `${Number(summary.pendingSignups || 0).toLocaleString("ko-KR")}건`, "회원 검토하기", "orders"],
      ["주문·장바구니", `${Number(summary.orders || 0).toLocaleString("ko-KR")}건`, "주문 흐름 보기", "orders"]
    ];
    container.innerHTML = items.map(([label, value, note, view]) => `
      <article data-studio-admin-view="${escapeHtml(view)}" tabindex="0" role="button">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(note)}</small>
      </article>
    `).join("");
  }

  function openPageEditor(pageId) {
    const targetPageId = PAGE_DEFINITION_BY_ID.has(pageId) ? pageId : "homePage";
    selectPageEditor(targetPageId, { scroll: false });
    setActiveSection("siteStudioPageSection", { scroll: true });
    setStatus(`${PAGE_DEFINITION_BY_ID.get(targetPageId).label} 화면 편집기를 열었습니다.`);
  }

  function initialize(callbacks) {
    state.callbacks = callbacks;
    if (!state.initialized) {
      state.initialized = true;
      bindEvents();
      renderAllEditors();
    }
  }

  global.TbpSiteStudio = {
    applySettings,
    defaults: clone(DEFAULT_SETTINGS),
    enter,
    hasPage: (pageId) => PAGE_DEFINITION_BY_ID.has(pageId),
    initialize,
    loadPublicSettings,
    openPageEditor,
    renderOperationsSummary
  };
})(window);
