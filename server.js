const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { pathToFileURL } = require("url");

const root = process.cwd();
loadEnvFile(path.join(root, ".env"));

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const productsPath = path.join(root, "data", "products.json");
const normalizedTaxonomyPath = path.join(root, "data", "products.normalized.json");
const productsHiddenFlagPath = path.join(root, "data", "products-hidden.flag");
const bodyLimit = 80 * 1024 * 1024;
const proposalOutputDir = path.join(root, "outputs", "proposals");
const proposalTmpDir = path.join(root, "tmp", "proposal-ppt");
const proposalBuilderPath = path.join(root, "scripts", "build-proposal-deck.mjs");
const serverControlDir = path.join(root, "tmp", "server-control");
const stopFlagPath = path.join(serverControlDir, "stop.flag");
const startedAt = new Date();
const openAiApiKey = String(process.env.OPENAI_API_KEY || "").trim();
const openAiImageModel = String(process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();
const openAiVisionModel = String(process.env.OPENAI_VISION_MODEL || "gpt-4o-mini").trim();
const supabaseUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const supabaseSecretKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SECRET_KEY
  || ""
).trim();
const publicSiteUrl = String(
  process.env.PUBLIC_SITE_URL
  || process.env.APP_PUBLIC_URL
  || process.env.RAILWAY_PUBLIC_DOMAIN
  || ""
).trim().replace(/\/+$/, "");
const businessDocumentBucket = String(process.env.SUPABASE_BUSINESS_DOCUMENT_BUCKET || "business-documents").trim();
const forceLocalProducts = /^(1|true|yes)$/i.test(String(process.env.FORCE_LOCAL_PRODUCTS || "").trim());
const productReadCacheTtlMs = Math.max(0, Number(process.env.PRODUCT_READ_CACHE_TTL_MS || 5 * 60 * 1000));
const productReadFallbackCacheTtlMs = Math.max(0, Number(process.env.PRODUCT_READ_FALLBACK_CACHE_TTL_MS || 60 * 1000));
const productRemoteReadTimeoutMs = Math.max(0, Number(process.env.PRODUCT_REMOTE_READ_TIMEOUT_MS || 3000));
const supabaseRequestTimeoutMs = Math.max(0, Number(process.env.SUPABASE_REQUEST_TIMEOUT_MS || 12000));
const productReadMode = String(process.env.PRODUCT_READ_MODE || "supabase-first").trim().toLowerCase();
const adminUsername = String(process.env.ADMIN_USERNAME || "admin").trim();
const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
const adminDisplayName = String(process.env.ADMIN_DISPLAY_NAME || "내부관리자").trim();
const tile114UserId = String(process.env.TILE114_USER_ID || "").trim();
const tile114Password = String(process.env.TILE114_PASSWORD || "").trim();
const tile114LoginUrl = String(process.env.TILE114_LOGIN_URL || "https://vgtns.tile114.co.kr/Web/ExInDex.asp?PopTF=2").trim();
const memberTokenSecret = crypto
  .createHash("sha256")
  .update([supabaseSecretKey, adminPassword, "tile-bath-plus-member-token"].filter(Boolean).join(":"))
  .digest("hex");
let businessDocumentBucketReady = false;
let tileSearchEnginePromise = null;
let productsReadCache = { expiresAt: 0, rows: null, source: "" };
let publicProductsJsonCache = { expiresAt: 0, json: "" };
const defaultApprovalRules = {
  businessTypes: [
    "인테리어",
    "타일",
    "건축",
    "건설",
    "종합건설업",
    "전문건설업",
    "건축자재도매업",
    "건축자재소매업",
    "타일도매업",
    "타일소매업",
    "위생도기도매업",
    "위생도기소매업",
    "욕실용품도매업",
    "욕실용품소매업",
    "수전도매업",
    "수전소매업",
    "전자상거래소매업",
    "통신판매업"
  ],
  businessItems: [
    "종합건설업",
    "전문건설업",
    "실내건축공사업",
    "인테리어디자인업",
    "인테리어시공업",
    "리모델링공사업",
    "타일및방수공사업",
    "미장타일방수공사업",
    "건축자재도매업",
    "건축자재소매업",
    "타일도매업",
    "타일소매업",
    "위생도기도매업",
    "위생도기소매업",
    "욕실용품도매업",
    "욕실용품소매업",
    "수전도매업",
    "수전소매업",
    "전자상거래소매업",
    "통신판매업"
  ]
};

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

    if (request.method === "GET" && request.url.startsWith("/api/social-auth/start")) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      response.writeHead(302, {
        Location: buildSocialAuthStartUrl(
          String(url.searchParams.get("provider") || ""),
          String(url.searchParams.get("mode") || "signup"),
          request
        )
      });
      response.end();
      return;
    }

    if (request.method === "POST" && request.url === "/api/social-auth/profile") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await readSocialAuthProfile(String(payload?.accessToken || "")));
      return;
    }

    if (request.method === "POST" && request.url === "/api/social-auth/login") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await loginWithSocialAuth(String(payload?.accessToken || "")));
      return;
    }

    if (request.method === "GET" && request.url === "/api/products") {
      if (areProductsHiddenFromStorefront()) {
        sendJson(response, 200, []);
        return;
      }
      sendRawJson(response, 200, await getPublicProductsJson());
      return;
    }

    if (request.method === "GET" && request.url.startsWith("/api/member/products")) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const member = await verifyMemberProductAccess(
        String(url.searchParams.get("businessNumber") || ""),
        String(url.searchParams.get("memberToken") || "")
      );
      if (areProductsHiddenFromStorefront()) {
        sendJson(response, 200, { ok: true, user: member, products: [] });
        return;
      }
      sendJson(response, 200, {
        ok: true,
        user: member,
        products: (await readProducts()).map(mapMemberProduct)
      });
      return;
    }

    if (request.method === "GET" && request.url.startsWith("/api/local/normalized-taxonomy")) {
      if (!isLocalRequest(request)) {
        sendJson(response, 404, { error: "Not found" });
        return;
      }
      const url = new URL(request.url, `http://${request.headers.host}`);
      sendJson(response, 200, await readLocalNormalizedTaxonomy(String(url.searchParams.get("view") || "admin")));
      return;
    }

    if (request.method === "POST" && request.url === "/api/local/taxonomy-search-log") {
      if (!isLocalRequest(request)) {
        sendJson(response, 404, { error: "Not found" });
        return;
      }
      const payload = JSON.parse(await readRequestBody(request));
      await appendTaxonomySearchLog(payload);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && request.url === "/api/tile-search") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await searchTileCatalog(payload));
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

    if (request.method === "GET" && request.url.startsWith("/api/admin/tile114-sample")) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      sendJson(response, 200, await readTile114SampleProducts(
        String(url.searchParams.get("adminUsername") || ""),
        String(url.searchParams.get("adminToken") || ""),
        String(url.searchParams.get("category") || "5"),
        Number(url.searchParams.get("limit") || 5)
      ));
      return;
    }

    if (request.method === "POST" && request.url === "/api/render") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await generateRenderPreview(payload));
      return;
    }

    if (request.method === "POST" && request.url === "/api/tile-match") {
      const payload = JSON.parse(await readRequestBody(request));
      sendJson(response, 200, await findSimilarTilesByImage(payload));
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

    sendJson(response, 405, { error: "지원하지 않는 요청입니다." });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "서버 오류가 발생했습니다." });
  }
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 0;

server.listen(port, host, () => {
  console.log(`Tile & Bath Plus app: http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
  getPublicProductsJson().catch((error) => {
    console.warn("[products] Public product cache warmup failed.", error.message);
  });
});

process.on("unhandledRejection", (error) => {
  console.error("[server] unhandledRejection", error);
  setTimeout(() => process.exit(1), 50).unref();
});

process.on("uncaughtException", (error) => {
  console.error("[server] uncaughtException", error);
  setTimeout(() => process.exit(1), 50).unref();
});

function getCachedProducts() {
  if (!productsReadCache.rows || Date.now() >= productsReadCache.expiresAt) return null;
  return productsReadCache.rows;
}

function setCachedProducts(rows, source, ttlMs = productReadCacheTtlMs) {
  productsReadCache = {
    expiresAt: Date.now() + ttlMs,
    rows,
    source
  };
  return rows;
}

function invalidateProductsReadCache() {
  productsReadCache = { expiresAt: 0, rows: null, source: "" };
  publicProductsJsonCache = { expiresAt: 0, json: "" };
}

async function withTimeout(promise, timeoutMs, message) {
  if (!timeoutMs) return promise;
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readProductsFromLocalFile() {
  const content = await fs.promises.readFile(productsPath, "utf8");
  return JSON.parse(content);
}

async function getPublicProductsJson() {
  if (publicProductsJsonCache.json && Date.now() < publicProductsJsonCache.expiresAt) {
    return publicProductsJsonCache.json;
  }
  const json = JSON.stringify((await readProducts()).map(mapPublicProduct));
  publicProductsJsonCache = {
    expiresAt: Date.now() + productReadCacheTtlMs,
    json
  };
  return json;
}

async function readProducts(options = {}) {
  const cachedProducts = options.cache === false ? null : getCachedProducts();
  if (cachedProducts) return cachedProducts;

  if (productReadMode !== "supabase-first") {
    try {
      const localProducts = await readProductsFromLocalFile();
      if (localProducts.length || productReadMode === "local-first") {
        return setCachedProducts(localProducts, "file");
      }
    } catch (error) {
      if (productReadMode === "local-only" || !hasSupabaseConfig()) throw error;
      console.warn("[products] Local products.json read failed; trying Supabase.", error.message);
    }
  }

  if (hasSupabaseConfig()) {
    try {
      const remoteProducts = await withTimeout(
        readProductsFromSupabase(),
        productRemoteReadTimeoutMs,
        `Supabase 상품 읽기 시간 초과 (${productRemoteReadTimeoutMs}ms)`
      );
      if (remoteProducts.length) return setCachedProducts(remoteProducts, "supabase");
    } catch (error) {
      console.warn("[products] Supabase read failed; using local products.json.", error.message);
    }
  }

  const localProducts = await readProductsFromLocalFile();
  return setCachedProducts(
    localProducts,
    "file",
    hasSupabaseConfig() ? productReadFallbackCacheTtlMs : productReadCacheTtlMs
  );
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
  if (forceLocalProducts) return false;
  return Boolean(supabaseUrl && supabaseSecretKey);
}

function getStorageMode() {
  return hasSupabaseConfig() ? "supabase" : "file";
}

function areProductsHiddenFromStorefront() {
  return fs.existsSync(productsHiddenFlagPath);
}

const LEGACY_PRODUCTS_SUPABASE_COLUMNS = [
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
];

const PRODUCTS_SUPABASE_COLUMNS = [
  "id",
  "management_code",
  "product_type",
  "kind",
  "name",
  "size",
  "model_name",
  "material",
  "surface",
  "pattern_category",
  "country_of_origin",
  "pcs_per_box",
  "sqm_per_box",
  "color",
  "features",
  "finish",
  "maker",
  "unit",
  "option_text",
  "cost_price",
  "retail_price",
  "wholesale_price",
  "stock_qty",
  "stock_text",
  "grade_a_price",
  "grade_b_price",
  "grade_c_price",
  "image",
  "image_urls",
  "original_image",
  "close_image",
  "detail_image",
  "daylight_image",
  "fluorescent_image",
  "scene_image",
  "source_site",
  "source_url",
  "source_product_id",
  "source_category_code",
  "source_category_name",
  "catalog_source",
  "catalog_page",
  "last_synced_at",
  "created_at",
  "updated_at"
];

async function readProductsFromSupabase() {
  const pageSize = 1000;
  const query = new URLSearchParams({
    select: PRODUCTS_SUPABASE_COLUMNS.join(","),
    order: "name.asc"
  });
  const legacyQuery = new URLSearchParams({
    select: LEGACY_PRODUCTS_SUPABASE_COLUMNS.join(","),
    order: "name.asc"
  });

  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    let page;
    try {
      page = await requestSupabase(`/rest/v1/products?${query.toString()}`, {
        timeoutMs: Math.min(supabaseRequestTimeoutMs || 12000, 5000),
        headers: {
          Range: `${offset}-${offset + pageSize - 1}`
        }
      });
    } catch (error) {
      if (!String(error?.message || "").includes("does not exist")) throw error;
      page = await requestSupabase(`/rest/v1/products?${legacyQuery.toString()}`, {
        timeoutMs: Math.min(supabaseRequestTimeoutMs || 12000, 5000),
        headers: {
          Range: `${offset}-${offset + pageSize - 1}`
        }
      });
    }
    if (!Array.isArray(page) || !page.length) break;
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows.map(mapSupabaseProductToApp);
}

async function upsertProductToSupabase(product) {
  const payload = mapAppProductToSupabase(product);
  try {
    await requestSupabase("/rest/v1/products", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (!String(error?.message || "").match(/column .* does not exist|could not find .* column/i)) throw error;
    await requestSupabase("/rest/v1/products", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(toLegacySupabaseProduct(payload))
    });
  }
}

async function saveProduct(product) {
  let products = await readProducts({ cache: false });
  const index = products.findIndex((item) => item.id === product.id);
  if (index >= 0) products[index] = product;
  else products.push(product);

  if (hasSupabaseConfig()) {
    await upsertProductToSupabase(product);
    invalidateProductsReadCache();
    products = await readProducts({ cache: false });
  }

  await fs.promises.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  setCachedProducts(products, "file");
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
    model_name: product.modelName || product.name || "",
    material: product.material || "",
    surface: product.surface || "",
    pattern_category: product.patternCategory || classifyPatternCategory(product),
    country_of_origin: product.countryOfOrigin || "",
    pcs_per_box: toNullableInteger(product.pcsPerBox),
    sqm_per_box: toNullableNumber(product.sqmPerBox),
    color: product.color || "",
    features: product.features || "",
    finish: product.finish,
    maker: product.maker,
    unit: product.unit,
    option_text: product.option,
    cost_price: Number(product.costPrice) || 0,
    retail_price: Number(product.retailPrice) || 0,
    wholesale_price: Number(product.wholesalePrice) || 0,
    stock_qty: Number(product.stockQty) || 0,
    stock_text: product.stockText || "",
    grade_a_price: toNullableInteger(product.gradeAPrice),
    grade_b_price: toNullableInteger(product.gradeBPrice),
    grade_c_price: toNullableInteger(product.gradeCPrice),
    image: product.image || "",
    image_urls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
    original_image: product.originalImage || "",
    close_image: product.closeImage || "",
    detail_image: product.detailImage || "",
    daylight_image: product.daylightImage || "",
    fluorescent_image: product.fluorescentImage || "",
    scene_image: product.sceneImage || "",
    source_site: product.sourceSite || "",
    source_url: product.sourceUrl || "",
    source_product_id: product.sourceProductId || "",
    source_category_code: product.sourceCategoryCode || "",
    source_category_name: product.sourceCategoryName || "",
    catalog_source: product.catalogSource || "",
    catalog_page: Number(product.catalogPage) || 0,
    last_synced_at: product.lastSyncedAt || null
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
    modelName: String(row.model_name || row.name || "").trim(),
    material: String(row.material || "").trim(),
    surface: String(row.surface || "").trim(),
    patternCategory: String(row.pattern_category || "").trim() || classifyPatternCategory(row),
    countryOfOrigin: String(row.country_of_origin || "").trim(),
    pcsPerBox: toBlankableNumber(row.pcs_per_box),
    sqmPerBox: toBlankableNumber(row.sqm_per_box),
    color: String(row.color || "").trim(),
    features: String(row.features || "").trim(),
    finish: String(row.finish || "").trim(),
    maker: String(row.maker || "").trim(),
    unit: String(row.unit || "").trim(),
    option: String(row.option_text || "").trim(),
    costPrice: Number(row.cost_price) || 0,
    retailPrice: Number(row.retail_price) || 0,
    wholesalePrice: Number(row.wholesale_price) || 0,
    stockQty: Number(row.stock_qty) || 0,
    stockText: String(row.stock_text || "").trim(),
    gradeAPrice: toBlankableNumber(row.grade_a_price),
    gradeBPrice: toBlankableNumber(row.grade_b_price),
    gradeCPrice: toBlankableNumber(row.grade_c_price),
    image: String(row.image || "").trim(),
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
    originalImage: String(row.original_image || "").trim(),
    closeImage: String(row.close_image || "").trim(),
    detailImage: String(row.detail_image || "").trim(),
    daylightImage: String(row.daylight_image || "").trim(),
    fluorescentImage: String(row.fluorescent_image || "").trim(),
    sceneImage: String(row.scene_image || "").trim(),
    sourceSite: String(row.source_site || "").trim(),
    sourceUrl: String(row.source_url || "").trim(),
    sourceProductId: String(row.source_product_id || "").trim(),
    sourceCategoryCode: String(row.source_category_code || "").trim(),
    sourceCategoryName: String(row.source_category_name || "").trim(),
    catalogSource: String(row.catalog_source || "").trim(),
    catalogPage: Number(row.catalog_page) || 0,
    lastSyncedAt: String(row.last_synced_at || "").trim()
  };
}

function mapPublicProduct(product) {
  return {
    id: String(product.id || "").trim(),
    productType: String(product.productType || "").trim(),
    kind: getPublicProductGroup(product),
    name: String(product.name || "").trim(),
    size: String(product.size || "").trim(),
    modelName: String(product.modelName || product.name || "").trim(),
    material: String(product.material || "").trim(),
    surface: String(product.surface || "").trim(),
    patternCategory: String(product.patternCategory || "").trim() || classifyPatternCategory(product),
    color: String(product.color || "").trim(),
    features: String(product.features || "").trim(),
    finish: String(product.finish || "").trim(),
    maker: "",
    unit: String(product.unit || "").trim(),
    option: String(product.option || "").trim(),
    stockQty: Number(product.stockQty) || 0,
    stockText: String(product.stockText || "").trim(),
    image: String(product.image || "").trim(),
    originalImage: String(product.originalImage || "").trim(),
    closeImage: String(product.closeImage || "").trim(),
    detailImage: String(product.detailImage || "").trim(),
    daylightImage: String(product.daylightImage || "").trim(),
    fluorescentImage: String(product.fluorescentImage || "").trim(),
    sceneImage: String(product.sceneImage || "").trim()
  };
}

function mapMemberProduct(product) {
  return {
    ...mapPublicProduct(product),
    retailPrice: Number(product.retailPrice) || 0,
    wholesalePrice: Number(product.wholesalePrice) || 0,
    gradeAPrice: toBlankableNumber(product.gradeAPrice),
    gradeBPrice: toBlankableNumber(product.gradeBPrice),
    gradeCPrice: toBlankableNumber(product.gradeCPrice),
    memberPriceVisible: true
  };
}

function getPublicProductGroup(product) {
  const productType = String(product.productType || "").trim();
  const internalCodes = new Set(["AJ", "VG", "US", "SG", "GT", "HS"]);
  const semanticKind = String(product.kind || "").trim();
  if ((productType === "sanitary" || productType === "material") && semanticKind && !internalCodes.has(semanticKind.toUpperCase())) {
    return semanticKind;
  }

  const candidates = [
    product.option,
    product.sourceCategoryName,
    product.source_category_name,
    product.material,
    productType === "tile" ? "타일" : productType
  ];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (!value) continue;
    if (internalCodes.has(value.toUpperCase())) continue;
    return value;
  }
  return "상품";
}

function toNullableInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function toBlankableNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function classifyPatternCategory(product) {
  const source = normalizeMatchText([
    product?.patternCategory,
    product?.pattern_category,
    product?.name,
    product?.modelName,
    product?.model_name,
    product?.option,
    product?.option_text,
    product?.kind,
    product?.material,
    product?.surface,
    product?.finish,
    product?.color,
    product?.features,
    product?.source_category_name
  ].filter(Boolean).join(" "));

  if (!source) return "기타";
  if (/테라조|terrazzo|trz|입자|칩|chip|speckle|스페클/.test(source)) return "테라조";
  if (/마블|marble|mar|카라라|carrara|calacatta|비앙코|네로마퀴나|nero|베인|vein|대리석/.test(source)) return "마블";
  if (/시멘트|cement|cem|콘크리트|concrete|con|모르타르|몰탈/.test(source)) return "시멘트";
  if (/우드|wood|wod|나뭇결|목재|오크|티크/.test(source)) return "우드";
  if (/스톤|stone|stn|석재|라임스톤|limestone|트라버틴|travertine|슬레이트|현무|라바|lava/.test(source)) return "스톤";
  if (/패턴|pattern|ptn|art|데코|장식|꽃|플라워|라인|헥사|기하학|모자이크|mosaic|mos|포토/.test(source)) return "패턴";
  if (/솔리드|solid|단색|plain|무지/.test(source)) return "솔리드";
  return "솔리드";
}

function toLegacySupabaseProduct(product) {
  const {
    model_name,
    material,
    surface,
    pattern_category,
    country_of_origin,
    pcs_per_box,
    sqm_per_box,
    color,
    features,
    stock_text,
    grade_a_price,
    grade_b_price,
    grade_c_price,
    image_urls,
    source_site,
    source_url,
    source_product_id,
    source_category_code,
    source_category_name,
    last_synced_at,
    ...legacyProduct
  } = product;
  return legacyProduct;
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
  if (normalized.startsWith("outputs/proposals/") && normalized.endsWith(".pptx")) return false;
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

async function readLocalNormalizedTaxonomy(view = "admin") {
  try {
    const rows = JSON.parse(await fs.promises.readFile(normalizedTaxonomyPath, "utf8"));
    if (String(view).toLowerCase() === "customer") {
      return Array.isArray(rows) ? rows.map(stripInternalBrandFromNormalizedProduct) : [];
    }
    return rows;
  } catch {
    return [];
  }
}

async function searchTileCatalog(payload) {
  const requestedAudience = String(payload?.audience || "customer").toLowerCase();
  const audience = requestedAudience === "admin" ? "admin" : "customer";
  if (audience === "admin") {
    assertAdminCredentials(payload?.adminUsername, payload?.adminToken);
  }

  const query = String(payload?.query || "").slice(0, 500);
  const limit = Math.min(Math.max(Number(payload?.limit || 80), 1), 200);
  const products = await readLocalNormalizedTaxonomy(audience);
  const engine = await getTileSearchEngine();
  const result = engine.searchTiles(products, query, { audience, limit });
  const summaries = result.results.map((entry) => {
    const summary = engine.summarizeResult(entry);
    return audience === "admin"
      ? addAdminTileSearchSummary(summary, entry.item)
      : stripInternalBrandFromSearchSummary(summary);
  });

  await appendTaxonomySearchLog({
    audience,
    query,
    resultCount: result.total,
    interpreted: result.intent
  }).catch((error) => {
    console.warn("[tile-search] unable to append search log:", error.message);
  });

  return {
    ok: true,
    engineVersion: result.engineVersion,
    audience,
    total: result.total,
    intent: sanitizeSearchIntentForResponse(result.intent, audience),
    results: summaries
  };
}

async function getTileSearchEngine() {
  if (!tileSearchEnginePromise) {
    tileSearchEnginePromise = import(pathToFileURL(path.join(root, "scripts", "tile-search-engine.mjs")).href);
  }
  return tileSearchEnginePromise;
}

function sanitizeSearchIntentForResponse(intent, audience) {
  const {
    internalBrands,
    internalBrandCodes,
    internalBrandNames,
    ...safeIntent
  } = intent || {};
  if (audience === "admin") {
    return {
      ...safeIntent,
      internalBrands: Array.isArray(internalBrands) ? internalBrands : [],
      internalBrandCodes: Array.isArray(internalBrandCodes) ? internalBrandCodes : [],
      internalBrandNames: Array.isArray(internalBrandNames) ? internalBrandNames : []
    };
  }
  return safeIntent;
}

function stripInternalBrandFromSearchSummary(summary) {
  const {
    internalBrandId,
    internalBrandCode,
    internalBrandName,
    supplierName,
    marginGrade,
    qualityGrade,
    ...safe
  } = summary || {};
  return safe;
}

function addAdminTileSearchSummary(summary, item) {
  return {
    ...summary,
    internalBrandCode: item?.internalBrandCode || "",
    internalBrandName: item?.internalBrandName || "",
    supplierName: item?.supplierName || ""
  };
}

async function appendTaxonomySearchLog(payload) {
  const logDir = path.join(root, "data", "search-logs");
  const logPath = path.join(logDir, "taxonomy-search.jsonl");
  const entry = {
    createdAt: new Date().toISOString(),
    audience: String(payload?.audience || "customer").slice(0, 20),
    query: String(payload?.query || "").slice(0, 500),
    resultCount: Number(payload?.resultCount || 0),
    interpreted: sanitizeSearchLogObject(payload?.interpreted || {})
  };
  await fs.promises.mkdir(logDir, { recursive: true });
  await fs.promises.appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

function sanitizeSearchLogObject(value) {
  if (!value || typeof value !== "object") return {};
  const allowedKeys = [
    "origins", "spaces", "applications", "colors", "styles", "patternDetails",
    "finishes", "textures", "materials", "moods", "sizes", "thicknesses", "priceRanges",
    "antiSlipRequired", "stockRequired", "stockEmpty", "freeTokens"
  ];
  return Object.fromEntries(allowedKeys.map((key) => {
    const current = value[key];
    if (Array.isArray(current)) return [key, current.map((item) => String(item).slice(0, 80)).slice(0, 20)];
    if (typeof current === "boolean") return [key, current];
    return [key, current ? String(current).slice(0, 80) : current];
  }));
}

function stripInternalBrandFromNormalizedProduct(item) {
  const {
    internalBrandId,
    internalBrandCode,
    internalBrandName,
    supplierName,
    brand,
    isCustomerBrandVisible,
    adminSearchableText,
    searchKeywords,
    ...safe
  } = item || {};
  return {
    ...safe,
    customerSearchableText: String(item?.customerSearchableText || "")
  };
}

function isLocalRequest(request) {
  const hostHeader = String(request.headers.host || "").split(":")[0].toLowerCase();
  const remoteAddress = String(request.socket?.remoteAddress || "").toLowerCase();
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostHeader)
    || remoteAddress === "127.0.0.1"
    || remoteAddress === "::1"
    || remoteAddress === "::ffff:127.0.0.1";
}

async function readApprovalRules() {
  if (!hasSupabaseConfig()) {
    return { ...cloneApprovalRules(defaultApprovalRules), source: "local-default" };
  }

  let rows = [];
  try {
    const query = new URLSearchParams({
      select: "id,business_types,business_items,updated_at",
      id: "eq.default"
    });
    rows = await requestSupabase(`/rest/v1/approval_settings?${query.toString()}`);
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "approval_settings")) throw error;
    return { ...cloneApprovalRules(defaultApprovalRules), source: "missing-default" };
  }
  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    businessTypes: Array.isArray(row?.business_types) && row.business_types.length
      ? row.business_types
      : defaultApprovalRules.businessTypes,
    businessItems: Array.isArray(row?.business_items) && row.business_items.length
      ? row.business_items
      : defaultApprovalRules.businessItems,
    updatedAt: row?.updated_at || "",
    source: row ? "supabase" : "empty-default"
  };
}

async function saveApprovalRules(payload) {
  const businessTypes = normalizeStringArray(payload?.businessTypes);
  const businessItems = normalizeStringArray(payload?.businessItems);

  if (hasSupabaseConfig()) {
    try {
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
    } catch (error) {
      if (!isMissingSupabaseTableError(error, "approval_settings")) throw error;
      return { businessTypes, businessItems, source: "missing" };
    }
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
    try {
      const account = await upsertCustomerAccountFromSignupRecord(record);
      if (account?.id) record.accountId = account.id;
      await requestSupabase("/rest/v1/signup_requests", {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify([mapSignupRequestToSupabase(record)])
      });
      await upsertBusinessProfileFromSignupRecord(record);
      await insertBusinessDocumentFromSignupRecord(record);
      await insertBusinessCardDocumentFromSignupRecord(record);
      if (record.accountId) {
        await updateCustomerAccountStatus(
          record.accountId,
          record.approvalStatus === "승인" ? "approved" : "business_verification_pending"
        );
      }
    } catch (error) {
      if (!isMissingSupabaseTableError(error, "signup_requests")) throw error;
    }
  }

  return {
    ok: true,
    approvalStatus: record.approvalStatus,
    businessNumber: record.businessNumber,
    companyName: record.companyName,
    user: createUserSessionFromSignupRecord(record)
  };
}

function createUserSessionFromSignupRecord(record) {
  const pricingApproved = record.approvalStatus === "승인";
  return {
    phone: record.phone,
    businessNumber: record.businessNumber,
    name: record.name,
    title: record.title,
    companyName: record.companyName,
    companyAddress: record.companyAddress,
    contactName: record.contactName || record.name,
    contactTitle: record.contactTitle || record.title,
    contactCompanyName: record.contactCompanyName || record.companyName,
    contactPhone: record.contactPhone || record.phone,
    contactEmail: record.contactEmail || record.socialEmail || "",
    contactAddress: record.contactAddress || record.companyAddress,
    businessCardFileName: record.businessCardFileName || "",
    contactInfo: {
      name: record.contactName || record.name,
      title: record.contactTitle || record.title,
      companyName: record.contactCompanyName || record.companyName,
      phone: record.contactPhone || record.phone,
      email: record.contactEmail || record.socialEmail || "",
      address: record.contactAddress || record.companyAddress,
      businessCardFileName: record.businessCardFileName || "",
      businessCardFileMime: record.businessCardFileMime || "",
      updatedAt: record.submittedAt || new Date().toISOString()
    },
    provider: record.provider || "일반 회원가입",
    approvalStatus: record.approvalStatus,
    pricingAccess: pricingApproved ? "approved" : "pending",
    memberGrade: record.memberGrade || "사업자",
    priceTier: record.priceTier || (pricingApproved ? "wholesale" : "retail"),
    memberToken: createMemberToken(record)
  };
}

async function loginWithSignupRequest(payload) {
  const businessNumber = String(payload?.businessNumber || "").trim();
  const password = String(payload?.password || "");

  if (!businessNumber || !password) {
    throw new Error("사업자등록번호와 비밀번호가 필요합니다.");
  }

  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 로그인 저장소가 설정되지 않았습니다.");
  }

  const record = await readSignupRequestByBusinessNumber(businessNumber);
  if (!record || record.password !== password) {
    throw new Error("사업자등록번호 또는 비밀번호가 일치하지 않습니다.");
  }

  return {
    ok: true,
    user: createUserSessionFromSignupRecord(record)
  };
}

async function loginWithSocialAuth(accessToken) {
  const profile = await readSocialAuthProfile(accessToken);
  const record = await readSignupRequestBySocialProfile(profile);
  if (!record) {
    throw createHttpError(404, "이 소셜 계정으로 가입된 사업자 회원이 없습니다. 먼저 사업자등록증을 등록해 회원가입을 완료해주세요.");
  }
  return {
    ok: true,
    user: createUserSessionFromSignupRecord({
      ...record,
      provider: record.provider || "소셜 가입"
    })
  };
}

async function readSignupRequestBySocialProfile(profile) {
  const provider = normalizeSocialProvider(profile?.provider || "");
  const providerId = String(profile?.providerId || "").trim();
  const email = normalizeEmail(profile?.email);

  if (providerId) {
    const query = new URLSearchParams({
      select: "*",
      social_provider: `eq.${provider}`,
      social_provider_id: `eq.${providerId}`,
      limit: "1"
    });
    let rows = [];
    try {
      rows = await requestSupabase(`/rest/v1/signup_requests?${query.toString()}`);
    } catch (error) {
      if (!isMissingSupabaseTableError(error, "signup_requests")) throw error;
      rows = [];
    }
    if (Array.isArray(rows) && rows.length) return enrichSignupRecordWithBusinessProfile(mapSupabaseSignupRequest(rows[0]));
  }

  if (!email) throw createHttpError(400, "소셜 계정 이메일을 확인하지 못했습니다.");
  const rows = await readAllSignupRequests();
  const matched = rows.find((record) => {
    const social = parseSocialProviderLabel(record.provider);
    return (record.socialEmail && record.socialProvider
      ? record.socialEmail === email && record.socialProvider === provider
      : social.email === email && social.provider === provider);
  }) || null;
  return enrichSignupRecordWithBusinessProfile(matched);
}

async function readSignupRequestByBusinessNumber(businessNumber) {
  const query = new URLSearchParams({
    select: "*",
    business_number: `eq.${businessNumber}`
  });
  let rows = [];
  try {
    rows = await requestSupabase(`/rest/v1/signup_requests?${query.toString()}`);
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "signup_requests")) throw error;
    return null;
  }
  return Array.isArray(rows) && rows.length ? enrichSignupRecordWithBusinessProfile(mapSupabaseSignupRequest(rows[0])) : null;
}

async function enrichSignupRecordWithBusinessProfile(record) {
  if (!record?.businessNumber || !hasSupabaseConfig()) return record || null;
  const query = new URLSearchParams({
    select: "business_number,phone,contact_name,title,company_name,company_address",
    business_number: `eq.${record.businessNumber}`,
    limit: "1"
  });
  try {
    const rows = await requestSupabase(`/rest/v1/business_profiles?${query.toString()}`);
    const profile = Array.isArray(rows) ? rows[0] : null;
    if (!profile) return record;
    return {
      ...record,
      contactName: String(profile.contact_name || record.contactName || record.name || "").trim(),
      contactTitle: String(profile.title || record.contactTitle || record.title || "").trim(),
      contactCompanyName: String(profile.company_name || record.contactCompanyName || record.companyName || "").trim(),
      contactPhone: String(profile.phone || record.contactPhone || record.phone || "").trim(),
      contactAddress: String(profile.company_address || record.contactAddress || record.companyAddress || "").trim()
    };
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "business_profiles")) console.warn("Business profile enrichment failed:", error.message);
    return record;
  }
}

async function readCartRecord(businessNumber) {
  const clean = String(businessNumber || "").trim();
  if (!clean) return { items: [] };
  if (!hasSupabaseConfig()) return { items: [] };

  const query = new URLSearchParams({
    select: "business_number,company_name,cart_data,updated_at",
    business_number: `eq.${clean}`
  });
  let rows = [];
  try {
    rows = await requestSupabase(`/rest/v1/carts?${query.toString()}`);
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "carts")) throw error;
    return { businessNumber: clean, items: [] };
  }
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
    try {
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
    } catch (error) {
      if (!isMissingSupabaseTableError(error, "carts")) throw error;
    }
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

async function readTile114SampleProducts(adminUsernameValue, adminTokenValue, category, limit) {
  assertAdminCredentials(adminUsernameValue, adminTokenValue);
  if (!tile114UserId || !tile114Password) {
    throw new Error("TILE114_USER_ID 또는 TILE114_PASSWORD가 .env에 설정되어 있지 않습니다.");
  }

  const safeCategory = normalizeTile114Category(category);
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const session = createTile114Session();

  await session.fetch("/Inc/LogInOut.asp", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({
      LogOut: "0",
      mb_id: tile114UserId,
      mb_password: tile114Password
    }).toString()
  });

  const listResponse = await session.fetch(`/Web/product.Asp?prd_Item=${encodeURIComponent(safeCategory)}&Page=0`);
  const listHtml = await listResponse.text();
  if (!/로그아웃|LogOutPut/i.test(listHtml)) {
    throw new Error("거래사이트 로그인 세션을 확인하지 못했습니다.");
  }

  const listItems = parseTile114ListProducts(listHtml).slice(0, safeLimit);
  const products = [];
  for (const item of listItems) {
    const detailResponse = await session.fetch(`/Web/productView.asp?ItemId=${encodeURIComponent(item.sourceId)}`);
    const detailHtml = await detailResponse.text();
    const product = {
      ...item,
      ...parseTile114ProductDetail(detailHtml),
      sourceUrl: session.absoluteUrl(`/Web/productView.asp?ItemId=${encodeURIComponent(item.sourceId)}`)
    };
    product.imageDataUrl = await readTile114ImageDataUrl(session, product.imageUrl || product.thumbnailUrl);
    products.push(product);
  }

  return {
    ok: true,
    source: "tile114",
    category: safeCategory,
    categoryName: TILE114_CATEGORIES[safeCategory] || safeCategory,
    count: products.length,
    products
  };
}

async function readTile114ImageDataUrl(session, imageUrl) {
  if (!imageUrl) return "";
  try {
    const response = await session.fetch(imageUrl);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) return "";
    return `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn("[tile114] image fetch failed", error.message);
    return "";
  }
}

const TILE114_CATEGORIES = {
  "1": "할인(타일)",
  "2": "할인(스톤)",
  "3": "T-중국바닥",
  "4": "T-중국벽",
  "5": "T-유럽바닥",
  "6": "T-유럽벽",
  "7": "T-아시아",
  "8": "S-트라버틴",
  "9": "S-복합대리",
  A: "S-고벽현무",
  B: "S-산호지메",
  C: "S-오로슬레",
  D: "S-기능성",
  E: "S-에코판재",
  F: "S-몰딩부조",
  G: "기타",
  H: "부자재",
  I: "REGNO"
};

function normalizeTile114Category(value) {
  const clean = String(value || "5").trim().toUpperCase();
  return TILE114_CATEGORIES[clean] ? clean : "5";
}

function createTile114Session() {
  const login = new URL(tile114LoginUrl || "https://vgtns.tile114.co.kr/Web/ExInDex.asp?PopTF=2");
  const origin = login.origin;
  const cookieJar = new Map();

  return {
    absoluteUrl(pathValue) {
      return new URL(pathValue, origin).toString();
    },
    async fetch(pathValue, options = {}) {
      const headers = new Headers(options.headers || {});
      const cookie = Array.from(cookieJar.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
      if (cookie) headers.set("Cookie", cookie);
      headers.set("User-Agent", "Mozilla/5.0 TileBathPlusImporter/1.0");
      const response = await fetch(new URL(pathValue, origin), { ...options, headers, redirect: "manual" });
      storeTile114Cookies(response.headers, cookieJar);
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        return await this.fetch(response.headers.get("location"), options);
      }
      if (!response.ok) throw new Error(`거래사이트 요청 실패: ${response.status}`);
      return response;
    }
  };
}

function storeTile114Cookies(headers, cookieJar) {
  const setCookies = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : splitSetCookieHeader(headers.get("set-cookie") || "");
  for (const cookieText of setCookies) {
    const firstPart = String(cookieText || "").split(";")[0];
    const separatorIndex = firstPart.indexOf("=");
    if (separatorIndex <= 0) continue;
    cookieJar.set(firstPart.slice(0, separatorIndex).trim(), firstPart.slice(separatorIndex + 1).trim());
  }
}

function splitSetCookieHeader(value) {
  if (!value) return [];
  return String(value).split(/,(?=\s*[^;,=]+=[^;,]+)/g);
}

function parseTile114ListProducts(html) {
  const products = [];
  const regex = /<li\b[^>]*class=["'][^"']*prd_thumb[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = regex.exec(html))) {
    const block = match[1];
    const id = findFirst(block, /DetailListView\((\d+)\)/i) || findFirst(block, /<span class=["']blind["']>(\d+)<\/span>/i);
    if (!id) continue;
    const name = cleanHtml(findFirst(block, /<span class=["']prd_name["']>([\s\S]*?)<\/span>/i) || findFirst(block, /alt=["']([^"']+)["']/i));
    const size = cleanHtml(findFirst(block, /<span class=["']prd_size["']>([\s\S]*?)<\/span>/i));
    const imagePath = findFirst(block, /<img\b[^>]*src=["']([^"']+)["']/i);
    products.push({
      sourceId: id,
      name,
      size,
      thumbnailUrl: absolutizeTile114Url(imagePath)
    });
  }
  return products;
}

function parseTile114ProductDetail(html) {
  const detail = {};
  const rowRegex = /<tr>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)(?:<\/td>|<\/tr>)/gi;
  let match;
  while ((match = rowRegex.exec(html))) {
    const key = cleanHtml(match[1]).replace(/\s+/g, "");
    const value = cleanHtml(match[2]);
    if (!key) continue;
    if (key.includes("종류")) detail.categoryName = value;
    else if (key.includes("품명")) detail.name = value;
    else if (key.includes("규격")) detail.size = value;
    else if (key.includes("제조사")) detail.maker = value;
    else if (key.includes("단위")) detail.unit = value;
    else if (key.includes("메모")) detail.memo = value;
    else if (key.includes("도매가")) {
      detail.wholesalePriceText = value;
      detail.wholesalePrice = Number(value.replace(/[^\d]/g, "")) || 0;
    } else if (key.includes("재고량")) {
      detail.stockText = value;
    }
  }
  const imagePath = findFirst(html, /<figure[^>]*>[\s\S]*?<img\b[^>]*src=["']([^"']+)["']/i)
    || findFirst(html, /<div class=["']prd_view_img["'][^>]*>[\s\S]*?<img\b[^>]*src=["']([^"']+)["']/i);
  detail.imageUrl = absolutizeTile114Url(imagePath);
  return detail;
}

function findFirst(text, regex) {
  const match = regex.exec(String(text || ""));
  return match ? match[1] : "";
}

function cleanHtml(value) {
  return decodeHtmlEntities(String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function decodeHtmlEntities(value) {
  const entities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " "
  };
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const lower = entity.toLowerCase();
    if (lower[0] === "#") {
      const code = lower[1] === "x" ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return entities[lower] || "";
  });
}

function absolutizeTile114Url(value) {
  if (!value) return "";
  const login = new URL(tile114LoginUrl || "https://vgtns.tile114.co.kr/Web/ExInDex.asp?PopTF=2");
  return new URL(value, `${login.origin}/Web/`).toString();
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
  let rows = [];
  try {
    rows = await requestSupabase(`/rest/v1/signup_requests?${query.toString()}`);
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "signup_requests")) throw error;
    return [];
  }
  return Array.isArray(rows) ? rows.map(mapSupabaseSignupRequest) : [];
}

async function readAllCartRecords() {
  const query = new URLSearchParams({
    select: "business_number,company_name,cart_data,updated_at",
    order: "updated_at.desc"
  });
  let rows = [];
  try {
    rows = await requestSupabase(`/rest/v1/carts?${query.toString()}`);
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "carts")) throw error;
    return [];
  }
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
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const timeoutMs = Number(options.timeoutMs ?? supabaseRequestTimeoutMs);
  const controller = timeoutMs > 0 ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  let response;

  try {
    response = await fetch(`${supabaseUrl}${pathname}`, {
      method: options.method || "GET",
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      body: options.body,
      signal: controller?.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Supabase 요청 시간 초과 (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase 요청 오류 (${response.status}): ${text}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
}

async function requestSupabaseStorage(pathname, options = {}) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const response = await fetch(`${supabaseUrl}${pathname}`, {
    method: options.method || "GET",
    headers: {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
      ...(options.headers || {})
    },
    body: options.body
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let payload = text;
  if (contentType.includes("application/json") && text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    const error = new Error(`Supabase Storage 요청 오류 (${response.status}): ${message}`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload || null;
}

function isMissingSupabaseTableError(error, tableName) {
  const message = String(error?.message || "");
  return message.includes("PGRST205")
    && message.includes("Could not find the table")
    && message.includes(`'public.${tableName}'`);
}

function isSupabaseConstraintError(error, constraintName) {
  const message = String(error?.message || "");
  return message.includes(`"${constraintName}"`) || message.includes(constraintName);
}

function normalizeSocialProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (provider === "google") return "google";
  if (provider === "kakao" || provider === "kakaotalk" || provider === "카카오" || provider === "카카오톡") return "kakao";
  throw createHttpError(400, "지원하지 않는 소셜 가입 방식입니다.");
}

function normalizeSocialProviderOptional(value) {
  const provider = String(value || "").trim();
  if (!provider) return "";
  return normalizeSocialProvider(provider);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function formatSocialProviderLabel(providerValue, emailValue) {
  const provider = normalizeSocialProvider(providerValue);
  const label = provider === "kakao" ? "카카오톡 가입" : "Google 가입";
  const email = normalizeEmail(emailValue);
  return email ? `${label} <${email}>` : label;
}

function parseSocialProviderLabel(value) {
  const text = String(value || "").trim();
  const email = normalizeEmail((text.match(/<([^>]+)>/) || [])[1] || "");
  let provider = "";
  try {
    if (/google/i.test(text)) provider = normalizeSocialProvider("google");
    else if (/kakao|카카오/i.test(text)) provider = normalizeSocialProvider("kakao");
  } catch {
    provider = "";
  }
  return { provider, email };
}

function normalizeSignupProvider(payload) {
  const socialEmail = normalizeEmail(payload?.socialEmail);
  const socialProvider = String(payload?.socialProvider || "").trim();
  if (socialEmail && socialProvider) return formatSocialProviderLabel(socialProvider, socialEmail);
  return String(payload?.provider || "일반 회원가입").trim();
}

function getRequestOrigin(request) {
  if (publicSiteUrl) {
    if (/^https?:\/\//i.test(publicSiteUrl)) return publicSiteUrl;
    return `https://${publicSiteUrl}`;
  }
  const proto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
  const hostHeader = String(request.headers["x-forwarded-host"] || request.headers.host || "").split(",")[0].trim();
  const safeProto = proto === "http" && !/^localhost(?::|$)|^127\.0\.0\.1(?::|$)/.test(hostHeader)
    ? "https"
    : proto;
  return `${safeProto}://${hostHeader}`;
}

function buildSocialAuthStartUrl(providerValue, modeValue, request) {
  if (!supabaseUrl) throw createHttpError(500, "Supabase URL이 설정되어 있지 않습니다.");
  const provider = normalizeSocialProvider(providerValue);
  const mode = String(modeValue || "signup").trim() === "login" ? "login" : "signup";
  const redirectTo = new URL(getRequestOrigin(request));
  redirectTo.searchParams.set("socialProvider", provider);
  redirectTo.searchParams.set("socialMode", mode);

  const authUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authUrl.searchParams.set("provider", provider);
  authUrl.searchParams.set("redirect_to", redirectTo.toString());
  return authUrl.toString();
}

async function readSocialAuthProfile(accessToken) {
  const cleanToken = String(accessToken || "").trim();
  if (!cleanToken) throw createHttpError(400, "소셜 로그인 토큰을 확인하지 못했습니다.");
  if (!supabaseUrl) throw createHttpError(500, "Supabase URL이 설정되어 있지 않습니다.");

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${cleanToken}`
    }
  });
  if (!response.ok) throw createHttpError(401, "소셜 로그인 정보를 확인하지 못했습니다.");
  const user = await response.json();
  const provider = String(user.app_metadata?.provider || "").trim();
  const providerId = String(
    user.user_metadata?.provider_id
    || user.user_metadata?.sub
    || user.identities?.[0]?.id
    || user.id
    || ""
  ).trim();
  const profile = {
    ok: true,
    accountId: "",
    authUserId: String(user.id || "").trim(),
    email: String(user.email || "").trim(),
    name: String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "").trim(),
    avatarUrl: String(user.user_metadata?.avatar_url || user.user_metadata?.picture || "").trim(),
    provider,
    providerId
  };
  const account = await upsertCustomerAccountFromSocialProfile(profile);
  profile.accountId = account?.id || "";
  return profile;
}

async function upsertCustomerAccountFromSocialProfile(profile) {
  if (!hasSupabaseConfig()) return null;
  const provider = normalizeSocialProvider(profile?.provider || "");
  const providerId = String(profile?.providerId || profile?.authUserId || "").trim();
  if (!providerId) return null;

  const payload = {
    auth_user_id: profile?.authUserId || null,
    social_provider: provider,
    social_provider_id: providerId,
    email: normalizeEmail(profile?.email),
    display_name: String(profile?.name || "").trim(),
    avatar_url: String(profile?.avatarUrl || "").trim(),
    last_login_at: new Date().toISOString()
  };

  try {
    const rows = await requestSupabase("/rest/v1/customer_accounts?on_conflict=social_provider,social_provider_id", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([payload])
    });
    return Array.isArray(rows) ? rows[0] : null;
  } catch (error) {
    if (isSupabaseConstraintError(error, "customer_accounts_provider_email_unique") && payload.email) {
      const existing = await readCustomerAccountByProviderEmail(provider, payload.email);
      if (existing?.id) {
        return updateCustomerAccount(existing.id, payload);
      }
    }
    if (!isMissingSupabaseTableError(error, "customer_accounts")) throw error;
    return null;
  }
}

async function readCustomerAccountByProviderEmail(provider, email) {
  const query = new URLSearchParams({
    select: "*",
    social_provider: `eq.${provider}`,
    email: `eq.${email}`,
    limit: "1"
  });
  try {
    const rows = await requestSupabase(`/rest/v1/customer_accounts?${query.toString()}`);
    return Array.isArray(rows) ? rows[0] : null;
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "customer_accounts")) throw error;
    return null;
  }
}

async function updateCustomerAccount(accountId, payload) {
  const rows = await requestSupabase(`/rest/v1/customer_accounts?id=eq.${encodeURIComponent(accountId)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });
  return Array.isArray(rows) ? rows[0] : null;
}

async function updateCustomerAccountStatus(accountId, accountStatus) {
  if (!hasSupabaseConfig() || !accountId || !accountStatus) return;
  try {
    await requestSupabase(`/rest/v1/customer_accounts?id=eq.${encodeURIComponent(accountId)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ account_status: accountStatus })
    });
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "customer_accounts")) throw error;
  }
}

async function upsertCustomerAccountFromSignupRecord(record) {
  if (!record?.socialProvider && !record?.socialProviderId) return null;
  return upsertCustomerAccountFromSocialProfile({
    accountId: record.accountId,
    authUserId: "",
    provider: record.socialProvider,
    providerId: record.socialProviderId,
    email: record.socialEmail,
    name: record.socialName || record.name,
    avatarUrl: record.socialAvatarUrl
  });
}

async function upsertBusinessProfileFromSignupRecord(record) {
  if (!hasSupabaseConfig() || !record?.businessNumber) return null;
  const isApproved = record.approvalStatus === "승인";
  const payload = {
    account_id: record.accountId || null,
    business_number: record.businessNumber,
    phone: record.contactPhone || record.phone,
    contact_name: record.contactName || record.name,
    title: record.contactTitle || record.title,
    company_name: record.contactCompanyName || record.companyName,
    company_address: record.contactAddress || record.companyAddress,
    representative: record.representative,
    opening_date: record.openingDate || null,
    business_type: record.businessType,
    business_item: record.businessItem,
    business_category_section: record.businessCategorySection,
    verification_status: isApproved ? "approved" : "pending",
    member_grade: record.memberGrade || "사업자",
    price_tier: record.priceTier || (isApproved ? "wholesale" : "retail"),
    pricing_access: isApproved ? "approved" : "pending",
    approved_at: isApproved ? new Date().toISOString() : null
  };
  try {
    const rows = await requestSupabase("/rest/v1/business_profiles?on_conflict=business_number", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([payload])
    });
    return Array.isArray(rows) ? rows[0] : null;
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "business_profiles")) throw error;
    return null;
  }
}

async function insertBusinessDocumentFromSignupRecord(record) {
  if (!hasSupabaseConfig() || !record?.businessNumber || !record?.businessFileName) return null;
  const uploadedFile = await uploadBusinessDocumentFile(record.businessFileDataUrl, record.businessFileName);
  const payload = {
    account_id: record.accountId || null,
    business_number: record.businessNumber,
    file_name: record.businessFileName,
    file_url: uploadedFile?.fileUrl || "",
    mime_type: uploadedFile?.mimeType || record.businessFileMime || "",
    review_status: record.approvalStatus === "승인" ? "approved" : "pending",
    ocr_result: {
      documentType: "business_registration",
      companyName: record.extractedCompanyName,
      businessAddress: record.extractedBusinessAddress,
      representative: record.representative,
      openingDate: record.openingDate,
      businessType: record.businessType,
      businessItem: record.businessItem,
      businessCategorySection: record.businessCategorySection
    }
  };
  try {
    const rows = await requestSupabase("/rest/v1/business_documents", {
      method: "POST",
      headers: {
        Prefer: "return=representation"
      },
      body: JSON.stringify([payload])
    });
    return Array.isArray(rows) ? rows[0] : null;
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "business_documents")) throw error;
    return null;
  }
}

async function insertBusinessCardDocumentFromSignupRecord(record) {
  if (!hasSupabaseConfig() || !record?.businessNumber || !record?.businessCardFileName) return null;
  const uploadedFile = await uploadBusinessDocumentFile(record.businessCardFileDataUrl, record.businessCardFileName);
  const payload = {
    account_id: record.accountId || null,
    business_number: record.businessNumber,
    file_name: record.businessCardFileName,
    file_url: uploadedFile?.fileUrl || "",
    mime_type: uploadedFile?.mimeType || record.businessCardFileMime || "",
    review_status: "pending",
    ocr_result: {
      documentType: "business_card",
      contactName: record.contactName || record.name,
      title: record.contactTitle || record.title,
      companyName: record.contactCompanyName || record.companyName,
      phone: record.contactPhone || record.phone,
      email: record.contactEmail || record.socialEmail,
      address: record.contactAddress || record.companyAddress
    }
  };
  try {
    const rows = await requestSupabase("/rest/v1/business_documents", {
      method: "POST",
      headers: {
        Prefer: "return=representation"
      },
      body: JSON.stringify([payload])
    });
    return Array.isArray(rows) ? rows[0] : null;
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "business_documents")) throw error;
    return null;
  }
}

async function uploadBusinessDocumentFile(dataUrl, fileName) {
  const parsed = parseBusinessDocumentDataUrl(dataUrl);
  if (!parsed) return null;
  await ensureBusinessDocumentBucket();
  const originalName = fileName || "business-document";
  const safeName = sanitizeStorageFileName(originalName);
  const objectPath = [
    "signup-documents",
    `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName}`
  ].join("/");

  await requestSupabaseStorage(`/storage/v1/object/${encodeURIComponent(businessDocumentBucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: {
      "Content-Type": parsed.mimeType,
      "x-upsert": "true"
    },
    body: parsed.buffer
  });

  return {
    fileUrl: `supabase://${businessDocumentBucket}/${objectPath}`,
    mimeType: parsed.mimeType
  };
}

async function ensureBusinessDocumentBucket() {
  if (businessDocumentBucketReady || !businessDocumentBucket) return;
  try {
    await requestSupabaseStorage(`/storage/v1/bucket/${encodeURIComponent(businessDocumentBucket)}`);
    businessDocumentBucketReady = true;
    return;
  } catch (error) {
    const storageStatus = Number(error?.payload?.statusCode || error?.statusCode || 0);
    if (storageStatus !== 404) throw error;
  }

  try {
    await requestSupabaseStorage("/storage/v1/bucket", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: businessDocumentBucket,
        name: businessDocumentBucket,
        public: false,
        file_size_limit: 15728640,
        allowed_mime_types: ["application/pdf", "image/png", "image/jpeg", "image/webp"]
      })
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (!/already|exists|duplicate/i.test(message)) throw error;
  }
  businessDocumentBucketReady = true;
}

function parseBusinessDocumentDataUrl(dataUrl) {
  const source = String(dataUrl || "").trim();
  if (!source) return null;
  const match = source.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;
  const mimeType = String(match[1] || "application/octet-stream").trim().toLowerCase();
  const isBase64 = Boolean(match[2]);
  const data = match[3] || "";
  const buffer = isBase64
    ? Buffer.from(data, "base64")
    : Buffer.from(decodeURIComponent(data), "utf8");
  if (!buffer.length) return null;
  if (buffer.length > 15 * 1024 * 1024) {
    throw createHttpError(413, "사업자등록증 파일은 15MB 이하만 업로드할 수 있습니다.");
  }
  if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    throw createHttpError(400, "사업자등록증은 PDF, PNG, JPG, WEBP 파일만 업로드할 수 있습니다.");
  }
  return { buffer, mimeType };
}

function sanitizeStorageFileName(value) {
  const name = String(value || "file")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return name || "file";
}

function normalizeStringArray(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function cloneApprovalRules(rules) {
  return {
    businessTypes: normalizeStringArray(rules?.businessTypes),
    businessItems: normalizeStringArray(rules?.businessItems)
  };
}

function normalizeSignupRequest(payload) {
  return {
    accountId: String(payload?.accountId || "").trim(),
    phone: String(payload?.phone || "").trim(),
    businessNumber: String(payload?.businessNumber || "").trim(),
    name: String(payload?.name || "").trim(),
    title: String(payload?.title || "").trim(),
    companyName: String(payload?.companyName || "").trim(),
    companyAddress: String(payload?.companyAddress || "").trim(),
    contactName: String(payload?.contactName || payload?.contactInfo?.name || "").trim(),
    contactTitle: String(payload?.contactTitle || payload?.contactInfo?.title || "").trim(),
    contactCompanyName: String(payload?.contactCompanyName || payload?.contactInfo?.companyName || "").trim(),
    contactPhone: String(payload?.contactPhone || payload?.contactInfo?.phone || "").trim(),
    contactEmail: normalizeEmail(payload?.contactEmail || payload?.contactInfo?.email),
    contactAddress: String(payload?.contactAddress || payload?.contactInfo?.address || "").trim(),
    password: String(payload?.password || ""),
    provider: normalizeSignupProvider(payload),
    socialProvider: normalizeSocialProviderOptional(payload?.socialProvider),
    socialEmail: normalizeEmail(payload?.socialEmail),
    socialProviderId: String(payload?.socialProviderId || "").trim(),
    socialName: String(payload?.socialName || "").trim(),
    socialAvatarUrl: String(payload?.socialAvatarUrl || "").trim(),
    extractedCompanyName: String(payload?.extractedCompanyName || "").trim(),
    extractedBusinessAddress: String(payload?.extractedBusinessAddress || "").trim(),
    representative: String(payload?.representative || "").trim(),
    openingDate: String(payload?.openingDate || "").trim(),
    businessType: String(payload?.businessType || "").trim(),
    businessItem: String(payload?.businessItem || "").trim(),
    businessCategorySection: String(payload?.businessCategorySection || "").trim(),
    approvalStatus: normalizeApprovalStatus(payload?.approvalStatus),
    memberGrade: String(payload?.memberGrade || "사업자").trim(),
    priceTier: normalizeMemberPriceTier(payload?.priceTier || "wholesale"),
    businessFileName: String(payload?.businessFileName || "").trim(),
    businessFileMime: String(payload?.businessFileMime || "").trim(),
    businessFileDataUrl: String(payload?.businessFileDataUrl || "").trim(),
    businessCardFileName: String(payload?.businessCardFileName || "").trim(),
    businessCardFileMime: String(payload?.businessCardFileMime || "").trim(),
    businessCardFileDataUrl: String(payload?.businessCardFileDataUrl || "").trim(),
    submittedAt: String(payload?.submittedAt || new Date().toISOString()).trim()
  };
}

function mapSignupRequestToSupabase(record) {
  return {
    account_id: record.accountId || null,
    phone: record.phone,
    business_number: record.businessNumber,
    name: record.name,
    title: record.title,
    company_name: record.companyName,
    company_address: record.companyAddress,
    password: record.password,
    provider: record.provider,
    social_provider: record.socialProvider,
    social_email: record.socialEmail,
    social_provider_id: record.socialProviderId,
    social_name: record.socialName,
    social_avatar_url: record.socialAvatarUrl,
    extracted_company_name: record.extractedCompanyName,
    extracted_business_address: record.extractedBusinessAddress,
    representative: record.representative,
    opening_date: record.openingDate || null,
    business_type: record.businessType,
    business_item: record.businessItem,
    business_category_section: record.businessCategorySection,
    approval_status: record.approvalStatus,
    member_grade: record.memberGrade,
    price_tier: record.priceTier,
    business_file_name: record.businessFileName,
    submitted_at: record.submittedAt || new Date().toISOString()
  };
}

function mapSupabaseSignupRequest(row) {
  return {
    accountId: String(row.account_id || "").trim(),
    phone: String(row.phone || "").trim(),
    businessNumber: String(row.business_number || "").trim(),
    name: String(row.name || "").trim(),
    title: String(row.title || "").trim(),
    companyName: String(row.company_name || "").trim(),
    companyAddress: String(row.company_address || "").trim(),
    password: String(row.password || ""),
    provider: String(row.provider || "일반 회원가입").trim(),
    socialProvider: normalizeSocialProviderOptional(row.social_provider),
    socialEmail: normalizeEmail(row.social_email),
    socialProviderId: String(row.social_provider_id || "").trim(),
    socialName: String(row.social_name || "").trim(),
    socialAvatarUrl: String(row.social_avatar_url || "").trim(),
    extractedCompanyName: String(row.extracted_company_name || "").trim(),
    extractedBusinessAddress: String(row.extracted_business_address || "").trim(),
    representative: String(row.representative || "").trim(),
    openingDate: String(row.opening_date || "").trim(),
    businessType: String(row.business_type || "").trim(),
    businessItem: String(row.business_item || "").trim(),
    businessCategorySection: String(row.business_category_section || "").trim(),
    approvalStatus: normalizeApprovalStatus(row.approval_status),
    memberGrade: String(row.member_grade || "사업자").trim(),
    priceTier: normalizeMemberPriceTier(row.price_tier || "wholesale"),
    businessFileName: String(row.business_file_name || "").trim(),
    submittedAt: String(row.submitted_at || "").trim()
  };
}

function normalizeApprovalStatus(value) {
  const status = String(value || "").trim();
  if (status === "승인" || status === "가입승인" || status.toLowerCase() === "approved") return "승인";
  if (status === "보류" || status === "가입보류" || status.toLowerCase() === "pending") return "보류";
  return "보류";
}

function normalizeMemberPriceTier(value) {
  const tier = String(value || "").trim().toLowerCase();
  if (["wholesale", "dealer", "partner", "business", "도매", "사업자"].includes(tier)) return "wholesale";
  return "retail";
}

function createMemberToken(record) {
  const payload = {
    businessNumber: String(record?.businessNumber || "").trim(),
    approvalStatus: normalizeApprovalStatus(record?.approvalStatus),
    issuedAt: Date.now()
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", memberTokenSecret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyMemberToken(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", memberTokenSecret).update(encoded).digest("base64url");
  if (!safeEqualText(signature, expected)) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function verifyMemberProductAccess(businessNumber, memberToken) {
  const cleanBusinessNumber = String(businessNumber || "").trim();
  const tokenPayload = verifyMemberToken(memberToken);
  if (!cleanBusinessNumber || !tokenPayload || tokenPayload.businessNumber !== cleanBusinessNumber) {
    throw createHttpError(403, "사업자등록증 승인 회원만 등급별 가격을 볼 수 있습니다.");
  }

  const record = await readSignupRequestByBusinessNumber(cleanBusinessNumber);
  if (!record || record.approvalStatus !== "승인") {
    throw createHttpError(403, "사업자등록증 승인 후 등급별 가격을 볼 수 있습니다.");
  }

  return {
    businessNumber: record.businessNumber,
    companyName: record.companyName,
    approvalStatus: record.approvalStatus,
    memberGrade: record.memberGrade || "사업자",
    priceTier: record.priceTier || "wholesale",
    pricingAccess: "approved"
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
    throw new Error("사업자등록번호 10자리가 필요합니다.");
  }

  const serviceKey = process.env.DATA_GO_KR_API_KEY || process.env.NTS_STATUS_API_KEY || process.env.SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("국세청 사업자 상태조회 API 키가 설정되지 않았습니다. .env에 DATA_GO_KR_API_KEY를 추가해주세요.");
  }

  const url = new URL("https://api.odcloud.kr/api/nts-businessman/v1/status");
  url.searchParams.set("serviceKey", serviceKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ b_no: [cleanNumber] })
  });

  if (!response.ok) {
    throw new Error(`사업자 상태조회 응답 오류 (${response.status})`);
  }

  const payload = await response.json();
  const item = Array.isArray(payload.data) ? payload.data[0] : null;
  if (!item) {
    throw new Error("사업자 상태조회 결과를 확인할 수 없습니다.");
  }

  const businessStatus = String(item.b_stt || "").trim();
  const taxType = String(item.tax_type || "").trim();
  const statusCode = String(item.b_stt_cd || "").trim();
  const taxTypeCode = String(item.tax_type_cd || "").trim();
  const combinedStatus = `${businessStatus} ${taxType}`.trim();
  const invalidReason = /국세청에 등록되지 않은|등록되지 않은|폐업|휴업|말소|없습니다/.test(combinedStatus);
  const valid = (statusCode === "01" || /계속/.test(businessStatus)) && !invalidReason;
  return {
    valid,
    businessNumber: cleanNumber,
    status: businessStatus,
    statusCode,
    taxType,
    taxTypeCode,
    message: valid
      ? `정상 사업자로 확인되었습니다. ${businessStatus || taxType}`.trim()
      : `사업자 상태를 확인해주세요. ${businessStatus || taxType || "국세청에서 정상 사업자로 확인되지 않았습니다."}`.trim()
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
  const guideImageDataUrl = String(payload.guideImageDataUrl || "").trim();
  const pointMemo = String(payload.pointMemo || "").trim();
  const surfaces = Array.isArray(payload.surfaces) ? payload.surfaces : [];
  const roomContext = payload.roomContext && typeof payload.roomContext === "object" ? payload.roomContext : null;

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

  const hasGuideImage = guideImageDataUrl.startsWith("data:");
  const referenceStartNumber = hasGuideImage ? 3 : 2;
  const guideInstruction = hasGuideImage
    ? "Use the second image as a user-marked surface guide. Green marked area means floor tile target. Blue marked area means wall tile target. The marks are only guidance and must not appear in the final result."
    : "";
  const referenceInstructions = normalizedSurfaces.map((entry, index) => {
    const referenceNumber = referenceStartNumber + index;
    const surfaceInstruction = entry.surface === "wall"
      ? "Apply this tile only to the wall surfaces."
      : entry.surface === "point"
        ? `Apply this tile only to the ${pointMemo || "shower booth back wall"}.`
        : "Apply this tile only to the floor surfaces.";
    const sizeInstruction = buildRenderSizeInstruction(entry.tileSize, entry.surface);

    return `Reference image ${referenceNumber} is the exact installed ${entry.surface} tile material. ${surfaceInstruction} Use this reference as the authoritative material source, not as loose inspiration. Prioritize the tile's visible design identity above all else: match the tone variation, veining flow, stone character, pattern rhythm, print character, surface texture depth, micro-contrast, edge rhythm, finish${entry.tileFinish ? ` (${entry.tileFinish})` : ""}, and module size${entry.tileSize ? ` (${entry.tileSize})` : ""} as closely as possible. The tile pattern and texture are critical and must stay recognizable in the final image. Do not invent a different tile look, do not simplify or blur the pattern, and do not replace it with a generic stone or generic ceramic texture. ${sizeInstruction}`;
  }).join(" ");
  const roomContextInstruction = buildRenderRoomContextInstruction(roomContext);

  const prompt = [
    "Create a photorealistic real-world site photo edit, not a CGI render.",
    "Use the first image as the original site photo.",
    guideInstruction,
    roomContextInstruction,
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
  if (hasGuideImage) {
    form.append("image[]", dataUrlToBlob(guideImageDataUrl), "surface-guide.png");
  }
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

async function findSimilarTilesByImage(payload) {
  if (!openAiApiKey) {
    throw new Error("OPENAI_API_KEY가 설정되어 있어야 사진으로 타일을 찾을 수 있습니다.");
  }

  const imageDataUrl = String(payload?.imageDataUrl || "").trim();
  const requestedSize = normalizeTileSize(String(payload?.size || "").trim());
  const requestedFinish = String(payload?.finish || "").trim();
  const searchMode = String(payload?.searchMode || "").trim() === "global" ? "global" : "strict";
  const allSimilar = payload?.allSimilar !== false;
  const limit = allSimilar
    ? Number.MAX_SAFE_INTEGER
    : Math.min(Math.max(Number(payload?.limit) || 12, 4), 60);
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl)) {
    throw new Error("타일 사진을 다시 업로드해주세요.");
  }

  const analysis = {
    ...(await analyzeTileImage(imageDataUrl)),
    requestedSize,
    requestedFinish,
    searchMode
  };
  const baseProducts = (await readProducts()).filter((product) => (
    isTileFinderTileCandidate(product)
    && product.image
    && (searchMode === "global" || productMatchesTileFinderBase(product, analysis))
  ));
  let products = baseProducts.filter((product) => Number(product.stockQty || 0) > 0);
  const usedStockFallback = !products.length && baseProducts.length > 0;
  if (usedStockFallback) {
    products = baseProducts;
    analysis.stockFallback = true;
  }
  const scoredMatches = products
    .map((product) => scoreTileProduct(product, analysis))
    .filter((entry) => entry.score > 0);
  let rankedMatches = scoredMatches.length ? scoredMatches : products.map((product) => ({
    product,
    score: 1,
    reasons: [searchMode === "global" ? "전체 DB 후보" : "사이즈/표면 조건 후보"]
  }));
  if (usedStockFallback) {
    rankedMatches = rankedMatches.map((entry) => ({
      ...entry,
      reasons: [...new Set([...(entry.reasons || []), "재고 확인 필요"])]
    }));
  }
  if (searchMode !== "global") {
    rankedMatches = selectTextColorStrictMatches(rankedMatches, analysis);
  }
  const matches = rankedMatches
    .sort((left, right) => right.score - left.score || String(left.product.name || "").localeCompare(String(right.product.name || ""), "ko"))
    .slice(0, limit)
    .map((entry) => ({
      ...mapPublicProduct(entry.product),
      matchScore: Math.min(99, Math.max(1, Math.round(entry.score))),
      matchReasons: entry.reasons.slice(0, 4)
    }));

  return {
    ok: true,
    analysis,
    matches
  };
}

async function analyzeTileImage(imageDataUrl) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openAiVisionModel,
      temperature: 0.1,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You analyze tile photos for product matching. Return compact JSON only. Do not guess brand or price."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Analyze this tile image for catalog search.",
                "Return JSON with keys:",
                "colors: Korean color words array,",
                "patterns: Korean pattern category words array, use only these when possible: 스톤, 마블, 시멘트, 솔리드, 테라조, 우드, 패턴,",
                "motifs: Korean visible motif words array such as 꽃, 선형, 구름결, 베인, 입자, 점박이, 나뭇결, 기하학,",
                "keywords: short search tokens for color and pattern only,",
                "summary: one Korean sentence."
              ].join(" ")
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
                detail: "low"
              }
            }
          ]
        }
      ]
    })
  });

  const text = await response.text();
  let result = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = null;
  }
  if (!response.ok) {
    throw new Error(result?.error?.message || "타일 이미지 분석에 실패했습니다.");
  }

  const content = result?.choices?.[0]?.message?.content || "{}";
  let analysis = {};
  try {
    analysis = JSON.parse(content);
  } catch {
    analysis = {};
  }

  return normalizeTileAnalysis(analysis);
}

function normalizeTileAnalysis(analysis) {
  const colors = normalizeKeywordList(analysis.colors);
  const patterns = normalizeKeywordList(analysis.patterns);
  const motifs = normalizeKeywordList(analysis.motifs);
  const keywords = normalizeKeywordList(analysis.keywords);
  const material = normalizeOptionalAnalysisText(analysis.material);
  const surface = normalizeOptionalAnalysisText(analysis.surface);
  const patternScale = String(analysis.patternScale || "").trim();
  const patternFlow = String(analysis.patternFlow || "").trim();
  const contrast = String(analysis.contrast || "").trim();

  return {
    colors,
    patterns,
    motifs,
    material,
    surface,
    patternScale,
    patternFlow,
    contrast,
    keywords: normalizeKeywordList([...colors, ...patterns, ...motifs, ...keywords, ...expandTileMatchKeywords([...colors, ...patterns, ...motifs, ...keywords])]),
    summary: String(analysis.summary || "").trim()
  };
}

function normalizeOptionalAnalysisText(value) {
  const text = String(value || "").trim();
  if (!text || /^(없음|알수없음|알 수 없음|unknown|none|null|n\/a)$/i.test(text)) return "";
  return text;
}

function normalizeKeywordList(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[,/·\s]+/);
  return [...new Set(list.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 20);
}

function expandTileMatchKeywords(keywords) {
  const source = keywords.map((keyword) => String(keyword || "").toLowerCase()).join(" ");
  const expanded = [];
  const groups = [
    [/화이트|흰|white|ivory|아이보리|cream|크림/, ["화이트", "아이보리", "WHT", "IVR", "크림"]],
    [/베이지|beige|샌드|sand|크림/, ["베이지", "BEG", "크림"]],
    [/그레이|회색|grey|gray|실버|silver/, ["그레이", "GRY", "GREY", "GRAY", "실버"]],
    [/블루|파랑|청색|blue|navy|네이비/, ["블루", "파랑", "BLUE", "BLU", "네이비", "NAVY"]],
    [/그린|초록|녹색|green|olive|올리브/, ["그린", "초록", "GREEN", "GRN", "올리브"]],
    [/옐로우|노랑|황색|yellow|gold|골드/, ["옐로우", "노랑", "YELLOW", "YLW", "골드"]],
    [/레드|빨강|적색|red|버건디|burgundy/, ["레드", "빨강", "RED", "버건디"]],
    [/핑크|분홍|pink|rose|로즈/, ["핑크", "분홍", "PINK", "로즈"]],
    [/다크|먹색|차콜|charcoal|dark/, ["다크", "DGY", "차콜", "먹색"]],
    [/블랙|검정|black|nero|네로/, ["블랙", "BLK", "네로", "NERO"]],
    [/브라운|갈색|brown|초코|choco/, ["브라운", "BRN", "초코"]],
    [/마블|대리석|marble|calacatta|카라라|carrara|비앙코/, ["마블", "MAR", "대리석", "카라라", "비앙코"]],
    [/스톤|석재|stone|라임|limestone|트라버틴|travertine/, ["스톤", "STN", "석재", "트라버틴"]],
    [/테라조|terrazzo/, ["테라조", "TRZ"]],
    [/콘크리트|시멘트|cement|concrete/, ["콘크리트", "CON", "시멘트", "CEM"]],
    [/우드|목재|wood/, ["우드", "WOD"]],
    [/패턴|pattern|art|장식|데코/, ["패턴", "PTN", "ART", "데코"]],
    [/꽃|플라워|flower|floral/, ["꽃", "플라워", "FLOWER", "FLORAL", "ART", "패턴"]],
    [/선형|라인|줄무늬|stripe|linear|line/, ["라인", "선형", "STRIPE", "LINE", "패턴"]],
    [/입자|점박이|칩|chip|speckle|grain|그레인/, ["입자", "점박이", "칩", "SPECKLE", "GRAIN", "테라조"]],
    [/베인|결|vein|veining|구름결|흐름/, ["베인", "결", "VEIN", "VEINING", "마블", "스톤"]],
    [/나뭇결|woodgrain|wood grain/, ["나뭇결", "우드", "WOOD", "WOD"]],
    [/기하학|geometric|hex|헥사|육각/, ["기하학", "GEOMETRIC", "HEX", "헥사", "패턴"]],
    [/무광|matte|matt/, ["무광", "MAT"]],
    [/유광|gloss|polish|폴리싱/, ["유광", "GLS", "폴리싱", "POL"]],
    [/논슬립|nonslip|anti slip/, ["논슬립", "NSP"]]
  ];
  for (const [pattern, values] of groups) {
    if (pattern.test(source)) expanded.push(...values);
  }
  return expanded;
}

function scoreTileProduct(product, analysis) {
  const text = normalizeMatchText([
    product.managementCode,
    product.name,
    product.modelName,
    product.kind,
    product.option,
    product.size,
    product.finish,
    product.material,
    product.surface,
    product.patternCategory,
    product.color,
    product.features,
    product.maker
  ].filter(Boolean).join(" "));
  const reasons = [];
  let score = 0;
  if (analysis.requestedSize) {
    const sizeMatched = collectTileFinderProductSizes(product).includes(analysis.requestedSize);
    if (sizeMatched) {
      score += analysis.searchMode === "global" ? 18 : 8;
      reasons.push(`사이즈일치: ${analysis.requestedSize}`);
    } else if (analysis.searchMode === "global") {
      reasons.push(`선택사이즈와 다름`);
    }
  }
  if (analysis.requestedFinish) {
    const requestedFinishes = getRequestedTileFinderFinishGroups(analysis.requestedFinish);
    const productFinishes = getProductTileFinderFinishGroups(product);
    const finishMatched = requestedFinishes.some((finish) => productFinishes.includes(finish));
    if (finishMatched) {
      score += analysis.searchMode === "global" ? 18 : 8;
      reasons.push(`표면일치: ${analysis.requestedFinish}`);
    } else if (analysis.searchMode === "global") {
      reasons.push(`선택표면과 다름`);
    }
  }

  for (const color of analysis.colors || []) {
    const weight = keywordMatchScore(text, color, "색상", reasons, 30);
    score += weight;
  }
  for (const pattern of analysis.patterns || []) {
    const weight = keywordMatchScore(text, pattern, "패턴", reasons, 24);
    score += weight;
    if (normalizeMatchText(product.patternCategory) === normalizeMatchText(pattern)) {
      score += 36;
      reasons.push(`패턴분류: ${pattern}`);
    }
  }
  for (const motif of analysis.motifs || []) {
    const weight = keywordMatchScore(text, motif, "무늬", reasons, 18);
    score += weight;
  }
  for (const keyword of analysis.keywords || []) {
    score += keywordMatchScore(text, keyword, "키워드", reasons, 8);
  }

  if (String(product.option || "").includes("스톤") && (analysis.patterns || []).some((item) => /스톤|마블|대리석|트라버틴/.test(item))) {
    score += 10;
    reasons.push("석재 계열 카테고리");
  }
  return {
    product,
    score,
    reasons: [...new Set(reasons)]
  };
}

function productMatchesTileFinderBase(product, analysis) {
  if (analysis.requestedSize) {
    const productSizes = collectTileFinderProductSizes(product);
    if (!productSizes.includes(analysis.requestedSize)) return false;
  }

  if (analysis.requestedFinish) {
    const requestedFinishes = getRequestedTileFinderFinishGroups(analysis.requestedFinish);
    const productFinishes = getProductTileFinderFinishGroups(product);
    if (!requestedFinishes.some((finish) => productFinishes.includes(finish))) return false;
  }

  return true;
}

function isTileFinderTileCandidate(product) {
  if (String(product?.productType || "").trim() !== "tile") return false;
  const text = normalizeMatchText([
    product.name,
    product.kind,
    product.option,
    product.material,
    product.surface,
    product.features,
    product.sourceCategoryName
  ].filter(Boolean).join(" "));
  const materialTerms = [
    "부자재",
    "유가",
    "배수구",
    "트렌치",
    "재료분리대",
    "코너비드",
    "본드",
    "시멘트",
    "압착",
    "몰탈",
    "홈멘트",
    "줄눈",
    "메지",
    "실리콘",
    "방수",
    "접착",
    "레벨링",
    "스페이서",
    "클립"
  ].map(normalizeMatchText);
  return !materialTerms.some((term) => term && text.includes(term));
}

function collectTileFinderProductSizes(product) {
  return [...new Set([
    product?.size,
    product?.modelName,
    product?.name,
    product?.option,
    product?.features
  ].map(normalizeTileSize).filter(Boolean))];
}

function getRequestedTileFinderFinishGroups(value) {
  const text = normalizeMatchText(value);
  if (!text) return [];
  if (/논슬립|nsp|nonslip|nonsilp|antislip/.test(text)) return ["논슬립"];
  if (/폴리싱|polishing|pol/.test(text)) return ["폴리싱", "유광"];
  if (/반무광|새틴|sat/.test(text)) return ["반무광"];
  if (/유광|gloss|gls/.test(text)) return ["유광", "폴리싱"];
  if (/러프|rough|ruf/.test(text)) return ["러프"];
  if (/무광|matte|matt|mat/.test(text)) return ["무광"];
  return [value];
}

function getProductTileFinderFinishGroups(product) {
  const explicitRawText = [
    product?.finish,
    product?.surface
  ].filter(Boolean).join(" ");
  const explicitText = normalizeMatchText(explicitRawText);
  const hasExplicitFinish = Boolean(explicitText);
  const explicitGlossy = /유광|gloss|gls|glossy|폴리싱|polishing|pol/.test(explicitText);
  const explicitMatte = /무광|matte|matt|논슬립|nsp|nonslip|nonsilp|antislip|러프|rough|ruf/.test(explicitText);
  const rawText = [
    product?.finish,
    product?.surface,
    product?.name,
    product?.option,
    product?.features,
    product?.material
  ].filter(Boolean).join(" ");
  const text = normalizeMatchText(rawText);
  const groups = [];
  if (/논슬립|nsp|nonslip|nonsilp|antislip/.test(text)) groups.push("논슬립", "무광");
  if (/폴리싱|polishing|pol/.test(text) || hasStandaloneFinishCode(rawText, "P")) groups.push("폴리싱", "유광");
  if (/반무광|새틴|satin|sat/.test(text)) groups.push("반무광");
  if (/유광|gloss|gls|glossy/.test(text)) groups.push("유광");
  if (/러프|rough|ruf/.test(text)) groups.push("러프", "무광");
  if (/무광|matte|matt/.test(text)
    || (hasStandaloneFinishCode(rawText, "M") && (!hasExplicitFinish || explicitMatte) && !explicitGlossy)) {
    groups.push("무광");
  }
  if ((/포쉐린|포세린|porcelain/.test(text) || hasStandaloneFinishCode(rawText, "POR"))
    && !groups.includes("유광")
    && !groups.includes("폴리싱")) {
    groups.push("무광");
  }
  return [...new Set(groups)];
}

function hasStandaloneFinishCode(value, code) {
  const pattern = new RegExp(`(^|[^a-z0-9가-힣])${code}($|[^a-z0-9가-힣])`, "i");
  return pattern.test(String(value || ""));
}

async function rerankTileMatchesByVision(imageDataUrl, scoredMatches, analysis) {
  const candidates = scoredMatches
    .filter((entry) => entry.product?.image)
    .slice(0, 12);
  if (!candidates.length) return scoredMatches;
  const candidatesWithImages = await Promise.all(candidates.map(async (entry) => ({
    ...entry,
    compareImageUrl: await readRemoteImageDataUrl(entry.product.image).catch(() => entry.product.image)
  })));

  const content = [
    {
      type: "text",
      text: [
        "Compare the uploaded tile image against candidate product images.",
        "Color match is mandatory. Give a high colorScore only when the dominant base color, undertone, saturation, and major accent colors are almost the same.",
        "If the candidate has a similar pattern but a noticeably different color family, colorScore must be below 45.",
        "After color, compare visible pattern and motif similarity: veining flow, stone grain, terrazzo chips, decorative motif, line rhythm, pattern scale, repeat density, and contrast.",
        "Also consider requested size and finish if provided.",
        "Return JSON only with key scores: array of {id, visualScore, patternScore, colorScore, reason}. Scores are 0-100.",
        `Requested size: ${analysis.requestedSize || "none"}. Requested finish: ${analysis.requestedFinish || "none"}.`,
        `Uploaded image analysis: ${JSON.stringify({
          colors: analysis.colors,
          patterns: analysis.patterns,
          motifs: analysis.motifs,
          material: analysis.material,
          surface: analysis.surface,
          patternScale: analysis.patternScale,
          patternFlow: analysis.patternFlow,
          contrast: analysis.contrast
        })}.`,
        `Candidates: ${JSON.stringify(candidatesWithImages.map((entry, index) => ({
          index: index + 1,
          id: entry.product.id,
          name: entry.product.name,
          size: entry.product.size,
          finish: entry.product.finish || entry.product.surface || "",
          category: entry.product.option || entry.product.kind || ""
        })))}`
      ].join(" ")
    },
    {
      type: "image_url",
      image_url: {
        url: imageDataUrl,
        detail: "low"
      }
    }
  ];

  candidatesWithImages.forEach((entry, index) => {
    content.push({
      type: "text",
      text: `Candidate ${index + 1}: id=${entry.product.id}, name=${entry.product.name}`
    });
    content.push({
      type: "image_url",
      image_url: {
        url: entry.compareImageUrl,
        detail: "low"
      }
    });
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openAiVisionModel,
      temperature: 0.05,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a tile visual matcher. Use actual image similarity for patterns and motifs, not brand guessing. Return compact JSON."
        },
        {
          role: "user",
          content
        }
      ]
    })
  });

  const text = await response.text();
  let result = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = null;
  }
  if (!response.ok) {
    throw new Error(result?.error?.message || "visual rerank failed");
  }

  let parsed = {};
  try {
    parsed = JSON.parse(result?.choices?.[0]?.message?.content || "{}");
  } catch {
    parsed = {};
  }
  const visualScores = new Map();
  for (const entry of Array.isArray(parsed.scores) ? parsed.scores : []) {
    const id = String(entry.id || "").trim();
    if (id) {
      visualScores.set(id, entry);
      continue;
    }
    const index = Number(entry.index || entry.candidateIndex || entry.candidate || 0);
    const candidate = candidatesWithImages[index - 1];
    if (candidate?.product?.id) visualScores.set(String(candidate.product.id), entry);
  }
  if (!visualScores.size) throw new Error("visual rerank returned no candidate scores");

  const reranked = scoredMatches.map((entry) => {
    const visual = visualScores.get(String(entry.product.id));
    if (!visual) return entry;
    const visualScore = Number(visual.visualScore) || 0;
    const patternScore = Number(visual.patternScore) || 0;
    const colorScore = Number(visual.colorScore) || 0;
    const score = (entry.score * 0.18) + (visualScore * 0.22) + (patternScore * 0.2) + (colorScore * 0.4);
    const visualReason = String(visual.reason || "").trim();
    return {
      ...entry,
      score,
      visualColorScore: colorScore,
      visualPatternScore: patternScore,
      visualScore,
      reasons: [
        `색상유사도 ${Math.round(colorScore)}`,
        visualReason ? `무늬비교: ${visualReason}` : "무늬/패턴 이미지 비교",
        ...entry.reasons
      ].filter(Boolean)
    };
  });

  return reranked;
}

async function readRemoteImageDataUrl(imageUrl) {
  const url = String(imageUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`image fetch failed ${response.status}`);
  const contentType = normalizeImageContentType(response.headers.get("content-type") || "image/jpeg");
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function normalizeImageContentType(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("png")) return "image/png";
  if (text.includes("webp")) return "image/webp";
  return "image/jpeg";
}

function selectColorStrictMatches(matches, limit) {
  const sorted = [...matches].sort((left, right) => right.score - left.score);
  const strict = sorted.filter((entry) => Number(entry.visualColorScore || 0) >= 68);
  if (strict.length) return strict;
  const relaxed = sorted.filter((entry) => Number(entry.visualColorScore || 0) >= 55);
  if (relaxed.length) return relaxed;
  const nearestColor = sorted
    .filter((entry) => Number(entry.visualColorScore || 0) > 0)
    .sort((left, right) => Number(right.visualColorScore || 0) - Number(left.visualColorScore || 0));
  if (nearestColor.length) return nearestColor.slice(0, Math.max(4, limit));
  return sorted.slice(0, Math.max(4, limit));
}

function selectTextColorStrictMatches(matches, analysis) {
  const colorTokens = normalizeKeywordList([
    ...(analysis.colors || []),
    ...expandTileMatchKeywords(analysis.colors || [])
  ]).map(normalizeMatchText).filter((token) => token.length >= 2);
  if (!colorTokens.length) return matches;
  return matches.map((entry) => {
    const text = normalizeMatchText([
      entry.product?.name,
      entry.product?.color,
      entry.product?.features,
      entry.product?.option,
      entry.product?.patternCategory
    ].filter(Boolean).join(" "));
    if (!colorTokens.some((token) => text.includes(token))) return entry;
    return {
      ...entry,
      score: entry.score + 14,
      reasons: [...new Set([...(entry.reasons || []), "색상 텍스트 우선"])]
    };
  });
}

function normalizeTileSize(value) {
  const digits = String(value || "").match(/\d{2,4}/g) || [];
  if (digits.length >= 2) return `${digits[0]}*${digits[1]}`;
  const compact = String(value || "").replace(/[^0-9]/g, "");
  if (compact.length === 6) return `${compact.slice(0, 3)}*${compact.slice(3)}`;
  if (compact.length === 8) return `${compact.slice(0, 4)}*${compact.slice(4)}`;
  return "";
}

function getFinishAliases(value) {
  const text = String(value || "");
  if (/무광|mat/i.test(text)) return ["MAT", "MATT", "무광"];
  if (/유광|gls|gloss/i.test(text)) return ["GLS", "GLOSS", "유광"];
  if (/반무광|sat/i.test(text)) return ["SAT", "반무광"];
  if (/논슬립|nsp|non/i.test(text)) return ["NSP", "논슬립", "NONSILP", "NONSLIP"];
  if (/러프|ruf|rough/i.test(text)) return ["RUF", "ROUGH", "러프"];
  if (/폴리싱|pol/i.test(text)) return ["POL", "폴리싱"];
  return [text];
}

function keywordMatchScore(text, keyword, label, reasons, baseScore) {
  const normalized = normalizeMatchText(keyword);
  if (!normalized || normalized.length < 2) return 0;
  if (text.includes(normalized)) {
    reasons.push(`${label}: ${keyword}`);
    return baseScore;
  }
  return 0;
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[(){}\[\]_\-·/]/g, "");
}

function buildRenderRoomContextInstruction(roomContext) {
  if (!roomContext) return "";
  const width = Number(roomContext.widthMeters) || 0;
  const depth = Number(roomContext.depthMeters) || 0;
  const height = Number(roomContext.heightMeters) || 0;
  const grout = Number(roomContext.groutMillimeters) || 0;
  const footprintType = String(roomContext.footprintType || "").trim();
  const parts = [];
  if (width && depth) parts.push(`floor size about ${width}m by ${depth}m`);
  if (height) parts.push(`wall height about ${height}m`);
  if (grout) parts.push(`grout joint about ${grout}mm`);
  if (footprintType) parts.push(`space layout source: ${footprintType}`);
  if (!parts.length) return "";
  return `Use these room measurements as scale guidance for perspective and tile module density: ${parts.join(", ")}.`;
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

function sendRawJson(response, status, json) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(json);
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

