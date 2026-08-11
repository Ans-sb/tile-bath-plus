const fs = require("fs");
const path = require("path");

function createProductFileStore(options = {}) {
  const productsPath = options.productsPath;
  if (!productsPath) throw new Error("productsPath is required");

  async function readProducts() {
    const content = await fs.promises.readFile(productsPath, "utf8");
    return JSON.parse(content);
  }

  async function writeProducts(products) {
    await fs.promises.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
    return products;
  }

  async function backupProducts(label = "backup") {
    const safeLabel = String(label || "backup").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "") || "backup";
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const extension = path.extname(productsPath) || ".json";
    const backupPath = path.join(
      path.dirname(productsPath),
      `${path.basename(productsPath, extension)}.backup-before-${safeLabel}-${timestamp}${extension}`
    );
    await fs.promises.copyFile(productsPath, backupPath);
    return backupPath;
  }

  return {
    backupProducts,
    readProducts,
    writeProducts
  };
}

module.exports = {
  createProductFileStore
};
