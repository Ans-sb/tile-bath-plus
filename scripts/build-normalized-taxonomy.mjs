import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const productsPath = path.join(root, "data", "products.json");
const normalizedPath = path.join(root, "data", "products.normalized.json");
const summaryPath = path.join(root, "data", "products.normalized.summary.json");
const reportDir = path.join(root, "outputs", "taxonomy-analysis");
const reportPath = path.join(reportDir, `normalized-taxonomy-${timestampForFile(new Date())}.md`);
const taxonomyVersion = "2026-06-02-mosaic-fix-v1";

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
const normalized = products.map(normalizeProductForTaxonomy);
const summary = buildSummary(normalized);

fs.mkdirSync(path.dirname(normalizedPath), { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(normalizedPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
fs.writeFileSync(reportPath, buildMarkdownReport(summary), "utf8");

console.log(`normalized: ${normalized.length}`);
console.log(`file: ${normalizedPath}`);
console.log(`summary: ${summaryPath}`);
console.log(`report: ${reportPath}`);

function normalizeProductForTaxonomy(product) {
  const source = [
    product.name,
    product.modelName,
    product.option,
    product.features,
    product.material,
    product.patternCategory,
    product.finish,
    product.surface,
    product.color,
    product.sourceCategoryName,
    product.maker,
    product.countryOfOrigin,
    product.unit
  ].filter(Boolean).join(" ");
  const sizeInfo = parseSize(product.size || product.name || source);
  const thicknessMm = parseThickness(source);
  const directSurfaceFinish = normalizeDirectSurfaceFinish(product.finish || product.surface);
  const surfaceFinish = directSurfaceFinish || inferSurfaceFinish(source);
  const surfaceTexture = inferSurfaceTexture(source);
  const antiSlip = inferAntiSlip(source);
  const finishModel = getFinishModel(source, surfaceFinish, surfaceTexture, antiSlip);
  const materialCategory = inferMaterial(source, product.productType);
  const materialDetail = inferMaterialDetail(source);
  const slipRating = inferSlipRating(source);
  const mainColor = inferMainColor(source);
  const styleCategories = inferStyles(source, product.patternCategory);
  const applicationCategories = inferApplications(source, sizeInfo, styleCategories, product.productType);
  const spaceCategories = inferSpaces(source, applicationCategories, styleCategories);
  const functionCategories = inferFunctions(product, source, sizeInfo, applicationCategories);
  const patternDetail = inferPatternDetail(source, styleCategories);
  const moodTags = inferMoodTags(source, styleCategories, mainColor);
  const collectionName = makeCollectionName(product, sizeInfo, mainColor, surfaceFinish);
  const collectionKey = normalizeKey([product.kind || product.catalogSource || product.maker, collectionName].filter(Boolean).join("__"));
  const reviewReasons = getReviewReasons({
    product,
    sizeInfo,
    materialCategory,
    mainColor,
    surfaceFinish,
    styleCategories,
    applicationCategories,
    spaceCategories
  });

  return {
    taxonomyVersion,
    productId: String(product.id || ""),
    managementCode: String(product.managementCode || ""),
    majorCategory: String(product.majorCategory || product.kind || product.catalogSource || ""),
    internalBrandId: makeInternalBrandId(product),
    internalBrandCode: makeInternalBrandCode(product),
    internalBrandName: makeInternalBrandName(product),
    supplierName: String(product.maker || product.catalogSource || product.kind || ""),
    brand: makeInternalBrandCode(product),
    isCustomerBrandVisible: false,
    productType: String(product.productType || ""),
    sourceCategoryName: String(product.sourceCategoryName || product.option || ""),
    sourceProductId: String(product.sourceProductId || ""),
    collectionId: collectionKey,
    collectionName,
    customerCollectionName: sanitizeCustomerText(collectionName, product) || collectionName,
    skuName: String(product.name || product.modelName || ""),
    customerSkuName: sanitizeCustomerText(product.name || product.modelName || "", product) || String(product.name || product.modelName || ""),
    modelName: String(product.modelName || product.name || ""),
    sizeLabel: sizeInfo.label,
    sizeGroup: sizeInfo.group,
    widthMm: sizeInfo.width || null,
    heightMm: sizeInfo.height || null,
    thicknessMm,
    thicknessBucket: getThicknessBucket(thicknessMm),
    shape: inferShape(source, sizeInfo),
    materialCategory,
    materialDetail,
    surfaceFinish,
    finishGroup: finishModel.finishGroup,
    finishDetail: finishModel.finishDetail,
    finishPath: finishModel.finishPath,
    surfaceTexture,
    antiSlip,
    slipRating,
    mainColor,
    subColor: inferSubColor(source, mainColor),
    accentColors: inferAccentColors(source),
    stylePrimary: styleCategories[0] || "스타일 미확인",
    styleCategories,
    patternDetail,
    moodTags,
    spaceCategories,
    applicationCategories,
    functionCategories,
    originRegion: String(product.countryOfOrigin || "원산지 미확인"),
    originCountry: String(product.countryOfOrigin || ""),
    countryOfOrigin: String(product.countryOfOrigin || ""),
    pcsPerBox: toNumberOrNull(product.pcsPerBox),
    sqmPerBox: toNumberOrNull(product.sqmPerBox),
    stockStatus: Number(product.stockQty || 0) > 0 ? "재고보유" : "재고미확인",
    stockQty: Number(product.stockQty || 0),
    image: String(product.image || ""),
    customerSearchableText: buildSearchableText({
      product,
      sizeInfo,
      materialCategory,
      materialDetail,
      surfaceFinish,
      finishGroup: finishModel.finishGroup,
      finishDetail: finishModel.finishDetail,
      finishPath: finishModel.finishPath,
      surfaceTexture,
      slipRating,
      mainColor,
      styleCategories,
      applicationCategories,
      spaceCategories,
      functionCategories,
      patternDetail,
      moodTags,
      includeBrand: false
    }),
    adminSearchableText: buildSearchableText({
      product,
      sizeInfo,
      materialCategory,
      materialDetail,
      surfaceFinish,
      finishGroup: finishModel.finishGroup,
      finishDetail: finishModel.finishDetail,
      finishPath: finishModel.finishPath,
      surfaceTexture,
      slipRating,
      mainColor,
      styleCategories,
      applicationCategories,
      spaceCategories,
      functionCategories,
      patternDetail,
      moodTags,
      includeBrand: true
    }),
    searchKeywords: buildSearchKeywords({
      product,
      sizeInfo,
      materialCategory,
      materialDetail,
      surfaceFinish,
      finishGroup: finishModel.finishGroup,
      finishDetail: finishModel.finishDetail,
      finishPath: finishModel.finishPath,
      surfaceTexture,
      slipRating,
      mainColor,
      styleCategories,
      applicationCategories,
      spaceCategories,
      functionCategories,
      patternDetail,
      moodTags
    }),
    needsReview: reviewReasons.length > 0,
    reviewReasons
  };
}

function makeInternalBrandCode(product) {
  return String(product.kind || product.catalogSource || product.majorCategory || product.maker || "BR-UNKNOWN")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function makeInternalBrandId(product) {
  return `brand-${normalizeKey(makeInternalBrandCode(product))}`;
}

function makeInternalBrandName(product) {
  const code = makeInternalBrandCode(product);
  const maker = String(product.maker || "").trim();
  if (maker && maker !== code) return maker;
  return `${code}_INTERNAL`;
}

function parseSize(value) {
  const text = String(value || "").replace(/[×＊]/g, "x");
  const square = /(\d{2,4})\s*각/.exec(text);
  const pair = /(\d{2,4})\s*[xX*]\s*(\d{2,4})/.exec(text);
  const width = pair ? Number(pair[1]) : square ? Number(square[1]) : 0;
  const height = pair ? Number(pair[2]) : square ? Number(square[1]) : 0;
  const label = width && height ? `${width}x${height}` : "";
  const maxSide = Math.max(width, height);
  let group = "규격 미확인";
  if (/모자이크|mosaic|hex|dia|penny|원형|육각|팔각|다이아|쉐브론|헤링본/i.test(text)) group = "특수형";
  else if (maxSide > 0 && maxSide <= 150) group = "소형 타일";
  else if (maxSide <= 400) group = "중형 타일";
  else if (maxSide <= 1200) group = "대형 타일";
  else if (maxSide > 1200) group = "초대형 / 슬랩";
  return { width, height, label, group };
}

function parseThickness(value) {
  const text = normalizeRaw(value);
  const match = /(?:^|[^0-9])(\d{1,2}(?:\.\d)?)t(?:[^a-z]|$)/.exec(text) || /(\d{1,2}(?:\.\d)?)mm/.exec(text);
  return match ? Number(match[1]) : null;
}

function getThicknessBucket(thicknessMm) {
  const thickness = Number(thicknessMm || 0);
  if (thickness > 0 && thickness <= 6) return "6T 이하";
  if (thickness >= 7 && thickness <= 8) return "7~8T";
  if (thickness >= 9 && thickness <= 10) return "9~10T";
  if (thickness >= 11 && thickness <= 12) return "11~12T";
  if (thickness >= 18 && thickness <= 20) return "20T";
  return "기타";
}

function getFinishModel(source, surfaceFinish = "", surfaceTexture = "", antiSlip = false) {
  const directFinish = normalizeDirectSurfaceFinish(surfaceFinish);
  if (directFinish === "유광") {
    return { finishGroup: "유광", finishDetail: "유광", finishPath: "유광" };
  }

  const text = normalizeRaw([source, surfaceFinish, surfaceTexture].filter(Boolean).join(" "));
  let group = "";
  let detail = "";
  if (/폴리싱|polishing|polished/.test(text)) {
    group = "유광";
    detail = "폴리싱";
  } else if (/반무광|세미무광|새틴|satin|라파토|lappato/.test(text)) {
    group = "유광";
    detail = "반무광";
  } else if (/유광|글로시|gloss|glossy|gls/.test(text)) {
    group = "유광";
    detail = "유광";
  } else if (antiSlip || /논슬립|미끄럼|non-slip|nonslip|\bns\b|r10|r11|r12/.test(text)) {
    group = "무광";
    detail = "논슬립";
  } else if (/혼드|honed/.test(text)) {
    group = "무광";
    detail = "혼드";
  } else if (/엠보|emboss|양각/.test(text)) {
    group = "무광";
    detail = "엠보";
  } else if (/3d|입체/.test(text)) {
    group = "무광";
    detail = "3D";
  } else if (/텍스처|texture|텍스쳐|골지|리브드|플루티드|stripe|스트라이프|러프|rough|요철|거친|조면/.test(text)) {
    group = "무광";
    detail = "텍스쳐";
  } else if (/내추럴|natural/.test(text)) {
    group = "무광";
    detail = "내추럴";
  } else if (directFinish === "무광" || /무광|매트|맷|matt|matte|mat/.test(text)) {
    group = "무광";
    detail = "무광";
  }
  const path = ["엠보", "3D", "텍스쳐"].includes(detail)
    ? `무광 > 내추럴 > ${detail}`
    : group && detail && group !== detail
      ? `${group} > ${detail}`
      : group || "마감 미확인";
  return {
    finishGroup: group || "마감 미확인",
    finishDetail: detail || "마감 미확인",
    finishPath: path
  };
}

function normalizeDirectSurfaceFinish(value) {
  const text = String(value || "").trim();
  if (text === "유광") return "유광";
  if (text === "무광") return "무광";
  return "";
}

function inferSpaces(source, applications, styles) {
  const text = normalizeRaw(source);
  const spaces = [];
  if (/욕실|화장실|bath|샤워|논슬립|모자이크/.test(text)) spaces.push("욕실");
  if (/주방|싱크|백스플래시|backsplash|서브웨이|브릭/.test(text)) spaces.push("주방");
  if (/거실|아트월|포세린|슬랩|마블|스톤|트래버틴/.test(text) || styles.some((style) => ["마블룩", "스톤룩", "트래버틴룩"].includes(style))) spaces.push("거실");
  if (/현관|논슬립|패턴|테라코타|200x200|300x300/.test(text)) spaces.push("현관");
  if (/베란다|발코니|외부|테라스|논슬립|테라코타/.test(text)) spaces.push("베란다");
  if (/카페|상업|호텔|오피스|식당|매장|commercial/.test(text) || applications.includes("상업용 바닥타일")) spaces.push("상업공간");
  if (/외부|외장|테라스|수영장|계단|20t|페데스탈|포장/.test(text)) spaces.push("외부공간");
  return unique(spaces.length ? spaces : ["공간 미확인"]);
}

function inferApplications(source, sizeInfo, styles, productType) {
  const text = normalizeRaw(source);
  const apps = [];
  const accessoryLike = isAccessoryLikeTaxonomyText(text);
  if (productType && productType !== "tile") {
    if (/mat|부자재|접착|줄눈|시멘트|실리콘|방수/.test(`${productType} ${text}`)) return ["부자재 / 마감재"];
    return ["용도 미확인"];
  }
  if (/벽|wall|백스플래시|서브웨이|브릭/.test(text)) apps.push("벽타일");
  if (/바닥|floor|논슬립|포세린|자기질|600x600|300x300/.test(text) || sizeInfo.width >= 300 || sizeInfo.height >= 300) apps.push("바닥타일");
  if (/벽바닥|겸용|포세린|porcelain/.test(text)) apps.push("벽·바닥 겸용 타일");
  if (/외부|외장|테라스|outdoor|20t/.test(text)) apps.push("외부용 타일");
  if (/상업|commercial|카페|호텔|매장/.test(text)) apps.push("상업용 바닥타일");
  if (/수영장|pool/.test(text)) apps.push("수영장 타일");
  if (/계단|stair|노즈/.test(text)) apps.push("계단 타일");
  if (!accessoryLike && /모자이크|모자익|mosaic|g\d+|hex|hexagon|dia|penny|랜턴|원형|육각|팔각|페니|헥사|헥사곤|스틱|조약돌|pebble/.test(text)) apps.push("모자이크 타일");
  if (sizeInfo.group === "초대형 / 슬랩") apps.push("슬랩 / 대형타일");
  if (/부자재|접착|줄눈|몰딩|스커팅|코너|엣지/.test(text)) apps.push("부자재 / 마감재");
  if (!apps.length && styles.includes("패턴 / 데코")) apps.push("벽타일");
  return unique(apps.length ? apps : ["용도 미확인"]);
}

function inferStyles(source, existingPattern) {
  const text = normalizeRaw(`${source} ${existingPattern || ""}`);
  const styles = [];
  if (/마블|대리석|marble|calacatta|carrara|statuario|arabescato|onyx|네로|판다|베인/.test(text)) styles.push("마블룩");
  if (/스톤|stone|라임스톤|샌드스톤|슬레이트|화강석|그라니트|자연석/.test(text)) styles.push("스톤룩");
  if (/트래버틴|트라버틴|travertine/.test(text)) styles.push("트래버틴룩");
  if (/콘크리트|시멘트|cement|concrete|노출콘크리트|모던무지/.test(text)) styles.push("콘크리트룩");
  if (/테라조|terrazzo|칩|chip/.test(text)) styles.push("테라조룩");
  if (/우드|wood|오크|월넛|티크|헤링본우드/.test(text)) styles.push("우드룩");
  if (/화이트|백색|아이보리|베이지|그레이|블랙|그린|블루|핑크|옐로우|솔리드|solid|무지|단색/.test(text)) styles.push("컬러 / 솔리드");
  if (/패턴|pattern|데코|엔카우스틱|체크|플라워|지오메트릭|랜덤|포인트|모자이크|mosaic|육각|팔각|다이아|랜턴|원형|레트로/.test(text)) styles.push("패턴 / 데코");
  if (/젤리지|핸드메이드|수공예|유약|불규칙/.test(text)) styles.push("핸드메이드룩");
  if (/브릭|서브웨이|subway|brick|longbrick/.test(text)) styles.push("브릭 / 서브웨이");
  if (/3d|입체|텍스처|리브드|골지|플루티드|스트라이프|양각/.test(text)) styles.push("입체 / 텍스처");
  if (/메탈|metal|티타늄|알루미늄/.test(text)) styles.push("메탈룩");
  if (/글라스|glass|유리/.test(text)) styles.push("글라스룩");
  if (/엔카우스틱|encaustic|시멘트타일|cementtile|빈티지패턴/.test(text)) styles.push("엔카우스틱 / 시멘트타일");
  return unique(styles.length ? styles : ["스타일 미확인"]);
}

function inferMaterial(source, productType) {
  const text = normalizeRaw(source);
  if (productType && productType !== "tile") return "복합소재 / 기타";
  if (/포세린|포쉐린|porcelain|풀바디|컬러바디|글레이즈드/.test(text)) return "포세린";
  if (/세라믹|ceramic/.test(text)) return "세라믹";
  if (/자기질|바닥/.test(text)) return "자기질";
  if (/도기질|벽전용/.test(text)) return "도기질";
  if (/석기질|stoneware|보도블럭|보도블록/.test(text)) return "석기질";
  if (/석재타일|stone tile|돌성분/.test(text)) return "석재 타일";
  if (/복합대리석|엔지니어드스톤|engineeredstone|인조석/.test(text)) return "복합대리석";
  if (/복합타일|compound/.test(text)) return "복합 타일";
  if (/시멘트타일|cementtile|엔카우스틱/.test(text)) return "시멘트 타일";
  if (/메탈|metal|티타늄|알루미늄|스테인리스/.test(text)) return "메탈";
  if (/천연석|대리석|라임스톤|슬레이트|화강석|travertine|트래버틴/.test(text)) return "천연석";
  if (/유리|glass/.test(text)) return "유리";
  if (/테라조|terrazzo/.test(text)) return "테라조";
  if (/테라코타/.test(text)) return "테라코타";
  if (/메탈|스테인리스|metal|stainless/.test(text)) return "메탈 / 스테인리스";
  if (/부자재|접착|줄눈|실리콘|시멘트/.test(text)) return "복합소재 / 기타";
  if (!isAccessoryLikeTaxonomyText(text) && /모자이크|모자익|mosaic/.test(text)) return "세라믹";
  return "재질 미확인";
}

function inferMaterialDetail(source) {
  const text = normalizeRaw(source);
  if (/레드바디|redbody/.test(text)) return "레드바디";
  if (/화이트바디|whitebody|wb/.test(text)) return "화이트바디";
  if (/풀바디/.test(text)) return "풀바디";
  if (/컬러바디/.test(text)) return "컬러바디";
  if (/더블로딩|doubleload|dualbody/.test(text)) return "더블로딩";
  if (/싱글로딩|singleload/.test(text)) return "싱글로딩";
  if (/트리플로딩|tripleload/.test(text)) return "트리플로딩";
  if (/방오폴리싱/.test(text)) return "방오폴리싱";
  if (/글레이즈드/.test(text)) return "글레이즈드";
  if (/언글레이즈드|unglazed/.test(text)) return "언글레이즈드";
  if (/시유/.test(text)) return "시유";
  if (/무유/.test(text)) return "무유";
  if (/활면/.test(text)) return "활면";
  if (/조면/.test(text)) return "조면";
  if (/혼드|honed/.test(text)) return "혼드";
  if (/내추럴|natural/.test(text)) return "내추럴";
  if (/박판|6t/.test(text)) return "박판";
  if (/20t|20mm|페데스탈|paver/.test(text)) return "20T 외부용";
  return "";
}

function inferFunctions(product, source, sizeInfo, applications) {
  const text = normalizeRaw(source);
  const functions = [];
  const accessoryLike = isAccessoryLikeTaxonomyText(text);
  if (inferAntiSlip(source)) functions.push("논슬립");
  if (/외부|외장|outdoor|20t|페데스탈/.test(text)) functions.push("외부용");
  if (sizeInfo.group === "초대형 / 슬랩" || /슬랩|대형/.test(text)) functions.push("대형슬랩");
  if (/박판|6t|얇은/.test(text)) functions.push("박판");
  if (/계단|stair/.test(text)) functions.push("계단");
  if (!accessoryLike && /모자이크|모자익|mosaic|육각|팔각|다이아|랜턴|원형|페니|헥사|헥사곤|스틱|조약돌|pebble/.test(text)) functions.push("모자이크");
  if (/상업|commercial|카페|호텔|매장/.test(text) || applications.includes("상업용 바닥타일")) functions.push("상업용");
  if (/석기질|stoneware|보도블럭|보도블록/.test(text)) functions.push("기능성 바닥");
  if (/석재타일|stone tile|돌성분/.test(text)) functions.push("석재 질감");
  if (/복합타일|compound/.test(text)) functions.push("시공기간 단축");
  if (/20t|20mm|페데스탈|paver|옥상|정원|외부보행/.test(text)) functions.push("20T 외부용");
  if (/수영장|pool|스파|풀사이드|침수|submerged/.test(text)) functions.push("수영장용");
  if (/빅슬랩|대형판|largeformat|1200x2400|1600x3200|gauged/.test(text)) functions.push("빅슬랩");
  if (/박판|thinpanel|3\.5t|5\.5t|6t|6\.5t|덧방/.test(text)) functions.push("박판");
  if (/항균|항바이러스|antibacterial|antivirus|ag/.test(text)) functions.push("항균");
  if (/광촉매|셀프클리닝|selfcleaning|photocatalytic|공기정화|탈취/.test(text)) functions.push("광촉매 / 셀프클리닝");
  if (/점자|유도타일|tactile|시각장애|촉지도/.test(text)) functions.push("점자 / 유도");
  if (/정전기|esd|conductive|서버실|전자장비실/.test(text)) functions.push("ESD");
  if (/내산|내화학|chemical|acid|실험실|화학공장|식품공장/.test(text)) functions.push("내산 / 내화학");
  if (/고하중|주차장|parking|창고|물류|heavy/.test(text)) functions.push("고하중");
  if (/방오|내오염|stain/.test(text)) functions.push("내오염");
  if (/uv/.test(text)) functions.push("UV 코팅");
  if (Number(product.stockQty || 0) > 0) {
    functions.push("재고보유");
    functions.push("빠른출고");
  }
  return unique(functions);
}

function isAccessoryLikeTaxonomyText(text) {
  return /부자재|접착|접착제|줄눈|메지|홈멘트|시멘트|실리콘|방수|아덱스|ardex|grout|adhesive|몰딩|스커팅|코너|엣지|클립|웨지|레벨링/.test(text);
}

function inferSurfaceFinish(source) {
  const text = normalizeRaw(source);
  if (/폴리싱|polished/.test(text)) return "폴리싱";
  if (/라파토|lappato/.test(text)) return "라파토";
  if (/혼드|honed/.test(text)) return "혼드";
  if (/내추럴|natural/.test(text)) return "내추럴";
  if (/세미무광|반무광|새틴|satin/.test(text)) return "세미무광";
  if (/유광|gloss|glossy/.test(text)) return "유광";
  if (/무광|매트|matt|matte/.test(text)) return "무광";
  if (/러프|rough|r11|r12/.test(text)) return "러프";
  return "마감 미확인";
}

function inferSurfaceTexture(source) {
  const text = normalizeRaw(source);
  if (/3d|입체|양각/.test(text)) return "3D";
  if (/골지|리브드|플루티드|stripe|스트라이프/.test(text)) return "골지";
  if (/러프|rough|요철|거친|잔다듬/.test(text)) return "러프";
  if (/조면/.test(text)) return "조면";
  if (/활면|평활/.test(text)) return "활면";
  if (/매끈|유광|폴리싱/.test(text)) return "매끈함";
  return "";
}

function inferAntiSlip(source) {
  return /논슬립|미끄럼|non-slip|nonslip|\bns\b|r10|r11|r12/i.test(source);
}

function inferSlipRating(source) {
  const match = /\b(r9|r10|r11|r12|r13)\b/i.exec(String(source || ""));
  return match ? match[1].toUpperCase() : "";
}

function inferMainColor(source) {
  const text = normalizeRaw(source);
  const matches = [
    [/화이트|white|bianco|백색/, "화이트"],
    [/아이보리|ivory|크림|cream|오프화이트/, "아이보리 / 크림"],
    [/베이지|beige|sand|샌드|그레이지|travertine/, "베이지"],
    [/브라운|brown|월넛|walnut|밤색/, "브라운"],
    [/다크그레이|차콜|charcoal|darkgrey|darkgray/, "차콜 / 다크그레이"],
    [/그레이|grey|gray|회색|시멘트/, "그레이"],
    [/블랙|black|nero|검정|bk/, "블랙"],
    [/그린|green|녹색/, "그린"],
    [/블루|blue|navy|청색/, "블루"],
    [/핑크|pink/, "핑크"],
    [/레드|red|적색/, "레드"],
    [/옐로우|yellow|노랑|giallo/, "옐로우"],
    [/테라코타|오렌지|orange|terracotta/, "테라코타 / 오렌지"],
    [/골드|실버|메탈|gold|silver|metal/, "메탈릭"],
    [/믹스|mix|multi|멀티/, "멀티컬러"]
  ];
  return matches.find(([regex]) => regex.test(text))?.[1] || "색상 미확인";
}

function inferSubColor(source, mainColor) {
  const text = normalizeRaw(source);
  if (mainColor === "화이트" && /웜|warm/.test(text)) return "웜화이트";
  if (mainColor === "화이트" && /쿨|cool/.test(text)) return "쿨화이트";
  if (mainColor === "화이트" && /오프화이트/.test(text)) return "오프화이트";
  if (mainColor === "베이지" && /트래버틴|travertine/.test(text)) return "트래버틴베이지";
  if (mainColor === "베이지" && /그레이지|greige/.test(text)) return "그레이지";
  if (mainColor === "그레이" && /라이트|light|lg/.test(text)) return "라이트그레이";
  if (mainColor === "그레이" && /시멘트|cement/.test(text)) return "시멘트그레이";
  if (mainColor === "블랙" && /마블|골드|gold/.test(text)) return "블랙마블";
  return "";
}

function inferAccentColors(source) {
  const text = normalizeRaw(source);
  const accents = [];
  if (/골드|gold/.test(text)) accents.push("골드");
  if (/그레이|grey|gray|회색/.test(text)) accents.push("그레이");
  if (/브라운|brown|밤색/.test(text)) accents.push("브라운");
  if (/화이트|white|백색/.test(text)) accents.push("화이트");
  if (/블랙|black|nero|검정/.test(text)) accents.push("블랙");
  return unique(accents);
}

function inferPatternDetail(source, styles) {
  const text = normalizeRaw(source);
  if (/골드베인|goldvein/.test(text)) return "골드베인";
  if (/판다|panda/.test(text)) return "판다";
  if (/오닉스|onyx/.test(text)) return "오닉스";
  if (/칼라카타|calacatta/.test(text)) return "칼라카타";
  if (/카라라|carrara/.test(text)) return "카라라";
  if (/스타투아리오|statuario/.test(text)) return "스타투아리오";
  if (/아라베스카토|arabescato/.test(text)) return "아라베스카토";
  if (/베인컷/.test(text)) return "베인컷";
  if (/크로스컷/.test(text)) return "크로스컷";
  if (/샌드스톤|sandstone/.test(text)) return "샌드스톤";
  if (/라임스톤/.test(text)) return "라임스톤";
  if (/슬레이트/.test(text)) return "슬레이트";
  if (/마이크로시멘트|microcement/.test(text)) return "마이크로시멘트";
  if (/노출콘크리트/.test(text)) return "노출콘크리트";
  if (/시멘트|cement/.test(text)) return "시멘트";
  if (/잔칩/.test(text)) return "잔칩 테라조";
  if (/대칩/.test(text)) return "대칩 테라조";
  if (/컬러칩|멀티칩/.test(text)) return "컬러칩 테라조";
  if (/테라조/.test(text)) return "테라조";
  if (/오크|oak/.test(text)) return "오크";
  if (/티크|teak/.test(text)) return "티크";
  if (/애쉬|ash/.test(text)) return "애쉬";
  if (/월넛|walnut/.test(text)) return "월넛";
  if (/젤리지|zellige/.test(text)) return "젤리지";
  if (/서브웨이|subway/.test(text)) return "서브웨이";
  if (/롱브릭|longbrick/.test(text)) return "롱브릭";
  if (/브릭|brick/.test(text)) return "브릭";
  if (/모자이크|mosaic/.test(text)) return "모자이크";
  if (styles.includes("컬러 / 솔리드")) return "솔리드";
  return "";
}

function inferMoodTags(source, styles, mainColor) {
  const text = normalizeRaw(source);
  const tags = [];
  if (styles.includes("마블룩")) tags.push("고급스러운", "호텔스타일");
  if (/골드베인|강한베인|판다|오닉스/.test(text)) tags.push("화려함", "강한베인");
  if (styles.includes("트래버틴룩") || mainColor === "베이지") tags.push("내추럴", "따뜻한");
  if (styles.includes("콘크리트룩")) tags.push("모던", "미니멀");
  if (styles.includes("컬러 / 솔리드")) tags.push("깔끔함", "미니멀");
  if (styles.includes("엔카우스틱 / 시멘트타일")) tags.push("빈티지", "포인트");
  if (styles.includes("우드룩")) tags.push("따뜻한", "자연스러운");
  if (/카페/.test(text)) tags.push("카페");
  if (/호텔/.test(text)) tags.push("호텔");
  return unique(tags);
}

function inferShape(source, sizeInfo) {
  const text = normalizeRaw(source);
  if (/헥사곤|hex|육각/.test(text)) return "헥사곤";
  if (/헤링본/.test(text)) return "헤링본";
  if (/쉐브론/.test(text)) return "쉐브론";
  if (/피켓/.test(text)) return "피켓";
  if (/페니|원형|penny/.test(text)) return "원형 / 페니라운드";
  if (sizeInfo.width && sizeInfo.height && sizeInfo.width === sizeInfo.height) return "정사각";
  if (sizeInfo.width && sizeInfo.height) return "직사각";
  return "";
}

function makeCollectionName(product, sizeInfo, mainColor, surfaceFinish) {
  let name = String(product.name || product.modelName || "이름 미확인")
    .replace(/\([^)]*(유광|무광|반무광|논슬립|NS|matt|matte|gloss|glossy|[0-9.]+\s*m2)[^)]*\)/gi, "")
    .replace(/\b\d{2,4}\s*[xX*×]\s*\d{2,4}\b/g, "")
    .replace(/\b(white|black|grey|gray|beige|ivory|brown|green|blue|pink|yellow|red|gold|silver)\b/gi, "")
    .replace(/[._-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || name.length < 3) {
    name = [product.kind, product.option, sizeInfo.label, mainColor, surfaceFinish].filter(Boolean).join(" ");
  }
  return name || "컬렉션 미확인";
}

function buildSearchKeywords(context) {
  const {
    product,
    sizeInfo,
    materialCategory,
    surfaceFinish,
    finishGroup,
    finishDetail,
    finishPath,
    mainColor,
    styleCategories,
    applicationCategories,
    spaceCategories,
    functionCategories,
    patternDetail,
    moodTags
  } = context;
  const keywords = [
    product.name,
    product.modelName,
    product.kind,
    product.maker,
    product.option,
    sizeInfo.label,
    sizeInfo.label.replace("x", "*"),
    sizeInfo.width && sizeInfo.width === sizeInfo.height ? `${sizeInfo.width}각` : "",
    materialCategory,
    context.materialDetail,
    context.surfaceTexture,
    context.slipRating,
    finishGroup,
    finishDetail,
    finishPath,
    surfaceFinish,
    mainColor,
    patternDetail,
    ...styleCategories,
    ...applicationCategories,
    ...spaceCategories,
    ...functionCategories,
    ...moodTags
  ].filter(Boolean);
  return unique(keywords.flatMap(expandKeywordSynonyms));
}

function buildSearchableText(context) {
  const {
    product,
    sizeInfo,
    materialCategory,
    surfaceFinish,
    finishGroup,
    finishDetail,
    finishPath,
    mainColor,
    styleCategories,
    applicationCategories,
    spaceCategories,
    functionCategories,
    patternDetail,
    moodTags,
    includeBrand
  } = context;
  const fields = [
    includeBrand ? product.name : sanitizeCustomerText(product.name, product),
    includeBrand ? product.modelName : sanitizeCustomerText(product.modelName, product),
    includeBrand ? product.sourceCategoryName : sanitizeCustomerText(product.sourceCategoryName, product),
    product.countryOfOrigin,
    sizeInfo.label,
    sizeInfo.width && sizeInfo.width === sizeInfo.height ? `${sizeInfo.width}각` : "",
    materialCategory,
    context.materialDetail,
    context.surfaceTexture,
    context.slipRating,
    finishGroup,
    finishDetail,
    finishPath,
    surfaceFinish,
    mainColor,
    patternDetail,
    ...styleCategories,
    ...applicationCategories,
    ...spaceCategories,
    ...functionCategories,
    ...moodTags
  ];
  if (includeBrand) {
    fields.unshift(
      makeInternalBrandCode(product),
      makeInternalBrandName(product),
      product.managementCode,
      product.maker,
      product.catalogSource,
      product.kind
    );
  }
  return unique(fields.filter(Boolean).flatMap(expandKeywordSynonyms)).join(" ");
}

function sanitizeCustomerText(value, product) {
  let text = String(value || "").trim();
  if (!text) return "";
  const brandTerms = unique([
    makeInternalBrandCode(product),
    makeInternalBrandName(product),
    product.maker,
    product.catalogSource,
    product.kind,
    product.majorCategory
  ].filter(Boolean));
  for (const term of brandTerms) {
    const cleanTerm = String(term || "").trim();
    if (!cleanTerm) continue;
    text = text
      .replace(new RegExp(`(^|[\\s_/-])${escapeRegExp(cleanTerm)}(?=$|[\\s_/-])`, "gi"), " ")
      .replace(new RegExp(`^${escapeRegExp(cleanTerm)}\\s+`, "gi"), "");
  }
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expandKeywordSynonyms(keyword) {
  const value = String(keyword || "").trim();
  const synonyms = [value];
  if (value === "600x600") synonyms.push("600각", "600*600", "육백각");
  if (value === "300x300") synonyms.push("300각", "300*300", "삼백각");
  if (value === "포세린") synonyms.push("포쉐린", "porcelain");
  if (value === "무광") synonyms.push("매트", "matte", "matt");
  if (value === "유광") synonyms.push("글로시", "glossy");
  if (value === "논슬립") synonyms.push("미끄럼방지", "anti-slip");
  if (value === "욕실") synonyms.push("화장실", "bathroom");
  if (value === "마블룩") synonyms.push("대리석", "marble");
  if (value === "트래버틴룩") synonyms.push("트라버틴", "travertine");
  return synonyms;
}

function getReviewReasons(context) {
  const reasons = [];
  if (!context.sizeInfo.label) reasons.push("규격 미확인");
  if (context.materialCategory === "재질 미확인") reasons.push("재질 미확인");
  if (context.mainColor === "색상 미확인") reasons.push("색상 미확인");
  if (context.surfaceFinish === "마감 미확인") reasons.push("마감 미확인");
  if (context.styleCategories.includes("스타일 미확인")) reasons.push("스타일 미확인");
  if (context.applicationCategories.includes("용도 미확인")) reasons.push("용도 미확인");
  if (context.spaceCategories.includes("공간 미확인")) reasons.push("공간 미확인");
  if (!String(context.product.image || "").trim()) reasons.push("이미지 미확인");
  return reasons;
}

function buildSummary(items) {
  const tileItems = items.filter((item) => item.productType === "tile");
  const collectionCount = new Set(tileItems.map((item) => item.collectionId)).size;
  const fieldCoverage = {
    sizeLabel: coverage(tileItems, (item) => item.sizeLabel),
    materialCategory: coverage(tileItems, (item) => item.materialCategory !== "재질 미확인"),
    mainColor: coverage(tileItems, (item) => item.mainColor !== "색상 미확인"),
    surfaceFinish: coverage(tileItems, (item) => item.surfaceFinish !== "마감 미확인"),
    stylePrimary: coverage(tileItems, (item) => item.stylePrimary !== "스타일 미확인"),
    applicationCategories: coverage(tileItems, (item) => !item.applicationCategories.includes("용도 미확인")),
    spaceCategories: coverage(tileItems, (item) => !item.spaceCategories.includes("공간 미확인")),
    pcsPerBox: coverage(tileItems, (item) => item.pcsPerBox !== null),
    sqmPerBox: coverage(tileItems, (item) => item.sqmPerBox !== null),
    image: coverage(tileItems, (item) => item.image)
  };
  return {
    taxonomyVersion,
    generatedAt: new Date().toISOString(),
    totalProducts: items.length,
    tileProducts: tileItems.length,
    nonTileProducts: items.length - tileItems.length,
    estimatedTileCollections: collectionCount,
    needsReview: tileItems.filter((item) => item.needsReview).length,
    readyForAiSearch: tileItems.filter((item) => !item.needsReview).length,
    fieldCoverage,
    byBrand: countBy(tileItems, (item) => item.brand),
    bySpace: countByMany(tileItems, (item) => item.spaceCategories),
    byApplication: countByMany(tileItems, (item) => item.applicationCategories),
    byStyle: countByMany(tileItems, (item) => item.styleCategories),
    bySizeGroup: countBy(tileItems, (item) => item.sizeGroup),
    byThicknessBucket: countBy(tileItems, (item) => item.thicknessBucket),
    byMaterial: countBy(tileItems, (item) => item.materialCategory),
    byColor: countBy(tileItems, (item) => item.mainColor),
    byFinish: countBy(tileItems, (item) => item.finishGroup),
    byFinishDetail: countBy(tileItems, (item) => item.finishDetail),
    topReviewReasons: countByMany(tileItems.filter((item) => item.needsReview), (item) => item.reviewReasons).slice(0, 12)
  };
}

function coverage(items, predicate) {
  const count = items.filter((item) => Boolean(typeof predicate === "function" ? predicate(item) : item[predicate])).length;
  return {
    count,
    rate: items.length ? Number(((count / items.length) * 100).toFixed(1)) : 0
  };
}

function countBy(items, getValue) {
  const map = new Map();
  for (const item of items) {
    const value = getValue(item) || "미확인";
    map.set(value, (map.get(value) || 0) + 1);
  }
  return sortCounts(map);
}

function countByMany(items, getValues) {
  const map = new Map();
  for (const item of items) {
    const values = getValues(item);
    for (const value of Array.isArray(values) && values.length ? values : ["미확인"]) {
      map.set(value, (map.get(value) || 0) + 1);
    }
  }
  return sortCounts(map);
}

function sortCounts(map) {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
}

function buildMarkdownReport(summary) {
  return `# 정규화 필드 생성 리포트

생성일: ${summary.generatedAt}
버전: ${summary.taxonomyVersion}

## 요약

- 전체 상품: ${number(summary.totalProducts)}개
- 타일 상품: ${number(summary.tileProducts)}개
- 비타일 상품: ${number(summary.nonTileProducts)}개
- 예상 타일 컬렉션: ${number(summary.estimatedTileCollections)}개
- AI 검색 바로 사용 가능 후보: ${number(summary.readyForAiSearch)}개
- 검수 필요 후보: ${number(summary.needsReview)}개

## 필드 충실도

${Object.entries(summary.fieldCoverage).map(([key, value]) => `- ${key}: ${number(value.count)}개 / ${value.rate}%`).join("\n")}

## 브랜드별 타일 수

${summary.byBrand.map((item) => `- ${item.label}: ${number(item.count)}개`).join("\n")}

## 두께 구간별 타일 수

${summary.byThicknessBucket.map((item) => `- ${item.label}: ${number(item.count)}개`).join("\n")}

## 상위 분류

### 공간
${summary.bySpace.slice(0, 12).map((item) => `- ${item.label}: ${number(item.count)}개`).join("\n")}

### 용도
${summary.byApplication.slice(0, 12).map((item) => `- ${item.label}: ${number(item.count)}개`).join("\n")}

### 스타일
${summary.byStyle.slice(0, 12).map((item) => `- ${item.label}: ${number(item.count)}개`).join("\n")}

### 마감
${summary.byFinish.map((item) => `- ${item.label}: ${number(item.count)}개`).join("\n")}

### 세부 마감
${summary.byFinishDetail.slice(0, 12).map((item) => `- ${item.label}: ${number(item.count)}개`).join("\n")}

### 검수 필요 사유
${summary.topReviewReasons.map((item) => `- ${item.label}: ${number(item.count)}개`).join("\n")}
`;
}

function normalizeRaw(value) {
  return String(value || "").toLowerCase().replace(/[×＊]/g, "x").replace(/\s+/g, "");
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[×＊]/g, "x")
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null && value !== "")));
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function number(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

function timestampForFile(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}
