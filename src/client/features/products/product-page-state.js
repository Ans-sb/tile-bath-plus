(function attachProductPageState(global) {
  "use strict";

  function filterProductsForPage(options) {
    const products = Array.isArray(options.products) ? options.products : [];
    const snapshot = options.snapshot || {};
    const callbacks = options.callbacks || {};
    const keywordTokens = getKeywordTokens(snapshot.keyword);

    const scoredProducts = products.map((product) => {
      const searchable = callbacks.getProductSearchableText(product);
      const normalizedSearchable = normalizeSearchToken(searchable);
      const normalizedProduct = snapshot.naturalIntent?.active && product.productType === "tile"
        ? callbacks.getNormalizedTaxonomyProductForProduct(product)
        : null;
      const naturalScore = normalizedProduct
        ? callbacks.scoreProductPageNaturalSearch(normalizedProduct, snapshot.naturalIntent)
        : 0;
      const keywordMatched = !snapshot.normalizedKeyword
        || searchable.includes(snapshot.normalizedKeyword)
        || (keywordTokens.length > 1 && keywordTokens.every((token) => normalizedSearchable.includes(token)))
        || naturalScore > 0;
      const passed = (snapshot.type === "all" || product.productType === snapshot.type)
        && callbacks.productMatchesAdminBrandFilter(product, snapshot.brand)
        && callbacks.productMatchesDirectFilter(product, snapshot.origin, callbacks.getProductDirectOriginValues)
        && callbacks.productMatchesDirectFilter(product, snapshot.size, callbacks.getProductDirectSizeValues)
        && callbacks.productMatchesDirectFilter(product, snapshot.thickness, callbacks.getProductDirectThicknessValues)
        && callbacks.productMatchesDirectOptionFilter(product, snapshot.option)
        && (snapshot.tileFeature === "all" || callbacks.matchesTileFeatureFilter(product, snapshot.tileFeature))
        && callbacks.productMatchesDirectFilter(product, snapshot.patternCategory, callbacks.getProductDirectTileCategories)
        && callbacks.productMatchesDirectFilter(product, snapshot.finish, callbacks.getProductDirectFinishValues)
        && callbacks.productMatchesDirectFilter(product, snapshot.color, callbacks.getProductDirectColorValues)
        && keywordMatched;
      if (!passed) return null;
      return { product, naturalScore };
    }).filter(Boolean);

    const hasNaturalSearch = snapshot.naturalIntent?.active
      && callbacks.hasActiveTaxonomyIntentCriteria(snapshot.naturalIntent);

    return scoredProducts
      .sort((left, right) => {
        if (hasNaturalSearch && left.naturalScore !== right.naturalScore) {
          return right.naturalScore - left.naturalScore;
        }
        return callbacks.compareProductsForDisplay(left.product, right.product);
      })
      .map((entry) => entry.product);
  }

  function getKeywordTokens(value) {
    return String(value || "")
      .split(/\s+/)
      .map(normalizeSearchToken)
      .filter((token) => token.length > 1);
  }

  function normalizeSearchToken(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[×＊*]/g, "x")
      .replace(/[\s\-_.\/]/g, "");
  }

  function countActiveProductFilters(snapshot, options = {}) {
    return [
      snapshot.type !== "all",
      Boolean(options.isAdmin) && snapshot.brand !== "all",
      snapshot.origin !== "all",
      snapshot.size !== "all",
      snapshot.thickness !== "all",
      snapshot.option !== "all",
      snapshot.tileFeature !== "all",
      snapshot.patternCategory !== "all",
      snapshot.finish !== "all",
      snapshot.color !== "all",
      Boolean(snapshot.keyword)
    ].filter(Boolean).length;
  }

  global.TbpProductPageState = {
    filterProductsForPage,
    countActiveProductFilters
  };
})(window);
