const CACHE_VERSION = "jajaego-app-shell-v3";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL = [
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/images/branding/app-icon-jajaego-192.png",
  "/images/branding/app-icon-jajaego-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("jajaego-app-shell-") && ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isShellAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (
      await cache.match(request)
      || await caches.match("/index.html")
      || await caches.match("/offline.html")
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok && isCacheableResponse(response)) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    }));

  return cached || networkPromise;
}

function isShellAsset(request, url) {
  if (["script", "style", "font"].includes(request.destination)) return true;
  return url.pathname === "/manifest.webmanifest"
    || url.pathname.startsWith("/images/branding/app-icon-jajaego-");
}

function isCacheableResponse(response) {
  const length = Number(response.headers.get("content-length") || 0);
  return !length || length <= 2 * 1024 * 1024;
}
