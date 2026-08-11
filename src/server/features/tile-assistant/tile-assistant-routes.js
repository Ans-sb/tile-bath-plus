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
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const isAssistantRoute = pathname === "/api/tile-assistant/chat"
    || pathname === "/api/tile-assistant/project"
    || pathname === "/api/tile-assistant/projects"
    || pathname === "/api/tile-assistant/project/products";
  if (!isAssistantRoute) return false;

  if (context.isTileAssistantOriginAllowed && !context.isTileAssistantOriginAllowed(request)) {
    context.sendJson(response, 403, { error: "허용되지 않은 요청 출처입니다." });
    return true;
  }

  if (request.method === "GET" && ["/api/tile-assistant/project", "/api/tile-assistant/projects"].includes(pathname)) {
    try {
      const payload = {
        projectId: String(url.searchParams.get("projectId") || ""),
        clientKey: String(url.searchParams.get("clientKey") || "")
      };
      const actor = context.resolveTileAssistantActor
        ? await context.resolveTileAssistantActor(request, payload)
        : null;
      if (pathname === "/api/tile-assistant/projects") {
        const projects = context.listTileAssistantProjects
          ? await context.listTileAssistantProjects(actor)
          : [];
        context.sendJson(response, 200, { ok: true, projects });
      } else {
        const project = context.readTileAssistantProject
          ? await context.readTileAssistantProject(payload.projectId, actor)
          : null;
        context.sendJson(response, 200, { ok: true, project });
      }
    } catch (error) {
      context.sendJson(response, Number(error?.statusCode || 400), { error: String(error?.message || "현장 상담 기록을 불러오지 못했습니다.") });
    }
    return true;
  }

  const isProjectWrite = (request.method === "POST" && pathname === "/api/tile-assistant/projects")
    || (request.method === "PATCH" && pathname === "/api/tile-assistant/project")
    || (request.method === "POST" && pathname === "/api/tile-assistant/project/products");
  const isChatRequest = request.method === "POST" && pathname === "/api/tile-assistant/chat";
  if (!isProjectWrite && !isChatRequest) return false;

  const contentType = String(request.headers?.["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    context.sendJson(response, 415, { error: "JSON 형식의 요청만 허용됩니다." });
    return true;
  }
  if (context.allowTileAssistantRequest && !context.allowTileAssistantRequest(request)) {
    context.sendJson(response, 429, { error: "질문이 너무 많습니다. 잠시 후 다시 시도해 주세요." });
    return true;
  }

  try {
    const payload = JSON.parse(await context.readRequestBody(request, { bodyLimit: TILE_ASSISTANT_BODY_LIMIT }));
    const actor = context.resolveTileAssistantActor
      ? await context.resolveTileAssistantActor(request, payload)
      : null;

    if (isProjectWrite) {
      let project = null;
      if (pathname === "/api/tile-assistant/projects") {
        project = context.createTileAssistantProject
          ? await context.createTileAssistantProject(actor, payload?.site)
          : null;
      } else if (pathname === "/api/tile-assistant/project") {
        project = context.updateTileAssistantProject
          ? await context.updateTileAssistantProject(payload?.projectId, actor, payload?.site)
          : null;
      } else {
        project = context.setTileAssistantSelectedProduct
          ? await context.setTileAssistantSelectedProduct(payload?.projectId, actor, payload?.product, payload?.selected !== false)
          : null;
      }
      if (!project) {
        context.sendJson(response, 404, { error: "현장 프로젝트를 찾지 못했습니다." });
        return true;
      }
      context.sendJson(response, pathname === "/api/tile-assistant/projects" ? 201 : 200, { ok: true, project });
      return true;
    }

    const result = await context.answerTileQuestion({
      message: payload?.message,
      history: payload?.history,
      projectId: payload?.projectId,
      actor
    });
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
