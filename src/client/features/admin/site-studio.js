(function attachSiteStudio(global) {
  const DEFAULT_SETTINGS = {
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
    ["메인 카드", "homeBathroomTitle", "욕실 공간 제목", "input"],
    ["메인 카드", "homeBathroomSubtitle", "욕실 공간 설명", "input"],
    ["메인 카드", "homeSearchTitle", "상품검색 제목", "input"],
    ["메인 카드", "homeSearchSubtitle", "상품검색 설명", "input"],
    ["메인 카드", "homeSampleTitle", "샘플GO 제목", "input"],
    ["메인 카드", "homeSampleSubtitle", "샘플GO 설명", "input"],
    ["메인 카드", "homePlannerTitle", "시공보기 제목", "input"],
    ["메인 카드", "homePlannerSubtitle", "시공보기 설명", "input"],
    ["메인 카드", "homeCartTitle", "장바구니 제목", "input"],
    ["메인 카드", "homeCartSubtitle", "장바구니 설명", "input"],
    ["메인 카드", "homeRecommendTitle", "추천 타일 제목", "input"],
    ["메인 카드", "homeRecommendSubtitle", "추천 타일 설명", "input"],
    ["메인 카드", "homeMyTitle", "마이페이지 제목", "input"],
    ["메인 카드", "homeMySubtitle", "마이페이지 설명", "input"],
    ["타일GO", "tileHeroEyebrow", "검색 영문 라벨", "input"],
    ["타일GO", "tileHeroTitle", "검색 제목", "input"],
    ["타일GO", "tileHeroDescription", "검색 설명", "textarea"],
    ["타일GO", "tileSearchLabel", "검색 입력 라벨", "input"],
    ["타일GO", "tileSearchHint", "검색 도움말", "textarea"],
    ["바스GO", "bathHeroEyebrow", "컬렉션 영문 라벨", "input"],
    ["바스GO", "bathHeroTitle", "히어로 제목", "textarea"],
    ["바스GO", "bathHeroDescription", "히어로 설명", "textarea"],
    ["바스GO", "bathSearchLabel", "검색 입력 라벨", "input"]
  ];

  const IMAGE_FIELDS = [
    ["homeAi", "메인 AI 타일검색", "권장 1200×1200 이상"],
    ["homeBathroom", "메인 욕실 공간", "권장 1200×1200 이상"],
    ["homePlanner", "메인 시공보기", "권장 1200×1200 이상"],
    ["homeRecommended", "메인 추천 타일", "권장 1200×1200 이상"],
    ["bathHero", "바스GO 대표 이미지", "권장 1800×900 이상"]
  ];

  const state = {
    callbacks: null,
    saved: clone(DEFAULT_SETTINGS),
    draft: clone(DEFAULT_SETTINGS),
    defaults: clone(DEFAULT_SETTINGS),
    initialized: false,
    loading: false
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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
    return {
      ...clone(DEFAULT_SETTINGS),
      ...source,
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(source.appearance || {}) },
      text: { ...DEFAULT_SETTINGS.text, ...(source.text || {}) },
      images: { ...DEFAULT_SETTINGS.images, ...(source.images || {}) },
      menu: Array.isArray(source.menu) && source.menu.length ? source.menu.map((item) => ({ ...item })) : clone(DEFAULT_SETTINGS.menu)
    };
  }

  function fontStack(fontFamily) {
    if (fontFamily === "pretendard") return '"Pretendard", "Noto Sans KR", "Segoe UI", sans-serif';
    if (fontFamily === "noto") return '"Noto Sans KR", "Segoe UI", Arial, sans-serif';
    if (fontFamily === "serif") return '"Noto Serif KR", "Nanum Myeongjo", Georgia, serif';
    return '"Segoe UI", "Noto Sans KR", Arial, sans-serif';
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
    const node = document.querySelector("#siteStudioDraftState");
    if (node) {
      node.textContent = isDirty() ? "저장하지 않은 변경사항이 있습니다." : "운영 서버에 저장된 상태입니다.";
      node.classList.toggle("is-dirty", isDirty());
    }
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
    container.innerHTML = TEXT_FIELDS.map(([group, key, label, type]) => `
      <label class="site-studio-text-field">
        <span><small>${escapeHtml(group)}</small>${escapeHtml(label)}</span>
        ${type === "textarea"
          ? `<textarea rows="2" data-site-text-input="${escapeHtml(key)}">${escapeHtml(state.draft.text[key] || "")}</textarea>`
          : `<input type="text" value="${escapeHtml(state.draft.text[key] || "")}" data-site-text-input="${escapeHtml(key)}" />`}
      </label>
    `).join("");
  }

  function renderImageEditor() {
    const container = document.querySelector("#siteStudioImageFields");
    if (!container) return;
    container.innerHTML = IMAGE_FIELDS.map(([key, label, hint]) => `
      <article class="site-studio-image-row">
        <img src="${escapeHtml(state.draft.images[key] || "")}" alt="" />
        <div>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(hint)}</small>
          <input type="text" value="${escapeHtml(state.draft.images[key] || "")}" data-site-image-input="${escapeHtml(key)}" />
        </div>
        <label class="secondary-action site-studio-file-button">
          이미지 선택
          <input type="file" accept="image/png,image/jpeg,image/webp" data-site-image-file="${escapeHtml(key)}" />
        </label>
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
            <p>${escapeHtml(settings.text.bathHeroDescription)}</p>
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
    renderAppearanceEditor();
    renderTextEditor();
    renderImageEditor();
    renderLayoutEditor();
    renderMenuEditor();
    renderPreview();
    updateDirtyState();
  }

  function updateAppearanceValue(key, rawValue, source) {
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

  async function saveSettings() {
    if (!state.callbacks?.isAdminUser?.()) {
      setStatus("관리자 로그인 후 저장할 수 있습니다.", "error");
      return;
    }
    const button = document.querySelector("#siteStudioSaveBtn");
    if (button) {
      button.disabled = true;
      button.textContent = "저장 중";
    }
    setStatus("운영 서버에 디자인 설정을 저장하고 있습니다.");
    try {
      const payload = await state.callbacks.requestJson("/api/admin/site-settings", {
        method: "POST",
        headers: state.callbacks.getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ settings: state.draft })
      }, { timeoutMs: 15000 });
      state.saved = mergeSettings(payload.settings);
      state.draft = clone(state.saved);
      applySettings(state.saved);
      renderAllEditors();
      setStatus("저장 완료. 고객 화면에 새 디자인이 즉시 적용되었습니다.", "success");
    } catch (error) {
      setStatus(error.message || "설정 저장에 실패했습니다.", "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "변경사항 저장";
      }
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

  function bindEvents() {
    const page = document.querySelector("#siteStudioPage");
    if (!page || page.dataset.siteStudioBound === "true") return;
    page.dataset.siteStudioBound = "true";

    page.addEventListener("input", (event) => {
      const appearance = event.target.closest("[data-site-appearance]");
      if (appearance) {
        updateAppearanceValue(appearance.dataset.siteAppearance, appearance.value, appearance);
        return;
      }
      const textInput = event.target.closest("[data-site-text-input]");
      if (textInput) {
        state.draft.text[textInput.dataset.siteTextInput] = textInput.value;
        applySettings(state.draft);
        renderPreview();
        updateDirtyState();
        return;
      }
      const imageInput = event.target.closest("[data-site-image-input]");
      if (imageInput) {
        state.draft.images[imageInput.dataset.siteImageInput] = imageInput.value;
        applySettings(state.draft);
        renderPreview();
        updateDirtyState();
        return;
      }
      const menuLabel = event.target.closest("[data-site-menu-label]");
      if (menuLabel) {
        const item = findMenuItem(menuLabel.dataset.siteMenuLabel);
        if (item) item.label = menuLabel.value;
        applySettings(state.draft);
        renderPreview();
        updateDirtyState();
      }
    });

    page.addEventListener("change", (event) => {
      const visible = event.target.closest("[data-site-menu-visible]");
      if (visible) {
        const item = findMenuItem(visible.dataset.siteMenuVisible);
        if (item) item.visible = visible.checked;
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
      const move = event.target.closest("[data-site-menu-move]");
      if (move) {
        moveMenuItem(move.dataset.siteMenuMove, move.dataset.direction);
        return;
      }
      const section = event.target.closest("[data-site-studio-section]");
      if (section) {
        document.querySelector(`#${section.dataset.siteStudioSection}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    document.querySelector("#siteStudioDiscardBtn")?.addEventListener("click", () => {
      state.draft = clone(state.saved);
      applySettings(state.saved);
      renderAllEditors();
      setStatus("저장 전 변경사항을 취소했습니다.");
    });
    document.querySelector("#siteStudioResetBtn")?.addEventListener("click", resetSettings);
    document.querySelector("#siteStudioExportBtn")?.addEventListener("click", exportSettings);
    document.querySelector("#siteStudioImportBtn")?.addEventListener("click", () => document.querySelector("#siteStudioImportInput")?.click());
    document.querySelector("#siteStudioOpenPreviewBtn")?.addEventListener("click", () => state.callbacks.switchPage("homePage"));
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
      applySettings(state.saved);
      renderAllEditors();
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
      ["전체 상품", `${Number(summary.products || 0).toLocaleString("ko-KR")}개`],
      ["타일 상품", `${Number(summary.tiles || 0).toLocaleString("ko-KR")}개`],
      ["승인 대기", `${Number(summary.pendingSignups || 0).toLocaleString("ko-KR")}건`],
      ["주문·장바구니", `${Number(summary.orders || 0).toLocaleString("ko-KR")}건`]
    ];
    container.innerHTML = items.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");
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
    initialize,
    loadPublicSettings,
    renderOperationsSummary
  };
})(window);
