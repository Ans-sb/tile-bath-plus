function normalizeCartItem(item) {
  return {
    id: String(item?.id || "").trim(),
    managementCode: String(item?.managementCode || "").trim(),
    productType: String(item?.productType || "").trim(),
    kind: String(item?.kind || "").trim(),
    name: String(item?.name || "").trim(),
    size: String(item?.size || "").trim(),
    finish: String(item?.finish || "").trim(),
    maker: String(item?.maker || "").trim(),
    unit: String(item?.unit || "").trim(),
    option: String(item?.option || "").trim(),
    costPrice: Number(item?.costPrice) || 0,
    retailPrice: Number(item?.retailPrice) || 0,
    wholesalePrice: Number(item?.wholesalePrice) || 0,
    stockQty: Number(item?.stockQty) || 0,
    image: String(item?.image || "").trim(),
    qty: Math.max(Number(item?.qty) || 0, 0),
    quotePrice: Math.max(Number(item?.quotePrice) || 0, 0),
    renderedImage: String(item?.renderedImage || "").trim(),
    renderTarget: String(item?.renderTarget || "").trim(),
    renderPointMemo: String(item?.renderPointMemo || "").trim(),
    renderRoomType: String(item?.renderRoomType || "").trim(),
    renderInteriorStyle: String(item?.renderInteriorStyle || "").trim(),
    renderStyleMemo: String(item?.renderStyleMemo || "").trim()
  };
}

module.exports = {
  normalizeCartItem
};
