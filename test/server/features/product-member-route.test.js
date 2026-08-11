const test = require("node:test");
const assert = require("node:assert/strict");

const { handleProductRoutes } = require("../../../src/server/routes/product-routes");

test("member product route maps each product through assigned-price sanitizer", async () => {
  let sent;
  const request = {
    method: "GET",
    url: "/api/member/products",
    headers: { host: "localhost:4173" }
  };
  const context = {
    readMemberProductCredentialsFromRequest: () => ({ businessNumber: "123-45-67890", memberToken: "token" }),
    verifyMemberProductAccess: async () => ({ businessNumber: "123-45-67890", memberGrade: "B등급" }),
    areProductsHiddenFromStorefront: () => false,
    readProducts: async () => [{ id: "tile-1", productType: "tile", gradeAPrice: 100, gradeBPrice: 200 }],
    isPublicCatalogProduct: () => true,
    mapMemberProductForAccess: (product, member) => ({ id: product.id, memberGrade: member.memberGrade, memberUnitPrice: 200 }),
    sendJson: (_response, status, body) => { sent = { status, body }; }
  };

  assert.equal(await handleProductRoutes(request, {}, context), true);
  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body.products, [{ id: "tile-1", memberGrade: "B등급", memberUnitPrice: 200 }]);
  assert.doesNotMatch(JSON.stringify(sent.body.products), /gradeAPrice|gradeBPrice/);
});

test("admin grade pricing preview route uses admin credentials and returns a preview", async () => {
  let sent;
  const request = {
    method: "POST",
    url: "/api/admin/product-grade-pricing/preview",
    headers: { host: "localhost:4173" }
  };
  const context = {
    readRequestBody: async () => JSON.stringify({ filters: { productType: "tile" } }),
    readAdminCredentialsFromRequest: () => ({ adminUsername: "admin", adminToken: "token" }),
    previewAdminGradePricing: async (username, token, payload) => ({
      ok: username === "admin" && token === "token",
      filters: payload.filters,
      previewToken: "preview"
    }),
    sendJson: (_response, status, body) => { sent = { status, body }; }
  };

  assert.equal(await handleProductRoutes(request, {}, context), true);
  assert.equal(sent.status, 200);
  assert.equal(sent.body.previewToken, "preview");
  assert.deepEqual(sent.body.filters, { productType: "tile" });
});
