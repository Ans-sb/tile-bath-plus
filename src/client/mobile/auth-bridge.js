(() => {
  const params = new URLSearchParams(window.location.search);
  const mobileClient = String(params.get("mobileClient") || "").toLowerCase();
  if (!["android", "ios"].includes(mobileClient)) return;
  if (window.Capacitor?.isNativePlatform?.()) return;

  const provider = params.get("socialProvider");
  const hasAuthResult = Boolean(
    provider
    && (
      window.location.hash.includes("access_token=")
      || params.has("error")
      || params.has("error_description")
    )
  );
  if (!hasAuthResult) return;

  const target = `jajaego://app/${window.location.search}${window.location.hash}`;
  window.setTimeout(() => window.location.replace(target), 20);
})();
