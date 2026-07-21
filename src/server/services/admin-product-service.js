function createAdminProductService({
  assertAdminCredentials,
  readProducts,
  saveProduct,
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
    }
  };
}

module.exports = {
  createAdminProductService
};
