const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createOrderStore } = require("../../../src/server/services/order-store");

function normalizeCartItem(item) {
  return {
    id: String(item.id || "tile-1"),
    managementCode: String(item.managementCode || "T-1"),
    productType: "tile",
    name: String(item.name || "테스트 타일"),
    size: "600x600",
    finish: "무광",
    unit: "BOX",
    qty: Number(item.qty || 0),
    quotePrice: Number(item.quotePrice || 0),
    stockQty: Number(item.stockQty || 0),
    image: ""
  };
}

function makeStore(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "jajaego-orders-"));
  return {
    root,
    store: createOrderStore({
      hasSupabaseConfig: () => false,
      isMissingSupabaseTableError: () => false,
      normalizeCartItem,
      ordersPath: path.join(root, "orders.json"),
      requestSupabase: async () => [],
      ...overrides
    })
  };
}

test("order creation rejects zero-priced items", async () => {
  const { store } = makeStore();

  await assert.rejects(
    store.createOrder({
      businessNumber: "1234567890",
      items: [{ id: "tile-1", qty: 1, quotePrice: 0 }]
    }),
    (error) => error.statusCode === 422 && /판매가/.test(error.message)
  );
});

test("production order storage fails closed when Supabase order tables are missing", async () => {
  const { root, store } = makeStore({
    allowLocalFallback: false,
    hasSupabaseConfig: () => true,
    isMissingSupabaseTableError: () => true,
    requestSupabase: async () => { throw new Error("orders table missing"); }
  });

  await assert.rejects(
    store.createOrder({
      businessNumber: "1234567890",
      items: [{ id: "tile-1", qty: 1, quotePrice: 12000 }]
    }),
    (error) => error.statusCode === 503 && /저장소/.test(error.message)
  );
  assert.equal(fs.existsSync(path.join(root, "orders.json")), false);
});

test("local order fallback remains available only when explicitly enabled", async () => {
  const { store } = makeStore({ allowLocalFallback: true });
  const result = await store.createOrder({
    businessNumber: "1234567890",
    items: [{ id: "tile-1", qty: 1, quotePrice: 12000 }]
  });

  assert.equal(result.ok, true);
  assert.equal(result.storage, "local");
  assert.equal(result.order.totalQuote, 12000);
});

test("repeated order submissions with the same client id are idempotent", async () => {
  const { root, store } = makeStore({ allowLocalFallback: true });
  const payload = {
    clientOrderId: "a4a04a89-456e-47f1-8a19-a3850778b915",
    businessNumber: "1234567890",
    items: [{ id: "tile-1", qty: 1, quotePrice: 12000 }]
  };

  const first = await store.createOrder(payload);
  const repeated = await store.createOrder(payload);
  const saved = JSON.parse(fs.readFileSync(path.join(root, "orders.json"), "utf8"));

  assert.equal(repeated.replayed, true);
  assert.equal(repeated.order.orderNumber, first.order.orderNumber);
  assert.equal(saved.length, 1);
});

test("Supabase order inserts use a unique client id and replay the existing order", async () => {
  const clientOrderId = "a4a04a89-456e-47f1-8a19-a3850778b915";
  const remoteRow = {
    id: "order-1",
    client_order_id: clientOrderId,
    order_number: "JG-20260811-ABC123",
    business_number: "1234567890",
    order_status: "접수대기",
    item_count: 1,
    total_quote: 12000,
    created_at: "2026-08-11T00:00:00.000Z"
  };
  let inserted = false;
  const calls = [];
  const { store } = makeStore({
    allowLocalFallback: false,
    hasSupabaseConfig: () => true,
    requestSupabase: async (requestPath, options = {}) => {
      calls.push({ requestPath, options });
      if (requestPath.startsWith("/rest/v1/orders?on_conflict=")) {
        const payload = JSON.parse(options.body);
        assert.equal(payload[0].client_order_id, clientOrderId);
        assert.match(options.headers.Prefer, /resolution=ignore-duplicates/);
        if (inserted) return [];
        inserted = true;
        return [remoteRow];
      }
      if (requestPath.startsWith("/rest/v1/orders?select=")) return [remoteRow];
      if (requestPath.startsWith("/rest/v1/order_items") && options.method === "POST") return [];
      if (requestPath.startsWith("/rest/v1/order_items")) return [];
      throw new Error(`unexpected request: ${requestPath}`);
    }
  });
  const payload = {
    clientOrderId,
    businessNumber: "1234567890",
    items: [{ id: "tile-1", qty: 1, quotePrice: 12000 }]
  };

  const first = await store.createOrder(payload);
  const repeated = await store.createOrder(payload);

  assert.equal(first.order.orderNumber, remoteRow.order_number);
  assert.equal(repeated.replayed, true);
  assert.equal(repeated.order.orderNumber, first.order.orderNumber);
  const itemInsertCalls = calls.filter((call) => call.requestPath.startsWith("/rest/v1/order_items") && call.options.method === "POST");
  assert.equal(itemInsertCalls.length, 2);
  assert.ok(itemInsertCalls.every((call) => call.requestPath.includes("on_conflict=order_id%2Cline_number")));
  assert.ok(itemInsertCalls.every((call) => /resolution=ignore-duplicates/.test(call.options.headers.Prefer)));
});
