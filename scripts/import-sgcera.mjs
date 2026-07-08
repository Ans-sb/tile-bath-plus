import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const env = await loadEnvFile(path.join(root, ".env"));
const cli = parseCliArgs(process.argv.slice(2));
const sourceName = String(cli.sourceName || cli["source-name"] || "SG").trim();
const idPrefix = String(cli.idPrefix || cli["id-prefix"] || "sgcera").trim();
const managementPrefix = String(cli.managementPrefix || cli["management-prefix"] || "SG").trim();
const mergeExistingProducts = String(cli.merge || "true") !== "false" && String(cli.replace || "false") !== "true";
const outputOnly = String(cli.outputOnly || cli["output-only"] || "false") === "true";
const loginUrl = firstEnvValue("SGCERA_LOGIN_URL") || "https://www.sgcera.kr/front/index.php?g_page=member&m_page=member01";
const userId = firstEnvValue("SGCERA_USER_ID");
const password = firstEnvValue("SGCERA_PASSWORD");
const productsPath = path.join(root, "data", "products.json");
const outputDir = path.join(root, "outputs", "sgcera-import");
const resultPath = path.join(outputDir, `${idPrefix}-products-${timestamp()}.json`);

const CATEGORIES = [
  { label: "할인제품", mPage: "product077", topIdx: "77" },
  { label: "타일", mPage: "product01", topIdx: "1" },
  { label: "위생도기/수도꼭지", mPage: "product02", topIdx: "2" },
  { label: "American Standard", mPage: "product03", topIdx: "3" },
  { label: "욕실부자재", mPage: "product04", topIdx: "4" },
  { label: "타일부자재", mPage: "product05", topIdx: "5" },
  { label: "KCC Homecc", mPage: "product140", topIdx: "140" },
  { label: "대림바스(대림요업)", mPage: "product144", topIdx: "144" }
];

if (!userId || !password) {
  throw new Error("SGCERA_USER_ID 또는 SGCERA_PASSWORD가 .env에 필요합니다.");
}

await fs.mkdir(outputDir, { recursive: true });

const session = createSgCeraSession();
await login(session);

const discovered = new Map();
for (const category of CATEGORIES) {
  const firstHtml = await fetchCategoryPage(session, category, 1);
  const lastPage = findLastPage(firstHtml, category) || 1;
  console.log(`[list] ${category.label} pages=${lastPage}`);

  for (let page = 1; page <= lastPage; page += 1) {
    const html = page === 1 ? firstHtml : await fetchCategoryPage(session, category, page);
    const items = parseProductList(html, category);
    let newCount = 0;
    for (const item of items) {
      if (!item.sourceProductId || discovered.has(item.sourceProductId)) continue;
      discovered.set(item.sourceProductId, item);
      newCount += 1;
    }
    console.log(`  page=${page} items=${items.length} new=${newCount} total=${discovered.size}`);
    await sleep(80);
  }
}

const listItems = Array.from(discovered.values());
console.log(`[detail] ${listItems.length} products`);

const products = [];
let completed = 0;
await mapWithConcurrency(listItems, 5, async (item) => {
  const detailHtml = await (await session.fetch(item.detailPath)).text();
  const detail = parseProductDetail(detailHtml, item);
  products.push(mapSgCeraToAppProduct({ ...item, ...detail }));
  completed += 1;
  if (completed % 50 === 0 || completed === listItems.length) {
    console.log(`  detail=${completed}/${listItems.length}`);
  }
  await sleep(50);
});

products.sort((a, b) => {
  const option = String(a.option || "").localeCompare(String(b.option || ""), "ko");
  if (option) return option;
  return String(a.name || "").localeCompare(String(b.name || ""), "ko");
});

await fs.writeFile(resultPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
const existingProducts = await readJsonArray(productsPath);
const finalProducts = outputOnly
  ? existingProducts
  : mergeExistingProducts
    ? mergeProducts(existingProducts, products)
    : products;
if (!outputOnly) {
  await fs.writeFile(productsPath, `${JSON.stringify(finalProducts, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  ok: true,
  sourceName,
  idPrefix,
  mergeExistingProducts,
  outputOnly,
  discovered: listItems.length,
  imported: products.length,
  finalProductCount: finalProducts.length,
  resultPath,
  productsPath
}, null, 2));

async function login(session) {
  await session.fetch("/front/index.php?g_page=member&m_page=member01");
  const response = await session.fetch("/front/index.php?g_page=member&m_page=member01&act=loginOk", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({
      act: "loginOk",
      returnURL: "",
      userId,
      userPw: password
    }).toString()
  });
  const html = await response.text();
  if (!/로그아웃|tz_logout|act=logout/i.test(html)) {
    const home = await (await session.fetch("/front/")).text();
    if (!/로그아웃|tz_logout|act=logout/i.test(home)) throw new Error("SGCERA 로그인에 실패했습니다.");
  }
}

async function fetchCategoryPage(session, category, page) {
  const query = new URLSearchParams({
    g_page: "product",
    m_page: category.mPage,
    TOP_IDX: category.topIdx
  });
  if (page > 1) query.set("page", String(page));
  return await (await session.fetch(`/front/index.php?${query.toString()}`)).text();
}

function parseProductList(html, category) {
  const products = [];
  const listMatch = /<ul class=["']pd_list["']>([\s\S]*?)<\/ul>/i.exec(html);
  const listHtml = listMatch ? listMatch[1] : html;
  const itemRegex = /<li>\s*<a\s+href=["']([^"']*act=product\.info[^"']*)["'][^>]*>([\s\S]*?)<\/a>\s*<\/li>/gi;
  let match;
  while ((match = itemRegex.exec(listHtml))) {
    const href = decodeHtmlEntities(match[1]);
    const block = match[2];
    const goodsIdx = findFirst(href, /GOODS_IDX=(\d+)/i);
    const prdIdx = findFirst(href, /PRD_IDX=(\d+)/i);
    const sourceProductId = goodsIdx || prdIdx;
    if (!sourceProductId) continue;
    const name = cleanHtml(findFirst(block, /<strong[^>]*>([\s\S]*?)<\/strong>/i) || findFirst(block, /alt=["']([^"']+)["']/i));
    const size = cleanHtml(findFirst(block, /<span[^>]*>([\s\S]*?)<\/span>/i));
    const thumbnailUrl = absolutizeUrl(findFirst(block, /<img\b[^>]*src=["']([^"']+)["']/i));
    products.push({
      sourceProductId,
      prdIdx,
      goodsIdx,
      name,
      size,
      listSizeLabel: size,
      thumbnailUrl,
      detailPath: href,
      sourceUrl: sessionAbsoluteUrl(href),
      categoryName: category.label,
      sourceCategoryCode: category.topIdx,
      sourceCategoryName: category.label
    });
  }
  return products;
}

function parseProductDetail(html, item) {
  const detail = {};
  detail.name = cleanHtml(findFirst(html, /<div class=["']pd_view_tit["']>([\s\S]*?)<\/div>/i)) || item.name;

  const specRegex = /<li>\s*<strong[^>]*>([\s\S]*?)<\/strong>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<\/li>/gi;
  let match;
  while ((match = specRegex.exec(html))) {
    const key = cleanHtml(match[1]).replace(/\s+/g, "");
    const value = cleanHtml(match[2]);
    if (!key) continue;
    if (key.includes("규격")) detail.size = value;
    else if (/m[²2]\/?box/i.test(key) || key.includes("㎡/Box")) detail.sqmPerBox = Number(value.replace(/[^\d.]/g, "")) || "";
    else if (/pcs\/?box/i.test(key)) detail.pcsPerBox = Number(value.replace(/[^\d.]/g, "")) || "";
    else if (key.includes("중량")) detail.weight = value;
    else if (key.includes("PLT")) detail.pallet = value;
    else if (key.includes("단가")) {
      detail.costPriceText = value;
      detail.costPrice = Number(value.replace(/[^\d]/g, "")) || 0;
    }
  }

  const imageUrls = unique([
    absolutizeUrl(findFirst(html, /<div class=["']view_img["'][\s\S]*?<img\b[^>]*src=["']([^"']+)["']/i)),
    ...Array.from(html.matchAll(/<div class=["']view_detail["'][\s\S]*?<\/div>/gi))
      .flatMap((section) => Array.from(section[0].matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)).map((imageMatch) => absolutizeUrl(imageMatch[1]))),
    ...Array.from(html.matchAll(/<img\b[^>]*src=["']([^"']*wdFiles\/upload\/editor\/[^"']+)["']/gi)).map((imageMatch) => absolutizeUrl(imageMatch[1]))
  ].filter(Boolean));
  detail.imageUrls = imageUrls.length ? imageUrls : [item.thumbnailUrl].filter(Boolean);
  detail.imageUrl = detail.imageUrls[0] || "";

  const stocks = parseStockRows(html);
  detail.stockText = stocks.map((stock) => `${stock.location}${stock.lot ? ` ${stock.lot}` : ""} ${stock.qty}`).join(" / ");
  detail.stockQty = stocks.reduce((sum, stock) => sum + stock.qty, 0);
  detail.stockLocations = stocks;

  return detail;
}

function parseStockRows(html) {
  const stockArea = findFirst(html, /<div class=["']stock_area["']>([\s\S]*?)<\/div>/i);
  if (!stockArea) return [];
  const rows = [];
  const rowRegex = /<tr>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(stockArea))) {
    const location = cleanHtml(match[1]);
    const lot = cleanHtml(match[2]);
    const qty = Number(cleanHtml(match[3]).replace(/[^\d.-]/g, "")) || 0;
    if (location || lot || qty) rows.push({ location, lot, qty });
  }
  return rows;
}

function mapSgCeraToAppProduct(item) {
  const modelName = cleanText(item.name);
  const listSizeLabel = cleanText(item.listSizeLabel);
  const size = normalizeSize(item.size);
  const categoryName = cleanText(item.categoryName);
  const sourceText = `${modelName} ${listSizeLabel} ${item.size || ""} ${categoryName} ${item.weight || ""}`;
  const surface = inferSurface(sourceText);
  const material = inferMaterial(sourceText);
  const patternCategory = classifyPatternCategory(`${sourceText} ${surface} ${material}`);
  const color = inferColor(modelName);
  const image = cleanText(item.imageUrl || item.thumbnailUrl);
  const costPrice = Number(item.costPrice) || 0;
  const sqmPerBox = item.sqmPerBox || "";
  const pcsPerBox = item.pcsPerBox || "";
  const unit = [sqmPerBox ? `${sqmPerBox}㎡/box` : "", pcsPerBox ? `${pcsPerBox}pcs/box` : ""].filter(Boolean).join(" / ");

  return {
    id: `${idPrefix}-${item.sourceProductId}`,
    managementCode: `${managementPrefix}-${item.sourceProductId}`,
    majorCategory: sourceName,
    productType: inferProductType(categoryName),
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
    maker: sourceName,
    unit,
    pcsPerBox,
    sqmPerBox,
    color,
    features: [categoryName, listSizeLabel && listSizeLabel !== size ? listSizeLabel : "", material, surface, item.weight ? `중량 ${item.weight}` : "", item.pallet ? `PLT ${item.pallet}` : ""].filter(Boolean).join(" / "),
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
    closeImage: item.imageUrls?.[1] || "",
    detailImage: item.imageUrls?.[2] || item.imageUrls?.[1] || image,
    daylightImage: "",
    fluorescentImage: "",
    sceneImage: "",
    sourceSite: "sgcera",
    sourceUrl: item.sourceUrl,
    sourceProductId: String(item.sourceProductId || ""),
    sourceCategoryCode: String(item.sourceCategoryCode || ""),
    sourceCategoryName: categoryName,
    catalogSource: sourceName,
    catalogPage: 0,
    lastSyncedAt: new Date().toISOString()
  };
}

function inferProductType(categoryName) {
  if (/타일/.test(categoryName)) return "tile";
  if (/부자재/.test(categoryName)) return "material";
  return "sanitary";
}

function findLastPage(html, category) {
  const escapedMPage = escapeRegExp(category.mPage);
  const escapedTop = escapeRegExp(category.topIdx);
  const regex = new RegExp(`page=(\\d+)&amp;g_page=product&amp;m_page=${escapedMPage}&amp;TOP_IDX=${escapedTop}`, "gi");
  const pages = Array.from(html.matchAll(regex)).map((match) => Number(match[1]) || 0);
  return Math.max(1, ...pages);
}

function inferMaterial(source) {
  const text = String(source || "").toLowerCase();
  if (/(^|[\s\]])포\s*[\da-z]/i.test(source) || /후판.*포/i.test(source)) return "포세린";
  if (/포세린|porcelain|por\b|포\s/.test(text)) return "포세린";
  if (/자기질|바닥/.test(text)) return "자기질";
  if (/도기질|벽/.test(text)) return "도기질";
  if (/폴리싱|polished|pol\b/.test(text)) return "폴리싱";
  if (/모자이크/.test(text)) return "모자이크";
  if (/스톤|stone/.test(text)) return "스톤";
  return "";
}

function inferSurface(source) {
  const text = String(source || "").toLowerCase();
  if (/논슬립|non[\s-]?slip|nsp/.test(text)) return "논슬립";
  if (/반무광|세미무광|새틴|satin|라파토|라빠또|lappato|\blap\b/.test(text)) return "반무광";
  if (/무광|matt|matte|mat\b/.test(text)) return "무광";
  if (/유광|gloss|gls/.test(text)) return "유광";
  if (/\b[a-z가-힣]*\d{2,}[a-z0-9-]*m\b/i.test(source)) return "무광";
  if (/\b[a-z가-힣]*\d{2,}[a-z0-9-]*p\b/i.test(source)) return "유광";
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
    ["BK", "블랙"],
    ["BR", "브라운"],
    ["IV", "아이보리"],
    ["LG", "라이트그레이"]
  ];
  return matches.find(([needle]) => text.includes(needle))?.[1] || "";
}

function createSgCeraSession() {
  const base = new URL(loginUrl);
  const origin = base.origin;
  const cookieJar = new Map();

  return {
    absoluteUrl(pathValue) {
      return new URL(pathValue, `${origin}/front/`).toString();
    },
    async fetch(pathValue, options = {}) {
      const headers = new Headers(options.headers || {});
      const cookie = Array.from(cookieJar.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
      if (cookie) headers.set("Cookie", cookie);
      headers.set("User-Agent", "Mozilla/5.0 TileBathPlusImporter/1.0");
      const response = await fetch(new URL(pathValue, `${origin}/front/`), { ...options, headers, redirect: "manual" });
      storeCookies(response.headers, cookieJar);
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        return await this.fetch(response.headers.get("location"), { method: "GET" });
      }
      if (!response.ok) throw new Error(`SGCERA 요청 실패: ${response.status}`);
      return response;
    }
  };
}

function sessionAbsoluteUrl(pathValue) {
  const base = new URL(loginUrl);
  return new URL(pathValue, `${base.origin}/front/`).toString();
}

function absolutizeUrl(value) {
  if (!value) return "";
  const base = new URL(loginUrl);
  return new URL(decodeHtmlEntities(value).replace("../wdCheditor/../", "../"), `${base.origin}/front/`).toString();
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
    .replace(/<em\b[^>]*>[\s\S]*?<\/em>/gi, " ")
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

function normalizeSize(size) {
  return cleanText(size).replace(/[×x]/gi, "*").replace(/\s+/g, "");
}

function normalizeMatchText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "").replace(/[(){}\[\]_\-·/]/g, "");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
