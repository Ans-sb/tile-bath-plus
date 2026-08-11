const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createOrderStore } = require("../../../src/server/services/order-store");

function normalizeCartItem(item) {
  return { ...item };
}

test("order store persists operational delivery data and grade snapshot", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jajaego-order-operations-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createOrderStore({
    hasSupabaseConfig: () => false,
    isMissingSupabaseTableError: () => false,
    normalizeCartItem,
    ordersPath: path.join(directory, "orders.json"),
    requestSupabase: async () => []
  });

  const result = await store.createOrder({
    businessNumber: "123-45-67890",
    companyName: "현장 인테리어",
    contactName: "김담당",
    contactPhone: "010-1111-2222",
    deliveryAddress: "서울시 중구 현장 1층",
    requestedDeliveryDate: "2026-08-20",
    memberGradeSnapshot: "A등급",
    priceTierSnapshot: "wholesale",
    status: "접수대기",
    items: [{ id: "tile-1", name: "타일", qty: 2, quotePrice: 12000 }]
  });

  assert.equal(result.order.status, "접수대기");
  assert.equal(result.order.totalQuote, 24000);
  const [saved] = await store.readOrdersByBusinessNumber("123-45-67890");
  assert.equal(saved.contactPhone, "010-1111-2222");
  assert.equal(saved.deliveryAddress, "서울시 중구 현장 1층");
  assert.equal(saved.requestedDeliveryDate, "2026-08-20");
  assert.equal(saved.memberGradeSnapshot, "A등급");
});

test("order store supports dispatch and delivery workflow statuses", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jajaego-order-status-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createOrderStore({
    hasSupabaseConfig: () => false,
    isMissingSupabaseTableError: () => false,
    normalizeCartItem,
    ordersPath: path.join(directory, "orders.json"),
    requestSupabase: async () => []
  });
  const created = await store.createOrder({
    businessNumber: "123-45-67890",
    items: [{ id: "tile-1", name: "타일", qty: 1, quotePrice: 12000 }]
  });
  const dispatched = await store.updateOrderStatus({ orderNumber: created.order.orderNumber, status: "배차대기" });
  assert.equal(dispatched.order.status, "배차대기");
  const delivered = await store.updateOrderStatus({ orderNumber: created.order.orderNumber, status: "배송완료" });
  assert.equal(delivered.order.status, "배송완료");
});
