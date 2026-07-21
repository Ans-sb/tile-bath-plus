async function handleMediaRoutes(request, response, context) {
  if (request.method === "GET" && request.url.startsWith("/api/image-data-url")) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const imageUrl = String(url.searchParams.get("url") || "").trim();
    context.sendJson(response, 200, {
      ok: true,
      imageDataUrl: await context.readRemoteImageDataUrl(imageUrl)
    });
    return true;
  }

  if (request.method === "POST" && request.url === "/api/render") {
    const payload = JSON.parse(await context.readRequestBody(request) || "{}");
    const siteImageDataUrl = String(payload?.siteImageDataUrl || "").trim();
    const surfaces = Array.isArray(payload?.surfaces) ? payload.surfaces : [];
    const hasTileReference = surfaces.some((entry) => String(entry?.tileImageDataUrl || "").trim());
    if (!siteImageDataUrl || !hasTileReference) {
      context.sendJson(response, 400, {
        error: "현장 사진과 적용할 타일 이미지를 모두 선택해주세요."
      });
      return true;
    }
    context.sendJson(response, 200, await context.generateRenderPreview(payload));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/render-feedback") {
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.appendRenderFeedback(payload, request));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/tile-match") {
    const payload = JSON.parse(await context.readRequestBody(request));
    const adminContext = context.readOptionalAdminContextFromRequest(request);
    context.sendJson(response, 200, await context.findSimilarTilesByImage(payload, adminContext));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/business-status") {
    const { businessNumber } = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.checkBusinessStatus(String(businessNumber || "")));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/proposal-ppt") {
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.buildProfessionalProposalDeck(payload));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/server-control") {
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.handleServerControl(payload));
    return true;
  }

  return false;
}

module.exports = {
  handleMediaRoutes
};
