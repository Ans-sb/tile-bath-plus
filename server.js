const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { pathToFileURL } = require("url");
const jpeg = require("jpeg-js");
const { PNG } = require("pngjs");
const { readRequestBody, sendJson, sendRawJson } = require("./src/server/http-utils");
const { createHttpError } = require("./src/server/http-errors");
const { serveStaticFile } = require("./src/server/static-files");
const { handleProductRoutes } = require("./src/server/routes/product-routes");
const { handleAccountRoutes } = require("./src/server/routes/account-routes");
const { handleAdminRoutes } = require("./src/server/routes/admin-routes");
const { handleMediaRoutes } = require("./src/server/routes/media-routes");
const { handleSearchRoutes } = require("./src/server/routes/search-routes");
const { handleSystemRoutes } = require("./src/server/routes/system-routes");
const { createSupabaseClient } = require("./src/server/services/supabase-client");
const productSupabaseMapper = require("./src/server/services/product-supabase-mapper");
const { createProductCache } = require("./src/server/services/product-cache");
const { createProductFileStore } = require("./src/server/services/product-file-store");
const { createProductReader } = require("./src/server/services/product-reader");
const { createProductWriter } = require("./src/server/services/product-writer");
const accountMapper = require("./src/server/services/account-mapper");
const accountSession = require("./src/server/services/account-session");
const authService = require("./src/server/services/auth-service");
const cartMapper = require("./src/server/services/cart-mapper");
const { createSearchLogStore } = require("./src/server/services/search-log-store");
const { createProductResponseMapper } = require("./src/server/services/product-response-mapper");
const passwordService = require("./src/server/services/password-service");
const { createAdminProductService } = require("./src/server/services/admin-product-service");
const { createApprovalRulesService } = require("./src/server/services/approval-rules-service");
const { createCartStore } = require("./src/server/services/cart-store");
const { createOrderStore } = require("./src/server/services/order-store");
const { createSiteSettingsService } = require("./src/server/services/site-settings-service");

const root = process.cwd();
loadEnvFile(path.join(root, ".env"));

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const productsPath = path.join(root, "data", "products.json");
const productImagesPath = path.join(root, "data", "product-images.json");
const normalizedTaxonomyPath = path.join(root, "data", "products.normalized.json");
const searchTrainingFeedbackPath = path.join(root, "data", "search-training-feedback.jsonl");
const renderFeedbackPath = path.join(root, "data", "render-feedback.jsonl");
const renderFeedbackAssetDir = path.join(root, "outputs", "render-feedback-assets");
const adminActionRequestsPath = path.join(root, "data", "admin-action-requests.jsonl");
const ordersPath = path.join(root, "data", "orders.json");
const siteSettingsPath = path.join(root, "data", "site-settings.json");
const siteStudioUploadDir = path.join(root, "uploads", "site-studio");
const productsHiddenFlagPath = path.join(root, "data", "products-hidden.flag");
const proposalOutputDir = path.join(root, "outputs", "proposals");
const proposalTmpDir = path.join(root, "tmp", "proposal-ppt");
const proposalBuilderPath = path.join(root, "scripts", "build-proposal-deck.mjs");
const serverControlDir = path.join(root, "tmp", "server-control");
const stopFlagPath = path.join(serverControlDir, "stop.flag");
const startedAt = new Date();
const openAiApiKey = String(process.env.OPENAI_API_KEY || "").trim();
const openAiImageModel = String(process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();
const openAiVisionModel = String(process.env.OPENAI_VISION_MODEL || "gpt-4o-mini").trim();
const openAiRenderTimeoutMs = Math.max(60000, Number(process.env.OPENAI_RENDER_TIMEOUT_MS || 300000) || 300000);
const openAiRenderSize = normalizeOpenAiRenderSize(process.env.OPENAI_RENDER_SIZE || "1536x1024", openAiImageModel);
const openAiRenderQuality = String(process.env.OPENAI_RENDER_QUALITY || "high").trim();
const openAiRenderOutputFormat = normalizeOpenAiRenderOutputFormat(process.env.OPENAI_RENDER_OUTPUT_FORMAT || "jpeg");
const openAiRenderOutputCompression = Math.max(0, Math.min(100, Number(process.env.OPENAI_RENDER_OUTPUT_COMPRESSION || 92) || 92));
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
const productRemoteReadTimeoutMs = Math.max(0, Number(process.env.PRODUCT_REMOTE_READ_TIMEOUT_MS || 20000));
const supabaseRequestTimeoutMs = Math.max(0, Number(process.env.SUPABASE_REQUEST_TIMEOUT_MS || 12000));
const supabaseClient = createSupabaseClient({
  supabaseUrl,
  supabaseSecretKey,
  defaultTimeoutMs: supabaseRequestTimeoutMs
});
const productReadMode = String(process.env.PRODUCT_READ_MODE || "local-only").trim().toLowerCase();
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
const productCache = createProductCache({ defaultTtlMs: productReadCacheTtlMs });
const productFileStore = createProductFileStore({ productsPath });
const productReader = createProductReader({
  cache: productCache,
  fileStore: productFileStore,
  readRemoteProducts: () => readProductsFromSupabase(),
  hasSupabaseConfig,
  withTimeout,
  logger: console,
  forceLocalProducts,
  productReadMode,
  productReadCacheTtlMs,
  productReadFallbackCacheTtlMs,
  productRemoteReadTimeoutMs
});
const productWriter = createProductWriter({
  readProducts: (options) => readProducts(options),
  fileStore: productFileStore,
  cache: productCache,
  hasSupabaseConfig,
  upsertProductToSupabase
});
const tileImageSignatureCache = new Map();
const tileImageSignatureLimit = Math.max(24, Number(process.env.TILE_IMAGE_SIGNATURE_CACHE_LIMIT || 2500));
const tileVisualCompareLimit = Math.max(24, Number(process.env.TILE_VISUAL_COMPARE_LIMIT || 72));
const tileProductImageCompareLimit = Math.max(1, Number(process.env.TILE_PRODUCT_IMAGE_COMPARE_LIMIT || 3) || 3);
const tileVisualDeepCompareLimit = Math.max(0, Number(process.env.TILE_VISUAL_DEEP_COMPARE_LIMIT || 16));
const tileVisualCompareConcurrency = Math.max(4, Number(process.env.TILE_VISUAL_COMPARE_CONCURRENCY || 16));
const tileVisualCompareBudgetMs = Math.max(5000, Number(process.env.TILE_VISUAL_COMPARE_BUDGET_MS || 22000));
const tileImageFetchTimeoutMs = Math.max(1000, Number(process.env.TILE_IMAGE_FETCH_TIMEOUT_MS || 3500));
const tileVisionAnalysisTimeoutMs = Math.max(5000, Number(process.env.TILE_VISION_ANALYSIS_TIMEOUT_MS || 15000));
let productImageIndexCache = null;
let productImageIndexMtimeMs = 0;
const publicStockExcludeThresholdQty = Math.max(0, Number(
  process.env.PUBLIC_STOCK_EXCLUDE_THRESHOLD_QTY
  || process.env.STOCK_EXCLUDE_THRESHOLD_QTY
  || process.env.MIN_PUBLIC_STOCK_QTY
  || 50
) || 50);
const publicExposeAllStockProducts = /^(1|true|yes)$/i.test(String(process.env.PUBLIC_EXPOSE_ALL_STOCK_PRODUCTS || "true"));
const stockInquiryThresholdQty = Math.max(0, Number(process.env.STOCK_INQUIRY_THRESHOLD_QTY || 100) || 100);
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

const productResponseMapper = createProductResponseMapper({
  publicExposeAllStockProducts,
  publicStockExcludeThresholdQty,
  stockInquiryThresholdQty,
  classifyPatternCategory,
  toBlankableNumber
});
const adminProductService = createAdminProductService({
  assertAdminCredentials,
  readProducts,
  saveProduct,
  normalizeProduct,
  mapPublicProduct
});
const approvalRulesService = createApprovalRulesService({
  cloneApprovalRules,
  defaultApprovalRules,
  hasSupabaseConfig,
  isMissingSupabaseTableError,
  normalizeStringArray,
  requestSupabase
});
const cartStore = createCartStore({
  hasSupabaseConfig,
  isMissingSupabaseTableError,
  normalizeCartItem,
  requestSupabase
});
const orderStore = createOrderStore({
  hasSupabaseConfig,
  isMissingSupabaseTableError,
  normalizeCartItem,
  ordersPath,
  requestSupabase
});
const siteSettingsService = createSiteSettingsService({ settingsPath: siteSettingsPath });
const searchLogStore = createSearchLogStore({ root });

const server = http.createServer(async (request, response) => {
  try {
    if (await handleSystemRoutes(request, response, getSystemRouteContext())) {
      return;
    }

    if (await handleProductRoutes(request, response, getProductRouteContext())) {
      return;
    }

    if (await handleSearchRoutes(request, response, getSearchRouteContext())) {
      return;
    }

    if (await handleAdminRoutes(request, response, getAdminRouteContext())) {
      return;
    }

    if (await handleAccountRoutes(request, response, getAccountRouteContext())) {
      return;
    }

    if (await handleMediaRoutes(request, response, getMediaRouteContext())) {
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

function getSystemRouteContext() {
  return {
    readRequestBody,
    sendJson,
    startedAt,
    getStorageMode,
    buildSocialAuthStartUrl,
    readSocialAuthProfile,
    loginWithSocialAuth
  };
}

function getProductRouteContext() {
  return {
    readRequestBody,
    sendJson,
    sendRawJson,
    areProductsHiddenFromStorefront,
    getPublicProductsJson,
    readMemberProductCredentialsFromRequest,
    verifyMemberProductAccess,
    readProducts,
    isPublicCatalogProduct,
    mapMemberProduct,
    readAdminCredentialsFromRequest,
    readAdminProducts,
    readAdminProduct,
    saveAdminProduct
  };
}

function getAccountRouteContext() {
  return {
    readRequestBody,
    sendJson,
    readApprovalRules,
    saveApprovalRules,
    saveSignupRequestRecord,
    loginWithSignupRequest,
    loginAsAdmin,
    readMemberProductCredentialsFromRequest,
    verifyMemberSessionAccess,
    readCartRecord,
    saveCartRecord,
    createOrderFromCart,
    readMemberOrders
  };
}

function getAdminRouteContext() {
  return {
    readRequestBody,
    sendJson,
    readAdminCredentialsFromRequest,
    assertAdminCredentials,
    readSearchTrainingStats,
    appendSearchTrainingFeedback,
    appendSearchTrainingFeedbackBatch,
    appendAdminActionRequest,
    readAdminActionRequests,
    updateSignupRequestApprovalStatus,
    updateAdminOrderStatus,
    readAdminOverview,
    readTile114SampleProducts,
    readAllOrders,
    readSiteSettings: () => siteSettingsService.read(),
    saveSiteSettings: (settings, reviewer) => siteSettingsService.save(settings, reviewer),
    resetSiteSettings: (reviewer) => siteSettingsService.reset(reviewer),
    getDefaultSiteSettings: () => siteSettingsService.defaults,
    saveSiteStudioImage
  };
}

function getMediaRouteContext() {
  return {
    readRequestBody,
    sendJson,
    readRemoteImageDataUrl,
    generateRenderPreview,
    appendRenderFeedback,
    readOptionalAdminContextFromRequest,
    findSimilarTilesByImage,
    checkBusinessStatus,
    buildProfessionalProposalDeck,
    handleServerControl
  };
}

function getSearchRouteContext() {
  return {
    readRequestBody,
    sendJson,
    isLocalRequest,
    readLocalNormalizedTaxonomy,
    appendTaxonomySearchLog,
    searchTileCatalog
  };
}

process.on("unhandledRejection", (error) => {
  console.error("[server] unhandledRejection", error);
  setTimeout(() => process.exit(1), 50).unref();
});

process.on("uncaughtException", (error) => {
  console.error("[server] uncaughtException", error);
  setTimeout(() => process.exit(1), 50).unref();
});

function getCachedProducts() {
  return productCache.getProducts();
}

function setCachedProducts(rows, source, ttlMs = productReadCacheTtlMs) {
  return productCache.setProducts(rows, source, ttlMs);
}

function invalidateProductsReadCache() {
  productCache.invalidate();
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
  return productFileStore.readProducts();
}

async function getPublicProductsJson() {
  const cachedJson = productCache.getPublicJson();
  if (cachedJson) return cachedJson;
  const json = JSON.stringify((await readProducts()).filter(isPublicCatalogProduct).map(mapPublicProduct));
  return productCache.setPublicJson(json, productReadCacheTtlMs);
}

function isPublicCatalogProduct(product) {
  return productResponseMapper.isPublicCatalogProduct(product);
}

function getProductStockQty(product) {
  return productResponseMapper.getProductStockQty(product);
}

function hasOrderableStock(product) {
  return productResponseMapper.hasOrderableStock(product);
}

function isExcludedLowStockPublicProduct(product) {
  return productResponseMapper.isExcludedLowStockPublicProduct(product);
}

function isExcludedVerygoodProduct(product) {
  return productResponseMapper.isExcludedVerygoodProduct(product);
}

function isVerygoodProduct(product) {
  return productResponseMapper.isVerygoodProduct(product);
}

async function readProducts(options = {}) {
  return productReader.readProducts(options);
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
  return supabaseClient.hasConfig();
}

function getStorageMode() {
  return hasSupabaseConfig() ? "supabase" : "file";
}

function areProductsHiddenFromStorefront() {
  return fs.existsSync(productsHiddenFlagPath);
}

const LEGACY_PRODUCTS_SUPABASE_COLUMNS = productSupabaseMapper.LEGACY_PRODUCTS_SUPABASE_COLUMNS;
const PRODUCTS_SUPABASE_COLUMNS = productSupabaseMapper.PRODUCTS_SUPABASE_COLUMNS;

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
  return productWriter.saveProduct(product);
}

function mapAppProductToSupabase(product) {
  return productSupabaseMapper.mapAppProductToSupabase(product);
}

function mapSupabaseProductToApp(row) {
  return productSupabaseMapper.mapSupabaseProductToApp(row);
}

function mapPublicProduct(product) {
  return productResponseMapper.mapPublicProduct(product);
}

function stripCustomerSensitiveProductFields(product) {
  return productResponseMapper.stripCustomerSensitiveProductFields(product);
}

function normalizeCustomerProductClassification(product) {
  return productResponseMapper.normalizeCustomerProductClassification(product);
}

function getPublicPriceSortRank(product) {
  return productResponseMapper.getPublicPriceSortRank(product);
}

function mapMemberProduct(product) {
  return productResponseMapper.mapMemberProduct(product);
}

function mapAdminTileMatchProduct(product) {
  return productResponseMapper.mapAdminTileMatchProduct(product);
}

function getPublicProductGroup(product) {
  return productResponseMapper.getPublicProductGroup(product);
}

function toNullableInteger(value) {
  return productSupabaseMapper.toNullableInteger(value);
}

function toNullableNumber(value) {
  return productSupabaseMapper.toNullableNumber(value);
}

function toBlankableNumber(value) {
  return productSupabaseMapper.toBlankableNumber(value);
}

function classifyPatternCategory(product) {
  return productSupabaseMapper.classifyPatternCategory(product);
}

function toLegacySupabaseProduct(product) {
  return productSupabaseMapper.toLegacySupabaseProduct(product);
}

function createAdminToken() {
  return accountSession.createAdminToken({ adminUsername, adminPassword, adminDisplayName });
}

function safeEqualText(left, right) {
  return accountSession.safeEqualText(left, right);
}

function readAdminCredentialsFromRequest(request) {
  return authService.readAdminCredentialsFromRequest(request);
}

function readOptionalAdminContextFromRequest(request) {
  return authService.readOptionalAdminContextFromRequest(request, { adminUsername, adminPassword, adminDisplayName });
}

function readMemberProductCredentialsFromRequest(request) {
  return authService.readMemberProductCredentialsFromRequest(request);
}

function assertAdminCredentials(value, token) {
  return authService.assertAdminCredentials(value, token, { adminUsername, adminPassword, adminDisplayName });
}

async function readAdminProduct(adminUsernameValue, adminTokenValue, id) {
  return adminProductService.readAdminProduct(adminUsernameValue, adminTokenValue, id);
}

async function readAdminProducts(adminUsernameValue, adminTokenValue) {
  return adminProductService.readAdminProducts(adminUsernameValue, adminTokenValue);
}

async function saveAdminProduct(payload) {
  return adminProductService.saveAdminProduct(payload);
}

async function appendSearchTrainingFeedback(payload, reviewer) {
  const entry = sanitizeSearchTrainingFeedback(payload, reviewer);
  await fs.promises.mkdir(path.dirname(searchTrainingFeedbackPath), { recursive: true });
  await fs.promises.appendFile(searchTrainingFeedbackPath, `${JSON.stringify(entry)}\n`, "utf8");
  return {
    ok: true,
    feedback: entry,
    stats: await readSearchTrainingStats()
  };
}

async function appendSearchTrainingFeedbackBatch(payload, reviewer) {
  const rawEntries = Array.isArray(payload?.entries) ? payload.entries.slice(0, 120) : [];
  const entries = rawEntries
    .map((entry) => sanitizeSearchTrainingFeedback(entry, reviewer))
    .filter((entry) => entry.product.id || entry.product.productName);
  if (!entries.length) {
    return {
      ok: false,
      count: 0,
      stats: await readSearchTrainingStats(),
      message: "저장할 학습 데이터가 없습니다."
    };
  }
  const applied = payload?.applyToDb ? await applySearchTrainingFeedbackToProducts(entries) : { updated: 0, skipped: entries.length };
  await fs.promises.mkdir(path.dirname(searchTrainingFeedbackPath), { recursive: true });
  await fs.promises.appendFile(
    searchTrainingFeedbackPath,
    `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    "utf8"
  );
  return {
    ok: true,
    count: entries.length,
    applied,
    stats: await readSearchTrainingStats()
  };
}

async function appendRenderFeedback(payload, request) {
  const entry = await sanitizeRenderFeedback(payload, request);
  await fs.promises.mkdir(path.dirname(renderFeedbackPath), { recursive: true });
  await fs.promises.appendFile(renderFeedbackPath, `${JSON.stringify(entry)}\n`, "utf8");
  return {
    ok: true,
    feedback: {
      id: entry.id,
      label: entry.label,
      code: entry.code,
      createdAt: entry.createdAt,
      assets: entry.assets
    }
  };
}

async function sanitizeRenderFeedback(payload, request) {
  const codeLabels = {
    good: "좋음",
    graphic: "그래픽 같음",
    tile_mismatch: "타일 다름",
    grout_issue: "줄눈 이상",
    room_changed: "공간 바뀜",
    color_issue: "색감 이상",
    regenerate: "다시 생성 필요"
  };
  const rawCode = String(payload?.code || "").trim();
  const code = Object.prototype.hasOwnProperty.call(codeLabels, rawCode) ? rawCode : "regenerate";
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = new Date().toISOString();
  const assetDir = path.join(renderFeedbackAssetDir, id);
  await fs.promises.mkdir(assetDir, { recursive: true });

  const siteAsset = await writeRenderFeedbackImage(assetDir, "site", payload?.images?.siteImageDataUrl);
  const resultAsset = await writeRenderFeedbackImage(assetDir, "result", payload?.images?.renderImageDataUrl);

  return {
    id,
    createdAt,
    code,
    label: codeLabels[code],
    memo: String(payload?.memo || "").trim().slice(0, 1000),
    roomContext: sanitizeRenderFeedbackRoomContext(payload?.roomContext || {}),
    cartItem: sanitizeRenderFeedbackProduct(payload?.cartItem || {}),
    surfaces: Array.isArray(payload?.surfaces)
      ? payload.surfaces.slice(0, 6).map(sanitizeRenderFeedbackSurface)
      : [],
    assets: {
      site: siteAsset,
      result: resultAsset
    },
    ui: {
      compareSliderValue: Math.max(0, Math.min(100, Number(payload?.ui?.compareSliderValue) || 50))
    },
    user: sanitizeRenderFeedbackUser(payload?.user || {}),
    request: {
      ip: String(request?.socket?.remoteAddress || "").slice(0, 80),
      userAgent: String(request?.headers?.["user-agent"] || "").slice(0, 300)
    }
  };
}

function sanitizeRenderFeedbackRoomContext(value) {
  return {
    roomType: String(value?.roomType || "").slice(0, 80),
    roomTypeLabel: String(value?.roomTypeLabel || "").slice(0, 120),
    autoDetect: Boolean(value?.autoDetect),
    interiorStyle: String(value?.interiorStyle || "").slice(0, 80),
    interiorStyleLabel: String(value?.interiorStyleLabel || "").slice(0, 120),
    styleMemo: String(value?.styleMemo || "").trim().slice(0, 500),
    selectedSurfaces: Array.isArray(value?.selectedSurfaces)
      ? value.selectedSurfaces.slice(0, 6).map((item) => String(item || "").slice(0, 80))
      : []
  };
}

function sanitizeRenderFeedbackProduct(product) {
  return {
    id: String(product?.id || "").slice(0, 100),
    managementCode: String(product?.managementCode || "").slice(0, 100),
    productType: String(product?.productType || "").slice(0, 80),
    kind: String(product?.kind || "").slice(0, 120),
    name: String(product?.name || "").slice(0, 240),
    size: String(product?.size || "").slice(0, 80),
    finish: String(product?.finish || "").slice(0, 80),
    color: String(product?.color || "").slice(0, 80),
    material: String(product?.material || "").slice(0, 80),
    image: String(product?.image || "").slice(0, 1000)
  };
}

function sanitizeRenderFeedbackSurface(surface) {
  return {
    surface: String(surface?.surface || "").slice(0, 80),
    surfaceLabel: String(surface?.surfaceLabel || "").slice(0, 80),
    tileId: String(surface?.tileId || "").slice(0, 100),
    managementCode: String(surface?.managementCode || "").slice(0, 100),
    name: String(surface?.name || "").slice(0, 240),
    size: String(surface?.size || "").slice(0, 80),
    finish: String(surface?.finish || "").slice(0, 80),
    color: String(surface?.color || "").slice(0, 80),
    material: String(surface?.material || "").slice(0, 80),
    image: String(surface?.image || "").slice(0, 1000)
  };
}

function sanitizeRenderFeedbackUser(user) {
  return {
    role: String(user?.role || "").slice(0, 80),
    adminUsername: String(user?.adminUsername || "").slice(0, 120),
    businessNumber: String(user?.businessNumber || "").slice(0, 80),
    displayName: String(user?.displayName || "").slice(0, 120)
  };
}

function normalizeOpenAiRenderOutputFormat(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg") return "jpeg";
  if (normalized === "webp") return "webp";
  if (normalized === "png") return "png";
  return "jpeg";
}

function normalizeOpenAiRenderSize(value, model) {
  const requested = String(value || "").trim().toLowerCase();
  if (!/^gpt-image-/i.test(String(model || ""))) return requested || "1536x1024";

  const supported = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
  if (supported.has(requested)) return requested;

  const dimensions = requested.match(/^(\d+)x(\d+)$/);
  if (dimensions) {
    const width = Number(dimensions[1]);
    const height = Number(dimensions[2]);
    if (height > width) return "1024x1536";
    if (width === height) return "1024x1024";
  }
  return "1536x1024";
}

function getOpenAiRenderOutputMimeType(format) {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

async function writeRenderFeedbackImage(assetDir, role, dataUrl) {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return null;
  if (parsed.buffer.length > 18 * 1024 * 1024) {
    throw createHttpError(413, "보정 평가 이미지는 18MB 이하만 저장할 수 있습니다.");
  }
  const extension = parsed.mimeType.includes("jpeg") || parsed.mimeType.includes("jpg")
    ? "jpg"
    : parsed.mimeType.includes("webp")
      ? "webp"
      : "png";
  const filePath = path.join(assetDir, `${role}.${extension}`);
  await fs.promises.writeFile(filePath, parsed.buffer);
  const hash = crypto.createHash("sha256").update(parsed.buffer).digest("hex");
  return {
    path: path.relative(root, filePath).replace(/\\/g, "/"),
    mimeType: parsed.mimeType,
    bytes: parsed.buffer.length,
    sha256: hash
  };
}

function sanitizeSearchTrainingFeedback(payload, reviewer) {
  const status = String(payload?.status || "corrected").trim() === "agree" ? "agree" : "corrected";
  return {
    createdAt: new Date().toISOString(),
    reviewer: String(reviewer || "").slice(0, 80),
    status,
    product: sanitizeTrainingProduct(payload?.product || {}),
    predicted: sanitizeTrainingLabels(payload?.predicted || {}),
    corrected: sanitizeTrainingLabels(payload?.corrected || {}),
    updateProduct: sanitizeTrainingProductUpdate(payload?.updateProduct || {}),
    memo: String(payload?.memo || "").trim().slice(0, 500)
  };
}

async function applySearchTrainingFeedbackToProducts(entries) {
  const allowedFields = new Set(["patternCategory", "color"]);
  const products = await readProducts({ cache: false });
  let updated = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const entry of entries) {
    const productId = entry.updateProduct.id || entry.product.id;
    const field = entry.updateProduct.field;
    const value = entry.updateProduct.value;
    if (!productId || !allowedFields.has(field) || !value || /미확인/.test(value)) {
      skipped += 1;
      continue;
    }
    const index = products.findIndex((product) => product.id === productId);
    if (index < 0 || products[index].productType !== "tile") {
      skipped += 1;
      continue;
    }
    if (String(products[index][field] || "").trim() === value) {
      skipped += 1;
      continue;
    }
    products[index] = {
      ...products[index],
      [field]: value,
      aiTrainingUpdatedAt: now
    };
    updated += 1;
  }

  if (updated > 0) {
    await productFileStore.writeProducts(products);
    invalidateProductsReadCache();
    setCachedProducts(products, "file");

    let syncError = "";
    if (hasSupabaseConfig()) {
      try {
        for (const product of products.filter((item) => item.aiTrainingUpdatedAt === now)) {
          await upsertProductToSupabase(product);
        }
        invalidateProductsReadCache();
      } catch (error) {
        syncError = error?.message || "Supabase 동기화 실패";
        console.warn("[search-training] Supabase sync skipped:", syncError);
      }
    }

    return { updated, skipped, syncError };
  }

  return { updated, skipped };
}

function sanitizeTrainingProductUpdate(update) {
  const field = String(update?.field || "").trim();
  const allowedFields = new Set(["patternCategory", "color"]);
  return {
    id: String(update?.id || "").slice(0, 100),
    field: allowedFields.has(field) ? field : "",
    value: String(update?.value || "").trim().slice(0, 80)
  };
}

function sanitizeTrainingProduct(product) {
  return {
    id: String(product?.id || "").slice(0, 100),
    managementCode: String(product?.managementCode || "").slice(0, 100),
    productName: String(product?.productName || product?.name || "").slice(0, 220),
    brand: String(product?.brand || product?.internalBrandCode || product?.kind || "").slice(0, 100),
    image: String(product?.image || "").slice(0, 1000)
  };
}

function sanitizeTrainingLabels(value) {
  return {
    finish: String(value?.finish || "").slice(0, 80),
    color: String(value?.color || "").slice(0, 80),
    style: String(value?.style || "").slice(0, 80),
    material: String(value?.material || "").slice(0, 80),
    size: String(value?.size || "").slice(0, 80),
    origin: String(value?.origin || "").slice(0, 80),
    pattern: String(value?.pattern || "").slice(0, 120),
    texture: String(value?.texture || "").slice(0, 120)
  };
}

async function appendAdminActionRequest(payload, requester) {
  const entry = sanitizeAdminActionRequest(payload, requester);
  await fs.promises.mkdir(path.dirname(adminActionRequestsPath), { recursive: true });
  await fs.promises.appendFile(adminActionRequestsPath, `${JSON.stringify(entry)}\n`, "utf8");
  return {
    ok: true,
    request: entry,
    recent: await readAdminActionRequests(10)
  };
}

async function readAdminActionRequests(limit = 50) {
  try {
    const content = await fs.promises.readFile(adminActionRequestsPath, "utf8");
    return content.split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .slice(-Math.min(Math.max(Number(limit) || 50, 1), 200))
      .reverse();
  } catch {
    return [];
  }
}

function sanitizeAdminActionRequest(payload, requester) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString("hex");
  return {
    id,
    createdAt: now,
    requestedBy: String(requester || "").slice(0, 80),
    status: "queued",
    source: String(payload?.source || "admin-dashboard").slice(0, 80),
    taskId: String(payload?.taskId || "").slice(0, 140),
    label: String(payload?.label || "").trim().slice(0, 160),
    detail: String(payload?.detail || "").trim().slice(0, 600),
    priority: String(payload?.priority || "보통").trim().slice(0, 40),
    view: String(payload?.view || "operations").trim().slice(0, 40),
    dateKey: String(payload?.dateKey || "").trim().slice(0, 20),
    checked: Boolean(payload?.checked),
    ownerNote: String(payload?.ownerNote || "").trim().slice(0, 600)
  };
}

async function readSearchTrainingStats() {
  try {
    const content = await fs.promises.readFile(searchTrainingFeedbackPath, "utf8");
    const entries = content.split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const agreeCount = entries.filter((entry) => entry.status === "agree").length;
    const correctedCount = entries.filter((entry) => entry.status === "corrected").length;
    const latest = entries.slice(-8).reverse();
    return {
      total: entries.length,
      agreeCount,
      correctedCount,
      latest
    };
  } catch {
    return {
      total: 0,
      agreeCount: 0,
      correctedCount: 0,
      latest: []
    };
  }
}

function shouldBlockStaticPath(pathname) {
  const normalized = pathname.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
  if (!normalized || normalized === "index.html") return false;
  if (normalized.startsWith(".")) return true;
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

async function saveSiteStudioImage(payload = {}, reviewer = "admin") {
  const dataUrl = String(payload.dataUrl || "").trim();
  const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    throw createHttpError(400, "PNG, JPG, WEBP 이미지 파일만 업로드할 수 있습니다.");
  }

  const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
    throw createHttpError(400, "이미지는 8MB 이하로 업로드해주세요.");
  }

  const requestedName = path.basename(String(payload.fileName || `site-image.${extension}`))
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9가-힣_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "site-image";
  const reviewerKey = String(reviewer || "admin").replace(/[^a-z0-9_-]+/gi, "").slice(0, 20) || "admin";
  const fileName = `${Date.now()}-${reviewerKey}-${requestedName}-${crypto.randomBytes(3).toString("hex")}.${extension}`;

  await fs.promises.mkdir(siteStudioUploadDir, { recursive: true });
  await fs.promises.writeFile(path.join(siteStudioUploadDir, fileName), buffer);
  return {
    url: `/uploads/site-studio/${fileName}`,
    fileName,
    size: buffer.length
  };
}

async function readLocalNormalizedTaxonomy(view = "admin") {
  try {
    const rows = JSON.parse(await fs.promises.readFile(normalizedTaxonomyPath, "utf8"));
    const allRows = Array.isArray(rows) ? rows : [];
    if (String(view).toLowerCase() === "customer") {
      return allRows.filter(isPublicCatalogProduct).map(stripInternalBrandFromNormalizedProduct);
    }
    return allRows;
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
  return searchLogStore.appendTaxonomySearchLog(payload);
}

async function appendTileImageSearchLog(payload) {
  return searchLogStore.appendTileImageSearchLog(payload);
}

function sanitizeSearchLogObject(value) {
  return searchLogStore.sanitizeSearchLogObject(value);
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
    adminSearchText,
    searchKeywords,
    costPrice,
    purchasePrice,
    marginGrade,
    qualityGrade,
    ...safe
  } = item || {};
  return stripCustomerSensitiveProductFields({
    ...safe,
    customerSearchableText: String(item?.customerSearchableText || "")
  });
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
  return approvalRulesService.readApprovalRules();
}

async function saveApprovalRules(payload) {
  return approvalRulesService.saveApprovalRules(payload);
}

async function saveSignupRequestRecord(payload) {
  const record = normalizeSignupRequest(payload);
  record.password = await passwordService.hashPassword(record.password);

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

async function updateSignupRequestApprovalStatus(payload, adminUsernameValue = "") {
  const businessNumber = String(payload?.businessNumber || "").trim();
  const approvalStatus = normalizeApprovalStatus(payload?.approvalStatus);
  const memberGrade = String(payload?.memberGrade || "사업자").trim();
  const priceTier = normalizeMemberPriceTier(payload?.priceTier || (approvalStatus === "승인" ? "wholesale" : "retail"));
  const isApproved = approvalStatus === "승인";
  const now = new Date().toISOString();

  if (!businessNumber) throw createHttpError(400, "처리할 사업자등록번호가 필요합니다.");
  if (!hasSupabaseConfig()) throw createHttpError(503, "Supabase 관리 데이터가 설정되지 않았습니다.");

  const existing = await readSignupRequestByBusinessNumber(businessNumber);
  if (!existing) throw createHttpError(404, "가입 신청 정보를 찾지 못했습니다.");

  await requestSupabase(`/rest/v1/signup_requests?business_number=eq.${encodeURIComponent(businessNumber)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      approval_status: approvalStatus,
      member_grade: memberGrade,
      price_tier: priceTier,
      updated_at: now
    })
  });

  try {
    await requestSupabase(`/rest/v1/business_profiles?business_number=eq.${encodeURIComponent(businessNumber)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        verification_status: isApproved ? "approved" : "pending",
        pricing_access: isApproved ? "approved" : "pending",
        member_grade: memberGrade,
        price_tier: priceTier,
        approved_at: isApproved ? now : null
      })
    });
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "business_profiles")) throw error;
  }

  try {
    await requestSupabase(`/rest/v1/business_documents?business_number=eq.${encodeURIComponent(businessNumber)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        review_status: isApproved ? "approved" : "pending"
      })
    });
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "business_documents")) throw error;
  }

  if (existing.accountId) {
    await updateCustomerAccountStatus(existing.accountId, isApproved ? "approved" : "business_verification_pending");
  }

  return {
    ok: true,
    businessNumber,
    approvalStatus,
    pricingAccess: isApproved ? "approved" : "pending",
    handledBy: String(adminUsernameValue || "").trim(),
    updatedAt: now
  };
}

function createUserSessionFromSignupRecord(record) {
  return accountSession.createUserSessionFromSignupRecord(record, memberTokenSecret);
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
  const passwordResult = record
    ? await passwordService.verifyPassword(password, record.password)
    : { ok: false, needsRehash: false };
  if (!record || !passwordResult.ok) {
    throw new Error("사업자등록번호 또는 비밀번호가 일치하지 않습니다.");
  }
  if (passwordResult.needsRehash) {
    const nextPasswordHash = await passwordService.hashPassword(password);
    await updateSignupPasswordHash(businessNumber, nextPasswordHash);
    record.password = nextPasswordHash;
  }

  return {
    ok: true,
    user: createUserSessionFromSignupRecord(record)
  };
}

async function updateSignupPasswordHash(businessNumber, passwordHash) {
  if (!hasSupabaseConfig() || !businessNumber || !passwordHash) return;
  await requestSupabase(`/rest/v1/signup_requests?business_number=eq.${encodeURIComponent(businessNumber)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      password: passwordHash,
      updated_at: new Date().toISOString()
    })
  });
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
  return cartStore.readCartRecord(businessNumber);
}

async function saveCartRecord(payload) {
  return cartStore.saveCartRecord(payload);
}

async function createOrderFromCart(payload, memberCredentials = {}) {
  const businessNumber = String(payload?.businessNumber || memberCredentials.businessNumber || "").trim();
  const memberAccess = await verifyMemberProductAccess(businessNumber, memberCredentials.memberToken);
  const secureItems = await buildServerPricedOrderItems(payload?.items, memberAccess);
  return orderStore.createOrder({
    ...payload,
    businessNumber,
    items: secureItems,
    status: payload?.status || "접수대기"
  });
}

async function buildServerPricedOrderItems(rawItems, memberAccess) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  if (!items.length) throw createHttpError(400, "주문 접수할 상품이 없습니다.");
  const sourceProducts = await readProducts();
  const productIndex = buildOrderProductIndex(sourceProducts);
  return items.map((item) => {
    const product = findOrderProduct(productIndex, item);
    if (!product) {
      throw createHttpError(400, "상품 DB에서 확인되지 않은 상품은 주문 접수할 수 없습니다.");
    }
    const qty = Math.max(Number(item?.qty) || 0, 0);
    const quotePrice = getServerOrderUnitPrice(product, memberAccess);
    return {
      id: String(product.id || "").trim(),
      managementCode: String(product.managementCode || item?.managementCode || "").trim(),
      productType: String(product.productType || item?.productType || "").trim(),
      kind: String(product.kind || item?.kind || "").trim(),
      name: String(product.name || item?.name || "").trim(),
      size: String(product.size || item?.size || "").trim(),
      finish: String(product.finish || item?.finish || product.option || "").trim(),
      maker: String(product.maker || "").trim(),
      unit: String(product.unit || item?.unit || "").trim(),
      option: String(product.option || item?.option || "").trim(),
      stockQty: Number(product.stockQty || 0),
      image: String(product.image || item?.image || "").trim(),
      qty,
      quotePrice
    };
  });
}

function buildOrderProductIndex(products) {
  return (Array.isArray(products) ? products : []).reduce((index, product) => {
    const ids = [
      product?.id,
      product?.managementCode,
      product?.sourceProductId,
      product?.modelName
    ].map((value) => String(value || "").trim()).filter(Boolean);
    ids.forEach((id) => {
      if (!index.has(id)) index.set(id, product);
    });
    return index;
  }, new Map());
}

function findOrderProduct(productIndex, item) {
  const ids = [
    item?.id,
    item?.managementCode,
    item?.sourceProductId,
    item?.modelName
  ].map((value) => String(value || "").trim()).filter(Boolean);
  return ids.map((id) => productIndex.get(id)).find(Boolean) || null;
}

function getServerOrderUnitPrice(product, memberAccess) {
  const grade = String(memberAccess?.memberGrade || "").trim().toUpperCase();
  const gradePrices = {
    A: Number(product?.gradeAPrice || 0),
    B: Number(product?.gradeBPrice || 0),
    C: Number(product?.gradeCPrice || 0)
  };
  if (grade.includes("A") && gradePrices.A) return gradePrices.A;
  if (grade.includes("B") && gradePrices.B) return gradePrices.B;
  if (grade.includes("C") && gradePrices.C) return gradePrices.C;
  const firstGradePrice = [gradePrices.A, gradePrices.B, gradePrices.C].find((price) => Number(price) > 0) || 0;
  const tier = normalizeMemberPriceTier(memberAccess?.priceTier || "");
  if (tier === "wholesale") {
    return Number(product?.wholesalePrice || 0) || firstGradePrice || Number(product?.retailPrice || 0) || 0;
  }
  return Number(product?.retailPrice || 0) || Number(product?.wholesalePrice || 0) || firstGradePrice || 0;
}

async function readMemberOrders(businessNumber, memberCredentials = {}) {
  const cleanBusinessNumber = String(businessNumber || memberCredentials.businessNumber || "").trim();
  await verifyMemberProductAccess(cleanBusinessNumber, memberCredentials.memberToken);
  return {
    ok: true,
    orders: (await orderStore.readOrdersByBusinessNumber(cleanBusinessNumber)).map(mapMemberOrder)
  };
}

async function readAllOrders() {
  return orderStore.readAllOrders();
}

async function updateAdminOrderStatus(payload, adminUsernameValue = "") {
  const result = await orderStore.updateOrderStatus(payload);
  return {
    ...result,
    handledBy: String(adminUsernameValue || "").trim(),
    updatedAt: new Date().toISOString()
  };
}

function mapMemberOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    businessNumber: order.businessNumber,
    companyName: order.companyName,
    contactName: order.contactName,
    status: order.status,
    statusLabel: order.statusLabel,
    itemCount: order.itemCount,
    totalQuote: order.totalQuote,
    note: order.note,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (Array.isArray(order.items) ? order.items : []).map((item) => ({
      id: item.id,
      managementCode: item.managementCode,
      productType: item.productType,
      kind: item.kind,
      name: item.name,
      size: item.size,
      finish: item.finish,
      unit: item.unit,
      image: item.image,
      qty: item.qty,
      quotePrice: item.quotePrice,
      lineTotal: item.lineTotal
    }))
  };
}

async function readAdminOverview(adminUsernameValue, adminTokenValue) {
  const clean = String(adminUsernameValue || "").trim();
  if (!hasSupabaseConfig()) throw new Error("Supabase 관리 데이터가 설정되지 않았습니다.");
  assertAdminCredentials(clean, adminTokenValue);

  const [approvalRules, signupRequests, carts, orders] = await Promise.all([
    readApprovalRules(),
    readAllSignupRequests(),
    readAllCartRecords(),
    readAllOrders()
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
    carts,
    orders
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
  return authService.loginAsAdmin(payload, { adminUsername, adminPassword, adminDisplayName });
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
  return cartStore.readAllCartRecords();
}

async function requestSupabase(pathname, options = {}) {
  return supabaseClient.request(pathname, options);
}

async function requestSupabaseStorage(pathname, options = {}) {
  return supabaseClient.requestStorage(pathname, options);
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
  return accountMapper.normalizeSocialProviderOptional(value);
}

function normalizeEmail(value) {
  return accountMapper.normalizeEmail(value);
}

function formatSocialProviderLabel(providerValue, emailValue) {
  return accountMapper.formatSocialProviderLabel(providerValue, emailValue);
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
  return accountMapper.normalizeSignupProvider(payload);
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
  if (!uploadedFile?.fileUrl) return null;
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
  if (!uploadedFile?.fileUrl) return null;
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
  return accountMapper.normalizeStringArray(values);
}

function cloneApprovalRules(rules) {
  return accountMapper.cloneApprovalRules(rules);
}

function normalizeSignupRequest(payload) {
  return accountMapper.normalizeSignupRequest(payload);
}

function mapSignupRequestToSupabase(record) {
  return accountMapper.mapSignupRequestToSupabase(record);
}

function mapSupabaseSignupRequest(row) {
  return accountMapper.mapSupabaseSignupRequest(row);
}

function normalizeApprovalStatus(value) {
  return accountMapper.normalizeApprovalStatus(value);
}

function normalizeMemberPriceTier(value) {
  return accountMapper.normalizeMemberPriceTier(value);
}

function createMemberToken(record) {
  return accountSession.createMemberToken(record, memberTokenSecret);
}

function verifyMemberToken(token) {
  return accountSession.verifyMemberToken(token, memberTokenSecret);
}

async function verifyMemberSessionAccess(businessNumber, memberToken) {
  const cleanBusinessNumber = String(businessNumber || "").trim();
  const tokenPayload = verifyMemberToken(memberToken);
  if (!cleanBusinessNumber || !tokenPayload || tokenPayload.businessNumber !== cleanBusinessNumber) {
    throw createHttpError(403, "로그인한 회원만 본인 장바구니를 사용할 수 있습니다.");
  }

  const record = await readSignupRequestByBusinessNumber(cleanBusinessNumber);
  if (!record) {
    throw createHttpError(403, "가입 신청 정보를 확인할 수 없습니다.");
  }

  return {
    businessNumber: record.businessNumber,
    companyName: record.companyName,
    approvalStatus: record.approvalStatus,
    memberGrade: record.memberGrade || "사업자",
    priceTier: record.priceTier || "wholesale"
  };
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
  return cartMapper.normalizeCartItem(item);
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
  return serveStaticFile(request, response, {
    root,
    shouldBlockStaticPath
  });
}

async function generateRenderPreview(payload) {
  if (!openAiApiKey) {
    throw new Error("OPENAI_API_KEY 媛믪씠 ?ㅼ젙?섏? ?딆븘 OpenAI ?ㅼ궗 蹂댁젙???ъ슜???놁뒿?덈떎.");
  }

  const siteImageDataUrl = String(payload.siteImageDataUrl || "").trim();
  const guideImageDataUrl = String(payload.guideImageDataUrl || "").trim();
  const compositionImageDataUrl = String(payload.compositionImageDataUrl || "").trim();
  const qualityMode = String(payload.qualityMode || "").trim();
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
      tileOrientation: String(entry?.tileOrientation || "").trim(),
      tileImageDataUrl: String(entry?.tileImageDataUrl || "").trim()
    }))
    .filter((entry) => entry.tileImageDataUrl);

  if (!normalizedSurfaces.length) {
    throw new Error("?좏깮??????대?吏瑜?李얠? 紐삵뻽?듬땲??");
  }

  const hasGuideImage = guideImageDataUrl.startsWith("data:");
  const hasCompositionImage = compositionImageDataUrl.startsWith("data:");
  let nextImageNumber = 2;
  const guideInstruction = hasGuideImage
    ? `Use image ${nextImageNumber++} as a user-marked surface guide. Green marked area means floor tile target. Blue marked area means wall tile target. The marks are only guidance and must not appear in the final result.`
    : "";
  const compositionInstruction = hasCompositionImage
    ? `Use image ${nextImageNumber++} as a rough tile layout and scale preview only. It is not the final visual quality target. Use it to understand approximate grout spacing, tile count, module orientation, and target plane coverage, then replace its flat overlay look with a photorealistic installation.`
    : "";
  const referenceStartNumber = nextImageNumber;
  const referenceInstructions = normalizedSurfaces.map((entry, index) => {
    const referenceNumber = referenceStartNumber + index;
    const surfaceInstruction = entry.surface === "wall"
      ? "Apply this tile only to the wall surfaces."
      : entry.surface === "point"
        ? `Apply this tile only to the ${pointMemo || "shower booth back wall"}.`
        : "Apply this tile only to the floor surfaces.";
    const sizeInstruction = buildRenderSizeInstruction(entry.tileSize, entry.surface);

    const orientationInstruction = entry.tileOrientation === "vertical"
      ? "Install rectangular tile modules in vertical orientation, swapping the long side direction accordingly."
      : entry.tileOrientation === "horizontal"
        ? "Install rectangular tile modules in horizontal orientation."
        : "";

    return `Reference image ${referenceNumber} is the exact installed ${entry.surface} tile material. ${surfaceInstruction} Use this reference as the authoritative material source, not as loose inspiration. Prioritize the tile's visible design identity above all else: match the tone variation, veining flow, stone character, pattern rhythm, print character, surface texture depth, micro-contrast, edge rhythm, finish${entry.tileFinish ? ` (${entry.tileFinish})` : ""}, module size${entry.tileSize ? ` (${entry.tileSize})` : ""}, and installation orientation${entry.tileOrientation ? ` (${entry.tileOrientation})` : ""} as closely as possible. ${orientationInstruction} The tile pattern and texture are critical and must stay recognizable in the final image. Do not invent a different tile look, do not simplify or blur the pattern, and do not replace it with a generic stone or generic ceramic texture. ${sizeInstruction}`;
  }).join(" ");
  const roomContextInstruction = buildRenderRoomContextInstruction(roomContext);
  const premiumInstruction = qualityMode === "premium-photoreal"
    ? "Quality target: professional interior photography realism, like a professional photographer captured the completed renovated space after installation. The image should feel polished, clean, premium, and photo-real, but still physically real. Keep crisp material detail, correct perspective, realistic grout depth, subtle bevels, natural light falloff, contact shadows, ambient occlusion, and believable camera lens behavior while preserving the exact original site geometry. Do not make it look like CGI, a graphic mockup, or a synthetic showroom render."
    : "";

  const prompt = [
    "Create a photorealistic professional interior after-photo edit. The output must look like a real photograph taken by a professional interior photographer after renovation, not a graphic, illustration, 3D render, CGI render, showroom render, or AI concept image.",
    "Use the first image as the original site photo.",
    "The final image must be derived from the uploaded site photo. Do not create a separate showroom, synthetic 3D room, isometric view, architectural visualization, or clean CGI replacement scene.",
    "Keep the original camera position, crop, lens perspective, room proportions, and architectural geometry. Improve exposure, white balance, contrast, clarity, and color harmony like professional interior photo post-production. The result should look like the same place professionally photographed after tile installation, not like a graphic mockup.",
    premiumInstruction,
    guideInstruction,
    compositionInstruction,
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
    "Use refined interior-photography lighting: natural-looking highlights, balanced shadows, clean white balance, realistic reflected light, and believable ambient shading. Do not make the lighting look computer generated.",
    "Clean up the overall presentation enough to feel like a professional completion photo, but preserve physical realism such as natural grout edges, contact shadows, minor surface variation, real corners, and believable material response.",
    "Add natural contact shadows, ambient occlusion, edge darkening, realistic material reflectance, fine camera grain, and subtle lens behavior so the result reads as a photographed interior.",
    "Strictly avoid CGI, illustration, painterly style, cartoon style, over-sharpened edges, plastic texture, fake glossy reflections, fake showroom lighting, excessive depth-of-field blur, perfectly uniform repetition, and artificial interior staging.",
    "Photographic realism priority is higher than decorative style. Interior style may guide the completed-photo mood, color palette, and lighting balance only; it must never make the image look designed from scratch.",
    "At corners, drains, thresholds, base trims, silicone edges, and cut lines, make grout joints and tile cuts look naturally installed.",
    "If multiple surfaces are selected, keep each reference tile assigned only to its matching surface and never mix wall, floor, and point materials.",
    "Final result style: a realistic completed-interior photograph captured by a professional interior photographer, suitable for a client proposal, with no graphic-render feeling."
  ].join(" ");

  const form = new FormData();
  form.append("model", openAiImageModel);
  form.append("prompt", prompt);
  form.append("size", openAiRenderSize);
  form.append("quality", openAiRenderQuality);
  form.append("output_format", openAiRenderOutputFormat);
  if (openAiRenderOutputFormat === "jpeg" || openAiRenderOutputFormat === "webp") {
    form.append("output_compression", String(openAiRenderOutputCompression));
  }
  form.append("image[]", dataUrlToBlob(siteImageDataUrl), "site-photo.png");
  if (hasGuideImage) {
    form.append("image[]", dataUrlToBlob(guideImageDataUrl), "surface-guide.png");
  }
  if (hasCompositionImage) {
    form.append("image[]", dataUrlToBlob(compositionImageDataUrl), "tile-layout-preview.png");
  }
  normalizedSurfaces.forEach((entry) => {
    form.append("image[]", dataUrlToBlob(entry.tileImageDataUrl), `${sanitizeFileName(entry.tileName || "tile")}.png`);
  });

  const renderStartedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), openAiRenderTimeoutMs);
  console.log(`[render] OpenAI image edit started. model=${openAiImageModel}, size=${openAiRenderSize}, quality=${openAiRenderQuality}, format=${openAiRenderOutputFormat}, surfaces=${normalizedSurfaces.length}, guide=${hasGuideImage}, composition=${hasCompositionImage}, timeoutMs=${openAiRenderTimeoutMs}`);
  let response;
  try {
    response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`
      },
      body: form,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`고품질 AI 실사 렌더가 ${Math.round(openAiRenderTimeoutMs / 1000)}초 안에 완료되지 않았습니다. 현장 사진이나 타일 이미지를 조금 줄인 뒤 다시 시도해주세요.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    console.log(`[render] OpenAI image edit finished waiting in ${Math.round((Date.now() - renderStartedAt) / 1000)}s`);
  }

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
    imageDataUrl: `data:${getOpenAiRenderOutputMimeType(openAiRenderOutputFormat)};base64,${imageBase64}`,
    format: openAiRenderOutputFormat
  };
}

async function findSimilarTilesByImage(payload, context = {}) {
  const searchStartedAt = Date.now();
  if (!openAiApiKey) {
    throw new Error("OPENAI_API_KEY가 설정되어 있어야 사진으로 타일을 찾을 수 있습니다.");
  }

  const isAdmin = Boolean(context?.isAdmin);
  const imageDataUrl = String(payload?.imageDataUrl || "").trim();
  const requestedSize = normalizeTileSize(String(payload?.size || "").trim());
  const sizeUnknown = /^(1|true|yes)$/i.test(String(payload?.sizeUnknown || "").trim());
  const requestedFinish = String(payload?.finish || "").trim();
  const requestedBrand = isAdmin ? normalizeTileFinderBrandFilter(payload?.brand) : "";
  const requestedApplication = normalizeTileFinderApplication(payload?.application || payload?.targetApplication);
  const searchMode = String(payload?.searchMode || "").trim() === "global" ? "global" : "strict";
  const allSimilar = payload?.allSimilar !== false;
  const limit = allSimilar
    ? 50
    : Math.min(Math.max(Number(payload?.limit) || 12, 4), 50);
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl)) {
    throw new Error("타일 사진을 다시 업로드해주세요.");
  }

  const analysisStartedAt = Date.now();
  let analysisMode = "vision";
  let baseAnalysis = null;
  try {
    baseAnalysis = await analyzeTileImage(imageDataUrl);
  } catch (error) {
    analysisMode = "local-fallback";
    console.warn("[tile-image-search] vision analysis fallback:", error.message);
    baseAnalysis = normalizeTileAnalysis({
      summary: "사진 색상과 패턴을 상품 이미지와 직접 비교했습니다."
    });
  }
  const analysisMs = Date.now() - analysisStartedAt;
  const overrideAnalysis = normalizeTileFinderAnalysisOverrides(payload?.analysisOverrides);
  const analysis = {
    ...baseAnalysis,
    colors: overrideAnalysis.colors?.length ? overrideAnalysis.colors : baseAnalysis.colors,
    patterns: overrideAnalysis.patterns?.length ? overrideAnalysis.patterns : baseAnalysis.patterns,
    surface: overrideAnalysis.surface || baseAnalysis.surface,
    patternScale: baseAnalysis.patternScale,
    contrast: baseAnalysis.contrast,
    patternPresence: overrideAnalysis.patternPresence || baseAnalysis.patternPresence || "",
    veinPresence: overrideAnalysis.veinPresence || baseAnalysis.veinPresence || "",
    veinType: baseAnalysis.veinType || "",
    veinDirection: baseAnalysis.veinDirection || "",
    veinIntensity: baseAnalysis.veinIntensity || "",
    keywords: normalizeKeywordList([
      ...(baseAnalysis.keywords || []),
      ...(overrideAnalysis.keywords || [])
    ]),
    requestedSize,
    sizeUnknown,
    requestedFinish,
    requestedBrand,
    requestedApplication,
    searchMode
  };
  const filterStartedAt = Date.now();
  const baseProducts = (await readProducts()).filter((product) => (
    isTileFinderTileCandidate(product)
    && product.image
    && (!requestedBrand || productMatchesTileFinderBrand(product, requestedBrand))
    && productMatchesTileFinderApplication(product, requestedApplication)
    && (searchMode === "global" || productMatchesTileFinderBase(product, analysis))
  ));
  const filterMs = Date.now() - filterStartedAt;
  const products = baseProducts;
  let rankedMatches = products.map((product) => {
    const entry = scoreTileProduct(product, analysis);
    if (entry.score > 0) return entry;
    return {
      product,
      score: 1,
      reasons: [searchMode === "global" ? "전체 DB 이미지 비교 후보" : "사이즈/표면 조건 이미지 비교 후보"]
    };
  });
  rankedMatches = rankedMatches.map((entry) => {
    const stockQty = getProductStockQty(entry.product);
    if (stockQty > stockInquiryThresholdQty) return entry;
    return {
      ...entry,
      reasons: [...new Set([...(entry.reasons || []), "주문시 재고 문의"])]
    };
  });
  if (searchMode !== "global") {
    const visualStartedAt = Date.now();
    rankedMatches = await rerankTileMatchesByLocalImage(imageDataUrl, rankedMatches, analysis);
    analysis.visualCompareMs = Date.now() - visualStartedAt;
    rankedMatches = selectTextColorStrictMatches(rankedMatches, analysis);
  }
  const matches = rankedMatches
    .sort((left, right) => right.score - left.score || String(left.product.name || "").localeCompare(String(right.product.name || ""), "ko"))
    .slice(0, limit)
    .map((entry) => ({
      ...(isAdmin ? mapAdminTileMatchProduct(entry.product) : mapPublicProduct(entry.product)),
      matchScore: Math.min(99, Math.max(1, Math.round(entry.score))),
      matchReasons: entry.reasons.slice(0, 4)
    }));

  await appendTileImageSearchLog({
    requestedSize,
    requestedFinish,
    requestedBrand,
    requestedApplication,
    searchMode,
    userCorrections: sanitizeSearchLogObject(payload?.analysisOverrides || {}),
    hasUserCorrections: Object.values(payload?.analysisOverrides || {}).some((value) => String(value || "").trim()),
    analysis,
    resultCount: matches.length,
    topMatches: matches.slice(0, 40)
  }).catch((error) => {
    console.warn("[tile-image-search] unable to append search log:", error.message);
  });

  return {
    ok: true,
    analysis,
    matches,
    performance: {
      totalMs: Date.now() - searchStartedAt,
      analysisMs,
      filterMs,
      visualCompareMs: Number(analysis.visualCompareMs || 0),
      analysisMode,
      candidateCount: products.length,
      visualCandidateLimit: tileVisualCompareLimit
    }
  };
}

async function analyzeTileImage(imageDataUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), tileVisionAnalysisTimeoutMs);
  let response = null;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: openAiVisionModel,
        temperature: 0.1,
        max_tokens: 500,
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
                  "patterns: Korean pattern category words array, use only these when possible: 스톤, 마블, 시멘트, 솔리드, 테라조, 우드, 패턴, 모자이크, 브릭, 입체,",
                  "motifs: Korean visible motif words array such as 꽃, 선형, 구름결, 베인, 입자, 점박이, 나뭇결, 기하학, 줄눈, 반복라인,",
                  "shapes: Korean visible shape/layout words array. Detect physical layout first: 모자이크, 긴브릭, 직사각, 세로라인, 가로라인, 스틱, 서브웨이, 입체, 골지, 웨이브,",
                  "patternPresence: one of 있음, 없음, 불확실. Use 없음 only for a completely plain surface,",
                  "veinPresence: one of 있음, 없음, 불확실. Treat marble veining, stone mineral grain, travertine lines, and wood grain as visible 베인·결,",
                  "veinType: one of 마블베인, 스톤결, 트래버틴결, 우드결, 선형결, 구름결, 없음, 불확실,",
                  "veinDirection: one of 세로, 가로, 사선, 불규칙, 없음, 불확실,",
                  "veinIntensity: one of 약함, 보통, 강함, 없음, 불확실,",
                  "keywords: short search tokens for color, pattern, and shape,",
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
  } finally {
    clearTimeout(timeout);
  }

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
  const shapes = normalizeKeywordList(analysis.shapes || analysis.shape || analysis.layout || analysis.layouts);
  const keywords = normalizeKeywordList(analysis.keywords);
  const material = normalizeOptionalAnalysisText(analysis.material);
  const surface = normalizeOptionalAnalysisText(analysis.surface);
  const patternScale = String(analysis.patternScale || "").trim();
  const patternFlow = String(analysis.patternFlow || "").trim();
  const contrast = String(analysis.contrast || "").trim();
  const patternPresence = normalizeTileFinderPatternPresence(analysis.patternPresence);
  const veinPresence = normalizeTileVeinPresence(analysis.veinPresence);
  const veinType = normalizeTileVeinType(analysis.veinType);
  const veinDirection = normalizeTileVeinDirection(analysis.veinDirection);
  const veinIntensity = normalizeTileVeinIntensity(analysis.veinIntensity);
  const veinKeywords = veinPresence === "있음"
    ? ["베인", "결", veinType, veinDirection ? `${veinDirection}결` : "", veinIntensity ? `${veinIntensity}결` : ""]
    : [];

  return {
    colors,
    patterns,
    motifs,
    shapes,
    material,
    surface,
    patternScale,
    patternFlow,
    contrast,
    patternPresence,
    veinPresence,
    veinType,
    veinDirection,
    veinIntensity,
    keywords: normalizeKeywordList([...colors, ...patterns, ...motifs, ...shapes, ...keywords, ...veinKeywords, ...expandTileMatchKeywords([...colors, ...patterns, ...motifs, ...shapes, ...keywords, ...veinKeywords])]),
    summary: String(analysis.summary || "").trim()
  };
}

function normalizeTileFinderAnalysisOverrides(overrides) {
  const payload = overrides && typeof overrides === "object" ? overrides : {};
  const color = normalizeOptionalAnalysisText(payload.color);
  const secondaryColor = normalizeOptionalAnalysisText(payload.secondaryColor);
  const style = normalizeOptionalAnalysisText(payload.style);
  const patternPresence = normalizeTileFinderPatternPresence(payload.patternPresence);
  const veinPresence = normalizeTileVeinPresence(payload.veinPresence);
  const finish = normalizeOptionalAnalysisText(payload.finish);
  const colors = normalizeKeywordList([color, secondaryColor].filter(Boolean));
  const patterns = style ? [style] : [];
  const keywords = normalizeKeywordList([
    color,
    secondaryColor,
    style,
    patternPresence ? `무늬${patternPresence}` : "",
    veinPresence ? `베인결${veinPresence}` : "",
    finish
  ].filter(Boolean));
  return {
    colors,
    patterns,
    patternPresence,
    veinPresence,
    keywords,
    surface: finish
  };
}

function normalizeTileFinderPatternPresence(value) {
  const text = String(value || "").trim();
  if (/^있음$|있다|유|yes|pattern/i.test(text)) return "있음";
  if (/^없음$|없다|무|no|plain|solid/i.test(text)) return "없음";
  return "";
}

function normalizeTileVeinPresence(value) {
  const text = String(value || "").trim();
  if (/^있음$|있다|유|yes|present|visible/i.test(text)) return "있음";
  if (/^없음$|없다|무|no|none|absent|plain|solid/i.test(text)) return "없음";
  if (/불확실|애매|모름|unknown|uncertain/i.test(text)) return "불확실";
  return "";
}

function normalizeTileVeinType(value) {
  const text = String(value || "").trim();
  if (/마블|대리석|marble/i.test(text)) return "마블베인";
  if (/트래버틴|travertine/i.test(text)) return "트래버틴결";
  if (/우드|나뭇결|wood/i.test(text)) return "우드결";
  if (/구름|cloud/i.test(text)) return "구름결";
  if (/선형|라인|linear|line/i.test(text)) return "선형결";
  if (/스톤|석재|stone|grain|결/i.test(text)) return "스톤결";
  if (/없음|none|absent/i.test(text)) return "없음";
  if (/불확실|모름|unknown|uncertain/i.test(text)) return "불확실";
  return "";
}

function normalizeTileVeinDirection(value) {
  const text = String(value || "").trim();
  if (/세로|vertical/i.test(text)) return "세로";
  if (/가로|horizontal/i.test(text)) return "가로";
  if (/사선|대각|diagonal/i.test(text)) return "사선";
  if (/불규칙|랜덤|random|irregular/i.test(text)) return "불규칙";
  if (/없음|none|absent/i.test(text)) return "없음";
  if (/불확실|모름|unknown|uncertain/i.test(text)) return "불확실";
  return "";
}

function normalizeTileVeinIntensity(value) {
  const text = String(value || "").trim();
  if (/강함|강한|굵|볼드|strong|bold|dramatic/i.test(text)) return "강함";
  if (/보통|중간|medium|moderate/i.test(text)) return "보통";
  if (/약함|약한|잔잔|은은|미세|soft|subtle|light/i.test(text)) return "약함";
  if (/없음|none|absent/i.test(text)) return "없음";
  if (/불확실|모름|unknown|uncertain/i.test(text)) return "불확실";
  return "";
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
    [/모자이크|모자익|mosaic|mosaico/, ["모자이크", "모자익", "MOSAIC", "MOS", "시트"]],
    [/브릭|brick|subway|서브웨이|직사각|긴브릭|롱브릭|스틱|stick/, ["브릭", "서브웨이", "직사각", "긴브릭", "롱브릭", "스틱", "BRICK", "SUBWAY", "STICK"]],
    [/꽃|플라워|flower|floral/, ["꽃", "플라워", "FLOWER", "FLORAL", "ART", "패턴"]],
    [/선형|라인|줄무늬|반복라인|세로라인|가로라인|stripe|linear|line/, ["라인", "선형", "세로", "가로", "반복라인", "STRIPE", "LINE", "패턴"]],
    [/입체|3d|엠보|emboss|골지|리브|리브드|플루티드|flute|fluted|rib|웨이브|wave/, ["입체", "3D", "엠보", "골지", "리브", "플루티드", "웨이브"]],
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
  if (analysis.patternPresence === "없음") {
    if (/솔리드|무지|단색|plain|solid/i.test(text)) {
      score += 14;
      reasons.push("무늬 없음");
    }
  } else if (analysis.patternPresence === "있음") {
    if (/마블|스톤|테라조|우드|패턴|모자이크|브릭|베인|결|입자|점박이|기하학|라인|나뭇결|marble|stone|terrazzo|wood|pattern|mosaic|brick|vein|grain/i.test(text)) {
      score += 10;
      reasons.push("무늬 있음");
    }
  }

  const veinScore = scoreTileVeinProfile(product, analysis);
  score += veinScore.score;
  reasons.push(...veinScore.reasons);

  const shapeIntent = getTileImageShapeIntent(analysis);
  if (shapeIntent.active) {
    const shapeMatch = scoreProductShapeAgainstIntent(product, shapeIntent);
    if (shapeMatch.score > 0) {
      score += shapeMatch.score;
      reasons.push(...shapeMatch.reasons);
    } else {
      score -= shapeIntent.strict ? 28 : 10;
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

function scoreTileVeinProfile(product, analysis) {
  const presence = normalizeTileVeinPresence(analysis?.veinPresence);
  if (!presence || presence === "불확실") return { score: 0, reasons: [] };

  const text = normalizeMatchText([
    product?.name,
    product?.modelName,
    product?.patternCategory,
    product?.features,
    product?.option,
    product?.material
  ].filter(Boolean).join(" "));
  const patternCategory = normalizeMatchText(product?.patternCategory);
  const reasons = [];
  let score = 0;
  const hasExplicitVein = /베인|vein|veincut|베인컷|칼라카타|카라라|스타투아리오|아라베스카토|판다|오닉스|onyx/.test(text);
  const hasVeinStyle = /마블|대리석|marble|트래버틴|트라버틴|travertine/.test(text)
    || /마블|트래버틴/.test(patternCategory);
  const hasNaturalGrain = /스톤|석재|stone|라임스톤|limestone|슬레이트|slate|우드|나뭇결|wood|grain|결/.test(text);
  const isPlain = /솔리드|무지|민무늬|단색|plain|solid/.test(text)
    || patternCategory === normalizeMatchText("솔리드");

  if (presence === "있음") {
    if (hasExplicitVein) {
      score += 34;
      reasons.push("베인·결 있음 일치");
    } else if (hasVeinStyle) {
      score += 24;
      reasons.push("베인 계열 스타일");
    } else if (hasNaturalGrain) {
      score += 12;
      reasons.push("자연 결 계열");
    }
    if (isPlain) score -= 24;
  } else if (presence === "없음") {
    if (hasExplicitVein) score -= 30;
    else if (hasVeinStyle) score -= 20;
    if (isPlain) {
      score += 18;
      reasons.push("베인·결 없음 일치");
    }
  }

  const direction = normalizeTileVeinDirection(analysis?.veinDirection);
  if (presence === "있음" && direction && !["없음", "불확실"].includes(direction)) {
    const directionPatterns = {
      세로: /세로|vertical|종방향/,
      가로: /가로|horizontal|횡방향/,
      사선: /사선|대각|diagonal/,
      불규칙: /불규칙|랜덤|random|irregular|자연결/
    };
    if (directionPatterns[direction]?.test(text)) {
      score += 10;
      reasons.push(`결 방향 ${direction}`);
    }
  }

  const intensity = normalizeTileVeinIntensity(analysis?.veinIntensity);
  if (presence === "있음" && intensity === "강함" && /강한|굵은|볼드|대비|strong|bold|dramatic/.test(text)) {
    score += 8;
    reasons.push("강한 베인");
  } else if (presence === "있음" && intensity === "약함" && /잔잔|은은|미세|잔결|soft|subtle/.test(text)) {
    score += 8;
    reasons.push("은은한 결");
  }

  return { score, reasons };
}

function selectShapeFirstMatches(matches, analysis) {
  const shapeIntent = getTileImageShapeIntent(analysis);
  if (!shapeIntent.active) return matches;

  const shapedMatches = matches
    .map((entry) => {
      const shapeMatch = scoreProductShapeAgainstIntent(entry.product, shapeIntent);
      return {
        ...entry,
        tileShapeScore: shapeMatch.score,
        reasons: shapeMatch.score > 0
          ? [...new Set([...(shapeMatch.reasons || []), ...(entry.reasons || [])])]
          : entry.reasons
      };
    })
    .filter((entry) => entry.tileShapeScore > 0);

  if (!shapedMatches.length) return matches;

  const strongMatches = shapedMatches.filter((entry) => entry.tileShapeScore >= 70);
  const selected = strongMatches.length ? strongMatches : shapedMatches;
  return selected.map((entry) => ({
    ...entry,
    score: entry.score + entry.tileShapeScore + getShapeFirstColorBonus(entry.product, analysis)
  }));
}

function getTileImageShapeIntent(analysis) {
  const raw = normalizeMatchText([
    ...(analysis.shapes || []),
    ...(analysis.motifs || []),
    ...(analysis.patterns || []),
    ...(analysis.keywords || []),
    analysis.summary,
    analysis.patternScale,
    analysis.patternFlow
  ].filter(Boolean).join(" "));
  const active = /모자이크|모자익|mosaic|브릭|brick|직사각|긴브릭|롱브릭|스틱|stick|서브웨이|subway|라인|선형|줄무늬|세로|가로|반복라인|입체|3d|엠보|골지|리브|플루티드|웨이브/.test(raw);
  return {
    active,
    mosaic: /모자이크|모자익|mosaic/.test(raw),
    longBrick: /긴브릭|롱브릭|직사각|브릭|brick|스틱|stick|서브웨이|subway/.test(raw),
    linear: /라인|선형|줄무늬|세로|가로|반복라인|stripe|linear|line/.test(raw),
    relief: /입체|3d|엠보|골지|리브|플루티드|웨이브|wave|rib|flute/.test(raw),
    strict: /모자이크|모자익|mosaic/.test(raw) && /긴브릭|롱브릭|직사각|브릭|brick|스틱|stick|라인|선형|세로|가로|반복라인/.test(raw)
  };
}

function scoreProductShapeAgainstIntent(product, intent) {
  if (!intent?.active) return { score: 0, reasons: [] };

  const text = normalizeMatchText([
    product?.name,
    product?.modelName,
    product?.option,
    product?.features,
    product?.patternCategory,
    product?.material,
    product?.size
  ].filter(Boolean).join(" "));
  const reasons = [];
  let score = 0;

  const isMosaic = /모자이크|모자익|mosaic|mosaico|시트|sheet|직각모자이크|정각모자이크|원형모자이크|육각모자이크|랜턴모자이크/.test(text);
  const isLongBrickModule = hasLongBrickProductModule(product);
  const isLongBrick = /긴브릭|롱브릭|직사각|직사각모자|브릭|brick|subway|서브웨이|스틱|stick|막대|g145|g445|g72|g68|eom2101|eom2141|eom/.test(text)
    || isLongBrickModule
    || hasLongRectangularTilePiece(product, isMosaic);
  const isLinear = isLongBrickModule || /라인|선형|줄|줄무늬|세로|가로|stripe|linear|line|스틱|stick|직사각|브릭/.test(text);
  const isRelief = /입체|3d|엠보|emboss|골지|리브|리브드|플루티드|flute|fluted|rib|웨이브|wave/.test(text);

  if (intent.mosaic) {
    if (isMosaic) {
      score += 46;
      reasons.push("형태일치: 모자이크");
    } else if (isLongBrickModule) {
      score += 28;
      reasons.push("형태일치: 긴 브릭 모듈");
    } else if (intent.strict) {
      return { score: 0, reasons: [] };
    }
  }
  if (intent.longBrick) {
    if (isLongBrick) {
      score += 42;
      reasons.push("형태일치: 긴 브릭/직사각");
    } else if (intent.strict) {
      return { score: 0, reasons: [] };
    }
  }
  if (intent.linear && isLinear) {
    score += 18;
    reasons.push("형태일치: 반복 라인");
  }
  if (intent.relief && isRelief) {
    score += 22;
    reasons.push("형태일치: 입체/웨이브");
  }
  if (intent.strict && (isMosaic || isLongBrickModule) && isLongBrick) score += 24;

  return { score, reasons };
}

function hasLongRectangularTilePiece(product, isMosaic = false) {
  const text = String([
    product?.name,
    product?.modelName,
    product?.features,
    product?.unit,
    product?.option
  ].filter(Boolean).join(" "));
  const tilePieceMatches = [...text.matchAll(/(?:TILE|타일)\s*(\d{2,4})\s*[x×*]\s*(\d{2,4})/gi)];
  for (const match of tilePieceMatches) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (!a || !b) continue;
    const longSide = Math.max(a, b);
    const shortSide = Math.min(a, b);
    if (shortSide > 0 && longSide / shortSide >= 2.2) return true;
  }

  if (!isMosaic) return false;
  const matches = [...String(product?.size || "").matchAll(/(\d{2,4})\s*[x×*]\s*(\d{2,4})/gi)];
  for (const match of matches) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (!a || !b) continue;
    const longSide = Math.max(a, b);
    const shortSide = Math.min(a, b);
    if (shortSide > 0 && longSide <= 320 && longSide / shortSide >= 2.2) return true;
  }
  return false;
}

function hasLongBrickProductModule(product) {
  const dimensionPairs = collectProductDimensionPairs(product);
  for (const [a, b] of dimensionPairs) {
    const longSide = Math.max(a, b);
    const shortSide = Math.min(a, b);
    if (!longSide || !shortSide) continue;
    if (shortSide <= 80 && longSide >= 120 && longSide <= 420 && longSide / shortSide >= 2.4) {
      return true;
    }
  }
  return false;
}

function collectProductDimensionPairs(product) {
  const text = [
    product?.size,
    product?.name,
    product?.modelName,
    product?.features,
    product?.unit,
    product?.option
  ].filter(Boolean).join(" ");
  const pairs = [];
  for (const match of String(text).matchAll(/(\d{2,4})\s*[x×*]\s*(\d{2,4})/gi)) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (a && b) pairs.push([a, b]);
  }
  return pairs;
}

function getShapeFirstColorBonus(product, analysis) {
  const colorTokens = normalizeKeywordList([
    ...(analysis.colors || []),
    ...expandTileMatchKeywords(analysis.colors || [])
  ]).map(normalizeMatchText).filter((token) => token.length >= 2);
  if (!colorTokens.length) return 0;
  const text = normalizeMatchText([
    product?.name,
    product?.color,
    product?.features,
    product?.option,
    product?.patternCategory
  ].filter(Boolean).join(" "));
  return colorTokens.some((token) => text.includes(token)) ? 36 : 0;
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

  if (analysis.patternPresence && !productMatchesTileFinderPatternPresence(product, analysis.patternPresence)) {
    return false;
  }

  return true;
}

function productMatchesTileFinderPatternPresence(product, requestedPresence) {
  const requested = normalizeTileFinderPatternPresence(requestedPresence);
  if (!requested) return true;
  const productPresence = getProductTileFinderPatternPresence(product);
  if (!productPresence) return true;
  return productPresence === requested;
}

function getProductTileFinderPatternPresence(product) {
  const explicit = normalizeTileFinderPatternPresence(
    product?.patternPresence
    || product?.pattern_presence
    || product?.patternYn
    || product?.hasPattern
    || product?.patternType
  );
  return explicit || "";
}

function normalizeTileFinderBrandFilter(value) {
  const text = normalizeMatchText(value);
  if (!text || text === "all" || text === "전체" || text === "전체브랜드") return "";
  return text;
}

function getTileFinderBrandTexts(product) {
  return [
    product?.maker,
    product?.sourceCategoryName,
    product?.catalogSource,
    product?.sourceSite
  ].map((value) => String(value || "").trim()).filter(Boolean);
}

function productMatchesTileFinderBrand(product, normalizedBrand) {
  if (!normalizedBrand) return true;
  return getTileFinderBrandTexts(product).some((value) => normalizeMatchText(value) === normalizedBrand);
}

function normalizeTileFinderApplication(value) {
  const text = normalizeMatchText(value);
  if (!text) return "";
  if (/바닥|floor|flooring/.test(text)) return "floor";
  if (/벽|wall/.test(text)) return "wall";
  return "";
}

function getTileFinderApplicationText(product) {
  return normalizeMatchText([
    product?.application,
    product?.usage,
    product?.use,
    product?.installLocation,
    product?.category,
    product?.kind,
    product?.name,
    product?.option,
    product?.material,
    product?.surface,
    product?.finish,
    product?.features,
    product?.sourceCategoryName
  ].filter(Boolean).join(" "));
}

function productMatchesTileFinderApplication(product, requestedApplication) {
  if (!requestedApplication) return true;
  const text = getTileFinderApplicationText(product);
  const isBoth = /벽바닥|벽및바닥|벽용바닥용|벽겸용|바닥겸용|겸용|wallfloor|wallandfloor|wallfloor/.test(text)
    || (/벽/.test(text) && /바닥/.test(text));
  const isFloor = isBoth || /바닥|floor|flooring|논슬립|nonslip|nonsilp|antislip|계단/.test(text);
  const isWall = isBoth || /벽|wall/.test(text);
  const hasKnownApplication = isFloor || isWall || isBoth;

  if (!hasKnownApplication) return true;

  if (requestedApplication === "floor") return isFloor;
  if (requestedApplication === "wall") return isWall || isBoth;
  return true;
}

function isTileFinderTileCandidate(product) {
  if (!isPublicCatalogProduct(product)) return false;
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
  const explicitGroups = [];
  if (/논슬립|nsp|nonslip|nonsilp|antislip/.test(explicitText)) explicitGroups.push("논슬립", "무광");
  if (/폴리싱|polishing|pol/.test(explicitText)) explicitGroups.push("폴리싱", "유광");
  if (/반무광|새틴|satin|sat/.test(explicitText)) explicitGroups.push("반무광");
  if (/유광|gloss|gls|glossy/.test(explicitText)) explicitGroups.push("유광");
  if (/러프|rough|ruf/.test(explicitText)) explicitGroups.push("러프", "무광");
  if (/무광|matte|matt/.test(explicitText)) explicitGroups.push("무광");
  if (/라파토|lappato|lapato/.test(explicitText)) explicitGroups.push("라파토");
  if (explicitGroups.length) return [...new Set(explicitGroups)];

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

async function rerankTileMatchesByLocalImage(imageDataUrl, scoredMatches, analysis) {
  if (!scoredMatches.length) return scoredMatches;

  let querySignature = null;
  try {
    querySignature = await buildTileImageSignatureFromDataUrl(imageDataUrl);
  } catch (error) {
    console.warn("[tile-image-search] uploaded image signature failed:", error.message);
    return scoredMatches;
  }
  if (!querySignature) return scoredMatches;

  const candidatePool = [...scoredMatches]
    .filter((entry) => getProductCompareImageRefs(entry.product).length)
    .sort((left, right) => right.score - left.score)
    .slice(0, tileVisualCompareLimit);
  if (!candidatePool.length) return scoredMatches;

  const deadlineAt = Date.now() + tileVisualCompareBudgetMs;
  const visualEntries = await mapWithConcurrency(candidatePool, tileVisualCompareConcurrency, async (entry) => {
    if (Date.now() >= deadlineAt) return null;
    try {
      const best = await getBestProductImageVisualMatch(querySignature, entry.product, {
        maxRefs: 1,
        deadlineAt
      });
      if (!best) return null;
      return {
        id: String(entry.product.id),
        ...best
      };
    } catch {
      return null;
    }
  });

  const visualById = new Map(
    visualEntries
      .filter(Boolean)
      .map((entry) => [entry.id, entry])
  );
  if (!visualById.size) return scoredMatches;

  const deepCandidates = candidatePool
    .filter((entry) => visualById.has(String(entry.product.id)))
    .sort((left, right) => {
      const leftVisual = Number(visualById.get(String(left.product.id))?.visual?.score || 0);
      const rightVisual = Number(visualById.get(String(right.product.id))?.visual?.score || 0);
      return rightVisual - leftVisual || right.score - left.score;
    })
    .slice(0, tileVisualDeepCompareLimit);

  if (deepCandidates.length && Date.now() < deadlineAt) {
    const deepEntries = await mapWithConcurrency(
      deepCandidates,
      Math.min(tileVisualCompareConcurrency, 12),
      async (entry) => {
        if (Date.now() >= deadlineAt) return null;
        try {
          const best = await getBestProductImageVisualMatch(querySignature, entry.product, {
            maxRefs: tileProductImageCompareLimit,
            deadlineAt
          });
          return best ? { id: String(entry.product.id), ...best } : null;
        } catch {
          return null;
        }
      }
    );
    for (const entry of deepEntries.filter(Boolean)) {
      const current = visualById.get(entry.id);
      if (!current || Number(entry.visual?.score || 0) >= Number(current.visual?.score || 0)) {
        visualById.set(entry.id, entry);
      }
    }
  }

  return scoredMatches.map((entry) => {
    const visualEntry = visualById.get(String(entry.product.id));
    if (!visualEntry) return entry;
    const visual = visualEntry.visual;
    const shapeIntent = getTileImageShapeIntent(analysis);
    const shapeMatch = scoreProductShapeAgainstIntent(entry.product, shapeIntent);
    const visualScore = Number(visual.score || 0);
    const exactImageBonus = visualScore >= 99
      && Number(visual.colorScore || 0) >= 99
      && Number(visual.textureScore || 0) >= 99
      ? 300
      : 0;
    const score = (entry.score * 0.35)
      + (visualScore * 1.25)
      + (Number(visual.colorScore || 0) * 0.25)
      + (Number(visual.textureScore || 0) * 0.15)
      + (shapeMatch.score * 0.35)
      + exactImageBonus;
    const veinReasons = (entry.reasons || []).filter((reason) => /베인|결 방향|자연 결|강한 베인|은은한 결/.test(reason));
    const remainingReasons = (entry.reasons || []).filter((reason) => !veinReasons.includes(reason));
    return {
      ...entry,
      score,
      imageVisualScore: visualScore,
      imageColorScore: visual.colorScore,
      imageTextureScore: visual.textureScore,
      reasons: [
        `이미지유사도 ${Math.round(visualScore)}`,
        `색상이미지 ${Math.round(visual.colorScore)}`,
        `패턴이미지 ${Math.round(visual.textureScore)}`,
        ...veinReasons,
        exactImageBonus ? getTileImageExactMatchReason(visualEntry.ref) : "",
        ...remainingReasons
      ].filter(Boolean)
    };
  });
}

async function buildTileImageSignatureFromDataUrl(imageDataUrl) {
  const parsed = parseImageDataUrl(imageDataUrl);
  if (!parsed) throw new Error("invalid image data url");
  const decoded = decodeImageBuffer(parsed.buffer, parsed.mimeType);
  return buildTileImageSignature(decoded);
}

async function getBestProductImageVisualMatch(querySignature, product, options = {}) {
  const maxRefs = Math.max(1, Number(options.maxRefs || tileProductImageCompareLimit));
  const deadlineAt = Number(options.deadlineAt || 0);
  const imageRefs = getProductCompareImageRefs(product).slice(0, maxRefs);
  if (!imageRefs.length) return null;
  let best = null;
  for (const ref of imageRefs) {
    if (deadlineAt && Date.now() >= deadlineAt) break;
    try {
      const productSignature = await getProductImageSignatureByUrl(ref.url, { deadlineAt });
      if (!productSignature) continue;
      const visual = compareTileImageSignatures(querySignature, productSignature);
      if (!best || Number(visual.score || 0) > Number(best.visual?.score || 0)
        || (Number(visual.score || 0) === Number(best.visual?.score || 0)
          && Number(ref.priority || 0) < Number(best.ref?.priority || 0))) {
        best = { visual, ref };
      }
    } catch {
      // Ignore individual product image failures and keep comparing the rest.
    }
  }
  return best;
}

async function getProductImageSignatureByUrl(imageUrl, options = {}) {
  if (!imageUrl) return null;
  if (tileImageSignatureCache.has(imageUrl)) {
    const cached = tileImageSignatureCache.get(imageUrl);
    tileImageSignatureCache.delete(imageUrl);
    tileImageSignatureCache.set(imageUrl, cached);
    return cached;
  }

  const deadlineAt = Number(options.deadlineAt || 0);
  const remainingMs = deadlineAt ? Math.max(1, deadlineAt - Date.now()) : tileImageFetchTimeoutMs;
  if (deadlineAt && remainingMs <= 1) return null;
  const bufferInfo = await readImageBuffer(imageUrl, Math.min(tileImageFetchTimeoutMs, remainingMs));
  const decoded = decodeImageBuffer(bufferInfo.buffer, bufferInfo.mimeType);
  const signature = buildTileImageSignature(decoded);
  tileImageSignatureCache.set(imageUrl, signature);
  while (tileImageSignatureCache.size > tileImageSignatureLimit) {
    const firstKey = tileImageSignatureCache.keys().next().value;
    tileImageSignatureCache.delete(firstKey);
  }
  return signature;
}

function getProductCompareImageRefs(product) {
  const indexedRefs = getIndexedProductImageRefs(product);
  if (indexedRefs.length) {
    return selectProductCompareImageRefs(indexedRefs, tileProductImageCompareLimit);
  }

  const refs = [];
  const seen = new Set();
  const add = (url, role, priority) => {
    const normalized = String(url || "").trim();
    if (!normalized || seen.has(normalized)) return;
    if (!/^https?:\/\//i.test(normalized) && !/^data:image\//i.test(normalized)) return;
    seen.add(normalized);
    refs.push({ url: normalized, role, priority });
  };

  add(product?.image, "primary", 0);
  add(product?.originalImage, "primary", 1);

  const imageUrls = Array.isArray(product?.imageUrls) ? product.imageUrls : [];
  for (const url of imageUrls) {
    const role = getProductCompareImageRole(url);
    add(url, role, getProductCompareImagePriority(role));
  }

  add(product?.detailImage, "detail", 8);
  add(product?.closeImage, "detail", 9);
  add(product?.daylightImage, "detail", 10);
  add(product?.fluorescentImage, "detail", 11);
  add(product?.sceneImage, "detail", 12);

  return selectProductCompareImageRefs(refs, tileProductImageCompareLimit);
}

function getIndexedProductImageRefs(product) {
  const productId = String(product?.id || "").trim();
  if (!productId) return [];
  const index = getProductImageIndexByProductId();
  const refs = index.get(productId) || [];
  return refs.map((ref) => ({
    url: ref.url,
    role: ref.role,
    priority: Number(ref.priority) || getProductCompareImagePriority(ref.role),
    sourceField: ref.sourceField || "product-images"
  }));
}

function getProductImageIndexByProductId() {
  try {
    const stat = fs.statSync(productImagesPath);
    if (productImageIndexCache && productImageIndexMtimeMs === stat.mtimeMs) {
      return productImageIndexCache;
    }
    const payload = JSON.parse(fs.readFileSync(productImagesPath, "utf8"));
    const images = Array.isArray(payload?.images) ? payload.images : [];
    const next = new Map();
    for (const image of images) {
      const productId = String(image?.productId || "").trim();
      const url = String(image?.url || "").trim();
      if (!productId || !url) continue;
      if (!next.has(productId)) next.set(productId, []);
      next.get(productId).push({
        url,
        role: String(image?.role || getProductCompareImageRole(url)).trim(),
        priority: Number(image?.priority) || getProductCompareImagePriority(image?.role),
        sourceField: String(image?.sourceField || "").trim()
      });
    }
    for (const refs of next.values()) {
      refs.sort((left, right) => left.priority - right.priority || left.url.localeCompare(right.url));
    }
    productImageIndexCache = next;
    productImageIndexMtimeMs = stat.mtimeMs;
    return productImageIndexCache;
  } catch {
    productImageIndexCache = new Map();
    productImageIndexMtimeMs = 0;
    return productImageIndexCache;
  }
}

function selectProductCompareImageRefs(refs, limit) {
  const sorted = [...refs].sort((left, right) => left.priority - right.priority);
  const selected = [];
  const take = (predicate, maxCount) => {
    for (const ref of sorted) {
      if (selected.length >= limit) return;
      if (selected.includes(ref) || !predicate(ref)) continue;
      selected.push(ref);
      maxCount -= 1;
      if (maxCount <= 0) return;
    }
  };

  take((ref) => ref.role === "primary", 1);
  take((ref) => ref.role === "large", 2);
  take((ref) => ref.role === "detail", 2);
  take((ref) => ref.role === "scene", 2);
  take(() => true, limit);
  return selected.slice(0, limit);
}

function getProductCompareImageRole(url) {
  const text = String(url || "").toLowerCase();
  if (/\/(?:origin|detail|editor)\//.test(text)) return "detail";
  if (/\/uploads\/product\/[^/]+\.(?:jpe?g|png|webp)(?:\?|$)/.test(text)) return "detail";
  if (/\/750\//.test(text)) return "large";
  if (/\/320\//.test(text)) return "scene";
  if (/\/80\//.test(text)) return "thumb";
  return "detail";
}

function getProductCompareImagePriority(role) {
  if (role === "large") return 3;
  if (role === "detail") return 4;
  if (role === "scene") return 5;
  if (role === "thumb") return 20;
  return 12;
}

function getTileImageExactMatchReason(ref) {
  return ref?.role === "primary" ? "대표이미지 일치" : "상세이미지 일치";
}

function parseImageDataUrl(value) {
  const match = String(value || "").match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mimeType: normalizeImageContentType(match[1]),
    buffer: Buffer.from(match[2], "base64")
  };
}

async function readImageBuffer(imageUrl, timeoutMs = tileImageFetchTimeoutMs) {
  const url = String(imageUrl || "").trim();
  if (/^data:image\//i.test(url)) {
    const parsed = parseImageDataUrl(url);
    if (!parsed) throw new Error("invalid product data image");
    return parsed;
  }
  if (!/^https?:\/\//i.test(url)) throw new Error("unsupported product image url");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(250, Number(timeoutMs) || tileImageFetchTimeoutMs));
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`image fetch failed ${response.status}`);
    return {
      mimeType: normalizeImageContentType(response.headers.get("content-type") || "image/jpeg"),
      buffer: Buffer.from(await response.arrayBuffer())
    };
  } finally {
    clearTimeout(timeout);
  }
}

function decodeImageBuffer(buffer, mimeType) {
  const type = normalizeImageContentType(mimeType);
  if (type === "image/png") {
    const png = PNG.sync.read(buffer);
    return {
      width: png.width,
      height: png.height,
      data: png.data
    };
  }
  try {
    const jpg = jpeg.decode(buffer, { useTArray: true });
    return {
      width: jpg.width,
      height: jpg.height,
      data: jpg.data
    };
  } catch (jpegError) {
    try {
      const png = PNG.sync.read(buffer);
      return {
        width: png.width,
        height: png.height,
        data: png.data
      };
    } catch {
      throw jpegError;
    }
  }
}

function buildTileImageSignature(image) {
  const width = Number(image?.width) || 0;
  const height = Number(image?.height) || 0;
  const data = image?.data;
  if (!width || !height || !data) throw new Error("image decode failed");

  const gridSize = 16;
  const grid = [];
  const gray = [];
  const histogram = Array.from({ length: 64 }, () => 0);
  let rTotal = 0;
  let gTotal = 0;
  let bTotal = 0;
  let count = 0;

  const crop = getCenteredImageCrop(width, height);
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const px = Math.min(width - 1, Math.max(0, Math.floor(crop.left + ((x + 0.5) / gridSize) * crop.width)));
      const py = Math.min(height - 1, Math.max(0, Math.floor(crop.top + ((y + 0.5) / gridSize) * crop.height)));
      const index = (py * width + px) * 4;
      const alpha = data[index + 3] == null ? 255 : data[index + 3];
      if (alpha < 8) continue;
      const r = data[index] || 0;
      const g = data[index + 1] || 0;
      const b = data[index + 2] || 0;
      grid.push(r / 255, g / 255, b / 255);
      gray.push(((r * 0.299) + (g * 0.587) + (b * 0.114)) / 255);
      rTotal += r;
      gTotal += g;
      bTotal += b;
      count += 1;
      const rBin = Math.min(3, Math.floor(r / 64));
      const gBin = Math.min(3, Math.floor(g / 64));
      const bBin = Math.min(3, Math.floor(b / 64));
      histogram[(rBin * 16) + (gBin * 4) + bBin] += 1;
    }
  }
  if (!count) throw new Error("empty image signature");
  for (let i = 0; i < histogram.length; i += 1) histogram[i] /= count;

  let verticalEdge = 0;
  let horizontalEdge = 0;
  let edgeCount = 0;
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const value = gray[y * gridSize + x] || 0;
      if (x + 1 < gridSize) {
        verticalEdge += Math.abs(value - (gray[y * gridSize + x + 1] || 0));
        edgeCount += 1;
      }
      if (y + 1 < gridSize) {
        horizontalEdge += Math.abs(value - (gray[(y + 1) * gridSize + x] || 0));
      }
    }
  }

  return {
    avg: [rTotal / count, gTotal / count, bTotal / count],
    grid,
    gray,
    histogram,
    verticalEdge: verticalEdge / Math.max(1, edgeCount),
    horizontalEdge: horizontalEdge / Math.max(1, edgeCount)
  };
}

function getCenteredImageCrop(width, height) {
  const insetX = Math.floor(width * 0.04);
  const insetY = Math.floor(height * 0.04);
  return {
    left: insetX,
    top: insetY,
    width: Math.max(1, width - (insetX * 2)),
    height: Math.max(1, height - (insetY * 2))
  };
}

function compareTileImageSignatures(left, right) {
  const avgDistance = colorDistance(left.avg, right.avg);
  const avgColorScore = clampScore(100 - ((avgDistance / 441.7) * 100));
  let histogramIntersection = 0;
  for (let i = 0; i < left.histogram.length; i += 1) {
    histogramIntersection += Math.min(left.histogram[i] || 0, right.histogram[i] || 0);
  }
  const histogramScore = clampScore(histogramIntersection * 100);

  const gridLength = Math.min(left.grid.length, right.grid.length);
  let gridDistance = 0;
  for (let i = 0; i < gridLength; i += 3) {
    const dr = (left.grid[i] || 0) - (right.grid[i] || 0);
    const dg = (left.grid[i + 1] || 0) - (right.grid[i + 1] || 0);
    const db = (left.grid[i + 2] || 0) - (right.grid[i + 2] || 0);
    gridDistance += Math.sqrt((dr * dr) + (dg * dg) + (db * db));
  }
  const gridSamples = Math.max(1, gridLength / 3);
  const gridScore = clampScore(100 - ((gridDistance / gridSamples) / Math.sqrt(3) * 100));

  const verticalScore = clampScore(100 - (Math.abs(left.verticalEdge - right.verticalEdge) * 260));
  const horizontalScore = clampScore(100 - (Math.abs(left.horizontalEdge - right.horizontalEdge) * 260));
  const textureScore = clampScore((verticalScore * 0.48) + (horizontalScore * 0.52));
  const colorScore = clampScore((avgColorScore * 0.62) + (histogramScore * 0.38));
  const score = clampScore((colorScore * 0.45) + (gridScore * 0.25) + (textureScore * 0.3));
  return {
    score,
    colorScore,
    textureScore,
    gridScore
  };
}

function colorDistance(left, right) {
  const dr = (left?.[0] || 0) - (right?.[0] || 0);
  const dg = (left?.[1] || 0) - (right?.[1] || 0);
  const db = (left?.[2] || 0) - (right?.[2] || 0);
  return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
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
  const floorOrientation = String(roomContext.floorOrientation || "").trim();
  const wallOrientation = String(roomContext.wallOrientation || "").trim();
  const roomType = String(roomContext.roomType || "").trim();
  const roomTypeLabel = String(roomContext.roomTypeLabel || "").trim();
  const interiorStyle = String(roomContext.interiorStyle || "").trim();
  const interiorStyleLabel = String(roomContext.interiorStyleLabel || "").trim();
  const styleMemo = String(roomContext.styleMemo || "").trim();
  const selectedSurfaces = Array.isArray(roomContext.selectedSurfaces)
    ? roomContext.selectedSurfaces.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const parts = [];
  if (width && depth) parts.push(`floor size about ${width}m by ${depth}m`);
  if (height) parts.push(`wall height about ${height}m`);
  if (grout) parts.push(`grout joint about ${grout}mm`);
  if (floorOrientation) parts.push(`floor tile orientation: ${floorOrientation}`);
  if (wallOrientation) parts.push(`wall tile orientation: ${wallOrientation}`);
  if (footprintType) parts.push(`space layout source: ${footprintType}`);
  if (selectedSurfaces.length) parts.push(`selected target surfaces: ${selectedSurfaces.join(", ")}`);

  const instructions = [];
  if (roomType === "auto") {
    instructions.push("First identify the original site photo context before editing: bathroom, living room, kitchen, exterior facade/outdoor wall, commercial space, or another interior. Use visible fixtures, cabinets, appliances, windows, doors, drains, lighting, ceiling, facade materials, and site context to infer it.");
  } else if (roomTypeLabel) {
    instructions.push(`Treat the site photo as this space type unless the image clearly contradicts it: ${roomTypeLabel}.`);
  }

  if (interiorStyleLabel) {
    instructions.push(`Interior direction: ${interiorStyleLabel}. Use this only for believable color grading, lighting balance, material harmony, and proposal mood. Do not redesign the room, do not add unrelated furniture or decoration, and do not weaken the selected tile reference identity.`);
  }
  if (interiorStyle === "mid-century") {
    instructions.push("For mid-century direction, keep the result warm, clean, retro-modern, and balanced; use warm wood/brass/soft contrast only when already plausible from the original scene.");
  }
  if (styleMemo) {
    instructions.push(`User direction memo: ${styleMemo}. Follow it only when it does not conflict with the original site geometry or the selected tile references.`);
  }
  if (parts.length) {
    instructions.push(`Use these room measurements and selection hints as scale guidance for perspective and tile module density: ${parts.join(", ")}.`);
  }
  return instructions.join(" ");
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

