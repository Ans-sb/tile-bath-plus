(function attachProductDto(global) {
  "use strict";

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

  function stripCustomerSensitiveProductFields(product) {
    const safe = {};
    for (const [key, value] of Object.entries(product || {})) {
      if (CUSTOMER_SENSITIVE_PRODUCT_FIELDS.has(key)) continue;
      if (value === undefined) continue;
      safe[key] = value;
    }
    return safe;
  }

  function mapPublicProductForClient(product, options = {}) {
    const includeMemberPrices = Boolean(options.includeMemberPrices);
    return stripCustomerSensitiveProductFields({
      id: product?.id,
      productType: product?.productType,
      kind: product?.kind,
      name: product?.name,
      size: product?.size,
      modelName: product?.modelName,
      material: product?.material,
      surface: product?.surface,
      patternCategory: product?.patternCategory,
      color: product?.color,
      features: product?.features,
      finish: product?.finish,
      countryOfOrigin: product?.countryOfOrigin,
      unit: product?.unit,
      option: product?.option,
      priceSortRank: includeMemberPrices ? product?.priceSortRank : undefined,
      retailPrice: includeMemberPrices ? product?.retailPrice : undefined,
      wholesalePrice: includeMemberPrices ? product?.wholesalePrice : undefined,
      gradeAPrice: includeMemberPrices ? product?.gradeAPrice : undefined,
      gradeBPrice: includeMemberPrices ? product?.gradeBPrice : undefined,
      gradeCPrice: includeMemberPrices ? product?.gradeCPrice : undefined,
      memberPriceVisible: includeMemberPrices ? product?.memberPriceVisible : undefined,
      stockQty: product?.stockQty,
      stockText: product?.stockText,
      matchScore: product?.matchScore,
      matchReasons: product?.matchReasons,
      image: product?.image,
      originalImage: product?.originalImage,
      closeImage: product?.closeImage,
      detailImage: product?.detailImage,
      daylightImage: product?.daylightImage,
      fluorescentImage: product?.fluorescentImage,
      sceneImage: product?.sceneImage
    });
  }

  global.TbpProductDto = {
    CUSTOMER_SENSITIVE_PRODUCT_FIELDS,
    stripCustomerSensitiveProductFields,
    mapPublicProductForClient
  };
})(window);
