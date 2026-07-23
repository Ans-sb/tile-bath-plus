(function attachProductDetail(global) {
  "use strict";

  const GALLERY_SLOTS = [
    ["제품 원장 실사 이미지", ["originalImage", "liveImage", "rawImage", "fieldImage", "image"], true],
    ["클로즈 이미지", ["closeImage", "closeupImage", "zoomImage"], false],
    ["디테일 이미지", ["detailImage", "textureImage", "surfaceImage"], false],
    ["자연광 이미지", ["daylightImage", "naturalLightImage"], false],
    ["형광등 이미지", ["fluorescentImage", "lampImage", "indoorLightImage"], false],
    ["연출 이미지", ["sceneImage", "stagedImage", "lifestyleImage", "renderImage"], false]
  ];

  function buildProductDetailView(options) {
    const product = options.product || {};
    const callbacks = options.callbacks || {};
    const displayName = getDisplayName(product, callbacks);
    return {
      title: displayName,
      mainMediaHtml: buildMainMediaHtml(product, callbacks),
      specGridHtml: buildSpecGridHtml(product, callbacks),
      galleryHtml: buildGalleryHtml(product, callbacks)
    };
  }

  function buildMainMediaHtml(product, callbacks) {
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    const displayName = getDisplayName(product, callbacks);
    const primaryImage = callbacks.getProductImage(product, ["image", "originalImage", "liveImage", "closeImage"], true);
    return primaryImage
      ? `
      <button class="detail-image-preview-trigger detail-main-preview-trigger" type="button" data-preview-image="${escapeHtml(primaryImage)}" data-preview-title="${escapeHtml(displayName)} 대표 이미지">
        <img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(displayName)} 대표 이미지" />
      </button>
    `
      : `<div class="detail-main-placeholder">이미지 준비중</div>`;
  }

  function buildSpecGridHtml(product, callbacks) {
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    const specs = buildProductSpecs(product, callbacks);
    return specs.map(([label, value]) => `
    <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join("");
  }

  function buildProductSpecs(product, callbacks) {
    if (callbacks.isBathProduct?.(product)) {
      return buildBathProductSpecs(product, callbacks);
    }
    const stockText = callbacks.getProductStockText
      ? callbacks.getProductStockText(product)
      : String(product.stockText || "").trim();
    const displaySize = callbacks.getProductDisplaySize
      ? callbacks.getProductDisplaySize(product)
      : product.size || "-";
    const displayThickness = callbacks.getProductDisplayThickness
      ? callbacks.getProductDisplayThickness(product)
      : "-";
    const displayOrigin = callbacks.getProductDisplayOrigin
      ? callbacks.getProductDisplayOrigin(product)
      : product.countryOfOrigin || "-";
    const displayName = getDisplayName(product, callbacks);
    const displayKind = callbacks.getProductDisplayKind
      ? callbacks.getProductDisplayKind(product)
      : product.kind || "-";
    return [
      ...(product.managementCode ? [["내부관리 상품코드", product.managementCode]] : []),
      ...(callbacks.isAdmin ? buildAdminSpecs(product, callbacks) : []),
      ["대분류", callbacks.productTypeLabels[product.productType] || product.productType || "-"],
      ["종류", displayKind],
      ["품명", displayName],
      ["사이즈", displaySize],
      ["두께", displayThickness],
      ["원산지", displayOrigin],
      ["패턴 카테고리", product.patternCategory || "-"],
      ["제조사", product.maker || "-"],
      ["단위", product.unit || "-"],
      ["유광/무광", product.finish || "-"],
      ["옵션", product.option || "-"],
      ...callbacks.getProductDetailPriceSpecs(product),
      ...(callbacks.hasStockValue(product) ? [["재고량", callbacks.formatStockQuantity(product)]] : []),
      ...(stockText ? [["재고 위치", stockText]] : []),
      ["카탈로그", product.catalogSource || "-"],
      ["카탈로그 페이지", product.catalogPage ? `${product.catalogPage}P` : "-"]
    ];
  }

  function buildBathProductSpecs(product, callbacks) {
    const stockText = callbacks.getProductStockText
      ? callbacks.getProductStockText(product)
      : String(product.stockText || "").trim();
    const displaySize = callbacks.getProductDisplaySize
      ? callbacks.getProductDisplaySize(product)
      : product.size || "-";
    const displayOrigin = callbacks.getProductDisplayOrigin
      ? callbacks.getProductDisplayOrigin(product)
      : product.countryOfOrigin || "-";
    const categoryId = callbacks.getBathProductBaseCategoryId(product);
    const category = callbacks.getBathProductCategory(categoryId);
    const subcategoryId = callbacks.getBathProductSubcategoryId(product, categoryId);
    const subcategory = category?.subcategories?.find((item) => item.id === subcategoryId);
    const categoryLabel = categoryId === "other" ? "욕실상품" : category?.label || "욕실상품";
    const itemLabel = subcategory?.label || categoryLabel;
    const displayName = getDisplayName(product, callbacks);
    return [
      ...(callbacks.isAdmin && product.managementCode ? [["내부관리 상품코드", product.managementCode]] : []),
      ...(callbacks.isAdmin ? buildAdminSpecs(product, callbacks) : []),
      ["품목", categoryLabel],
      ["세부 품목", itemLabel],
      ["상품명", displayName],
      ["규격", displaySize],
      ["옵션", product.option || "-"],
      ["재질", product.material || "-"],
      ["원산지", displayOrigin],
      ["판매 단위", product.unit || "-"],
      ...callbacks.getProductDetailPriceSpecs(product),
      ...(callbacks.hasStockValue(product) ? [["재고", callbacks.formatStockQuantity(product)]] : []),
      ...(stockText ? [["재고 안내", stockText]] : [])
    ];
  }

  function buildAdminSpecs(product, callbacks) {
    const cost = Number(product?.costPrice || 0);
    return [
      ["브랜드", callbacks.getAdminProductBrandLabel(product) || "-"],
      ["원가", cost ? callbacks.money.format(cost) : "미등록"],
      ...(product?.sourceSite ? [["소스", product.sourceSite]] : []),
      ...(product?.sourceUrl ? [["원본 상세 URL", product.sourceUrl]] : [])
    ];
  }

  function buildGalleryHtml(product, callbacks) {
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    const displayName = getDisplayName(product, callbacks);
    return GALLERY_SLOTS.map(([label, keys, allowPrimary]) => {
      const image = callbacks.getProductImage(product, keys, allowPrimary);
      return `
      <article class="detail-image-card">
        <strong>${escapeHtml(label)}</strong>
        ${image ? `
          <button class="detail-image-preview-trigger" type="button" data-preview-image="${escapeHtml(image)}" data-preview-title="${escapeHtml(displayName)} ${escapeHtml(label)}">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(displayName)} ${escapeHtml(label)}" loading="lazy" />
          </button>
        ` : `<div class="detail-image-empty">이미지 준비중</div>`}
      </article>
    `;
    }).join("");
  }

  function getDisplayName(product, callbacks) {
    return callbacks.getProductDisplayName
      ? callbacks.getProductDisplayName(product)
      : product.name || "상품 상세";
  }

  global.TbpProductDetail = {
    buildProductDetailView,
    buildProductSpecs,
    buildBathProductSpecs,
    buildAdminSpecs,
    buildGalleryHtml
  };
})(window);
