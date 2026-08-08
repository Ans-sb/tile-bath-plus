const assert = require("node:assert/strict");
const test = require("node:test");

const { normalizeProposalPayload } = require("../../../src/server/features/proposal/proposal-payload-normalizer");

const catalogProduct = {
  id: "tile-1",
  managementCode: "INTERNAL-001",
  productType: "tile",
  kind: "숨김브랜드",
  name: "서버 기준 상품명",
  size: "600x600",
  thickness: "9T",
  finish: "무광",
  material: "포세린",
  color: "베이지",
  features: "바닥용",
  option: "바닥",
  unit: "BOX",
  image: "https://example.com/tile.jpg",
  maker: "숨김 공급사",
  costPrice: 10000,
  wholesalePrice: 27000
};

function normalize(payloadOverrides = {}, dependencyOverrides = {}) {
  return normalizeProposalPayload({
    proposal: { customerName: "홍길동", theme: "beige-black" },
    company: { name: "자재GO" },
    summary: { subtotal: 1, vat: 1, total: 2 },
    cart: [{
      id: "tile-1",
      qty: 2,
      quotePrice: 1,
      costPrice: 1,
      maker: "클라이언트 위조 공급사",
      name: "클라이언트 위조 상품명"
    }],
    ...payloadOverrides
  }, {
    products: [catalogProduct],
    memberAccess: { memberGrade: "A", priceTier: "wholesale" },
    isPublicCatalogProduct: () => true,
    getUnitPrice: () => 27000,
    mapMemberProduct: (product) => ({
      id: product.id,
      productType: product.productType,
      kind: "타일",
      name: product.name,
      size: product.size,
      modelName: "MODEL-600",
      thickness: product.thickness,
      finish: product.finish,
      material: product.material,
      color: product.color,
      features: product.features,
      option: product.option,
      unit: product.unit,
      image: product.image,
      retailPrice: 40000,
      wholesalePrice: 27000
    }),
    ...dependencyOverrides
  });
}

test("proposal payload uses canonical products and recalculates server totals", () => {
  const result = normalize();

  assert.equal(result.cart[0].name, "서버 기준 상품명");
  assert.equal(result.cart[0].quotePrice, 27000);
  assert.equal(result.cart[0].productCode, "MODEL-600");
  assert.equal(result.cart[0].thickness, "9T");
  assert.equal(result.cart[0].material, "포세린");
  assert.equal(result.cart[0].color, "베이지");
  assert.equal(result.cart[0].lineTotal, 54000);
  assert.match(result.cart[0].description, /600x600/);
  assert.equal(result.summary.subtotal, 54000);
  assert.equal(result.summary.vat, 5400);
  assert.equal(result.summary.total, 59400);
  assert.equal(result.summary.itemCount, 1);
});

test("proposal payload accepts an admin-only manual quote override", () => {
  const result = normalize({}, { allowPriceOverride: true });

  assert.equal(result.cart[0].quotePrice, 1);
  assert.equal(result.summary.total, 2);
});

test("proposal payload ignores a member manual quote override", () => {
  const result = normalize({}, { allowPriceOverride: false });

  assert.equal(result.cart[0].quotePrice, 27000);
});

test("proposal payload excludes brand, supplier, cost, and internal pricing fields", () => {
  const serialized = JSON.stringify(normalize());
  [
    "costPrice",
    "maker",
    "supplier",
    "managementCode",
    "internalBrand",
    "wholesalePrice",
    "retailPrice",
    "숨김브랜드",
    "숨김 공급사"
  ].forEach((forbidden) => assert.equal(serialized.includes(forbidden), false));
});

test("proposal payload rejects unknown and invalid cart items", () => {
  assert.throws(
    () => normalize({ cart: [{ id: "missing", qty: 1 }] }),
    /상품 DB에서 확인되지 않은 상품/
  );
  assert.throws(
    () => normalize({ cart: [{ id: "tile-1", qty: 0 }] }),
    /수량은 0보다 커야/
  );
});

test("proposal payload restricts templates and unsafe rendered images", () => {
  const result = normalize({
    proposal: { theme: "../../internal" },
    cart: [{ id: "tile-1", qty: 1, renderedImage: "file:///secret.png" }]
  });
  assert.equal(result.proposal.theme, "beige-black");
  assert.equal(result.cart[0].renderedImage, "");
});

test("proposal payload preserves canonical root-relative product images", () => {
  const localImageProduct = {
    ...catalogProduct,
    image: "/image-cache/products/tile-01.webp"
  };
  const result = normalize({}, {
    products: [localImageProduct],
    mapMemberProduct: (product) => ({
      id: product.id,
      productType: product.productType,
      kind: "타일",
      name: product.name,
      size: product.size,
      finish: product.finish,
      option: product.option,
      unit: product.unit,
      image: product.image
    })
  });

  assert.equal(result.cart[0].image, "/image-cache/products/tile-01.webp");
});
