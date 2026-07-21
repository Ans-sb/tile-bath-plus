(function attachAdminProductsOverview(global) {
  "use strict";

  function buildAdminProductsOverview(options) {
    const products = Array.isArray(options.products) ? options.products : [];
    const signupRequests = Array.isArray(options.signupRequests) ? options.signupRequests : [];
    const cartRecords = Array.isArray(options.cartRecords) ? options.cartRecords : [];
    const approvalRules = options.approvalRules || {};
    const tableLimit = Number(options.tableLimit || 0) || 300;
    const stockInquiryThresholdQty = Number(options.stockInquiryThresholdQty || 0);
    const callbacks = options.callbacks || {};
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    const productTypeLabels = callbacks.productTypeLabels || {};
    const formatStockQuantity = callbacks.formatStockQuantity || ((product) => `${callbacks.number(product.stockQty || 0)}${product.unit || ""}`);

    const tileCount = products.filter((item) => item.productType === "tile").length;
    const sanitaryCount = products.filter((item) => item.productType === "sanitary").length;
    const materialCount = products.filter((item) => item.productType === "material").length;
    const lowStockCount = products.filter((item) => Number(item.stockQty || 0) <= stockInquiryThresholdQty).length;
    const categorySummary = Array.from(products.reduce((map, product) => {
      const typeLabel = productTypeLabels[product.productType] || product.productType || "-";
      const key = `${typeLabel}__${product.kind || "-"}`;
      const current = map.get(key) || {
        typeLabel,
        kind: product.kind || "-",
        count: 0
      };
      current.count += 1;
      map.set(key, current);
      return map;
    }, new Map()).values()).sort((a, b) => {
      if (a.typeLabel === b.typeLabel) return a.kind.localeCompare(b.kind, "ko");
      return a.typeLabel.localeCompare(b.typeLabel, "ko");
    });

    const summaryHtml = [
      ["전체 상품", `${callbacks.number(products.length)}개`, "현재 등록된 전체 상품 수"],
      ["타일 상품", `${callbacks.number(tileCount)}개`, "타일 및 타일 관련 상품 수"],
      ["위생도기", `${callbacks.number(sanitaryCount)}개`, "위생도기/수전/액세서리 수"],
      ["부자재", `${callbacks.number(materialCount)}개`, "부자재 상품 수"],
      ["재고 문의", `${callbacks.number(lowStockCount)}개`, `재고 ${stockInquiryThresholdQty} 이하 상품 수`],
      ["가입 신청", `${callbacks.number(signupRequests.length)}건`, "저장된 회원가입 신청 수"],
      ["저장 장바구니", `${callbacks.number(cartRecords.length)}건`, "업체별 저장된 장바구니 수"],
      ["승인 기준", `${callbacks.number((approvalRules.businessTypes || []).length)}개 업태`, "현재 내부 승인 기준 업태 수"]
    ].map(([label, value, note]) => `
      <article class="admin-summary-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(note)}</p>
      </article>
    `).join("");

    const categoryRowsHtml = categorySummary.map((entry) => `
      <tr>
        <td>${escapeHtml(entry.typeLabel)}</td>
        <td>${escapeHtml(entry.kind)}</td>
        <td>${callbacks.number(entry.count)}개</td>
      </tr>
    `).join("") || `<tr><td colspan="3">카테고리 집계 데이터가 없습니다.</td></tr>`;

    const visibleAdminProducts = products.slice(0, tableLimit);
    const priceRowsHtml = [
      ...visibleAdminProducts.map((product) => `
      <tr>
        <td>${escapeHtml(product.managementCode || "-")}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(productTypeLabels[product.productType] || product.productType || "-")}</td>
        <td>${escapeHtml(product.kind || "-")}</td>
        <td>${escapeHtml(product.size || "-")}</td>
        <td>${callbacks.money.format(product.costPrice || 0)}</td>
        <td>${callbacks.money.format(product.retailPrice || 0)}</td>
        <td>${callbacks.money.format(product.wholesalePrice || 0)}</td>
        <td>${escapeHtml(formatStockQuantity(product))}</td>
      </tr>
    `),
      ...(products.length > tableLimit ? [`
        <tr>
          <td colspan="9">대량 운영 속도를 위해 전체 ${callbacks.number(products.length)}개 중 ${callbacks.number(tableLimit)}개만 우선 표시합니다.</td>
        </tr>
      `] : [])
    ].join("") || `<tr><td colspan="9">표시할 상품이 없습니다.</td></tr>`;

    return {
      summaryHtml,
      categoryRowsHtml,
      priceRowsHtml
    };
  }

  global.TbpAdminProductsOverview = {
    buildAdminProductsOverview
  };
})(window);
