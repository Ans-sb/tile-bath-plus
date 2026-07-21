(function attachProductSearchText(global) {
  "use strict";

  function buildProductSearchableText(product, normalizeSearchText) {
    if (!product || typeof product !== "object") return "";
    return normalizeSearchText([
      product.managementCode,
      product.name,
      product.size,
      product.color,
      product.material,
      product.surface,
      product.patternCategory,
      product.finish,
      product.option,
      product.features
    ].filter(Boolean).join(" "));
  }

  global.TbpProductSearchText = {
    buildProductSearchableText
  };
})(window);
