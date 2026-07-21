async function handleProductRoutes(request, response, context) {
  if (request.method === "GET" && request.url === "/api/products") {
    if (context.areProductsHiddenFromStorefront()) {
      context.sendJson(response, 200, []);
      return true;
    }
    context.sendRawJson(response, 200, await context.getPublicProductsJson());
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/member/products")) {
    const memberCredentials = context.readMemberProductCredentialsFromRequest(request);
    const member = await context.verifyMemberProductAccess(
      memberCredentials.businessNumber,
      memberCredentials.memberToken
    );
    if (context.areProductsHiddenFromStorefront()) {
      context.sendJson(response, 200, { ok: true, user: member, products: [] });
      return true;
    }
    context.sendJson(response, 200, {
      ok: true,
      user: member,
      products: (await context.readProducts()).filter(context.isPublicCatalogProduct).map(context.mapMemberProduct)
    });
    return true;
  }

  if (request.method === "POST" && request.url === "/api/products") {
    context.sendJson(response, 403, { error: "상품 DB 수정은 관리자 전용 API를 사용해야 합니다." });
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/admin/products")) {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.sendJson(response, 200, await context.readAdminProducts(
      adminCredentials.adminUsername,
      adminCredentials.adminToken
    ));
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/admin/product")) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.sendJson(response, 200, await context.readAdminProduct(
      adminCredentials.adminUsername,
      adminCredentials.adminToken,
      String(url.searchParams.get("id") || "")
    ));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/admin/product") {
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.saveAdminProduct(payload));
    return true;
  }

  return false;
}

module.exports = {
  handleProductRoutes
};
