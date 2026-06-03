import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const env = await loadEnvFile(path.join(root, ".env"));
const cli = parseCliArgs(process.argv.slice(2));

const sourceName = String(cli.sourceName || cli["source-name"] || "GT").trim();
const idPrefix = String(cli.idPrefix || cli["id-prefix"] || "goldtile").trim();
const managementPrefix = String(cli.managementPrefix || cli["management-prefix"] || "GT").trim();
const mergeExistingProducts = String(cli.merge || "true") !== "false" && String(cli.replace || "false") !== "true";
const detailConcurrency = Math.max(1, Math.min(20, Number(cli.concurrency || 8) || 8));
const requestTimeoutMs = Math.max(5000, Number(cli.timeout || cli["timeout-ms"] || 25000) || 25000);
const loginUrl = firstEnvValue("thegold_LOGIN_URL", "THEGOLD_LOGIN_URL", "GOLDTILE_LOGIN_URL") || "https://thegoldtile.com/";
const userId = firstEnvValue("thegold_USER_ID", "THEGOLD_USER_ID", "GOLDTILE_USER_ID");
const password = firstEnvValue("thegold_PASSWORD", "THEGOLD_PASSWORD", "GOLDTILE_PASSWORD");
const productsPath = path.join(root, "data", "products.json");
const outputDir = path.join(root, "outputs", "goldtile-import");
const resultPath = path.join(outputDir, `${idPrefix}-products-${timestamp()}.json`);

if (!userId || !password) {
  throw new Error("thegold_USER_ID 또는 thegold_PASSWORD가 .env에 필요합니다.");
}

await fs.mkdir(outputDir, { recursive: true });

const session = createGoldTileSession();
await login(session);

const catalogHtml = await session.fetchText("/catalog");
await fs.writeFile(path.join(outputDir, "catalog-latest.html"), catalogHtml, "utf8");
const categoryMap = parseCategoryLinks(catalogHtml);
const discovered = new Map();

for (const [categoryPath, categoryName] of categoryMap.entries()) {
  const categoryHtml = await session.fetchText(categoryPath);
  const config = parseShopListConfig(categoryHtml, categoryPath);
  const initialItems = parseProductBlocks(categoryHtml, categoryPath, categoryName);
  let newCount = addDiscovered(discovered, initialItems);

  if (!config && !initialItems.length) {
    console.log(`[skip] ${categoryName} ${categoryPath}`);
    await sleep(40);
    continue;
  }

  const pageCount = Math.max(1, Number(config?.pageCount || 1) || 1);
  console.log(`[list] ${categoryName} ${categoryPath} pages=${pageCount} items=${initialItems.length} new=${newCount}`);

  if (config) {
    for (let page = 2; page <= pageCount; page += 1) {
      const html = await fetchListPage(session, config, page);
      const items = parseProductBlocks(html, categoryPath, categoryName);
      newCount = addDiscovered(discovered, items);
      console.log(`  page=${page} items=${items.length} new=${newCount} total=${discovered.size}`);
      await sleep(60);
    }
  }
  await sleep(80);
}

const listItems = Array.from(discovered.values());
console.log(`[detail] ${listItems.length} products concurrency=${detailConcurrency}`);

let completed = 0;
await mapWithConcurrency(listItems, detailConcurrency, async (item) => {
  try {
    const detailHtml = await session.fetchText(item.detailPath || item.sourceUrl);
    Object.assign(item, parseProductDetail(detailHtml, item));
  } catch (error) {
    item.detailError = error.message;
  }

  completed += 1;
  if (completed % 50 === 0 || completed === listItems.length) {
    console.log(`  detail=${completed}/${listItems.length}`);
  }
  await sleep(30);
});

const products = listItems
  .map(mapGoldTileToAppProduct)
  .sort((a, b) => {
    const option = String(a.option || "").localeCompare(String(b.option || ""), "ko");
    if (option) return option;
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
  await session.fetchText("/login?back_url=Lw%3D%3D&used_login_btn=Y");
  const loginResponse = await session.postFormText("/backpg/login.cm", {
    back_url: "Lw%3D%3D",
    back_url_auth: "",
    used_login_btn: "Y",
    uid: userId,
    passwd: password,
    auto_login: "ok"
  });
  if (/로그인에 실패|비밀번호|아이디/.test(cleanHtml(loginResponse))) {
    throw new Error("더골드타일 로그인에 실패했습니다.");
  }

  const home = await session.fetchText("/");
  if (!/로그아웃|logout|마이페이지|mypage/i.test(home)) {
    throw new Error("더골드타일 로그인 확인에 실패했습니다.");
  }
}

async function fetchListPage(session, config, page) {
  const query = new URLSearchParams({
    page: String(page),
    pagesize: String(config.pageSize || 15),
    category: config.category,
    sort: config.sort || "",
    menu_url: config.menuUrl,
    widget_code: config.widgetCode,
    ab_group: config.abGroup || "A",
    manual_sort: String(config.manualSort ?? 0)
  });
  const responseText = await session.fetchText(`/ajax/get_shop_list_view.cm?${query.toString()}`, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: session.absoluteUrl(config.menuUrl)
    }
  });
  try {
    const data = JSON.parse(responseText);
    return data.html || "";
  } catch {
    return "";
  }
}

function addDiscovered(discovered, items) {
  let count = 0;
  for (const item of items) {
    if (!item.sourceProductId || discovered.has(item.sourceProductId)) continue;
    discovered.set(item.sourceProductId, item);
    count += 1;
  }
  return count;
}

function parseCategoryLinks(html) {
  const categories = new Map();
  const linkRegex = /<a\b[^>]*href=["']\/(\d+)\/?["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html))) {
    const categoryPath = `/${match[1]}/`;
    const label = cleanHtml(match[2]);
    if (!label) continue;
    categories.set(categoryPath, label);
  }
  return categories;
}

function parseShopListConfig(html, currentPath) {
  const configs = [];
  const ajaxRegex = /var\s+page_count\s*=\s*(\d+);[\s\S]{0,3500}?url\s*:\s*\('\/ajax\/get_shop_list_view\.cm'\)[\s\S]{0,1800}?data\s*:\s*\{([\s\S]{0,1800}?)\}\s*,\s*success/gi;
  let match;
  while ((match = ajaxRegex.exec(html))) {
    const dataBlock = match[2];
    const menuUrl = findFirst(dataBlock, /'menu_url'\s*:\s*'([^']+)'/i);
    configs.push({
      pageCount: Number(match[1]) || 1,
      pageSize: Number(findFirst(dataBlock, /'pagesize'\s*:\s*(\d+)/i)) || 15,
      category: findFirst(dataBlock, /'category'\s*:\s*'([^']+)'/i),
      sort: findFirst(dataBlock, /'sort'\s*:\s*'([^']*)'/i),
      menuUrl,
      widgetCode: findFirst(dataBlock, /'widget_code'\s*:\s*'([^']+)'/i),
      abGroup: findFirst(dataBlock, /'ab_group'\s*:\s*["']([^"']+)["']/i) || "A",
      manualSort: Number(findFirst(dataBlock, /'manual_sort'\s*:\s*(\d+)/i)) || 0
    });
  }
  const normalizedPath = normalizeMenuPath(currentPath);
  return configs.find((config) => normalizeMenuPath(config.menuUrl) === normalizedPath && config.category && config.widgetCode)
    || configs.find((config) => config.category && config.widgetCode)
    || null;
}

function parseProductBlocks(html, categoryPath, categoryName) {
  const products = [];
  const parts = String(html || "").split(/<div\b(?=[^>]*class=["'][^"']*\bshop-item\b[^"']*\b_shop_item\b)/i);
  for (const part of parts.slice(1)) {
    const block = `<div${part}`;
    const propsRaw = findFirst(block, /data-product-properties=(["'])([\s\S]*?)\1/i, 2);
    const props = parseProductProperties(propsRaw);
    const sourceProductId = String(props.idx || findFirst(block, /\?idx=(\d+)/i) || "").trim();
    if (!sourceProductId) continue;

    const detailPath = findFirst(block, /<a\b[^>]*href=["']([^"']*\?idx=\d+[^"']*)["']/i) || `${categoryPath}?idx=${sourceProductId}`;
    const summary = parseSummary(block);
    const stockText = cleanHtml(findFirst(block, /<p\b[^>]*class=["'][^"']*\bshop-brand\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i));
    const imageUrl = absolutizeUrl(props.image_url || findFirst(block, /<img\b[^>]*src=["']([^"']+)["']/i));

    products.push({
      sourceProductId,
      sourceCode: props.code || "",
      name: cleanText(props.name) || cleanHtml(findFirst(block, /<h2[^>]*>([\s\S]*?)<\/h2>/i)),
      categoryPath,
      categoryName,
      detailPath,
      sourceUrl: sessionAbsoluteUrl(detailPath),
      imageUrl,
      imageUrls: [imageUrl].filter(Boolean),
      costPrice: Number(props.original_price || props.price || 0) || 0,
      stockText,
      stockQty: parseStockQty(stockText),
      ...summary
    });
  }
  return products;
}

function parseProductDetail(html, item) {
  const detail = {};
  const originBlock = findDetailItem(html, "원산지");
  if (originBlock) detail.countryOfOrigin = originBlock;
  const brandBlock = findDetailItem(html, "브랜드");
  if (brandBlock && /재고|박스/.test(brandBlock) && !item.stockText) {
    detail.stockText = brandBlock;
    detail.stockQty = parseStockQty(brandBlock);
  }
  const weightBlock = findDetailItem(html, "무게");
  if (weightBlock) detail.weight = weightBlock;

  const bodySummary = parseSummary(html);
  Object.assign(detail, Object.fromEntries(Object.entries(bodySummary).filter(([, value]) => value !== "" && value !== 0)));

  const imageUrls = unique([
    ...(item.imageUrls || []),
    ...Array.from(html.matchAll(/<img\b[^>]*src=["']([^"']*(?:imweb|cdn-optimized)[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi))
      .map((match) => absolutizeUrl(match[1]))
  ]);
  if (imageUrls.length) detail.imageUrls = imageUrls;
  if (imageUrls[0]) detail.imageUrl = imageUrls[0];
  return detail;
}

function findDetailItem(html, label) {
  const regex = new RegExp(`<p[^>]*class=["'][^"']*prod-detail-section__item[^"']*["'][^>]*>\\s*<span[^>]*>${escapeRegExp(label)}<\\/span>\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`, "i");
  return cleanHtml(findFirst(html, regex));
}

function parseProductProperties(value) {
  if (!value) return {};
  try {
    return JSON.parse(decodeHtmlEntities(value));
  } catch {
    return {};
  }
}

function parseSummary(html) {
  const lines = Array.from(String(html || "").matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => cleanHtml(match[1]))
    .filter(Boolean);
  const joined = lines.join(" / ");
  const summary = { summaryLines: lines, featuresText: joined };
  summary.sheetSize = findSummaryValue(lines, /sheet\s*size/i);
  summary.tileSize = findSummaryValue(lines, /tile\s*size/i);
  summary.size = summary.tileSize || summary.sheetSize || "";
  summary.pcsPerBox = Number(findSummaryValue(lines, /pcs\s*\/\s*box/i).replace(/[^\d.]/g, "")) || "";
  summary.sqmPerBox = Number(findSummaryValue(lines, /㎡\s*\/\s*box|m2\s*\/\s*box|m²\s*\/\s*box/i).replace(/[^\d.]/g, "")) || "";
  summary.weight = findSummaryValue(lines, /kg\s*\/\s*box/i);
  summary.pallet = findSummaryValue(lines, /\bplt\b/i);
  return summary;
}

function findSummaryValue(lines, labelRegex) {
  const line = lines.find((entry) => labelRegex.test(entry));
  if (!line) return "";
  return cleanText(line.replace(/^[^:：]+[:：]\s*/, ""));
}

function mapGoldTileToAppProduct(item) {
  const modelName = cleanText(item.name);
  const categoryName = cleanText(item.categoryName);
  const size = normalizeSize(item.size);
  const surface = inferSurface(`${modelName} ${categoryName}`);
  const material = inferMaterial(`${modelName} ${categoryName}`);
  const patternCategory = classifyPatternCategory(`${modelName} ${categoryName} ${material} ${surface}`);
  const color = inferColor(modelName);
  const image = cleanText(item.imageUrl || item.imageUrls?.[0]);
  const sqmPerBox = item.sqmPerBox || "";
  const pcsPerBox = item.pcsPerBox || "";
  const unit = [sqmPerBox ? `${sqmPerBox}㎡/box` : "", pcsPerBox ? `${pcsPerBox}pcs/box` : ""].filter(Boolean).join(" / ");

  return {
    id: `${idPrefix}-${item.sourceProductId}`,
    managementCode: `${managementPrefix}-${item.sourceProductId}`,
    majorCategory: sourceName,
    productType: inferProductType(`${categoryName} ${modelName}`),
    kind: sourceName,
    option: categoryName,
    name: modelName,
    modelName,
    size,
    material,
    patternCategory,
    finish: surface,
    surface,
    countryOfOrigin: cleanText(item.countryOfOrigin),
    maker: sourceName,
    unit,
    pcsPerBox,
    sqmPerBox,
    color,
    features: [categoryName, item.sheetSize ? `SHEET ${item.sheetSize}` : "", item.tileSize ? `TILE ${item.tileSize}` : "", material, surface, item.weight ? `무게 ${item.weight}` : "", item.pallet ? `PLT ${item.pallet}` : ""].filter(Boolean).join(" / "),
    costPrice: Number(item.costPrice) || 0,
    retailPrice: 0,
    wholesalePrice: 0,
    gradeAPrice: "",
    gradeBPrice: "",
    gradeCPrice: "",
    stockQty: Number(item.stockQty) || 0,
    stockText: cleanText(item.stockText),
    stockLocations: [],
    image,
    imageUrls: unique([...(item.imageUrls || []), image].filter(Boolean)),
    originalImage: image,
    closeImage: "",
    detailImage: item.imageUrls?.[1] || image,
    daylightImage: "",
    fluorescentImage: "",
    sceneImage: "",
    sourceSite: "thegoldtile",
    sourceUrl: item.sourceUrl,
    sourceProductId: String(item.sourceProductId || ""),
    sourceCategoryCode: normalizeMenuPath(item.categoryPath).replace(/\D/g, ""),
    sourceCategoryName: categoryName,
    catalogSource: sourceName,
    catalogPage: 0,
    lastSyncedAt: new Date().toISOString()
  };
}

function inferProductType(source) {
  if (/부자재/.test(source)) return "material";
  return "tile";
}

function inferMaterial(source) {
  const text = String(source || "").toLowerCase();
  if (/포세린|porcelain|perfect stone|tile star|vista/.test(text)) return "포세린";
  if (/테라코타/.test(text)) return "테라코타";
  if (/외장/.test(text)) return "외장타일";
  if (/모자이크|mosaic|series|g\d+/i.test(source)) return "모자이크";
  if (/논슬립|계단/.test(text)) return "자기질";
  return "";
}

function inferSurface(source) {
  const text = String(source || "").toLowerCase();
  if (/논슬립|non[\s-]?slip|\bns\b/.test(text)) return "논슬립";
  if (/무광|matt|matte/.test(text)) return "무광";
  if (/유광|gloss|gls/.test(text)) return "유광";
  if (/반무광|satin|sat\b/.test(text)) return "반무광";
  if (/계단|st\s*\(/i.test(source)) return "논슬립";
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
  if (/패턴|pattern|데코|장식|꽃|플라워|라인|헥사|육각|다이아|팔각|옥타곤|모자이크|mosaic|계단|랜턴|레트로|retro|컬러블럭|colorblock/.test(text)) return "패턴";
  return "솔리드";
}

function inferColor(source) {
  const text = String(source || "").toUpperCase();
  const matches = [
    ["DARK GREY", "다크그레이"],
    ["DARK GRAY", "다크그레이"],
    ["LIGHT GREY", "라이트그레이"],
    ["LIGHT GRAY", "라이트그레이"],
    ["WHITE", "화이트"],
    ["BIANCO", "화이트"],
    ["IVORY", "아이보리"],
    ["BEIGE", "베이지"],
    ["CREAM", "크림"],
    ["GREY", "그레이"],
    ["GRAY", "그레이"],
    ["BLACK", "블랙"],
    ["BROWN", "브라운"],
    ["GREEN", "그린"],
    ["BLUE", "블루"],
    ["NAVY", "네이비"],
    ["PINK", "핑크"],
    ["YELLOW", "옐로우"],
    ["ORANGE", "오렌지"],
    ["RED", "레드"],
    ["GOLD", "골드"],
    ["SILVER", "실버"]
  ];
  return matches.find(([needle]) => text.includes(needle))?.[1] || "";
}

function parseStockQty(stockText) {
  const text = cleanText(stockText);
  if (!text || /문의|품절/.test(text)) {
    const zero = text.match(/0\s*박스/);
    return zero ? 0 : 0;
  }
  const numbers = Array.from(text.matchAll(/(-?[\d,.]+)\s*박스/g)).map((match) => Number(match[1].replace(/,/g, "")) || 0);
  if (numbers.length) return numbers.reduce((sum, value) => sum + value, 0);
  return Number(text.replace(/[^\d.-]/g, "")) || 0;
}

function createGoldTileSession() {
  const base = new URL(loginUrl);
  const origin = base.origin;
  const cookieJar = new Map();
  const session = {
    absoluteUrl(pathValue) {
      return new URL(pathValue, `${origin}/`).toString();
    },
    async fetch(pathValue, options = {}) {
      const headers = new Headers(options.headers || {});
      const cookie = Array.from(cookieJar.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
      if (cookie) headers.set("Cookie", cookie);
      if (!headers.has("User-Agent")) headers.set("User-Agent", "Mozilla/5.0 TileBathPlusImporter/1.0");
      if (!headers.has("Accept")) headers.set("Accept", "text/html,application/xhtml+xml,application/json,*/*;q=0.8");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetch(new URL(pathValue, `${origin}/`), { ...options, headers, redirect: "manual", signal: controller.signal });
        storeCookies(response.headers, cookieJar);
        if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
          return await this.fetch(response.headers.get("location"), { method: "GET" });
        }
        if (!response.ok) throw new Error(`더골드타일 요청 실패: ${response.status}`);
        return response;
      } finally {
        clearTimeout(timeout);
      }
    },
    async fetchText(pathValue, options = {}) {
      return await (await this.fetch(pathValue, options)).text();
    },
    async postFormText(pathValue, form) {
      return await this.fetchText(pathValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: this.absoluteUrl("/login?back_url=Lw%3D%3D&used_login_btn=Y")
        },
        body: new URLSearchParams(form).toString()
      });
    }
  };
  return session;
}

function sessionAbsoluteUrl(pathValue) {
  const base = new URL(loginUrl);
  return new URL(pathValue, `${base.origin}/`).toString();
}

function absolutizeUrl(value) {
  if (!value) return "";
  const base = new URL(loginUrl);
  return new URL(decodeHtmlEntities(value), `${base.origin}/`).toString();
}

function normalizeMenuPath(value) {
  const pathname = new URL(value || "/", "https://example.invalid").pathname;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
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

function findFirst(text, regex, group = 1) {
  const match = regex.exec(String(text || ""));
  return match ? match[group] || "" : "";
}

function cleanHtml(value) {
  return decodeHtmlEntities(String(value || "")
    .replace(/\\u0026/g, "&")
    .replace(/<br\s*\/?>/gi, " ")
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
