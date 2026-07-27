const TILE_ASSISTANT_BODY_LIMIT = 32 * 1024;

function createTileAssistantRateLimiter({
  limit = 20,
  windowMs = 60 * 1000,
  maxClients = 5000,
  trustProxy = false,
  now = Date.now
} = {}) {
  const clients = new Map();

  return function allowTileAssistantRequest(request) {
    const forwardedAddress = trustProxy
      ? String(request?.headers?.["x-forwarded-for"] || "").split(",")[0].trim()
      : "";
    const clientAddress = forwardedAddress || String(request?.socket?.remoteAddress || "unknown");
    const currentTime = now();
    const current = clients.get(clientAddress);

    if (current && currentTime - current.startedAt < windowMs) {
      if (current.count >= limit) return false;
      current.count += 1;
      return true;
    }

    clients.delete(clientAddress);
    if (clients.size >= maxClients) {
      for (const [key, record] of clients) {
        if (currentTime - record.startedAt >= windowMs) clients.delete(key);
      }
    }
    if (clients.size >= maxClients) return false;

    clients.set(clientAddress, { count: 1, startedAt: currentTime });
    return true;
  };
}

async function handleTileAssistantRoutes(request, response, context) {
  if (request.method !== "POST" || request.url !== "/api/tile-assistant/chat") return false;

  const contentType = String(request.headers?.["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    context.sendJson(response, 415, { error: "JSON 형식의 요청만 허용됩니다." });
    return true;
  }
  if (context.isTileAssistantOriginAllowed && !context.isTileAssistantOriginAllowed(request)) {
    context.sendJson(response, 403, { error: "허용되지 않은 요청 출처입니다." });
    return true;
  }
  if (context.allowTileAssistantRequest && !context.allowTileAssistantRequest(request)) {
    context.sendJson(response, 429, { error: "질문이 너무 많습니다. 잠시 후 다시 시도해 주세요." });
    return true;
  }

  try {
    const payload = JSON.parse(await context.readRequestBody(request, { bodyLimit: TILE_ASSISTANT_BODY_LIMIT }));
    const result = await context.answerTileQuestion({ message: payload?.message, history: payload?.history });
    context.sendJson(response, 200, result);
  } catch (error) {
    const message = String(error?.message || "타일 질문을 처리하지 못했습니다.");
    const status = /본문이 너무 큽니다/.test(message) ? 413 : Number(error?.statusCode || 400);
    context.sendJson(response, status, { error: message });
  }
  return true;
}

module.exports = {
  TILE_ASSISTANT_BODY_LIMIT,
  createTileAssistantRateLimiter,
  handleTileAssistantRoutes
};
