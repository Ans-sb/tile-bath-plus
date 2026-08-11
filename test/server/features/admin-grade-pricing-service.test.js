const test = require("node:test");
const assert = require("node:assert/strict");

const { createAdminProductService } = require("../../../src/server/services/admin-product-service");

function createService(products, saved) {
  return createAdminProductService({
    assertAdminCredentials: (username, token) => {
      assert.equal(username, "admin");
      assert.equal(token, "token");
    },
    readProducts: async () => products,
    saveProduct: async () => products,
    saveProducts: async (nextProducts, changedProducts) => {
      saved.nextProducts = nextProducts;
      saved.changedProducts = changedProducts;
      return { products: nextProducts, backupPath: "backup.json" };
    },
    normalizeProduct: (product) => product,
    mapPublicProduct: (product) => product
  });
}

test("admin grade pricing requires matching preview token before applying", async () => {
  const products = [{ id: "a", productType: "tile", name: "A", costPrice: 10000 }];
  const saved = {};
  const service = createService(products, saved);
  const preview = await service.previewAdminGradePricing("admin", "token", { filters: { productType: "tile" } });

  await assert.rejects(
    () => service.applyAdminGradePricing("admin", "token", { filters: { productType: "tile" }, previewToken: "stale" }),
    /미리보기를 다시/
  );

  const applied = await service.applyAdminGradePricing("admin", "token", {
    filters: { productType: "tile" },
    previewToken: preview.previewToken
  });
  assert.equal(applied.applied, true);
  assert.equal(applied.summary.changedCount, 1);
  assert.equal(saved.changedProducts[0].gradeAPrice, 12500);
  assert.equal(saved.changedProducts[0].gradeBPrice, 13000);
  assert.equal(saved.changedProducts[0].gradeCPrice, 15000);
  assert.equal(applied.backupPath, "backup.json");
});
