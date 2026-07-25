import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const createdAt = new Date();
const stamp = createdAt.toISOString().replace(/\D/g, "").slice(0, 14);
const outputArg = readArg("--out");
const outputPath = path.resolve(root, outputArg || `outputs/vps-migration-manifest-${stamp}.json`);
const ignoredNamePattern = /(?:^|[.-])(?:backup|tmp|temp)(?:[.-]|$)/i;

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((item) => item.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}

function hashFile(target) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(target));
  return hash.digest("hex");
}

function inspectJson(relativePath) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) return { path: relativePath, exists: false };
  const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
  const stats = fs.statSync(target);
  return {
    path: relativePath,
    exists: true,
    bytes: stats.size,
    rows: Array.isArray(parsed) ? parsed.length : undefined,
    sha256: hashFile(target)
  };
}

function walkDirectory(relativePath) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) {
    return { path: relativePath, exists: false, files: 0, bytes: 0, sha256: "" };
  }

  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(target, absolute).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile() && !ignoredNamePattern.test(entry.name)) {
        files.push({ absolute, relative, bytes: fs.statSync(absolute).size });
      }
    }
  };
  visit(target);
  files.sort((left, right) => left.relative.localeCompare(right.relative));

  const aggregate = crypto.createHash("sha256");
  let bytes = 0;
  for (const file of files) {
    bytes += file.bytes;
    aggregate.update(file.relative);
    aggregate.update("\0");
    aggregate.update(hashFile(file.absolute));
    aggregate.update("\n");
  }

  return {
    path: relativePath,
    exists: true,
    files: files.length,
    bytes,
    sha256: aggregate.digest("hex")
  };
}

const products = inspectJson("data/products.json");
const manifest = {
  schemaVersion: 1,
  createdAt: createdAt.toISOString(),
  source: "jajaego-vps-migration",
  productCount: products.rows || 0,
  criticalFiles: [
    products,
    inspectJson("data/products.normalized.json"),
    inspectJson("data/product-images.json"),
    inspectJson("data/tile-brand-rules.json"),
    inspectJson("data/site-settings.json"),
    inspectJson("data/orders.json")
  ],
  persistentDirectories: [
    walkDirectory("data"),
    walkDirectory("uploads"),
    walkDirectory("outputs/proposals"),
    walkDirectory("outputs/render-feedback-assets")
  ]
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`VPS migration manifest: ${outputPath}`);
console.log(`Products: ${manifest.productCount.toLocaleString("en-US")}`);
for (const item of manifest.persistentDirectories) {
  console.log(`${item.path}: ${item.files.toLocaleString("en-US")} file(s), ${item.bytes.toLocaleString("en-US")} bytes`);
}
