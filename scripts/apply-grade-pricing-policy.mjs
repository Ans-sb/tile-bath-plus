import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { buildGradePricingPlan } = require("../src/server/services/grade-pricing-policy");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productsPath = path.join(rootDir, "data", "products.json");
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const backupPath = path.join(
  rootDir,
  "data",
  `products.backup-before-grade-pricing-${timestamp}.json`
);

const products = JSON.parse(await fs.readFile(productsPath, "utf8"));
const plan = buildGradePricingPlan(products);

await fs.copyFile(productsPath, backupPath);

if (plan.changedProducts.length > 0) {
  const temporaryPath = `${productsPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(plan.products, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, productsPath);
}

console.log(JSON.stringify({
  policy: plan.summary.policy,
  selectedCount: plan.summary.selectedCount,
  eligibleCount: plan.summary.eligibleCount,
  changedCount: plan.summary.changedCount,
  unchangedCount: plan.summary.unchangedCount,
  missingCostCount: plan.summary.missingCostCount,
  backupPath
}, null, 2));
