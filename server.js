const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const root = process.cwd();
loadEnvFile(path.join(root, ".env"));

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const productsPath = path.join(root, "data", "products.json");
const bodyLimit = 80 * 1024 * 1024;
const proposalOutputDir = path.join(root, "outputs", "proposals");
const proposalTmpDir = path.join(root, "tmp", "proposal-ppt");
const proposalBuilderPath = path.join(root, "scripts", "build-proposal-deck.mjs");
const serverControlDir = path.join(root, "tmp", "server-control");
const stopFlagPath = path.join(serverControlDir, "stop.flag");
const startedAt = new Date();
const openAiApiKey = String(process.env.OPENAI_API_KEY || "").trim();
const openAiImageModel = String(process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();
const supabaseUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const supabaseSecretKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SECRET_KEY
  || ""
).trim();
const adminUsername = String(process.env.ADMIN_USERNAME || "admin").trim();
const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
const adminDisplayName = String(process.env.ADMIN_DISPLAY_NAME || "내부관리자").trim();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        status: "online",
        storage: getStorageMode(),
        startedAt: startedAt.toISOString(),
        uptimeSeconds: Math.floor(process.uptime())
      });
      return;
    }

    if (request.method === "GET" && request.url === "/api/products") {
      sendJson(response, 200, (await readProducts()).map(mapPublicProduct));
      return;
    }

    if (request.method === "POST" && request.url === "/api/products") {
      sendJson(response, 403, { error: "상품 DB 수정은 관리자 전용 API를 사용해야 합니다." });
      return;
    }

    if (request.method === "GET" && request.url.startsWith("/api/admin/product")) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      sendJson(response, 200, await readAdminProduct(
        String(url.searchParams.get("adminUsername") || ""),
        String(url.searchParams.get("adminToken") || ""),
        String(url.searchParams.get("id") || "")
      ));
      return;
    }

    if (request.method === "POST" && request.url === "/api/admin/product") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await saveAdminProduct(payload));
      return;
    }

    if (request.method === "GET" && request.url === "/api/approval-rules") {
      sendJson(response, 200, await readApprovalRules());
      return;
    }

    if (request.method === "POST" && request.url === "/api/approval-rules") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await saveApprovalRules(payload));
      return;
    }

    if (request.method === "POST" && request.url === "/api/signup-requests") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await saveSignupRequestRecord(payload));
      return;
    }

    if (request.method === "POST" && request.url === "/api/login") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await loginWithSignupRequest(payload));
      return;
    }

    if (request.method === "POST" && request.url === "/api/admin/login") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, loginAsAdmin(payload));
      return;
    }

    if (request.method === "GET" && request.url.startsWith("/api/cart")) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      sendJson(response, 200, await readCartRecord(String(url.searchParams.get("businessNumber") || "")));
      return;
    }

    if (request.method === "PUT" && request.url === "/api/cart") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await saveCartRecord(payload));
      return;
    }

    if (request.method === "GET" && request.url.startsWith("/api/admin/overview")) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      sendJson(response, 200, await readAdminOverview(
        String(url.searchParams.get("adminUsername") || url.searchParams.get("businessNumber") || ""),
        String(url.searchParams.get("adminToken") || "")
      ));
      return;
    }

    if (request.method === "POST" && request.url === "/api/render") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await generateRenderPreview(payload));
      return;
    }

    if (request.method === "POST" && request.url === "/api/business-status") {
      const { businessNumber } = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await checkBusinessStatus(String(businessNumber || "")));
      return;
    }

    if (request.method === "POST" && request.url === "/api/proposal-ppt") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await buildProfessionalProposalDeck(payload));
      return;
    }

    if (request.method === "POST" && request.url === "/api/server-control") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await handleServerControl(payload));
      return;
    }

    if (request.method === "GET") {
      await serveStatic(request, response);
      return;
    }

    sendJson(response, 405, { error: "吏?먰븯吏 ?딅뒗 ?붿껌?낅땲??" });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." });
  }
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 0;

server.listen(port, host, () => {
  console.log(`Tile & Bath Plus app: http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
});

process.on("unhandledRejection", (error) => {
  console.error("[server] unhandledRejection", error);
  setTimeout(() => process.exit(1), 50).unref();
});

process.on("uncaughtException", (error) => {
  console.error("[server] uncaughtException", error);
  setTimeout(() => process.exit(1), 50).unref();
});

async function readProducts() {
  if (hasSupabaseConfig()) {
    try {
      const remoteProducts = await readProductsFromSupabase();
      if (remoteProducts.length) return remoteProducts;
    } catch (error) {
      console.warn("[products] Supabase read failed; using local products.json.", error.message);
    }
  }

  const content = await fs.promises.readFile(productsPath, "utf8");
  return JSON.parse(content);
}

function normalizeProduct(product) {
  const required = ["id", "productType", "kind", "name", "maker", "unit"];
  for (const field of required) {
    if (!String(product[field] || "").trim()) {
      throw new Error(`${field} 媛믪씠 ?꾩슂?⑸땲??`);
    }
  }

  return {
    id: String(product.id).trim(),
    managementCode: String(product.managementCode || "").trim(),
    productType: String(product.productType).trim(),
    kind: String(product.kind).trim(),
    name: String(product.name).trim(),
    size: String(product.size || "").trim(),
    finish: String(product.finish || "").trim(),
    maker: String(product.maker).trim(),
    unit: String(product.unit).trim(),
    option: String(product.option || "").trim(),
    costPrice: Number(product.costPrice) || 0,
    retailPrice: Number(product.retailPrice) || 0,
    wholesalePrice: Number(product.wholesalePrice) || 0,
    stockQty: Number(product.stockQty) || 0,
    image: String(product.image || "").trim(),
    originalImage: String(product.originalImage || "").trim(),
    closeImage: String(product.closeImage || "").trim(),
    detailImage: String(product.detailImage || "").trim(),
    daylightImage: String(product.daylightImage || "").trim(),
    fluorescentImage: String(product.fluorescentImage || "").trim(),
    sceneImage: String(product.sceneImage || "").trim(),
    catalogSource: String(product.catalogSource || "").trim(),
    catalogPage: Number(product.catalogPage) || 0
  };
}

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseSecretKey);
}

function getStorageMode() {
  return hasSupabaseConfig() ? "supabase" : "file";
}

async function readProductsFromSupabase() {
  const pageSize = 1000;
  const query = new URLSearchParams({
    select: [
      "id",
      "management_code",
      "product_type",
      "kind",
      "name",
      "size",
      "finish",
      "maker",
      "unit",
      "option_text",
      "cost_price",
      "retail_price",
      "wholesale_price",
      "stock_qty",
      "image",
      "original_image",
      "close_image",
      "detail_image",
      "daylight_image",
      "fluorescent_image",
      "scene_image",
      "catalog_source",
      "catalog_page",
      "created_at",
      "updated_at"
    ].join(","),
    order: "name.asc"
  });

  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await requestSupabase(`/rest/v1/products?${query.toString()}`, {
      headers: {
        Range: `${offset}-${offset + pageSize - 1}`
      }
    });
    if (!Array.isArray(page) || !page.length) break;
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows.map(mapSupabaseProductToApp);
}

async function upsertProductToSupabase(product) {
  const payload = mapAppProductToSupabase(product);
  await requestSupabase("/rest/v1/products", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(payload)
  });
}

async function saveProduct(product) {
  let products = await readProducts();
  const index = products.findIndex((item) => item.id === product.id);
  if (index >= 0) products[index] = product;
  else products.push(product);

  if (hasSupabaseConfig()) {
    await upsertProductToSupabase(product);
    products = await readProducts();
  }

  await fs.promises.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  return products;
}

function mapAppProductToSupabase(product) {
  return {
    id: product.id,
    management_code: product.managementCode || "",
    product_type: product.productType,
    kind: product.kind,
    name: product.name,
    size: product.size,
    finish: product.finish,
    maker: product.maker,
    unit: product.unit,
    option_text: product.option,
    cost_price: Number(product.costPrice) || 0,
    retail_price: Number(product.retailPrice) || 0,
    wholesale_price: Number(product.wholesalePrice) || 0,
    stock_qty: Number(product.stockQty) || 0,
    image: product.image || "",
    original_image: product.originalImage || "",
    close_image: product.closeImage || "",
    detail_image: product.detailImage || "",
    daylight_image: product.daylightImage || "",
    fluorescent_image: product.fluorescentImage || "",
    scene_image: product.sceneImage || "",
    catalog_source: product.catalogSource || "",
    catalog_page: Number(product.catalogPage) || 0
  };
}

function mapSupabaseProductToApp(row) {
  return {
    id: String(row.id || "").trim(),
    managementCode: String(row.management_code || "").trim(),
    productType: String(row.product_type || "").trim(),
    kind: String(row.kind || "").trim(),
    name: String(row.name || "").trim(),
    size: String(row.size || "").trim(),
    finish: String(row.finish || "").trim(),
    maker: String(row.maker || "").trim(),
    unit: String(row.unit || "").trim(),
    option: String(row.option_text || "").trim(),
    costPrice: Number(row.cost_price) || 0,
    retailPrice: Number(row.retail_price) || 0,
    wholesalePrice: Number(row.wholesale_price) || 0,
    stockQty: Number(row.stock_qty) || 0,
    image: String(row.image || "").trim(),
    originalImage: String(row.original_image || "").trim(),
    closeImage: String(row.close_image || "").trim(),
    detailImage: String(row.detail_image || "").trim(),
    daylightImage: String(row.daylight_image || "").trim(),
    fluorescentImage: String(row.fluorescent_image || "").trim(),
    sceneImage: String(row.scene_image || "").trim(),
    catalogSource: String(row.catalog_source || "").trim(),
    catalogPage: Number(row.catalog_page) || 0
  };
}

function mapPublicProduct(product) {
  return {
    id: String(product.id || "").trim(),
    productType: String(product.productType || "").trim(),
    kind: String(product.kind || "").trim(),
    name: String(product.name || "").trim(),
    size: String(product.size || "").trim(),
    finish: String(product.finish || "").trim(),
    maker: String(product.maker || "").trim(),
    unit: String(product.unit || "").trim(),
    option: String(product.option || "").trim(),
    retailPrice: Number(product.retailPrice) || 0,
    image: String(product.image || "").trim(),
    originalImage: String(product.originalImage || "").trim(),
    closeImage: String(product.closeImage || "").trim(),
    detailImage: String(product.detailImage || "").trim(),
    daylightImage: String(product.daylightImage || "").trim(),
    fluorescentImage: String(product.fluorescentImage || "").trim(),
    sceneImage: String(product.sceneImage || "").trim()
  };
}

function createAdminToken() {
  return crypto
    .createHash("sha256")
    .update(`${adminUsername}\n${adminPassword}\n${adminDisplayName}`)
    .digest("hex");
}

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function assertAdminCredentials(value, token) {
  const clean = String(value || "").trim();
  if (!clean) throw new Error("관리자 아이디가 필요합니다.");
  if (!adminPassword) throw new Error("관리자 계정이 아직 설정되지 않았습니다.");
  if (clean !== adminUsername) throw new Error("관리자 계정이 일치하지 않습니다.");
  if (!safeEqualText(token, createAdminToken())) throw new Error("관리자 로그인이 다시 필요합니다.");
  return clean;
}

async function readAdminProduct(adminUsernameValue, adminTokenValue, id) {
  assertAdminCredentials(adminUsernameValue, adminTokenValue);
  const cleanId = String(id || "").trim();
  if (!cleanId) throw new Error("상품 ID가 필요합니다.");
  const products = await readProducts();
  const product = products.find((item) => item.id === cleanId);
  if (!product) throw new Error("상품을 찾을 수 없습니다.");
  return { ok: true, product };
}

async function saveAdminProduct(payload) {
  assertAdminCredentials(payload?.adminUsername, payload?.adminToken);
  const product = normalizeProduct(payload?.product || {});
  const products = await saveProduct(product);
  return {
    ok: true,
    product,
    products: products.map(mapPublicProduct)
  };
}

function shouldBlockStaticPath(pathname) {
  const normalized = pathname.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
  if (!normalized || normalized === "index.html") return false;
  if (normalized.startsWith(".")) return true;
  if (normalized === "products-db.js") return true;
  if (normalized === "catalog-data.js") return true;
  return [
    "data/",
    "docs/",
    "outputs/",
    "scripts/",
    "tmp/",
    "vendor/",
    "정보서류/"
  ].some((prefix) => normalized.startsWith(prefix.toLowerCase()));
}

async function readApprovalRules() {
  if (!hasSupabaseConfig()) {
    return { businessTypes: [], businessItems: [], source: "local" };
  }

  const query = new URLSearchParams({
    select: "id,business_types,business_items,updated_at",
    id: "eq.default"
  });
  const rows = await requestSupabase(`/rest/v1/approval_settings?${query.toString()}`);
  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    businessTypes: Array.isArray(row?.business_types) ? row.business_types : [],
    businessItems: Array.isArray(row?.business_items) ? row.business_items : [],
    updatedAt: row?.updated_at || "",
    source: row ? "supabase" : "empty"
  };
}

async function saveApprovalRules(payload) {
  const businessTypes = normalizeStringArray(payload?.businessTypes);
  const businessItems = normalizeStringArray(payload?.businessItems);

  if (hasSupabaseConfig()) {
    await requestSupabase("/rest/v1/approval_settings", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([{
        id: "default",
        business_types: businessTypes,
        business_items: businessItems
      }])
    });
  }

  return {
    businessTypes,
    businessItems,
    source: hasSupabaseConfig() ? "supabase" : "local"
  };
}

async function saveSignupRequestRecord(payload) {
  const record = normalizeSignupRequest(payload);

  if (hasSupabaseConfig()) {
    await requestSupabase("/rest/v1/signup_requests", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([mapSignupRequestToSupabase(record)])
    });
  }

  return {
    ok: true,
    approvalStatus: record.approvalStatus,
    businessNumber: record.businessNumber,
    companyName: record.companyName
  };
}

async function loginWithSignupRequest(payload) {
  const businessNumber = String(payload?.businessNumber || "").trim();
  const password = String(payload?.password || "");

  if (!businessNumber || !password) {
    throw new Error("?ъ뾽?먮벑濡앸쾲?몄? 鍮꾨?踰덊샇媛 ?꾩슂?⑸땲??");
  }

  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 濡쒓렇????μ냼媛 ?ㅼ젙?섏? ?딆븯?듬땲??");
  }

  const record = await readSignupRequestByBusinessNumber(businessNumber);
  if (!record || record.password !== password) {
    throw new Error("?ъ뾽?먮벑濡앸쾲???먮뒗 鍮꾨?踰덊샇媛 ?쇱튂?섏? ?딆뒿?덈떎.");
  }

  if (record.approvalStatus !== "?뱀씤") {
    throw new Error(`${record.companyName} 怨꾩젙? ?꾩옱 媛?낅낫瑜??곹깭?낅땲?? ?낇깭/?낆쥌 ?뱀씤 ??濡쒓렇?명븷 ???덉뒿?덈떎.`);
  }

  return {
    ok: true,
    user: {
      phone: record.phone,
      businessNumber: record.businessNumber,
      name: record.name,
      title: record.title,
      companyName: record.companyName,
      companyAddress: record.companyAddress,
      provider: record.provider || "일반 회원가입"
    }
  };
}

async function readSignupRequestByBusinessNumber(businessNumber) {
  const query = new URLSearchParams({
    select: "*",
    business_number: `eq.${businessNumber}`
  });
  const rows = await requestSupabase(`/rest/v1/signup_requests?${query.toString()}`);
  return Array.isArray(rows) && rows.length ? mapSupabaseSignupRequest(rows[0]) : null;
}

async function readCartRecord(businessNumber) {
  const clean = String(businessNumber || "").trim();
  if (!clean) return { items: [] };
  if (!hasSupabaseConfig()) return { items: [] };

  const query = new URLSearchParams({
    select: "business_number,company_name,cart_data,updated_at",
    business_number: `eq.${clean}`
  });
  const rows = await requestSupabase(`/rest/v1/carts?${query.toString()}`);
  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    businessNumber: clean,
    companyName: row?.company_name || "",
    items: Array.isArray(row?.cart_data) ? row.cart_data : [],
    updatedAt: row?.updated_at || ""
  };
}

async function saveCartRecord(payload) {
  const businessNumber = String(payload?.businessNumber || "").trim();
  if (!businessNumber) {
    throw new Error("?λ컮援щ땲 ??μ뿉???ъ뾽?먮벑濡앸쾲?멸? ?꾩슂?⑸땲??");
  }

  const items = Array.isArray(payload?.items) ? payload.items.map(normalizeCartItem) : [];
  const companyName = String(payload?.companyName || "").trim();

  if (hasSupabaseConfig()) {
    await requestSupabase("/rest/v1/carts", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([{
        business_number: businessNumber,
        company_name: companyName,
        cart_data: items
      }])
    });
  }

  return {
    ok: true,
    businessNumber,
    items
  };
}

async function readAdminOverview(adminUsernameValue, adminTokenValue) {
  const clean = String(adminUsernameValue || "").trim();
  if (!hasSupabaseConfig()) throw new Error("Supabase 관리 데이터가 설정되지 않았습니다.");
  assertAdminCredentials(clean, adminTokenValue);

  const [approvalRules, signupRequests, carts] = await Promise.all([
    readApprovalRules(),
    readAllSignupRequests(),
    readAllCartRecords()
  ]);

  return {
    ok: true,
    viewer: {
      adminUsername,
      companyName: adminDisplayName,
      name: adminDisplayName
    },
    approvalRules,
    signupRequests: signupRequests.map((entry) => ({
      phone: entry.phone,
      businessNumber: entry.businessNumber,
      name: entry.name,
      title: entry.title,
      companyName: entry.companyName,
      companyAddress: entry.companyAddress,
      provider: entry.provider,
      representative: entry.representative,
      openingDate: entry.openingDate,
      businessType: entry.businessType,
      businessItem: entry.businessItem,
      approvalStatus: entry.approvalStatus,
      businessFileName: entry.businessFileName,
      submittedAt: entry.submittedAt
    })),
    carts
  };
}

function loginAsAdmin(payload) {
  const username = String(payload?.adminUsername || "").trim();
  const password = String(payload?.adminPassword || "");

  if (!username || !password) {
    throw new Error("관리자 아이디와 비밀번호가 필요합니다.");
  }
  if (!adminPassword) {
    throw new Error("관리자 계정이 아직 설정되지 않았습니다.");
  }
  if (username !== adminUsername || password !== adminPassword) {
    throw new Error("관리자 아이디 또는 비밀번호가 일치하지 않습니다.");
  }

  return {
    ok: true,
    user: {
      role: "admin",
      adminUsername,
      name: adminDisplayName,
      companyName: adminDisplayName,
      adminToken: createAdminToken()
    }
  };
}

async function readAllSignupRequests() {
  const query = new URLSearchParams({
    select: "*",
    order: "submitted_at.desc"
  });
  const rows = await requestSupabase(`/rest/v1/signup_requests?${query.toString()}`);
  return Array.isArray(rows) ? rows.map(mapSupabaseSignupRequest) : [];
}

async function readAllCartRecords() {
  const query = new URLSearchParams({
    select: "business_number,company_name,cart_data,updated_at",
    order: "updated_at.desc"
  });
  const rows = await requestSupabase(`/rest/v1/carts?${query.toString()}`);
  return Array.isArray(rows) ? rows.map((row) => {
    const items = Array.isArray(row.cart_data) ? row.cart_data.map(normalizeCartItem) : [];
    return {
      businessNumber: String(row.business_number || "").trim(),
      companyName: String(row.company_name || "").trim(),
      itemCount: items.length,
      itemNames: items.map((item) => String(item.name || "").trim()).filter(Boolean),
      totalQuote: items.reduce((sum, item) => sum + (Number(item.quotePrice || 0) * Number(item.qty || 0)), 0),
      updatedAt: String(row.updated_at || "").trim()
    };
  }) : [];
}

async function requestSupabase(pathname, options = {}) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase ?섍꼍蹂?섍? ?ㅼ젙?섏? ?딆븯?듬땲??");
  }

  const response = await fetch(`${supabaseUrl}${pathname}`, {
    method: options.method || "GET",
    headers: {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ?붿껌 ?ㅻ쪟 (${response.status}): ${text}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
}

function normalizeStringArray(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function normalizeSignupRequest(payload) {
  return {
    phone: String(payload?.phone || "").trim(),
    businessNumber: String(payload?.businessNumber || "").trim(),
    name: String(payload?.name || "").trim(),
    title: String(payload?.title || "").trim(),
    companyName: String(payload?.companyName || "").trim(),
    companyAddress: String(payload?.companyAddress || "").trim(),
    password: String(payload?.password || ""),
    provider: String(payload?.provider || "일반 회원가입").trim(),
    extractedCompanyName: String(payload?.extractedCompanyName || "").trim(),
    extractedBusinessAddress: String(payload?.extractedBusinessAddress || "").trim(),
    representative: String(payload?.representative || "").trim(),
    openingDate: String(payload?.openingDate || "").trim(),
    businessType: String(payload?.businessType || "").trim(),
    businessItem: String(payload?.businessItem || "").trim(),
    businessCategorySection: String(payload?.businessCategorySection || "").trim(),
    approvalStatus: String(payload?.approvalStatus || "蹂대쪟").trim(),
    businessFileName: String(payload?.businessFileName || "").trim(),
    submittedAt: String(payload?.submittedAt || new Date().toISOString()).trim()
  };
}

function mapSignupRequestToSupabase(record) {
  return {
    phone: record.phone,
    business_number: record.businessNumber,
    name: record.name,
    title: record.title,
    company_name: record.companyName,
    company_address: record.companyAddress,
    password: record.password,
    provider: record.provider,
    extracted_company_name: record.extractedCompanyName,
    extracted_business_address: record.extractedBusinessAddress,
    representative: record.representative,
    opening_date: record.openingDate || null,
    business_type: record.businessType,
    business_item: record.businessItem,
    business_category_section: record.businessCategorySection,
    approval_status: record.approvalStatus,
    business_file_name: record.businessFileName,
    submitted_at: record.submittedAt || new Date().toISOString()
  };
}

function mapSupabaseSignupRequest(row) {
  return {
    phone: String(row.phone || "").trim(),
    businessNumber: String(row.business_number || "").trim(),
    name: String(row.name || "").trim(),
    title: String(row.title || "").trim(),
    companyName: String(row.company_name || "").trim(),
    companyAddress: String(row.company_address || "").trim(),
    password: String(row.password || ""),
    provider: String(row.provider || "일반 회원가입").trim(),
    extractedCompanyName: String(row.extracted_company_name || "").trim(),
    extractedBusinessAddress: String(row.extracted_business_address || "").trim(),
    representative: String(row.representative || "").trim(),
    openingDate: String(row.opening_date || "").trim(),
    businessType: String(row.business_type || "").trim(),
    businessItem: String(row.business_item || "").trim(),
    businessCategorySection: String(row.business_category_section || "").trim(),
    approvalStatus: String(row.approval_status || "蹂대쪟").trim(),
    businessFileName: String(row.business_file_name || "").trim(),
    submittedAt: String(row.submitted_at || "").trim()
  };
}

function normalizeCartItem(item) {
  return {
    id: String(item?.id || "").trim(),
    managementCode: String(item?.managementCode || "").trim(),
    productType: String(item?.productType || "").trim(),
    kind: String(item?.kind || "").trim(),
    name: String(item?.name || "").trim(),
    size: String(item?.size || "").trim(),
    finish: String(item?.finish || "").trim(),
    maker: String(item?.maker || "").trim(),
    unit: String(item?.unit || "").trim(),
    option: String(item?.option || "").trim(),
    costPrice: Number(item?.costPrice) || 0,
    retailPrice: Number(item?.retailPrice) || 0,
    wholesalePrice: Number(item?.wholesalePrice) || 0,
    stockQty: Number(item?.stockQty) || 0,
    image: String(item?.image || "").trim(),
    qty: Math.max(Number(item?.qty) || 0, 0),
    quotePrice: Math.max(Number(item?.quotePrice) || 0, 0),
    renderedImage: String(item?.renderedImage || "").trim(),
    renderTarget: String(item?.renderTarget || "").trim(),
    renderPointMemo: String(item?.renderPointMemo || "").trim()
  };
}

async function checkBusinessStatus(businessNumber) {
  const cleanNumber = String(businessNumber || "").replace(/\D/g, "");
  if (cleanNumber.length !== 10) {
    throw new Error("?ъ뾽?먮벑濡앸쾲??10?먮━媛 ?꾩슂?⑸땲??");
  }

  const serviceKey = process.env.DATA_GO_KR_API_KEY || process.env.NTS_STATUS_API_KEY || process.env.SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("援?꽭泥??ъ뾽???곹깭議고쉶 API ?ㅺ? ?ㅼ젙?섏? ?딆븯?듬땲?? .env??DATA_GO_KR_API_KEY瑜?異붽??댁＜?몄슂.");
  }

  const url = new URL("https://api.odcloud.kr/api/nts-businessman/v1/status");
  url.searchParams.set("serviceKey", serviceKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ b_no: [cleanNumber] })
  });

  if (!response.ok) {
    throw new Error(`?ъ뾽???곹깭議고쉶 ?묐떟 ?ㅻ쪟 (${response.status})`);
  }

  const payload = await response.json();
  const item = Array.isArray(payload.data) ? payload.data[0] : null;
  if (!item) {
    throw new Error("?ъ뾽???곹깭議고쉶 寃곌낵瑜??뺤씤?????놁뒿?덈떎.");
  }

  const statusText = item.b_stt || item.tax_type || "?곹깭 ?뺤씤";
  const valid = !/폐업|휴업/.test(statusText);
  return {
    valid,
    businessNumber: cleanNumber,
    status: item.b_stt || "",
    taxType: item.tax_type || "",
    message: valid
      ? `?뺤긽 ?ъ뾽?먮줈 ?뺤씤?섏뿀?듬땲?? ${item.b_stt || item.tax_type || ""}`.trim()
      : `?ъ뾽???곹깭瑜??뺤씤?댁＜?몄슂. ${item.b_stt || item.tax_type || ""}`.trim()
  };
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  if (shouldBlockStaticPath(pathname)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const resolved = path.resolve(root, `.${pathname}`);

  if (!resolved.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(resolved, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(resolved).toLowerCase();
    const isHtml = extension === ".html";

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": isHtml ? "no-store" : "public, max-age=300"
    });
    response.end(content);
  });
}

async function generateRenderPreview(payload) {
  if (!openAiApiKey) {
    throw new Error("OPENAI_API_KEY 媛믪씠 ?ㅼ젙?섏? ?딆븘 OpenAI ?ㅼ궗 蹂댁젙???ъ슜???놁뒿?덈떎.");
  }

  const siteImageDataUrl = String(payload.siteImageDataUrl || "").trim();
  const pointMemo = String(payload.pointMemo || "").trim();
  const surfaces = Array.isArray(payload.surfaces) ? payload.surfaces : [];

  if (!siteImageDataUrl || !surfaces.length) {
    throw new Error("?꾩옣 ?ъ쭊怨?踰?諛붾떏/?ъ씤?????李몄“ ?대?吏瑜?紐⑤몢 ?낅젰?댁＜?몄슂.");
  }

  const normalizedSurfaces = surfaces
    .map((entry, index) => ({
      surface: normalizeRenderSurfaceValue(entry?.surface),
      tileName: String(entry?.tileName || `tile-${index + 1}`).trim(),
      tileSize: String(entry?.tileSize || "").trim(),
      tileFinish: String(entry?.tileFinish || "").trim(),
      tileImageDataUrl: String(entry?.tileImageDataUrl || "").trim()
    }))
    .filter((entry) => entry.tileImageDataUrl);

  if (!normalizedSurfaces.length) {
    throw new Error("?좏깮??????대?吏瑜?李얠? 紐삵뻽?듬땲??");
  }

  const referenceInstructions = normalizedSurfaces.map((entry, index) => {
    const referenceNumber = index + 2;
    const surfaceInstruction = entry.surface === "wall"
      ? "Apply this tile only to the wall surfaces."
      : entry.surface === "point"
        ? `Apply this tile only to the ${pointMemo || "shower booth back wall"}.`
        : "Apply this tile only to the floor surfaces.";
    const sizeInstruction = buildRenderSizeInstruction(entry.tileSize, entry.surface);

    return `Reference image ${referenceNumber} is the exact installed ${entry.surface} tile material. ${surfaceInstruction} Use this reference as the authoritative material source, not as loose inspiration. Prioritize the tile's visible design identity above all else: match the tone variation, veining flow, stone character, pattern rhythm, print character, surface texture depth, micro-contrast, edge rhythm, finish${entry.tileFinish ? ` (${entry.tileFinish})` : ""}, and module size${entry.tileSize ? ` (${entry.tileSize})` : ""} as closely as possible. The tile pattern and texture are critical and must stay recognizable in the final image. Do not invent a different tile look, do not simplify or blur the pattern, and do not replace it with a generic stone or generic ceramic texture. ${sizeInstruction}`;
  }).join(" ");

  const prompt = [
    "Create a photorealistic real-world site photo edit, not a CGI render.",
    "Use the first image as the original site photo.",
    referenceInstructions,
    "Replace only the existing finish material on the selected planes. Preserve the original site photo structure, camera angle, lens distortion, perspective, room proportions, horizontal and vertical lines, and all non-target surfaces.",
    "Do not redesign the room. Do not move fixtures, doors, drains, moldings, furniture, sanitary ware, silicone lines, or architectural elements.",
    "The selected tile reference images are higher priority than stylistic cleanup. When realism and reference detail conflict, preserve the exact tile material appearance first and then adapt lighting and perspective around it.",
    "Tile tone, pattern, texture, and stone-like character are more important than making the room look cleaner or more minimal. Keep the material identity strong and recognizable from the reference images.",
    "Project the selected tile onto the real plane as if it were actually installed on that surface. Do not simply overlay a flat texture.",
    "Do not flatten the tile surface into a smooth generic finish. Preserve the natural variation, grain, veining direction, texture breaks, and pattern contrast so the tile still reads as that exact product.",
    "Respect the real installation scale of each selected tile. The grout grid, tile count, repeat density, module proportions, and cut pieces must look physically correct for the stated tile size.",
    "Do not enlarge or shrink the tile pattern arbitrarily. Keep the module size believable relative to the room, fixtures, and perspective lines.",
    "Preserve original lighting, color temperature, exposure, contrast, shadows, reflected light, and ambient shading from the source photo.",
    "Add natural contact shadows, ambient occlusion, edge darkening, slight dust, minor surface imperfections, and subtle camera noise so the result looks like a real site photograph.",
    "Avoid CGI, avoid overly clean 3D rendering, avoid plastic texture, avoid exaggerated reflections, and avoid perfectly uniform repetition.",
    "At corners, drains, thresholds, base trims, silicone edges, and cut lines, make grout joints and tile cuts look naturally installed.",
    "If multiple surfaces are selected, keep each reference tile assigned only to its matching surface and never mix wall, floor, and point materials.",
    "Final result style: a realistic after-installation site photo captured on a phone or site camera, suitable for a client proposal."
  ].join(" ");

  const form = new FormData();
  form.append("model", openAiImageModel);
  form.append("prompt", prompt);
  form.append("size", "1536x1024");
  form.append("quality", "high");
  form.append("output_format", "png");
  form.append("image[]", dataUrlToBlob(siteImageDataUrl), "site-photo.png");
  normalizedSurfaces.forEach((entry) => {
    form.append("image[]", dataUrlToBlob(entry.tileImageDataUrl), `${sanitizeFileName(entry.tileName || "tile")}.png`);
  });

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`
    },
    body: form
  });

  const payloadText = await response.text();
  let result = null;
  try {
    result = payloadText ? JSON.parse(payloadText) : null;
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.error?.message || "OpenAI ?ㅼ궗 蹂댁젙 API ?붿껌??ㅽ뙣?덉뒿?덈떎.");
  }

  const imageBase64 = result?.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI媛 蹂댁젙 ?대?吏瑜?諛섑솚?섏? ?딆븯?듬땲??");
  }

  return {
    ok: true,
    imageDataUrl: `data:image/png;base64,${imageBase64}`
  };
}

function normalizeRenderSurfaceValue(value) {
  if (value === "wall") return "wall";
  if (value === "point") return "point";
  return "floor";
}

function buildRenderSizeInstruction(tileSize, surface) {
  const parsed = parseTileSizeSpec(tileSize);
  if (!parsed) {
    return "Keep the tile module size realistic and consistent with normal installed tile dimensions.";
  }

  const { widthMm, heightMm, ratioLabel, shapeLabel } = parsed;
  const directionHint = widthMm === heightMm
    ? "Use an even square module grid."
    : surface === "wall"
      ? "Keep the rectangular module orientation natural for wall installation unless the photo strongly suggests another orientation."
      : "Keep the rectangular module orientation natural for floor installation and perspective."

  return `The installed tile module size is ${widthMm}mm x ${heightMm}mm (${ratioLabel}, ${shapeLabel}). Show grout joints and repeat density at that real-world scale. ${directionHint}`;
}

function parseTileSizeSpec(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/[Xx×]/g, "*")
    .replace(/\s+/g, "")
    .replace(/mm/gi, "");

  const match = normalized.match(/^(\d{2,4})\*(\d{2,4})$/);
  if (!match) return null;

  const widthMm = Number(match[1]);
  const heightMm = Number(match[2]);
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || !widthMm || !heightMm) return null;

  const shapeLabel = widthMm === heightMm ? "square" : "rectangular";
  const bigger = Math.max(widthMm, heightMm);
  const smaller = Math.min(widthMm, heightMm);
  const ratioLabel = `${Math.round((bigger / smaller) * 100) / 100}:1`;

  return { widthMm, heightMm, shapeLabel, ratioLabel };
}

function dataUrlToBlob(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new Error("?대?吏 ?낅젰 ?뺤떇???щ컮瑜댁? ?딆뒿?덈떎.");
  }
  const [, mimeType, base64] = match;
  return new Blob([Buffer.from(base64, "base64")], { type: mimeType });
}

function sanitizeFileName(value) {
  return String(value || "tile").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "tile";
}

async function buildProfessionalProposalDeck(payload) {
  const normalized = normalizeProposalPayload(payload);
  await fs.promises.mkdir(proposalOutputDir, { recursive: true });
  await fs.promises.mkdir(proposalTmpDir, { recursive: true });

  const deckId = `${formatTimestampForFile(new Date())}-${Math.random().toString(36).slice(2, 8)}`;
  const requestPath = path.join(proposalTmpDir, `${deckId}.json`);
  const outputDir = path.join(proposalOutputDir, deckId);
  const fileBase = `${sanitizeFileName(normalized.proposal.customerName || "고객")}-프로제안서`;
  const outputPath = path.join(outputDir, `${fileBase}.pptx`);
  const narrativePlanPath = path.join(outputDir, "narrative_plan.md");

  await fs.promises.mkdir(outputDir, { recursive: true });
  await fs.promises.writeFile(requestPath, `${JSON.stringify({ ...normalized, outputPath, outputDir }, null, 2)}\n`, "utf8");
  await fs.promises.writeFile(narrativePlanPath, buildNarrativePlan(normalized), "utf8");

  try {
    const stdout = await execFileAsync(process.execPath, [proposalBuilderPath, requestPath], { cwd: root, maxBuffer: 20 * 1024 * 1024 });
    const result = JSON.parse(stdout.trim() || "{}");
    const relativePath = path.relative(root, result.outputPath || outputPath).replace(/\\/g, "/");

    return {
      ok: true,
      fileName: path.basename(result.outputPath || outputPath),
      downloadUrl: `/${relativePath}`,
      outputPath: result.outputPath || outputPath
    };
  } finally {
    await fs.promises.rm(requestPath, { force: true });
  }
}

async function handleServerControl(payload) {
  const action = String(payload?.action || "").trim().toLowerCase();
  if (!action) {
    throw new Error("?쒕쾭 ?쒖뼱 ?묒뾽???꾩슂?⑸땲??");
  }

  if (action === "restart") {
    setTimeout(() => shutdownServer(false), 150);
    return { ok: true, action, message: "?쒕쾭瑜??ъ떆?묓빀?덈떎." };
  }

  if (action === "stop") {
    await fs.promises.mkdir(serverControlDir, { recursive: true });
    await fs.promises.writeFile(stopFlagPath, "stop\n", "utf8");
    setTimeout(() => shutdownServer(true), 150);
    return { ok: true, action, message: "?쒕쾭瑜?醫낅즺?⑸땲??" };
  }

  throw new Error("吏?먰븯吏 ?딅뒗 ?쒕쾭 ?쒖뼱 ?묒뾽?낅땲??");
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > bodyLimit) {
        reject(new Error("?낅줈???⑸웾???덈Т ?쎈땲??"));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function normalizeProposalPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("?쒖븞???앹꽦 ?붿껌 ?곗씠?곌? ?꾩슂?⑸땲??");
  }

  const proposal = payload.proposal || {};
  const company = payload.company || {};
  const summary = payload.summary || {};
  const cart = Array.isArray(payload.cart) ? payload.cart : [];
  if (!cart.length) {
    throw new Error("?λ컮援щ땲 ?곹뭹???덉뼱???꾨줈 ?쒖븞?쒕? 留뚮뱾 ???덉뒿?덈떎.");
  }

  return {
    proposal: {
      customerName: String(proposal.customerName || "고객").trim(),
      customerPhone: String(proposal.customerPhone || "").trim(),
      siteAddress: String(proposal.siteAddress || "현장 주소 미입력").trim(),
      startDate: String(proposal.startDate || "").trim(),
      validDays: Number(proposal.validDays) || 14,
      proposalDate: String(proposal.proposalDate || new Date().toISOString()),
      validDate: String(proposal.validDate || new Date().toISOString()),
      memo: String(proposal.memo || "").trim(),
      theme: String(proposal.theme || "beige-black").trim() || "beige-black"
    },
    company: {
      name: String(company.name || "타일앤바스플러스").trim(),
      managerName: String(company.managerName || "").trim(),
      managerTitle: String(company.managerTitle || "").trim(),
      managerPhone: String(company.managerPhone || "").trim()
    },
    summary: {
      itemCount: Number(summary.itemCount) || cart.length,
      subtotal: Number(summary.subtotal) || 0,
      vat: Number(summary.vat) || 0,
      total: Number(summary.total) || 0
    },
    cart: cart.map((item) => ({
      id: String(item.id || "").trim(),
      productType: String(item.productType || "").trim(),
      kind: String(item.kind || "").trim(),
      name: String(item.name || "").trim(),
      size: String(item.size || "").trim(),
      option: String(item.option || "").trim(),
      finish: String(item.finish || "").trim(),
      maker: String(item.maker || "").trim(),
      unit: String(item.unit || "").trim(),
      qty: Number(item.qty) || 0,
      quotePrice: Number(item.quotePrice) || 0,
      costPrice: Number(item.costPrice) || 0,
      image: String(item.image || "").trim(),
      renderedImage: String(item.renderedImage || "").trim(),
      renderTarget: String(item.renderTarget || "").trim(),
      renderPointMemo: String(item.renderPointMemo || "").trim(),
      renderSurfaceSelections: normalizeRenderSurfaceSelections(item.renderSurfaceSelections)
    }))
  };
}

function normalizeRenderSurfaceSelections(value) {
  const source = value && typeof value === "object" ? value : {};
  return ["wall", "floor", "point"].reduce((result, surface) => {
    const entry = source[surface] && typeof source[surface] === "object" ? source[surface] : {};
    result[surface] = {
      tileId: String(entry.tileId || "").trim()
    };
    return result;
  }, {});
}

function buildNarrativePlan(payload) {
  const kinds = [...new Set(payload.cart.map((item) => item.kind).filter(Boolean))];
  return [
    "# ?꾨줈 ?쒖븞???대윭?곕툕 ?뚮옖",
    "",
    `- ???怨좉컼: ${payload.proposal.customerName || "怨좉컼"} / ${payload.proposal.siteAddress || "?꾩옣"}`,
    `- 템플릿 타입: ${payload.proposal.theme || "beige-black"}`,
    `- 업체 정보: ${payload.company?.name || "타일앤바스플러스"} / ${payload.company?.managerName || "담당자 미입력"} ${payload.company?.managerTitle ? `(${payload.company.managerTitle})` : ""} / ${payload.company?.managerPhone || "연락처 미입력"}`,
    "- 紐⑹쟻: ?λ컮援щ땲???닿릿 ??? ?꾩깮?꾧린, 遺?먯옱瑜??꾨Ц ?쒖븞???뺥깭??PPT濡??뺣━",
    "- ?ㅼ븻留ㅻ꼫: ?명뀒由ъ뼱 ?ㅻТ ?쒖븞?? 源붾걫???뚯옱 以묒떖 鍮꾩＜?? ?ㅼ젣 ?곹뭹 ?대?吏 媛뺤“",
    "- ?щ씪?대뱶 援ъ꽦:",
    "  1. 而ㅻ쾭",
    "  2. ?꾨줈?앺듃 媛쒖슂 諛??듭떖 ?섏튂",
    "  3. ?좎젙 ?쒗뭹 ?뚭컻",
    "  4. 異붽? ?좎젙 ?쒗뭹 ?먮뒗 ?ㅼ궗 蹂댁젙 ?대?吏",
    "  5. 寃ъ쟻 ?붿빟",
    `- 二쇱슂 遺꾨쪟: ${kinds.join(", ") || "?좎젙 ?덈ぉ"}`,
    `- 硫붾え: ${payload.proposal.memo || "?놁쓬"}`,
    ""
  ].join("\n");
}

function sanitizeFileName(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40) || "proposal";
}

function formatTimestampForFile(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function execFileAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message || "?꾨줈 ?쒖븞???앹꽦 ?ㅽ뻾???ㅽ뙣?덉뒿?덈떎."));
        return;
      }
      resolve(stdout);
    });
  });
}

function shutdownServer(expectStopFlag) {
  server.close(() => {
    if (!expectStopFlag) {
      try {
        if (fs.existsSync(stopFlagPath)) fs.unlinkSync(stopFlagPath);
      } catch {}
    }
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(0);
  }, 1000).unref();
}

