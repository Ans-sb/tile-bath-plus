import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const filesToAudit = [
  { file: "app.js", softLineLimit: 9000, hardLineLimit: 14000 },
  { file: "server.js", softLineLimit: 2500, hardLineLimit: 4500 },
  { file: "styles.css", softLineLimit: 3500, hardLineLimit: 6000 },
  { file: "index.html", softLineLimit: 2500, hardLineLimit: 4500 }
];

const requiredFiles = [
  "AGENTS.md",
  "docs/platform-stability-refactor-plan.md",
  "scripts/supabase-products-schema.sql",
  "scripts/supabase-customer-schema.sql"
];

const customerForbiddenTerms = [
  "internal_brand_id",
  "internal_brand_code",
  "internal_brand_name",
  "supplier_name",
  "margin_grade",
  "quality_grade"
];

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function countLines(text) {
  return text.split(/\r?\n/).length;
}

function auditRequiredFiles(results) {
  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(ROOT, file));
    results.push({
      status: exists ? "ok" : "fail",
      area: "required-file",
      message: exists ? `${file} exists` : `${file} is missing`
    });
  }
}

function auditFileSizes(results) {
  for (const item of filesToAudit) {
    const text = readText(item.file);
    const lines = countLines(text);
    const status = lines > item.hardLineLimit ? "warn" : lines > item.softLineLimit ? "notice" : "ok";
    results.push({
      status,
      area: "file-size",
      message: `${item.file}: ${lines.toLocaleString("ko-KR")} lines`
    });
  }
}

function auditCustomerBrandPolicy(results) {
  const app = readText("app.js");
  const index = readText("index.html");
  const publicMapping = app.match(/function\s+mapPublicProductForClient[\s\S]*?\n}\n/);

  if (!publicMapping) {
    results.push({
      status: "warn",
      area: "customer-brand-policy",
      message: "mapPublicProductForClient function was not found"
    });
    return;
  }

  const publicMappingSource = publicMapping[0];
  for (const term of customerForbiddenTerms) {
    results.push({
      status: publicMappingSource.includes(term) ? "fail" : "ok",
      area: "customer-brand-policy",
      message: publicMappingSource.includes(term)
        ? `customer mapping contains forbidden field: ${term}`
        : `customer mapping excludes ${term}`
    });
  }

  const customerHtmlLeak = customerForbiddenTerms.filter((term) => index.includes(term));
  results.push({
    status: customerHtmlLeak.length ? "warn" : "ok",
    area: "customer-brand-policy",
    message: customerHtmlLeak.length
      ? `index.html contains internal field names: ${customerHtmlLeak.join(", ")}`
      : "index.html does not contain internal brand field names"
  });
}

function auditCriticalFlows(results) {
  const app = readText("app.js");
  const server = readText("server.js");
  const checks = [
    ["app.js", "applyAuthenticatedUser", app.includes("function applyAuthenticatedUser")],
    ["app.js", "renderAuthControls", app.includes("function renderAuthControls")],
    ["app.js", "renderMyPage", app.includes("function renderMyPage")],
    ["app.js", "handleTileFinderSearch", app.includes("function handleTileFinderSearch")],
    ["server.js", "saveSignupRequestRecord", server.includes("async function saveSignupRequestRecord")],
    ["server.js", "createUserSessionFromSignupRecord", server.includes("function createUserSessionFromSignupRecord")],
    ["server.js", "verifyMemberProductAccess", server.includes("async function verifyMemberProductAccess")]
  ];

  for (const [file, name, ok] of checks) {
    results.push({
      status: ok ? "ok" : "fail",
      area: "critical-flow",
      message: `${file}: ${name} ${ok ? "found" : "missing"}`
    });
  }
}

function printResults(results) {
  const order = { fail: 0, warn: 1, notice: 2, ok: 3 };
  const sorted = [...results].sort((a, b) => order[a.status] - order[b.status] || a.area.localeCompare(b.area));
  for (const result of sorted) {
    const label = result.status.toUpperCase().padEnd(6, " ");
    console.log(`${label} ${result.area} - ${result.message}`);
  }
  const summary = results.reduce((accumulator, result) => {
    accumulator[result.status] = (accumulator[result.status] || 0) + 1;
    return accumulator;
  }, {});
  console.log("");
  console.log(`Summary: ${summary.fail || 0} fail, ${summary.warn || 0} warn, ${summary.notice || 0} notice, ${summary.ok || 0} ok`);
}

const results = [];
auditRequiredFiles(results);
auditFileSizes(results);
auditCustomerBrandPolicy(results);
auditCriticalFlows(results);
printResults(results);

const failed = results.some((result) => result.status === "fail");
process.exit(failed ? 1 : 0);
