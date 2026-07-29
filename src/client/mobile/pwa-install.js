(() => {
  const serviceWorkerSupported = "serviceWorker" in navigator;
  const secureContext = window.isSecureContext
    || ["localhost", "127.0.0.1"].includes(window.location.hostname);

  let deferredInstallPrompt = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.dispatchEvent(new CustomEvent("jajaego:install-available"));
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent("jajaego:installed"));
  });

  window.JajaegoPwa = {
    canInstall() {
      return Boolean(deferredInstallPrompt);
    },
    async install() {
      if (!deferredInstallPrompt) return { outcome: "unavailable" };
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      return choice;
    }
  };

  if (!serviceWorkerSupported || !secureContext) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
      .catch((error) => {
        console.warn("자재GO 앱 서비스 등록 실패", error);
      });
  });
})();
