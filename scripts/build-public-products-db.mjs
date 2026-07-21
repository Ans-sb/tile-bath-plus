import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const productsPath = path.join(root, "data", "products.json");
const productsDbPath = path.join(root, "products-db.js");

const publicExposeAllStockProducts = /^(1|true|yes)$/i.test(String(process.env.PUBLIC_EXPOSE_ALL_STOCK_PRODUCTS || "true"));
const publicStockExcludeThresholdQty = Math.max(0, Number(
  process.env.PUBLIC_STOCK_EXCLUDE_THRESHOLD_QTY
  || process.env.PUBLIC_MIN_STOCK_QTY
  || process.env.MIN_PUBLIC_STOCK_QTY
  || 50
) || 50);

const products = JSON.parse(await fs.readFile(productsPath, "utf8"));
if (!Array.isArray(products)) throw new Error("data/products.json must contain an array.");

const publicProducts = products
  .filter(isPublicCatalogProduct)
  .map(mapPublicProduct);

await fs.writeFile(productsDbPath, `window.PRODUCTS_DB = ${JSON.stringify(publicProducts, null, 2)};\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  sourceCount: products.length,
  publicCount: publicProducts.length,
  output: productsDbPath
}, null, 2));

function isPublicCatalogProduct(product) {
  return !isExcludedVerygoodProduct(product)
    && (publicExposeAllStockProducts || getProductStockQty(product) > publicStockExcludeThresholdQty);
}

function mapPublicProduct(product) {
  const customerProduct = normalizeCustomerProductClassification(product);
  const shouldHideStock = isHsBrandProduct(customerProduct);
  return stripUndefined({
    id: clean(customerProduct.id),
    productType: clean(customerProduct.productType),
    kind: getPublicProductGroup(customerProduct),
    name: clean(customerProduct.name),
    size: clean(customerProduct.size),
    modelName: clean(customerProduct.modelName || customerProduct.name),
    material: clean(customerProduct.material),
    surface: clean(customerProduct.surface),
    patternCategory: clean(customerProduct.patternCategory),
    color: clean(customerProduct.color),
    features: clean(customerProduct.features),
    finish: clean(customerProduct.finish),
    unit: clean(customerProduct.unit),
    option: clean(customerProduct.option),
    stockQty: shouldHideStock ? 0 : getProductStockQty(customerProduct),
    stockText: shouldHideStock ? "" : clean(customerProduct.stockText),
    image: clean(customerProduct.image),
    originalImage: clean(customerProduct.originalImage),
    closeImage: clean(customerProduct.closeImage),
    detailImage: clean(customerProduct.detailImage),
    daylightImage: clean(customerProduct.daylightImage),
    fluorescentImage: clean(customerProduct.fluorescentImage),
    sceneImage: clean(customerProduct.sceneImage)
  });
}

function getProductStockQty(product) {
  const stockQty = Number(product?.stockQty ?? product?.stock_qty ?? product?.stock ?? 0);
  return Number.isFinite(stockQty) ? stockQty : 0;
}

function isExcludedVerygoodProduct(product) {
  if (!isVerygoodProduct(product)) return false;
  const text = normalizeMatchText([
    product?.name,
    product?.kind,
    product?.option,
    product?.sourceCategoryName,
    product?.source_category_name
  ].filter(Boolean).join(" "));
  return /할인\s*\(?타일\)?|할인\s*\(?스톤\)?|할인품목|할\s*인\s*품\s*목/.test(text);
}

function isVerygoodProduct(product) {
  return clean(product?.id).startsWith("verygood-")
    || /^(VG|VERYGOOD)$/i.test(clean(product?.catalogSource || product?.catalog_source))
    || /verygood|vgtns|베리굿/i.test(clean(product?.sourceSite || product?.source_site));
}

function isHsBrandProduct(product) {
  return clean(product?.id).startsWith("hwashin-")
    || /^HS$/i.test(clean(product?.catalogSource || product?.catalog_source))
    || /myhwashin|화신/i.test(clean(product?.sourceSite || product?.source_site));
}

function normalizeCustomerProductClassification(product) {
  const text = normalizeMatchText([
    product?.name,
    product?.modelName,
    product?.option,
    product?.features,
    product?.sourceCategoryName,
    product?.source_category_name,
    product?.kind,
    product?.material
  ].filter(Boolean).join(" "));
  if (isBathroomCabinetText(text)) {
    return {
      ...product,
      productType: "accessory",
      kind: "욕실장",
      option: "욕실장",
      material: clean(product?.material) || "욕실제품",
      features: mergeFeatureText(product?.features, "욕실장")
    };
  }
  if (isBathroomPartitionText(text)) {
    return {
      ...product,
      productType: "accessory",
      kind: "악세사리",
      option: "파티션",
      material: clean(product?.material) || "욕실제품",
      features: mergeFeatureText(product?.features, "파티션")
    };
  }
  if (isBathroomCeilingText(text)) {
    return {
      ...product,
      productType: "accessory",
      kind: "악세사리",
      option: "천장재",
      material: clean(product?.material) || "욕실제품",
      features: mergeFeatureText(product?.features, "천장재")
    };
  }
  return product;
}

function getPublicProductGroup(product) {
  const productType = clean(product.productType);
  const internalCodes = new Set(["AJ", "VG", "US", "SG", "GT", "HS", "SNT"]);
  const semanticKind = clean(product.kind);
  if (["sanitary", "faucet", "accessory", "material"].includes(productType) && semanticKind && !internalCodes.has(semanticKind.toUpperCase())) {
    return semanticKind;
  }

  const productTypeLabels = {
    tile: "타일",
    sanitary: "위생도기",
    faucet: "수전금구",
    accessory: "악세사리",
    material: "부자재"
  };
  const candidates = [
    product.option,
    product.sourceCategoryName,
    product.source_category_name,
    product.material,
    productTypeLabels[productType] || productType
  ];
  for (const candidate of candidates) {
    const value = clean(candidate);
    if (!value) continue;
    if (internalCodes.has(value.toUpperCase())) continue;
    return value;
  }
  return "상품";
}

function isBathroomCabinetText(text) {
  return /하부장|상부장|거울장|욕실장|세면대장|수납장|키큰장|서랍장|슬라이드장|좌우오픈장|상하오픈장|원도어슬라이즈장|쇼바장|혼합형장|브루노장|패스트장|프로방스|사이드장|2도어장|sidecabinet|cabinet|vanity/.test(clean(text));
}

function isBathroomPartitionText(text) {
  return /파티션|샤워부스|부스파티션/.test(clean(text));
}

function isBathroomCeilingText(text) {
  return /천장재|점검구|돔형|평형/.test(clean(text));
}

function mergeFeatureText(value, addition) {
  const parts = clean(value)
    .split(/\s*\/\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!parts.includes(addition)) parts.unshift(addition);
  return [...new Set(parts)].join(" / ");
}

function normalizeMatchText(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[(){}\[\]_\-·/]/g, "");
}

function stripUndefined(product) {
  return Object.fromEntries(Object.entries(product).filter(([, value]) => value !== undefined));
}

function clean(value) {
  return String(value ?? "").trim();
}
