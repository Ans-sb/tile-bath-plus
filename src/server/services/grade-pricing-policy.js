const crypto = require("crypto");

const GRADE_MARGIN_RATES = Object.freeze({
  A: 0.25,
  B: 0.30,
  C: 0.50
});
const PRICE_ROUND_UNIT = 100;
const POLICY_CODE = "cost-plus-25-30-50-v1";

function clean(value) {
  return String(value || "").trim();
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function roundPriceUp(value, unit = PRICE_ROUND_UNIT) {
  const number = toPositiveNumber(value);
  const roundUnit = Math.max(1, Number(unit) || PRICE_ROUND_UNIT);
  return number ? Math.ceil(number / roundUnit) * roundUnit : 0;
}

function calculateGradePrices(costPrice) {
  const cost = toPositiveNumber(costPrice);
  if (!cost) return { gradeAPrice: 0, gradeBPrice: 0, gradeCPrice: 0 };
  return {
    gradeAPrice: roundPriceUp(cost * (1 + GRADE_MARGIN_RATES.A)),
    gradeBPrice: roundPriceUp(cost * (1 + GRADE_MARGIN_RATES.B)),
    gradeCPrice: roundPriceUp(cost * (1 + GRADE_MARGIN_RATES.C))
  };
}

function getAdminProductBrand(product) {
  const direct = clean(
    product?.catalogSource
    || product?.internal_brand_code
    || product?.internalBrandCode
    || product?.internal_brand_name
    || product?.internalBrandName
  );
  if (direct) return direct;
  const kind = clean(product?.kind);
  return /^(AJ|GT|HS|SG|SNT|US|VG)$/i.test(kind) ? kind.toUpperCase() : "";
}

function matchesPricingFilters(product, filters = {}, stockInquiryThresholdQty = 30) {
  const brand = clean(filters.brand);
  const productType = clean(filters.productType);
  const stock = clean(filters.stock);
  const query = clean(filters.query).toLowerCase();
  if (brand && getAdminProductBrand(product) !== brand) return false;
  if (productType && clean(product?.productType) !== productType) return false;
  const stockQty = Number(product?.stockQty || 0);
  if (stock === "available" && stockQty <= stockInquiryThresholdQty) return false;
  if (stock === "inquiry" && stockQty > stockInquiryThresholdQty) return false;
  if (!query) return true;
  return [
    product?.managementCode,
    product?.modelName,
    product?.name,
    product?.size,
    product?.kind,
    product?.countryOfOrigin
  ].some((value) => clean(value).toLowerCase().includes(query));
}

function buildPlanToken(changedProducts, filters) {
  const digestSource = changedProducts.map((product) => [
    product.id,
    product.costPrice,
    product.gradeAPrice,
    product.gradeBPrice,
    product.gradeCPrice
  ]);
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ policy: POLICY_CODE, filters, products: digestSource }))
    .digest("hex");
}

function buildGradePricingPlan(products, options = {}) {
  const source = Array.isArray(products) ? products : [];
  const filters = {
    brand: clean(options?.filters?.brand),
    query: clean(options?.filters?.query),
    productType: clean(options?.filters?.productType),
    stock: clean(options?.filters?.stock)
  };
  const stockInquiryThresholdQty = Math.max(0, Number(options.stockInquiryThresholdQty || 30));
  const selected = source.filter((product) => matchesPricingFilters(product, filters, stockInquiryThresholdQty));
  const changedProducts = [];
  const preview = [];
  let missingCostCount = 0;
  let unchangedCount = 0;
  const updatedAt = clean(options.updatedAt) || new Date().toISOString();

  const nextProducts = source.map((product) => {
    if (!matchesPricingFilters(product, filters, stockInquiryThresholdQty)) return product;
    const costPrice = toPositiveNumber(product?.costPrice);
    if (!costPrice) {
      missingCostCount += 1;
      return product;
    }
    const prices = calculateGradePrices(costPrice);
    const unchanged = Number(product.gradeAPrice || 0) === prices.gradeAPrice
      && Number(product.gradeBPrice || 0) === prices.gradeBPrice
      && Number(product.gradeCPrice || 0) === prices.gradeCPrice;
    if (unchanged) {
      unchangedCount += 1;
      return product;
    }
    const updated = {
      ...product,
      ...prices,
      gradePricingPolicy: POLICY_CODE,
      gradePricingUpdatedAt: updatedAt
    };
    changedProducts.push(updated);
    if (preview.length < 12) {
      preview.push({
        id: clean(product.id),
        managementCode: clean(product.managementCode),
        name: clean(product.name),
        costPrice,
        ...prices
      });
    }
    return updated;
  });

  const summary = {
    policyCode: POLICY_CODE,
    rates: { ...GRADE_MARGIN_RATES },
    roundUnit: PRICE_ROUND_UNIT,
    selectedCount: selected.length,
    eligibleCount: selected.length - missingCostCount,
    changedCount: changedProducts.length,
    unchangedCount,
    missingCostCount,
    preview
  };

  return {
    filters,
    products: nextProducts,
    changedProducts,
    summary,
    previewToken: buildPlanToken(changedProducts, filters)
  };
}

module.exports = {
  GRADE_MARGIN_RATES,
  POLICY_CODE,
  PRICE_ROUND_UNIT,
  buildGradePricingPlan,
  calculateGradePrices,
  matchesPricingFilters,
  roundPriceUp
};
