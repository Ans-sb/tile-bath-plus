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
    return {
      title: product.name || "상품 상세",
      mainMediaHtml: buildMainMediaHtml(product, callbacks),
      specGridHtml: buildSpecGridHtml(product, callbacks),
      galleryHtml: buildGalleryHtml(product, callbacks)
    };
  }

  function buildMainMediaHtml(product, callbacks) {
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    const primaryImage = callbacks.getProductImage(product, ["image", "originalImage", "liveImage", "closeImage"], true);
    return primaryImage
      ? `
      <button class="detail-image-preview-trigger detail-main-preview-trigger" type="button" data-preview-image="${escapeHtml(primaryImage)}" data-preview-title="${escapeHtml(product.name || "제품")} 대표 이미지">
        <img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(product.name)} 대표 이미지" />
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
    const stockText = callbacks.getProductStockText
      ? callbacks.getProductStockText(product)
      : String(product.stockText || "").trim();
    const displaySize = callbacks.getProductDisplaySize
      ? callbacks.getProductDisplaySize(product)
      : product.size || "-";
    const displayThickness = callbacks.getProductDisplayThickness
      ? callbacks.getProductDisplayThickness(product)
      : "-";
    return [
      ...(product.managementCode ? [["내부관리 상품코드", product.managementCode]] : []),
      ...(callbacks.isAdmin ? buildAdminSpecs(product, callbacks) : []),
      ["대분류", callbacks.productTypeLabels[product.productType] || product.productType || "-"],
      ["종류", product.kind || "-"],
      ["품명", product.name || "-"],
      ["사이즈", displaySize],
      ["두께", displayThickness],
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
    return GALLERY_SLOTS.map(([label, keys, allowPrimary]) => {
      const image = callbacks.getProductImage(product, keys, allowPrimary);
      return `
      <article class="detail-image-card">
        <strong>${escapeHtml(label)}</strong>
        ${image ? `
          <button class="detail-image-preview-trigger" type="button" data-preview-image="${escapeHtml(image)}" data-preview-title="${escapeHtml(product.name || "제품")} ${escapeHtml(label)}">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)} ${escapeHtml(label)}" loading="lazy" />
          </button>
        ` : `<div class="detail-image-empty">이미지 준비중</div>`}
      </article>
    `;
    }).join("");
  }

  global.TbpProductDetail = {
    buildProductDetailView,
    buildProductSpecs,
    buildAdminSpecs,
    buildGalleryHtml
  };
})(window);
