import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const cli = parseCliArgs(process.argv.slice(2));
const productsPath = path.join(root, "data", "products.json");
const outputDir = path.join(root, "outputs", "vg-audit");
const stamp = timestamp();
const minStock = Number(cli.minStock || cli["min-stock"] || 31) || 31;
const snapshotPath = cli.snapshot
  ? path.resolve(root, String(cli.snapshot))
  : await findLatestSnapshot(path.join(root, "outputs", "tile114-import"));

if (!snapshotPath) throw new Error("VG 원본 스냅샷을 찾지 못했습니다.");
await fs.mkdir(outputDir, { recursive: true });

const currentProducts = await readJsonArray(productsPath);
const liveProducts = await readJsonArray(snapshotPath);
const liveById = new Map(liveProducts.map((item) => [String(item.id || ""), item]).filter(([id]) => id));
const currentVg = currentProducts.filter(isVgProduct);

const criticalRows = [];
const reviewRows = [];
const verifiedRows = [];

for (const current of currentVg) {
  const live = liveById.get(String(current.id || ""));
  if (!live) {
    criticalRows.push(makeRow("critical", "stale_active_product", "현재 DB에 있으나 최신 VG 원본 목록/상세에 없음", current, live));
    continue;
  }

  if (Number(live.stockQty || 0) < minStock) {
    criticalRows.push(makeRow("critical", "low_stock_active", `원본 재고 ${Number(live.stockQty || 0)} < ${minStock}인데 현재 DB에 남아 있음`, current, live));
  }

  for (const field of exactSourceFields()) {
    const currentValue = getNormalizedField(current, field.name, field.kind);
    const liveValue = getNormalizedField(live, field.name, field.kind);
    if (currentValue !== liveValue) {
      criticalRows.push(makeRow("critical", `source_mismatch:${field.name}`, `${field.label} 원본값과 현재 DB값 불일치`, current, live, {
        field: field.name,
        currentValue,
        expectedValue: liveValue
      }));
    }
  }

  const category = cleanText(current.sourceCategoryName || current.option || live.sourceCategoryName || live.option);
  const expectedProductType = /부자재/.test(category) ? "material" : "tile";
  if (cleanText(current.productType) !== expectedProductType) {
    criticalRows.push(makeRow("critical", "rule_mismatch:productType", "원본 카테고리 기준 제품군 불일치", current, live, {
      field: "productType",
      currentValue: current.productType,
      expectedValue: expectedProductType
    }));
  }

  const expectedOrigin = inferOrigin(category, current.countryOfOrigin);
  if (cleanText(current.countryOfOrigin) !== expectedOrigin) {
    criticalRows.push(makeRow("critical", "rule_mismatch:countryOfOrigin", "원본 카테고리 기준 원산지 불일치", current, live, {
      field: "countryOfOrigin",
      currentValue: current.countryOfOrigin,
      expectedValue: expectedOrigin
    }));
  }

  const expectedFinish = inferVgFinish({
    name: cleanText(current.name || live.name),
    categoryName: category,
    size: cleanText(current.size || live.size),
    memo: current.features || live.features || ""
  });
  if (cleanText(current.finish) !== expectedFinish || cleanText(current.surface) !== expectedFinish) {
    criticalRows.push(makeRow("critical", "rule_mismatch:finish", "VG 마감 규칙 기준 불일치", current, live, {
      field: "finish/surface",
      currentValue: `${current.finish || ""}/${current.surface || ""}`,
      expectedValue: expectedFinish
    }));
  }

  const expectedMaterial = inferVgMaterial({
    productType: expectedProductType,
    categoryName: category,
    size: current.size || live.size,
    name: current.name || live.name,
    sourceMaterial: live.material
  });
  if (expectedMaterial && cleanText(current.material) !== expectedMaterial) {
    criticalRows.push(makeRow("critical", "rule_mismatch:material", "카테고리/규격 기준 재질 불일치", current, live, {
      field: "material",
      currentValue: current.material,
      expectedValue: expectedMaterial
    }));
  } else if (expectedProductType === "tile" && !expectedMaterial) {
    reviewRows.push(makeRow("review", "material_unverifiable", "원본 카테고리/규격만으로 재질 확정 불가", current, live, {
      field: "material",
      currentValue: current.material,
      expectedValue: ""
    }));
  }

  const expectedColor = inferColor(current.name || live.name);
  if (expectedColor && !isAcceptableColor(current.color, expectedColor)) {
    criticalRows.push(makeRow("critical", "rule_mismatch:color", "품명 색상 단서와 현재 색상 불일치", current, live, {
      field: "color",
      currentValue: current.color,
      expectedValue: expectedColor
    }));
  } else if (expectedProductType === "tile" && !expectedColor) {
    reviewRows.push(makeRow("review", "color_requires_visual_check", "품명에 명확한 색상 단서가 없어 이미지 기준 검수 필요", current, live, {
      field: "color",
      currentValue: current.color,
      expectedValue: ""
    }));
  }

  if (expectedProductType === "tile" && !cleanText(current.size)) {
    reviewRows.push(makeRow("review", "size_missing_in_source", "원본 상세에도 규격이 비어 있어 수동 확인 필요", current, live, {
      field: "size",
      currentValue: current.size,
      expectedValue: live.size
    }));
  }

  if (!criticalRows.some((row) => row.id === current.id)) {
    verifiedRows.push(makeRow("verified", "source_and_rules_ok", "원본 직접값 및 확정 규칙 기준 치명 오류 없음", current, live));
  }
}

for (const live of liveProducts) {
  const inCurrent = currentVg.some((item) => String(item.id || "") === String(live.id || ""));
  if (inCurrent) continue;
  if (Number(live.stockQty || 0) >= minStock) {
    criticalRows.push(makeRow("critical", "missing_active_product", `최신 원본 재고 ${minStock} 이상인데 현재 DB에 없음`, null, live));
  }
}

const allRows = [...criticalRows, ...reviewRows];
const reportPath = path.join(outputDir, `vg-accuracy-audit-${stamp}.json`);
const csvPath = path.join(outputDir, `vg-accuracy-audit-${stamp}.csv`);
const summary = {
  ok: true,
  generatedAt: new Date().toISOString(),
  snapshotPath,
  productsPath,
  minStock,
  currentVgCount: currentVg.length,
  liveVgCount: liveProducts.length,
  criticalIssueCount: criticalRows.length,
  reviewIssueCount: reviewRows.length,
  verifiedActiveCount: verifiedRows.length,
  criticalByIssue: countBy(criticalRows, (row) => row.issueType),
  reviewByIssue: countBy(reviewRows, (row) => row.issueType),
  reportPath,
  csvPath
};

await fs.writeFile(reportPath, `${JSON.stringify({ ...summary, criticalRows, reviewRows }, null, 2)}\n`, "utf8");
await fs.writeFile(csvPath, toCsv(allRows), "utf8");
console.log(JSON.stringify(summary, null, 2));

function exactSourceFields() {
  return [
    { name: "sourceProductId", label: "원본 상품ID", kind: "text" },
    { name: "name", label: "품명", kind: "text" },
    { name: "modelName", label: "모델명", kind: "text" },
    { name: "sourceCategoryName", label: "원본 카테고리", kind: "text" },
    { name: "size", label: "규격", kind: "size" },
    { name: "unit", label: "단위", kind: "text" },
    { name: "costPrice", label: "원가", kind: "number" },
    { name: "stockQty", label: "재고수량", kind: "number" },
    { name: "stockText", label: "재고문구", kind: "text" },
    { name: "sourceUrl", label: "상세URL", kind: "url" },
    { name: "image", label: "대표이미지", kind: "url" }
  ];
}

function makeRow(level, issueType, message, current = {}, live = {}, extra = {}) {
  const product = current || live || {};
  return {
    level,
    issueType,
    message,
    field: extra.field || "",
    id: product.id || live?.id || "",
    sourceProductId: product.sourceProductId || live?.sourceProductId || "",
    managementCode: product.managementCode || live?.managementCode || "",
    name: product.name || live?.name || "",
    category: product.sourceCategoryName || product.option || live?.sourceCategoryName || live?.option || "",
    productType: product.productType || live?.productType || "",
    size: product.size || live?.size || "",
    material: product.material || "",
    finish: product.finish || "",
    color: product.color || "",
    origin: product.countryOfOrigin || "",
    stockQty: product.stockQty ?? live?.stockQty ?? "",
    stockText: product.stockText || live?.stockText || "",
    currentValue: extra.currentValue ?? "",
    expectedValue: extra.expectedValue ?? "",
    sourceUrl: product.sourceUrl || live?.sourceUrl || "",
    image: product.image || live?.image || ""
  };
}

function inferOrigin(categoryName, currentOrigin) {
  const text = cleanText(categoryName);
  if (/중국/.test(text)) return "중국";
  if (/유럽/.test(text)) return "유럽";
  if (/아시아/.test(text)) return "아시아";
  if (/국산|한국|KOREA/i.test(text)) return "국산";
  return cleanText(currentOrigin) || "기타";
}

function inferVgMaterial({ productType, categoryName, size, name, sourceMaterial }) {
  if (productType !== "tile") return "";
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
    return "";
  }
  if (/벽돌|고벽돌|전돌|모노타일/i.test(source)) return "벽돌";
  if (/스톤|트라버틴|트래버틴|대리|현무|산호|오로|슬레|레그노/i.test(source)) return "스톤";
  if (/벽/.test(categoryName)) return "도기질";
  if (/바닥/.test(categoryName)) {
    const { width, height } = parseSize(size);
    if (Math.max(width || 0, height || 0) >= 600) return "포세린";
    return "자기질";
  }
  return "";
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
    ["D.GREY", "다크그레이"], ["D.GRAY", "다크그레이"],
    ["LIGHT GREY", "라이트그레이"], ["LIGHT GRAY", "라이트그레이"],
    ["L.GREY", "라이트그레이"], ["L.GRAY", "라이트그레이"],
    ["WHITE", "화이트"], ["BIANCO", "화이트"], ["BLANCO", "화이트"], ["슈퍼화이트", "화이트"],
    ["IVORY", "아이보리"], ["AVORIO", "아이보리"], ["CREAM", "아이보리"],
    ["BEIGE", "베이지"], ["SAND", "샌드"],
    ["GREY", "그레이"], ["GRAY", "그레이"],
    ["BLACK", "블랙"], ["NERO", "블랙"], ["블랙", "블랙"],
    ["BROWN", "브라운"], ["TAUPE", "토프"],
    ["GREEN", "그린"], ["MINT", "그린"],
    ["RED", "레드"], ["YELLOW", "옐로우"], ["BLUE", "블루"],
    ["PINK", "핑크"], ["SILVER", "실버"], ["GOLD", "골드"],
    ["화이트", "화이트"], ["아이보리", "아이보리"], ["베이지", "베이지"],
    ["그레이", "그레이"], ["회색", "그레이"], ["브라운", "브라운"],
    ["청록", "블루"], ["민트", "그린"], ["핑크", "핑크"]
  ];
  return entries.find(([needle]) => text.includes(needle))?.[1] || "";
}

function isAcceptableColor(currentColor, expectedColor) {
  const current = cleanText(currentColor);
  const expected = cleanText(expectedColor);
  if (!expected) return true;
  if (!current) return false;
  if (current === expected) return true;
  const currentSet = new Set(colorFamily(current));
  return colorFamily(expected).some((entry) => currentSet.has(entry));
}

function colorFamily(value) {
  const text = cleanText(value);
  const families = [
    ["화이트", "아이보리", "아이보리 / 크림", "크림", "오프화이트"],
    ["그레이", "라이트그레이", "다크그레이", "차콜 / 다크그레이", "실버"],
    ["베이지", "토프", "샌드", "브라운"],
    ["메탈릭", "골드", "실버"],
    ["그린", "민트"],
    ["블루", "청록"]
  ];
  const group = families.find((items) => items.includes(text));
  return group || [text];
}

function parseSize(size) {
  const match = cleanText(size).replace(/[×xX]/g, "*").match(/(\d{2,4})\s*\*\s*(\d{2,4})/);
  return { width: match ? Number(match[1]) || null : null, height: match ? Number(match[2]) || null : null };
}

function getNormalizedField(product, name, kind) {
  const value = product?.[name];
  if (kind === "number") return String(Number(value || 0) || 0);
  if (kind === "size") return cleanText(value).replace(/[×＊xX]/g, "*").replace(/\s+/g, "");
  if (kind === "url") return cleanText(value).replace(/^http:\/\//i, "https://");
  return cleanText(value);
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
    "level", "issueType", "message", "field", "id", "sourceProductId", "managementCode", "name",
    "category", "productType", "size", "material", "finish", "color", "origin", "stockQty",
    "stockText", "currentValue", "expectedValue", "sourceUrl", "image"
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

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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
