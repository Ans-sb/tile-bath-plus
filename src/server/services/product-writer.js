function createProductWriter(options = {}) {
  const readProducts = options.readProducts;
  const fileStore = options.fileStore;
  const cache = options.cache;
  const hasSupabaseConfig = options.hasSupabaseConfig;
  const upsertProductToSupabase = options.upsertProductToSupabase;
  const upsertProductsToSupabase = options.upsertProductsToSupabase;

  async function saveProduct(product) {
    let products = await readProducts({ cache: false });
    const index = products.findIndex((item) => item.id === product.id);
    if (index >= 0) products[index] = product;
    else products.push(product);

    if (hasSupabaseConfig()) {
      await upsertProductToSupabase(product);
      cache.invalidate();
      products = await readProducts({ cache: false });
    }

    await fileStore.writeProducts(products);
    cache.setProducts(products, "file");
    return products;
  }

  async function saveProducts(products, changedProducts = products, saveOptions = {}) {
    const nextProducts = Array.isArray(products) ? products : [];
    const changed = Array.isArray(changedProducts) ? changedProducts : [];
    const backupPath = saveOptions.backupLabel
      ? await fileStore.backupProducts(saveOptions.backupLabel)
      : "";

    if (hasSupabaseConfig() && changed.length) {
      await upsertProductsToSupabase(changed);
      cache.invalidate();
    }

    await fileStore.writeProducts(nextProducts);
    cache.setProducts(nextProducts, "file");
    return { products: nextProducts, backupPath };
  }

  return {
    saveProduct,
    saveProducts
  };
}

module.exports = {
  createProductWriter
};
