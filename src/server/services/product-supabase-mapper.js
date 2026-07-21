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

function normalizePatternText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function classifyPatternCategory(product) {
  const source = normalizePatternText([
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

module.exports = {
  LEGACY_PRODUCTS_SUPABASE_COLUMNS,
  PRODUCTS_SUPABASE_COLUMNS,
  classifyPatternCategory,
  mapAppProductToSupabase,
  mapSupabaseProductToApp,
  toBlankableNumber,
  toLegacySupabaseProduct,
  toNullableInteger,
  toNullableNumber
};
