const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const vendoredSkiaPath = path.join(root, "vendor", "@oai", "artifact-tool", "node_modules", "skia-canvas");
const productsPath = path.join(root, "data", "products.json");
const normalizedPath = path.join(root, "data", "products.normalized.json");

try {
  const shouldBuildNormalized = fs.existsSync(productsPath)
    && (!fs.existsSync(normalizedPath)
      || fs.statSync(normalizedPath).mtimeMs < fs.statSync(productsPath).mtimeMs);

  if (shouldBuildNormalized) {
    console.log("[prepare-runtime] Building normalized tile taxonomy.");
    const result = spawnSync(process.execPath, [path.join(root, "scripts", "build-normalized-taxonomy.mjs")], {
      cwd: root,
      stdio: "inherit"
    });
    if (result.status !== 0) {
      console.warn("[prepare-runtime] Normalized taxonomy build failed; server will continue with available data.");
    }
  }
} catch (error) {
  console.warn("[prepare-runtime] Unable to prepare normalized taxonomy:", error.message);
}

if (process.platform !== "linux") {
  process.exit(0);
}

try {
  if (fs.existsSync(vendoredSkiaPath)) {
    fs.rmSync(vendoredSkiaPath, { recursive: true, force: true });
    console.log("[prepare-runtime] Removed vendored Windows skia-canvas for Linux runtime.");
  }
} catch (error) {
  console.warn("[prepare-runtime] Unable to clean vendored skia-canvas:", error.message);
}
