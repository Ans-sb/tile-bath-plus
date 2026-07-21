function createCartStore({
  hasSupabaseConfig,
  isMissingSupabaseTableError,
  normalizeCartItem,
  requestSupabase
}) {
  function sanitizeStoredCartItem(item) {
    const normalized = normalizeCartItem(item);
    return {
      id: normalized.id,
      managementCode: normalized.managementCode,
      productType: normalized.productType,
      kind: normalized.kind,
      name: normalized.name,
      size: normalized.size,
      finish: normalized.finish,
      unit: normalized.unit,
      option: normalized.option,
      stockQty: normalized.stockQty,
      image: normalized.image,
      qty: normalized.qty,
      quotePrice: normalized.quotePrice,
      renderedImage: normalized.renderedImage,
      renderTarget: normalized.renderTarget,
      renderPointMemo: normalized.renderPointMemo,
      renderRoomType: normalized.renderRoomType,
      renderInteriorStyle: normalized.renderInteriorStyle,
      renderStyleMemo: normalized.renderStyleMemo
    };
  }

  return {
    async readCartRecord(businessNumber) {
      const clean = String(businessNumber || "").trim();
      if (!clean) return { items: [] };
      if (!hasSupabaseConfig()) return { items: [] };

      const query = new URLSearchParams({
        select: "business_number,company_name,cart_data,updated_at",
        business_number: `eq.${clean}`
      });
      let rows = [];
      try {
        rows = await requestSupabase(`/rest/v1/carts?${query.toString()}`);
      } catch (error) {
        if (!isMissingSupabaseTableError(error, "carts")) throw error;
        return { businessNumber: clean, items: [] };
      }
      const row = Array.isArray(rows) ? rows[0] : null;
      return {
        businessNumber: clean,
        companyName: row?.company_name || "",
        items: Array.isArray(row?.cart_data) ? row.cart_data.map(sanitizeStoredCartItem) : [],
        updatedAt: row?.updated_at || ""
      };
    },

    async saveCartRecord(payload) {
      const businessNumber = String(payload?.businessNumber || "").trim();
      if (!businessNumber) {
        throw new Error("?λ컮援щ땲 ??μ뿉???ъ뾽?먮벑濡앸쾲?멸? ?꾩슂?⑸땲??");
      }

      const items = Array.isArray(payload?.items) ? payload.items.map(sanitizeStoredCartItem) : [];
      const companyName = String(payload?.companyName || "").trim();

      if (hasSupabaseConfig()) {
        try {
          await requestSupabase("/rest/v1/carts", {
            method: "POST",
            headers: {
              Prefer: "resolution=merge-duplicates,return=representation"
            },
            body: JSON.stringify([{
              business_number: businessNumber,
              company_name: companyName,
              cart_data: items
            }])
          });
        } catch (error) {
          if (!isMissingSupabaseTableError(error, "carts")) throw error;
        }
      }

      return {
        ok: true,
        businessNumber,
        items
      };
    },

    async readAllCartRecords() {
      const query = new URLSearchParams({
        select: "business_number,company_name,cart_data,updated_at",
        order: "updated_at.desc"
      });
      let rows = [];
      try {
        rows = await requestSupabase(`/rest/v1/carts?${query.toString()}`);
      } catch (error) {
        if (!isMissingSupabaseTableError(error, "carts")) throw error;
        return [];
      }
      return Array.isArray(rows) ? rows.map((row) => {
        const items = Array.isArray(row.cart_data) ? row.cart_data.map(sanitizeStoredCartItem) : [];
        return {
          businessNumber: String(row.business_number || "").trim(),
          companyName: String(row.company_name || "").trim(),
          itemCount: items.length,
          itemNames: items.map((item) => String(item.name || "").trim()).filter(Boolean),
          totalQuote: items.reduce((sum, item) => sum + (Number(item.quotePrice || 0) * Number(item.qty || 0)), 0),
          updatedAt: String(row.updated_at || "").trim()
        };
      }) : [];
    }
  };
}

module.exports = {
  createCartStore
};
