(() => {
  const APP_PAGE_HASH_PATTERN = /^#[a-zA-Z][a-zA-Z0-9]*Page$/;

  const initializePromotion = (root = document) => {
    const menuButton = root.querySelector("#promoMenuButton");
    const mobileNavigation = root.querySelector("#promoMobileNavigation");

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

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealTargets = [...root.querySelectorAll(".promo-reveal")];
    const counterTargets = [...root.querySelectorAll("[data-counter]")];

    const formatCounter = (value) => new Intl.NumberFormat("ko-KR").format(value);

    const animateCounter = (element) => {
      if (element.dataset.counterComplete === "true") return;
      element.dataset.counterComplete = "true";
      const target = Number(element.dataset.counter || 0);
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
