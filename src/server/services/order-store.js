const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJsonArray(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath, rows) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(Array.isArray(rows) ? rows : [], null, 2)}\n`, "utf8");
}

function clean(value) {
  return String(value || "").trim();
}

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function createOrderNumber(date = new Date()) {
  const dateKey = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `JG-${dateKey}-${suffix}`;
}

function createOrderError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const ORDER_NOTE_PREFIX = "JAJAEGO_ORDER_V1:";

function normalizeOrderStatus(value) {
  const text = clean(value);
  if (["주문확인", "received", "confirmed"].includes(text)) return "주문확인";
  if (text === "접수완료") return "접수완료";
  if (["결제대기", "payment_pending"].includes(text)) return "결제대기";
  if (["결제완료", "paid"].includes(text)) return "결제완료";
  if (["재고확인", "stock_check"].includes(text)) return "재고확인";
  if (["견적확정", "quote_confirmed"].includes(text)) return "견적확정";
  if (["출고준비", "shipping_ready"].includes(text)) return "출고준비";
  if (["배차대기", "dispatch_pending"].includes(text)) return "배차대기";
  if (["배송중", "shipping"].includes(text)) return "배송중";
  if (["배송완료", "delivered"].includes(text)) return "배송완료";
  if (["완료", "done", "completed"].includes(text)) return "완료";
  if (["취소", "cancelled", "canceled"].includes(text)) return "취소";
  return "접수대기";
}

function decodeOrderNote(value) {
  const text = clean(value);
  if (!text.startsWith(ORDER_NOTE_PREFIX)) return { note: text };
  try {
    const parsed = JSON.parse(text.slice(ORDER_NOTE_PREFIX.length));
    return {
      note: clean(parsed.note),
      contactPhone: clean(parsed.contactPhone),
      deliveryAddress: clean(parsed.deliveryAddress),
      requestedDeliveryDate: clean(parsed.requestedDeliveryDate),
      memberGradeSnapshot: clean(parsed.memberGradeSnapshot),
      priceTierSnapshot: clean(parsed.priceTierSnapshot)
    };
  } catch {
    return { note: text };
  }
}

function encodeOrderNote(order) {
  return `${ORDER_NOTE_PREFIX}${JSON.stringify({
    note: clean(order.note),
    contactPhone: clean(order.contactPhone),
    deliveryAddress: clean(order.deliveryAddress),
    requestedDeliveryDate: clean(order.requestedDeliveryDate),
    memberGradeSnapshot: clean(order.memberGradeSnapshot),
    priceTierSnapshot: clean(order.priceTierSnapshot)
  })}`;
}

function normalizeOrderItem(item, normalizeCartItem) {
  const normalized = normalizeCartItem(item);
  const qty = Math.max(toNumber(normalized.qty), 0);
  const quotePrice = Math.max(toNumber(normalized.quotePrice), 0);
  return {
    ...normalized,
    qty,
    quotePrice,
    lineTotal: qty * quotePrice
  };
}

function mapLocalOrder(row) {
  const items = Array.isArray(row.items) ? row.items : [];
  const operationInfo = decodeOrderNote(row.note);
  return {
    id: clean(row.id),
    clientOrderId: clean(row.clientOrderId),
    orderNumber: clean(row.orderNumber),
    businessNumber: clean(row.businessNumber),
    companyName: clean(row.companyName),
    contactName: clean(row.contactName),
    status: normalizeOrderStatus(row.status),
    statusLabel: normalizeOrderStatus(row.status),
    itemCount: Number(row.itemCount) || items.length,
    totalQuote: toNumber(row.totalQuote),
    note: operationInfo.note,
    contactPhone: clean(row.contactPhone || operationInfo.contactPhone),
    deliveryAddress: clean(row.deliveryAddress || operationInfo.deliveryAddress),
    requestedDeliveryDate: clean(row.requestedDeliveryDate || operationInfo.requestedDeliveryDate),
    memberGradeSnapshot: clean(row.memberGradeSnapshot || operationInfo.memberGradeSnapshot),
    priceTierSnapshot: clean(row.priceTierSnapshot || operationInfo.priceTierSnapshot),
    createdAt: clean(row.createdAt),
    updatedAt: clean(row.updatedAt || row.createdAt),
    items
  };
}

function mapSupabaseOrder(row) {
  const items = Array.isArray(row.items) ? row.items : [];
  const operationInfo = decodeOrderNote(row.order_note);
  return {
    id: clean(row.id),
    clientOrderId: clean(row.client_order_id),
    orderNumber: clean(row.order_number),
    businessNumber: clean(row.business_number),
    companyName: clean(row.company_name),
    contactName: clean(row.contact_name),
    status: normalizeOrderStatus(row.order_status),
    statusLabel: normalizeOrderStatus(row.order_status),
    itemCount: Number(row.item_count) || items.length,
    totalQuote: toNumber(row.total_quote),
    note: operationInfo.note,
    contactPhone: operationInfo.contactPhone,
    deliveryAddress: operationInfo.deliveryAddress,
    requestedDeliveryDate: operationInfo.requestedDeliveryDate,
    memberGradeSnapshot: operationInfo.memberGradeSnapshot,
    priceTierSnapshot: operationInfo.priceTierSnapshot,
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at || row.created_at),
    items
  };
}

function mapSupabaseOrderItem(row) {
  return {
    id: clean(row.product_id || row.management_code || row.id),
    managementCode: clean(row.management_code),
    productType: clean(row.product_type),
    name: clean(row.product_name),
    size: clean(row.size),
    finish: clean(row.finish),
    unit: clean(row.unit),
    image: clean(row.image),
    qty: toNumber(row.qty),
    quotePrice: toNumber(row.quote_price),
    stockQty: toNumber(row.stock_qty),
    lineTotal: toNumber(row.line_total)
  };
}

function createOrderStore({
  allowLocalFallback = false,
  hasSupabaseConfig,
  isMissingSupabaseTableError,
  normalizeCartItem,
  ordersPath,
  requestSupabase
}) {
  async function readOrderItems(orderIds) {
    if (!orderIds.length || !hasSupabaseConfig()) return new Map();
    const query = new URLSearchParams({
      select: "id,order_id,product_id,management_code,product_type,product_name,size,finish,unit,qty,quote_price,line_total,stock_qty,image",
      order_id: `in.(${orderIds.join(",")})`,
      order: "created_at.asc"
    });
    try {
      const rows = await requestSupabase(`/rest/v1/order_items?${query.toString()}`);
      return (Array.isArray(rows) ? rows : []).reduce((map, row) => {
        const orderId = clean(row.order_id);
        if (!map.has(orderId)) map.set(orderId, []);
        map.get(orderId).push(mapSupabaseOrderItem(row));
        return map;
      }, new Map());
    } catch (error) {
      if (!isMissingSupabaseTableError(error, "order_items")) throw error;
      return new Map();
    }
  }

  async function readRemoteOrderByClientId(businessNumber, clientOrderId) {
    if (!businessNumber || !clientOrderId || !hasSupabaseConfig()) return null;
    const query = new URLSearchParams({
      select: "id,client_order_id,order_number,business_number,company_name,contact_name,order_status,item_count,total_quote,order_note,created_at,updated_at",
      business_number: `eq.${businessNumber}`,
      client_order_id: `eq.${clientOrderId}`,
      limit: "1"
    });
    const rows = await requestSupabase(`/rest/v1/orders?${query.toString()}`);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    const itemsByOrder = await readOrderItems([row.id]);
    return { ...mapSupabaseOrder(row), items: itemsByOrder.get(row.id) || [] };
  }

  function readLocalOrders() {
    return readJsonArray(ordersPath).map(mapLocalOrder);
  }

  function saveLocalOrder(order) {
    const rows = readLocalOrders();
    const next = [order, ...rows.filter((row) => row.orderNumber !== order.orderNumber)].slice(0, 1000);
    writeJsonArray(ordersPath, next);
    return order;
  }

  return {
    async createOrder(payload) {
      const businessNumber = clean(payload?.businessNumber);
      const clientOrderId = clean(payload?.clientOrderId).slice(0, 128);
      const items = (Array.isArray(payload?.items) ? payload.items : [])
        .map((item) => normalizeOrderItem(item, normalizeCartItem))
        .filter((item) => item.qty > 0);
      if (!businessNumber) throw new Error("주문 접수에는 사업자등록번호가 필요합니다.");
      if (!items.length) throw new Error("주문 접수할 상품이 없습니다.");
      if (items.some((item) => item.quotePrice <= 0)) {
        throw createOrderError(422, "판매가가 확정되지 않은 상품은 주문할 수 없습니다.");
      }
      if (clientOrderId && allowLocalFallback && !hasSupabaseConfig()) {
        const existingOrder = readLocalOrders().find((row) => (
          row.businessNumber === businessNumber && row.clientOrderId === clientOrderId
        ));
        if (existingOrder) return { ok: true, order: existingOrder, storage: "local", replayed: true };
      }

      const now = new Date().toISOString();
      const order = {
        id: crypto.randomUUID(),
        clientOrderId,
        orderNumber: createOrderNumber(),
        businessNumber,
        companyName: clean(payload?.companyName),
        contactName: clean(payload?.contactName),
        status: normalizeOrderStatus(payload?.status),
        statusLabel: normalizeOrderStatus(payload?.status),
        itemCount: items.length,
        totalQuote: items.reduce((sum, item) => sum + item.lineTotal, 0),
        note: clean(payload?.note),
        contactPhone: clean(payload?.contactPhone),
        deliveryAddress: clean(payload?.deliveryAddress),
        requestedDeliveryDate: clean(payload?.requestedDeliveryDate),
        memberGradeSnapshot: clean(payload?.memberGradeSnapshot),
        priceTierSnapshot: clean(payload?.priceTierSnapshot),
        createdAt: now,
        updatedAt: now,
        items
      };

      if (hasSupabaseConfig()) {
        try {
          const insertPath = clientOrderId
            ? "/rest/v1/orders?on_conflict=business_number%2Cclient_order_id"
            : "/rest/v1/orders";
          const rows = await requestSupabase(insertPath, {
            method: "POST",
            headers: { Prefer: clientOrderId ? "resolution=ignore-duplicates,return=representation" : "return=representation" },
            body: JSON.stringify([{
              client_order_id: clientOrderId || null,
              order_number: order.orderNumber,
              business_number: order.businessNumber,
              company_name: order.companyName,
              contact_name: order.contactName,
              order_status: order.status,
              item_count: order.itemCount,
              total_quote: order.totalQuote,
              order_note: encodeOrderNote(order),
              source: "cart"
            }])
          });
          const remoteOrder = Array.isArray(rows) ? rows[0] : null;
          const replayed = !remoteOrder?.id;
          const storedOrder = remoteOrder?.id
            ? mapSupabaseOrder(remoteOrder)
            : await readRemoteOrderByClientId(businessNumber, clientOrderId);
          if (storedOrder?.id) {
            const itemPayload = items.map((item, index) => ({
              order_id: storedOrder.id,
              line_number: index + 1,
              product_id: item.id,
              management_code: item.managementCode,
              product_type: item.productType,
              product_name: item.name,
              size: item.size,
              finish: item.finish || item.option,
              unit: item.unit,
              qty: item.qty,
              quote_price: item.quotePrice,
              line_total: item.lineTotal,
              stock_qty: item.stockQty,
              image: item.image
            }));
            await requestSupabase("/rest/v1/order_items?on_conflict=order_id%2Cline_number", {
              method: "POST",
              headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
              body: JSON.stringify(itemPayload)
            });
            return { ok: true, order: { ...storedOrder, items }, ...(replayed ? { replayed: true } : {}) };
          }
        } catch (error) {
          if (!isMissingSupabaseTableError(error, "orders") && !isMissingSupabaseTableError(error, "order_items")) throw error;
          if (!allowLocalFallback) {
            throw createOrderError(503, "주문 저장소가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
          }
        }
      }

      if (!allowLocalFallback) {
        throw createOrderError(503, "주문 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
      }
      return { ok: true, order: saveLocalOrder(order), storage: "local" };
    },

    async readOrdersByBusinessNumber(businessNumber) {
      const cleanBusinessNumber = clean(businessNumber);
      if (!cleanBusinessNumber) return [];
      if (hasSupabaseConfig()) {
        const query = new URLSearchParams({
          select: "id,order_number,business_number,company_name,contact_name,order_status,item_count,total_quote,order_note,created_at,updated_at",
          business_number: `eq.${cleanBusinessNumber}`,
          order: "created_at.desc"
        });
        try {
          const rows = await requestSupabase(`/rest/v1/orders?${query.toString()}`);
          const orders = Array.isArray(rows) ? rows.map(mapSupabaseOrder) : [];
          const itemsByOrder = await readOrderItems(orders.map((row) => row.id).filter(Boolean));
          return orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) || [] }));
        } catch (error) {
          if (!isMissingSupabaseTableError(error, "orders")) throw error;
        }
      }
      return readLocalOrders().filter((order) => order.businessNumber === cleanBusinessNumber);
    },

    async readAllOrders() {
      if (hasSupabaseConfig()) {
        const query = new URLSearchParams({
          select: "id,order_number,business_number,company_name,contact_name,order_status,item_count,total_quote,order_note,created_at,updated_at",
          order: "created_at.desc"
        });
        try {
          const rows = await requestSupabase(`/rest/v1/orders?${query.toString()}`);
          const orders = Array.isArray(rows) ? rows.map(mapSupabaseOrder) : [];
          const itemsByOrder = await readOrderItems(orders.map((row) => row.id).filter(Boolean));
          return orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) || [] }));
        } catch (error) {
          if (!isMissingSupabaseTableError(error, "orders")) throw error;
        }
      }
      return readLocalOrders();
    },

    async updateOrderStatus(payload) {
      const orderId = clean(payload?.orderId || payload?.id);
      const orderNumber = clean(payload?.orderNumber);
      const status = normalizeOrderStatus(payload?.status);
      const note = clean(payload?.note);
      if (!orderId && !orderNumber) throw createOrderError(400, "상태를 변경할 주문번호가 필요합니다.");

      if (hasSupabaseConfig()) {
        const filter = orderId
          ? `id=eq.${encodeURIComponent(orderId)}`
          : `order_number=eq.${encodeURIComponent(orderNumber)}`;
        const patch = {
          order_status: status
        };
        if (note) patch.order_note = note;
        try {
          const rows = await requestSupabase(`/rest/v1/orders?${filter}`, {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(patch)
          });
          const remoteOrder = Array.isArray(rows) ? rows[0] : null;
          if (!remoteOrder) throw createOrderError(404, "상태를 변경할 주문을 찾지 못했습니다.");
          return { ok: true, order: mapSupabaseOrder(remoteOrder) };
        } catch (error) {
          if (!isMissingSupabaseTableError(error, "orders")) throw error;
        }
      }

      const rows = readLocalOrders();
      const index = rows.findIndex((row) => (orderId && row.id === orderId) || (orderNumber && row.orderNumber === orderNumber));
      if (index < 0) throw createOrderError(404, "상태를 변경할 주문을 찾지 못했습니다.");
      rows[index] = {
        ...rows[index],
        status,
        statusLabel: status,
        note: note || rows[index].note,
        updatedAt: new Date().toISOString()
      };
      writeJsonArray(ordersPath, rows);
      return { ok: true, order: rows[index], storage: "local" };
    }
  };
}

module.exports = {
  createOrderStore,
  normalizeOrderStatus
};
