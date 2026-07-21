import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const cli = parseCliArgs(process.argv.slice(2));
const productsPath = path.join(root, "data", "products.json");
const auditPath = cli.audit
  ? path.resolve(root, String(cli.audit))
  : await findLatestAudit(path.join(root, "outputs", "vg-audit"));
const stamp = timestamp();

if (!auditPath) throw new Error("VG 정확도 감사 파일을 찾지 못했습니다.");

const products = JSON.parse(await fs.readFile(productsPath, "utf8"));
const audit = JSON.parse(await fs.readFile(auditPath, "utf8"));
const productById = new Map(products.map((item) => [String(item.id || ""), item]).filter(([id]) => id));
const corrections = [];

for (const row of audit.criticalRows || []) {
  const product = productById.get(String(row.id || ""));
  if (!product) continue;
  if (row.issueType === "rule_mismatch:color" && row.expectedValue) {
    product.color = String(row.expectedValue).trim();
    corrections.push({ id: row.id, name: row.name, field: "color", value: product.color });
  }
  if (row.issueType === "rule_mismatch:material" && row.expectedValue) {
    product.material = String(row.expectedValue).trim();
    corrections.push({ id: row.id, name: row.name, field: "material", value: product.material });
  }
  if (row.issueType === "rule_mismatch:finish" && row.expectedValue) {
    product.finish = String(row.expectedValue).trim();
    product.surface = product.finish;
    corrections.push({ id: row.id, name: row.name, field: "finish", value: product.finish });
    corrections.push({ id: row.id, name: row.name, field: "surface", value: product.surface });
  }
  if (corrections.at(-1)?.id === row.id) {
    product.vgAccuracyCorrectedAt = new Date().toISOString();
    product.lastSyncedAt = new Date().toISOString();
  }
}

const backupPath = path.join(root, "data", `products.backup-before-vg-accuracy-corrections-${stamp}.json`);
const reportPath = path.join(root, "outputs", "vg-audit", `vg-accuracy-corrections-${stamp}.json`);
await fs.copyFile(productsPath, backupPath);
await writeJsonAtomic(productsPath, products);
await fs.writeFile(reportPath, `${JSON.stringify({
  ok: true,
  auditPath,
  backupPath,
  reportPath,
  correctedCount: corrections.length,
  correctedByField: countBy(corrections, (item) => item.field),
  corrections
}, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  auditPath,
  backupPath,
  reportPath,
  correctedCount: corrections.length,
  correctedByField: countBy(corrections, (item) => item.field)
}, null, 2));

async function findLatestAudit(dir) {
  const entries = await fs.readdir(dir).catch(() => []);
  const candidates = entries
    .filter((name) => /^vg-accuracy-audit-\d{8}-\d{6}\.json$/.test(name))
    .sort();
  return candidates.length ? path.join(dir, candidates[candidates.length - 1]) : "";
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, filePath);
}

function countBy(items, getValue) {
  const map = new Map();
  for (const item of items) {
    const value = getValue(item) || "미확인";
    map.set(value, (map.get(value) || 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")));
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
