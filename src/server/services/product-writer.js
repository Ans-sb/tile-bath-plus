function createProductWriter(options = {}) {
  const readProducts = options.readProducts;
  const fileStore = options.fileStore;
  const cache = options.cache;
  const hasSupabaseConfig = options.hasSupabaseConfig;
  const upsertProductToSupabase = options.upsertProductToSupabase;

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

  return {
    saveProduct
  };
}

module.exports = {
  createProductWriter
};
