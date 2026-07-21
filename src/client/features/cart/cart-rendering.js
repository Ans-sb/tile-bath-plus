(function attachCartRendering(global) {
  "use strict";

  function renderCartMemberPriceReadout(options) {
    const callbacks = options.callbacks || {};
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    if (!callbacks.hasMemberPriceAccess()) {
      return `
      <div class="cart-price-readout price-locked-readout" aria-label="가격 승인 필요">
        <span>가격</span>
        <strong>승인 필요</strong>
        <small>${escapeHtml(callbacks.getPriceLockedMessage())}</small>
      </div>
    `;
    }
    return `
    <div class="cart-price-readout" aria-label="회원 기준 가격">
      <span>회원 기준가</span>
      <strong>${callbacks.money.format(callbacks.getMemberBaseUnitPrice(options.item))}</strong>
      <small>${escapeHtml(callbacks.getMemberBasePriceCaption())}</small>
    </div>
  `;
  }

  function getCartTileMeasurePanel(options) {
    const item = options.item || {};
    const callbacks = options.callbacks || {};
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    if (item.productType !== "tile") return "";

    const measure = callbacks.getCartTileMeasureState(item);
    if (!measure.pcsPerBox && !measure.sqmPerBox) {
      return `
      <div class="cart-tile-calculator cart-tile-calculator-empty">
        <strong>박스 계산 정보 없음</strong>
        <span>이 타일은 박스당 ㎡ 또는 낱장 정보가 없어 수량만 직접 입력할 수 있습니다.</span>
      </div>
    `;
    }

    return `
    <div class="cart-tile-calculator">
      <div class="cart-tile-calculator-meta">
        <strong>타일 수량 계산</strong>
        <span>
          ${measure.sqmPerBox ? `1BOX ${callbacks.formatMeasureNumber(measure.sqmPerBox)}㎡` : "㎡ 정보 없음"}
          ${measure.pcsPerBox ? ` · ${callbacks.number(measure.pcsPerBox)}장` : " · 낱장 정보 없음"}
        </span>
      </div>
      <label>
        필요 ㎡
        <input type="number" min="0" step="0.01" placeholder="예: 3.2" data-cart-sqm="${escapeHtml(item.id)}" />
      </label>
      <label>
        낱장
        <input type="number" min="0" step="1" placeholder="예: 9" data-cart-pieces="${escapeHtml(item.id)}" />
      </label>
      <div class="cart-tile-calculator-result">
        <span>현재 계산</span>
        <strong data-cart-box-result="${escapeHtml(item.id)}">${callbacks.number(measure.boxQty)}BOX</strong>
        <small data-cart-measure-result="${escapeHtml(item.id)}">${measure.estimatedSqm ? `${callbacks.formatMeasureNumber(measure.estimatedSqm)}㎡` : "-㎡"}${measure.estimatedPieces ? ` · 약 ${callbacks.number(measure.estimatedPieces)}장` : ""}</small>
      </div>
    </div>
  `;
  }

  function buildCartListHtml(options) {
    const items = Array.isArray(options.items) ? options.items : [];
    const callbacks = options.callbacks || {};
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    return items.map((item) => `
    <article class="cart-item">
      <div class="cart-item-main">
        ${item.image
          ? `<img class="cart-item-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />`
          : `<div class="cart-item-image cart-item-image-empty">이미지 없음</div>`}
        <div class="cart-item-copy">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(callbacks.productTypeLabels[item.productType])} · ${escapeHtml(item.kind)} · ${escapeHtml(item.size || "-")} · ${escapeHtml(item.option || item.finish || "-")}</span>
          <span class="cost-only">재고 ${escapeHtml(callbacks.formatStockQuantity ? callbacks.formatStockQuantity(item) : callbacks.number(item.stockQty))}</span>
        </div>
      </div>
      <div class="cart-controls">
        <label>${item.productType === "tile" ? "박스 수량" : "수량"}<input type="number" min="0.1" step="0.1" value="${item.qty}" data-cart-qty="${escapeHtml(item.id)}" /></label>
        ${renderCartMemberPriceReadout({ item, callbacks })}
        <label>견적단가<input type="number" min="0" step="100" value="${item.quotePrice}" data-cart-price="${escapeHtml(item.id)}" /></label>
        <button type="button" data-remove-product="${escapeHtml(item.id)}">삭제</button>
      </div>
      ${getCartTileMeasurePanel({ item, callbacks })}
    </article>
  `).join("") || `<div class="empty-state">장바구니가 비어 있습니다.</div>`;
  }

  global.TbpCartRendering = {
    renderCartMemberPriceReadout,
    getCartTileMeasurePanel,
    buildCartListHtml
  };
})(window);
