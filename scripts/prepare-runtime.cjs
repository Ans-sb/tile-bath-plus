const fs = require("fs");
const path = require("path");

if (process.platform !== "linux") {
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const vendoredSkiaPath = path.join(root, "vendor", "@oai", "artifact-tool", "node_modules", "skia-canvas");

try {
  if (fs.existsSync(vendoredSkiaPath)) {
    fs.rmSync(vendoredSkiaPath, { recursive: true, force: true });
    console.log("[prepare-runtime] Removed vendored Windows skia-canvas for Linux runtime.");
  }
} catch (error) {
  console.warn("[prepare-runtime] Unable to clean vendored skia-canvas:", error.message);
}
