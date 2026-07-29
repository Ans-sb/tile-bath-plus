(() => {
  const capacitor = window.Capacitor;
  const isNative = Boolean(capacitor?.isNativePlatform?.());
  if (!isNative) return;

  document.documentElement.classList.add("native-app");

  const appPlugin = capacitor.Plugins?.App;
  const browserPlugin = capacitor.Plugins?.Browser;

  appPlugin?.addListener?.("backButton", () => {
    const pageId = String(window.location.hash || "").replace(/^#/, "");
    if (pageId && pageId !== "homePage") {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = "homePage";
      }
      return;
    }
    if (typeof appPlugin.minimizeApp === "function") {
      appPlugin.minimizeApp();
      return;
    }
    appPlugin.exitApp?.();
  });

  appPlugin?.addListener?.("appUrlOpen", ({ url }) => {
    const parsed = parseAppUrl(url);
    if (!parsed) return;
    window.location.assign(`${parsed.pathname}${parsed.search}${parsed.hash || "#homePage"}`);
  });

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || !browserPlugin?.open) return;

    const url = new URL(anchor.href, window.location.href);
    if (!["http:", "https:"].includes(url.protocol) || url.origin === window.location.origin) return;

    event.preventDefault();
    browserPlugin.open({ url: url.toString() });
  });

  function parseAppUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol === "jajaego:") {
        return new URL(`https://jajaego.com${url.pathname || "/"}${url.search}${url.hash}`);
      }
      if (url.hostname === "jajaego.com" || url.hostname === "www.jajaego.com") return url;
    } catch {
      return null;
    }
    return null;
  }
})();
