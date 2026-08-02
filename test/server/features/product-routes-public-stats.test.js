const test = require("node:test");
const assert = require("node:assert/strict");

const { handleProductRoutes } = require("../../../src/server/routes/product-routes");

test("public platform stats expose counts without internal product fields", async () => {
  let sent;
  const publicStats = {
    totalProducts: 6769,
    tileProducts: 5192,
    partnerCompanies: 342,
    fieldDeliveries: 10800
  };

  const handled = await handleProductRoutes(
    { method: "GET", url: "/api/public/platform-stats", headers: { host: "localhost" } },
    {},
    {
      readPublicPlatformStats: async () => publicStats,
      sendJson: (_response, status, body) => { sent = { status, body }; }
    }
  );

  assert.equal(handled, true);
  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body, publicStats);

  const serialized = JSON.stringify(sent.body);
  [
    "internal_brand_id",
    "internal_brand_code",
    "internal_brand_name",
    "supplier_name",
    "margin_grade",
    "quality_grade",
    "cost"
  ].forEach((forbiddenField) => assert.equal(serialized.includes(forbiddenField), false));
});
