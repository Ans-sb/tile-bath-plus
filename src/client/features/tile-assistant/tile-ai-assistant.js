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
    const projectListButton = doc.getElementById("tileAiProjectList");
    const projectTitle = doc.getElementById("tileAiProjectTitle");
    const projectStage = doc.getElementById("tileAiProjectStage");
    const projectManager = doc.getElementById("tileAiProjectManager");
    const projectManagerTitle = doc.getElementById("tileAiProjectManagerTitle");
    const projectManagerClose = doc.getElementById("tileAiProjectManagerClose");
    const projectListItems = doc.getElementById("tileAiProjectListItems");
    const projectForm = doc.getElementById("tileAiProjectForm");
    const projectEditId = doc.getElementById("tileAiProjectEditId");
    const siteNameInput = doc.getElementById("tileAiSiteName");
    const clientNameInput = doc.getElementById("tileAiClientName");
    const spaceTypeInput = doc.getElementById("tileAiSpaceType");
    const neededByInput = doc.getElementById("tileAiNeededBy");
    const siteAddressInput = doc.getElementById("tileAiSiteAddress");
    const siteNotesInput = doc.getElementById("tileAiSiteNotes");
    const projectFormCancel = doc.getElementById("tileAiProjectFormCancel");
    const projectStatus = doc.getElementById("tileAiProjectStatus");
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
    let currentProject = null;

    function setProjectMeta(project) {
      currentProject = project || null;
      if (projectTitle) projectTitle.textContent = String(project?.title || "새 현장 상담");
      if (projectStage) projectStage.textContent = String(project?.stage || "조건확인");
    }

    async function assistantFetch(path, options = {}) {
      const headers = {
        Accept: "application/json",
        ...buildAssistantAuthHeaders(storage),
        ...(options.headers || {})
      };
      const response = await fetchImpl(path, { ...options, headers });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "현장 프로젝트를 처리하지 못했습니다.");
      return result;
    }

    function setProjectStatus(message, tone = "") {
      if (!projectStatus) return;
      projectStatus.textContent = String(message || "");
      projectStatus.dataset.tone = tone;
    }

    function closeProjectManager() {
      if (!projectManager) return;
      projectManager.hidden = true;
      panel.classList.remove("is-project-manager-open");
      setProjectStatus("");
      globalScope.setTimeout(() => input.focus(), 0);
    }

    function fillProjectForm(project) {
      const site = project?.site || {};
      if (projectEditId) projectEditId.value = String(project?.id || "");
      if (siteNameInput) siteNameInput.value = String(site.siteName || "");
      if (clientNameInput) clientNameInput.value = String(site.clientName || "");
      if (spaceTypeInput) spaceTypeInput.value = String(site.spaceType || "");
      if (neededByInput) neededByInput.value = String(site.neededBy || "");
      if (siteAddressInput) siteAddressInput.value = String(site.siteAddress || "");
      if (siteNotesInput) siteNotesInput.value = String(site.notes || "");
    }

    function showProjectForm(project = null) {
      if (!projectManager || !projectForm || !projectListItems) return;
      projectManager.hidden = false;
      panel.classList.add("is-project-manager-open");
      projectListItems.hidden = true;
      projectForm.hidden = false;
      fillProjectForm(project);
      if (projectManagerTitle) projectManagerTitle.textContent = project?.id ? "현장 정보 수정" : "새 현장 만들기";
      setProjectStatus("");
      globalScope.setTimeout(() => siteNameInput?.focus(), 0);
    }

    function formatProjectDate(value) {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return "";
      return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
    }

    function renderProjectList(projects) {
      if (!projectListItems) return;
      projectListItems.innerHTML = "";
      const entries = Array.isArray(projects) ? projects : [];
      if (!entries.length) {
        const empty = doc.createElement("div");
        empty.className = "tile-ai-project-empty";
        empty.textContent = "저장된 현장이 없습니다.";
        const createButton = doc.createElement("button");
        createButton.type = "button";
        createButton.textContent = "첫 현장 만들기";
        createButton.addEventListener("click", () => showProjectForm());
        empty.appendChild(createButton);
        projectListItems.appendChild(empty);
        return;
      }

      entries.forEach((project) => {
        const row = doc.createElement("article");
        row.className = "tile-ai-project-row";
        if (project.id === projectId) row.classList.add("is-current");
        const content = doc.createElement("div");
        const title = doc.createElement("strong");
        title.textContent = String(project.title || project.site?.siteName || "현장 타일 프로젝트");
        const meta = doc.createElement("span");
        meta.textContent = [
          project.site?.clientName,
          project.site?.spaceType,
          `${Number(project.selectedProductCount) || 0}개 저장`,
          formatProjectDate(project.updatedAt)
        ].filter(Boolean).join(" · ");
        content.append(title, meta);

        const actions = doc.createElement("div");
        const openButton = doc.createElement("button");
        openButton.type = "button";
        openButton.textContent = project.id === projectId ? "현재 현장" : "열기";
        openButton.disabled = project.id === projectId;
        openButton.addEventListener("click", () => void loadProject(project.id));
        const editButton = doc.createElement("button");
        editButton.type = "button";
        editButton.textContent = "수정";
        editButton.addEventListener("click", async () => {
          try {
            setProjectStatus("현장 정보를 불러오는 중입니다.");
            const query = new URLSearchParams({ projectId: project.id, clientKey });
            const result = await assistantFetch(`/api/tile-assistant/project?${query.toString()}`);
            showProjectForm(result.project);
          } catch (error) {
            setProjectStatus(error.message, "error");
          }
        });
        actions.append(openButton, editButton);
        row.append(content, actions);
        projectListItems.appendChild(row);
      });
    }

    async function openProjectManager(mode = "list") {
      if (!projectManager || !projectForm || !projectListItems) return;
      if (mode === "new") {
        showProjectForm();
        return;
      }
      projectManager.hidden = false;
      panel.classList.add("is-project-manager-open");
      projectForm.hidden = true;
      projectListItems.hidden = false;
      if (projectManagerTitle) projectManagerTitle.textContent = "현장 프로젝트";
      setProjectStatus("현장 목록을 불러오는 중입니다.");
      try {
        const query = new URLSearchParams({ clientKey });
        const result = await assistantFetch(`/api/tile-assistant/projects?${query.toString()}`);
        renderProjectList(result.projects);
        setProjectStatus("");
      } catch (error) {
        setProjectStatus(error.message, "error");
      }
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

    function isProductSelected(productId) {
      return (Array.isArray(currentProject?.selectedProducts) ? currentProject.selectedProducts : [])
        .some((product) => String(product?.id || "") === String(productId || ""));
    }

    async function toggleSelectedProduct(product, button) {
      if (!product?.id) return;
      if (!projectId) {
        await openProjectManager("new");
        setProjectStatus("추천상품을 저장할 현장을 먼저 만들어주세요.", "notice");
        return;
      }
      const selected = !isProductSelected(product.id);
      button.disabled = true;
      try {
        const result = await assistantFetch("/api/tile-assistant/project/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, clientKey, product, selected })
        });
        setProjectMeta(result.project);
        button.classList.toggle("is-selected", selected);
        button.textContent = selected ? "현장에 저장됨" : "현장에 저장";
      } catch (error) {
        button.textContent = "저장 실패";
        button.title = error.message;
      } finally {
        button.disabled = false;
      }
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
          const buttonWrap = doc.createElement("div");
          buttonWrap.className = "tile-ai-product-card__actions";
          const saveButton = doc.createElement("button");
          saveButton.type = "button";
          saveButton.className = "tile-ai-product-save";
          const selected = isProductSelected(product.id);
          saveButton.classList.toggle("is-selected", selected);
          saveButton.textContent = selected ? "현장에 저장됨" : "현장에 저장";
          saveButton.addEventListener("click", () => void toggleSelectedProduct(product, saveButton));
          const detailButton = doc.createElement("button");
          detailButton.type = "button";
          detailButton.textContent = "상품 상세";
          detailButton.addEventListener("click", () => {
            const handled = dispatchProductDetail(product.id);
            setOpen(false);
            if (!handled && globalScope.location) globalScope.location.hash = "productDetailPage";
          });
          buttonWrap.append(saveButton, detailButton);
          body.appendChild(buttonWrap);
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

    function renderProject(project) {
      setProjectMeta(project);
      const projectMessages = Array.isArray(project?.messages) ? project.messages : [];
      messagesElement.innerHTML = "";
      messages.length = 0;
      if (!projectMessages.length) {
        appendMessage("assistant", `${project?.title || "새 현장"} 상담을 시작합니다. 필요한 타일을 현장 말로 알려주세요.`);
        return;
      }
      projectMessages.forEach((entry, index) => {
        const isLast = index === projectMessages.length - 1 && entry.role === "assistant";
        appendMessage(entry.role, entry.content, isLast ? {
          conditions: toConditionEntries(project.intent),
          recommendations: project.recommendations,
          quantityEstimate: project.quantityEstimate
        } : {});
        messages.push({ role: entry.role, content: entry.content });
      });
    }

    async function loadProject(nextProjectId) {
      const cleanProjectId = String(nextProjectId || "").trim();
      if (!cleanProjectId) return;
      setProjectStatus("현장 상담을 불러오는 중입니다.");
      try {
        const query = new URLSearchParams({ projectId: cleanProjectId, clientKey });
        const result = await assistantFetch(`/api/tile-assistant/project?${query.toString()}`);
        if (!result?.project) throw new Error("현장 상담 기록을 찾지 못했습니다.");
        projectId = cleanProjectId;
        storeProjectId(storage, projectId);
        restored = true;
        renderProject(result.project);
        closeProjectManager();
      } catch (error) {
        setProjectStatus(error.message, "error");
      }
    }

    async function restoreProject() {
      if (restored || !projectId || pending) return;
      restored = true;
      try {
        const query = new URLSearchParams({ projectId, clientKey });
        const result = await assistantFetch(`/api/tile-assistant/project?${query.toString()}`);
        if (!result?.project) return;
        renderProject(result.project);
      } catch {
        projectId = "";
        removeStoredProjectId(storage);
        setProjectMeta(null);
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
        if (result?.projectId) {
          projectId = String(result.projectId);
          storeProjectId(storage, projectId);
        }
        setProjectMeta(result?.project || { stage: result?.stage });
        appendMessage("assistant", answer, {
          actions: result?.actions,
          conditions: result?.interpretedConditions,
          recommendations: result?.recommendations,
          quantityEstimate: result?.quantityEstimate
        });
        messages.push({ role: "assistant", content: answer });
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
      void openProjectManager("new");
    }

    async function saveProjectForm(event) {
      event.preventDefault();
      if (!projectForm) return;
      const editId = String(projectEditId?.value || "").trim();
      const site = {
        siteName: String(siteNameInput?.value || "").trim(),
        clientName: String(clientNameInput?.value || "").trim(),
        spaceType: String(spaceTypeInput?.value || "").trim(),
        neededBy: String(neededByInput?.value || "").trim(),
        siteAddress: String(siteAddressInput?.value || "").trim(),
        notes: String(siteNotesInput?.value || "").trim()
      };
      if (!site.siteName) {
        setProjectStatus("현장명을 입력해 주세요.", "error");
        siteNameInput?.focus();
        return;
      }
      const submitButton = projectForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      setProjectStatus("현장 정보를 저장하는 중입니다.");
      try {
        const result = await assistantFetch(editId ? "/api/tile-assistant/project" : "/api/tile-assistant/projects", {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: editId, clientKey, site })
        });
        if (!result?.project?.id) throw new Error("저장된 현장을 불러오지 못했습니다.");
        projectId = String(result.project.id);
        storeProjectId(storage, projectId);
        restored = true;
        if (!editId) {
          messages.length = 0;
          messagesElement.innerHTML = initialMessagesMarkup;
        }
        renderProject(result.project);
        closeProjectManager();
      } catch (error) {
        setProjectStatus(error.message, "error");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    }

    launcher.addEventListener("click", () => setOpen(panel.hidden));
    closeButton.addEventListener("click", () => setOpen(false));
    newProjectButton?.addEventListener("click", startNewProject);
    projectListButton?.addEventListener("click", () => void openProjectManager("list"));
    projectManagerClose?.addEventListener("click", closeProjectManager);
    projectFormCancel?.addEventListener("click", () => void openProjectManager("list"));
    projectForm?.addEventListener("submit", saveProjectForm);
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
      if (event.key !== "Escape" || panel.hidden) return;
      if (projectManager && !projectManager.hidden) closeProjectManager();
      else setOpen(false);
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
