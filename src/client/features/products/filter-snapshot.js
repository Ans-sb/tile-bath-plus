(function attachProductFilterSnapshot(global) {
  "use strict";

  function readSelectValue(documentRef, selector, fallback = "all") {
    return documentRef.querySelector(selector)?.value || fallback;
  }

  function readProductFilterSnapshot(options) {
    const documentRef = options.documentRef || global.document;
    const isAdmin = Boolean(options.isAdmin);
    const normalizeSearchText = options.normalizeSearchText || ((value) => String(value || "").trim().toLowerCase());
    const parseNaturalSearch = options.parseNaturalSearch || (() => null);

    const keyword = documentRef.querySelector("#productSearch")?.value.trim().toLowerCase() || "";
    return {
      type: readSelectValue(documentRef, "#mainCategoryFilter"),
      brand: isAdmin ? readSelectValue(documentRef, "#productBrandFilter") : "all",
      kind: readSelectValue(documentRef, "#kindFilter"),
      size: readSelectValue(documentRef, "#sizeFilter"),
      option: readSelectValue(documentRef, "#optionFilter"),
      tileFeature: readSelectValue(documentRef, "#tileFeatureFilter"),
      patternCategory: readSelectValue(documentRef, "#patternCategoryFilter"),
      finish: readSelectValue(documentRef, "#finishFilter"),
      color: readSelectValue(documentRef, "#colorFilter"),
      keyword,
      normalizedKeyword: normalizeSearchText(keyword),
      naturalIntent: keyword ? parseNaturalSearch(keyword, "customer") : null
    };
  }

  global.TbpProductFilters = {
    readProductFilterSnapshot
  };
})(window);
