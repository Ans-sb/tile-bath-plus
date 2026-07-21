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
    const state = options.state || null;
    const callbacks = options.callbacks || {};
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    const displayColor = callbacks.getProductDisplayColor(product);
    const displayFinish = callbacks.getProductDisplayFinish(product);
    const expertReasons = callbacks.getProductExpertReasons(product, state);
    return `
    <article class="product-card">
      <button class="product-detail-trigger" type="button" data-view-product="${escapeHtml(product.id)}" aria-label="${escapeHtml(product.name)} 상세 보기">
        ${product.image ? `<img class="product-thumb" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" fetchpriority="low" />` : `<div class="product-thumb product-thumb-empty">이미지 없음</div>`}
      </button>
      <div>
        <button class="product-name-button" type="button" data-view-product="${escapeHtml(product.id)}">${escapeHtml(product.name)}</button>
        <span>사이즈 ${escapeHtml(product.size || "미확인")}</span>
        <span>색상 ${escapeHtml(displayColor)}</span>
        <span>마감 ${escapeHtml(displayFinish)}</span>
        <span>재고 ${escapeHtml(callbacks.hasStockValue(product) ? callbacks.formatStockQuantity(product) : "확인 필요")}</span>
        ${callbacks.renderProductCardAdminMeta(product)}
        ${callbacks.renderProductCardPriceLine(product)}
        ${expertReasons.length ? `<small class="expert-product-reasons">${expertReasons.map(escapeHtml).join(" · ")}</small>` : ""}
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
