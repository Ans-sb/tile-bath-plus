const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildProposalPayload
} = require("../../../src/client/features/proposal/proposal-payload.js");

test("proposal payload sends only identifiers, quantities, and selected render data", () => {
  const proposalState = {
    title: "현장 제안서",
    customer: "고객",
    phone: "010-0000-0000",
    address: "서울",
    startDate: "2026-08-10",
    validDays: 14,
    date: new Date("2026-08-05T00:00:00.000Z"),
    validDate: new Date("2026-08-19T00:00:00.000Z"),
    intro: "소개",
    notice: "안내",
    memo: "메모",
    theme: "clean-business",
    companyName: "자재GO",
    managerName: "담당자",
    managerTitle: "매니저",
    managerPhone: "02-0000-0000",
    subtotal: 999999,
    vat: 99999,
    total: 1099998
  };
  const selectedProducts = [{
    id: "tile-001",
    qty: 3,
    name: "클라이언트 위조 상품명",
    quotePrice: 1,
    costPrice: 1,
    maker: "내부 공급사",
    internalBrandCode: "SECRET",
    renderedImage: "data:image/jpeg;base64,rendered",
    renderTarget: "바닥",
    renderPointMemo: "포인트",
    renderSurfaceSelections: { floor: "tile-001" }
  }];

  const payload = buildProposalPayload({
    proposalState,
    selectedProducts,
    selectedRenderedIds: new Set(["tile-001"])
  });

  assert.deepEqual(Object.keys(payload.cart[0]), [
    "id",
    "qty",
    "renderedImage",
    "renderTarget",
    "renderPointMemo",
    "renderSurfaceSelections"
  ]);
  assert.equal(payload.cart[0].id, "tile-001");
  assert.equal(payload.cart[0].renderedImage, "data:image/jpeg;base64,rendered");
  assert.equal("summary" in payload, false);
  assert.equal("quotePrice" in payload.cart[0], false);
  assert.equal("costPrice" in payload.cart[0], false);
  assert.equal("maker" in payload.cart[0], false);
  assert.equal("internalBrandCode" in payload.cart[0], false);
});

test("proposal payload omits render data for unselected renders", () => {
  const payload = buildProposalPayload({
    proposalState: {},
    selectedProducts: [{
      id: "tile-002",
      qty: 1,
      renderedImage: "data:image/jpeg;base64,hidden",
      renderTarget: "벽"
    }],
    selectedRenderedIds: new Set()
  });

  assert.equal(payload.cart[0].renderedImage, "");
  assert.equal(payload.cart[0].renderTarget, "");
  assert.deepEqual(payload.cart[0].renderSurfaceSelections, {});
});

test("proposal payload includes a cart quote only for an explicit admin request", () => {
  const payload = buildProposalPayload({
    proposalState: {},
    selectedProducts: [{ id: "tile-003", qty: 2, quotePrice: 31500 }],
    includeAdminQuotePrice: true
  });

  assert.equal(payload.cart[0].quotePrice, 31500);
});
