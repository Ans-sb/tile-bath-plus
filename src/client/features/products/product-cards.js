(function attachProductCards(global) {
  "use strict";

  function buildProductPageCardsHtml(options) {
    const pageProducts = Array.isArray(options.pageProducts) ? options.pageProducts : [];
    const state = options.state || {};
    const callbacks = options.callbacks || {};
    return pageProducts.map((product) => buildProductCardHtml({ product, state, callbacks })).join("")
      || `<div class="empty-state">${state.keyword ? "품명 검색 결과가 없습니다." : "새 상품 리스트 업데이트 준비 중입니다."}</div>`;
  }

  function buildProductCardHtml(options) {
    const product = options.product || {};
    const callbacks = options.callbacks || {};
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    const displayName = callbacks.getProductDisplayName
      ? callbacks.getProductDisplayName(product)
      : product.name || "상품명 미확인";
    const displayCode = callbacks.getProductDisplayCode
      ? callbacks.getProductDisplayCode(product)
      : product.modelName || product.sourceProductId || "미확인";
    const displaySize = callbacks.getProductDisplaySize
      ? callbacks.getProductDisplaySize(product)
      : product.size || "미확인";
    const displayFinish = callbacks.getProductDisplayFinish(product);
    return `
    <article class="product-card">
      <button class="product-detail-trigger" type="button" data-view-product="${escapeHtml(product.id)}" aria-label="${escapeHtml(displayName)} 상세 보기">
        ${product.image ? `<img class="product-thumb" src="${escapeHtml(product.image)}" alt="${escapeHtml(displayName)}" loading="lazy" decoding="async" fetchpriority="low" />` : `<div class="product-thumb product-thumb-empty">이미지 없음</div>`}
      </button>
      <div>
        <button class="product-name-button" type="button" data-view-product="${escapeHtml(product.id)}">${escapeHtml(displayName)}</button>
        <span>품번 ${escapeHtml(displayCode)}</span>
        <span>사이즈 ${escapeHtml(displaySize)}</span>
        <span>마감 ${escapeHtml(displayFinish)}</span>
      </div>
      <button type="button" data-add-product="${escapeHtml(product.id)}">담기</button>
    </article>
  `;
  }

  global.TbpProductCards = {
    buildProductPageCardsHtml,
    buildProductCardHtml
  };
})(window);
