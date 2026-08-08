const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const VALID_ROLES = new Set(["wall", "floor", "point"]);

function createSketchupPackageStore({ filePath, now = () => new Date(), randomBytes = crypto.randomBytes }) {
  let writeQueue = Promise.resolve();

  async function readRows() {
    try {
      const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async function saveRows(rows) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    await fs.rename(temporaryPath, filePath);
  }

  function mutate(mutator) {
    const operation = writeQueue.then(async () => {
      const rows = await readRows();
      const result = await mutator(rows);
      await saveRows(rows);
      return result;
    });
    writeQueue = operation.catch(() => {});
    return operation;
  }

  async function createPackage({ payload, products, requestOrigin }) {
    return mutate((rows) => {
      const pairingCode = createUniquePairingCode(rows, randomBytes);
      const createdAt = now().toISOString();
      const productById = new Map(products.map((product) => [String(product.id), product]));
      const items = normalizeRequestedItems(payload?.items, productById, requestOrigin);
      if (!items.length) {
        const error = new Error("SketchUp으로 보낼 타일 상품을 한 개 이상 선택해주세요.");
        error.statusCode = 400;
        throw error;
      }

      const groutMm = clampNumber(payload?.groutMm, 0, 20, 2);
      const record = {
        id: crypto.randomUUID(),
        code: pairingCode,
        project: normalizeProject(payload?.project),
        groutMm,
        grout: {
          widthMm: groutMm,
          color: normalizeHexColor(payload?.groutColor, "#D8D5CF")
        },
        layout: {
          offsetXmm: clampNumber(payload?.offsetXmm, -5000, 5000, 0),
          offsetYmm: clampNumber(payload?.offsetYmm, -5000, 5000, 0)
        },
        wastePercent: clampNumber(payload?.wastePercent, 0, 50, 10),
        items,
        reports: [],
        createdAt,
        updatedAt: createdAt
      };
      rows.unshift(record);
      rows.splice(100);
      return record;
    });
  }

  async function readByCode(code) {
    const normalizedCode = normalizePairingCode(code);
    const rows = await readRows();
    return rows.find((row) => row.code === normalizedCode) || null;
  }

  async function listRecent(limit = 8) {
    const rows = await readRows();
    return rows.slice(0, Math.max(1, Math.min(Number(limit) || 8, 30)));
  }

  async function appendReport(code, payload) {
    return mutate((rows) => {
      const normalizedCode = normalizePairingCode(code);
      const record = rows.find((row) => row.code === normalizedCode);
      if (!record) return null;

      const productId = sanitizeText(payload?.productId, 120);
      const item = record.items.find((entry) => entry.productId === productId);
      if (!item) {
        const error = new Error("패키지에 포함되지 않은 상품입니다.");
        error.statusCode = 400;
        throw error;
      }

      const usage = calculateMaterialUsage({
        areaSqm: payload?.areaSqm,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        boxSqm: item.boxSqm,
        boxPcs: item.boxPcs,
        wastePercent: record.wastePercent
      });
      const report = {
        id: crypto.randomUUID(),
        productId,
        role: VALID_ROLES.has(payload?.role) ? payload.role : item.role,
        surfaceId: sanitizeText(payload?.surfaceId, 160),
        areaSqm: usage.areaSqm,
        orderAreaSqm: usage.orderAreaSqm,
        tileCount: usage.tileCount,
        boxCount: usage.boxCount,
        rotation: clampNumber(payload?.rotation, -360, 360, 0),
        offsetXmm: clampNumber(payload?.offsetXmm, -5000, 5000, record.layout?.offsetXmm || 0),
        offsetYmm: clampNumber(payload?.offsetYmm, -5000, 5000, record.layout?.offsetYmm || 0),
        groutMm: record.grout?.widthMm ?? record.groutMm ?? 0,
        groutColor: record.grout?.color || "#D8D5CF",
        appliedAt: now().toISOString()
      };
      record.reports.unshift(report);
      record.reports.splice(100);
      record.updatedAt = report.appliedAt;
      return { package: record, report };
    });
  }

  return { appendReport, createPackage, listRecent, readByCode };
}

function normalizeRequestedItems(entries, productById, requestOrigin) {
  const seen = new Set();
  return (Array.isArray(entries) ? entries : []).flatMap((entry) => {
    const productId = sanitizeText(entry?.productId, 120);
    if (!productId || seen.has(productId)) return [];
    const product = productById.get(productId);
    if (!product || !isTileProduct(product)) return [];
    seen.add(productId);

    const size = parseTileSize(product.size);
    if (!size.widthMm || !size.heightMm) return [];
    const role = VALID_ROLES.has(entry?.role) ? entry.role : inferRole(product);
    return [{
      id: crypto.randomUUID(),
      productId,
      role,
      name: sanitizeText(product.name, 240),
      modelName: sanitizeText(product.modelName, 180),
      sizeLabel: sanitizeText(product.size, 80),
      widthMm: size.widthMm,
      heightMm: size.heightMm,
      thicknessMm: parseThickness(product.size),
      material: sanitizeText(product.material, 80),
      finish: sanitizeText(product.finish || product.surface, 80),
      color: sanitizeText(product.color, 80),
      imageUrl: resolveImageUrl(selectProductImage(product), requestOrigin),
      boxPcs: readPositiveNumber(product, ["boxPcs", "pcsPerBox", "pcs_box", "pcsPerCarton"]),
      boxSqm: readPositiveNumber(product, ["boxSqm", "sqmPerBox", "m2PerBox", "sqm_box"])
    }];
  });
}

function normalizeProject(project) {
  return {
    name: sanitizeText(project?.name, 120) || "자재GO SketchUp 프로젝트",
    siteName: sanitizeText(project?.siteName, 120),
    roomName: sanitizeText(project?.roomName, 120),
    note: sanitizeText(project?.note, 800)
  };
}

function calculateMaterialUsage({ areaSqm, widthMm, heightMm, boxSqm, boxPcs, wastePercent }) {
  const safeArea = clampNumber(areaSqm, 0, 100000, 0);
  const safeWaste = clampNumber(wastePercent, 0, 50, 0);
  const orderAreaSqm = safeArea * (1 + safeWaste / 100);
  const tileAreaSqm = (Number(widthMm) * Number(heightMm)) / 1_000_000;
  const tileCount = tileAreaSqm > 0 ? Math.ceil(orderAreaSqm / tileAreaSqm) : 0;
  let boxCount = 0;
  if (Number(boxSqm) > 0) boxCount = Math.ceil(orderAreaSqm / Number(boxSqm));
  else if (Number(boxPcs) > 0) boxCount = Math.ceil(tileCount / Number(boxPcs));
  return {
    areaSqm: round(safeArea, 3),
    orderAreaSqm: round(orderAreaSqm, 3),
    tileCount,
    boxCount
  };
}

function parseTileSize(value) {
  const match = String(value || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(?:x|×|\*)\s*(\d+(?:\.\d+)?)/i);
  return match ? { widthMm: Number(match[1]), heightMm: Number(match[2]) } : { widthMm: 0, heightMm: 0 };
}

function parseThickness(value) {
  const match = String(value || "").match(/(?:x|×|\*|\s)(\d+(?:\.\d+)?)\s*(?:T|t|mm)\b/);
  return match ? Number(match[1]) : 0;
}

function isTileProduct(product) {
  return String(product?.productType || "").toLowerCase() === "tile"
    || String(product?.mainCategory || "") === "타일";
}

function inferRole(product) {
  const text = [product?.kind, product?.option, product?.features, product?.name].filter(Boolean).join(" ");
  if (/벽|wall/i.test(text) && !/바닥|floor/i.test(text)) return "wall";
  return "floor";
}

function selectProductImage(product) {
  return product.closeImage || product.detailImage || product.originalImage || product.image || "";
}

function resolveImageUrl(value, requestOrigin) {
  const source = sanitizeText(value, 2000);
  if (!source || /^data:/i.test(source)) return "";
  if (/^https?:\/\//i.test(source)) return source;
  const origin = String(requestOrigin || "http://localhost:4173").replace(/\/$/, "");
  return `${origin}/${source.replace(/^\.?\//, "")}`;
}

function readPositiveNumber(product, keys) {
  for (const key of keys) {
    const value = Number(product?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function createUniquePairingCode(rows, randomBytes) {
  const existing = new Set(rows.map((row) => row.code));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bytes = randomBytes(6);
    const code = Array.from(bytes, (byte) => PAIRING_ALPHABET[byte % PAIRING_ALPHABET.length]).join("");
    if (!existing.has(code)) return code;
  }
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

function normalizePairingCode(value) {
  return String(value || "").trim().replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function sanitizeText(value, maxLength = 240) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function normalizeHexColor(value, fallback) {
  const source = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(source) ? source.toUpperCase() : fallback;
}

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

module.exports = {
  calculateMaterialUsage,
  createSketchupPackageStore,
  normalizePairingCode,
  parseTileSize
};
