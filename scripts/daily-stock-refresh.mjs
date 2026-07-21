import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const root = process.cwd();
const cli = parseCliArgs(process.argv.slice(2));
const publicStockExcludeThresholdQty = Math.max(0, Number(
  cli.publicStockExcludeThreshold
  || cli["public-stock-exclude-threshold"]
  || cli.stockExcludeThreshold
  || cli["stock-exclude-threshold"]
  || cli.minPublicStock
  || cli["min-public-stock"]
  || cli.minStock
  || cli["min-stock"]
  || process.env.PUBLIC_STOCK_EXCLUDE_THRESHOLD_QTY
  || process.env.STOCK_EXCLUDE_THRESHOLD_QTY
  || process.env.MIN_PUBLIC_STOCK_QTY
  || 50
) || 50);
const publicExposeAllStockProducts = /^(1|true|yes)$/i.test(String(
  cli.publicExposeAllStockProducts
  || cli["public-expose-all-stock-products"]
  || process.env.PUBLIC_EXPOSE_ALL_STOCK_PRODUCTS
  || "true"
));
const stockInquiryThresholdQty = Math.max(0, Number(
  cli.stockInquiryThreshold
  || cli["stock-inquiry-threshold"]
  || process.env.STOCK_INQUIRY_THRESHOLD_QTY
  || 100
) || 100);
const selectedBrands = String(cli.brands || "")
  .split(",")
  .map((brand) => brand.trim().toUpperCase())
  .filter(Boolean);
const syncSupabase = String(cli.syncSupabase || cli["sync-supabase"] || process.env.SYNC_SUPABASE_AFTER_STOCK_REFRESH || "false") === "true";
const productsPath = path.join(root, "data", "products.json");
const outputDir = path.join(root, "outputs", "stock-refresh");
const stamp = timestamp();
const reportPath = path.join(outputDir, `daily-stock-refresh-${stamp}.json`);
const backupPath = path.join(outputDir, `products-before-daily-stock-refresh-${stamp}.json`);

const brandJobs = [
  {
    brand: "VG",
    script: "scripts/import-tile114-verygood.mjs",
    args: ["--env-prefix=VGTILE114", "--source-name=VG", "--id-prefix=verygood", "--management-prefix=VG", "--output-only=true"]
  },
  {
    brand: "AJ",
    script: "scripts/import-tile114-verygood.mjs",
    args: ["--env-prefix=AJTILE114", "--source-name=AJ", "--id-prefix=ajutile", "--management-prefix=AJ", "--output-only=true"]
  },
  {
    brand: "US",
    script: "scripts/import-tile114-verygood.mjs",
    args: ["--env-prefix=usong", "--source-name=US", "--id-prefix=usong", "--management-prefix=US", "--output-only=true"]
  },
  {
    brand: "SG",
    script: "scripts/import-sgcera.mjs",
    args: ["--source-name=SG", "--id-prefix=sgcera", "--management-prefix=SG", "--output-only=true"]
  },
  {
    brand: "HS",
    script: "scripts/import-hwashin.mjs",
    args: ["--source-name=HS", "--id-prefix=hwashin", "--management-prefix=HS", "--output-only=true"]
  },
  {
    brand: "GT",
    script: "scripts/import-goldtile.mjs",
    args: ["--source-name=GT", "--id-prefix=goldtile", "--management-prefix=GT", "--output-only=true"]
  }
].filter((job) => !selectedBrands.length || selectedBrands.includes(job.brand));

if (!brandJobs.length) {
  throw new Error(`실행할 브랜드가 없습니다. 입력값: ${selectedBrands.join(",")}`);
}

await fs.mkdir(outputDir, { recursive: true });

const originalProducts = await readJsonArray(productsPath);
const workingProducts = [...originalProducts];
const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  stockInquiryThresholdQty,
  publicStockExcludeThresholdQty,
  publicExposeAllStockProducts,
  publicRule: publicExposeAllStockProducts
    ? `all live products are exposed to customers for now; stockQty <= ${stockInquiryThresholdQty} displays as 주문시 재고 문의`
    : `live products are kept in the internal DB; customer exposure excludes stockQty <= ${publicStockExcludeThresholdQty}; stockQty ${publicStockExcludeThresholdQty + 1}-${stockInquiryThresholdQty} displays as 주문시 재고 문의`,
  productsPath,
  backupPath,
  reportPath,
  syncSupabase,
  brands: [],
  postTasks: [],
  summary: {}
};

await fs.copyFile(productsPath, backupPath);

for (const job of brandJobs) {
  const brandReport = {
    brand: job.brand,
    ok: false,
    imported: 0,
    currentBefore: workingProducts.filter((product) => getBrand(product) === job.brand).length,
    updatedStock: 0,
    restored: 0,
    stockInquiry: 0,
    excludedLowStockFromPublic: 0,
    excludedMissingOnSite: 0,
    keptUnchanged: 0,
    resultPath: "",
    error: ""
  };

  try {
    const imported = await runImporter(job);
    const liveProducts = await readJsonArray(imported.resultPath);
    const liveById = mapById(liveProducts);
    const currentById = mapById(workingProducts);
    const nextProducts = [];
    const currentBrandIds = new Set();

    for (const product of workingProducts) {
      if (getBrand(product) !== job.brand) {
        nextProducts.push(product);
        continue;
      }

      const id = String(product.id || "");
      currentBrandIds.add(id);
      const live = liveById.get(id);
      if (!live) {
        brandReport.excludedMissingOnSite += 1;
        continue;
      }

      const next = mergeStockFields(product, live, job.brand);
      if (isStockInquiry(next)) brandReport.stockInquiry += 1;
      if (isPublicStockExcluded(next)) brandReport.excludedLowStockFromPublic += 1;
      if (hasStockChange(product, next)) brandReport.updatedStock += 1;
      else brandReport.keptUnchanged += 1;
      nextProducts.push(next);
    }

    for (const live of liveProducts) {
      const id = String(live.id || "");
      if (!id || currentById.has(id) || currentBrandIds.has(id)) continue;

      const restored = mergeStockFields(live, live, job.brand);
      restored.restoredFromStockRefreshAt = new Date().toISOString();
      if (isStockInquiry(restored)) brandReport.stockInquiry += 1;
      if (isPublicStockExcluded(restored)) brandReport.excludedLowStockFromPublic += 1;
      nextProducts.push(restored);
      brandReport.restored += 1;
    }

    workingProducts.splice(0, workingProducts.length, ...sortProducts(nextProducts));
    brandReport.ok = true;
    brandReport.imported = liveProducts.length;
    brandReport.resultPath = imported.resultPath;
  } catch (error) {
    brandReport.error = error?.message || String(error);
  }

  report.brands.push(brandReport);
}

await writeJsonAtomic(productsPath, sortProducts(workingProducts));
let fatalError = "";
try {
  await runPostTask(["scripts/build-normalized-taxonomy.mjs"]);
  await runPostTask(["scripts/apply-tile-material-rules.mjs"]);
  await runPostTask(["scripts/apply-us-finish-rules.mjs"]);
  await runPostTask(["scripts/build-normalized-taxonomy.mjs"]);

  if (syncSupabase) {
    await runPostTask(["scripts/sync-products-to-supabase.mjs"]);
  }
} catch (error) {
  fatalError = error?.message || String(error);
  report.fatalError = fatalError;
}

const finalProducts = await readJsonArray(productsPath);
report.summary = {
  beforeTotal: originalProducts.length,
  afterTotal: finalProducts.length,
  totalImported: sum(report.brands, "imported"),
  totalUpdatedStock: sum(report.brands, "updatedStock"),
  totalRestored: sum(report.brands, "restored"),
  totalStockInquiry: sum(report.brands, "stockInquiry"),
  totalExcludedLowStockFromPublic: sum(report.brands, "excludedLowStockFromPublic"),
  totalExcludedMissingOnSite: sum(report.brands, "excludedMissingOnSite"),
  failedBrands: report.brands.filter((brand) => !brand.ok).map((brand) => ({ brand: brand.brand, error: brand.error })),
  finalByBrand: countBy(finalProducts, getBrand)
};
report.ok = report.summary.failedBrands.length === 0 && !fatalError;

await writeJsonAtomic(reportPath, report);

console.log(JSON.stringify({
  ok: report.ok,
  stockInquiryThresholdQty,
  publicStockExcludeThresholdQty,
  publicExposeAllStockProducts,
  summary: report.summary,
  reportPath,
  backupPath
}, null, 2));

if (fatalError) {
  console.error(fatalError);
  process.exitCode = 1;
}

async function runImporter(job) {
  const output = await spawnNode([job.script, ...job.args]);
  const parsed = parseLastJsonObject(output.stdout);
  if (!parsed?.resultPath) {
    throw new Error(`${job.brand} importer resultPath를 찾지 못했습니다.\n${output.stdout}\n${output.stderr}`);
  }
  return parsed;
}

async function runPostTask(args, extraEnv = {}) {
  const startedAt = new Date().toISOString();
  try {
    const output = await spawnNode(args, extraEnv);
    report.postTasks.push({
      ok: true,
      command: ["node", ...args].join(" "),
      startedAt,
      finishedAt: new Date().toISOString(),
      stdoutTail: tail(output.stdout, 4000),
      stderrTail: tail(output.stderr, 4000)
    });
  } catch (error) {
    report.postTasks.push({
      ok: false,
      command: ["node", ...args].join(" "),
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error?.message || String(error)
    });
    throw error;
  }
}

function mergeStockFields(baseProduct, liveProduct, brand) {
  const next = {
    ...baseProduct,
    stockQty: stockQty(liveProduct),
    stockText: cleanText(liveProduct.stockText),
    lastStockCheckedAt: new Date().toISOString()
  };

  for (const field of ["stockLocations", "sourceUrl", "sourceProductId"]) {
    if (liveProduct[field] !== undefined && liveProduct[field] !== null && liveProduct[field] !== "") {
      next[field] = liveProduct[field];
    }
  }

  next.majorCategory = cleanText(baseProduct.majorCategory || liveProduct.majorCategory || brand);
  next.catalogSource = cleanText(baseProduct.catalogSource || liveProduct.catalogSource || brand);
  next.kind = cleanText(baseProduct.kind || liveProduct.kind || brand);
  return next;
}

function hasStockChange(before, after) {
  return stockQty(before) !== stockQty(after) || cleanText(before.stockText) !== cleanText(after.stockText);
}

function isStockInquiry(product) {
  const quantity = stockQty(product);
  return (publicExposeAllStockProducts || quantity > publicStockExcludeThresholdQty) && quantity <= stockInquiryThresholdQty;
}

function isPublicStockExcluded(product) {
  return !publicExposeAllStockProducts && stockQty(product) <= publicStockExcludeThresholdQty;
}

async function readJsonArray(filePath) {
  const value = await readJson(filePath);
  if (!Array.isArray(value)) throw new Error(`${filePath} JSON 배열이 아닙니다.`);
  return value;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try {
    await fs.rename(tempPath, filePath);
  } catch {
    await fs.copyFile(tempPath, filePath);
    await fs.unlink(tempPath).catch(() => {});
  }
}

function mapById(products) {
  const map = new Map();
  for (const product of products) {
    const id = String(product?.id || "").trim();
    if (id) map.set(id, product);
  }
  return map;
}

function getBrand(product) {
  const candidates = [
    product?.majorCategory,
    product?.catalogSource,
    product?.kind,
    product?.maker,
    product?.managementCode
  ].map((value) => cleanText(value).toUpperCase());

  for (const value of candidates) {
    if (["VG", "AJ", "US", "SG", "HS", "GT"].includes(value)) return value;
    if (value.startsWith("VG-")) return "VG";
    if (value.startsWith("AJ-")) return "AJ";
    if (value.startsWith("US-")) return "US";
    if (value.startsWith("SG-")) return "SG";
    if (value.startsWith("HS-")) return "HS";
    if (value.startsWith("GT-")) return "GT";
  }

  const id = cleanText(product?.id).toLowerCase();
  if (id.startsWith("verygood-")) return "VG";
  if (id.startsWith("ajutile-")) return "AJ";
  if (id.startsWith("usong-")) return "US";
  if (id.startsWith("sgcera-")) return "SG";
  if (id.startsWith("hwashin-")) return "HS";
  if (id.startsWith("goldtile-")) return "GT";
  return cleanText(product?.majorCategory || "(미분류)").toUpperCase();
}

function stockQty(product) {
  const value = Number(product?.stockQty ?? product?.stock_qty ?? product?.stock ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = cleanText(keyFn(row) || "(없음)");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function sortProducts(products) {
  return [...products].sort((a, b) => {
    const brand = getBrand(a).localeCompare(getBrand(b), "ko");
    if (brand) return brand;
    const option = cleanText(a.option || a.sourceCategoryName).localeCompare(cleanText(b.option || b.sourceCategoryName), "ko");
    if (option) return option;
    return cleanText(a.name || a.modelName).localeCompare(cleanText(b.name || b.modelName), "ko");
  });
}

function spawnNode(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ...extraEnv },
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`node ${args.join(" ")} failed with exit ${code}\n${stderr || stdout}`));
    });
  });
}

function parseLastJsonObject(text) {
  const source = String(text || "");
  for (let index = source.lastIndexOf("{"); index >= 0; index = source.lastIndexOf("{", index - 1)) {
    const candidate = source.slice(index).trim();
    try {
      return JSON.parse(candidate);
    } catch {
      // keep scanning
    }
  }
  return null;
}

function parseCliArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, ...rest] = arg.slice(2).split("=");
    parsed[key] = rest.length ? rest.join("=") : "true";
  }
  return parsed;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function tail(text, size) {
  const value = String(text || "");
  return value.length > size ? value.slice(value.length - size) : value;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}
