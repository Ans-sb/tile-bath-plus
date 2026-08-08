const { normalizePairingCode } = require("./sketchup-package-store");

async function handleSketchupRoutes(request, response, context) {
  const url = new URL(request.url, "http://localhost");
  if (!url.pathname.startsWith("/api/local/sketchup/")) return false;

  if (!context.isLocalRequest(request)) {
    context.sendJson(response, 403, { error: "SketchUp 로컬 연동 API는 이 컴퓨터에서만 사용할 수 있습니다." });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/local/sketchup/packages") {
    const packages = await context.sketchupPackageStore.listRecent(url.searchParams.get("limit"));
    context.sendJson(response, 200, { packages });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/local/sketchup/packages") {
    const payload = parseJson(await context.readRequestBody(request, { bodyLimit: 256 * 1024 }));
    const products = (await context.readProducts())
      .filter(context.isPublicCatalogProduct)
      .map((product) => ({
        ...context.mapPublicProduct(product),
        boxPcs: readPositiveNumber(product, ["boxPcs", "pcsPerBox", "pcs_box", "pcsPerCarton"]),
        boxSqm: readPositiveNumber(product, ["boxSqm", "sqmPerBox", "m2PerBox", "sqm_box"])
      }));
    const record = await context.sketchupPackageStore.createPackage({
      payload,
      products,
      requestOrigin: getRequestOrigin(request)
    });
    context.sendJson(response, 201, { package: record });
    return true;
  }

  const reportMatch = url.pathname.match(/^\/api\/local\/sketchup\/packages\/([^/]+)\/report$/);
  if (request.method === "POST" && reportMatch) {
    const payload = parseJson(await context.readRequestBody(request, { bodyLimit: 64 * 1024 }));
    const result = await context.sketchupPackageStore.appendReport(reportMatch[1], payload);
    if (!result) context.sendJson(response, 404, { error: "연동 패키지를 찾지 못했습니다." });
    else context.sendJson(response, 201, result);
    return true;
  }

  const packageMatch = url.pathname.match(/^\/api\/local\/sketchup\/packages\/([^/]+)$/);
  if (request.method === "GET" && packageMatch) {
    const record = await context.sketchupPackageStore.readByCode(normalizePairingCode(packageMatch[1]));
    if (!record) context.sendJson(response, 404, { error: "연동 코드를 확인해주세요." });
    else context.sendJson(response, 200, { package: record });
    return true;
  }

  context.sendJson(response, 405, { error: "지원하지 않는 SketchUp 연동 요청입니다." });
  return true;
}

function getRequestOrigin(request) {
  const host = String(request.headers?.host || "localhost:4173").replace(/[\r\n]/g, "");
  return `http://${host}`;
}

function parseJson(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    const error = new Error("요청 형식이 올바르지 않습니다.");
    error.statusCode = 400;
    throw error;
  }
}

function readPositiveNumber(product, keys) {
  for (const key of keys) {
    const value = Number(product?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

module.exports = { handleSketchupRoutes };
