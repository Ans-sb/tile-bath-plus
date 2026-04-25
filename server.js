const http = require("http");
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
const supabaseUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const supabaseSecretKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SECRET_KEY
  || ""
).trim();

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
      sendJson(response, 200, await readProducts());
      return;
    }

    if (request.method === "POST" && request.url === "/api/products") {
      const product = normalizeProduct(JSON.parse(await readRequestBody(request)));
      let products = await readProducts();
      const index = products.findIndex((item) => item.id === product.id);
      if (index >= 0) products[index] = product;
      else products.push(product);

      if (hasSupabaseConfig()) {
        await upsertProductToSupabase(product);
        products = await readProducts();
      }

      await fs.promises.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
      sendJson(response, 200, products);
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

    if (request.method === "POST" && request.url === "/api/render") {
      sendJson(response, 501, { error: "AI 실사 보정 API는 추후 연결 예정입니다." });
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
    sendJson(response, 500, { error: error.message || "서버 오류가 발생했습니다." });
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
    const remoteProducts = await readProductsFromSupabase();
    if (remoteProducts.length) return remoteProducts;
  }

  const content = await fs.promises.readFile(productsPath, "utf8");
  return JSON.parse(content);
}

function normalizeProduct(product) {
  const required = ["id", "productType", "kind", "name", "maker", "unit"];
  for (const field of required) {
    if (!String(product[field] || "").trim()) {
      throw new Error(`${field} 값이 필요합니다.`);
    }
  }

  return {
    id: String(product.id).trim(),
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
  const query = new URLSearchParams({
    select: [
      "id",
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

  const rows = await requestSupabase(`/rest/v1/products?${query.toString()}`);
  return Array.isArray(rows) ? rows.map(mapSupabaseProductToApp) : [];
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

function mapAppProductToSupabase(product) {
  return {
    id: product.id,
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
    throw new Error("사업자등록번호와 비밀번호가 필요합니다.");
  }

  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 로그인 저장소가 설정되지 않았습니다.");
  }

  const record = await readSignupRequestByBusinessNumber(businessNumber);
  if (!record || record.password !== password) {
    throw new Error("사업자등록번호 또는 비밀번호가 일치하지 않습니다.");
  }

  if (record.approvalStatus !== "승인") {
    throw new Error(`${record.companyName} 계정은 현재 가입보류 상태입니다. 업태/업종 승인 후 로그인할 수 있습니다.`);
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
    throw new Error("장바구니 저장에는 사업자등록번호가 필요합니다.");
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

async function requestSupabase(pathname, options = {}) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
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
    throw new Error(`Supabase 요청 오류 (${response.status}): ${text}`);
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
    approvalStatus: String(payload?.approvalStatus || "보류").trim(),
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
    approvalStatus: String(row.approval_status || "보류").trim(),
    businessFileName: String(row.business_file_name || "").trim(),
    submittedAt: String(row.submitted_at || "").trim()
  };
}

function normalizeCartItem(item) {
  return {
    id: String(item?.id || "").trim(),
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

  const statusText = item.b_stt || item.tax_type || "상태 확인";
  const valid = !/폐업|휴업/.test(statusText);
  return {
    valid,
    businessNumber: cleanNumber,
    status: item.b_stt || "",
    taxType: item.tax_type || "",
    message: valid
      ? `정상 사업자로 확인되었습니다. ${item.b_stt || item.tax_type || ""}`.trim()
      : `사업자 상태를 확인해주세요. ${item.b_stt || item.tax_type || ""}`.trim()
  };
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
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

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(resolved).toLowerCase()] || "application/octet-stream"
    });
    response.end(content);
  });
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
    throw new Error("서버 제어 작업이 필요합니다.");
  }

  if (action === "restart") {
    setTimeout(() => shutdownServer(false), 150);
    return { ok: true, action, message: "서버를 재시작합니다." };
  }

  if (action === "stop") {
    await fs.promises.mkdir(serverControlDir, { recursive: true });
    await fs.promises.writeFile(stopFlagPath, "stop\n", "utf8");
    setTimeout(() => shutdownServer(true), 150);
    return { ok: true, action, message: "서버를 종료합니다." };
  }

  throw new Error("지원하지 않는 서버 제어 작업입니다.");
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > bodyLimit) {
        reject(new Error("업로드 용량이 너무 큽니다."));
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
    throw new Error("제안서 생성 요청 데이터가 필요합니다.");
  }

  const proposal = payload.proposal || {};
  const summary = payload.summary || {};
  const cart = Array.isArray(payload.cart) ? payload.cart : [];
  if (!cart.length) {
    throw new Error("장바구니 상품이 있어야 프로 제안서를 만들 수 있습니다.");
  }

  return {
    proposal: {
      customerName: String(proposal.customerName || "고객님").trim(),
      customerPhone: String(proposal.customerPhone || "").trim(),
      siteAddress: String(proposal.siteAddress || "현장 주소 미입력").trim(),
      startDate: String(proposal.startDate || "").trim(),
      validDays: Number(proposal.validDays) || 14,
      proposalDate: String(proposal.proposalDate || new Date().toISOString()),
      validDate: String(proposal.validDate || new Date().toISOString()),
      memo: String(proposal.memo || "").trim()
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
      renderPointMemo: String(item.renderPointMemo || "").trim()
    }))
  };
}

function buildNarrativePlan(payload) {
  const kinds = [...new Set(payload.cart.map((item) => item.kind).filter(Boolean))];
  return [
    "# 프로 제안서 내러티브 플랜",
    "",
    `- 대상 고객: ${payload.proposal.customerName || "고객"} / ${payload.proposal.siteAddress || "현장"}`,
    "- 목적: 장바구니에 담긴 타일, 위생도기, 부자재를 전문 제안서 형태의 PPT로 정리",
    "- 톤앤매너: 인테리어 실무 제안서, 깔끔한 소재 중심 비주얼, 실제 상품 이미지 강조",
    "- 슬라이드 구성:",
    "  1. 커버",
    "  2. 프로젝트 개요 및 핵심 수치",
    "  3. 선정 제품 소개",
    "  4. 추가 선정 제품 또는 실사 보정 이미지",
    "  5. 견적 요약",
    `- 주요 분류: ${kinds.join(", ") || "선정 품목"}`,
    `- 메모: ${payload.proposal.memo || "없음"}`,
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
        reject(new Error(stderr || error.message || "프로 제안서 생성 실행에 실패했습니다."));
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
