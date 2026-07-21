import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productsPath = path.join(root, "data", "products.json");
const normalizedPath = path.join(root, "data", "products.normalized.json");
const rulesPath = path.join(root, "data", "tile-brand-rules.json");
const outputDir = path.join(root, "outputs", "finish-rules");
const dryRun = process.argv.includes("--dry-run");
const stamp = timestampForFile(new Date());

const rules = JSON.parse(await fs.readFile(rulesPath, "utf8"));
const productsBefore = JSON.parse(await fs.readFile(productsPath, "utf8"));
const products = structuredClone(productsBefore);

const beforeSummary = summarizeProducts(productsBefore);
const updates = [];

for (const product of products) {
  if (!isTile(product)) continue;
  const result = inferFinishFromRules(product, rules);
  if (!result) continue;
  const beforeFinish = clean(product.finish);
  const beforeSurface = clean(product.surface);
  const shouldApply = result.apply === "always" || isUnknownFinish(beforeFinish || beforeSurface);
  if (!shouldApply) continue;
  if (beforeFinish === result.finish && beforeSurface === result.finish) continue;

  product.finish = result.finish;
  product.surface = result.finish;
  product.features = replaceFeatureFinish(product.features, result.finish);
  product.finishRuleVersion = rules.version;
  product.finishRuleId = result.ruleId;
  product.finishRuleReason = result.reason;
  product.finishRuleAppliedAt = new Date().toISOString();
  product.lastSyncedAt = new Date().toISOString();

  updates.push({
    id: product.id,
    managementCode: product.managementCode,
    brand: getBrandCode(product),
    name: product.name || product.modelName || "",
    size: product.size || "",
    category: product.sourceCategoryName || product.option || "",
    beforeFinish,
    beforeSurface,
    finish: result.finish,
    ruleId: result.ruleId,
    reason: result.reason
  });
}

await fs.mkdir(outputDir, { recursive: true });
const backupPath = path.join(outputDir, `products-before-finish-rules-${stamp}.json`);
const reportPath = path.join(outputDir, `tile-finish-rules-report-${stamp}.json`);

if (!dryRun) {
  await writeJson(backupPath, productsBefore);
  await writeJson(productsPath, products);
  execFileSync(process.execPath, [path.join(root, "scripts", "build-public-products-db.mjs")], {
    cwd: root,
    stdio: "pipe"
  });
  execFileSync(process.execPath, [path.join(root, "scripts", "build-normalized-taxonomy.mjs")], {
    cwd: root,
    stdio: "pipe"
  });
}

const normalized = await readJsonIfExists(normalizedPath, []);
const afterSummary = dryRun ? summarizeProducts(products) : summarizeProducts(JSON.parse(await fs.readFile(productsPath, "utf8")));
const normalizedSummary = summarizeNormalized(normalized);
const report = {
  ok: true,
  dryRun,
  ruleVersion: rules.version,
  generatedAt: new Date().toISOString(),
  beforeSummary,
  afterSummary,
  normalizedSummary,
  updated: updates.length,
  byBrand: countBy(updates, (item) => item.brand),
  byFinish: countBy(updates, (item) => item.finish),
  byRule: countBy(updates, (item) => item.ruleId),
  backupPath: dryRun ? "" : backupPath,
  updates
};

await writeJson(reportPath, report);

console.log(JSON.stringify({
  ok: true,
  dryRun,
  updated: updates.length,
  beforeMissingFinish: beforeSummary.tileMissingFinish,
  afterMissingFinish: afterSummary.tileMissingFinish,
  normalizedMissingFinish: normalizedSummary.tileMissingFinish,
  byBrand: report.byBrand,
  byFinish: report.byFinish,
  byRule: report.byRule,
  backupPath: dryRun ? "" : backupPath,
  reportPath
}, null, 2));

function inferFinishFromRules(product, config) {
  const brandCode = getBrandCode(product);
  const brandConfig = config.brands?.[brandCode] || null;
  const candidates = [
    ...(Array.isArray(config.globalRules) ? config.globalRules.map((rule) => ({ ...rule, source: "global" })) : []),
    ...(Array.isArray(brandConfig?.rules) ? brandConfig.rules.map((rule) => ({ ...rule, source: brandCode })) : [])
  ].sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));

  for (const rule of candidates) {
    if (!rule.finish || !rule.match) continue;
    if (!matchesRule(product, rule.match)) continue;
    return {
      finish: rule.finish,
      apply: rule.apply || "always",
      ruleId: rule.id || `${rule.source}-rule`,
      reason: rule.reason || rule.id || ""
    };
  }

  if (brandConfig?.defaultFinish) {
    return {
      finish: brandConfig.defaultFinish,
      apply: brandConfig.defaultApply || "ifMissing",
      ruleId: `${brandCode.toLowerCase()}-default-finish`,
      reason: brandConfig.defaultReason || `${brandCode} default finish`
    };
  }
  return null;
}

function matchesRule(product, match) {
  if (Array.isArray(match.all)) {
    return match.all.every((condition) => matchesCondition(product, condition));
  }
  return matchesCondition(product, match);
}

function matchesCondition(product, condition) {
  if (condition.anyTextRegex && !testRegex(condition.anyTextRegex, getFieldText(product, "all"))) return false;
  if (condition.nameRegex && !testRegex(condition.nameRegex, getFieldText(product, "name"))) return false;
  if (condition.categoryRegex && !testRegex(condition.categoryRegex, getFieldText(product, "category"))) return false;
  if (condition.sizeRegex && !testRegex(condition.sizeRegex, getFieldText(product, "size"))) return false;
  if (condition.regex && condition.field && !testRegex(condition.regex, getFieldText(product, condition.field))) return false;
  if (condition.notAnyTextRegex && testRegex(condition.notAnyTextRegex, getFieldText(product, "all"))) return false;
  return true;
}

function testRegex(pattern, value) {
  try {
    return new RegExp(pattern, "i").test(String(value || ""));
  } catch (error) {
    throw new Error(`Invalid tile finish rule regex "${pattern}": ${error.message}`);
  }
}

function getFieldText(product, field) {
  if (field === "name") {
    return cleanName([product.name, product.modelName].filter(Boolean).join(" "));
  }
  if (field === "category") {
    return [
      product.sourceCategoryName,
      product.sourceCategoryPath,
      product.option,
      product.kind,
      product.majorCategory
    ].filter(Boolean).join(" ");
  }
  if (field === "size") {
    return normalizeSize(product.size || product.sizeLabel || product.name || "");
  }
  return [
    product.name,
    product.modelName,
    product.sourceCategoryName,
    product.sourceCategoryPath,
    product.option,
    product.kind,
    product.majorCategory,
    product.material,
    product.patternCategory,
    product.finish,
    product.surface,
    product.color,
    product.features,
    product.size,
    product.unit
  ].filter(Boolean).join(" ");
}

function normalizeSize(value) {
  const text = String(value || "")
    .replace(/[×xX＊]/g, "*")
    .replace(/\s+/g, "")
    .trim();
  const pair = text.match(/(\d{2,4})\*(\d{2,4})/);
  if (pair) return `${pair[1]}*${pair[2]}`;
  return text;
}

function cleanName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*\(\s*[※*]+\s*\)\s*$/g, "")
    .replace(/\s*[※*]+\s*$/g, "")
    .trim();
}

function replaceFeatureFinish(features, finish) {
  const text = clean(features);
  const parts = text
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^(유광|무광|논슬립|폴리싱|유약폴리싱|마감 미확인|마감미확인)$/i.test(part));
  if (finish) parts.push(finish);
  return unique(parts).join(" / ");
}

function summarizeProducts(rows) {
  const tiles = rows.filter(isTile);
  return {
    total: rows.length,
    tiles: tiles.length,
    tileMissingFinish: tiles.filter((item) => isUnknownFinish(item.finish || item.surface)).length,
    byBrand: countBy(tiles, (item) => getBrandCode(item)),
    missingByBrand: countBy(tiles.filter((item) => isUnknownFinish(item.finish || item.surface)), (item) => getBrandCode(item)),
    byFinish: countBy(tiles, (item) => clean(item.finish || item.surface) || "마감 미확인")
  };
}

function summarizeNormalized(rows) {
  const tiles = rows.filter(isTile);
  return {
    total: rows.length,
    tiles: tiles.length,
    tileMissingFinish: tiles.filter((item) => isUnknownFinish(item.finishGroup || item.finishDetail || item.surfaceFinish)).length,
    missingByBrand: countBy(tiles.filter((item) => isUnknownFinish(item.finishGroup || item.finishDetail || item.surfaceFinish)), (item) => clean(item.internalBrandCode || item.brand || item.majorCategory) || "UNKNOWN"),
    byFinishGroup: countBy(tiles, (item) => clean(item.finishGroup || item.surfaceFinish) || "마감 미확인")
  };
}

function isTile(item) {
  return (item?.productType || item?.product_type || item?.rawProductType) === "tile";
}

function isUnknownFinish(value) {
  const text = clean(value);
  return !text || /미확인|unknown|undefined|null|없음/i.test(text);
}

function getBrandCode(product) {
  return clean(product.majorCategory || product.kind || product.catalogSource || product.maker || product.internalBrandCode || product.brand || "UNKNOWN").toUpperCase();
}

function countBy(rows, getValue) {
  const counts = new Map();
  for (const row of rows) {
    const key = clean(getValue(row)) || "(없음)";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")));
}

function unique(values) {
  return [...new Set((values || []).map(clean).filter(Boolean))];
}

function clean(value) {
  return String(value ?? "").trim();
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function timestampForFile(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
