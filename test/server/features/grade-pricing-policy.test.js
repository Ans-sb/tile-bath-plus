const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildGradePricingPlan,
  calculateGradePrices
} = require("../../../src/server/services/grade-pricing-policy");

test("grade prices use cost plus 25, 30, and 50 percent rounded up to 100 won", () => {
  assert.deepEqual(calculateGradePrices(10000), {
    gradeAPrice: 12500,
    gradeBPrice: 13000,
    gradeCPrice: 15000
  });
  assert.deepEqual(calculateGradePrices(1234), {
    gradeAPrice: 1600,
    gradeBPrice: 1700,
    gradeCPrice: 1900
  });
});

test("grade pricing plan updates only filtered products that have cost", () => {
  const plan = buildGradePricingPlan([
    { id: "a", name: "A", productType: "tile", catalogSource: "VG", costPrice: 10000 },
    { id: "b", name: "B", productType: "tile", catalogSource: "VG", costPrice: 0 },
    { id: "c", name: "C", productType: "material", catalogSource: "VG", costPrice: 20000 }
  ], {
    filters: { brand: "VG", productType: "tile" },
    updatedAt: "2026-08-11T00:00:00.000Z"
  });

  assert.equal(plan.summary.selectedCount, 2);
  assert.equal(plan.summary.eligibleCount, 1);
  assert.equal(plan.summary.changedCount, 1);
  assert.equal(plan.summary.missingCostCount, 1);
  assert.equal(plan.products[0].gradeAPrice, 12500);
  assert.equal(plan.products[0].gradeBPrice, 13000);
  assert.equal(plan.products[0].gradeCPrice, 15000);
  assert.equal("gradeAPrice" in plan.products[1], false);
  assert.equal("gradeAPrice" in plan.products[2], false);
  assert.match(plan.previewToken, /^[a-f0-9]{64}$/);
});
