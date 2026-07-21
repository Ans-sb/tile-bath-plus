import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const runId = sanitizeRunId(process.argv[2] || process.env.SEARCH_SIM_RUN_ID || "");

if (!runId) {
  console.error("사용법: node scripts/aggregate-search-simulation-batches.mjs <run-id>");
  process.exit(1);
}

const runDir = path.join(root, "outputs", "search-simulation", "batches", runId);
if (!fs.existsSync(runDir)) {
  console.error(`배치 폴더가 없습니다: ${runDir}`);
  process.exit(1);
}

const latestByRange = new Map();
for (const name of fs.readdirSync(runDir).filter((file) => /^expert-search-batch-.*\.json$/.test(file))) {
  const filePath = path.join(runDir, name);
  const stat = fs.statSync(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const key = `${data.summary?.caseStart || 0}-${data.summary?.caseEnd || 0}`;
  const previous = latestByRange.get(key);
  if (!previous || stat.mtimeMs > previous.mtimeMs) {
    latestByRange.set(key, { filePath, mtimeMs: stat.mtimeMs, data });
  }
}

const batches = [...latestByRange.values()]
  .map((entry) => entry.data)
  .sort((a, b) => Number(a.summary?.caseStart || 0) - Number(b.summary?.caseStart || 0));

if (!batches.length) {
  console.error(`집계할 배치 JSON이 없습니다: ${runDir}`);
  process.exit(1);
}

const rows = batches.flatMap((batch) => batch.rows || [])
  .sort((a, b) => Number(a.caseNo || 0) - Number(b.caseNo || 0));
const summary = buildSummary(rows, batches);
const stamp = timestampForFile(new Date());
const outputJsonPath = path.join(runDir, `expert-search-cumulative-${runId}-${stamp}.json`);
const outputMdPath = path.join(runDir, `expert-search-cumulative-${runId}-${stamp}.md`);

fs.writeFileSync(outputJsonPath, `${JSON.stringify({ summary, rows }, null, 2)}\n`, "utf8");
fs.writeFileSync(outputMdPath, buildMarkdownReport(summary, rows), "utf8");

console.log(`runId: ${runId}`);
console.log(`batches: ${summary.batches}`);
console.log(`cases: ${summary.cases}`);
console.log(`passed: ${summary.passed}`);
console.log(`failed: ${summary.failed}`);
console.log(`passRate: ${summary.passRate}%`);
console.log(`json: ${outputJsonPath}`);
console.log(`report: ${outputMdPath}`);

function buildSummary(items, batchItems) {
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
    stat.avgTop10MatchRate += Number(item.top10MatchRate || 0);
    byTemplate.set(item.template, stat);
    for (const reason of item.reasons || []) failReasons.set(reason, (failReasons.get(reason) || 0) + 1);
  }
  return {
    runId,
    generatedAt: new Date().toISOString(),
    batches: batchItems.length,
    batchRanges: batchItems.map((batch) => ({
      caseStart: batch.summary?.caseStart,
      caseEnd: batch.summary?.caseEnd,
      cases: batch.summary?.cases,
      passed: batch.summary?.passed,
      failed: batch.summary?.failed,
      passRate: batch.summary?.passRate
    })),
    cases: items.length,
    passed,
    failed,
    passRate: percentage(passed, items.length),
    zeroResults: items.filter((item) => item.resultTotal === 0).length,
    avgResultTotal: Math.round((items.reduce((sum, item) => sum + Number(item.resultTotal || 0), 0) / items.length) * 10) / 10,
    p50ResultTotal: percentile(totals, 0.5),
    p90ResultTotal: percentile(totals, 0.9),
    avgTop10MatchRate: Math.round((items.reduce((sum, item) => sum + Number(item.top10MatchRate || 0), 0) / items.length) * 10) / 10,
    templateSummary: [...byTemplate.entries()].map(([template, stat]) => ({
      template,
      total: stat.total,
      passed: stat.passed,
      failed: stat.failed,
      passRate: percentage(stat.passed, stat.total),
      avgTop10MatchRate: Math.round((stat.avgTop10MatchRate / stat.total) * 10) / 10
    })),
    topFailureReasons: [...failReasons.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([reason, count]) => ({ reason, count }))
  };
}

function buildMarkdownReport(summary, items) {
  const failed = items.filter((item) => !item.pass).slice(0, 80);
  return [
    "# Expert Search Cumulative Batch Simulation",
    "",
    `- 실행 ID: ${summary.runId}`,
    `- 생성시각: ${summary.generatedAt}`,
    `- 배치 수: ${summary.batches}`,
    `- 테스트 케이스: ${summary.cases}`,
    `- 통과: ${summary.passed}`,
    `- 실패/점검: ${summary.failed}`,
    `- 통과율: ${summary.passRate}%`,
    `- 결과 없음: ${summary.zeroResults}`,
    `- 평균 결과 수: ${summary.avgResultTotal}`,
    `- 결과 수 P50/P90: ${summary.p50ResultTotal} / ${summary.p90ResultTotal}`,
    `- 평균 상위 10개 일치율: ${summary.avgTop10MatchRate}%`,
    "",
    "## 배치별 결과",
    "",
    "| 범위 | 테스트 | 통과 | 점검 | 통과율 |",
    "|---|---:|---:|---:|---:|",
    ...summary.batchRanges.map((row) => `| ${row.caseStart}~${row.caseEnd} | ${row.cases} | ${row.passed} | ${row.failed} | ${row.passRate}% |`),
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
    ...failed.map((row) => `| ${row.caseNo} | ${escapeMd(row.template)} | ${escapeMd(row.query)} | ${row.resultTotal} | ${row.top10MatchRate}% | ${escapeMd((row.reasons || []).join("; "))} | ${escapeMd(row.top1?.name || "-")} |`)
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
