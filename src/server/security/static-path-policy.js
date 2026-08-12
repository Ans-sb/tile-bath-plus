const PUBLIC_ROOT_FILES = new Set([
  "app.js",
  "index.html",
  "manifest.webmanifest",
  "offline.html",
  "promotion-reference-test.css",
  "promotion-reference-test.html",
  "promotion-reference-test.js",
  "service-worker.js",
  "styles.css"
]);

const PUBLIC_DIRECTORY_PREFIXES = [
  "images/",
  "src/client/",
  "uploads/site-studio/"
];

function normalizeStaticPath(pathname) {
  const raw = String(pathname || "").replace(/\\/g, "/");
  if (raw.includes("\0")) return "";
  let decoded = raw;
  try {
    for (let index = 0; index < 3; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return "";
  }
  const normalized = decoded.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.startsWith("."))) {
    return "";
  }
  return normalized;
}

function isPublicStaticPath(pathname) {
  const normalized = normalizeStaticPath(pathname);
  if (!normalized) return false;
  if (PUBLIC_ROOT_FILES.has(normalized)) return true;
  return PUBLIC_DIRECTORY_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function shouldBlockStaticPath(pathname) {
  return !isPublicStaticPath(pathname);
}

module.exports = {
  PUBLIC_DIRECTORY_PREFIXES,
  PUBLIC_ROOT_FILES,
  isPublicStaticPath,
  normalizeStaticPath,
  shouldBlockStaticPath
};
