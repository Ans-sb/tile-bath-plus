import fs from "node:fs";
import path from "node:path";

import {
  SEARCH_ENGINE_VERSION,
  searchTiles,
  summarizeResult
} from "./tile-search-engine.mjs";

const root = process.cwd();
const productsPath = path.join(root, "data", "products.normalized.json");

if (!fs.existsSync(productsPath)) {
  console.error("data/products.normalized.json 파일이 없습니다. 먼저 npm run taxonomy:normalize 를 실행하세요.");
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

const scenarios = [
  {
    name: "모자이크 기본",
    query: "모자이크타일",
    minCount: 500,
    expect: { mosaic: true }
  },
  {
    name: "백색 유광 모자이크",
    query: "백색 유광 모자이크",
    minCount: 5,
    expect: { mosaic: true, color: "화이트", finish: "유광" }
  },
  {
    name: "베이지 600각 재고",
    query: "베이지 600각 재고",
    minCount: 1,
    expect: { size: "600x600", color: "베이지", stock: true }
  },
  {
    name: "중국 600x1200 마블 유광",
    query: "중국 600x1200 마블 유광 재고",
    minCount: 1,
    expect: { origin: "중국", size: "600x1200", style: "마블룩", finish: "유광", stock: true }
  },
  {
    name: "트래버틴 600 1200 무광",
    query: "트래버틴 600 1200 무광",
    minCount: 1,
    expect: { size: "600x1200", style: "트래버틴룩", finish: "무광" }
  },
  {
    name: "테라조 바닥 600각",
    query: "테라조 바닥 600각",
    minCount: 1,
    expect: { size: "600x600", style: "테라조룩" }
  },
  {
    name: "외부 20T",
    query: "외부용 20T",
    minCount: 1,
    expect: { thickness: 20 }
  },
  {
    name: "카페 우드 무광",
    query: "카페 우드 무광",
    minCount: 1,
    expect: { style: "우드룩", finish: "무광" }
  },
  {
    name: "고객 검색 브랜드 차단",
    query: "AJ 유광 100x300",
    audience: "customer",
    minCount: 1,
    expectNoBrandInIntent: true,
    expect: { size: "100x300", finish: "유광" }
  },
  {
    name: "관리자 브랜드 검색",
    query: "AJ 유광 100x300",
    audience: "admin",
    minCount: 1,
    expectBrandInIntent: true,
    expect: { size: "100x300", finish: "유광", brand: "AJ" }
  }
];

const results = scenarios.map(runScenario);
const failed = results.filter((result) => !result.ok);

console.log(`engine: ${SEARCH_ENGINE_VERSION}`);
console.log(`products: ${products.length}`);
console.log(`scenarios: ${results.length}`);
console.log(`passed: ${results.length - failed.length}`);
console.log(`failed: ${failed.length}`);

for (const result of results) {
  const marker = result.ok ? "PASS" : "CHECK";
  const top = result.top.slice(0, 3).map((item) => `${item.name} / ${item.size} / ${item.finish}`).join(" | ");
  console.log(`${marker} ${result.name}: ${result.total} results, top10 pass ${Math.round(result.topPassRate * 100)}%`);
  if (top) console.log(`  top: ${top}`);
  if (result.reasons.length) console.log(`  reason: ${result.reasons.join("; ")}`);
}

if (failed.length) process.exitCode = 1;

function runScenario(scenario) {
  const result = searchTiles(products, scenario.query, {
    audience: scenario.audience || "customer",
    limit: 80
  });
  const topRaw = result.results.slice(0, 10).map((entry) => entry.item);
  const top = result.results.slice(0, 10).map((entry) => summarizeResult(entry));
  const matches = topRaw.filter((item) => itemMatches(item, scenario.expect));
  const topPassRate = topRaw.length ? matches.length / topRaw.length : 0;
  const reasons = [];

  if (result.total < scenario.minCount) {
    reasons.push(`결과 수 부족: ${result.total} < ${scenario.minCount}`);
  }
  if (topRaw.length && topPassRate < 0.6) {
    reasons.push(`상위 10개 일치율 부족: ${Math.round(topPassRate * 100)}%`);
  }
  if (scenario.expectNoBrandInIntent && hasBrandIntent(result.intent)) {
    reasons.push("고객 검색 intent에 브랜드 조건이 포함됨");
  }
  if (scenario.expectBrandInIntent && !hasBrandIntent(result.intent)) {
    reasons.push("관리자 검색 intent에 브랜드 조건이 없음");
  }

  return {
    ...scenario,
    ok: reasons.length === 0,
    total: result.total,
    intent: result.intent,
    top,
    topPassRate,
    reasons
  };
}

function itemMatches(item, expect = {}) {
  if (!expect) return true;
  if (expect.mosaic && !hasMosaicSignal(item)) return false;
  if (expect.color && !hasValue(item, expect.color, ["mainColor", "subColor", "accentColors", "customerSearchableText"])) return false;
  if (expect.finish && !hasValue(item, expect.finish, ["surfaceFinish", "finishGroup", "finishDetail", "finishPath", "customerSearchableText"])) return false;
  if (expect.size && normalizeSize(item.sizeLabel) !== normalizeSize(expect.size)) return false;
  if (expect.style && !hasValue(item, expect.style, ["stylePrimary", "styleCategories", "patternDetail", "customerSearchableText"])) return false;
  if (expect.origin && !hasValue(item, expect.origin, ["originRegion", "originCountry", "countryOfOrigin", "customerSearchableText"])) return false;
  if (expect.antiSlip && !(item.antiSlip || hasValue(item, "논슬립", ["surfaceFinish", "finishGroup", "finishDetail", "functionCategories", "customerSearchableText"]))) return false;
  if (expect.stock && Number(item.stockQty || 0) <= 0) return false;
  if (expect.thickness && Math.round(Number(item.thicknessMm || 0)) !== expect.thickness) return false;
  if (expect.brand && !hasValue(item, expect.brand, ["internalBrandCode", "internalBrandName", "brand", "adminSearchableText"])) return false;
  return true;
}

function hasBrandIntent(intent) {
  return Boolean(intent?.internalBrands?.length || intent?.internalBrandCodes?.length || intent?.internalBrandNames?.length);
}

function hasMosaicSignal(item) {
  return hasValue(item, "모자이크", [
    "applicationCategories",
    "functionCategories",
    "styleCategories",
    "patternDetail",
    "sourceCategoryName",
    "customerSearchableText"
  ]);
}

function hasValue(item, expected, keys) {
  const needle = normalizeText(expected);
  return keys.some((key) => normalizeText(readValue(item, key)).includes(needle));
}

function readValue(item, key) {
  const value = item?.[key];
  if (Array.isArray(value)) return value.join(" ");
  return value || "";
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function normalizeSize(value) {
  return String(value || "").toLowerCase().replace(/[×*]/g, "x").replace(/\s+/g, "");
}
