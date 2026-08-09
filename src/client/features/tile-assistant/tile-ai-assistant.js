(function initTileAiModule(globalScope) {
  "use strict";

  const ALLOWED_PAGE_TARGETS = new Set(["samplePage", "quantityCalculatorPage", "proposalPage", "cartPage"]);

  function buildRequestHistory(messages) {
    return (Array.isArray(messages) ? messages : [])
      .filter((item) => !item?.pending && ["user", "assistant"].includes(item?.role))
      .map((item) => ({
        role: item.role,
        content: String(item.content || "").trim().slice(0, 1000)
      }))
      .filter((item) => item.content)
      .slice(-8);
  }

  function normalizeRecommendationActions(actions) {
    return (Array.isArray(actions) ? actions : []).flatMap((action) => {
      if (action?.type === "open-product-search") {
        return [{
          type: "open-product-search",
          label: String(action?.label || "추천 상품 보기").trim().slice(0, 40) || "추천 상품 보기",
          targetPage: "productsPage",
          query: String(action?.query || "타일").trim().slice(0, 180) || "타일"
        }];
      }
      if (action?.type === "open-page" && ALLOWED_PAGE_TARGETS.has(action?.targetPage)) {
        return [{
          type: "open-page",
          label: String(action?.label || "다음 단계").trim().slice(0, 40) || "다음 단계",
          targetPage: action.targetPage
        }];
      }
      return [];
    }).slice(0, 5);
  }

  function normalizeRecommendations(entries) {
    return (Array.isArray(entries) ? entries : []).slice(0, 10).map((entry) => ({
      id: String(entry?.id || "").trim().slice(0, 120),
      name: String(entry?.name || "타일 상품").trim().slice(0, 240),
      size: String(entry?.size || "").trim().slice(0, 80),
      finish: String(entry?.finish || "").trim().slice(0, 80),
      color: String(entry?.color || "").trim().slice(0, 80),
      style: String(entry?.style || "").trim().slice(0, 160),
      material: String(entry?.material || "").trim().slice(0, 80),
      image: String(entry?.image || "").trim().slice(0, 2000),
      reasons: (Array.isArray(entry?.reasons) ? entry.reasons : []).slice(0, 4).map((value) => String(value).slice(0, 80))
    }));
  }

  function readAuthSession(storage) {
    try {
      return JSON.parse(storage?.getItem("tbpAuthSession") || "null");
    } catch {
      return null;
    }
  }

  function buildAssistantAuthHeaders(storage) {
    const auth = readAuthSession(storage);
    if (auth?.role === "admin" && auth.adminUsername && auth.adminToken) {
      return { "X-Admin-Username": auth.adminUsername, "X-Admin-Token": auth.adminToken };
    }
    if (auth?.businessNumber && auth.memberToken) {
      return { "X-Business-Number": auth.businessNumber, "X-Member-Token": auth.memberToken };
    }
    return {};
  }

  function initializeTileAiAssistant(doc = globalScope.document, fetchImpl = globalScope.fetch) {
    if (!doc) return null;
    const launcher = doc.getElementById("tileAiLauncher");
    const panel = doc.getElementById("tileAiPanel");
    const closeButton = doc.getElementById("tileAiClose");
    const newProjectButton = doc.getElementById("tileAiNewProject");
    const projectTitle = doc.getElementById("tileAiProjectTitle");
    const projectStage = doc.getElementById("tileAiProjectStage");
    const form = doc.getElementById("tileAiForm");
    const input = doc.getElementById("tileAiInput");
    const sendButton = doc.getElementById("tileAiSend");
    const messagesElement = doc.getElementById("tileAiMessages");
    if (!launcher || !panel || !closeButton || !form || !input || !sendButton || !messagesElement) return null;

    const storage = globalScope.localStorage;
    const initialMessagesMarkup = messagesElement.innerHTML;
    const messages = [];
    const clientKey = readOrCreateClientKey(storage, globalScope.crypto);
    let projectId = readStoredProjectId(storage);
    let pending = false;
    let restored = false;

    function setProjectMeta(project) {
      if (projectTitle) projectTitle.textContent = String(project?.title || "새 현장 상담");
      if (projectStage) projectStage.textContent = String(project?.stage || "조건확인");
    }

    function setOpen(open) {
      panel.hidden = !open;
      launcher.setAttribute("aria-expanded", String(open));
      launcher.classList.toggle("is-open", open);
      if (open) {
        void restoreProject();
        globalScope.setTimeout(() => input.focus(), 0);
      } else if (doc.activeElement !== launcher) {
        launcher.focus();
      }
    }

    function appendConditions(article, conditions) {
      const entries = (Array.isArray(conditions) ? conditions : []).slice(0, 9);
      if (!entries.length) return;
      const wrap = doc.createElement("div");
      wrap.className = "tile-ai-condition-list";
      entries.forEach((condition) => {
        const chip = doc.createElement("span");
        const label = String(condition?.label || "조건").trim();
        const value = String(condition?.value || "").trim();
        if (!value) return;
        chip.textContent = `${label} ${value}`;
        wrap.appendChild(chip);
      });
      if (wrap.childElementCount) article.appendChild(wrap);
    }

    function dispatchProductDetail(productId) {
      const EventConstructor = doc.defaultView?.CustomEvent || globalScope.CustomEvent;
      if (typeof EventConstructor !== "function") return false;
      const event = new EventConstructor("tile-ai:open-product-detail", {
        bubbles: true,
        cancelable: true,
        detail: { productId }
      });
      return !doc.dispatchEvent(event);
    }

    function appendRecommendations(article, recommendations) {
      const entries = normalizeRecommendations(recommendations);
      if (!entries.length) return;
      const wrap = doc.createElement("div");
      wrap.className = "tile-ai-recommendations";
      entries.forEach((product, index) => {
        const card = doc.createElement("article");
        card.className = "tile-ai-product-card";
        if (product.image) {
          const image = doc.createElement("img");
          image.src = product.image;
          image.alt = "";
          image.loading = "lazy";
          image.referrerPolicy = "no-referrer";
          image.addEventListener("error", () => image.remove(), { once: true });
          card.appendChild(image);
        }
        const body = doc.createElement("div");
        body.className = "tile-ai-product-card__body";
        const rank = doc.createElement("span");
        rank.className = "tile-ai-product-card__rank";
        rank.textContent = `${index + 1}`.padStart(2, "0");
        const name = doc.createElement("strong");
        name.textContent = product.name;
        const meta = doc.createElement("p");
        meta.textContent = [product.size, product.finish, product.color, product.style].filter(Boolean).join(" · ");
        body.append(rank, name, meta);
        if (product.reasons.length) {
          const reason = doc.createElement("small");
          reason.textContent = product.reasons.slice(0, 3).join(" · ");
          body.appendChild(reason);
        }
        if (product.id) {
          const detailButton = doc.createElement("button");
          detailButton.type = "button";
          detailButton.textContent = "상품 상세";
          detailButton.addEventListener("click", () => {
            const handled = dispatchProductDetail(product.id);
            setOpen(false);
            if (!handled && globalScope.location) globalScope.location.hash = "productDetailPage";
          });
          body.appendChild(detailButton);
        }
        card.appendChild(body);
        wrap.appendChild(card);
      });
      article.appendChild(wrap);
    }

    function appendQuantity(article, estimate) {
      if (!estimate || !Number(estimate.areaSqm)) return;
      const wrap = doc.createElement("div");
      wrap.className = "tile-ai-quantity";
      const metrics = [
        ["시공 면적", `${formatNumber(estimate.areaSqm)}㎡`],
        ["로스 포함", `${formatNumber(estimate.orderAreaSqm)}㎡`],
        ["예상 장수", Number(estimate.tileCount) ? `${formatNumber(estimate.tileCount)}장` : "상세 계산"],
        ["예상 박스", Number(estimate.boxCount) ? `${formatNumber(estimate.boxCount)}박스` : "상세 계산"]
      ];
      metrics.forEach(([label, value]) => {
        const item = doc.createElement("div");
        const labelElement = doc.createElement("span");
        labelElement.textContent = label;
        const valueElement = doc.createElement("strong");
        valueElement.textContent = value;
        item.append(labelElement, valueElement);
        wrap.appendChild(item);
      });
      article.appendChild(wrap);
    }

    function dispatchAction(action) {
      const EventConstructor = doc.defaultView?.CustomEvent || globalScope.CustomEvent;
      if (typeof EventConstructor !== "function") return false;
      const eventName = action.type === "open-product-search" ? "tile-ai:open-products" : "tile-ai:navigate";
      const detail = action.type === "open-product-search"
        ? { query: action.query, targetPage: action.targetPage }
        : { targetPage: action.targetPage };
      const event = new EventConstructor(eventName, { bubbles: true, cancelable: true, detail });
      return !doc.dispatchEvent(event);
    }

    function appendMessage(role, content, options = {}) {
      const article = doc.createElement("article");
      article.className = `tile-ai-message is-${role}`;
      if (options.pending) article.classList.add("is-pending");
      const bubble = doc.createElement("div");
      bubble.className = "tile-ai-message__bubble";
      bubble.textContent = content;
      article.appendChild(bubble);
      appendConditions(article, options.conditions);
      appendRecommendations(article, options.recommendations);
      appendQuantity(article, options.quantityEstimate);

      const actions = normalizeRecommendationActions(options.actions);
      if (actions.length) {
        const actionWrap = doc.createElement("div");
        actionWrap.className = "tile-ai-message__actions";
        actions.forEach((action) => {
          const button = doc.createElement("button");
          button.type = "button";
          button.textContent = action.label;
          button.addEventListener("click", () => {
            const handled = dispatchAction(action);
            setOpen(false);
            if (!handled && globalScope.location) globalScope.location.hash = action.targetPage;
          });
          actionWrap.appendChild(button);
        });
        article.appendChild(actionWrap);
      }
      messagesElement.appendChild(article);
      messagesElement.scrollTop = messagesElement.scrollHeight;
      return article;
    }

    async function restoreProject() {
      if (restored || !projectId || pending) return;
      restored = true;
      try {
        const query = new URLSearchParams({ projectId, clientKey });
        const response = await fetchImpl(`/api/tile-assistant/project?${query.toString()}`, {
          headers: { Accept: "application/json", ...buildAssistantAuthHeaders(storage) }
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.project) return;
        const project = result.project;
        const projectMessages = Array.isArray(project.messages) ? project.messages : [];
        if (!projectMessages.length) return;
        messagesElement.innerHTML = "";
        messages.length = 0;
        projectMessages.forEach((entry, index) => {
          const isLast = index === projectMessages.length - 1 && entry.role === "assistant";
          appendMessage(entry.role, entry.content, isLast ? {
            conditions: toConditionEntries(project.intent),
            recommendations: project.recommendations,
            quantityEstimate: project.quantityEstimate
          } : {});
          messages.push({ role: entry.role, content: entry.content });
        });
        setProjectMeta(project);
      } catch {
        // The next message starts a fresh project if restoration is unavailable.
      }
    }

    async function askQuestion(rawMessage) {
      const message = String(rawMessage || "").trim();
      if (!message || pending) return;
      pending = true;
      sendButton.disabled = true;
      input.disabled = true;
      appendMessage("user", message);
      const history = buildRequestHistory(messages);
      messages.push({ role: "user", content: message });
      const loadingMessage = appendMessage("assistant", "현장 조건과 상품 DB를 확인하고 있어요…", { pending: true });

      try {
        const response = await fetchImpl("/api/tile-assistant/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...buildAssistantAuthHeaders(storage)
          },
          body: JSON.stringify({ message, history, projectId, clientKey })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.error || "타일 AI에 연결하지 못했습니다.");
        const answer = String(result?.message || "답변을 생성하지 못했습니다.").trim();
        loadingMessage.remove();
        appendMessage("assistant", answer, {
          actions: result?.actions,
          conditions: result?.interpretedConditions,
          recommendations: result?.recommendations,
          quantityEstimate: result?.quantityEstimate
        });
        messages.push({ role: "assistant", content: answer });
        if (result?.projectId) {
          projectId = String(result.projectId);
          storeProjectId(storage, projectId);
        }
        setProjectMeta(result?.project || { stage: result?.stage });
      } catch (error) {
        loadingMessage.remove();
        appendMessage("error", String(error?.message || "잠시 후 다시 질문해 주세요."));
      } finally {
        pending = false;
        sendButton.disabled = false;
        input.disabled = false;
        input.value = "";
        input.focus();
      }
    }

    function startNewProject() {
      projectId = "";
      restored = true;
      removeStoredProjectId(storage);
      messages.length = 0;
      messagesElement.innerHTML = initialMessagesMarkup;
      setProjectMeta(null);
      input.focus();
    }

    launcher.addEventListener("click", () => setOpen(panel.hidden));
    closeButton.addEventListener("click", () => setOpen(false));
    newProjectButton?.addEventListener("click", startNewProject);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      askQuestion(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    doc.querySelectorAll("[data-tile-ai-question]").forEach((button) => {
      button.addEventListener("click", () => {
        setOpen(true);
        askQuestion(button.dataset.tileAiQuestion);
      });
    });
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });

    return { askQuestion, setOpen, startNewProject };
  }

  function readOrCreateClientKey(storage, cryptoApi) {
    const storageKey = "tbpTileAssistantClientKey";
    try {
      const current = String(storage?.getItem(storageKey) || "").trim();
      if (current) return current;
      const next = typeof cryptoApi?.randomUUID === "function"
        ? cryptoApi.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      storage?.setItem(storageKey, next);
      return next;
    } catch {
      return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  function projectStorageKey(storage) {
    const auth = readAuthSession(storage);
    const owner = auth?.role === "admin" ? auth.adminUsername : auth?.businessNumber;
    return `tbpTileSalesProjectId:${owner || "guest"}`;
  }

  function readStoredProjectId(storage) {
    try { return String(storage?.getItem(projectStorageKey(storage)) || "").trim(); } catch { return ""; }
  }

  function storeProjectId(storage, projectId) {
    try { storage?.setItem(projectStorageKey(storage), projectId); } catch { /* local storage unavailable */ }
  }

  function removeStoredProjectId(storage) {
    try { storage?.removeItem(projectStorageKey(storage)); } catch { /* local storage unavailable */ }
  }

  function toConditionEntries(intent) {
    const labels = { space: "공간", application: "용도", size: "규격", finish: "마감", color: "색상", style: "스타일", material: "재질", areaSqm: "면적" };
    return Object.entries(labels).flatMap(([key, label]) => {
      const value = intent?.[key];
      if (value === undefined || value === null || value === "") return [];
      return [{ key, label, value: key === "areaSqm" ? `${formatNumber(value)}㎡` : String(value) }];
    });
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  const api = {
    buildAssistantAuthHeaders,
    buildRequestHistory,
    normalizeRecommendationActions,
    normalizeRecommendations,
    initializeTileAiAssistant
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (globalScope) globalScope.TileAiAssistant = api;
  if (globalScope.document) {
    if (globalScope.document.readyState === "loading") {
      globalScope.document.addEventListener("DOMContentLoaded", () => initializeTileAiAssistant());
    } else {
      initializeTileAiAssistant();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
