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

function normalizeOrderStatus(value) {
  const text = clean(value);
  if (["접수완료", "received", "confirmed"].includes(text)) return "접수완료";
  if (["재고확인", "stock_check"].includes(text)) return "재고확인";
  if (["견적확정", "quote_confirmed"].includes(text)) return "견적확정";
  if (["출고준비", "shipping_ready"].includes(text)) return "출고준비";
  if (["완료", "done", "completed"].includes(text)) return "완료";
  if (["취소", "cancelled", "canceled"].includes(text)) return "취소";
  return "접수대기";
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
  return {
    id: clean(row.id),
    orderNumber: clean(row.orderNumber),
    businessNumber: clean(row.businessNumber),
    companyName: clean(row.companyName),
    contactName: clean(row.contactName),
    status: normalizeOrderStatus(row.status),
    statusLabel: normalizeOrderStatus(row.status),
    itemCount: Number(row.itemCount) || items.length,
    totalQuote: toNumber(row.totalQuote),
    note: clean(row.note),
    createdAt: clean(row.createdAt),
    updatedAt: clean(row.updatedAt || row.createdAt),
    items
  };
}

function mapSupabaseOrder(row) {
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    id: clean(row.id),
    orderNumber: clean(row.order_number),
    businessNumber: clean(row.business_number),
    companyName: clean(row.company_name),
    contactName: clean(row.contact_name),
    status: normalizeOrderStatus(row.order_status),
    statusLabel: normalizeOrderStatus(row.order_status),
    itemCount: Number(row.item_count) || items.length,
    totalQuote: toNumber(row.total_quote),
    note: clean(row.order_note),
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
      const items = (Array.isArray(payload?.items) ? payload.items : [])
        .map((item) => normalizeOrderItem(item, normalizeCartItem))
        .filter((item) => item.qty > 0);
      if (!businessNumber) throw new Error("주문 접수에는 사업자등록번호가 필요합니다.");
      if (!items.length) throw new Error("주문 접수할 상품이 없습니다.");

      const now = new Date().toISOString();
      const order = {
        id: crypto.randomUUID(),
        orderNumber: createOrderNumber(),
        businessNumber,
        companyName: clean(payload?.companyName),
        contactName: clean(payload?.contactName),
        status: normalizeOrderStatus(payload?.status),
        statusLabel: normalizeOrderStatus(payload?.status),
        itemCount: items.length,
        totalQuote: items.reduce((sum, item) => sum + item.lineTotal, 0),
        note: clean(payload?.note),
        createdAt: now,
        updatedAt: now,
        items
      };

      if (hasSupabaseConfig()) {
        try {
          const rows = await requestSupabase("/rest/v1/orders", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify([{
              order_number: order.orderNumber,
              business_number: order.businessNumber,
              company_name: order.companyName,
              contact_name: order.contactName,
              order_status: order.status,
              item_count: order.itemCount,
              total_quote: order.totalQuote,
              order_note: order.note,
              source: "cart"
            }])
          });
          const remoteOrder = Array.isArray(rows) ? rows[0] : null;
          if (remoteOrder?.id) {
            const itemPayload = items.map((item) => ({
              order_id: remoteOrder.id,
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
            await requestSupabase("/rest/v1/order_items", {
              method: "POST",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify(itemPayload)
            });
            return { ok: true, order: { ...mapSupabaseOrder(remoteOrder), items } };
          }
        } catch (error) {
          if (!isMissingSupabaseTableError(error, "orders") && !isMissingSupabaseTableError(error, "order_items")) throw error;
        }
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
