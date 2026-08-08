const { createHttpError } = require("../../http-errors");

const ALLOWED_THEMES = new Set(["beige-black", "beige-red", "beige-brown"]);
const MAX_CART_ITEMS = 100;
const MAX_ITEM_QUANTITY = 100000;
const MAX_RENDERED_IMAGE_LENGTH = 12 * 1024 * 1024;

function normalizeProposalPayload(payload, dependencies = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError(400, "제안서 생성 요청 데이터가 필요합니다.");
  }

  const cart = Array.isArray(payload.cart) ? payload.cart : [];
  if (!cart.length) {
    throw createHttpError(400, "장바구니 상품이 있어야 제안서를 만들 수 있습니다.");
  }
  if (cart.length > MAX_CART_ITEMS) {
    throw createHttpError(400, `제안서에는 상품을 최대 ${MAX_CART_ITEMS}개까지 담을 수 있습니다.`);
  }

  const products = Array.isArray(dependencies.products) ? dependencies.products : [];
  const productIndex = buildProductIndex(products);
  const normalizedCart = cart.map((item) => normalizeProposalItem(item, productIndex, dependencies));
  const subtotal = normalizedCart.reduce((sum, item) => sum + (item.quotePrice * item.qty), 0);
  const roundedSubtotal = Math.round(subtotal);
  const vat = Math.round(roundedSubtotal * 0.1);
  const pricedItemCount = normalizedCart.filter((item) => item.quotePrice > 0).length;
  const proposal = payload.proposal || {};
  const company = payload.company || {};
  const theme = normalizeText(proposal.theme, 32) || "beige-black";

  return {
    proposal: {
      title: normalizeText(proposal.title, 48) || "현장 맞춤 제안서",
      customerName: normalizeText(proposal.customerName, 60) || "고객",
      customerPhone: normalizeText(proposal.customerPhone, 30),
      siteAddress: normalizeText(proposal.siteAddress, 160) || "현장 주소 미입력",
      startDate: normalizeDateText(proposal.startDate),
      validDays: clampInteger(proposal.validDays, 1, 90, 14),
      proposalDate: normalizeIsoDate(proposal.proposalDate),
      validDate: normalizeIsoDate(proposal.validDate),
      intro: normalizeText(proposal.intro, 500),
      notice: normalizeText(proposal.notice, 400),
      memo: normalizeText(proposal.memo, 1000),
      theme: ALLOWED_THEMES.has(theme) ? theme : "beige-black"
    },
    company: {
      name: normalizeText(company.name, 80) || "자재GO 바스GO",
      managerName: normalizeText(company.managerName, 60),
      managerTitle: normalizeText(company.managerTitle, 60),
      managerPhone: normalizeText(company.managerPhone, 30)
    },
    summary: {
      itemCount: normalizedCart.length,
      pricedItemCount,
      unpricedItemCount: normalizedCart.length - pricedItemCount,
      pricingComplete: pricedItemCount === normalizedCart.length,
      subtotal: roundedSubtotal,
      vat,
      total: roundedSubtotal + vat
    },
    cart: normalizedCart
  };
}

function normalizeProposalItem(item, productIndex, dependencies) {
  const product = findProduct(productIndex, item);
  if (!product || (dependencies.isPublicCatalogProduct && !dependencies.isPublicCatalogProduct(product))) {
    throw createHttpError(400, "상품 DB에서 확인되지 않은 상품은 제안서에 담을 수 없습니다.");
  }

  const publicProduct = dependencies.mapMemberProduct
    ? dependencies.mapMemberProduct(product)
    : product;
  const serverQuotePrice = Number(dependencies.getUnitPrice?.(product, dependencies.memberAccess) || 0);
  const requestedQuotePrice = Number(item?.quotePrice);
  const quotePrice = dependencies.allowPriceOverride === true
    && Number.isFinite(requestedQuotePrice)
    && requestedQuotePrice > 0
    ? requestedQuotePrice
    : serverQuotePrice;
  if (!Number.isFinite(quotePrice) || quotePrice < 0) {
    throw createHttpError(500, "상품 판매가를 계산하지 못했습니다.");
  }

  const quantity = normalizeQuantity(item?.qty);
  const size = normalizeText(publicProduct.size, 80);
  const thickness = normalizeText(publicProduct.thickness, 40) || extractThickness(size);
  const unit = normalizeText(publicProduct.unit, 120);
  const normalizedQuotePrice = Math.round(quotePrice);
  const productCode = normalizeText(publicProduct.modelName, 180);
  const material = normalizeText(publicProduct.material, 80);
  const color = normalizeText(publicProduct.color, 80);
  const features = normalizeText(publicProduct.features, 240);
  const finish = normalizeText(publicProduct.finish || publicProduct.surface, 80);

  return {
    id: normalizeText(publicProduct.id || product.id, 120),
    productType: normalizeText(publicProduct.productType, 40),
    kind: normalizeText(publicProduct.kind, 80),
    name: normalizeText(publicProduct.name, 180),
    productCode,
    size,
    thickness,
    option: normalizeText(publicProduct.option, 120),
    finish,
    material,
    color,
    features,
    unit,
    boxPcs: normalizeNonNegativeNumber(publicProduct.boxPcs),
    boxSqm: normalizeNonNegativeNumber(publicProduct.boxSqm),
    qty: quantity,
    quotePrice: normalizedQuotePrice,
    lineTotal: Math.round(normalizedQuotePrice * quantity),
    description: buildProductDescription({
      productType: publicProduct.productType,
      option: publicProduct.option,
      size,
      thickness,
      finish,
      material,
      color,
      features,
      unit
    }),
    image: normalizeImageReference(publicProduct.image),
    renderedImage: normalizeImageReference(item?.renderedImage, { allowDataUrl: true }),
    renderTarget: normalizeRenderTarget(item?.renderTarget),
    renderPointMemo: normalizeText(item?.renderPointMemo, 200),
    renderSurfaceSelections: normalizeRenderSurfaceSelections(item?.renderSurfaceSelections)
  };
}

function extractThickness(size) {
  const match = String(size || "").match(/(?:^|[*x×\s])(\d+(?:\.\d+)?)\s*T\b/i);
  return match ? `${match[1]}T` : "";
}

function normalizeNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 1000) / 1000 : 0;
}

function buildProductDescription(product) {
  const specs = [
    normalizeText(product.option, 120),
    normalizeText(product.size, 80),
    normalizeText(product.thickness, 40),
    normalizeText(product.finish, 80),
    normalizeText(product.material, 80),
    normalizeText(product.color, 80)
  ].filter(Boolean);
  const features = normalizeText(product.features, 160);
  const packaging = normalizeText(product.unit, 120);
  return [
    specs.join(" · "),
    features,
    packaging ? `포장 ${packaging}` : ""
  ].filter(Boolean).join(" / ").slice(0, 420);
}

function buildProductIndex(products) {
  return products.reduce((index, product) => {
    [product?.id, product?.managementCode, product?.sourceProductId, product?.modelName]
      .map((value) => normalizeText(value, 180))
      .filter(Boolean)
      .forEach((key) => {
        if (!index.has(key)) index.set(key, product);
      });
    return index;
  }, new Map());
}

function findProduct(index, item) {
  const keys = [item?.id, item?.managementCode, item?.sourceProductId, item?.modelName]
    .map((value) => normalizeText(value, 180))
    .filter(Boolean);
  return keys.map((key) => index.get(key)).find(Boolean) || null;
}

function normalizeQuantity(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw createHttpError(400, "제안서 상품 수량은 0보다 커야 합니다.");
  }
  return Math.min(Math.round(number * 1000) / 1000, MAX_ITEM_QUANTITY);
}

function normalizeRenderSurfaceSelections(value) {
  const source = value && typeof value === "object" ? value : {};
  return ["wall", "floor", "point"].reduce((result, surface) => {
    const entry = source[surface] && typeof source[surface] === "object" ? source[surface] : {};
    result[surface] = { tileId: normalizeText(entry.tileId, 120) };
    return result;
  }, {});
}

function normalizeRenderTarget(value) {
  const target = normalizeText(value, 20).toLowerCase();
  return ["wall", "floor", "point"].includes(target) ? target : "";
}

function normalizeImageReference(value, options = {}) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (/^https?:\/\//i.test(image) && image.length <= 4096) return image;
  if (image.length <= 4096
    && /^\/?[a-z0-9_./%()\- ]+$/i.test(image)
    && !image.split(/[\\/]+/).includes("..")) {
    return image;
  }
  if (options.allowDataUrl
    && image.length <= MAX_RENDERED_IMAGE_LENGTH
    && /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(image)) {
    return image;
  }
  return "";
}

function normalizeText(value, maxLength) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function normalizeIsoDate(value) {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeDateText(value) {
  const text = normalizeText(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function clampInteger(value, min, max, fallback) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

module.exports = {
  ALLOWED_THEMES,
  buildProductIndex,
  normalizeProposalPayload
};
