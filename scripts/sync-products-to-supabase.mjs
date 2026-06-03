import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const env = await loadEnvFile(path.join(root, ".env"));
const supabaseUrl = String(env.SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const supabaseSecretKey = String(
  env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SECRET_KEY
  || ""
).trim();
const productsPath = path.join(root, "data", "products.json");

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("SUPABASE_URL 과 SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
}

const raw = await fs.readFile(productsPath, "utf8");
const products = JSON.parse(raw);
const payload = products.map(mapAppProductToSupabase);
let usedLegacyPayload = false;

let response = await postProducts(payload);
if (!response.ok) {
  const text = await response.text();
  if (!isMissingColumnError(text)) {
    throw new Error(`Supabase 업로드 실패 (${response.status}): ${text}`);
  }
  usedLegacyPayload = true;
  response = await postProducts(payload.map(toLegacySupabaseProduct));
  if (!response.ok) {
    throw new Error(`Supabase 업로드 실패 (${response.status}): ${await response.text()}`);
  }
}

const inserted = await response.json();
console.log(JSON.stringify({
  ok: true,
  uploaded: payload.length,
  returned: Array.isArray(inserted) ? inserted.length : 0,
  usedLegacyPayload
}, null, 2));

async function postProducts(body) {
  return fetch(`${supabaseUrl}/rest/v1/products`, {
    method: "POST",
    headers: {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(body)
  });
}

function isMissingColumnError(text) {
  return /column .* does not exist|could not find .* column/i.test(text);
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

function mapAppProductToSupabase(product) {
  return {
    id: String(product.id || "").trim(),
    management_code: String(product.managementCode || "").trim(),
    product_type: String(product.productType || "").trim(),
    kind: String(product.kind || "").trim(),
    name: String(product.name || "").trim(),
    size: String(product.size || "").trim(),
    model_name: String(product.modelName || product.name || "").trim(),
    material: String(product.material || "").trim(),
    surface: String(product.surface || "").trim(),
    pattern_category: String(product.patternCategory || classifyPatternCategory(product)).trim(),
    country_of_origin: String(product.countryOfOrigin || "").trim(),
    pcs_per_box: toNullableInteger(product.pcsPerBox),
    sqm_per_box: toNullableNumber(product.sqmPerBox),
    color: String(product.color || "").trim(),
    features: String(product.features || "").trim(),
    finish: String(product.finish || "").trim(),
    maker: String(product.maker || "").trim(),
    unit: String(product.unit || "").trim(),
    option_text: String(product.option || "").trim(),
    cost_price: toInteger(product.costPrice),
    retail_price: toInteger(product.retailPrice),
    wholesale_price: toInteger(product.wholesalePrice),
    stock_qty: toInteger(product.stockQty),
    stock_text: String(product.stockText || "").trim(),
    grade_a_price: toNullableInteger(product.gradeAPrice),
    grade_b_price: toNullableInteger(product.gradeBPrice),
    grade_c_price: toNullableInteger(product.gradeCPrice),
    image: String(product.image || "").trim(),
    image_urls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
    original_image: String(product.originalImage || "").trim(),
    close_image: String(product.closeImage || "").trim(),
    detail_image: String(product.detailImage || "").trim(),
    daylight_image: String(product.daylightImage || "").trim(),
    fluorescent_image: String(product.fluorescentImage || "").trim(),
    scene_image: String(product.sceneImage || "").trim(),
    source_site: String(product.sourceSite || "").trim(),
    source_url: String(product.sourceUrl || "").trim(),
    source_product_id: String(product.sourceProductId || "").trim(),
    source_category_code: String(product.sourceCategoryCode || "").trim(),
    source_category_name: String(product.sourceCategoryName || "").trim(),
    catalog_source: String(product.catalogSource || "").trim(),
    catalog_page: Number(product.catalogPage) || 0,
    last_synced_at: product.lastSyncedAt || null
  };
}

function toNullableInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function toInteger(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function classifyPatternCategory(product) {
  const source = normalizeMatchText([
    product?.patternCategory,
    product?.name,
    product?.modelName,
    product?.option,
    product?.kind,
    product?.material,
    product?.surface,
    product?.finish,
    product?.color,
    product?.features,
    product?.sourceCategoryName
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

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[(){}\[\]_\-·/]/g, "");
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
