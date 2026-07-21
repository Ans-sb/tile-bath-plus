const fs = require("fs");

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

  return {
    readProducts,
    writeProducts
  };
}

module.exports = {
  createProductFileStore
};
