(function attachCartTileMetrics(global) {
  "use strict";

  function getPositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function extractFirstPositiveNumber(source, patterns) {
    const text = String(source || "");
    for (const pattern of patterns) {
      const match = text.match(pattern);
      const value = getPositiveNumber(match?.[1]);
      if (value) return value;
    }
    return 0;
  }

  function getTileBoxMetrics(item) {
    const sourceText = [item?.unit, item?.features, item?.material, item?.name, item?.modelName].filter(Boolean).join(" ");
    return {
      pcsPerBox: getPositiveNumber(item?.pcsPerBox) || extractFirstPositiveNumber(sourceText, [
        /들이\s*\(?\s*([0-9]+(?:\.[0-9]+)?)\s*\)?/i,
        /([0-9]+(?:\.[0-9]+)?)\s*(?:pcs|장)\s*\/?\s*box/i,
        /box\s*\/\s*들이\s*\(?\s*([0-9]+(?:\.[0-9]+)?)\s*\)?/i
      ]),
      sqmPerBox: getPositiveNumber(item?.sqmPerBox) || extractFirstPositiveNumber(sourceText, [
        /([0-9]+(?:\.[0-9]+)?)\s*(?:㎡|m2|m²)\s*\/?\s*box/i,
        /box\s*\/.*?([0-9]+(?:\.[0-9]+)?)\s*(?:㎡|m2|m²)/i,
        /\/\s*([0-9]+(?:\.[0-9]+)?)\s*(?:㎡|m2|m²)/i
      ])
    };
  }

  function getCartTileMeasureState(item) {
    const { pcsPerBox, sqmPerBox } = getTileBoxMetrics(item);
    const boxQty = getPositiveNumber(item?.qty);
    return {
      pcsPerBox,
      sqmPerBox,
      boxQty,
      estimatedSqm: sqmPerBox ? boxQty * sqmPerBox : 0,
      estimatedPieces: pcsPerBox ? Math.ceil(boxQty * pcsPerBox) : 0
    };
  }

  global.TbpCartTileMetrics = {
    getTileBoxMetrics,
    getCartTileMeasureState
  };
})(window);
