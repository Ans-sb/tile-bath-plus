(function attachAdminOrders(global) {
  "use strict";

  function getCallbacks(options) {
    return options.callbacks || {};
  }

  function buildOperationOrderRowsHtml(options) {
    const orderRecords = Array.isArray(options.orderRecords) ? options.orderRecords : [];
    const callbacks = getCallbacks(options);
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    return orderRecords.slice(0, 12).map((entry) => `
    <tr>
      <td><strong>${escapeHtml(entry.companyName || "-")}</strong>${buildOrderMeta(entry, escapeHtml)}</td>
      <td>${callbacks.number(entry.itemCount || 0)}개</td>
      <td>${callbacks.money.format(entry.totalQuote || 0)}</td>
      <td><span class="quality-badge ${entry.stageKey === "waiting" ? "is-high" : entry.stageKey === "review" ? "is-mid" : "is-low"}">${escapeHtml(entry.orderNumber ? `${entry.statusLabel || "-"} · ${entry.orderNumber}` : entry.statusLabel || "-")}</span></td>
      <td>${escapeHtml(callbacks.formatDateTime(entry.updatedAt))}</td>
      <td>${buildOrderStatusActions(entry, escapeHtml)}</td>
    </tr>
  `).join("") || `<tr><td colspan="6">주문/장바구니 데이터가 없습니다.</td></tr>`;
  }

  function buildAdminCartRowsHtml(options) {
    const orderRecords = Array.isArray(options.orderRecords) ? options.orderRecords : [];
    const callbacks = getCallbacks(options);
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    return orderRecords.map((entry) => `
      <tr>
        <td>${escapeHtml(entry.companyName || "-")}</td>
        <td>${escapeHtml(entry.contactName || "-")}</td>
        <td>${escapeHtml(entry.businessNumber || "-")}</td>
        <td>${escapeHtml((entry.itemNames || []).slice(0, 3).join(", ") || "-")}${buildOrderMeta(entry, escapeHtml)}</td>
        <td>${callbacks.number(entry.itemCount || 0)}개</td>
        <td>${escapeHtml(entry.orderNumber ? `${entry.statusLabel || "-"} · ${entry.orderNumber}` : entry.statusLabel || "-")}</td>
        <td>${escapeHtml(callbacks.formatDateTime(entry.updatedAt))}</td>
        <td>${buildOrderStatusActions(entry, escapeHtml)}</td>
      </tr>
    `).join("") || `<tr><td colspan="8">저장된 주문/장바구니 데이터가 없습니다.</td></tr>`;
  }

  function buildAdminFlowCardsHtml(options) {
    const orderRecords = Array.isArray(options.orderRecords) ? options.orderRecords : [];
    const stageKey = options.stageKey || "";
    const callbacks = getCallbacks(options);
    const escapeHtml = callbacks.escapeHtml || ((value) => String(value ?? ""));
    const items = orderRecords.filter((entry) => entry.stageKey === stageKey);
    return {
      count: items.length,
      html: items.map((entry) => `
      <article class="admin-flow-card">
        <strong>${escapeHtml(entry.companyName || "-")}</strong>
        <span>${escapeHtml(entry.businessNumber || "-")}</span>
        <span>${callbacks.number(entry.itemCount || 0)}개 품목 · ${callbacks.money.format(entry.totalQuote || 0)}</span>
        ${buildOrderMeta(entry, escapeHtml)}
        <span>${escapeHtml(callbacks.formatDateTime(entry.updatedAt))}</span>
        ${buildOrderStatusActions(entry, escapeHtml)}
      </article>
    `).join("") || `<div class="empty-state compact-empty-state">해당 단계의 업체가 없습니다.</div>`
    };
  }

  function buildOrderStatusActions(entry, escapeHtml) {
    if (!entry?.orderNumber) return `<span class="muted-cell">장바구니</span>`;
    const orderNumber = escapeHtml(entry.orderNumber || "");
    const current = String(entry.statusLabel || entry.status || "");
    const statuses = [
      "접수대기",
      "주문확인",
      "결제대기",
      "결제완료",
      "재고확인",
      "견적확정",
      "출고준비",
      "배차대기",
      "배송중",
      "배송완료",
      "완료",
      "취소"
    ];
    return `
      <div class="admin-inline-actions">
        <select data-admin-order-status-select aria-label="${orderNumber} 주문 상태">
          ${statuses.map((status) => `<option value="${escapeHtml(status)}"${status === current || (current === "접수완료" && status === "주문확인") ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
        </select>
        <button class="secondary-action compact-action" type="button" data-admin-order-status-save data-order-number="${orderNumber}">상태 저장</button>
      </div>
    `;
  }

  function buildOrderMeta(entry, escapeHtml) {
    const meta = [
      entry.memberGradeSnapshot,
      entry.requestedDeliveryDate ? `희망일 ${entry.requestedDeliveryDate}` : "",
      entry.deliveryAddress,
      entry.contactPhone
    ].filter(Boolean);
    return meta.length ? `<small class="admin-order-meta">${escapeHtml(meta.join(" · "))}</small>` : "";
  }

  global.TbpAdminOrders = {
    buildOperationOrderRowsHtml,
    buildAdminCartRowsHtml,
    buildAdminFlowCardsHtml
  };
})(window);
