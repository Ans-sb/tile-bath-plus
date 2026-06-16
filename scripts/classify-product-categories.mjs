import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const productsPath = path.join(root, "data", "products.json");
const reportDir = path.join(root, "data", "classification-audit");

const PRODUCT_TYPE_LABELS = {
  tile: "타일",
  sanitary: "위생도기",
  faucet: "수전금구",
  accessory: "악세사리",
  material: "부자재"
};

const KIND_BY_TYPE = {
  tile: "",
  sanitary: "위생도기",
  faucet: "수전 금구",
  accessory: "악세사리",
  material: "부자재"
};

const INTERNAL_BRAND_CODES = new Set(["AJ", "VG", "US", "SG", "GT", "HS"]);

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
const changes = [];
const reviewRows = [];

for (const product of products) {
  const beforeType = clean(product.productType);
  const beforeKind = clean(product.kind);
  const result = classifyProduct(product);
  product.productType = result.productType;
  if (result.kind && shouldReplaceKind(product, result.productType, beforeKind)) {
    product.kind = result.kind;
  }

  if (beforeType !== product.productType || beforeKind !== clean(product.kind)) {
    changes.push(makeAuditRow(product, beforeType, beforeKind, result));
  }
  if (result.needsReview) {
    reviewRows.push(makeAuditRow(product, beforeType, beforeKind, result));
  }
}

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(reportDir, "product-category-changes.json"), `${JSON.stringify(changes, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(reportDir, "product-category-review.json"), `${JSON.stringify(reviewRows, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(reportDir, "product-category-summary.json"), `${JSON.stringify(buildSummary(products, changes, reviewRows), null, 2)}\n`, "utf8");

console.log(JSON.stringify(buildSummary(products, changes, reviewRows), null, 2));

function classifyProduct(product) {
  const text = normalize([
    product.name,
    product.modelName,
    product.option,
    product.size,
    product.material,
    product.surface,
    product.features,
    product.sourceCategoryName,
    product.catalogSource
  ].filter(Boolean).join(" "));
  const fullText = normalize([product.productType, product.kind, text].filter(Boolean).join(" "));
  const strongTile = hasStrongTileCue(text);

  if (hasAccessoryCue(text)) return result("accessory", "악세사리", "accessory keyword/image-reviewed rule", isAmbiguous(product, "accessory"));
  if (hasFaucetCue(text)) return result("faucet", "수전 금구", "faucet keyword/image-reviewed rule", isAmbiguous(product, "faucet"));
  if (hasSanitaryCue(text)) return result("sanitary", inferSanitaryKind(text), "sanitary keyword rule", isAmbiguous(product, "sanitary"));
  if (hasMaterialCue(text)) return result("material", "부자재", "material keyword rule", isAmbiguous(product, "material"));
  if (strongTile) return result("tile", inferTileBrandKind(product), "tile keyword/size rule", isAmbiguous(product, "tile"));

  if (/수전 금구/.test(fullText) && !strongTile) return result("faucet", "수전 금구", "existing kind fallback", true);
  if (/위생도기|양변기|세면기|소변기|비데/.test(fullText) && !strongTile) {
    return result("sanitary", inferSanitaryKind(fullText), "existing sanitary fallback", true);
  }
  if (/부자재/.test(fullText) && !strongTile) return result("material", "부자재", "existing material fallback", true);

  const currentType = PRODUCT_TYPE_LABELS[clean(product.productType)] ? clean(product.productType) : "tile";
  return result(currentType, currentType === "tile" ? inferTileBrandKind(product) : KIND_BY_TYPE[currentType], "kept existing type", true);
}

function hasAccessoryCue(text) {
  return /악세사리|액세서리|욕실장|거울|미러|수건걸이|타올걸이|휴지걸이|지걸이|컵대|비누|선반|코너선반|타일코너선반|옷걸이|타월|수건|디스펜서|트랩|팝업|폽업|유가|육가|배수구|드레인|환풍기|욕실용품|댐퍼시트|소변감지기|감지기|앙카볼트|휴지통|젠다이|상판|accessory|mirror|cabinet|holder|shelf|drain|trap|popup/.test(text);
}

function hasFaucetCue(text) {
  if (/위생도기\/수도꼭지/.test(text) && /스퀘어_|심플4_|엘레강스_|토수형/.test(text)) return true;
  return /수전|수\s*전|샤워수전|욕조수전|주방수전|세면수전|탑볼세면수전|겸용샤워수전|샤워기|해바라기|레인샤워|슬라이드바|샤워바|샤워호스|스프레이건|청소건|앵글밸브|angle\s*valve|faucet|shower|rain\s*shower|mixer/.test(text);
}

function hasSanitaryCue(text) {
  return /양변기|좌변기|변기|원피스|투피스|세면기|세면대|세면볼|탑볼|소변기|비데|욕조|반다리|긴다리|카운터세면|족욕기|toilet|basin|wash\s*basin|bidet|urinal|bathtub/.test(text);
}

function hasMaterialCue(text) {
  return /부\s*자\s*재|타일부자재|접착|본드|압착|시멘트|홈멘트|줄눈|메지|실리콘|방수|몰탈|몰그린|아덱스|ardex|grout|adhesive|스페이서|레벨링|클립|웨지|코너비드|시공도구|공구|양생|백시멘트|레미탈|몰딩|스커팅/.test(text);
}

function hasStrongTileCue(text) {
  if (/타일부자재|타일본드|타일용|타일삽입육가|유가|육가|접착|본드|압착|시멘트|홈멘트|줄눈|메지|실리콘|방수|몰탈|아덱스|ardex|grout|adhesive|욕실장|거울|젠다이|상판/.test(text)) return false;
  return /타일|포세린|포쉐린|세라믹|도기질|자기질|폴리싱|모자이크|모자익|대리석|석재|고벽돌|브릭|서브웨이|슬랩|벽타일|바닥타일|유약폴리싱/.test(text)
    || (/\b\d{2,4}\s*[*x×]\s*\d{2,4}\b/.test(text) && /유럽|수입바닥|수입벽|바닥|벽|rett|matt|matte|pol|무광|유광|포세린|도기|자기|마블|스톤|콘크리트|타일|t-/.test(text));
}

function inferSanitaryKind(text) {
  if (/양변기|좌변기|변기|원피스|투피스|toilet/.test(text)) return "양변기";
  if (/소변기|urinal/.test(text)) return "소변기";
  if (/비데|bidet/.test(text)) return "비데";
  if (/욕조|족욕기|bathtub/.test(text)) return "욕조";
  if (/세면기|세면대|세면볼|탑볼|반다리|긴다리|basin/.test(text)) return "세면기";
  return "위생도기";
}

function shouldReplaceKind(product, nextType, beforeKind) {
  if (nextType === "tile") return !INTERNAL_BRAND_CODES.has(beforeKind.toUpperCase());
  if (!beforeKind) return true;
  if (INTERNAL_BRAND_CODES.has(beforeKind.toUpperCase())) return true;
  if (nextType === "faucet" && beforeKind !== "수전 금구") return true;
  if (nextType === "accessory" && !/악세사리|욕실장|거울|선반|유가|육가|휴지|수건/.test(beforeKind)) return true;
  if (nextType === "material" && beforeKind !== "부자재") return true;
  if (nextType === "sanitary" && /수전|부자재|악세사리/.test(beforeKind)) return true;
  return false;
}

function inferTileBrandKind(product) {
  const existing = clean(product.kind).toUpperCase();
  if (INTERNAL_BRAND_CODES.has(existing)) return existing;
  const catalog = clean(product.catalogSource).toUpperCase();
  if (INTERNAL_BRAND_CODES.has(catalog)) return catalog;
  const id = clean(product.id).toLowerCase();
  if (id.startsWith("verygood-")) return "VG";
  if (id.startsWith("usong-")) return "US";
  if (id.startsWith("ajutile-")) return "AJ";
  if (id.startsWith("sgcera-")) return "SG";
  if (id.startsWith("goldtile-")) return "GT";
  if (id.startsWith("hwashin-")) return "HS";
  return clean(product.kind) || "TILE";
}

function isAmbiguous(product, nextType) {
  const fullText = normalize([product.productType, product.kind, product.name, product.option, product.size, product.features].filter(Boolean).join(" "));
  if (nextType === "tile" && /수전|양변기|세면|소변|비데|욕실장|거울|휴지|수건|유가|육가|부자재|접착|실리콘|시멘트/.test(fullText)) return true;
  if (nextType !== "tile" && /포세린|포쉐린|폴리싱|모자이크|유약폴리싱|수입바닥|수입벽/.test(fullText) && !/타일부자재|타일본드|타일삽입육가/.test(fullText)) return true;
  if (!product.image || /no_pro_img|noimage|no_img/i.test(String(product.image))) return true;
  return false;
}

function result(productType, kind, reason, needsReview = false) {
  return { productType, kind, reason, needsReview };
}

function makeAuditRow(product, beforeType, beforeKind, result) {
  return {
    id: product.id,
    beforeType,
    afterType: product.productType,
    beforeKind,
    afterKind: product.kind,
    label: PRODUCT_TYPE_LABELS[product.productType] || product.productType,
    reason: result.reason,
    needsReview: result.needsReview,
    name: product.name,
    option: product.option,
    size: product.size,
    image: product.image
  };
}

function buildSummary(items, changedRows, reviewItems) {
  return {
    total: items.length,
    countsByType: countBy(items, (item) => item.productType),
    countsByKind: countBy(items, (item) => item.kind || "(empty)"),
    changed: changedRows.length,
    reviewNeeded: reviewItems.length,
    reportDir
  };
}

function countBy(items, getter) {
  return Object.fromEntries([...items.reduce((map, item) => {
    const key = getter(item);
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")));
}

function normalize(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function clean(value) {
  return String(value || "").trim();
}
