const { buildGradePricingPlan } = require("./grade-pricing-policy");

function createAdminProductService({
  assertAdminCredentials,
  readProducts,
  saveProduct,
  saveProducts,
  normalizeProduct,
  mapPublicProduct
}) {
  return {
    async readAdminProduct(adminUsernameValue, adminTokenValue, id) {
      assertAdminCredentials(adminUsernameValue, adminTokenValue);
      const cleanId = String(id || "").trim();
      if (!cleanId) throw new Error("상품 ID가 필요합니다.");
      const products = await readProducts();
      const product = products.find((item) => item.id === cleanId);
      if (!product) throw new Error("상품을 찾을 수 없습니다.");
      return { ok: true, product };
    },

    async readAdminProducts(adminUsernameValue, adminTokenValue) {
      assertAdminCredentials(adminUsernameValue, adminTokenValue);
      return {
        ok: true,
        products: await readProducts({ cache: false })
      };
    },

    async saveAdminProduct(payload) {
      assertAdminCredentials(payload?.adminUsername, payload?.adminToken);
      const product = normalizeProduct(payload?.product || {});
      const products = await saveProduct(product);
      return {
        ok: true,
        product,
        products: products.map(mapPublicProduct)
      };
    },

    async previewAdminGradePricing(adminUsernameValue, adminTokenValue, payload = {}) {
      assertAdminCredentials(adminUsernameValue, adminTokenValue);
      const plan = buildGradePricingPlan(await readProducts({ cache: false }), {
        filters: payload.filters,
        stockInquiryThresholdQty: payload.stockInquiryThresholdQty
      });
      return {
        ok: true,
        filters: plan.filters,
        previewToken: plan.previewToken,
        summary: plan.summary
      };
    },

    async applyAdminGradePricing(adminUsernameValue, adminTokenValue, payload = {}) {
      assertAdminCredentials(adminUsernameValue, adminTokenValue);
      const plan = buildGradePricingPlan(await readProducts({ cache: false }), {
        filters: payload.filters,
        stockInquiryThresholdQty: payload.stockInquiryThresholdQty
      });
      if (!payload.previewToken || payload.previewToken !== plan.previewToken) {
        const error = new Error("상품 데이터가 변경되었습니다. 가격 미리보기를 다시 실행해주세요.");
        error.statusCode = 409;
        throw error;
      }
      if (!plan.changedProducts.length) {
        return { ok: true, applied: false, summary: plan.summary, backupPath: "" };
      }
      const saved = await saveProducts(plan.products, plan.changedProducts, { backupLabel: "grade-pricing" });
      return {
        ok: true,
        applied: true,
        summary: plan.summary,
        backupPath: saved.backupPath || ""
      };
    }
  };
}

module.exports = {
  createAdminProductService
};
