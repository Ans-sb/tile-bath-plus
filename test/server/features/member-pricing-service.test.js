const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getMemberUnitPrice,
  mapMemberProductForAccess,
  normalizeMemberGrade
} = require("../../../src/server/services/member-pricing-service");

const product = {
  id: "tile-1",
  name: "Beige stone",
  gradeAPrice: 10000,
  gradeBPrice: 12000,
  gradeCPrice: 14000,
  retailPrice: 18000,
  wholesalePrice: 11000,
  internal_brand_name: "PRIVATE_BRAND",
  supplier_name: "PRIVATE_SUPPLIER",
  costPrice: 7000
};

test("member pricing selects the assigned A, B, or C grade only", () => {
  assert.equal(getMemberUnitPrice(product, { memberGrade: "A등급" }), 10000);
  assert.equal(getMemberUnitPrice(product, { memberGrade: "B등급" }), 12000);
  assert.equal(getMemberUnitPrice(product, { memberGrade: "C등급" }), 14000);
  assert.equal(getMemberUnitPrice(product, { memberGrade: "사업자" }), 12000);
  assert.equal(normalizeMemberGrade("unknown"), "B");
});

test("member pricing uses the configured legacy price only while grade prices are empty", () => {
  const legacyProduct = {
    retailPrice: 18000,
    wholesalePrice: 13000
  };
  assert.equal(getMemberUnitPrice(legacyProduct, { memberGrade: "A등급", priceTier: "wholesale" }), 13000);
  assert.equal(getMemberUnitPrice(legacyProduct, { memberGrade: "C등급", priceTier: "retail" }), 18000);
});

test("member product response contains one assigned price and no internal or alternate prices", () => {
  const result = mapMemberProductForAccess(product, { memberGrade: "C등급", priceTier: "wholesale" }, (entry) => ({
    id: entry.id,
    name: entry.name
  }));

  assert.equal(result.memberUnitPrice, 14000);
  assert.equal(result.memberGrade, "C등급");
  assert.equal(result.memberPriceLabel, "C등급가");
  assert.doesNotMatch(JSON.stringify(result), /gradeAPrice|gradeBPrice|gradeCPrice|retailPrice|wholesalePrice|costPrice|PRIVATE|supplier/i);
});
