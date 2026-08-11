const { calculateGradePrices } = require("./grade-pricing-policy");

function clean(value) {
  return String(value || "").trim();
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeMemberGrade(value, fallback = "B") {
  const text = clean(value).toUpperCase();
  if (/(^|[^A-Z])C([^A-Z]|$)|C등급|GRADE\s*C/.test(text)) return "C";
  if (/(^|[^A-Z])B([^A-Z]|$)|B등급|GRADE\s*B/.test(text)) return "B";
  if (/(^|[^A-Z])A([^A-Z]|$)|A등급|GRADE\s*A/.test(text)) return "A";
  const normalizedFallback = clean(fallback).toUpperCase();
  return ["A", "B", "C"].includes(normalizedFallback) ? normalizedFallback : "B";
}

function getMemberGradeLabel(value) {
  return `${normalizeMemberGrade(value)}등급`;
}

function getMemberUnitPrice(product, memberAccess = {}) {
  const grade = normalizeMemberGrade(memberAccess.memberGrade);
  const calculatedPrices = calculateGradePrices(product?.costPrice);
  const gradePrices = {
    A: toPositiveNumber(product?.gradeAPrice) || calculatedPrices.gradeAPrice,
    B: toPositiveNumber(product?.gradeBPrice) || calculatedPrices.gradeBPrice,
    C: toPositiveNumber(product?.gradeCPrice) || calculatedPrices.gradeCPrice
  };
  if (gradePrices[grade]) return gradePrices[grade];

  const tier = clean(memberAccess.priceTier).toLowerCase();
  const wholesalePrice = toPositiveNumber(product?.wholesalePrice);
  const retailPrice = toPositiveNumber(product?.retailPrice);
  if (["wholesale", "dealer", "partner", "business", "도매", "사업자"].includes(tier)) {
    return wholesalePrice || retailPrice || gradePrices.B || gradePrices.A || gradePrices.C || 0;
  }
  return retailPrice || wholesalePrice || gradePrices.B || gradePrices.A || gradePrices.C || 0;
}

function getPriceSortRank(price) {
  const value = toPositiveNumber(price);
  if (!value) return 0;
  const bands = [5000, 10000, 15000, 20000, 30000, 50000, 80000, 120000, 200000, 500000, 1000000];
  const index = bands.findIndex((limit) => value <= limit);
  return index >= 0 ? index + 1 : bands.length + 1;
}

function mapMemberProductForAccess(product, memberAccess, mapPublicProduct) {
  const memberGrade = normalizeMemberGrade(memberAccess?.memberGrade);
  const memberUnitPrice = getMemberUnitPrice(product, { ...memberAccess, memberGrade });
  return {
    ...mapPublicProduct(product),
    memberGrade: `${memberGrade}등급`,
    memberUnitPrice,
    memberPriceLabel: `${memberGrade}등급가`,
    memberPriceVisible: true,
    priceSortRank: getPriceSortRank(memberUnitPrice)
  };
}

module.exports = {
  getMemberGradeLabel,
  getMemberUnitPrice,
  mapMemberProductForAccess,
  normalizeMemberGrade
};
