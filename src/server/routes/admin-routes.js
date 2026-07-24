async function handleAdminRoutes(request, response, context) {
  if (request.method === "GET" && request.url.startsWith("/api/site-settings")) {
    context.sendJson(response, 200, {
      ok: true,
      settings: await context.readSiteSettings()
    });
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/admin/site-settings")) {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    context.sendJson(response, 200, {
      ok: true,
      settings: await context.readSiteSettings(),
      defaults: context.getDefaultSiteSettings()
    });
    return true;
  }

  if (request.method === "POST" && request.url === "/api/admin/site-settings") {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    const payload = JSON.parse(await context.readRequestBody(request) || "{}");
    context.sendJson(response, 200, {
      ok: true,
      ...(await context.saveSiteSettings(payload.settings || payload, adminCredentials.adminUsername))
    });
    return true;
  }

  if (request.method === "POST" && request.url === "/api/admin/site-settings/reset") {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    context.sendJson(response, 200, {
      ok: true,
      ...(await context.resetSiteSettings(adminCredentials.adminUsername))
    });
    return true;
  }

  if (request.method === "POST" && request.url === "/api/admin/site-media") {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    const payload = JSON.parse(await context.readRequestBody(request) || "{}");
    context.sendJson(response, 200, {
      ok: true,
      ...(await context.saveSiteStudioImage(payload, adminCredentials.adminUsername))
    });
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/admin/search-training/stats")) {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    context.sendJson(response, 200, { ok: true, stats: await context.readSearchTrainingStats() });
    return true;
  }

  if (request.method === "POST" && request.url === "/api/admin/search-training/feedback") {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.appendSearchTrainingFeedback(payload, adminCredentials.adminUsername));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/admin/search-training/batch-feedback") {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.appendSearchTrainingFeedbackBatch(payload, adminCredentials.adminUsername));
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/admin/action-requests")) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    context.sendJson(response, 200, {
      ok: true,
      requests: await context.readAdminActionRequests(Number(url.searchParams.get("limit") || 50))
    });
    return true;
  }

  if (request.method === "POST" && request.url === "/api/admin/action-request") {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.appendAdminActionRequest(payload, adminCredentials.adminUsername));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/admin/signup-request/status") {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    const payload = JSON.parse(await context.readRequestBody(request) || "{}");
    context.sendJson(response, 200, await context.updateSignupRequestApprovalStatus(payload, adminCredentials.adminUsername));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/admin/order/status") {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.assertAdminCredentials(adminCredentials.adminUsername, adminCredentials.adminToken);
    const payload = JSON.parse(await context.readRequestBody(request) || "{}");
    if (!payload?.orderId && !payload?.id && !payload?.orderNumber) {
      context.sendJson(response, 400, { error: "상태를 변경할 주문번호가 필요합니다." });
      return true;
    }
    context.sendJson(response, 200, await context.updateAdminOrderStatus(payload, adminCredentials.adminUsername));
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/admin/overview")) {
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.sendJson(response, 200, await context.readAdminOverview(
      adminCredentials.adminUsername,
      adminCredentials.adminToken
    ));
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/admin/tile114-sample")) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const adminCredentials = context.readAdminCredentialsFromRequest(request);
    context.sendJson(response, 200, await context.readTile114SampleProducts(
      adminCredentials.adminUsername,
      adminCredentials.adminToken,
      String(url.searchParams.get("category") || "5"),
      Number(url.searchParams.get("limit") || 5)
    ));
    return true;
  }

  return false;
}

module.exports = {
  handleAdminRoutes
};
