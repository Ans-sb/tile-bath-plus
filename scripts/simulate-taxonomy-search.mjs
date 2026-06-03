import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const productsPath = path.join(root, "data", "products.normalized.json");
const reportDir = path.join(root, "outputs", "taxonomy-analysis");
const reportPath = path.join(reportDir, `search-simulation-${timestampForFile(new Date())}.md`);

const rows = JSON.parse(fs.readFileSync(productsPath, "utf8"));
const products = rows.filter((item) => item.productType === "tile");

const scenarios = [
  {
    name: "모자이크 기본",
    query: "모자이크타일",
    minCount: 700,
    maxCount: 1300,
    passRate: 1,
    expect: { mosaic: true },
    forbid: { accessory: true }
  },
  {
    name: "백색 유광 모자이크",
    query: "백색 유광 모자이크",
    minCount: 10,
    passRate: 0.75,
    expect: { mosaic: true, color: "화이트", finish: "유광" },
    forbid: { accessory: true }
  },
  {
    name: "육각 모자이크 재고",
    query: "육각 모자이크 재고",
    minCount: 5,
    passRate: 0.65,
    expect: { mosaic: true, stock: true, shape: /육각|헥사|hex|hx/i },
    forbid: { accessory: true }
  },
  {
    name: "욕실 바닥 베이지 600각 논슬립",
    query: "욕실 바닥 베이지 600각 논슬립 재고",
    minCount: 1,
    passRate: 0.55,
    expect: { space: "욕실", app: "바닥타일", color: "베이지", size: "600x600", antiSlip: true, stock: true }
  },
  {
    name: "중국 600x1200 마블 유광",
    query: "중국 600x1200 마블 유광 재고",
    minCount: 10,
    passRate: 0.7,
    expect: { origin: "중국", size: "600x1200", style: "마블룩", finish: "유광", stock: true }
  },
  {
    name: "트래버틴 600 1200 무광",
    query: "트래버틴 600 1200 무광",
    minCount: 1,
    passRate: 0.55,
    expect: { size: "600x1200", style: "트래버틴룩", finish: "무광" }
  },
  {
    name: "테라조 바닥 600각",
    query: "테라조 바닥 600각",
    minCount: 1,
    passRate: 0.55,
    expect: { size: "600x600", style: "테라조룩", app: "바닥타일" }
  },
  {
    name: "외부 20T 논슬립",
    query: "외부용 20T 논슬립",
    minCount: 1,
    passRate: 0.45,
    expect: { outdoor: true, antiSlip: true, functionText: /20T|20t|외부용/ }
  },
  {
    name: "수영장 블루 모자이크",
    query: "수영장 블루 모자이크",
    minCount: 1,
    passRate: 0.45,
    expect: { mosaic: true, color: "블루" }
  },
  {
    name: "카페 우드 무광",
    query: "카페 우드 무광",
    minCount: 1,
    passRate: 0.45,
    expect: { style: "우드룩", finish: "무광" }
  }
];

const results = scenarios.map(runScenario);

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, buildReport(results), "utf8");

const failed = results.filter((result) => !result.ok);
console.log(`search simulations: ${results.length}`);
console.log(`passed: ${results.length - failed.length}`);
console.log(`failed: ${failed.length}`);
console.log(`report: ${reportPath}`);
for (const result of results) {
  const marker = result.ok ? "PASS" : "CHECK";
  console.log(`${marker} ${result.name}: ${result.count} results, top20 pass ${Math.round(result.topPassRate * 100)}%`);
}

if (failed.length) {
  process.exitCode = 1;
}

function runScenario(scenario) {
  const intent = parseQuery(scenario.query);
  const matched = products
    .map((item) => {
      const score = scoreItem(item, intent);
      return score > 0 ? { item, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || Number(b.item.stockQty || 0) - Number(a.item.stockQty || 0));

  const top = matched.slice(0, 20);
  const topPass = top.filter(({ item }) => itemMatches(item, scenario.expect)).length;
  const topForbidden = top.filter(({ item }) => itemMatches(item, scenario.forbid || {})).length;
  const topPassRate = top.length ? topPass / top.length : 0;
  const countOk = matched.length >= (scenario.minCount || 0) && (!scenario.maxCount || matched.length <= scenario.maxCount);
  const rateOk = topPassRate >= (scenario.passRate || 0);
  const forbidOk = topForbidden === 0;
  return {
    ...scenario,
    intent,
    count: matched.length,
    countOk,
    topPass,
    topForbidden,
    topPassRate,
    ok: countOk && rateOk && forbidOk,
    top: top.slice(0, 8).map(({ item, score }) => summarizeItem(item, score))
  };
}

function parseQuery(query) {
  const raw = normalize(query);
  const compact = normalizeRaw(query);
  const sizes = detectSizes(query);
  return {
    raw,
    compact,
    sizes,
    stock: /재고|보유|빠른출고|출고가능/.test(compact) && !/재고없|품절/.test(compact),
    origins: detect(compact, [
      ["중국", ["중국", "중국산", "china"]],
      ["한국", ["한국", "국산", "국내산"]],
      ["이탈리아", ["이탈리아", "이태리", "italy"]],
      ["스페인", ["스페인", "spain"]],
      ["인도", ["인도", "india"]]
    ]),
    spaces: detect(compact, [
      ["욕실", ["욕실", "화장실", "샤워"]],
      ["주방", ["주방", "싱크", "백스플래시"]],
      ["현관", ["현관"]],
      ["외부공간", ["외부", "테라스", "옥상", "정원"]],
      ["상업공간", ["상업", "카페", "호텔", "매장", "식당"]]
    ]),
    apps: detect(compact, [
      ["바닥타일", ["바닥", "floor"]],
      ["벽타일", ["벽", "wall"]],
      ["외부용 타일", ["외부", "외장", "테라스"]],
      ["수영장 타일", ["수영장", "pool"]],
      ["모자이크 타일", ["모자이크", "모자익", "mosaic", "페니", "헥사", "육각", "팔각", "랜턴", "다이아"]]
    ]),
    colors: detect(compact, [
      ["화이트", ["화이트", "백색", "white"]],
      ["아이보리 / 크림", ["아이보리", "크림"]],
      ["베이지", ["베이지", "beige", "샌드"]],
      ["그레이", ["그레이", "회색", "gray", "grey"]],
      ["블랙", ["블랙", "검정", "black"]],
      ["블루", ["블루", "파랑", "blue"]],
      ["그린", ["그린", "초록", "green"]],
      ["테라코타 / 오렌지", ["테라코타", "오렌지"]]
    ]),
    styles: detect(compact, [
      ["마블룩", ["마블", "대리석", "카라라", "칼라카타"]],
      ["스톤룩", ["스톤", "석재", "라임스톤"]],
      ["트래버틴룩", ["트래버틴", "트라버틴", "travertine"]],
      ["콘크리트룩", ["콘크리트", "시멘트"]],
      ["테라조룩", ["테라조"]],
      ["우드룩", ["우드", "wood", "오크", "월넛"]],
      ["패턴 / 데코", ["패턴", "데코"]]
    ]),
    finishes: detect(compact, [
      ["유광", ["유광", "글로시", "gloss", "glossy"]],
      ["무광", ["무광", "매트", "맷", "matte", "matt"]],
      ["세미무광", ["반무광", "세미무광", "새틴"]],
      ["폴리싱", ["폴리싱", "polished"]],
      ["러프", ["러프", "rough"]]
    ]),
    functions: detect(compact, [
      ["논슬립", ["논슬립", "미끄럼방지", "r10", "r11", "r12"]],
      ["모자이크", ["모자이크", "모자익", "mosaic", "페니", "헥사", "육각", "팔각", "랜턴", "다이아"]],
      ["20T 외부용", ["20t", "20mm", "페데스탈"]]
    ])
  };
}

function scoreItem(item, intent) {
  if (!passesHardRules(item, intent)) return 0;

  let score = Number(item.stockQty || 0) > 0 ? 20 : 1;
  score += scoreList(intent.origins, [item.originRegion, item.countryOfOrigin], 16);
  score += scoreList(intent.spaces, item.spaceCategories, 12);
  score += scoreList(intent.apps, item.applicationCategories, 18);
  score += scoreList(intent.colors, [item.mainColor, item.subColor, ...(item.accentColors || [])], 20);
  score += scoreList(intent.styles, item.styleCategories, 18);
  score += scoreList(intent.finishes, [item.surfaceFinish], 20);
  score += scoreList(intent.functions, item.functionCategories, 18);
  if (intent.sizes.length && intent.sizes.includes(item.sizeLabel)) score += 38;
  if (/외부|테라스|옥상|정원/.test(intent.compact) && hasAny(item.applicationCategories, ["외부용 타일"])) score += 20;
  if (/욕실|화장실|샤워/.test(intent.compact) && hasAny(item.spaceCategories, ["욕실"])) score += 12;
  if (/논슬립|미끄럼/.test(intent.compact) && item.antiSlip) score += 24;
  if (/20t|20mm/.test(intent.compact) && hasAny(item.functionCategories, ["20T 외부용"])) score += 32;
  if (/수영장|pool/.test(intent.compact) && hasAny(item.applicationCategories, ["수영장 타일"])) score += 24;
  if (isMosaicIntent(intent)) score += 35;

  const text = normalize([
    item.customerSearchableText,
    item.skuName,
    item.modelName,
    item.sourceCategoryName
  ].filter(Boolean).join(" "));
  for (const token of tokenize(intent.raw)) {
    if (text.includes(token)) score += 5;
  }
  return score;
}

function passesHardRules(item, intent) {
  if (intent.stock && Number(item.stockQty || 0) <= 0) return false;
  if (intent.sizes.length && !intent.sizes.includes(item.sizeLabel)) return false;
  if (intent.origins.length && !hasAny([item.originRegion, item.countryOfOrigin], intent.origins)) return false;
  if (intent.colors.length && !hasAny([item.mainColor, item.subColor, ...(item.accentColors || [])], intent.colors)) return false;
  if (intent.finishes.length && !hasAny([item.surfaceFinish], intent.finishes)) return false;
  if (intent.styles.length && !hasAny(item.styleCategories, intent.styles)) return false;
  if (intent.apps.length && !hasAny(item.applicationCategories, intent.apps)) return false;
  if (intent.functions.length && !intent.functions.every((value) => functionMatches(item, value))) return false;
  if (shapeIntent(intent) && !shapeMatches(item, intent)) return false;
  if (isMosaicIntent(intent) && !isMosaicItem(item)) return false;
  return true;
}

function itemMatches(item, rule = {}) {
  const entries = Object.keys(rule || {});
  if (!entries.length) return false;
  if (rule.accessory) return isAccessory(item);
  if (rule.mosaic && !isMosaicItem(item)) return false;
  if (rule.stock && Number(item.stockQty || 0) <= 0) return false;
  if (rule.origin && item.originRegion !== rule.origin && item.countryOfOrigin !== rule.origin) return false;
  if (rule.space && !hasAny(item.spaceCategories, [rule.space])) return false;
  if (rule.app && !hasAny(item.applicationCategories, [rule.app])) return false;
  if (rule.color && item.mainColor !== rule.color && item.subColor !== rule.color && !(item.accentColors || []).includes(rule.color)) return false;
  if (rule.style && !hasAny(item.styleCategories, [rule.style])) return false;
  if (rule.finish && item.surfaceFinish !== rule.finish) return false;
  if (rule.size && item.sizeLabel !== rule.size) return false;
  if (rule.antiSlip && !item.antiSlip && !hasAny(item.functionCategories, ["논슬립"])) return false;
  if (rule.outdoor && !hasAny(item.applicationCategories, ["외부용 타일"]) && !hasAny(item.spaceCategories, ["외부공간"])) return false;
  if (rule.functionText) {
    const text = [item.customerSearchableText, ...(item.functionCategories || [])].join(" ");
    if (!rule.functionText.test(text)) return false;
  }
  if (rule.shape) {
    const text = [item.customerSearchableText, item.shape, item.skuName, item.sourceCategoryName].join(" ");
    if (!rule.shape.test(text)) return false;
  }
  return true;
}

function isMosaicIntent(intent) {
  return hasAny(intent.apps, ["모자이크 타일"])
    || hasAny(intent.functions, ["모자이크"])
    || /모자이크|모자익|mosaic|페니|헥사|헥사곤|육각|팔각|랜턴|다이아/.test(intent.compact);
}

function functionMatches(item, value) {
  if (value === "논슬립") return item.antiSlip || hasAny(item.functionCategories, ["논슬립"]);
  if (value === "20T 외부용") return hasAny(item.functionCategories, ["20T 외부용"]) || Number(item.thicknessMm || 0) >= 18;
  if (value === "모자이크") return isMosaicItem(item);
  return hasAny(item.functionCategories, [value]);
}

function shapeIntent(intent) {
  return /육각|헥사|헥사곤|hex|팔각|oct|랜턴|다이아|dia|원형|페니|penny|스틱|stick|조약돌|pebble/.test(intent.compact);
}

function shapeMatches(item, intent) {
  const text = normalizeRaw([item.customerSearchableText, item.shape, item.skuName, item.sourceCategoryName].join(" "));
  if (/육각|헥사|헥사곤|hex/.test(intent.compact)) return /육각|헥사|헥사곤|hex|hx/.test(text);
  if (/팔각|oct/.test(intent.compact)) return /팔각|oct/.test(text);
  if (/랜턴/.test(intent.compact)) return /랜턴|lantern/.test(text);
  if (/다이아|dia/.test(intent.compact)) return /다이아|dia/.test(text);
  if (/원형|페니|penny/.test(intent.compact)) return /원형|페니|penny|round|rd/.test(text);
  if (/스틱|stick/.test(intent.compact)) return /스틱|stick|롱|long/.test(text);
  if (/조약돌|pebble/.test(intent.compact)) return /조약돌|pebble/.test(text);
  return true;
}

function isMosaicItem(item) {
  if (isAccessory(item)) return false;
  const text = normalizeRaw([
    item.customerSearchableText,
    item.patternDetail,
    item.shape,
    item.skuName,
    item.modelName,
    item.sourceCategoryName,
    ...(item.applicationCategories || []),
    ...(item.functionCategories || [])
  ].filter(Boolean).join(" "));
  return hasAny(item.applicationCategories, ["모자이크 타일"])
    || hasAny(item.functionCategories, ["모자이크"])
    || /모자이크|모자익|mosaic|페니|헥사|헥사곤|육각|팔각|랜턴|다이아|조약돌|pebble|penny|hex/.test(text);
}

function isAccessory(item) {
  const text = normalizeRaw([
    item.customerSearchableText,
    item.skuName,
    item.sourceCategoryName,
    ...(item.applicationCategories || [])
  ].filter(Boolean).join(" "));
  return /부자재|접착|접착제|줄눈|메지|홈멘트|시멘트|실리콘|방수|아덱스|ardex|grout|adhesive|몰딩|스커팅|코너|엣지|클립|웨지|레벨링/.test(text);
}

function detect(compact, entries) {
  return unique(entries
    .filter(([, terms]) => terms.some((term) => compact.includes(normalizeRaw(term))))
    .map(([value]) => value));
}

function detectSizes(query) {
  const source = String(query || "").replace(/[×＊]/g, "x");
  const sizes = [];
  const explicit = source.match(/(\d{2,4})\s*[xX*]\s*(\d{2,4})/);
  if (explicit) sizes.push(`${Number(explicit[1])}x${Number(explicit[2])}`);
  const square = source.match(/(\d{2,4})\s*각/);
  if (square) sizes.push(`${Number(square[1])}x${Number(square[1])}`);
  const spaced = source.match(/(\d{3,4})\s+(\d{3,4})/);
  if (!sizes.length && spaced) sizes.push(`${Number(spaced[1])}x${Number(spaced[2])}`);
  return unique(sizes);
}

function scoreList(needles, values, score) {
  return hasAny(values, needles) ? score : 0;
}

function hasAny(values = [], needles = []) {
  const source = new Set((Array.isArray(values) ? values : [values]).filter(Boolean).map(normalize));
  return needles.some((needle) => source.has(normalize(needle)));
}

function tokenize(value) {
  return unique(String(value || "")
    .split(/[\s,./·]+/)
    .map(normalize)
    .filter((token) => token.length >= 2 && !["타일", "제품", "상품", "찾아줘", "검색"].includes(token)));
}

function summarizeItem(item, score) {
  return {
    score,
    id: item.productId,
    name: item.customerSkuName || item.skuName,
    size: item.sizeLabel,
    color: item.mainColor,
    finish: item.surfaceFinish,
    style: item.styleCategories,
    app: item.applicationCategories,
    function: item.functionCategories,
    stock: item.stockQty
  };
}

function buildReport(items) {
  const lines = [
    "# Taxonomy Search Simulation",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Dataset: ${products.length} tile SKU`,
    ""
  ];
  for (const item of items) {
    lines.push(`## ${item.ok ? "PASS" : "CHECK"} ${item.name}`);
    lines.push("");
    lines.push(`- Query: \`${item.query}\``);
    lines.push(`- Results: ${item.count}`);
    lines.push(`- Top 20 pass rate: ${Math.round(item.topPassRate * 100)}%`);
    if (item.topForbidden) lines.push(`- Forbidden in top 20: ${item.topForbidden}`);
    lines.push("");
    lines.push("| score | name | size | color | finish | stock | tags |");
    lines.push("| ---: | --- | --- | --- | --- | ---: | --- |");
    for (const top of item.top) {
      lines.push(`| ${top.score} | ${escapePipe(top.name)} | ${top.size || ""} | ${top.color || ""} | ${top.finish || ""} | ${top.stock || 0} | ${escapePipe([...(top.app || []), ...(top.style || []), ...(top.function || [])].join(", "))} |`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/중국산/g, "중국")
    .replace(/국산|국내산/g, "한국")
    .replace(/백색/g, "화이트")
    .replace(/화장실/g, "욕실")
    .replace(/트라버틴/g, "트래버틴")
    .replace(/대리석/g, "마블")
    .replace(/모자익/g, "모자이크")
    .replace(/모자이크타일/g, "모자이크 타일")
    .replace(/매트|맷/g, "무광")
    .replace(/글로시/g, "유광")
    .replace(/[×＊]/g, "x")
    .replace(/[\s\-_./]/g, "");
}

function normalizeRaw(value) {
  return normalize(value);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function escapePipe(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function timestampForFile(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}
