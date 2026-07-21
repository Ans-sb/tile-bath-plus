function createProductCache(options = {}) {
  const defaultTtlMs = Math.max(0, Number(options.defaultTtlMs || 0));
  let productsReadCache = { expiresAt: 0, rows: null, source: "" };
  let publicProductsJsonCache = { expiresAt: 0, json: "" };

  function getProducts() {
    if (!productsReadCache.rows || Date.now() >= productsReadCache.expiresAt) return null;
    return productsReadCache.rows;
  }

  function setProducts(rows, source, ttlMs = defaultTtlMs) {
    productsReadCache = {
      expiresAt: Date.now() + Math.max(0, Number(ttlMs || 0)),
      rows,
      source
    };
    return rows;
  }

  function getPublicJson() {
    if (publicProductsJsonCache.json && Date.now() < publicProductsJsonCache.expiresAt) {
      return publicProductsJsonCache.json;
    }
    return "";
  }

  function setPublicJson(json, ttlMs = defaultTtlMs) {
    publicProductsJsonCache = {
      expiresAt: Date.now() + Math.max(0, Number(ttlMs || 0)),
      json
    };
    return json;
  }

  function invalidate() {
    productsReadCache = { expiresAt: 0, rows: null, source: "" };
    publicProductsJsonCache = { expiresAt: 0, json: "" };
  }

  return {
    getProducts,
    setProducts,
    getPublicJson,
    setPublicJson,
    invalidate
  };
}

module.exports = {
  createProductCache
};
