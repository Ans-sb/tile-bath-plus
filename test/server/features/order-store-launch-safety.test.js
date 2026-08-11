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

test("order creation requires a durable client idempotency key", async () => {
  const { store } = makeStore({ allowLocalFallback: true });
  await assert.rejects(
    store.createOrder({
      businessNumber: "1234567890",
      items: [{ id: "tile-1", qty: 1, quotePrice: 12000 }]
    }),
    (error) => error.statusCode === 400 && /요청 ID/.test(error.message)
  );
});

test("order creation rejects zero-priced items", async () => {
  const { store } = makeStore();

  await assert.rejects(
    store.createOrder({
      clientOrderId: "zero-price-request-1",
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
      clientOrderId: "missing-table-request-1",
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
    clientOrderId: "local-fallback-request-1",
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

test("reusing a client id with a different payload is rejected", async () => {
  const { store } = makeStore({ allowLocalFallback: true });
  const base = {
    clientOrderId: "altered-payload-request-1",
    businessNumber: "1234567890",
    items: [{ id: "tile-1", qty: 1, quotePrice: 12000 }]
  };
  await store.createOrder(base);
  await assert.rejects(
    store.createOrder({ ...base, items: [{ id: "tile-1", qty: 2, quotePrice: 12000 }] }),
    (error) => error.statusCode === 409
  );
});

test("Supabase order creation uses one transactional RPC and replays the existing order", async () => {
  const clientOrderId = "a4a04a89-456e-47f1-8a19-a3850778b915";
  let persisted = null;
  const calls = [];
  const { store } = makeStore({
    allowLocalFallback: false,
    hasSupabaseConfig: () => true,
    requestSupabase: async (requestPath, options = {}) => {
      calls.push({ requestPath, options });
      assert.equal(requestPath, "/rest/v1/rpc/create_order_with_items");
      assert.equal(options.method, "POST");
      const body = JSON.parse(options.body);
      assert.equal(body.p_order.client_order_id, clientOrderId);
      assert.equal(body.p_items.length, 1);
      if (!persisted) {
        persisted = {
          order: {
            id: "order-1",
            ...body.p_order,
            created_at: "2026-08-11T00:00:00.000Z"
          },
          items: body.p_items.map((item, index) => ({
            ...item,
            id: `item-${index + 1}`,
            order_id: "order-1",
            created_at: "2026-08-11T00:00:00.000Z"
          }))
        };
        return { ...persisted, replayed: false };
      }
      assert.equal(body.p_order.request_fingerprint, persisted.order.request_fingerprint);
      return { ...persisted, replayed: true };
    }
  });
  const payload = {
    clientOrderId,
    businessNumber: "1234567890",
    items: [{ id: "tile-1", qty: 1, quotePrice: 12000 }]
  };

  const first = await store.createOrder(payload);
  const repeated = await store.createOrder(payload);

  assert.equal(first.order.orderNumber, persisted.order.order_number);
  assert.equal(repeated.replayed, true);
  assert.equal(repeated.order.orderNumber, first.order.orderNumber);
  assert.equal(first.order.items.length, 1);
  assert.equal(repeated.order.items.length, 1);
  assert.equal(calls.length, 2);
});

test("legacy Supabase schema uses one atomic order row without partial item writes", async () => {
  let persistedRow = null;
  const calls = [];
  const { store } = makeStore({
    allowLocalFallback: false,
    hasSupabaseConfig: () => true,
    requestSupabase: async (requestPath, options = {}) => {
      calls.push({ requestPath, options });
      if (requestPath === "/rest/v1/rpc/create_order_with_items") {
        throw new Error("PGRST202 create_order_with_items was not found in the schema cache");
      }
      if (requestPath === "/rest/v1/orders?on_conflict=order_number") {
        if (persistedRow) return [];
        const [payload] = JSON.parse(options.body);
        persistedRow = {
          id: "legacy-order-1",
          ...payload,
          created_at: "2026-08-11T00:00:00.000Z",
          updated_at: "2026-08-11T00:00:00.000Z"
        };
        return [persistedRow];
      }
      if (requestPath.startsWith("/rest/v1/orders?") && options.method === "PATCH") {
        Object.assign(persistedRow, JSON.parse(options.body), { updated_at: "2026-08-11T01:00:00.000Z" });
        return [persistedRow];
      }
      if (requestPath.startsWith("/rest/v1/orders?select=")) return [persistedRow];
      throw new Error(`unexpected request: ${requestPath}`);
    }
  });
  const payload = {
    clientOrderId: "legacy-atomic-request-1",
    businessNumber: "1234567890",
    items: [{ id: "tile-1", qty: 1, quotePrice: 12000 }]
  };

  const first = await store.createOrder(payload);
  const updated = await store.updateOrderStatus({
    orderNumber: first.order.orderNumber,
    status: "배차대기",
    note: "오후 현장 배송"
  });
  const replay = await store.createOrder(payload);

  assert.equal(first.order.items.length, 1);
  assert.equal(updated.order.note, "오후 현장 배송");
  assert.equal(updated.order.items.length, 1);
  assert.equal(replay.order.orderNumber, first.order.orderNumber);
  assert.equal(replay.order.note, "오후 현장 배송");
  assert.equal(replay.order.items.length, 1);
  assert.equal(calls.filter((call) => call.requestPath === "/rest/v1/orders?on_conflict=order_number").length, 2);
  assert.equal(calls.some((call) => call.requestPath.includes("order_items")), false);
});
