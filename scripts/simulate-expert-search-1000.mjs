import fs from "node:fs";
import path from "node:path";

import {
  SEARCH_ENGINE_VERSION,
  searchTiles,
  summarizeResult
} from "./tile-search-engine.mjs";

const root = process.cwd();
const productsPath = path.join(root, "data", "products.normalized.json");
const outputDir = path.join(root, "outputs", "search-simulation");
const runAt = new Date();
const runStamp = timestampForFile(runAt);
const CASE_COUNT = Math.max(1, Number(process.env.SEARCH_SIM_CASES || 1000));
const CASE_OFFSET = Math.max(0, Number(process.env.SEARCH_SIM_OFFSET || 0));
const RUN_ID = sanitizeRunId(process.env.SEARCH_SIM_RUN_ID || "");
const batchOutputDir = RUN_ID ? path.join(outputDir, "batches", RUN_ID) : outputDir;
const caseStart = CASE_OFFSET + 1;
const caseEnd = CASE_OFFSET + CASE_COUNT;
const outputPrefix = RUN_ID
  ? `expert-search-batch-${String(caseStart).padStart(4, "0")}-${String(caseEnd).padStart(4, "0")}-${runStamp}`
  : `expert-search-1000-${runStamp}`;
const outputJsonPath = path.join(batchOutputDir, `${outputPrefix}.json`);
const outputMdPath = path.join(batchOutputDir, `${outputPrefix}.md`);
const TOP_CHECK_COUNT = 10;
const STOCK_THRESHOLD = Math.max(0, Number(process.env.STOCK_INQUIRY_THRESHOLD_QTY || 100) || 100);

if (!fs.existsSync(productsPath)) {
  console.error("data/products.normalized.json 파일이 없습니다. 먼저 npm run taxonomy:normalize 를 실행하세요.");
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
const tileProducts = products.filter((item) => item?.productType === "tile");
const sourceProducts = tileProducts.filter((item) => (
  item.sizeLabel
  && item.mainColor
  && item.finishGroup
  && Array.isArray(item.styleCategories)
  && item.styleCategories.length
));

if (!sourceProducts.length) {
  console.error("시뮬레이션에 사용할 정규화 타일 상품이 없습니다.");
  process.exit(1);
}

let seed = 20260701 + CASE_OFFSET;
const rows = Array.from({ length: CASE_COUNT }, (_, index) => runCase(CASE_OFFSET + index + 1));
const summary = buildSummary(rows);

fs.mkdirSync(batchOutputDir, { recursive: true });
fs.writeFileSync(outputJsonPath, `${JSON.stringify({ summary, rows }, null, 2)}\n`, "utf8");
fs.writeFileSync(outputMdPath, buildMarkdownReport(summary, rows), "utf8");

console.log(`engine: ${SEARCH_ENGINE_VERSION}`);
if (RUN_ID) console.log(`runId: ${RUN_ID}`);
console.log(`products: ${products.length}`);
console.log(`tileProducts: ${tileProducts.length}`);
console.log(`cases: ${rows.length}`);
console.log(`caseRange: ${caseStart}-${caseEnd}`);
console.log(`passed: ${summary.passed}`);
console.log(`failed: ${summary.failed}`);
console.log(`passRate: ${summary.passRate}%`);
console.log(`json: ${outputJsonPath}`);
console.log(`report: ${outputMdPath}`);

function runCase(caseNo) {
  const product = pickSourceProduct(caseNo);
  const scenario = buildScenario(caseNo, product);
  const result = searchTiles(tileProducts, scenario.query, {
    audience: "customer",
    limit: 80
  });
  const topEntries = result.results.slice(0, TOP_CHECK_COUNT);
  const topItems = topEntries.map((entry) => entry.item);
  const topSummaries = topEntries.map(summarizeResult);
  const matchedTop = topItems.filter((item) => itemMatchesScenario(item, scenario));
  const top10MatchRate = topItems.length ? Math.round((matchedTop.length / topItems.length) * 1000) / 10 : 0;
  const top1 = topSummaries[0] || null;
  const top1Item = topItems[0] || null;
  const reasons = [];

  if (!result.total) reasons.push("결과 없음");
  if (result.total && top10MatchRate < scenario.minTop10MatchRate) {
    reasons.push(`상위 ${TOP_CHECK_COUNT}개 일치율 부족 ${top10MatchRate}% < ${scenario.minTop10MatchRate}%`);
  }
  if (top1Item && !itemMatchesScenario(top1Item, scenario)) {
    reasons.push("1순위 상품 조건 불일치");
  }

  return {
    caseNo,
    template: scenario.template,
    query: scenario.query,
    expected: scenario.expected,
    requiredFields: scenario.requiredFields,
    resultTotal: result.total,
    top10MatchRate,
    pass: reasons.length === 0,
    reasons,
    intent: compactIntent(result.intent),
    top1: top1 ? {
      id: top1.id,
      name: top1.name,
      score: Math.round(Number(top1.score || 0) * 10) / 10,
      size: top1.size,
      finish: top1.finish,
      color: top1.color,
      style: top1.style,
      origin: top1.origin,
      stockQty: top1.stockQty,
      reasons: top1.reasons
    } : null,
    top5: topSummaries.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.name,
      score: Math.round(Number(item.score || 0) * 10) / 10,
      size: item.size,
      finish: item.finish,
      color: item.color,
      style: item.style,
      stockQty: item.stockQty
    }))
  };
}

function pickSourceProduct(caseNo) {
  const index = Math.abs((caseNo * 7919 + randomInt(sourceProducts.length)) % sourceProducts.length);
  return sourceProducts[index];
}

function buildScenario(caseNo, product) {
  const color = product.mainColor || "";
  const finish = product.finishGroup || product.surfaceFinish || "";
  const size = product.sizeLabel || "";
  const style = firstUseful(product.styleCategories, "스타일 미확인");
  const application = firstUseful(product.applicationCategories, "");
  const space = firstUseful(product.spaceCategories, "");
  const material = product.materialCategory || "";
  const origin = product.originRegion || "";
  const stocked = Number(product.stockQty || 0) > STOCK_THRESHOLD;
  const templateIndex = caseNo % 12;

  const scenarioBase = {
    minTop10MatchRate: 60,
    expected: {},
    requiredFields: []
  };

  if (templateIndex === 0) {
    return makeScenario(scenarioBase, "공간+용도+색상+규격+마감+재고", [
      term(space), term(application), term(color), sizeTerm(size), term(finish), "재고"
    ], { space, application, color, size, finish, stockRequired: true });
  }
  if (templateIndex === 1) {
    return makeScenario(scenarioBase, "색상+스타일+규격+마감", [
      term(color), term(style), sizeTerm(size), term(finish)
    ], { color, style, size, finish });
  }
  if (templateIndex === 2) {
    return makeScenario(scenarioBase, "공간+스타일+색상", [
      term(space), term(style), term(color), "타일"
    ], { space, style, color }, 50);
  }
  if (templateIndex === 3) {
    return makeScenario(scenarioBase, "용도+마감+소재+규격", [
      term(application), term(finish), term(material), sizeTerm(size)
    ], { application, finish, material, size });
  }
  if (templateIndex === 4) {
    return makeScenario(scenarioBase, "스타일 느낌+색상+마감", [
      term(style), "느낌", term(color), term(finish), "타일"
    ], { style, color, finish }, 50);
  }
  if (templateIndex === 5) {
    return makeScenario(scenarioBase, "규격+색상+스타일+재고", [
      sizeTerm(size), term(color), term(style), stocked ? "재고" : "주문시 재고 문의"
    ], { size, color, style, stockRequired: stocked });
  }
  if (templateIndex === 6) {
    return makeScenario(scenarioBase, "공간+용도+마감+스타일", [
      term(space), term(application), term(finish), term(style)
    ], { space, application, finish, style }, 50);
  }
  if (templateIndex === 7) {
    return makeScenario(scenarioBase, "색상+소재+마감", [
      term(color), term(material), term(finish)
    ], { color, material, finish }, 50);
  }
  if (templateIndex === 8) {
    return makeScenario(scenarioBase, "원산지+규격+스타일", [
      term(origin), sizeTerm(size), term(style), "타일"
    ], { origin, size, style }, 50);
  }
  if (templateIndex === 9) {
    return makeScenario(scenarioBase, "현장 말투", [
      term(space), "에 쓸", term(color), term(style), "찾아줘"
    ], { space, color, style }, 50);
  }
  if (templateIndex === 10) {
    return makeScenario(scenarioBase, "전문가 말투", [
      term(application), "가능한", term(material), term(finish), "추천"
    ], { application, material, finish }, 50);
  }
  return makeScenario(scenarioBase, "짧은 검색어", [
    term(color), sizeTerm(size), term(finish)
  ], { color, size, finish });
}

function makeScenario(base, template, parts, expected, minTop10MatchRate = base.minTop10MatchRate) {
  const cleanExpected = Object.fromEntries(
    Object.entries(expected).filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== false && !/미확인/.test(String(value)))
  );
  return {
    ...base,
    template,
    query: parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    expected: cleanExpected,
    requiredFields: Object.keys(cleanExpected),
    minTop10MatchRate
  };
}

function itemMatchesScenario(item, scenario) {
  const expected = scenario.expected || {};
  if (expected.stockRequired && Number(item.stockQty || item.product?.stockQty || 0) <= STOCK_THRESHOLD) return false;
  if (expected.size && normalizeSize(item.sizeLabel) !== normalizeSize(expected.size)) return false;
  if (expected.color && !hasValue(item, expected.color, ["mainColor", "subColor", "accentColors", "customerSearchableText"])) return false;
  if (expected.finish && !hasValue(item, expected.finish, ["finishGroup", "finishDetail", "finishPath", "surfaceFinish", "customerSearchableText"])) return false;
  if (expected.style && !hasStyleValue(item, expected.style)) return false;
  if (expected.application && !hasValue(item, expected.application, ["applicationCategories", "customerSearchableText"])) return false;
  if (expected.space && !hasValue(item, expected.space, ["spaceCategories", "customerSearchableText"])) return false;
  if (expected.material && !hasValue(item, expected.material, ["materialCategory", "materialDetail", "customerSearchableText"])) return false;
  if (expected.origin && !hasValue(item, expected.origin, ["originRegion", "originCountry", "countryOfOrigin", "customerSearchableText"])) return false;
  return true;
}

function hasStyleValue(item, expected) {
  const expectedValues = styleSynonyms(expected);
  return expectedValues.some((value) => hasValue(item, value, ["stylePrimary", "styleCategories", "patternDetail", "customerSearchableText"]));
}

function styleSynonyms(value) {
  const text = normalizeText(value);
  const map = [
    ["마블", ["마블", "마블룩", "대리석"]],
    ["스톤", ["스톤", "스톤룩", "석재"]],
    ["트래버틴", ["트래버틴", "트래버틴룩", "트라버틴"]],
    ["콘크리트", ["콘크리트", "콘크리트룩", "시멘트"]],
    ["시멘트", ["시멘트", "콘크리트", "콘크리트룩"]],
    ["테라조", ["테라조", "테라조룩"]],
    ["우드", ["우드", "우드룩", "나뭇결"]],
    ["솔리드", ["솔리드", "컬러 / 솔리드", "무지"]],
    ["패턴", ["패턴", "패턴 / 데코", "데코"]],
    ["브릭", ["브릭", "브릭 / 서브웨이", "서브웨이"]],
    ["입체", ["입체", "입체 / 텍스처", "텍스처"]],
    ["핸드메이드", ["핸드메이드"]]
  ];
  for (const [needle, values] of map) {
    if (text.includes(normalizeText(needle))) return values;
  }
  return [value];
}

function hasValue(item, expected, keys) {
  const needles = splitExpected(expected).map(normalizeText).filter(Boolean);
  if (!needles.length) return true;
  const haystack = normalizeText(keys.map((key) => readValue(item, key)).join(" "));
  return needles.some((needle) => haystack.includes(needle));
}

function splitExpected(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  if (text.includes("/")) return text.split("/").map((item) => item.trim());
  if (text.includes("·")) return text.split("·").map((item) => item.trim());
  return [text];
}

function readValue(item, key) {
  const value = item?.[key];
  if (Array.isArray(value)) return value.join(" ");
  return value || "";
}

function firstUseful(values, fallback) {
  const list = Array.isArray(values) ? values : [values];
  return list.find((value) => String(value || "").trim() && !/미확인/.test(String(value))) || fallback || "";
}

function term(value) {
  const text = String(value || "").trim();
  if (!text || /미확인/.test(text)) return "";
  const aliases = {
    "아이보리 / 크림": ["아이보리", "크림"],
    "차콜 / 다크그레이": ["차콜", "다크그레이"],
    "테라코타 / 오렌지": ["테라코타", "오렌지"],
    "벽·바닥 겸용 타일": ["벽바닥 겸용", "겸용"],
    "슬랩 / 대형타일": ["대형타일", "빅슬랩"],
    "마블룩": ["마블", "대리석"],
    "스톤룩": ["스톤", "석재"],
    "트래버틴룩": ["트래버틴", "트라버틴"],
    "콘크리트룩": ["콘크리트", "시멘트"],
    "테라조룩": ["테라조"],
    "우드룩": ["우드"],
    "컬러 / 솔리드": ["솔리드", "무지"],
    "패턴 / 데코": ["패턴", "데코"],
    "브릭 / 서브웨이": ["브릭", "서브웨이"],
    "입체 / 텍스처": ["입체", "텍스처"]
  };
  const choices = aliases[text] || [text];
  return choices[randomInt(choices.length)];
}

function sizeTerm(value) {
  const text = String(value || "").trim();
  if (!text || /미확인/.test(text)) return "";
  if (/^(\d+)x\1$/i.test(text) && randomInt(3) === 0) return `${text.split("x")[0]}각`;
  return text.replace(/x/g, randomInt(2) ? "x" : "*");
}

function compactIntent(intent) {
  const keys = [
    "origins", "spaces", "applications", "colors", "styles", "finishes",
    "materials", "specialTypes", "sizes", "stockRequired", "stockEmpty", "freeTokens"
  ];
  return Object.fromEntries(keys.map((key) => [key, intent?.[key]]).filter(([, value]) => {
    if (Array.isArray(value)) return value.length;
    return Boolean(value);
  }));
}

function buildSummary(items) {
  const passed = items.filter((item) => item.pass).length;
  const failed = items.length - passed;
  const totals = items.map((item) => item.resultTotal).sort((a, b) => a - b);
  const byTemplate = new Map();
  const failReasons = new Map();
  for (const item of items) {
    const stat = byTemplate.get(item.template) || { total: 0, passed: 0, failed: 0, avgTop10MatchRate: 0 };
    stat.total += 1;
    if (item.pass) stat.passed += 1;
    else stat.failed += 1;
    stat.avgTop10MatchRate += item.top10MatchRate;
    byTemplate.set(item.template, stat);
    for (const reason of item.reasons) failReasons.set(reason, (failReasons.get(reason) || 0) + 1);
  }
  const templateSummary = [...byTemplate.entries()].map(([template, stat]) => ({
    template,
    total: stat.total,
    passed: stat.passed,
    failed: stat.failed,
    passRate: percentage(stat.passed, stat.total),
    avgTop10MatchRate: Math.round((stat.avgTop10MatchRate / stat.total) * 10) / 10
  }));
  return {
    runAt: runAt.toISOString(),
    engineVersion: SEARCH_ENGINE_VERSION,
    products: products.length,
    tileProducts: tileProducts.length,
    runId: RUN_ID || null,
    caseOffset: CASE_OFFSET,
    caseStart,
    caseEnd,
    cases: items.length,
    passed,
    failed,
    passRate: percentage(passed, items.length),
    zeroResults: items.filter((item) => item.resultTotal === 0).length,
    avgResultTotal: Math.round((items.reduce((sum, item) => sum + item.resultTotal, 0) / items.length) * 10) / 10,
    p50ResultTotal: percentile(totals, 0.5),
    p90ResultTotal: percentile(totals, 0.9),
    avgTop10MatchRate: Math.round((items.reduce((sum, item) => sum + item.top10MatchRate, 0) / items.length) * 10) / 10,
    templateSummary,
    topFailureReasons: [...failReasons.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([reason, count]) => ({ reason, count }))
  };
}

function buildMarkdownReport(summary, items) {
  const failed = items.filter((item) => !item.pass).slice(0, 80);
  return [
    "# Expert Search 1000 Simulation",
    "",
    `- 실행시각: ${summary.runAt}`,
    `- 검색엔진: ${summary.engineVersion}`,
    ...(summary.runId ? [`- 실행 ID: ${summary.runId}`] : []),
    `- 케이스 범위: ${summary.caseStart}~${summary.caseEnd}`,
    `- 전체 정규화 상품: ${summary.products}`,
    `- 타일 상품: ${summary.tileProducts}`,
    `- 테스트 케이스: ${summary.cases}`,
    `- 통과: ${summary.passed}`,
    `- 실패/점검: ${summary.failed}`,
    `- 통과율: ${summary.passRate}%`,
    `- 결과 없음: ${summary.zeroResults}`,
    `- 평균 결과 수: ${summary.avgResultTotal}`,
    `- 결과 수 P50/P90: ${summary.p50ResultTotal} / ${summary.p90ResultTotal}`,
    `- 평균 상위 10개 일치율: ${summary.avgTop10MatchRate}%`,
    "",
    "## 템플릿별 결과",
    "",
    "| 템플릿 | 테스트 | 통과 | 점검 | 통과율 | 평균 Top10 일치율 |",
    "|---|---:|---:|---:|---:|---:|",
    ...summary.templateSummary.map((row) => `| ${row.template} | ${row.total} | ${row.passed} | ${row.failed} | ${row.passRate}% | ${row.avgTop10MatchRate}% |`),
    "",
    "## 주요 실패 사유",
    "",
    ...(summary.topFailureReasons.length
      ? summary.topFailureReasons.map((item) => `- ${item.reason}: ${item.count}건`)
      : ["- 없음"]),
    "",
    "## 점검 필요 샘플",
    "",
    "| No | 템플릿 | 검색어 | 결과 | Top10 | 사유 | 1순위 상품 |",
    "|---:|---|---|---:|---:|---|---|",
    ...failed.map((row) => `| ${row.caseNo} | ${escapeMd(row.template)} | ${escapeMd(row.query)} | ${row.resultTotal} | ${row.top10MatchRate}% | ${escapeMd(row.reasons.join("; "))} | ${escapeMd(row.top1?.name || "-")} |`)
  ].join("\n");
}

function percentile(sortedValues, rate) {
  if (!sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((sortedValues.length - 1) * rate)));
  return sortedValues[index];
}

function percentage(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[×＊*]/g, "x").replace(/\s+/g, "");
}

function normalizeSize(value) {
  return normalizeText(value).replace(/(\d+)각$/, "$1x$1");
}

function randomInt(max) {
  if (max <= 0) return 0;
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed % max;
}

function timestampForFile(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

function sanitizeRunId(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeMd(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}
