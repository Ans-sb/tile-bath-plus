(function initTileAiModule(globalScope) {
  "use strict";

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
    return (Array.isArray(actions) ? actions : [])
      .filter((action) => action?.type === "open-product-search")
      .map((action) => ({
        type: "open-product-search",
        label: String(action?.label || "추천 상품 보기").trim().slice(0, 40) || "추천 상품 보기",
        targetPage: "productsPage",
        query: String(action?.query || "타일").trim().slice(0, 180) || "타일"
      }))
      .slice(0, 1);
  }

  function initializeTileAiAssistant(doc = globalScope.document, fetchImpl = globalScope.fetch) {
    if (!doc) return null;
    const launcher = doc.getElementById("tileAiLauncher");
    const panel = doc.getElementById("tileAiPanel");
    const closeButton = doc.getElementById("tileAiClose");
    const form = doc.getElementById("tileAiForm");
    const input = doc.getElementById("tileAiInput");
    const sendButton = doc.getElementById("tileAiSend");
    const messagesElement = doc.getElementById("tileAiMessages");
    if (!launcher || !panel || !closeButton || !form || !input || !sendButton || !messagesElement) return null;

    const messages = [];
    let pending = false;

    function setOpen(open) {
      panel.hidden = !open;
      launcher.setAttribute("aria-expanded", String(open));
      launcher.classList.toggle("is-open", open);
      if (open) {
        globalScope.setTimeout(() => input.focus(), 0);
      } else if (doc.activeElement !== launcher) {
        launcher.focus();
      }
    }

    function appendMessage(role, content, options = {}) {
      const article = doc.createElement("article");
      article.className = `tile-ai-message is-${role}`;
      if (options.pending) article.classList.add("is-pending");
      const bubble = doc.createElement("div");
      bubble.className = "tile-ai-message__bubble";
      bubble.textContent = content;
      article.appendChild(bubble);
      const actions = normalizeRecommendationActions(options.actions);
      if (actions.length) {
        const actionWrap = doc.createElement("div");
        actionWrap.className = "tile-ai-message__actions";
        actions.forEach((action) => {
          const button = doc.createElement("button");
          button.type = "button";
          button.textContent = action.label;
          button.addEventListener("click", () => {
            const EventConstructor = doc.defaultView?.CustomEvent || globalScope.CustomEvent;
            let handled = false;
            if (typeof EventConstructor === "function") {
              const event = new EventConstructor("tile-ai:open-products", {
                bubbles: true,
                cancelable: true,
                detail: { query: action.query, targetPage: action.targetPage }
              });
              handled = !doc.dispatchEvent(event);
            }
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

    async function askQuestion(rawMessage) {
      const message = String(rawMessage || "").trim();
      if (!message || pending) return;
      pending = true;
      sendButton.disabled = true;
      input.disabled = true;
      appendMessage("user", message);
      const history = buildRequestHistory(messages);
      messages.push({ role: "user", content: message });
      const loadingMessage = appendMessage("assistant", "타일 자료를 확인하고 있어요…", { pending: true });

      try {
        const response = await fetchImpl("/api/tile-assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ message, history })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.error || "타일 AI에 연결하지 못했습니다.");
        const answer = String(result?.message || "답변을 생성하지 못했습니다.").trim();
        loadingMessage.remove();
        appendMessage("assistant", answer, { actions: result?.actions });
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

    launcher.addEventListener("click", () => setOpen(panel.hidden));
    closeButton.addEventListener("click", () => setOpen(false));
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

    return { askQuestion, setOpen };
  }

  const api = { buildRequestHistory, normalizeRecommendationActions, initializeTileAiAssistant };
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
