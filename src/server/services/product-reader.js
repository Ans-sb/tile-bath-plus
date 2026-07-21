function createProductReader(options = {}) {
  const cache = options.cache;
  const fileStore = options.fileStore;
  const readRemoteProducts = options.readRemoteProducts;
  const hasSupabaseConfig = options.hasSupabaseConfig;
  const withTimeout = options.withTimeout;
  const logger = options.logger || console;
  const forceLocalProducts = Boolean(options.forceLocalProducts);
  const productReadMode = String(options.productReadMode || "local-only").trim().toLowerCase();
  const productReadCacheTtlMs = Math.max(0, Number(options.productReadCacheTtlMs || 0));
  const productReadFallbackCacheTtlMs = Math.max(0, Number(options.productReadFallbackCacheTtlMs || 0));
  const productRemoteReadTimeoutMs = Math.max(0, Number(options.productRemoteReadTimeoutMs || 0));

  async function readProducts(readOptions = {}) {
    const cachedProducts = readOptions.cache === false ? null : cache.getProducts();
    if (cachedProducts) return cachedProducts;

    if (forceLocalProducts || productReadMode === "local-only") {
      const localProducts = await fileStore.readProducts();
      return cache.setProducts(localProducts, "file", productReadCacheTtlMs);
    }

    if (hasSupabaseConfig() && productReadMode !== "local-only") {
      try {
        const remoteProducts = await withTimeout(
          readRemoteProducts(),
          productRemoteReadTimeoutMs,
          `Supabase 상품 읽기 시간 초과 (${productRemoteReadTimeoutMs}ms)`
        );
        if (remoteProducts.length) return cache.setProducts(remoteProducts, "supabase");
      } catch (error) {
        logger.warn("[products] Supabase read failed; using local products.json.", error.message);
      }
    }

    const localProducts = await fileStore.readProducts();
    return cache.setProducts(
      localProducts,
      "file",
      hasSupabaseConfig() ? productReadFallbackCacheTtlMs : productReadCacheTtlMs
    );
  }

  return {
    readProducts
  };
}

module.exports = {
  createProductReader
};
