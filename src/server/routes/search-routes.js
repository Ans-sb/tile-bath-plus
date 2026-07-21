async function handleSearchRoutes(request, response, context) {
  if (request.method === "GET" && request.url.startsWith("/api/local/normalized-taxonomy")) {
    if (!context.isLocalRequest(request)) {
      context.sendJson(response, 404, { error: "Not found" });
      return true;
    }
    const url = new URL(request.url, `http://${request.headers.host}`);
    context.sendJson(response, 200, await context.readLocalNormalizedTaxonomy(String(url.searchParams.get("view") || "admin")));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/local/taxonomy-search-log") {
    if (!context.isLocalRequest(request)) {
      context.sendJson(response, 404, { error: "Not found" });
      return true;
    }
    const payload = JSON.parse(await context.readRequestBody(request));
    await context.appendTaxonomySearchLog(payload);
    context.sendJson(response, 200, { ok: true });
    return true;
  }

  if (request.method === "POST" && request.url === "/api/tile-search") {
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.searchTileCatalog(payload));
    return true;
  }

  return false;
}

module.exports = {
  handleSearchRoutes
};
