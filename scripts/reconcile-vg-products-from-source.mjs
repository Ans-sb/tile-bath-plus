import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const cli = parseCliArgs(process.argv.slice(2));
const productsPath = path.join(root, "data", "products.json");
const outputDir = path.join(root, "outputs", "vg-audit");
const stamp = timestamp();
const minStock = Number(cli.minStock || cli["min-stock"] || 31) || 31;
const applyChanges = String(cli.apply || "false") === "true";
const snapshotPath = cli.snapshot
  ? path.resolve(root, String(cli.snapshot))
  : await findLatestSnapshot(path.join(root, "outputs", "tile114-import"));

if (!snapshotPath) {
  throw new Error("VG 원본 스냅샷을 찾지 못했습니다. 먼저 import-tile114-verygood.mjs --output-only=true 를 실행하세요.");
}

await fs.mkdir(outputDir, { recursive: true });

const products = await readJsonArray(productsPath);
const liveProducts = await readJsonArray(snapshotPath);
const liveById = new Map(liveProducts.map((item) => [String(item.id || ""), item]).filter(([id]) => id));
const currentVgProducts = products.filter(isVgProduct);
const currentVgById = new Map(currentVgProducts.map((item) => [String(item.id || ""), item]).filter(([id]) => id));

const backupPath = path.join(root, "data", `products.backup-before-vg-source-reconcile-${stamp}.json`);
const reportPath = path.join(outputDir, `vg-source-reconcile-${stamp}.json`);
const csvPath = path.join(outputDir, `vg-source-reconcile-${stamp}.csv`);

const rows = [];
const finalProducts = [];
const addedProducts = [];
let updatedCount = 0;
let removedLowStockCount = 0;
let removedStaleCount = 0;

for (const product of products) {
  if (!isVgProduct(product)) {
    finalProducts.push(product);
    continue;
  }

  const id = String(product.id || "");
  const live = liveById.get(id);
  if (!live) {
    removedStaleCount += 1;
    rows.push(rowFor({ status: "removed_not_in_vg_source", current: product, reason: "원본 VG 목록/상세 스냅샷에 없음" }));
    continue;
  }

  const liveStockQty = Number(live.stockQty || 0);
  if (liveStockQty < minStock) {
    removedLowStockCount += 1;
    rows.push(rowFor({ status: "removed_low_stock", current: product, live, reason: `원본 재고 ${liveStockQty} < ${minStock}` }));
    continue;
  }

  const next = reconcileProduct(product, live);
  const changes = diffProduct(product, next);
  if (changes.length) {
    updatedCount += 1;
    rows.push(rowFor({ status: "updated", current: product, live, next, reason: changes.join(" / ") }));
  }
  addMissingRows(next, live, rows);
  finalProducts.push(next);
}

for (const live of liveProducts) {
  const id = String(live.id || "");
  if (!id || currentVgById.has(id)) continue;
  if (Number(live.stockQty || 0) < minStock) {
    rows.push(rowFor({ status: "skipped_missing_low_stock", live, reason: `원본에는 있으나 재고 ${Number(live.stockQty || 0)} < ${minStock}` }));
    continue;
  }
  const next = reconcileProduct(null, live);
  addedProducts.push(next);
  finalProducts.push(next);
  rows.push(rowFor({ status: "added_from_source", live, next, reason: "원본에는 있으나 현재 DB에 없음" }));
  addMissingRows(next, live, rows);
}

const summary = {
  ok: true,
  generatedAt: new Date().toISOString(),
  applyChanges,
  minStock,
  snapshotPath,
  productsPath,
  backupPath: applyChanges ? backupPath : "",
  reportPath,
  csvPath,
  currentVgCount: currentVgProducts.length,
  liveVgCount: liveProducts.length,
  finalVgCount: finalProducts.filter(isVgProduct).length,
  updatedCount,
  addedCount: addedProducts.length,
  removedLowStockCount,
  removedStaleCount,
  issueRows: rows.length,
  rowsByStatus: countBy(rows, (row) => row.status),
  remainingMissing: countRemainingMissing(finalProducts.filter(isVgProduct))
};

const report = { ...summary, rows };
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await fs.writeFile(csvPath, toCsv(rows), "utf8");

if (applyChanges) {
  await fs.copyFile(productsPath, backupPath);
  await writeJsonAtomic(productsPath, finalProducts);
}

console.log(JSON.stringify(summary, null, 2));

function reconcileProduct(current, live) {
  const source = live || current || {};
  const currentProduct = current || {};
  const productType = inferProductType(source);
  const categoryName = cleanText(source.sourceCategoryName || source.option || currentProduct.sourceCategoryName || currentProduct.option);
  const name = cleanText(source.name || source.modelName || currentProduct.name || currentProduct.modelName);
  const size = cleanText(source.size || currentProduct.size).replace(/×/g, "*").replace(/\s+/g, "");
  const origin = inferOrigin(categoryName, currentProduct.countryOfOrigin);
  const finish = inferVgFinish({ name, categoryName, size, memo: source.features || currentProduct.features || "" }) || currentProduct.finish || source.finish || "";
  const material = inferVgMaterial({
    productType,
    categoryName,
    size,
    name,
    currentMaterial: currentProduct.material,
    sourceMaterial: source.material
  });
  const color = cleanText(currentProduct.color || source.color || inferColor(name));
  const imageUrls = unique([
    ...(Array.isArray(source.imageUrls) ? source.imageUrls : []),
    source.image,
    source.originalImage,
    source.closeImage,
    source.detailImage,
    ...(Array.isArray(currentProduct.imageUrls) ? currentProduct.imageUrls : []),
    currentProduct.image
  ].map(cleanText).filter(Boolean));
  const image = cleanText(source.image || imageUrls[0] || currentProduct.image);

  return {
    ...currentProduct,
    ...source,
    id: cleanText(source.id || currentProduct.id),
    managementCode: cleanText(currentProduct.managementCode || source.managementCode || `VG-${source.sourceProductId || ""}`),
    majorCategory: "VG",
    catalogSource: "VG",
    kind: "VG",
    productType,
    option: categoryName,
    sourceCategoryName: categoryName,
    name,
    modelName: name,
    size,
    material,
    finish,
    surface: finish,
    countryOfOrigin: origin,
    color,
    unit: cleanText(source.unit || currentProduct.unit),
    pcsPerBox: source.pcsPerBox || currentProduct.pcsPerBox || "",
    sqmPerBox: source.sqmPerBox || currentProduct.sqmPerBox || "",
    costPrice: Number(source.costPrice || currentProduct.costPrice || 0) || 0,
    stockQty: Number(source.stockQty || 0) || 0,
    stockText: cleanText(source.stockText || ""),
    image,
    originalImage: cleanText(source.originalImage || image),
    imageUrls,
    closeImage: cleanText(source.closeImage || imageUrls[1] || currentProduct.closeImage || ""),
    detailImage: cleanText(source.detailImage || imageUrls[2] || imageUrls[1] || currentProduct.detailImage || image),
    sourceSite: "tile114",
    sourceUrl: cleanText(source.sourceUrl || currentProduct.sourceUrl),
    sourceProductId: cleanText(source.sourceProductId || currentProduct.sourceProductId),
    sourceCategoryCode: cleanText(source.sourceCategoryCode || currentProduct.sourceCategoryCode),
    lastSyncedAt: new Date().toISOString(),
    vgReconciledAt: new Date().toISOString()
  };
}

function inferProductType(product) {
  const category = cleanText(product.sourceCategoryName || product.option);
  if (/부자재/.test(category)) return "material";
  return "tile";
}

function inferOrigin(categoryName, currentOrigin) {
  const text = cleanText(categoryName);
  if (/중국/.test(text)) return "중국";
  if (/유럽/.test(text)) return "유럽";
  if (/아시아/.test(text)) return "아시아";
  if (/국산|한국|KOREA/i.test(text)) return "국산";
  return cleanText(currentOrigin) || "기타";
}

function inferVgMaterial({ productType, categoryName, size, name, currentMaterial, sourceMaterial }) {
  if (productType !== "tile") return cleanText(currentMaterial || sourceMaterial || "");
  const source = `${categoryName} ${name} ${sourceMaterial || ""}`;
  if (/포세린|포쉐린|porcelain|por\b/i.test(source)) return "포세린";
  if (/도기질/.test(source)) return "도기질";
  if (/자기질/.test(source)) return "자기질";
  if (/^T-/.test(categoryName)) {
    if (/벽/.test(categoryName)) return "도기질";
    if (/바닥/.test(categoryName)) {
      const { width, height } = parseSize(size);
      if (Math.max(width || 0, height || 0) >= 600) return "포세린";
      return "자기질";
    }
    return cleanText(currentMaterial || sourceMaterial || "");
  }
  if (/벽돌|고벽돌|전돌|모노타일/i.test(source)) return "벽돌";
  if (/스톤|트라버틴|트래버틴|대리|현무|산호|오로|슬레|레그노/i.test(source)) return cleanText(currentMaterial || sourceMaterial || "스톤");
  if (/벽/.test(categoryName)) return "도기질";
  if (/바닥/.test(categoryName)) {
    const { width, height } = parseSize(size);
    if (Math.max(width || 0, height || 0) >= 600) return "포세린";
    return "자기질";
  }
  return cleanText(currentMaterial || sourceMaterial || "");
}

function inferVgFinish({ name, categoryName, size, memo }) {
  if (/(T-유럽벽|유럽벽)/.test(categoryName) && /MAIOLICA/i.test(name)) return "유광";
  if (/WT\d+P\b/i.test(name)) return "유광";
  if (/WT\d+M\b/i.test(name)) return "무광";
  const normalizedSize = cleanText(size).replace(/[×xX]/g, "*").replace(/\s+/g, "");
  if (normalizedSize === "300*600" && /(T-중국벽|중국벽)/.test(categoryName)) {
    const code = cleanText(name).toUpperCase().match(/WT36([PM])\d+/);
    if (code) return code[1] === "P" ? "유광" : "무광";
  }
  const text = `${name} ${memo}`.trim().replace(/\s+/g, " ").toUpperCase();
  if (/(유광|유약|폴리싱|POLISHED|POLISHING)/.test(text)) return "유광";
  const tail = text.replace(/\s*\(\s*[※*]+\s*\)\s*$/g, "").replace(/\s*[※*]+\s*$/g, "").trim();
  if (/(?:^|[\s(/_.-])P\)?$/.test(tail) || /\(P\)$/.test(tail)) return "유광";
  return "무광";
}

function inferColor(source) {
  const text = String(source || "").toUpperCase();
  const entries = [
    ["DARK GREY", "다크그레이"], ["DARK GRAY", "다크그레이"],
    ["LIGHT GREY", "라이트그레이"], ["LIGHT GRAY", "라이트그레이"],
    ["WHITE", "화이트"], ["BIANCO", "화이트"], ["BLANCO", "화이트"],
    ["IVORY", "아이보리"], ["AVORIO", "아이보리"], ["BEIGE", "베이지"],
    ["GREY", "그레이"], ["GRAY", "그레이"], ["BLACK", "블랙"],
    ["BROWN", "브라운"], ["TAUPE", "토프"], ["GREEN", "그린"],
    ["RED", "레드"], ["YELLOW", "옐로우"], ["BLUE", "블루"],
    ["SAND", "샌드"], ["SILVER", "실버"], ["GOLD", "골드"],
    ["WHT", "화이트"], ["BLK", "블랙"], ["GRY", "그레이"]
  ];
  return entries.find(([needle]) => text.includes(needle))?.[1] || "";
}

function parseSize(size) {
  const match = cleanText(size).replace(/[×xX]/g, "*").match(/(\d{2,4})\s*\*\s*(\d{2,4})/);
  return {
    width: match ? Number(match[1]) || null : null,
    height: match ? Number(match[2]) || null : null
  };
}

function diffProduct(before, after) {
  const fields = ["sourceProductId", "name", "modelName", "sourceCategoryName", "productType", "size", "color", "material", "finish", "surface", "countryOfOrigin", "unit", "pcsPerBox", "sqmPerBox", "costPrice", "stockQty", "stockText", "image"];
  const changed = [];
  for (const field of fields) {
    if (normalizeValue(before?.[field]) !== normalizeValue(after?.[field])) changed.push(field);
  }
  return changed;
}

function addMissingRows(product, live, rowsTarget) {
  const fields = [
    ["sourceProductId", "품번"],
    ["size", "규격"],
    ["color", "색상"],
    ["material", "재질"],
    ["finish", "마감"],
    ["stockText", "재고텍스트"]
  ];
  for (const [field, label] of fields) {
    if (!cleanText(product?.[field])) {
      rowsTarget.push(rowFor({ status: "missing_after_reconcile", live, next: product, field, reason: `${label} 비어 있음` }));
    }
  }
}

function rowFor({ status, current = {}, live = {}, next = {}, field = "", reason = "" }) {
  const product = next.id ? next : live.id ? live : current;
  return {
    status,
    field,
    reason,
    id: product.id || current.id || live.id || "",
    sourceProductId: product.sourceProductId || current.sourceProductId || live.sourceProductId || "",
    managementCode: product.managementCode || current.managementCode || live.managementCode || "",
    name: product.name || current.name || live.name || "",
    category: product.sourceCategoryName || product.option || current.sourceCategoryName || live.sourceCategoryName || "",
    productType: product.productType || current.productType || live.productType || "",
    currentSize: current.size || "",
    liveSize: live.size || "",
    finalSize: next.size || "",
    currentColor: current.color || "",
    liveColor: live.color || "",
    finalColor: next.color || "",
    currentMaterial: current.material || "",
    liveMaterial: live.material || "",
    finalMaterial: next.material || "",
    currentFinish: current.finish || "",
    liveFinish: live.finish || "",
    finalFinish: next.finish || "",
    currentOrigin: current.countryOfOrigin || "",
    liveOrigin: live.countryOfOrigin || "",
    finalOrigin: next.countryOfOrigin || "",
    currentStockQty: current.stockQty ?? "",
    liveStockQty: live.stockQty ?? "",
    finalStockQty: next.stockQty ?? "",
    currentStockText: current.stockText || "",
    liveStockText: live.stockText || "",
    finalStockText: next.stockText || "",
    sourceUrl: product.sourceUrl || current.sourceUrl || live.sourceUrl || "",
    image: product.image || current.image || live.image || ""
  };
}

function countRemainingMissing(items) {
  const result = {};
  for (const field of ["sourceProductId", "size", "color", "material", "finish", "stockText"]) {
    result[field] = items.filter((item) => !cleanText(item[field])).length;
  }
  result.lowStockBelowMin = items.filter((item) => Number(item.stockQty || 0) < minStock).length;
  return result;
}

function isVgProduct(product) {
  return String(product?.majorCategory || product?.catalogSource || product?.kind || "").trim().toUpperCase() === "VG"
    || String(product?.id || "").startsWith("verygood-");
}

function countBy(items, getValue) {
  const map = new Map();
  for (const item of items) {
    const value = getValue(item) || "미확인";
    map.set(value, (map.get(value) || 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")));
}

function toCsv(items) {
  const headers = [
    "status", "field", "reason", "id", "sourceProductId", "managementCode", "name", "category", "productType",
    "currentSize", "liveSize", "finalSize",
    "currentColor", "liveColor", "finalColor",
    "currentMaterial", "liveMaterial", "finalMaterial",
    "currentFinish", "liveFinish", "finalFinish",
    "currentOrigin", "liveOrigin", "finalOrigin",
    "currentStockQty", "liveStockQty", "finalStockQty",
    "currentStockText", "liveStockText", "finalStockText",
    "sourceUrl", "image"
  ];
  return [
    headers.join(","),
    ...items.map((item) => headers.map((header) => csvCell(item[header])).join(","))
  ].join("\n");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function findLatestSnapshot(dir) {
  const entries = await fs.readdir(dir).catch(() => []);
  const candidates = entries
    .filter((name) => /^verygood-products-\d{8}-\d{6}\.json$/.test(name))
    .sort();
  return candidates.length ? path.join(dir, candidates[candidates.length - 1]) : "";
}

async function readJsonArray(filePath) {
  const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
  return Array.isArray(payload) ? payload : [];
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, filePath);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean).join("|");
  return cleanText(value);
}

function unique(items) {
  return [...new Set(items)];
}

function timestamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function parseCliArgs(args) {
  const result = {};
  for (const arg of args) {
    const match = String(arg).match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) continue;
    const key = match[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    result[key] = match[2] ?? "true";
    result[match[1]] = match[2] ?? "true";
  }
  return result;
}
