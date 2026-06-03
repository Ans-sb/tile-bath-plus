import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = process.cwd();
const productsPath = path.join(root, "data", "products.json");
const normalizedPath = path.join(root, "data", "products.normalized.json");
const outputDir = path.join(root, "outputs", "exports");
const outputPath = path.join(outputDir, `missing-finish-products-by-brand-${timestampForFile(new Date())}.xlsx`);

const products = JSON.parse(await fs.readFile(productsPath, "utf8"));
const normalizedRows = JSON.parse(await fs.readFile(normalizedPath, "utf8"));
const normalizedById = new Map(normalizedRows.map((item) => [item.productId, item]));
const missingFinishProducts = products
  .filter((product) => product.productType === "tile")
  .filter((product) => !String(product.finish || product.surface || "").trim())
  .sort((a, b) => brandCode(a).localeCompare(brandCode(b), "ko") || String(a.name || "").localeCompare(String(b.name || ""), "ko"));
const grouped = groupByBrand(missingFinishProducts);

const workbook = Workbook.create();
const summarySheet = workbook.worksheets.add("요약");
buildSummarySheet(summarySheet, grouped);

for (const [brand, rows] of grouped) {
  buildBrandSheet(workbook.worksheets.add(safeSheetName(brand)), brand, rows);
}

await verifyWorkbook(workbook, grouped);

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);

function buildSummarySheet(sheet, groupedRows) {
  sheet.showGridLines = false;
  const total = [...groupedRows.values()].reduce((sum, rows) => sum + rows.length, 0);
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [["마감 미확인 상품 리스트"]];
  sheet.getRange("A1").format = {
    fill: "#061A24",
    font: { bold: true, color: "#FFFFFF", size: 18 },
    horizontalAlignment: "center"
  };

  sheet.getRange("A3:B8").values = [
    ["생성일", new Date()],
    ["대상", "타일 상품 중 finish/surface 공란"],
    ["총 마감 미확인", total],
    ["브랜드 수", groupedRows.size],
    ["구성", "요약 + 브랜드별 개별 시트"],
    ["주의", "내부관리용 파일입니다. 고객 공개 금지"]
  ];
  sheet.getRange("A3:A8").format = { fill: "#E8F6F4", font: { bold: true, color: "#00695F" } };
  sheet.getRange("B3").format.numberFormat = "yyyy-mm-dd hh:mm";
  sheet.getRange("B3:B8").format = { wrapText: true };

  const brandTable = [["브랜드", "미확인 상품 수"], ...[...groupedRows.entries()].map(([brand, rows]) => [brand, rows.length])];
  sheet.getRangeByIndexes(2, 3, brandTable.length, 2).values = brandTable;
  sheet.getRange("D3:E3").format = { fill: "#00A98F", font: { bold: true, color: "#FFFFFF" } };

  const hintRows = [
    ["자동반영 제외 예", "M, FP, 앤틱, 단순 포세린 등 의미가 섞인 품명은 상세페이지 확인 필요"],
    ["우선 확인 권장", "상품명, 원본 카테고리, 메모/특징, 상세페이지 URL"]
  ];
  sheet.getRange("G3:H4").values = hintRows;
  sheet.getRange("G3:G4").format = { fill: "#FFF4D6", font: { bold: true, color: "#8A5A00" } };
  sheet.getRange("H3:H4").format = { wrapText: true };

  setColumnWidths(sheet, [150, 300, 28, 120, 120, 28, 150, 380]);
}

function buildBrandSheet(sheet, brand, brandProducts) {
  sheet.showGridLines = false;
  const headers = [
    "No",
    "브랜드",
    "상품ID",
    "관리코드",
    "상품명",
    "모델명",
    "규격",
    "원본 카테고리",
    "소재",
    "패턴",
    "색상",
    "원산지",
    "제품군/사용군",
    "공간",
    "재고수량",
    "재고텍스트",
    "PCS/BOX",
    "m²/BOX",
    "대표이미지URL",
    "상세페이지URL",
    "메모/특징",
    "정규화 마감",
    "검수 메모"
  ];
  const rows = brandProducts.map((product, index) => {
    const norm = normalizedById.get(product.id) || {};
    return [
      index + 1,
      brand,
      text(product.id),
      text(product.managementCode),
      text(product.name),
      text(product.modelName),
      text(product.size || norm.sizeLabel),
      text(product.sourceCategoryName || product.option),
      text(product.material || norm.materialCategory),
      text(product.patternCategory || norm.patternDetail),
      text(product.color || norm.mainColor),
      text(product.countryOfOrigin || norm.originRegion),
      join(norm.applicationCategories),
      join(norm.spaceCategories),
      numberOrBlank(product.stockQty),
      text(product.stockText),
      numberOrBlank(product.pcsPerBox),
      numberOrBlank(product.sqmPerBox),
      text(product.image),
      text(product.sourceUrl),
      text(product.features),
      text(norm.surfaceFinish || norm.finishGroup),
      ""
    ];
  });

  writeTable(sheet, headers, rows, `MissingFinish_${safeTableName(brand)}`);
  sheet.freezePanes.freezeRows(1);
  setColumnWidths(sheet, [
    55, 80, 150, 130, 280, 240, 110, 180, 120, 130, 120, 120,
    190, 170, 90, 210, 90, 90, 360, 360, 320, 120, 220
  ]);
}

function writeTable(sheet, headers, rows, tableName) {
  const matrix = [headers, ...rows];
  sheet.getRangeByIndexes(0, 0, matrix.length, headers.length).values = matrix;
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format = {
    fill: "#00A98F",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    horizontalAlignment: "center"
  };
  if (rows.length) {
    sheet.getRangeByIndexes(1, 0, rows.length, headers.length).format = {
      wrapText: true,
      verticalAlignment: "top"
    };
  }
  try {
    const range = `A1:${columnLetter(headers.length)}${matrix.length}`;
    const table = sheet.tables.add(range, true, tableName);
    table.style = "TableStyleMedium2";
  } catch {
    // Tables improve usability but are not required for this export.
  }
}

async function verifyWorkbook(workbook, groupedRows) {
  await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 2000 });
  await workbook.inspect({
    kind: "table",
    range: "요약!A1:H12",
    include: "values,formulas",
    tableMaxRows: 12,
    tableMaxCols: 8,
    maxChars: 3000
  });
  const firstBrand = [...groupedRows.keys()][0];
  if (firstBrand) {
    await workbook.inspect({
      kind: "table",
      range: `${safeSheetName(firstBrand)}!A1:H12`,
      include: "values,formulas",
      tableMaxRows: 12,
      tableMaxCols: 8,
      maxChars: 3000
    });
    await workbook.render({ sheetName: safeSheetName(firstBrand), range: "A1:H18", scale: 1, format: "png" });
  }
  await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "formula error scan"
  });
  await workbook.render({ sheetName: "요약", range: "A1:H12", scale: 1, format: "png" });
}

function groupByBrand(items) {
  const map = new Map();
  for (const item of items) {
    const brand = brandCode(item);
    if (!map.has(brand)) map.set(brand, []);
    map.get(brand).push(item);
  }
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko")));
}

function brandCode(product) {
  return String(product.catalogSource || product.kind || product.maker || product.majorCategory || "미확인").trim() || "미확인";
}

function join(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return text(value);
}

function text(value) {
  return value === null || value === undefined ? "" : String(value);
}

function numberOrBlank(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : "";
}

function setColumnWidths(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, 1, 1).format.columnWidthPx = width;
  });
}

function safeSheetName(value) {
  return String(value || "미확인").replace(/[\[\]:*?/\\]/g, "_").slice(0, 31) || "미확인";
}

function safeTableName(value) {
  return String(value || "UNKNOWN").replace(/[^A-Za-z0-9_]/g, "_").slice(0, 24) || "UNKNOWN";
}

function columnLetter(number) {
  let result = "";
  let current = number;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function timestampForFile(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
