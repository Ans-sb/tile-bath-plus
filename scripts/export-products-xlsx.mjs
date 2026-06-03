import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = process.cwd();
const productsPath = path.join(root, "data", "products.json");
const normalizedPath = path.join(root, "data", "products.normalized.json");
const outputDir = path.join(root, "outputs", "exports");
const outputPath = path.join(outputDir, `tile-db-full-export-${timestampForFile(new Date())}.xlsx`);

const products = JSON.parse(await fs.readFile(productsPath, "utf8"));
const normalizedRows = JSON.parse(await fs.readFile(normalizedPath, "utf8"));
const normalizedById = new Map(normalizedRows.map((item) => [item.productId, item]));

const workbook = Workbook.create();
const summarySheet = workbook.worksheets.add("요약");
const productSheet = workbook.worksheets.add("전체상품DB");
const reviewSheet = workbook.worksheets.add("정규화_검수필요");
const policySheet = workbook.worksheets.add("브랜드정책");

buildSummarySheet(summarySheet);
buildProductSheet(productSheet);
buildReviewSheet(reviewSheet);
buildPolicySheet(policySheet);

await verifyWorkbook(workbook);

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);

function buildSummarySheet(sheet) {
  sheet.showGridLines = false;
  const tileProducts = products.filter((item) => item.productType === "tile");
  const reviewItems = normalizedRows.filter((item) => item.needsReview);
  const stockItems = products.filter((item) => Number(item.stockQty || 0) > 0);
  const brands = countBy(tileProducts, (item) => item.kind || item.catalogSource || item.maker || "미확인");

  sheet.getRange("A1:F1").merge();
  sheet.getRange("A1").values = [["자재GO 전체 상품 DB 내보내기"]];
  sheet.getRange("A1").format = {
    fill: "#061A24",
    font: { bold: true, color: "#FFFFFF", size: 18 },
    horizontalAlignment: "center"
  };

  sheet.getRange("A3:B10").values = [
    ["생성일", new Date()],
    ["전체 상품", products.length],
    ["타일 상품", tileProducts.length],
    ["비타일 상품", products.length - tileProducts.length],
    ["재고 보유 상품", stockItems.length],
    ["정규화 검수 필요", reviewItems.length],
    ["대표 이미지 URL 보유", products.filter((item) => item.image).length],
    ["내보내기 방식", "이미지 URL + IMAGE() 미리보기 수식"]
  ];
  sheet.getRange("A3:A10").format = { fill: "#E8F6F4", font: { bold: true, color: "#00695F" } };
  sheet.getRange("B3:B10").format = { wrapText: true };
  sheet.getRange("B3").format.numberFormat = "yyyy-mm-dd hh:mm";

  const brandRows = [["브랜드", "상품 수"], ...brands.slice(0, 12).map((item) => [item.label, item.count])];
  sheet.getRangeByIndexes(2, 3, brandRows.length, 2).values = brandRows;
  sheet.getRange("D3:E3").format = { fill: "#00A98F", font: { bold: true, color: "#FFFFFF" } };

  setColumnWidths(sheet, [150, 260, 28, 120, 100, 28]);
}

function buildProductSheet(sheet) {
  sheet.showGridLines = false;
  const headers = [
    "No",
    "상품ID",
    "관리코드",
    "상품유형",
    "내부브랜드코드",
    "내부브랜드명",
    "대분류",
    "공급처/제조사",
    "상품명",
    "모델명",
    "고객용 상품명",
    "원산지",
    "제품군/사용군",
    "공간",
    "대표색상",
    "보조색상",
    "디자인/패턴",
    "패턴상세",
    "마감",
    "표면질감",
    "논슬립",
    "규격",
    "가로(mm)",
    "세로(mm)",
    "두께(mm)",
    "규격그룹",
    "소재",
    "소재상세",
    "PCS/BOX",
    "m²/BOX",
    "단위",
    "재고수량",
    "재고텍스트",
    "재고상태",
    "원가",
    "소매가",
    "도매가",
    "A등급금액",
    "B등급금액",
    "C등급금액",
    "금액대",
    "이미지미리보기",
    "대표이미지URL",
    "원본URL",
    "검수필요",
    "검수사유",
    "고객검색문서",
    "관리자검색문서"
  ];
  const rows = products.map((product, index) => {
    const norm = normalizedById.get(product.id) || {};
    return [
      index + 1,
      text(product.id),
      text(product.managementCode),
      text(product.productType),
      text(norm.internalBrandCode || product.kind || product.catalogSource),
      text(norm.internalBrandName || product.maker),
      text(product.majorCategory || product.kind),
      text(product.maker || norm.supplierName),
      text(product.name),
      text(product.modelName),
      text(norm.customerSkuName || norm.customerCollectionName || product.name),
      text(norm.originRegion || product.countryOfOrigin),
      join(norm.applicationCategories),
      join(norm.spaceCategories),
      text(norm.mainColor),
      text(norm.subColor),
      join(norm.styleCategories),
      text(norm.patternDetail),
      text(norm.surfaceFinish),
      text(norm.surfaceTexture),
      norm.antiSlip ? "Y" : "N",
      text(norm.sizeLabel || product.size),
      numberOrBlank(norm.widthMm),
      numberOrBlank(norm.heightMm),
      numberOrBlank(norm.thicknessMm),
      text(norm.sizeGroup),
      text(norm.materialCategory || product.material),
      text(norm.materialDetail),
      numberOrBlank(product.pcsPerBox),
      numberOrBlank(product.sqmPerBox),
      text(product.unit),
      numberOrBlank(product.stockQty),
      text(product.stockText),
      text(norm.stockStatus),
      numberOrBlank(product.costPrice),
      numberOrBlank(product.retailPrice),
      numberOrBlank(product.wholesalePrice),
      numberOrBlank(product.gradeAPrice),
      numberOrBlank(product.gradeBPrice),
      numberOrBlank(product.gradeCPrice),
      text(norm.priceRange),
      "",
      text(product.image),
      text(product.sourceUrl),
      norm.needsReview ? "Y" : "N",
      join(norm.reviewReasons),
      text(norm.customerSearchableText),
      text(norm.adminSearchableText)
    ];
  });

  writeTable(sheet, headers, rows, "ProductsTable");
  const imagePreviewCol = headers.indexOf("이미지미리보기");
  const imageUrlCol = headers.indexOf("대표이미지URL");
  const formulaRows = rows.map((_, index) => [`=IFERROR(IMAGE(${columnLetter(imageUrlCol + 1)}${index + 2}),"")`]);
  sheet.getRangeByIndexes(1, imagePreviewCol, formulaRows.length, 1).formulas = formulaRows;
  sheet.freezePanes.freezeRows(1);
  setColumnWidths(sheet, productColumnWidths(headers));
  sheet.getRangeByIndexes(1, imagePreviewCol, rows.length, 1).format.rowHeightPx = 72;
  sheet.getRangeByIndexes(1, imagePreviewCol, rows.length, 1).format.columnWidthPx = 96;
  sheet.getRangeByIndexes(1, imageUrlCol, rows.length, 1).format.wrapText = false;
}

function buildReviewSheet(sheet) {
  sheet.showGridLines = false;
  const headers = ["No", "상품ID", "관리코드", "상품명", "브랜드", "검수사유", "규격", "색상", "마감", "소재", "이미지URL"];
  const rows = normalizedRows
    .filter((item) => item.needsReview)
    .map((norm, index) => {
      const product = products.find((item) => item.id === norm.productId) || {};
      return [
        index + 1,
        text(norm.productId),
        text(norm.managementCode),
        text(product.name || norm.skuName),
        text(norm.internalBrandCode),
        join(norm.reviewReasons),
        text(norm.sizeLabel),
        text(norm.mainColor),
        text(norm.surfaceFinish),
        text(norm.materialCategory),
        text(norm.image || product.image)
      ];
    });
  writeTable(sheet, headers, rows, "ReviewTable");
  sheet.freezePanes.freezeRows(1);
  setColumnWidths(sheet, [55, 150, 130, 260, 110, 260, 100, 120, 110, 120, 360]);
}

function buildPolicySheet(sheet) {
  sheet.showGridLines = false;
  sheet.getRange("A1:D1").merge();
  sheet.getRange("A1").values = [["내부 브랜드 정책"]];
  sheet.getRange("A1").format = {
    fill: "#061A24",
    font: { bold: true, color: "#FFFFFF", size: 16 },
    horizontalAlignment: "center"
  };
  const rows = [
    ["구분", "정책", "고객 노출", "관리자 노출"],
    ["브랜드", "내부 최상위 필터", "숨김", "표시"],
    ["고객 검색문서", "브랜드/공급처 제외", "사용", "참고"],
    ["관리자 검색문서", "브랜드/공급처 포함", "미사용", "사용"],
    ["원가/마진", "내부관리용", "숨김", "표시 가능"],
    ["엑셀 파일", "로컬 내부관리용", "공개 금지", "사용 가능"]
  ];
  sheet.getRange("A3:D8").values = rows;
  sheet.getRange("A3:D3").format = { fill: "#00A98F", font: { bold: true, color: "#FFFFFF" } };
  sheet.getRange("A4:D8").format = { wrapText: true };
  setColumnWidths(sheet, [140, 260, 140, 140]);
}

function writeTable(sheet, headers, rows, tableName) {
  const matrix = [headers, ...rows];
  sheet.getRangeByIndexes(0, 0, matrix.length, headers.length).values = matrix;
  const headerRange = sheet.getRangeByIndexes(0, 0, 1, headers.length);
  headerRange.format = {
    fill: "#00A98F",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    horizontalAlignment: "center"
  };
  const dataRange = sheet.getRangeByIndexes(1, 0, Math.max(rows.length, 1), headers.length);
  dataRange.format = { wrapText: true, verticalAlignment: "top" };
  try {
    const range = `A1:${columnLetter(headers.length)}${matrix.length}`;
    const table = sheet.tables.add(range, true, tableName);
    table.style = "TableStyleMedium2";
  } catch {
    // Tables are useful but not required for the export.
  }
}

async function verifyWorkbook(workbook) {
  await workbook.inspect({
    kind: "sheet",
    include: "id,name",
    maxChars: 2000
  });
  await workbook.inspect({
    kind: "table",
    range: "요약!A1:F12",
    include: "values,formulas",
    tableMaxRows: 12,
    tableMaxCols: 6,
    maxChars: 3000
  });
  await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "formula error scan"
  });
  await workbook.render({ sheetName: "요약", range: "A1:F12", scale: 1, format: "png" });
  await workbook.render({ sheetName: "전체상품DB", range: "A1:L20", scale: 1, format: "png" });
}

function productColumnWidths(headers) {
  return headers.map((header) => {
    if (["No"].includes(header)) return 55;
    if (["상품ID", "관리코드", "내부브랜드코드", "상품유형", "대분류", "규격", "재고상태", "금액대"].includes(header)) return 120;
    if (["상품명", "모델명", "고객용 상품명", "검수사유"].includes(header)) return 260;
    if (["대표이미지URL", "원본URL", "고객검색문서", "관리자검색문서"].includes(header)) return 360;
    if (["이미지미리보기"].includes(header)) return 96;
    if (["제품군/사용군", "공간", "디자인/패턴"].includes(header)) return 180;
    return 105;
  });
}

function setColumnWidths(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, 1, 1).format.columnWidthPx = width;
  });
}

function countBy(items, getValue) {
  const map = new Map();
  for (const item of items) {
    const label = getValue(item) || "미확인";
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
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
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}
