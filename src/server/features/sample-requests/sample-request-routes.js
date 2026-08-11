const SAMPLE_REQUEST_BODY_LIMIT = 48 * 1024;

async function handleSampleRequestRoutes(request, response, context) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const isMemberRoute = pathname === "/api/sample-requests";
  const isAdminListRoute = pathname === "/api/admin/sample-requests";
  const isAdminUpdateRoute = pathname === "/api/admin/sample-request";
  if (!isMemberRoute && !isAdminListRoute && !isAdminUpdateRoute) return false;

  try {
    if (isMemberRoute && request.method === "GET") {
      const actor = await context.resolveSampleRequestActor(request);
      context.sendJson(response, 200, { ok: true, requests: await context.listSampleRequests(actor) });
      return true;
    }
    if (isMemberRoute && request.method === "POST") {
      assertJsonRequest(request);
      const payload = JSON.parse(await context.readRequestBody(request, { bodyLimit: SAMPLE_REQUEST_BODY_LIMIT }) || "{}");
      const actor = await context.resolveSampleRequestActor(request);
      const sampleRequest = await context.createSampleRequest(actor, payload);
      context.sendJson(response, 201, { ok: true, request: sampleRequest });
      return true;
    }
    if (isAdminListRoute && request.method === "GET") {
      const admin = context.assertSampleRequestAdmin(request);
      context.sendJson(response, 200, { ok: true, requests: await context.listAdminSampleRequests(admin) });
      return true;
    }
    if (isAdminUpdateRoute && request.method === "PATCH") {
      assertJsonRequest(request);
      const admin = context.assertSampleRequestAdmin(request);
      const payload = JSON.parse(await context.readRequestBody(request, { bodyLimit: SAMPLE_REQUEST_BODY_LIMIT }) || "{}");
      const sampleRequest = await context.updateAdminSampleRequest(payload, admin);
      context.sendJson(response, 200, { ok: true, request: sampleRequest });
      return true;
    }
    context.sendJson(response, 405, { error: "지원하지 않는 샘플 신청 요청입니다." });
  } catch (error) {
    const message = String(error?.message || "샘플 신청을 처리하지 못했습니다.");
    const status = /본문이 너무 큽니다/.test(message) ? 413 : Number(error?.statusCode || 400);
    context.sendJson(response, status, { error: message });
  }
  return true;
}

function assertJsonRequest(request) {
  if (!String(request.headers?.["content-type"] || "").toLowerCase().startsWith("application/json")) {
    const error = new Error("JSON 형식의 요청만 허용됩니다.");
    error.statusCode = 415;
    throw error;
  }
}

module.exports = { SAMPLE_REQUEST_BODY_LIMIT, handleSampleRequestRoutes };
