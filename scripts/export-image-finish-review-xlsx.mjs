import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = process.cwd();
const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("Usage: node scripts/export-image-finish-review-xlsx.mjs <image-finish-candidates.json>");
}

const outputDir = path.join(root, "outputs", "exports");
const outputPath = path.join(outputDir, `image-finish-review-by-brand-${timestampForFile(new Date())}.xlsx`);
const payload = JSON.parse(await fs.readFile(path.resolve(inputPath), "utf8"));
const rows = Array.isArray(payload.results) ? payload.results : [];
const grouped = groupByBrand(rows);

const workbook = Workbook.create();
buildSummarySheet(workbook.worksheets.add("요약"), payload, grouped);
for (const [brand, brandRows] of grouped) {
  buildBrandSheet(workbook.worksheets.add(safeSheetName(brand)), brand, brandRows);
}

await verifyWorkbook(workbook, grouped);

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);

function buildSummarySheet(sheet, summary, groupedRows) {
  sheet.showGridLines = false;
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [["이미지 기반 마감 추천 검수표"]];
  sheet.getRange("A1").format = {
    fill: "#061A24",
    font: { bold: true, color: "#FFFFFF", size: 18 },
    horizontalAlignment: "center"
  };

  const predictionRows = Object.entries(summary.byPrediction || {}).map(([label, count]) => [label, count]);
  const brandRows = [...groupedRows.entries()].map(([brand, items]) => [brand, items.length]);
  sheet.getRange("A3:B10").values = [
    ["생성일", new Date()],
    ["분석 대상", "마감 미확인 타일 상품"],
    ["전체 대상", summary.targetCount || rows.length],
    ["이미지 분석 성공", summary.withImageAnalysis || 0],
    ["브랜드 수", groupedRows.size],
    ["방식", "이미지의 반사 하이라이트를 기준으로 유광/무광 후보 산정"],
    ["주의", "자동 확정값이 아니라 검수용 추천값입니다."],
    ["DB 반영", "검수값 입력 후 별도 반영"]
  ];
  sheet.getRange("A3:A10").format = { fill: "#E8F6F4", font: { bold: true, color: "#00695F" } };
  sheet.getRange("B3").format.numberFormat = "yyyy-mm-dd hh:mm";
  sheet.getRange("B3:B10").format = { wrapText: true };

  const predictionTable = [["추천값", "수"], ...predictionRows];
  sheet.getRangeByIndexes(2, 3, predictionTable.length, 2).values = predictionTable;
  sheet.getRange("D3:E3").format = { fill: "#00A98F", font: { bold: true, color: "#FFFFFF" } };

  const brandTable = [["브랜드", "수"], ...brandRows];
  sheet.getRangeByIndexes(2, 6, brandTable.length, 2).values = brandTable;
  sheet.getRange("G3:H3").format = { fill: "#00A98F", font: { bold: true, color: "#FFFFFF" } };
  setColumnWidths(sheet, [150, 360, 28, 140, 80, 28, 100, 90]);
}

function buildBrandSheet(sheet, brand, brandRows) {
  sheet.showGridLines = false;
  const headers = [
    "No",
    "이미지",
    "추천마감",
    "신뢰도",
    "근거",
    "브랜드",
    "상품ID",
    "상품명",
    "모델명",
    "규격",
    "원본 카테고리",
    "메모/특징",
    "이미지URL",
    "상세페이지URL",
    "검수값",
    "검수메모",
    "상태",
    "highlightRatio",
    "highlightDelta",
    "p95Luma",
    "p99Luma"
  ];
  const tableRows = brandRows.map((item, index) => [
    index + 1,
    item.thumbPath ? "이미지" : "이미지 없음",
    item.prediction || "판단보류",
    numberOrBlank(item.confidence),
    text(item.reason),
    brand,
    text(item.id),
    text(item.productName),
    text(item.modelName),
    text(item.size),
    text(item.sourceCategoryName),
    text(item.features),
    text(item.imageUrl),
    text(item.sourceUrl),
    "",
    "",
    text(item.status),
    numberOrBlank(item.metrics?.highlightRatio),
    numberOrBlank(item.metrics?.highlightDelta),
    numberOrBlank(item.metrics?.p95Luma),
    numberOrBlank(item.metrics?.p99Luma)
  ]);
  writeTable(sheet, headers, tableRows, `ImageFinish_${safeTableName(brand)}`);
  sheet.freezePanes.freezeRows(1);
  setColumnWidths(sheet, [55, 106, 110, 80, 360, 80, 150, 280, 230, 110, 180, 320, 360, 360, 110, 240, 120, 95, 95, 80, 80]);
  if (brandRows.length) {
    sheet.getRangeByIndexes(1, 1, brandRows.length, 1).format.rowHeightPx = 98;
    sheet.getRangeByIndexes(1, 2, brandRows.length, 3).format.wrapText = true;
  }

  brandRows.forEach((item, index) => {
    const dataUrl = readThumbDataUrl(item.thumbPath);
    if (!dataUrl) return;
    sheet.images.add({
      dataUrl,
      anchor: {
        from: { row: index + 1, col: 1, rowOffsetPx: 3, colOffsetPx: 6 },
        extent: { widthPx: 92, heightPx: 92 }
      }
    });
  });
}

function writeTable(sheet, headers, tableRows, tableName) {
  const matrix = [headers, ...tableRows];
  sheet.getRangeByIndexes(0, 0, matrix.length, headers.length).values = matrix;
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format = {
    fill: "#00A98F",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    horizontalAlignment: "center"
  };
  if (tableRows.length) {
    sheet.getRangeByIndexes(1, 0, tableRows.length, headers.length).format = {
      wrapText: true,
      verticalAlignment: "top"
    };
  }
  try {
    const range = `A1:${columnLetter(headers.length)}${matrix.length}`;
    const table = sheet.tables.add(range, true, tableName);
    table.style = "TableStyleMedium2";
  } catch {
    // Tables improve filtering, but the workbook remains usable without them.
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
      range: `${safeSheetName(firstBrand)}!A1:J12`,
      include: "values,formulas",
      tableMaxRows: 12,
      tableMaxCols: 10,
      maxChars: 3000
    });
    await workbook.render({ sheetName: safeSheetName(firstBrand), range: "A1:J16", scale: 1, format: "png" });
  }
  await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "formula error scan"
  });
  await workbook.render({ sheetName: "요약", range: "A1:H14", scale: 1, format: "png" });
}

function readThumbDataUrl(filePath) {
  if (!filePath) return "";
  try {
    const bytes = readFileSync(filePath);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return "";
  }
}

function groupByBrand(items) {
  const map = new Map();
  for (const item of items) {
    const brand = String(item.brand || "미확인").trim() || "미확인";
    if (!map.has(brand)) map.set(brand, []);
    map.get(brand).push(item);
  }
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko")));
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
