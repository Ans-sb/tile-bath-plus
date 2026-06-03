import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const env = await loadEnvFile(path.join(root, ".env"));
const cli = parseCliArgs(process.argv.slice(2));
const envPrefix = String(cli.envPrefix || cli["env-prefix"] || "VGTILE114").trim();
const tile114UserId = firstEnvValue(`${envPrefix}_USER_ID`, "TILE114_USER_ID");
const tile114Password = firstEnvValue(`${envPrefix}_PASSWORD`, "TILE114_PASSWORD");
const tile114LoginUrl = firstEnvValue(`${envPrefix}_LOGIN_URL`, "TILE114_LOGIN_URL") || "https://vgtns.tile114.co.kr/Web/ExInDex.asp?PopTF=2";
const sourceName = String(cli.sourceName || cli["source-name"] || firstEnvValue(`${envPrefix}_SOURCE_NAME`) || inferSourceName(tile114LoginUrl)).trim();
const idPrefix = String(cli.idPrefix || cli["id-prefix"] || firstEnvValue(`${envPrefix}_ID_PREFIX`) || inferIdPrefix(tile114LoginUrl)).trim();
const managementPrefix = String(cli.managementPrefix || cli["management-prefix"] || firstEnvValue(`${envPrefix}_MANAGEMENT_PREFIX`) || inferManagementPrefix(idPrefix)).trim();
const mergeExistingProducts = String(cli.merge || "true") !== "false" && String(cli.replace || "false") !== "true";
const listMode = String(cli.listMode || cli["list-mode"] || "categories").trim().toLowerCase();
const productsPath = path.join(root, "data", "products.json");
const outputDir = path.join(root, "outputs", "tile114-import");
const resultPath = path.join(outputDir, `${idPrefix}-products-${timestamp()}.json`);

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

if (!tile114UserId || !tile114Password) {
  throw new Error(`${envPrefix}_USER_ID 또는 ${envPrefix}_PASSWORD가 .env에 필요합니다.`);
}

await fs.mkdir(outputDir, { recursive: true });

const session = createTile114Session();
await login(session);

const discovered = new Map();
if (listMode === "all" || listMode === "전체") {
  await collectAllProductList(discovered);
} else {
  await collectCategoryProductList(discovered);
}

async function collectAllProductList(discoveredProducts) {
  let previousSignature = "";
  let emptyPages = 0;
  console.log("[list] all products");

  for (const pageNumber of productPageNumbers()) {
    const html = await (await session.fetch(`/Web/product.Asp?Page=${pageNumber}`)).text();
    if (!/로그아웃|LogOutPut/i.test(html)) throw new Error("거래사이트 로그인 세션이 만료되었습니다.");
    const items = parseTile114ListProducts(html)
      .map((item) => ({ ...item, categoryCode: "", categoryName: "전체" }));
    const signature = items.map((item) => item.sourceProductId).join(",");

    if (!items.length) {
      emptyPages += 1;
      if (emptyPages >= 2) break;
      continue;
    }
    emptyPages = 0;
    if (pageNumber !== 0 && signature && signature === previousSignature) break;
    previousSignature = signature;

    let newCount = 0;
    for (const item of items) {
      if (!item.sourceProductId || discoveredProducts.has(item.sourceProductId)) continue;
      discoveredProducts.set(item.sourceProductId, item);
      newCount += 1;
    }
    console.log(`  page=${pageNumber} items=${items.length} new=${newCount} total=${discoveredProducts.size}`);
    if (newCount === 0 && pageNumber > 20) break;
    await sleep(80);
  }
}

async function collectCategoryProductList(discoveredProducts) {
  for (const [categoryCode, categoryName] of Object.entries(TILE114_CATEGORIES)) {
    let previousSignature = "";
    let emptyPages = 0;
    console.log(`[list] ${categoryCode} ${categoryName}`);

    for (const pageNumber of productPageNumbers()) {
      const html = await (await session.fetch(`/Web/product.Asp?prd_Item=${encodeURIComponent(categoryCode)}&Page=${pageNumber}`)).text();
      if (!/로그아웃|LogOutPut/i.test(html)) throw new Error("거래사이트 로그인 세션이 만료되었습니다.");
      const items = parseTile114ListProducts(html)
        .map((item) => ({ ...item, categoryCode, categoryName }));
      const signature = items.map((item) => item.sourceProductId).join(",");

      if (!items.length) {
        emptyPages += 1;
        if (emptyPages >= 2) break;
        continue;
      }
      emptyPages = 0;
      if (pageNumber !== 0 && signature && signature === previousSignature) break;
      previousSignature = signature;

      let newCount = 0;
      for (const item of items) {
        if (!item.sourceProductId || discoveredProducts.has(item.sourceProductId)) continue;
        discoveredProducts.set(item.sourceProductId, item);
        newCount += 1;
      }
      console.log(`  page=${pageNumber} items=${items.length} new=${newCount} total=${discoveredProducts.size}`);
      if (newCount === 0 && pageNumber > 20) break;
      await sleep(80);
    }
  }
}

const listItems = Array.from(discovered.values());
console.log(`[detail] ${listItems.length} products`);

const products = [];
let completed = 0;
await mapWithConcurrency(listItems, 5, async (item) => {
  const detailHtml = await (await session.fetch(`/Web/productView.asp?ItemId=${encodeURIComponent(item.sourceProductId)}`)).text();
  const detail = parseTile114ProductDetail(detailHtml);
  const product = mapTile114ToAppProduct({
    ...item,
    ...detail,
    categoryName: detail.categoryName || item.categoryName,
    sourceUrl: session.absoluteUrl(`/Web/productView.asp?ItemId=${encodeURIComponent(item.sourceProductId)}`)
  });
  products.push(product);
  completed += 1;
  if (completed % 50 === 0 || completed === listItems.length) {
    console.log(`  detail=${completed}/${listItems.length}`);
  }
  await sleep(50);
});

products.sort((a, b) => {
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
  listMode,
  mergeExistingProducts,
  discovered: listItems.length,
  imported: products.length,
  finalProductCount: finalProducts.length,
  resultPath,
  productsPath
}, null, 2));

function productPageNumbers() {
  return [0, ...Array.from({ length: 200 }, (_, index) => index + 2)];
}

async function login(session) {
  await session.fetch("/Inc/LogInOut.asp", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({
      LogOut: "0",
      mb_id: tile114UserId,
      mb_password: tile114Password
    }).toString()
  });
  const home = await (await session.fetch("/Web/product.Asp")).text();
  if (!/로그아웃|LogOutPut/i.test(home)) throw new Error("거래사이트 로그인에 실패했습니다.");
}

function mapTile114ToAppProduct(item) {
  const modelName = cleanText(item.name);
  const size = normalizeSize(item.size);
  const categoryName = cleanText(item.categoryName);
  const unit = cleanText(item.unit);
  const costPrice = Number(item.wholesalePrice) || 0;
  const stockText = cleanText(item.stockText);
  const stockQty = parseStockQty(stockText);
  const sqmPerBox = parseSquareMetersPerBox(unit);
  const pcsPerBox = parsePcsPerBox(unit);
  const surface = inferSurface(`${modelName} ${item.memo || ""}`);
  const material = inferMaterial(`${modelName} ${categoryName} ${item.memo || ""}`);
  const patternCategory = classifyPatternCategory(`${modelName} ${categoryName} ${material} ${surface} ${item.memo || ""}`);
  const color = inferColor(modelName);
  const imageUrls = unique([
    ...(Array.isArray(item.imageUrls) ? item.imageUrls : []),
    item.imageUrl,
    item.thumbnailUrl
  ].map(cleanText).filter(Boolean));
  const image = cleanText(imageUrls[0] || item.imageUrl || item.thumbnailUrl);

  return {
    id: `${idPrefix}-${item.sourceProductId}`,
    managementCode: `${managementPrefix}-${item.sourceProductId}`,
    majorCategory: sourceName,
    productType: categoryName.includes("부자재") ? "material" : "tile",
    kind: sourceName,
    option: categoryName,
    name: modelName,
    modelName,
    size,
    material,
    patternCategory,
    finish: surface,
    surface,
    countryOfOrigin: "",
    maker: cleanText(item.maker) || sourceName,
    unit,
    pcsPerBox,
    sqmPerBox,
    color,
    features: buildFeatures({ categoryName, material, surface, memo: item.memo }),
    costPrice,
    retailPrice: 0,
    wholesalePrice: 0,
    gradeAPrice: "",
    gradeBPrice: "",
    gradeCPrice: "",
    stockQty,
    stockText,
    image,
    imageUrls,
    originalImage: image,
    closeImage: imageUrls[1] || "",
    detailImage: imageUrls[2] || imageUrls[1] || image,
    daylightImage: "",
    fluorescentImage: "",
    sceneImage: "",
    sourceSite: "tile114",
    sourceUrl: item.sourceUrl,
    sourceProductId: String(item.sourceProductId || ""),
    sourceCategoryCode: String(item.categoryCode || ""),
    sourceCategoryName: categoryName,
    catalogSource: sourceName,
    catalogPage: 0,
    lastSyncedAt: new Date().toISOString()
  };
}

function buildFeatures({ categoryName, material, surface, memo }) {
  return [categoryName, material, surface, cleanText(memo)].filter(Boolean).join(" / ");
}

function inferMaterial(source) {
  const text = String(source || "").toLowerCase();
  if (/포세린|porcelain|por\b|pos\b/.test(text)) return "포세린";
  if (/자기질/.test(text)) return "자기질";
  if (/도기질/.test(text)) return "도기질";
  if (/폴리싱|polished|pol\b/.test(text)) return "폴리싱";
  if (/모자이크/.test(text)) return "모자이크";
  if (/스톤|stone|s-/.test(text)) return "스톤";
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
  if (/테라조|terrazzo|trz|입자|칩|chip|speckle|스페클/.test(text)) return "테라조";
  if (/마블|marble|mar|카라라|carrara|calacatta|비앙코|네로마퀴나|nero|베인|vein|대리석/.test(text)) return "마블";
  if (/시멘트|cement|cem|콘크리트|concrete|con|모르타르|몰탈/.test(text)) return "시멘트";
  if (/우드|wood|wod|나뭇결|목재|오크|티크/.test(text)) return "우드";
  if (/스톤|stone|stn|석재|라임스톤|limestone|트라버틴|travertine|슬레이트|현무|라바|lava/.test(text)) return "스톤";
  if (/패턴|pattern|ptn|art|데코|장식|꽃|플라워|라인|헥사|기하학|모자이크|mosaic|mos|포토/.test(text)) return "패턴";
  if (/솔리드|solid|단색|plain|무지/.test(text)) return "솔리드";
  return "솔리드";
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[(){}\[\]_\-·/]/g, "");
}

function inferColor(source) {
  const text = String(source || "").toUpperCase();
  const matches = [
    ["DARK GREY", "다크그레이"],
    ["DARK GRAY", "다크그레이"],
    ["LIGHT GREY", "라이트그레이"],
    ["LGREY", "라이트그레이"],
    ["WHITE", "화이트"],
    ["BIANCO", "화이트"],
    [" IVORY", "아이보리"],
    ["AVORIO", "아이보리"],
    ["BEIGE", "베이지"],
    ["GREY", "그레이"],
    ["GRAY", "그레이"],
    ["BLACK", "블랙"],
    ["BROWN", "브라운"],
    ["TAUPE", "토프"],
    ["GREEN", "그린"],
    ["RED", "레드"],
    ["YELLOW", "옐로우"],
    ["BLUE", "블루"],
    ["CARAMEL", "카라멜"],
    ["SAND", "샌드"],
    ["SILVER", "실버"],
    ["GR ", "그레이"],
    ["BI ", "화이트"]
  ];
  return matches.find(([needle]) => text.includes(needle))?.[1] || "";
}

function parsePcsPerBox(unit) {
  const text = String(unit || "");
  const match = /들이\s*\(?\s*([\d.]+)/i.exec(text);
  return match ? Number(match[1]) || "" : "";
}

function parseSquareMetersPerBox(unit) {
  const text = String(unit || "");
  const match = /([\d.]+)\s*㎡/i.exec(text);
  return match ? Number(match[1]) || "" : "";
}

function parseStockQty(stockText) {
  const matches = Array.from(String(stockText || "").matchAll(/\((\d+)/g));
  return matches.reduce((sum, match) => sum + (Number(match[1]) || 0), 0);
}

function normalizeSize(size) {
  return cleanText(size).replace(/×/g, "*").replace(/\s+/g, "");
}

function parseTile114ListProducts(html) {
  const products = [];
  const regex = /<li\b[^>]*class=["'][^"']*prd_thumb[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = regex.exec(html))) {
    const block = match[1];
    const sourceProductId = findFirst(block, /DetailListView\((\d+)\)/i) || findFirst(block, /<span class=["']blind["']>(\d+)<\/span>/i);
    if (!sourceProductId) continue;
    const name = cleanHtml(findFirst(block, /<span class=["']prd_name["']>([\s\S]*?)<\/span>/i) || findFirst(block, /alt=["']([^"']+)["']/i));
    const size = cleanHtml(findFirst(block, /<span class=["']prd_size["']>([\s\S]*?)<\/span>/i));
    const imagePath = findFirst(block, /<img\b[^>]*src=["']([^"']+)["']/i);
    products.push({
      sourceProductId,
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
  detail.imageUrls = extractTile114ImageUrls(html);
  return detail;
}

function extractTile114ImageUrls(html) {
  const values = [];
  const source = String(html || "");
  const imageRegex = /<img\b[^>]*(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi;
  let imageMatch;
  while ((imageMatch = imageRegex.exec(source))) values.push(imageMatch[1]);

  const imageReadRegex = /(?:\.\.\/|\.\/|\/)?Inc\/ImageRead\.asp\?[^"'\s<>)]*/gi;
  let imageReadMatch;
  while ((imageReadMatch = imageReadRegex.exec(source))) values.push(imageReadMatch[0]);

  const backgroundRegex = /url\(["']?([^"')]+)["']?\)/gi;
  let backgroundMatch;
  while ((backgroundMatch = backgroundRegex.exec(source))) values.push(backgroundMatch[1]);

  return unique(values
    .map((value) => absolutizeTile114Url(value))
    .filter((value) => /ImageRead\.asp|\/upload\/|\/image\//i.test(value))
    .filter((value) => !/\/Web\/img\//i.test(value))
  );
}

function createTile114Session() {
  const login = new URL(tile114LoginUrl);
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
      storeCookies(response.headers, cookieJar);
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        return await this.fetch(response.headers.get("location"), options);
      }
      if (!response.ok) throw new Error(`거래사이트 요청 실패: ${response.status}`);
      return response;
    }
  };
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
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function absolutizeTile114Url(value) {
  if (!value) return "";
  const login = new URL(tile114LoginUrl);
  return new URL(value, `${login.origin}/Web/`).toString();
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

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  const results = [];
  for (const value of values) {
    const key = String(value || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(key);
  }
  return results;
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

function inferSourceName(loginUrl) {
  const host = new URL(loginUrl).hostname.toLowerCase();
  if (host.includes("vgtns")) return "베리굿";
  if (host.includes("ajutile")) return "아주타일";
  return host.split(".")[0] || "거래처";
}

function inferIdPrefix(loginUrl) {
  const host = new URL(loginUrl).hostname.toLowerCase();
  return (host.split(".")[0] || "tile114").replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

function inferManagementPrefix(prefix) {
  const normalized = String(prefix || "TL").replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (normalized.includes("AJU")) return "AJU";
  if (normalized.includes("VGT")) return "VGD";
  return normalized.slice(0, 3) || "TL";
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
