(() => {
  const APP_PAGE_HASH_PATTERN = /^#[a-zA-Z][a-zA-Z0-9]*Page$/;

  const initializePromotion = (root = document) => {
    const menuButton = root.querySelector("#promoMenuButton");
    const mobileNavigation = root.querySelector("#promoMobileNavigation");
    const motionHost = root === document ? document.body : root;
    const header = root.querySelector(".promo-header");

    const closeMenu = () => {
      if (!menuButton || !mobileNavigation) return;
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "메뉴 열기");
      mobileNavigation.classList.remove("is-open");
      document.body.classList.remove("promo-menu-open");
    };

    menuButton?.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      mobileNavigation?.classList.toggle("is-open", open);
      document.body.classList.toggle("promo-menu-open", open);
    });

    root.querySelectorAll("a[href]").forEach((link) => {
      const rawHref = link.getAttribute("href") || "";
      let parsedUrl = null;
      try {
        parsedUrl = new URL(rawHref, window.location.origin);
      } catch {
        parsedUrl = null;
      }
      const hash = parsedUrl?.hash || rawHref;

      if (APP_PAGE_HASH_PATTERN.test(hash)) {
        link.setAttribute("href", hash);
        link.addEventListener("click", (event) => {
          event.preventDefault();
          closeMenu();
          const pageId = hash.slice(1);
          if (typeof window.switchPage === "function") {
            window.switchPage(pageId);
            return;
          }
          window.location.hash = hash;
        });
        return;
      }

      if (!rawHref.startsWith("#")) return;
      link.addEventListener("click", (event) => {
        const target = root.querySelector(rawHref);
        if (!target) return;
        event.preventDefault();
        closeMenu();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    const formatNumber = (value, maximumFractionDigits = 0) =>
      new Intl.NumberFormat("ko-KR", { maximumFractionDigits }).format(value);

    const hydratePlatformStats = async () => {
      const targets = [...root.querySelectorAll("[data-platform-stat]")];
      if (!targets.length) return;

      try {
        const response = await fetch("/api/public/platform-stats", {
          headers: { Accept: "application/json" },
          cache: "no-cache"
        });
        if (!response.ok) return;
        const stats = await response.json();
        targets.forEach((target) => {
          const value = Number(stats?.[target.dataset.platformStat]);
          if (Number.isFinite(value) && value >= 0) {
            target.dataset.counter = String(Math.round(value));
            target.textContent = formatNumber(value);
          }
        });
      } catch {
        // The server-rendered fallback numbers remain visible when the API is unavailable.
      }
    };

    const quantityForm = root.querySelector("#promoQuantityForm");
    if (quantityForm && quantityForm.dataset.initialized !== "true") {
      quantityForm.dataset.initialized = "true";
      const areaInput = quantityForm.querySelector("#promoAreaInput");
      const sizeSelect = quantityForm.querySelector("#promoTileSizeSelect");
      const wasteInput = quantityForm.querySelector("#promoWasteInput");
      const boxAreaInput = quantityForm.querySelector("#promoBoxAreaInput");
      const requiredAreaOutput = root.querySelector("#promoRequiredArea");
      const pieceCountOutput = root.querySelector("#promoPieceCount");
      const boxCountOutput = root.querySelector("#promoBoxCount");

      const calculateQuantity = () => {
        const area = Math.max(Number(areaInput?.value) || 0, 0);
        const waste = Math.min(Math.max(Number(wasteInput?.value) || 0, 0), 30);
        const boxArea = Math.max(Number(boxAreaInput?.value) || 0, 0.01);
        const [width, height] = String(sizeSelect?.value || "600x600")
          .split("x")
          .map((value) => Number(value));
        const tileArea = Math.max((width * height) / 1_000_000, 0.0001);
        const requiredArea = area * (1 + waste / 100);

        if (requiredAreaOutput) requiredAreaOutput.textContent = `${formatNumber(requiredArea, 1)}m²`;
        if (pieceCountOutput) pieceCountOutput.textContent = `${formatNumber(Math.ceil(requiredArea / tileArea))}장`;
        if (boxCountOutput) boxCountOutput.textContent = `${formatNumber(Math.ceil(requiredArea / boxArea))}박스`;
      };

      quantityForm.addEventListener("input", calculateQuantity);
      quantityForm.addEventListener("change", calculateQuantity);
      calculateQuantity();
    }

    root.querySelectorAll(".promo-faq-item button").forEach((button) => {
      if (button.dataset.initialized === "true") return;
      button.dataset.initialized = "true";
      button.addEventListener("click", () => {
        const item = button.closest(".promo-faq-item");
        const answer = item?.querySelector("p");
        const isOpen = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isOpen));
        if (answer) answer.hidden = isOpen;
        const indicator = button.querySelector("b");
        if (indicator) indicator.textContent = isOpen ? "+" : "−";
      });
    });

    hydratePlatformStats();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const applyStagger = (containerSelector, itemSelector, step = 80) => {
      root.querySelectorAll(containerSelector).forEach((container) => {
        [...container.querySelectorAll(itemSelector)].forEach((target, index) => {
          target.classList.add("promo-reveal");
          target.style.setProperty("--promo-reveal-delay", `${Math.min(index, 7) * step}ms`);
        });
      });
    };

    applyStagger(".promo-number-grid", ".promo-number-item", 85);
    applyStagger(".promo-service-grid", ".promo-service-card", 100);
    applyStagger(".promo-tool-grid", ".promo-ai-demo, .promo-quantity-demo", 100);
    applyStagger(".promo-preview-grid", ".promo-preview-card", 90);
    applyStagger(".promo-process-list", "li", 65);
    applyStagger(".promo-field-grid", ".promo-field-card", 85);

    if (motionHost && motionHost.dataset.promoMotionInitialized !== "true") {
      motionHost.dataset.promoMotionInitialized = "true";

      let scrollFrame = 0;
      const syncHeaderState = () => {
        scrollFrame = 0;
        header?.classList.toggle("promo-header-scrolled", window.scrollY > 24);
      };

      window.addEventListener(
        "scroll",
        () => {
          if (scrollFrame) return;
          scrollFrame = requestAnimationFrame(syncHeaderState);
        },
        { passive: true }
      );
      syncHeaderState();

      requestAnimationFrame(() => {
        motionHost.classList.add("promo-motion-ready");
      });
    }

    const revealTargets = [...root.querySelectorAll(".promo-reveal")];
    const counterTargets = [...root.querySelectorAll("[data-counter], [data-platform-stat]")];

    const formatCounter = (value) => new Intl.NumberFormat("ko-KR").format(value);

    const animateCounter = (element) => {
      if (element.dataset.counterComplete === "true") return;
      element.dataset.counterComplete = "true";
      const target = Number(element.dataset.counter || element.textContent.replace(/[^0-9.-]/g, "") || 0);
      if (reducedMotion || target <= 1) {
        element.textContent = formatCounter(target);
        return;
      }

      const duration = target >= 1000 ? 1100 : 650;
      const startedAt = performance.now();
      const tick = (time) => {
        const progress = Math.min((time - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatCounter(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window) || reducedMotion) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
      counterTargets.forEach(animateCounter);
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );

    revealTargets.forEach((target) => revealObserver.observe(target));

    const sectionLinks = [...root.querySelectorAll('.promo-navigation a[href^="#"], .promo-mobile-navigation a[href^="#"]')];
    const sections = [...new Set(sectionLinks.map((link) => root.querySelector(link.getAttribute("href"))).filter(Boolean))];
    if (sections.length) {
      const sectionObserver = new IntersectionObserver(
        (entries) => {
          const activeEntry = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!activeEntry) return;
          const activeHash = `#${activeEntry.target.id}`;
          sectionLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === activeHash;
            link.classList.toggle("is-active", isActive);
            if (isActive) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        },
        { rootMargin: "-28% 0px -58% 0px", threshold: [0.01, 0.2, 0.5] }
      );
      sections.forEach((section) => sectionObserver.observe(section));
    }

    const numberObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    counterTargets.forEach((target) => numberObserver.observe(target));
  };

  const mountPromotionHome = async () => {
    const host = document.querySelector("[data-promo-source]");
    if (!host) {
      initializePromotion(document);
      return;
    }

    try {
      const response = await fetch(host.dataset.promoSource, {
        headers: { Accept: "text/html" },
        cache: "no-cache"
      });
      if (!response.ok) throw new Error(`프로모션 화면을 불러오지 못했습니다. (${response.status})`);

      const sourceDocument = new DOMParser().parseFromString(await response.text(), "text/html");
      const sourceHeader = sourceDocument.querySelector(".promo-header");
      const sourceMain = sourceDocument.querySelector("main");
      const sourceFooter = sourceDocument.querySelector(".promo-footer");
      if (!sourceHeader || !sourceMain || !sourceFooter) {
        throw new Error("프로모션 화면 구성요소가 올바르지 않습니다.");
      }

      const mainContent = document.createElement("div");
      mainContent.className = "promo-main";
      [...sourceMain.children].forEach((child) => {
        mainContent.append(document.importNode(child, true));
      });
      host.replaceChildren(
        document.importNode(sourceHeader, true),
        mainContent,
        document.importNode(sourceFooter, true)
      );
      host.classList.add("promo-home-mounted");
      initializePromotion(host);
    } catch (error) {
      host.classList.add("promo-home-fallback");
      console.warn(error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountPromotionHome, { once: true });
  } else {
    mountPromotionHome();
  }
})();
