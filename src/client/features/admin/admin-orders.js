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
      <td>${escapeHtml(entry.companyName || "-")}</td>
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
        <td>${escapeHtml((entry.itemNames || []).slice(0, 3).join(", ") || "-")}</td>
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
    const nextStatuses = ["접수완료", "재고확인", "견적확정", "출고준비", "완료"];
    return `
      <div class="admin-inline-actions">
        ${nextStatuses.filter((status) => status !== current).slice(0, 3).map((status) => `
          <button class="secondary-action compact-action" type="button" data-admin-order-status="${escapeHtml(status)}" data-order-number="${orderNumber}">${escapeHtml(status)}</button>
        `).join("")}
      </div>
    `;
  }

  global.TbpAdminOrders = {
    buildOperationOrderRowsHtml,
    buildAdminCartRowsHtml,
    buildAdminFlowCardsHtml
  };
})(window);
