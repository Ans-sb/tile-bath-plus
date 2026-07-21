function createProductResponseMapper({
  publicExposeAllStockProducts,
  publicStockExcludeThresholdQty,
  stockInquiryThresholdQty,
  classifyPatternCategory,
  toBlankableNumber
}) {
  return {
    getProductStockQty,
    hasOrderableStock(product) {
      return getProductStockQty(product) > stockInquiryThresholdQty;
    },
    isPublicCatalogProduct(product) {
      return !isExcludedVerygoodProduct(product)
        && (publicExposeAllStockProducts || getProductStockQty(product) > publicStockExcludeThresholdQty);
    },
    isExcludedLowStockPublicProduct(product) {
      return !publicExposeAllStockProducts && getProductStockQty(product) <= publicStockExcludeThresholdQty;
    },
    isExcludedVerygoodProduct,
    isVerygoodProduct,
    mapAdminTileMatchProduct(product) {
      return {
        ...this.mapMemberProduct(product),
        maker: String(product.maker || "").trim(),
        sourceSite: String(product.sourceSite || "").trim(),
        sourceUrl: String(product.sourceUrl || "").trim(),
        sourceProductId: String(product.sourceProductId || "").trim(),
        sourceCategoryName: String(product.sourceCategoryName || "").trim(),
        catalogSource: String(product.catalogSource || "").trim(),
        stockQty: getProductStockQty(product),
        stockText: String(product.stockText || "").trim(),
        costPrice: Number(product.costPrice) || 0
      };
    },
    mapMemberProduct(product) {
      return {
        ...this.mapPublicProduct(product),
        priceSortRank: getPublicPriceSortRank(product),
        retailPrice: Number(product.retailPrice) || 0,
        wholesalePrice: Number(product.wholesalePrice) || 0,
        gradeAPrice: toBlankableNumber(product.gradeAPrice),
        gradeBPrice: toBlankableNumber(product.gradeBPrice),
        gradeCPrice: toBlankableNumber(product.gradeCPrice),
        memberPriceVisible: true
      };
    },
    mapPublicProduct(product) {
      const customerProduct = normalizeCustomerProductClassification(product);
      const shouldHideStock = isHsBrandProduct(customerProduct);
      return stripCustomerSensitiveProductFields({
        id: String(customerProduct.id || "").trim(),
        productType: String(customerProduct.productType || "").trim(),
        kind: getPublicProductGroup(customerProduct),
        name: String(customerProduct.name || "").trim(),
        size: String(customerProduct.size || "").trim(),
        modelName: String(customerProduct.modelName || customerProduct.name || "").trim(),
        material: String(customerProduct.material || "").trim(),
        surface: String(customerProduct.surface || "").trim(),
        patternCategory: String(customerProduct.patternCategory || "").trim() || classifyPatternCategory(customerProduct),
        color: String(customerProduct.color || "").trim(),
        features: String(customerProduct.features || "").trim(),
        finish: String(customerProduct.finish || "").trim(),
        maker: "",
        unit: String(customerProduct.unit || "").trim(),
        option: String(customerProduct.option || "").trim(),
        stockQty: shouldHideStock ? 0 : Number(customerProduct.stockQty) || 0,
        stockText: shouldHideStock ? "" : String(customerProduct.stockText || "").trim(),
        image: String(customerProduct.image || "").trim(),
        originalImage: String(customerProduct.originalImage || "").trim(),
        closeImage: String(customerProduct.closeImage || "").trim(),
        detailImage: String(customerProduct.detailImage || "").trim(),
        daylightImage: String(customerProduct.daylightImage || "").trim(),
        fluorescentImage: String(customerProduct.fluorescentImage || "").trim(),
        sceneImage: String(customerProduct.sceneImage || "").trim()
      });
    },
    normalizeCustomerProductClassification,
    stripCustomerSensitiveProductFields,
    getPublicPriceSortRank,
    getPublicProductGroup
  };
}

const CUSTOMER_SENSITIVE_PRODUCT_FIELDS = new Set([
  "brand",
  "brandCode",
  "brandName",
  "internalBrandId",
  "internalBrandCode",
  "internalBrandName",
  "internal_brand_id",
  "internal_brand_code",
  "internal_brand_name",
  "isCustomerBrandVisible",
  "is_customer_brand_visible",
  "maker",
  "manufacturer",
  "supplier",
  "supplierCode",
  "supplierName",
  "supplier_code",
  "supplier_name",
  "sourceSite",
  "sourceUrl",
  "sourceProductId",
  "sourceCategoryCode",
  "sourceCategoryName",
  "source_site",
  "source_url",
  "source_product_id",
  "source_category_code",
  "source_category_name",
  "catalogSource",
  "catalog_source",
  "cost",
  "costPrice",
  "cost_price",
  "purchasePrice",
  "purchase_price",
  "margin",
  "marginGrade",
  "qualityGrade",
  "margin_grade",
  "quality_grade",
  "adminSearchableText",
  "adminSearchText",
  "admin_searchable_text",
  "admin_search_text",
  "internalMemo",
  "internalNote",
  "internal_memo",
  "internal_note"
]);

function getProductStockQty(product) {
  const stockQty = Number(product?.stockQty ?? product?.stock_qty ?? product?.stock ?? product?.product?.stockQty ?? product?.product?.stock_qty ?? product?.product?.stock ?? 0);
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
  if (/할인\s*\(?타일\)?|할인\s*\(?스톤\)?|할인품목|할\s*인\s*품\s*목/.test(text)) return true;
  return false;
}

function isVerygoodProduct(product) {
  return String(product?.id || "").startsWith("verygood-")
    || /^(VG|VERYGOOD)$/i.test(String(product?.catalogSource || product?.catalog_source || "").trim())
    || /verygood|vgtns|베리굿/i.test(String(product?.sourceSite || product?.source_site || "").trim());
}

function isHsBrandProduct(product) {
  return String(product?.id || "").startsWith("hwashin-")
    || /^HS$/i.test(String(product?.catalogSource || product?.catalog_source || "").trim())
    || /myhwashin|화신/i.test(String(product?.sourceSite || product?.source_site || "").trim());
}

function stripCustomerSensitiveProductFields(product) {
  const safe = {};
  for (const [key, value] of Object.entries(product || {})) {
    if (CUSTOMER_SENSITIVE_PRODUCT_FIELDS.has(key)) continue;
    safe[key] = value;
  }
  return safe;
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
      material: String(product?.material || "").trim() || "욕실제품",
      features: mergeFeatureText(product?.features, "욕실장")
    };
  }
  if (isBathroomPartitionText(text)) {
    return {
      ...product,
      productType: "accessory",
      kind: "악세사리",
      option: "파티션",
      material: String(product?.material || "").trim() || "욕실제품",
      features: mergeFeatureText(product?.features, "파티션")
    };
  }
  if (isBathroomCeilingText(text)) {
    return {
      ...product,
      productType: "accessory",
      kind: "악세사리",
      option: "천장재",
      material: String(product?.material || "").trim() || "욕실제품",
      features: mergeFeatureText(product?.features, "천장재")
    };
  }
  return product;
}

function isBathroomCabinetText(text) {
  return /하부장|상부장|거울장|욕실장|세면대장|수납장|키큰장|서랍장|슬라이드장|좌우오픈장|상하오픈장|원도어슬라이즈장|쇼바장|혼합형장|브루노장|패스트장|프로방스|사이드장|2도어장|sidecabinet|cabinet|vanity/.test(String(text || ""));
}

function isBathroomPartitionText(text) {
  return /파티션|샤워부스|부스파티션/.test(String(text || ""));
}

function isBathroomCeilingText(text) {
  return /천장재|점검구|돔형|평형/.test(String(text || ""));
}

function mergeFeatureText(value, addition) {
  const parts = String(value || "")
    .split(/\s*\/\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!parts.includes(addition)) parts.unshift(addition);
  return parts.join(" / ");
}

function getPublicPriceSortRank(product) {
  const price = Number(
    product?.retailPrice
    || product?.wholesalePrice
    || product?.gradeAPrice
    || product?.gradeBPrice
    || product?.gradeCPrice
    || 0
  );
  if (!price) return 0;
  const bands = [5000, 10000, 15000, 20000, 30000, 50000, 80000, 120000, 200000, 500000, 1000000];
  const index = bands.findIndex((limit) => price <= limit);
  return index >= 0 ? index + 1 : bands.length + 1;
}

function getPublicProductGroup(product) {
  const productType = String(product.productType || "").trim();
  const internalCodes = new Set(["AJ", "VG", "US", "SG", "GT", "HS"]);
  const semanticKind = String(product.kind || "").trim();
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
    const value = String(candidate || "").trim();
    if (!value) continue;
    if (internalCodes.has(value.toUpperCase())) continue;
    return value;
  }
  return "상품";
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[(){}\[\]_\-·/]/g, "");
}

module.exports = {
  createProductResponseMapper
};
