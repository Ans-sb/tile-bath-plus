(function attachProposalPayload(global, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else global.TbpProposalPayload = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createProposalPayloadApi() {
  "use strict";

  function buildProposalPayload(options = {}) {
    const state = options.proposalState || {};
    const selectedProducts = Array.isArray(options.selectedProducts) ? options.selectedProducts : [];
    const selectedRenderedIds = options.selectedRenderedIds instanceof Set
      ? options.selectedRenderedIds
      : new Set(options.selectedRenderedIds || []);
    const includeAdminQuotePrice = options.includeAdminQuotePrice === true;

    return {
      proposal: {
        title: state.title,
        customerName: state.customer,
        customerPhone: state.phone,
        siteAddress: state.address,
        startDate: state.startDate,
        validDays: state.validDays,
        proposalDate: toIsoString(state.date),
        validDate: toIsoString(state.validDate),
        intro: state.intro,
        notice: state.notice,
        memo: state.memo,
        theme: state.theme
      },
      company: {
        name: state.companyName,
        managerName: state.managerName,
        managerTitle: state.managerTitle,
        managerPhone: state.managerPhone
      },
      cart: selectedProducts.map((item) => buildProposalCartItem(item, selectedRenderedIds, {
        includeAdminQuotePrice
      }))
    };
  }

  function buildProposalCartItem(item = {}, selectedRenderedIds = new Set(), options = {}) {
    const id = String(item.id || "").trim();
    const includeRender = Boolean(id && selectedRenderedIds.has(id));

    const result = {
      id,
      qty: Number(item.qty || 0),
      renderedImage: includeRender ? String(item.renderedImage || "") : "",
      renderTarget: includeRender ? String(item.renderTarget || "") : "",
      renderPointMemo: includeRender ? String(item.renderPointMemo || "") : "",
      renderSurfaceSelections: includeRender && item.renderSurfaceSelections && typeof item.renderSurfaceSelections === "object"
        ? item.renderSurfaceSelections
        : {}
    };

    if (options.includeAdminQuotePrice === true) {
      result.quotePrice = Math.max(Number(item.quotePrice) || 0, 0);
    }

    return result;
  }

  function toIsoString(value) {
    if (value && typeof value.toISOString === "function") return value.toISOString();
    const parsed = new Date(value || Date.now());
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  return {
    buildProposalCartItem,
    buildProposalPayload
  };
});
