(function initializeSketchupWorkspace(global) {
  const PAGE_SIZE = 24;
  const state = {
    context: null,
    bound: false,
    currentPackage: null,
    selected: new Map(),
    source: "catalog",
    resultLimit: PAGE_SIZE,
    recentPackages: [],
    recentLoaded: false,
    pollTimer: 0
  };

  function render(context) {
    state.context = context;
    bindEvents();
    seedCartSelections();
    renderProducts();
    renderPackage();
    if (!state.recentLoaded) loadRecentPackages();
  }

  function bindEvents() {
    if (state.bound) return;
    state.bound = true;
    document.querySelector("#sketchupPackageForm")?.addEventListener("submit", createPackage);
    document.querySelector("#sketchupProductList")?.addEventListener("click", handleProductAction);
    document.querySelector("#sketchupProductSearch")?.addEventListener("input", () => {
      state.resultLimit = PAGE_SIZE;
      renderProducts();
    });
    document.querySelector(".sketchup-source-tabs")?.addEventListener("click", handleSourceChange);
    document.querySelector("#sketchupLoadMoreBtn")?.addEventListener("click", () => {
      state.resultLimit += PAGE_SIZE;
      renderProducts();
    });
    document.querySelector("#sketchupCopyCodeBtn")?.addEventListener("click", copyPairingCode);
    document.querySelector("#sketchupReportList")?.addEventListener("click", handleReportAction);
    document.querySelector("#sketchupRecentPackages")?.addEventListener("click", handleRecentPackageAction);
    document.querySelector("#sketchupGroutColor")?.addEventListener("input", updateGroutColorLabel);
  }

  function getTileCatalogItems() {
    return (Array.isArray(state.context?.products) ? state.context.products : []).filter(isTile);
  }

  function getTileCartItems() {
    const cart = Array.isArray(state.context?.cart) ? state.context.cart : [];
    const productById = new Map(getTileCatalogItems().map((product) => [String(product.id), product]));
    return cart.flatMap((item) => {
      const product = { ...(productById.get(String(item.id)) || {}), ...item };
      return isTile(product) ? [product] : [];
    });
  }

  function isTile(product) {
    return String(product?.productType || "").toLowerCase() === "tile"
      || String(product?.mainCategory || "") === "타일";
  }

  function seedCartSelections() {
    getTileCartItems().forEach((product) => {
      const id = String(product.id);
      if (!state.selected.has(id)) state.selected.set(id, { selected: true, role: inferRole(product) });
    });
  }

  function getFilteredProducts() {
    const sourceItems = state.source === "cart" ? getTileCartItems() : getTileCatalogItems();
    const query = normalizeSearch(document.querySelector("#sketchupProductSearch")?.value);
    if (!query) return sourceItems;
    const tokens = query.split(" ").filter(Boolean);
    return sourceItems.filter((product) => {
      const haystack = normalizeSearch([
        product.name,
        product.modelName,
        product.size,
        product.finish,
        product.surface,
        product.color,
        product.patternCategory,
        product.material,
        product.kind,
        product.option
      ].filter(Boolean).join(" "));
      return tokens.every((token) => haystack.includes(token));
    });
  }

  function renderProducts() {
    const mount = document.querySelector("#sketchupProductList");
    if (!mount) return;
    const results = getFilteredProducts();
    const visibleItems = results.slice(0, state.resultLimit);
    const cartIds = new Set(getTileCartItems().map((item) => String(item.id)));

    document.querySelectorAll("[data-sketchup-source]").forEach((button) => {
      const active = button.dataset.sketchupSource === state.source;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const count = document.querySelector("#sketchupProductCount");
    const selectedCount = [...state.selected.values()].filter((entry) => entry.selected).length;
    if (count) count.textContent = `${formatNumber(results.length, 0)}개 검색 · ${formatNumber(selectedCount, 0)}개 선택`;
    const moreButton = document.querySelector("#sketchupLoadMoreBtn");
    if (moreButton) moreButton.hidden = visibleItems.length >= results.length;

    if (!visibleItems.length) {
      mount.innerHTML = `
        <div class="sketchup-empty-products">
          <strong>${state.source === "cart" ? "장바구니에 타일이 없습니다." : "검색 결과가 없습니다."}</strong>
          <span>${state.source === "cart" ? "전체 타일에서 선택하거나 타일GO에서 먼저 담아주세요." : "품번이나 규격을 바꿔 다시 검색해주세요."}</span>
          <button class="secondary-action" type="button" data-page-target="productsPage">타일 찾기</button>
        </div>
      `;
      return;
    }

    mount.innerHTML = visibleItems.map((product) => {
      const id = String(product.id);
      if (!state.selected.has(id)) {
        state.selected.set(id, { selected: cartIds.has(id), role: inferRole(product) });
      }
      const selection = state.selected.get(id);
      const image = selectImage(product);
      return `
        <article class="sketchup-product ${selection.selected ? "is-selected" : ""}" data-sketchup-item="${escapeHtml(id)}" data-selected="${selection.selected}" data-role="${selection.role}">
          <button class="sketchup-product-check" type="button" data-sketchup-toggle aria-pressed="${selection.selected}" aria-label="${escapeHtml(product.name || "타일")} 선택">
            <span aria-hidden="true">${selection.selected ? "✓" : ""}</span>
          </button>
          ${cartIds.has(id) ? "<span class=\"sketchup-cart-badge\">장바구니</span>" : ""}
          <div class="sketchup-product-image">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" />` : "<span>NO IMAGE</span>"}</div>
          <div class="sketchup-product-copy">
            <strong>${escapeHtml(product.name || "타일")}</strong>
            <span>${escapeHtml([product.modelName, product.size, product.finish || product.surface].filter(Boolean).join(" · "))}</span>
          </div>
          <div class="sketchup-role-control" role="group" aria-label="적용 용도">
            ${roleButton("wall", "벽", selection.role)}
            ${roleButton("floor", "바닥", selection.role)}
            ${roleButton("point", "포인트", selection.role)}
          </div>
        </article>
      `;
    }).join("");
  }

  function roleButton(value, label, currentRole) {
    return `<button class="${value === currentRole ? "is-active" : ""}" type="button" data-sketchup-role="${value}" aria-pressed="${value === currentRole}">${label}</button>`;
  }

  function handleSourceChange(event) {
    const button = event.target.closest("[data-sketchup-source]");
    if (!button) return;
    state.source = button.dataset.sketchupSource === "cart" ? "cart" : "catalog";
    state.resultLimit = PAGE_SIZE;
    renderProducts();
  }

  function handleProductAction(event) {
    const pageButton = event.target.closest("[data-page-target]");
    if (pageButton) {
      state.context?.switchPage?.(pageButton.dataset.pageTarget);
      return;
    }
    const item = event.target.closest("[data-sketchup-item]");
    if (!item) return;
    const id = item.dataset.sketchupItem;
    const current = state.selected.get(id) || { selected: true, role: "floor" };
    if (event.target.closest("[data-sketchup-toggle]")) current.selected = !current.selected;
    const roleButtonElement = event.target.closest("[data-sketchup-role]");
    if (roleButtonElement) {
      current.role = roleButtonElement.dataset.sketchupRole;
      current.selected = true;
    }
    state.selected.set(id, current);
    renderProducts();
  }

  async function createPackage(event) {
    event.preventDefault();
    const selectedItems = [...state.selected.entries()]
      .filter(([, selection]) => selection.selected)
      .map(([productId, selection]) => ({ productId, role: selection.role }));
    if (!selectedItems.length) {
      setStatus("연동할 타일을 한 개 이상 선택해주세요.", true);
      return;
    }

    const button = document.querySelector("#sketchupCreatePackageBtn");
    if (button) button.disabled = true;
    setStatus("로컬 자재 패키지를 만들고 있습니다.");
    try {
      const payload = await state.context.requestJson("/api/local/sketchup/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: {
            name: readValue("#sketchupProjectName"),
            siteName: readValue("#sketchupSiteName"),
            roomName: readValue("#sketchupRoomName"),
            note: readValue("#sketchupProjectNote")
          },
          groutMm: readValue("#sketchupGroutMm"),
          groutColor: readValue("#sketchupGroutColor"),
          offsetXmm: readValue("#sketchupOffsetX"),
          offsetYmm: readValue("#sketchupOffsetY"),
          wastePercent: readValue("#sketchupWastePercent"),
          items: selectedItems
        })
      }, { timeoutMs: 12000 });
      state.currentPackage = payload.package;
      renderPackage();
      setStatus(`${payload.package.items.length}개 타일의 연동 코드가 생성되었습니다.`);
      startReportPolling();
      await loadRecentPackages(true);
    } catch (error) {
      setStatus(error.message || "연동 패키지를 만들지 못했습니다.", true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function renderPackage() {
    const record = state.currentPackage;
    const codeElement = document.querySelector("#sketchupPairingCode");
    const copyButton = document.querySelector("#sketchupCopyCodeBtn");
    if (codeElement) codeElement.textContent = record?.code || "------";
    if (copyButton) copyButton.disabled = !record?.code;
    renderReports(record?.reports || []);
  }

  function renderReports(reports) {
    const mount = document.querySelector("#sketchupReportList");
    if (!mount) return;
    if (!reports.length) {
      mount.innerHTML = "<p>아직 적용된 면이 없습니다.</p>";
      return;
    }
    const itemById = new Map((state.currentPackage?.items || []).map((item) => [String(item.productId), item]));
    mount.innerHTML = reports.map((report) => {
      const item = itemById.get(String(report.productId));
      return `
        <article>
          <strong>${escapeHtml(item?.name || getRoleLabel(report.role))}</strong>
          <span>${getRoleLabel(report.role)} · ${formatNumber(report.areaSqm)}㎡ · ${formatNumber(report.tileCount, 0)}장${report.boxCount ? ` · ${formatNumber(report.boxCount, 0)}박스` : ""}</span>
          <small>${escapeHtml(formatDate(report.appliedAt))}</small>
          ${report.boxCount ? `<button type="button" data-sketchup-cart-product="${escapeHtml(report.productId)}" data-sketchup-cart-quantity="${Number(report.boxCount) || 1}">장바구니 수량 반영</button>` : ""}
        </article>
      `;
    }).join("");
  }

  function handleReportAction(event) {
    const button = event.target.closest("[data-sketchup-cart-product]");
    if (!button) return;
    const applied = state.context?.applyCartQuantity?.(
      button.dataset.sketchupCartProduct,
      Number(button.dataset.sketchupCartQuantity) || 1
    );
    setStatus(applied ? "산출 박스 수를 장바구니에 반영했습니다." : "장바구니에 반영하지 못했습니다.", !applied);
  }

  async function loadRecentPackages(force = false) {
    if (state.recentLoaded && !force) return;
    try {
      const payload = await state.context.requestJson("/api/local/sketchup/packages?limit=8", {}, { timeoutMs: 5000 });
      state.recentPackages = Array.isArray(payload.packages) ? payload.packages : [];
      state.recentLoaded = true;
      renderRecentPackages();
    } catch {
      const mount = document.querySelector("#sketchupRecentPackages");
      if (mount) mount.innerHTML = "<p>최근 작업을 불러오지 못했습니다.</p>";
    }
  }

  function renderRecentPackages() {
    const mount = document.querySelector("#sketchupRecentPackages");
    if (!mount) return;
    if (!state.recentPackages.length) {
      mount.innerHTML = "<p>저장된 연동 작업이 없습니다.</p>";
      return;
    }
    mount.innerHTML = state.recentPackages.map((record) => `
      <button type="button" data-sketchup-recent-code="${escapeHtml(record.code)}">
        <span><strong>${escapeHtml(record.project?.name || "SketchUp 프로젝트")}</strong><small>${escapeHtml([record.project?.siteName, record.project?.roomName].filter(Boolean).join(" · ") || formatDate(record.createdAt))}</small></span>
        <b>${escapeHtml(record.code)}</b>
      </button>
    `).join("");
  }

  async function handleRecentPackageAction(event) {
    const button = event.target.closest("[data-sketchup-recent-code]");
    if (!button) return;
    try {
      const payload = await state.context.requestJson(`/api/local/sketchup/packages/${encodeURIComponent(button.dataset.sketchupRecentCode)}`, {}, { timeoutMs: 5000 });
      restorePackage(payload.package);
      setStatus("최근 연동 작업을 불러왔습니다.");
      startReportPolling();
    } catch (error) {
      setStatus(error.message || "최근 작업을 불러오지 못했습니다.", true);
    }
  }

  function restorePackage(record) {
    state.currentPackage = record;
    state.selected.clear();
    (record.items || []).forEach((item) => state.selected.set(String(item.productId), { selected: true, role: item.role || "floor" }));
    setFormValue("#sketchupProjectName", record.project?.name);
    setFormValue("#sketchupSiteName", record.project?.siteName);
    setFormValue("#sketchupRoomName", record.project?.roomName);
    setFormValue("#sketchupProjectNote", record.project?.note);
    setFormValue("#sketchupGroutMm", record.grout?.widthMm ?? record.groutMm);
    setFormValue("#sketchupGroutColor", record.grout?.color || "#D8D5CF");
    setFormValue("#sketchupOffsetX", record.layout?.offsetXmm ?? 0);
    setFormValue("#sketchupOffsetY", record.layout?.offsetYmm ?? 0);
    setFormValue("#sketchupWastePercent", record.wastePercent);
    updateGroutColorLabel();
    renderProducts();
    renderPackage();
  }

  function startReportPolling() {
    if (state.pollTimer) window.clearInterval(state.pollTimer);
    state.pollTimer = window.setInterval(async () => {
      if (!document.querySelector("#sketchupPage")?.classList.contains("active") || !state.currentPackage?.code) return;
      try {
        const payload = await state.context.requestJson(`/api/local/sketchup/packages/${encodeURIComponent(state.currentPackage.code)}`, {}, { timeoutMs: 5000 });
        state.currentPackage = payload.package;
        renderPackage();
      } catch {
        // A temporary local connection loss should not interrupt SketchUp work.
      }
    }, 4000);
  }

  async function copyPairingCode() {
    if (!state.currentPackage?.code) return;
    try {
      await navigator.clipboard.writeText(state.currentPackage.code);
      setStatus("연동 코드를 복사했습니다.");
    } catch {
      setStatus(`연동 코드: ${state.currentPackage.code}`);
    }
  }

  function inferRole(product) {
    const text = [product.kind, product.option, product.features, product.name].filter(Boolean).join(" ");
    return /벽|wall/i.test(text) && !/바닥|floor/i.test(text) ? "wall" : "floor";
  }

  function selectImage(product) {
    return String(product.image || product.originalImage || product.closeImage || product.detailImage || "");
  }

  function getRoleLabel(role) {
    return role === "wall" ? "벽" : role === "point" ? "포인트" : "바닥";
  }

  function updateGroutColorLabel() {
    const input = document.querySelector("#sketchupGroutColor");
    const label = document.querySelector("#sketchupGroutColorValue");
    if (label) label.textContent = String(input?.value || "#D8D5CF").toUpperCase();
  }

  function setStatus(message, isError = false) {
    const status = document.querySelector("#sketchupPackageStatus");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function readValue(selector) {
    return document.querySelector(selector)?.value || "";
  }

  function setFormValue(selector, value) {
    const element = document.querySelector(selector);
    if (element && value !== undefined && value !== null) element.value = value;
  }

  function normalizeSearch(value) {
    return String(value || "").toLowerCase().replace(/[×*]/g, "x").replace(/[^0-9a-z가-힣]+/g, " ").trim();
  }

  function formatNumber(value, digits = 2) {
    return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: digits }).format(Number(value) || 0);
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  global.TbpSketchupWorkspace = { render };
})(window);
