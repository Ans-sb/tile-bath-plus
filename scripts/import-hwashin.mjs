import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const env = await loadEnvFile(path.join(root, ".env"));
const cli = parseCliArgs(process.argv.slice(2));

const sourceName = String(cli.sourceName || cli["source-name"] || "HS").trim();
const idPrefix = String(cli.idPrefix || cli["id-prefix"] || "hwashin").trim();
const managementPrefix = String(cli.managementPrefix || cli["management-prefix"] || "HS").trim();
const mergeExistingProducts = String(cli.merge || "true") !== "false" && String(cli.replace || "false") !== "true";
const detailConcurrency = Math.max(1, Math.min(40, Number(cli.concurrency || 25) || 25));
const requestTimeoutMs = Math.max(5000, Number(cli.timeout || cli["timeout-ms"] || 25000) || 25000);
const loginUrl = firstEnvValue("hwashin_LOGIN_URL", "HWASHIN_LOGIN_URL") || "https://www.myhwashin.com/front/main";
const userId = firstEnvValue("hwashin_USER_ID", "HWASHIN_USER_ID");
const password = firstEnvValue("hwashin_PASSWORD", "HWASHIN_PASSWORD");
const productsPath = path.join(root, "data", "products.json");
const outputDir = path.join(root, "outputs", "hwashin-import");
const resultPath = path.join(outputDir, `${idPrefix}-products-${timestamp()}.json`);

const CATEGORIES = [
  { code: "10", label: "HS CERAMIC" },
  { code: "20", label: "HS HIGH-END" },
  { code: "30", label: "CLINS" },
  { code: "40", label: "LAUCHE" },
  { code: "50", label: "부자재" },
  { code: "60", label: "LAUCHE TILE" }
];

if (!userId || !password) {
  throw new Error("hwashin_USER_ID 또는 hwashin_PASSWORD가 .env에 필요합니다.");
}

await fs.mkdir(outputDir, { recursive: true });

const session = createHwashinSession();
await login(session);

const discovered = new Map();
for (const category of CATEGORIES) {
  const listPage = await session.fetchText(`/front/product/product_lists?sh_category1_cd=${encodeURIComponent(category.code)}`);
  const listCount = parseListCount(listPage);
  const pages = Math.max(1, Math.ceil(listCount / 20));
  console.log(`[list] ${category.label} count=${listCount || "unknown"} pages=${pages}`);

  let emptyPages = 0;
  for (let page = 1; page <= Math.max(pages, 1); page += 1) {
    const html = await fetchProductListAjax(session, category, page);
    const items = parseProductList(html, category);
    if (!items.length) {
      emptyPages += 1;
      if (emptyPages >= 2 || page >= pages) break;
      continue;
    }
    emptyPages = 0;

    let newCount = 0;
    for (const item of items) {
      const key = `${item.brandCd}-${item.sourceProductId}`;
      if (!item.sourceProductId || discovered.has(key)) continue;
      discovered.set(key, item);
      newCount += 1;
    }
    console.log(`  page=${page} items=${items.length} new=${newCount} total=${discovered.size}`);
    await sleep(60);
  }
}

const listItems = Array.from(discovered.values());
console.log(`[detail] ${listItems.length} products concurrency=${detailConcurrency}`);
const detailSessions = await Promise.all(Array.from({ length: detailConcurrency }, async () => {
  const detailSession = createHwashinSession();
  await login(detailSession);
  return detailSession;
}));

const products = [];
let completed = 0;
await mapWithConcurrency(listItems, detailConcurrency, async (item, workerIndex) => {
  const detailSession = detailSessions[workerIndex] || session;
  let detail = {};
  let stockDetail = {};
  try {
    const stockHtml = await fetchStockHtml(detailSession, item);
    detail = parseProductDetail(stockHtml, item);
    stockDetail = parseStockHtml(stockHtml);
  } catch (error) {
    stockDetail = { stockError: error.message };
  }

  products.push(mapHwashinToAppProduct({ ...item, ...detail, ...stockDetail }));
  completed += 1;
  if (completed % 25 === 0 || completed === listItems.length) {
    console.log(`  detail=${completed}/${listItems.length}`);
  }
});

products.sort((a, b) => {
  const source = String(a.catalogSource || "").localeCompare(String(b.catalogSource || ""), "ko");
  if (source) return source;
  const category = String(a.option || "").localeCompare(String(b.option || ""), "ko");
  if (category) return category;
  return String(a.name || "").localeCompare(String(b.name || ""), "ko");
});

await fs.writeFile(resultPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
const finalProducts = mergeExistingProducts
  ? mergeProducts(await readJsonArray(productsPath), products)
  : products;
await fs.writeFile(productsPath, `${JSON.stringify(finalProducts, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  sourceName,
  idPrefix,
  mergeExistingProducts,
  discovered: listItems.length,
  imported: products.length,
  withImages: products.filter((product) => product.image).length,
  withCostPrice: products.filter((product) => Number(product.costPrice || 0) > 0).length,
  withStock: products.filter((product) => Number(product.stockQty || 0) > 0).length,
  finalProductCount: finalProducts.length,
  resultPath,
  productsPath
}, null, 2));

async function login(session) {
  const loginPage = await session.fetchText("/front/login/login");
  const loginToken = session.csrfToken || extractCsrfToken(loginPage);
  const responseText = await session.postFormText("/front/auth/login_check", {
    witplus_csrf_token: loginToken,
    recaptcha_yn: "N",
    captcha: "",
    prev_url: "",
    login_user_id: userId,
    login_passwd: password
  });

  let loginResponse = {};
  try {
    loginResponse = JSON.parse(responseText);
  } catch {
    loginResponse = {};
  }
  if (loginResponse.status && loginResponse.status !== "Y") {
    throw new Error(`화신세라믹 로그인 실패: ${loginResponse.msg || "응답 상태가 올바르지 않습니다."}`);
  }

  const home = await session.fetchText(loginResponse.url || "/front/main");
  if (!/로그아웃|마이페이지|mypage|logout/i.test(home)) {
    throw new Error("화신세라믹 로그인 확인에 실패했습니다.");
  }
}

async function fetchProductListAjax(session, category, page) {
  return await session.postFormText("/front/product/product_list_ajax", {
    witplus_csrf_token: session.currentCsrf(),
    page: String(page),
    page_mode: page > 1 ? "add" : "",
    sh_category1_cd: category.code,
    sh_category2_cd: "",
    sh_category3_cd: "",
    sh_order_by: "",
    sh_dtl_code: ""
  });
}

async function fetchStockHtml(session, item) {
  return await session.postFormText("/front/product/product_stock_ajax", {
    witplus_csrf_token: session.currentCsrf(),
    product_cd: item.sourceProductId,
    brand_cd: item.brandCd
  });
}

function parseProductList(html, category) {
  const products = [];
  const itemRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = itemRegex.exec(html))) {
    const block = match[1];
    const detailPath = decodeHtmlEntities(findFirst(block, /href=['"]([^'"]*product_view_detail[^'"]+)['"]/i));
    const sourceProductId = findFirst(detailPath, /product_cd=([^&"']+)/i);
    const brandCd = findFirst(detailPath, /brand_cd=([^&"']+)/i);
    if (!sourceProductId || !brandCd) continue;

    const title = cleanHtml(findFirst(block, /<span class=["']tit["']>([\s\S]*?)<\/span>/i));
    const rawName = findFirst(block, /<span class=["']name["']>([\s\S]*?)<\/span>/i);
    const name = cleanHtml(rawName);
    const size = cleanHtml(findFirst(block, /<span class=["']size["']>([\s\S]*?)<\/span>/i));
    const imageUrl = absolutizeUrl(findFirst(block, /<img\b[^>]*src=['"]([^'"]+)['"]/i));
    const salePrice = Number((findFirst(block, /popup_btn\(['"][^'"]+['"]\s*,\s*['"][^'"]+['"]\s*,\s*['"]?([\d,]+)/i)
      || findFirst(block, /<span class=["']price["']>([\s\S]*?)<\/span>/i)).replace(/[^\d]/g, "")) || 0;

    products.push({
      sourceProductId,
      brandCd,
      sourceProductKey: `${brandCd}-${sourceProductId}`,
      title,
      name,
      size,
      imageUrl,
      thumbnailUrl: imageUrl,
      listSalePrice: salePrice,
      detailPath,
      sourceUrl: sessionAbsoluteUrl(detailPath),
      categoryCode: category.code,
      categoryName: category.label,
      sourceCategoryCode: category.code,
      sourceCategoryName: category.label
    });
  }
  return products;
}

function parseProductDetail(html, item) {
  const detail = {};
  const titleBlock = findFirst(html, /<p class=["']tit["']>([\s\S]*?)<\/p>/i);
  const titleText = titleBlock ? cleanHtml(titleBlock) : "";
  detail.name = cleanHtml(titleText.replace(/\s+\/\s+.*$/, "")) || item.name;

  const breadcrumb = cleanHtml(findFirst(html, /<div class=["']breadcrumb["'][\s\S]*?<\/div>/i));
  if (breadcrumb) detail.breadcrumb = breadcrumb;

  const tableHtml = findFirst(html, /<tbody id=["']mytbl["']>([\s\S]*?)<\/tbody>/i) || html;
  const rowRegex = /<tr\b[^>]*>\s*<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let row;
  while ((row = rowRegex.exec(tableHtml))) {
    const key = cleanHtml(row[1]).replace(/\s+/g, "");
    const value = cleanHtml(row[2]);
    if (!key || value === "-") continue;
    if (key.includes("브랜드")) detail.brandName = value;
    else if (key.includes("품번")) detail.modelName = value;
    else if (key.includes("분류")) detail.categoryDetail = value;
    else if (key.includes("품명")) detail.productName = value;
    else if (key.includes("규격")) detail.size = value;
    else if (key.includes("소재")) detail.material = value;
    else if (key.includes("색상")) detail.color = value;
    else if (key.includes("원산지") || key.includes("제조국")) detail.countryOfOrigin = value;
    else if (key.includes("판매단위")) detail.saleUnit = value;
    else if (/ea\/?box/i.test(key)) detail.eaPerBox = value;
    else if (/pcs\/?box/i.test(key)) detail.pcsPerBox = Number(value.replace(/[^\d.]/g, "")) || value;
    else if (/m[²2]\/?box/i.test(key) || key.includes("㎡")) detail.sqmPerBox = Number(value.replace(/[^\d.]/g, "")) || value;
    else if (key.includes("시리즈")) detail.series = value;
    else if (key.includes("무게")) detail.weight = value;
  }

  const imageUrls = unique([
    absolutizeUrl(findFirst(html, /<div class=["']img_wrap["'][\s\S]*?<img\b[^>]*src=["']([^"']+)["']/i)),
    absolutizeUrl(findFirst(html, /<div class=["']view_img["'][\s\S]*?<img\b[^>]*src=["']([^"']+)["']/i)),
    ...Array.from(html.matchAll(/<img\b[^>]*src=["']([^"']*\/uploads\/product\/(?:750|detail|editor|origin)?\/?[^"']+)["']/gi))
      .map((imageMatch) => absolutizeUrl(imageMatch[1]))
  ].filter(Boolean));
  detail.imageUrls = imageUrls.length ? imageUrls : [item.imageUrl].filter(Boolean);
  detail.imageUrl = detail.imageUrls[0] || item.imageUrl || "";

  const publicPrice = findFirst(html, /<span class=["']price["']>([\s\S]*?)<\/span>/i);
  detail.recommendedPrice = Number(publicPrice.replace(/[^\d]/g, "")) || 0;
  detail.features = cleanHtml(findFirst(html, /<div class=["']detail_inner["']>([\s\S]*?)<\/div>/i));
  return detail;
}

function parseStockHtml(html) {
  const detail = {};
  const costPriceText = cleanHtml(findFirst(html, /id=["']sale_price["'][^>]*>([\s\S]*?)<\/p>/i));
  const recommendedPriceText = cleanHtml(findFirst(html, /id=["']supply_price["'][^>]*>([\s\S]*?)<\/p>/i));
  detail.costPriceText = costPriceText;
  detail.costPrice = Number(costPriceText.replace(/[^\d]/g, "")) || 0;
  detail.recommendedPrice = Number(recommendedPriceText.replace(/[^\d]/g, "")) || detail.recommendedPrice || 0;

  const stockLocations = [];
  const headerHtml = findFirst(html, /<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
  const bodyHtml = findFirst(html, /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  const headers = Array.from(headerHtml.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)).map((match) => ({
    location: cleanHtml(match[1]),
    qtyFromData: Number(findFirst(match[1], /data-qty=["']([\d.]+)["']/i)) || 0
  }));
  const cells = Array.from(bodyHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => cleanHtml(match[1]));
  headers.forEach((header, index) => {
    const cell = cells[index] || "";
    const qty = header.qtyFromData || Number(cell.replace(/[^\d.]/g, "")) || 0;
    if (header.location || cell) {
      stockLocations.push({ location: header.location, qty, text: cell });
    }
  });

  detail.stockLocations = stockLocations;
  detail.stockQty = stockLocations.reduce((sum, stock) => sum + (Number(stock.qty) || 0), 0);
  detail.stockText = stockLocations.map((stock) => `${stock.location || "창고"} ${stock.text || stock.qty}`).join(" / ");
  const stockFeatures = cleanHtml(findFirst(html, /<div class=["']detail_inner["']>([\s\S]*?)<\/div>/i));
  if (stockFeatures) detail.stockFeatures = stockFeatures;
  return detail;
}

function mapHwashinToAppProduct(item) {
  const modelName = cleanText(item.modelName || item.name || item.productName);
  const name = cleanText(item.productName || item.name || modelName);
  const categoryName = cleanText(item.categoryDetail || item.categoryName);
  const size = normalizeSize(item.size);
  const material = cleanText(item.material) || inferMaterial(`${name} ${categoryName} ${item.sourceCategoryName}`);
  const surface = inferSurface(`${name} ${modelName} ${categoryName} ${item.features || ""}`);
  const patternCategory = classifyPatternCategory(`${name} ${modelName} ${categoryName} ${material} ${surface} ${item.features || ""}`);
  const color = cleanText(item.color) || inferColor(`${name} ${modelName}`);
  const costPrice = Number(item.costPrice || item.listSalePrice) || 0;
  const image = cleanText(item.imageUrl || item.thumbnailUrl);
  const sqmPerBox = item.sqmPerBox || "";
  const pcsPerBox = item.pcsPerBox || item.eaPerBox || "";
  const unit = [item.saleUnit, sqmPerBox ? `${sqmPerBox}㎡/box` : "", pcsPerBox ? `${pcsPerBox}pcs/box` : ""].filter(Boolean).join(" / ");
  const productType = inferProductType(`${item.sourceCategoryName} ${categoryName} ${name}`);
  const option = [item.sourceCategoryName, categoryName].filter(Boolean).join(" / ");

  return {
    id: `${idPrefix}-${item.sourceProductKey || `${item.brandCd}-${item.sourceProductId}`}`,
    managementCode: `${managementPrefix}-${item.brandCd}-${item.sourceProductId}`,
    majorCategory: sourceName,
    productType,
    kind: sourceName,
    option,
    name,
    modelName,
    size,
    material,
    patternCategory,
    finish: surface,
    surface,
    countryOfOrigin: cleanText(item.countryOfOrigin),
    maker: cleanText(item.brandName) || sourceName,
    unit,
    pcsPerBox,
    sqmPerBox,
    color,
    features: [item.sourceCategoryName, categoryName, material, surface, item.series ? `시리즈 ${item.series}` : "", item.weight ? `무게 ${item.weight}` : "", item.features || item.stockFeatures || ""].filter(Boolean).join(" / "),
    costPrice,
    retailPrice: 0,
    wholesalePrice: 0,
    gradeAPrice: "",
    gradeBPrice: "",
    gradeCPrice: "",
    stockQty: Number(item.stockQty) || 0,
    stockText: cleanText(item.stockText),
    stockLocations: item.stockLocations || [],
    image,
    imageUrls: unique([...(item.imageUrls || []), image].filter(Boolean)),
    originalImage: image,
    closeImage: "",
    detailImage: item.imageUrls?.[1] || image,
    daylightImage: "",
    fluorescentImage: "",
    sceneImage: "",
    sourceSite: "myhwashin",
    sourceUrl: item.sourceUrl,
    sourceProductId: String(item.sourceProductId || ""),
    sourceCategoryCode: String(item.sourceCategoryCode || ""),
    sourceCategoryName: cleanText(item.sourceCategoryName || item.categoryName),
    catalogSource: sourceName,
    catalogPage: 0,
    lastSyncedAt: new Date().toISOString()
  };
}

function inferProductType(source) {
  const text = String(source || "");
  if (/부자재|접착|본드|시멘트|줄눈|실리콘|방수/.test(text)) return "material";
  if (/타일|CERAMIC|HIGH-END|LAUCHE TILE|포세린|자기질|도기질|모자이크/i.test(text)) return "tile";
  return "sanitary";
}

function inferMaterial(source) {
  const text = String(source || "").toLowerCase();
  if (/포세린|porcelain|por\b/.test(text)) return "포세린";
  if (/자기질/.test(text)) return "자기질";
  if (/도기질|세라믹|ceramic/.test(text)) return "도기질";
  if (/폴리싱|polished|pol\b/.test(text)) return "폴리싱";
  if (/모자이크/.test(text)) return "모자이크";
  if (/황동|brass/.test(text)) return "황동";
  if (/스테인리스|stainless|sus|스텐/.test(text)) return "스테인리스";
  if (/스톤|stone/.test(text)) return "스톤";
  return "";
}

function inferSurface(source) {
  const text = String(source || "").toLowerCase();
  if (/논슬립|non[\s-]?slip|nsp/.test(text)) return "논슬립";
  if (/무광|matt|matte|mat\b/.test(text)) return "무광";
  if (/유광|gloss|gls/.test(text)) return "유광";
  if (/반무광|satin|sat\b/.test(text)) return "반무광";
  if (/러프|rough|ruf/.test(text)) return "러프";
  if (/폴리싱|polished/.test(text)) return "폴리싱";
  return "";
}

function classifyPatternCategory(source) {
  const text = normalizeMatchText(source);
  if (!text) return "기타";
  if (/테라조|terrazzo|입자|칩|chip|speckle|스페클/.test(text)) return "테라조";
  if (/마블|marble|카라라|carrara|calacatta|비앙코|네로|베인|vein|대리석/.test(text)) return "마블";
  if (/시멘트|cement|콘크리트|concrete|모르타르|몰탈/.test(text)) return "시멘트";
  if (/우드|wood|나뭇결|목재|오크|티크/.test(text)) return "우드";
  if (/스톤|stone|석재|라임스톤|트라버틴|travertine|슬레이트|현무/.test(text)) return "스톤";
  if (/패턴|pattern|데코|장식|꽃|플라워|라인|헥사|기하학|모자이크|mosaic|계단/.test(text)) return "패턴";
  return "솔리드";
}

function inferColor(source) {
  const text = String(source || "").toUpperCase();
  const matches = [
    ["DARK GREY", "다크그레이"],
    ["DARK GRAY", "다크그레이"],
    ["LIGHT GREY", "라이트그레이"],
    ["WHITE", "화이트"],
    ["BIANCO", "화이트"],
    ["IVORY", "아이보리"],
    ["BEIGE", "베이지"],
    ["GREY", "그레이"],
    ["GRAY", "그레이"],
    ["BLACK", "블랙"],
    ["BROWN", "브라운"],
    ["GREEN", "그린"],
    ["BLUE", "블루"],
    ["NICKEL", "니켈"],
    ["CHROME", "크롬"],
    ["GOLD", "골드"],
    ["SILVER", "실버"]
  ];
  return matches.find(([needle]) => text.includes(needle))?.[1] || "";
}

function parseListCount(html) {
  return Number((findFirst(html, /id=["']list_count["'][^>]*>([\d,]+)/i) || "").replace(/[^\d]/g, "")) || 0;
}

function normalizeSize(size) {
  return cleanText(size).replace(/[×x]/gi, "*").replace(/\s+/g, "");
}

function normalizeMatchText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "").replace(/[(){}\[\]_\-·/]/g, "");
}

function createHwashinSession() {
  const base = new URL(loginUrl);
  const origin = base.origin;
  const cookieJar = new Map();
  const session = {
    csrfToken: "",
    absoluteUrl(pathValue) {
      return new URL(pathValue, `${origin}/front/`).toString();
    },
    currentCsrf() {
      return cookieJar.get("witplus_csrf_cookie") || this.csrfToken || "";
    },
    async fetch(pathValue, options = {}) {
      const headers = new Headers(options.headers || {});
      const cookie = Array.from(cookieJar.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
      if (cookie) headers.set("Cookie", cookie);
      headers.set("User-Agent", "Mozilla/5.0 TileBathPlusImporter/1.0");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetch(new URL(pathValue, `${origin}/front/`), { ...options, headers, redirect: "manual", signal: controller.signal });
        storeCookies(response.headers, cookieJar);
        if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
          return await this.fetch(response.headers.get("location"), { method: "GET" });
        }
        if (!response.ok) throw new Error(`화신세라믹 요청 실패: ${response.status}`);
        return response;
      } finally {
        clearTimeout(timeout);
      }
    },
    async fetchText(pathValue, options = {}) {
      const text = await (await this.fetch(pathValue, options)).text();
      this.csrfToken = extractCsrfToken(text) || this.csrfToken;
      return text;
    },
    async postFormText(pathValue, form) {
      const text = await this.fetchText(pathValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: new URLSearchParams(form).toString()
      });
      return text;
    }
  };
  return session;
}

function sessionAbsoluteUrl(pathValue) {
  const base = new URL(loginUrl);
  return new URL(pathValue, `${base.origin}/front/`).toString();
}

function absolutizeUrl(value) {
  if (!value) return "";
  const base = new URL(loginUrl);
  return new URL(decodeHtmlEntities(value), `${base.origin}/front/`).toString();
}

function extractCsrfToken(html) {
  return findFirst(html, /name=["']witplus_csrf_token["']\s+value=["']([^"']+)/i)
    || findFirst(html, /value=["']([^"']+)["']\s+name=["']witplus_csrf_token["']/i)
    || findFirst(html, /<meta[^>]+name=["']witplus_csrf_token["'][^>]+content=["']([^"']+)/i);
}

function storeCookies(headers, cookieJar) {
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

async function mapWithConcurrency(items, concurrency, worker) {
  const queue = [...items];
  const workers = Array.from({ length: concurrency }, async (_, workerIndex) => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item, workerIndex);
    }
  });
  await Promise.all(workers);
}

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function mergeProducts(existingProducts, importedProducts) {
  const merged = new Map();
  for (const product of existingProducts) {
    if (product?.id) merged.set(product.id, product);
  }
  for (const product of importedProducts) {
    if (product?.id) merged.set(product.id, product);
  }
  return [...merged.values()].sort((a, b) => {
    const source = String(a.catalogSource || "").localeCompare(String(b.catalogSource || ""), "ko");
    if (source) return source;
    const category = String(a.option || "").localeCompare(String(b.option || ""), "ko");
    if (category) return category;
    return String(a.name || "").localeCompare(String(b.name || ""), "ko");
  });
}

function findFirst(text, regex) {
  const match = regex.exec(String(text || ""));
  return match ? match[1] : "";
}

function cleanHtml(value) {
  return decodeHtmlEntities(String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  const entities = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const lower = entity.toLowerCase();
    if (lower[0] === "#") {
      const code = lower[1] === "x" ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return entities[lower] || "";
  });
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function loadEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const values = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key) values[key] = value;
    }
    return values;
  } catch {
    return {};
  }
}

function parseCliArgs(args) {
  const values = {};
  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const body = arg.slice(2);
    const index = body.indexOf("=");
    if (index === -1) values[body] = "true";
    else values[body.slice(0, index)] = body.slice(index + 1);
  }
  return values;
}

function firstEnvValue(...keys) {
  for (const key of keys) {
    const value = String(env[key] || process.env[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function timestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
