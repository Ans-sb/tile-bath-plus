const fs = require("fs");
const path = require("path");

function createSearchLogStore({ root }) {
  const logDir = path.join(root, "data", "search-logs");

  return {
    appendTaxonomySearchLog(payload) {
      const logPath = path.join(logDir, "taxonomy-search.jsonl");
      const entry = {
        createdAt: new Date().toISOString(),
        audience: String(payload?.audience || "customer").slice(0, 20),
        query: String(payload?.query || "").slice(0, 500),
        resultCount: Number(payload?.resultCount || 0),
        interpreted: sanitizeSearchLogObject(payload?.interpreted || {})
      };
      return appendJsonLine(logPath, entry);
    },

    appendTileImageSearchLog(payload) {
      const logPath = path.join(logDir, "tile-image-search.jsonl");
      const entry = {
        createdAt: new Date().toISOString(),
        requestedSize: String(payload?.requestedSize || "").slice(0, 40),
        requestedFinish: String(payload?.requestedFinish || "").slice(0, 40),
        requestedApplication: String(payload?.requestedApplication || "").slice(0, 40),
        searchMode: String(payload?.searchMode || "strict").slice(0, 20),
        hasUserCorrections: Boolean(payload?.hasUserCorrections),
        userCorrections: sanitizeSearchLogObject(payload?.userCorrections || {}),
        resultCount: Number(payload?.resultCount || 0),
        analysis: sanitizeSearchLogObject(payload?.analysis || {}),
        topMatches: (Array.isArray(payload?.topMatches) ? payload.topMatches : []).slice(0, 40).map((item, index) => ({
          rank: index + 1,
          id: String(item?.id || "").slice(0, 80),
          managementCode: String(item?.managementCode || "").slice(0, 80),
          modelName: String(item?.modelName || item?.name || "").slice(0, 160),
          size: String(item?.size || "").slice(0, 40),
          finish: String(item?.finish || item?.surface || "").slice(0, 40),
          color: String(item?.color || "").slice(0, 40),
          matchScore: Number(item?.matchScore || 0),
          matchReasons: Array.isArray(item?.matchReasons)
            ? item.matchReasons.map((reason) => String(reason).slice(0, 80)).slice(0, 5)
            : []
        }))
      };
      return appendJsonLine(logPath, entry);
    },

    sanitizeSearchLogObject
  };
}

async function appendJsonLine(logPath, entry) {
  await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
  await fs.promises.appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

function sanitizeSearchLogObject(value) {
  if (!value || typeof value !== "object") return {};
  const allowedKeys = [
    "origins", "spaces", "applications", "colors", "styles", "patternDetails",
    "finishes", "textures", "materials", "moods", "sizes", "thicknesses", "priceRanges",
    "antiSlipRequired", "stockRequired", "stockEmpty", "freeTokens", "productCodes",
    "patterns", "motifs", "shapes", "keywords", "requestedSize", "requestedFinish",
    "requestedApplication", "searchMode", "summary", "color", "secondaryColor",
    "style", "patternPresence", "finish"
  ];
  return Object.fromEntries(allowedKeys.map((key) => {
    const current = value[key];
    if (Array.isArray(current)) return [key, current.map((item) => String(item).slice(0, 80)).slice(0, 20)];
    if (typeof current === "boolean") return [key, current];
    return [key, current ? String(current).slice(0, 80) : current];
  }));
}

module.exports = {
  createSearchLogStore,
  sanitizeSearchLogObject
};
