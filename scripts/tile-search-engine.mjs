const DEFAULT_LIMIT = 80;
const PUBLIC_STOCK_EXCLUDE_THRESHOLD_QTY = Math.max(0, Number(
  process.env.PUBLIC_STOCK_EXCLUDE_THRESHOLD_QTY
  || process.env.STOCK_EXCLUDE_THRESHOLD_QTY
  || process.env.MIN_PUBLIC_STOCK_QTY
  || 50
) || 50);
const PUBLIC_EXPOSE_ALL_STOCK_PRODUCTS = /^(1|true|yes)$/i.test(String(process.env.PUBLIC_EXPOSE_ALL_STOCK_PRODUCTS || "true"));
const STOCK_INQUIRY_THRESHOLD_QTY = Math.max(0, Number(process.env.STOCK_INQUIRY_THRESHOLD_QTY || 100) || 100);
const searchTextCache = new WeakMap();
const tileKnowledgeTextCache = new WeakMap();
const mosaicTextCache = new WeakMap();
const searchChunksCache = new Map();

export const SEARCH_ENGINE_VERSION = "2026-06-06-jajaego-search-v1";

export const QUERY_DICTIONARY = {
  origins: [
    { value: "중국", terms: ["중국", "중국산", "china", "cn"] },
    { value: "한국", terms: ["한국", "국산", "국내산", "대한민국", "korea", "kr"] },
    { value: "이탈리아", terms: ["이탈리아", "이태리", "italy", "italia"] },
    { value: "스페인", terms: ["스페인", "spain", "espana"] },
    { value: "인도", terms: ["인도", "india"] },
    { value: "베트남", terms: ["베트남", "vietnam"] },
    { value: "유럽", terms: ["유럽", "europe"] }
  ],
  spaces: [
    { value: "욕실", terms: ["욕실", "화장실", "샤워부스", "bathroom", "bath"] },
    { value: "주방", terms: ["주방", "싱크대", "백스플래시", "backsplash", "kitchen"] },
    { value: "거실", terms: ["거실", "아트월", "living"] },
    { value: "현관", terms: ["현관", "입구", "entrance"] },
    { value: "베란다", terms: ["베란다", "발코니", "balcony"] },
    { value: "상업공간", terms: ["상업", "카페", "호텔", "매장", "식당", "오피스", "commercial"] },
    { value: "외부공간", terms: ["외부", "테라스", "옥상", "정원", "outdoor"] }
  ],
  applications: [
    { value: "바닥타일", terms: ["바닥", "floor", "플로어"] },
    { value: "벽타일", terms: ["벽", "wall", "벽용"] },
    { value: "벽·바닥 겸용 타일", terms: ["겸용", "벽바닥", "벽 바닥"] },
    { value: "외부용 타일", terms: ["외부", "외장", "테라스", "outdoor"] },
    { value: "수영장 타일", terms: ["수영장", "pool", "스파", "풀사이드"] },
    { value: "모자이크 타일", terms: ["모자이크", "모자이크타일", "모자익", "mosaic", "페니", "페니라운드", "penny", "헥사", "헥사곤", "hex", "육각", "팔각", "랜턴", "다이아", "스틱", "조약돌", "pebble"] },
    { value: "슬랩 / 대형타일", terms: ["슬랩", "빅슬랩", "대형", "초대형", "large format"] },
    { value: "계단 타일", terms: ["계단", "stair", "스텝", "노즈"] }
  ],
  colors: [
    { value: "화이트", terms: ["화이트", "백색", "흰색", "white", "wht"] },
    { value: "아이보리 / 크림", terms: ["아이보리", "크림", "ivory", "cream", "오프화이트"] },
    { value: "베이지", terms: ["베이지", "beige", "샌드", "sand", "그레이지"] },
    { value: "브라운", terms: ["브라운", "갈색", "brown", "월넛", "오크", "우드"] },
    { value: "그레이", terms: ["그레이", "회색", "grey", "gray", "시멘트"] },
    { value: "차콜 / 다크그레이", terms: ["차콜", "다크그레이", "darkgray", "darkgrey"] },
    { value: "블랙", terms: ["블랙", "검정", "black", "nero"] },
    { value: "그린", terms: ["그린", "초록", "green"] },
    { value: "블루", terms: ["블루", "파랑", "blue", "navy"] },
    { value: "핑크", terms: ["핑크", "분홍", "pink"] },
    { value: "레드", terms: ["레드", "빨강", "red"] },
    { value: "옐로우", terms: ["옐로우", "노랑", "yellow"] },
    { value: "테라코타 / 오렌지", terms: ["테라코타", "오렌지", "orange", "terracotta"] }
  ],
  styles: [
    { value: "마블룩", terms: ["마블", "마블룩", "대리석", "marble", "카라라", "칼라카타", "베인"] },
    { value: "스톤룩", terms: ["스톤", "스톤룩", "석재", "stone", "라임스톤", "슬레이트"] },
    { value: "트래버틴룩", terms: ["트래버틴", "트라버틴", "travertine"] },
    { value: "콘크리트룩", terms: ["콘크리트", "시멘트", "cement", "concrete"] },
    { value: "테라조룩", terms: ["테라조", "terrazzo"] },
    { value: "우드룩", terms: ["우드", "wood", "나뭇결", "오크", "월넛"] },
    { value: "컬러 / 솔리드", terms: ["솔리드", "무지", "단색", "solid"] },
    { value: "패턴 / 데코", terms: ["패턴", "데코", "pattern", "포인트", "장식", "엔카우스틱"] },
    { value: "브릭 / 서브웨이", terms: ["브릭", "서브웨이", "brick", "subway"] },
    { value: "입체 / 텍스처", terms: ["입체", "3d", "텍스처", "텍스쳐", "골지", "리브드"] },
    { value: "메탈룩", terms: ["메탈", "metal", "티타늄", "알루미늄", "로비"] },
    { value: "글라스룩", terms: ["글라스", "glass", "유리", "반짝"] }
  ],
  finishes: [
    { value: "유광", terms: ["유광", "글로시", "gloss", "glossy", "gls"] },
    { value: "무광", terms: ["무광", "매트", "맷", "matte", "matt", "mat"] },
    { value: "반무광", terms: ["반무광", "세미무광", "새틴", "satin", "라파토", "lappato"] },
    { value: "폴리싱", terms: ["폴리싱", "polishing", "polished"] },
    { value: "논슬립", terms: ["논슬립", "미끄럼방지", "r10", "r11", "r12", "nonslip", "non-slip"] },
    { value: "혼드", terms: ["혼드", "honed"] },
    { value: "내추럴", terms: ["내추럴", "natural"] },
    { value: "엠보", terms: ["엠보", "emboss", "양각"] },
    { value: "3D", terms: ["3d", "입체"] },
    { value: "텍스쳐", terms: ["텍스쳐", "텍스처", "texture", "러프", "rough", "요철", "거친", "골지", "리브드", "플루티드"] }
  ],
  materials: [
    { value: "포세린", terms: ["포세린", "포쉐린", "porcelain"] },
    { value: "세라믹", terms: ["세라믹", "ceramic"] },
    { value: "자기질", terms: ["자기질"] },
    { value: "도기질", terms: ["도기질"] },
    { value: "석기질", terms: ["석기질", "stoneware", "보도블럭", "보도블록"] },
    { value: "석재 타일", terms: ["석재", "석재타일", "stone tile", "돌성분"] },
    { value: "복합대리석", terms: ["복합대리석", "엔지니어드스톤", "engineered stone", "인조석"] },
    { value: "시멘트 타일", terms: ["시멘트타일", "엔카우스틱", "cement tile"] },
    { value: "메탈", terms: ["메탈", "metal", "티타늄", "알루미늄", "스테인리스"] },
    { value: "천연석", terms: ["천연석", "대리석", "라임스톤", "슬레이트"] },
    { value: "유리", terms: ["유리", "glass"] }
  ],
  moods: [
    { value: "고급스러운", terms: ["고급", "프리미엄", "럭셔리", "호텔느낌", "호텔스타일"] },
    { value: "따뜻한", terms: ["따뜻", "웜톤", "포근", "warm"] },
    { value: "내추럴", terms: ["내추럴", "자연스러운", "natural"] },
    { value: "모던", terms: ["모던", "modern"] },
    { value: "미니멀", terms: ["미니멀", "minimal"] },
    { value: "카페", terms: ["카페", "cafe"] },
    { value: "호텔", terms: ["호텔", "hotel"] }
  ],
  specialTypes: [
    { value: "논슬립", terms: ["논슬립", "미끄럼방지", "r10", "r11", "r12"] },
    { value: "20T 외부용", terms: ["20t", "20mm", "페데스탈", "옥상", "정원", "외부보행"] },
    { value: "수영장용", terms: ["수영장", "pool", "스파", "풀사이드", "침수"] },
    { value: "계단", terms: ["계단", "스텝", "노즈", "홈파기", "stair"] },
    { value: "빅슬랩", terms: ["빅슬랩", "대형판", "large format", "1200x2400", "1600x3200"] },
    { value: "박판", terms: ["박판", "thin panel", "덧방", "6t", "6.5t"] },
    { value: "항균", terms: ["항균", "항바이러스", "위생", "병원", "학교"] },
    { value: "광촉매 / 셀프클리닝", terms: ["광촉매", "셀프클리닝", "자가세정", "공기정화", "탈취"] },
    { value: "점자 / 유도", terms: ["점자", "유도타일", "시각장애", "촉지도"] },
    { value: "ESD", terms: ["esd", "정전기", "서버실", "전자장비실"] },
    { value: "내산 / 내화학", terms: ["내산", "내화학", "화학공장", "실험실", "식품공장"] },
    { value: "고하중", terms: ["고하중", "주차장", "parking", "창고", "물류"] }
  ],
  priceRanges: [
    { value: "1만원 미만", terms: ["저가", "만원미만", "1만원미만"] },
    { value: "1만-3만원", terms: ["1만", "2만", "3만원이하", "저렴"] },
    { value: "3만-5만원", terms: ["3만", "4만", "5만원이하"] },
    { value: "5만-10만원", terms: ["5만", "6만", "7만", "8만", "9만", "10만원이하"] },
    { value: "10만원 이상", terms: ["고가", "프리미엄", "10만원이상"] }
  ]
};

export const QUERY_STOPWORDS = new Set([
  "찾아줘", "찾아", "검색", "검색해줘", "보여줘", "추천", "추천해줘", "해줘", "좀", "타일", "상품", "제품", "있어", "있는", "으로", "에서"
].map(normalizeSearch));

export function parseTileSearchIntent(value, options = {}) {
  const audience = options.audience === "admin" ? "admin" : "customer";
  const raw = String(value || "").trim();
  if (!raw) return emptyIntent();
  const normalizedRaw = normalizeSearch(raw);
  const compactRaw = normalizeRaw(raw);
  const sizes = detectSizes(raw);
  const thicknesses = detectThicknesses(raw);
  const intent = {
    ...emptyIntent(),
    active: true,
    raw,
    normalizedRaw,
    audience,
    origins: detectValues(compactRaw, QUERY_DICTIONARY.origins),
    spaces: detectValues(compactRaw, QUERY_DICTIONARY.spaces),
    applications: detectValues(compactRaw, QUERY_DICTIONARY.applications),
    colors: detectValues(compactRaw, QUERY_DICTIONARY.colors),
    styles: detectValues(compactRaw, QUERY_DICTIONARY.styles),
    finishes: detectValues(compactRaw, QUERY_DICTIONARY.finishes),
    materials: detectValues(compactRaw, QUERY_DICTIONARY.materials),
    moods: detectValues(compactRaw, QUERY_DICTIONARY.moods),
    specialTypes: detectValues(compactRaw, QUERY_DICTIONARY.specialTypes),
    sizes,
    thicknesses,
    priceRanges: detectValues(compactRaw, QUERY_DICTIONARY.priceRanges),
    antiSlipRequired: /논슬립|미끄럼방지|안미끄|안전한바닥|r10|r11|r12|nonslip|non-slip/.test(compactRaw),
    stockRequired: /재고|보유|빠른출고|출고가능|있는|있어/.test(compactRaw) && !/재고없|품절|없는/.test(compactRaw),
    stockEmpty: /재고없|품절|없는/.test(compactRaw),
    internalBrands: audience === "admin" ? detectInternalBrands(raw, options.products || []) : [],
    productCodes: filterProductCodesAgainstDimensions(detectProductCodes(raw), sizes, thicknesses)
  };

  intent.freeTokens = getFreeTokens(raw, intent);
  intent.tokenGroups = buildTokenGroups(intent);
  if (!intent.tokenGroups.length && normalizedRaw) intent.tokenGroups = [makeTokenGroup(normalizedRaw)];
  return intent;
}

export function searchTiles(products, query, options = {}) {
  const audience = options.audience === "admin" ? "admin" : "customer";
  const limit = Math.max(1, Number(options.limit || DEFAULT_LIMIT));
  const intent = options.intent || parseTileSearchIntent(query, { audience, products });
  const tileProducts = products.filter((item) => item?.productType === "tile" && (audience === "admin" || !isPublicStockExcluded(item)));
  const results = tileProducts
    .map((item) => {
      const searchText = getSearchText(item, audience);
      if (!passesHardRules(item, intent, audience, searchText)) return null;
      const score = scoreTile(item, intent, searchText, audience);
      if (intent.active && hasActiveIntentCriteria(intent) && score <= 0) return null;
      return {
        item,
        score,
        reasons: explainScore(item, intent, searchText)
      };
    })
    .filter(Boolean)
    .sort(sortResults);
  return {
    engineVersion: SEARCH_ENGINE_VERSION,
    intent,
    total: results.length,
    results: results.slice(0, limit)
  };
}

export function summarizeResult(result) {
  const item = result.item || result;
  return {
    id: item.id || "",
    name: item.productName || item.skuName || item.modelName || item.collectionName || item.product?.name || "",
    score: result.score || item.taxonomySearchScore || 0,
    size: item.sizeLabel || "",
    finish: item.finishGroup || item.surfaceFinish || "",
    color: item.mainColor || "",
    style: Array.isArray(item.styleCategories) ? item.styleCategories.join(", ") : "",
    origin: item.originRegion || "",
    stockQty: Number(item.stockQty || item.product?.stockQty || 0),
    image: item.image || item.product?.image || "",
    reasons: result.reasons || []
  };
}

function emptyIntent() {
  return {
    active: false,
    raw: "",
    normalizedRaw: "",
    audience: "customer",
    tokenGroups: [],
    origins: [],
    spaces: [],
    applications: [],
    colors: [],
    styles: [],
    finishes: [],
    materials: [],
    moods: [],
    specialTypes: [],
    sizes: [],
    thicknesses: [],
    priceRanges: [],
    internalBrands: [],
    freeTokens: [],
    antiSlipRequired: false,
    stockRequired: false,
    stockEmpty: false
    , productCodes: []
  };
}

function getSearchText(item, audience) {
  const raw = audience === "admin"
    ? String(item.adminSearchableText || item.adminSearchText || item.searchText || "")
    : String(item.customerSearchableText || item.customerSearchText || item.searchText || "");
  if (!item || typeof item !== "object") return normalizeSearch(raw);
  const cacheKey = audience === "admin" ? "admin" : "customer";
  const cached = searchTextCache.get(item);
  if (cached?.[cacheKey]?.raw === raw) return cached[cacheKey].value;
  const value = normalizeSearch(raw);
  searchTextCache.set(item, {
    ...(cached || {}),
    [cacheKey]: { raw, value }
  });
  return value;
}

function passesHardRules(item, intent, audience, searchText) {
  if (audience !== "admin" && isPublicStockExcluded(item)) return false;
  if (!intent?.active) return true;
  if (intent.stockRequired && Number(item.stockQty || item.product?.stockQty || 0) <= STOCK_INQUIRY_THRESHOLD_QTY) return false;
  if (intent.stockEmpty && Number(item.stockQty || item.product?.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY) return false;
  if (intent.internalBrands?.length && audience === "admin" && !intent.internalBrands.includes(item.internalBrandCode)) return false;
  if (intent.productCodes?.length && !matchesProductCode(item, intent.productCodes)) return false;
  if (intent.sizes?.length && !intent.sizes.some((value) => item.sizeLabel === value || item.sizeThicknessLabel?.startsWith(value))) return false;
  if (intent.thicknesses?.length && !intent.thicknesses.some((value) => Math.round(Number(item.thicknessMm || 0)) === value)) return false;
  if (intent.origins?.length && !hasSemanticAny([item.originRegion, item.originCountry, item.countryOfOrigin], intent.origins, searchText)) return false;
  if (intent.colors?.length && !hasSemanticAny([item.mainColor, item.subColor, item.accentColor, ...(item.accentColors || [])], intent.colors, searchText)) return false;
  if (intent.finishes?.length && !hasSemanticAny([item.finishGroup, item.finishDetail, item.finishPath, item.surfaceFinish, ...(item.functionCategories || [])], intent.finishes, searchText)) return false;
  if (intent.styles?.length && !hasSemanticAny([...(item.styleCategories || []), item.stylePrimary, item.styleSecondary, item.patternDetail], intent.styles, searchText)) return false;
  if (intent.materials?.length && !hasSemanticAny([item.materialCategory, item.materialDetail], intent.materials, searchText)) return false;
  if (intent.applications?.length && !hasSemanticAny(item.applicationCategories, intent.applications, searchText)) return false;
  if (intent.antiSlipRequired && !item.antiSlip && !hasSemanticAny(item.functionCategories, ["논슬립"], searchText)) return false;
  if (isMosaicIntent(intent) && !isMosaicItem(item, searchText)) return false;
  return true;
}

function isPublicStockExcluded(item) {
  if (PUBLIC_EXPOSE_ALL_STOCK_PRODUCTS) return false;
  return Number(item?.stockQty || item?.product?.stockQty || 0) <= PUBLIC_STOCK_EXCLUDE_THRESHOLD_QTY;
}

function scoreTile(item, intent, searchText, audience) {
  const stockQty = Number(item.stockQty || item.product?.stockQty || 0);
  if (!intent?.active || !hasActiveIntentCriteria(intent)) return (stockQty > STOCK_INQUIRY_THRESHOLD_QTY ? 20 : 1);
  let score = stockQty > STOCK_INQUIRY_THRESHOLD_QTY ? 24 : 0;
  score += scoreExact(intent.origins, [item.originRegion, item.originCountry, item.countryOfOrigin], 12);
  score += scoreExact(intent.spaces, item.spaceCategories, 18);
  score += scoreExact(intent.applications, item.applicationCategories, 20);
  score += scoreExact(intent.colors, [item.mainColor, item.subColor, item.accentColor, ...(item.accentColors || [])], 24);
  score += scoreExact(intent.styles, item.styleCategories, 22);
  score += scoreExact(intent.finishes, [item.finishGroup, item.finishDetail, item.finishPath, item.surfaceFinish], 24);
  score += scoreExact(intent.materials, [item.materialCategory, item.materialDetail], 16);
  score += scoreExact(intent.moods, item.moodTags, 10);
  score += scoreExact(intent.specialTypes, item.functionCategories, 24);
  if (intent.antiSlipRequired && item.antiSlip) score += 18;
  if (intent.sizes?.length && intent.sizes.some((value) => item.sizeLabel === value || item.sizeThicknessLabel?.startsWith(value))) score += 42;
  if (intent.thicknesses?.length && intent.thicknesses.some((value) => Math.round(Number(item.thicknessMm || 0)) === value)) score += 28;
  if (intent.internalBrands?.length && audience === "admin" && intent.internalBrands.includes(item.internalBrandCode)) score += 28;
  score += scoreProductCodes(item, intent.productCodes);
  score += scoreTokenGroups(intent.tokenGroups, searchText);
  score += scoreSimilarity(intent.freeTokens, searchText, 22);
  score += scoreTileKnowledge(item, intent, searchText);
  return score;
}

function scoreTileKnowledge(item, intent, searchText = "") {
  const text = getTileKnowledgeText(item, searchText);
  const raw = normalizeSearch(intent.raw || "");
  const hasSpace = (value) => (intent.spaces || []).includes(value) || raw.includes(normalizeSearch(value));
  const hasApp = (value) => (intent.applications || []).includes(value) || raw.includes(normalizeSearch(value));
  const isFloorIntent = hasApp("바닥타일") || /바닥|floor/.test(raw);
  const isWallIntent = hasApp("벽타일") || /벽|wall/.test(raw);
  const isWetFloor = isFloorIntent && (hasSpace("욕실") || hasSpace("외부공간") || hasSpace("상업공간") || /샤워|수영장|베란다|현관/.test(raw));
  let score = 0;

  if (isMosaicIntent(intent)) {
    if ((item.applicationCategories || []).includes("모자이크 타일")) score += 42;
    if ((item.functionCategories || []).includes("모자이크")) score += 30;
    if (/모자이크|모자익|mosaic|페니|헥사|헥사곤|육각|팔각|랜턴|다이아|스틱|조약돌|pebble|penny|hex|시트/.test(text)) score += 20;
    if (/부자재|접착|줄눈|메지|홈멘트|시멘트|실리콘|방수/.test(text)) score -= 70;
  }
  if (isWetFloor) {
    if (item.antiSlip || text.includes("논슬립")) score += 30;
    if (/포세린|자기질|컬러바디|풀바디/.test(text)) score += 18;
    if (/무광|세미무광|러프|매트|r10|r11|r12/.test(text)) score += 14;
    if (/유광|글로시|폴리싱/.test(text)) score -= 18;
  }
  if (hasSpace("외부공간") || hasApp("외부용 타일")) {
    if (/포세린|자기질|컬러바디|풀바디/.test(text)) score += 20;
    if (item.antiSlip || /논슬립|러프|r10|r11|r12/.test(text)) score += 24;
    if (/유광|글로시|폴리싱/.test(text)) score -= 16;
  }
  if (isWallIntent && !isFloorIntent) {
    if (/도기질|세라믹|화이트바디|레드바디|글레이즈드/.test(text)) score += 14;
    if (/글라스|글라스룩|모자이크|메탈|메탈룩/.test(text)) score += 12;
  }
  if (/20t|20mm|페데스탈|옥상|정원|테라스/.test(raw)) {
    if (/20t외부용|포세린|외부용|논슬립|러프/.test(text)) score += 30;
    if (/도기질|벽전용|글라스/.test(text)) score -= 24;
  }
  if (/빅슬랩|대형판|1200x2400|1600x3200|상판|가구마감/.test(raw)) {
    if (/빅슬랩|박판|포세린|대형슬랩|마블룩|스톤룩/.test(text)) score += 28;
    if (/모자이크|소형/.test(text)) score -= 18;
  }
  return score;
}

function explainScore(item, intent, searchText) {
  const reasons = [];
  if (Number(item.stockQty || item.product?.stockQty || 0) > STOCK_INQUIRY_THRESHOLD_QTY) reasons.push("재고 우선");
  for (const [label, values, fields] of [
    ["원산지", intent.origins, [item.originRegion, item.originCountry]],
    ["제품군", intent.applications, item.applicationCategories],
    ["색상", intent.colors, [item.mainColor, item.subColor]],
    ["디자인", intent.styles, item.styleCategories],
    ["마감", intent.finishes, [item.finishGroup, item.finishDetail, item.surfaceFinish]],
    ["소재", intent.materials, [item.materialCategory, item.materialDetail]],
    ["규격", intent.sizes, [item.sizeLabel]],
    ["두께", intent.thicknesses?.map((value) => `${value}T`), [item.thicknessMm ? `${Math.round(Number(item.thicknessMm))}T` : ""]],
    ["품번", intent.productCodes, getProductCodeSearchValues(item)]
  ]) {
    if (values?.length && hasAny(fields, values)) reasons.push(`${label} 일치`);
  }
  if (isMosaicIntent(intent) && isMosaicItem(item, searchText)) reasons.push("모자이크 의도 일치");
  return reasons.slice(0, 6);
}

function sortResults(a, b) {
  const score = Number(b.score || 0) - Number(a.score || 0);
  if (score) return score;
  const stock = Number(b.item.stockQty || b.item.product?.stockQty || 0) - Number(a.item.stockQty || a.item.product?.stockQty || 0);
  if (stock) return stock;
  return String(a.item.collectionName || a.item.productName || a.item.product?.name || "").localeCompare(String(b.item.collectionName || b.item.productName || b.item.product?.name || ""), "ko", { numeric: true });
}

function hasActiveIntentCriteria(intent) {
  return [
    "origins", "spaces", "applications", "colors", "styles", "finishes", "materials",
    "moods", "specialTypes", "sizes", "thicknesses", "priceRanges", "internalBrands", "freeTokens"
  ].some((field) => Array.isArray(intent[field]) && intent[field].length)
    || Boolean(intent.productCodes?.length)
    || Boolean(intent.antiSlipRequired || intent.stockRequired || intent.stockEmpty);
}

function getFreeTokens(raw, intent) {
  const consumed = new Set([
    ...intent.origins.map(normalizeSearch),
    ...intent.spaces.map(normalizeSearch),
    ...intent.applications.map(normalizeSearch),
    ...intent.colors.map(normalizeSearch),
    ...intent.styles.map(normalizeSearch),
    ...intent.finishes.map(normalizeSearch),
    ...intent.materials.map(normalizeSearch),
    ...intent.moods.map(normalizeSearch),
    ...intent.specialTypes.map(normalizeSearch),
    ...intent.sizes.map(normalizeSearch),
    ...intent.thicknesses.map((value) => normalizeSearch(`${value}t`)),
    ...intent.priceRanges.map(normalizeSearch),
    ...intent.internalBrands.map(normalizeSearch),
    ...intent.productCodes.map(normalizeSearch),
    "재고", "보유", "빠른출고", "출고가능", "있는", "있어", "타일", "상품", "제품"
  ]);
  return String(raw || "")
    .split(/[\s,./·]+/)
    .map((part) => normalizeSearch(part.replace(/(으로|로|을|를|이|가|은|는|의|도|만|좀|중|인|한|있는|없는|보여줘|찾아줘|추천해줘|추천|검색)$/g, "")))
    .filter((token) => token && token.length >= 2 && !consumed.has(token) && !QUERY_STOPWORDS.has(token));
}

function buildTokenGroups(intent) {
  return unique([
    ...intent.origins,
    ...intent.spaces,
    ...intent.applications,
    ...intent.colors,
    ...intent.styles,
    ...intent.finishes,
    ...intent.materials,
    ...intent.moods,
    ...intent.specialTypes,
    ...intent.sizes,
    ...intent.thicknesses.map((value) => `${value}T`),
    ...intent.priceRanges,
    ...intent.productCodes,
    ...intent.freeTokens
  ]).map(makeTokenGroup);
}

function makeTokenGroup(value) {
  const base = normalizeSearch(value);
  const aliases = [base];
  const aliasMap = [
    ["중국", ["중국산", "china", "cn"]],
    ["한국", ["국산", "국내산", "korea", "kr"]],
    ["베이지", ["beige", "beg", "샌드", "그레이지"]],
    ["그레이", ["grey", "gray", "회색", "gry"]],
    ["화이트", ["white", "백색", "wht"]],
    ["블랙", ["black", "검정", "blk", "nero"]],
    ["마블룩", ["마블", "대리석", "marble", "카라라", "칼라카타"]],
    ["스톤룩", ["스톤", "stone", "석재"]],
    ["트래버틴룩", ["트래버틴", "트라버틴", "travertine"]],
    ["콘크리트룩", ["콘크리트", "시멘트", "cement", "concrete"]],
    ["테라조룩", ["테라조", "terrazzo"]],
    ["우드룩", ["우드", "wood", "나뭇결"]],
    ["모자이크 타일", ["모자이크", "모자이크타일", "mosaic", "페니", "penny", "헥사", "헥사곤", "hex", "육각", "팔각", "랜턴", "다이아", "스틱", "조약돌", "pebble"]],
    ["유광", ["glossy", "gloss", "글로시", "gls"]],
    ["무광", ["matte", "matt", "매트", "맷", "mat"]],
    ["논슬립", ["미끄럼방지", "nonslip", "non-slip", "nsp"]],
    ["바닥타일", ["바닥", "floor"]],
    ["벽타일", ["벽", "wall"]]
  ];
  for (const [canonical, values] of aliasMap) {
    const canonicalToken = normalizeSearch(canonical);
    const valueTokens = values.map(normalizeSearch);
    if (base === canonicalToken || valueTokens.includes(base)) aliases.push(canonicalToken, ...valueTokens);
  }
  if (/^\d{3,4}x\d{3,4}$/.test(base)) aliases.push(base.replace("x", "*"));
  return unique(aliases.filter(Boolean));
}

function detectValues(compactRaw, entries) {
  return unique(entries.filter((entry) => entry.terms.some((term) => compactRaw.includes(normalizeRaw(term)))).map((entry) => entry.value));
}

function detectSizes(raw) {
  const text = String(raw || "").replace(/[×＊]/g, "x");
  const sizes = [];
  const explicit = text.match(/(\d{2,4})\s*[xX*]\s*(\d{2,4})/);
  if (explicit) sizes.push(`${Number(explicit[1])}x${Number(explicit[2])}`);
  const square = text.match(/(\d{2,4})\s*각/);
  if (square) sizes.push(`${Number(square[1])}x${Number(square[1])}`);
  const spaced = text.match(/(\d{3,4})\s+(\d{3,4})/);
  if (!sizes.length && spaced) sizes.push(`${Number(spaced[1])}x${Number(spaced[2])}`);
  return unique(sizes);
}

function detectThicknesses(raw) {
  const matches = [...String(raw || "").matchAll(/(\d{1,2}(?:\.\d+)?)\s*(?:t|T|mm|MM)/g)];
  return unique(matches
    .map((match) => Number(match[1]))
    .filter((value) => value >= 3 && value <= 30)
    .map((value) => Math.round(value)));
}

function detectInternalBrands(raw, products) {
  const source = String(raw || "").toUpperCase();
  return unique(products
    .map((item) => item.internalBrandCode)
    .filter((code) => code && new RegExp(`(^|[^A-Z0-9])${escapeRegExp(code)}([^A-Z0-9]|$)`).test(source)));
}

function detectProductCodes(raw) {
  const text = String(raw || "");
  const rawTokens = text.match(/[A-Za-z가-힣]*\d+[A-Za-z0-9가-힣-]*|[A-Za-z]{2,}-\d+[A-Za-z0-9-]*/g) || [];
  return unique(rawTokens
    .flatMap((token) => {
      const normalized = normalizeProductCode(token);
      const parts = String(token).split(/[-_/.\s]+/)
        .map(normalizeProductCode)
        .filter((part) => part.length >= 3 && /\d/.test(part));
      return [normalized, ...parts];
    })
    .filter((token) => token.length >= 3)
    .filter((token) => /\d/.test(token))
    .filter((token) => !/^\d{2,4}X\d{2,4}$/.test(token))
    .filter((token) => !/^\d{1,2}T$/.test(token))
    .slice(0, 12));
}

function filterProductCodesAgainstDimensions(codes = [], sizes = [], thicknesses = []) {
  const blocked = new Set();
  for (const size of sizes || []) {
    const normalized = normalizeProductCode(size);
    blocked.add(normalized);
    for (const part of String(size || "").split(/[xX*×＊]/)) {
      const number = normalizeProductCode(part);
      if (/^\d{2,4}$/.test(number)) blocked.add(number);
    }
  }
  for (const thickness of thicknesses || []) {
    blocked.add(normalizeProductCode(`${thickness}T`));
    blocked.add(normalizeProductCode(`${thickness}`));
  }
  return (codes || []).filter((code) => !blocked.has(code));
}

function matchesProductCode(item, codes = []) {
  if (!codes.length) return false;
  const values = getProductCodeSearchValues(item).map(normalizeProductCode).filter(Boolean);
  return codes.some((code) => values.some((value) => (
    value === code
    || value.includes(code)
    || (value.length >= 5 && code.includes(value))
  )));
}

function scoreProductCodes(item, codes = []) {
  if (!codes.length) return 0;
  const values = getProductCodeSearchValues(item).map(normalizeProductCode).filter(Boolean);
  let best = 0;
  for (const code of codes) {
    for (const value of values) {
      if (value === code) best = Math.max(best, 180);
      else if (value.includes(code) || (value.length >= 5 && code.includes(value))) best = Math.max(best, 120);
    }
  }
  return best;
}

function getProductCodeSearchValues(item) {
  const baseValues = [
    item.managementCode,
    item.productId,
    item.sourceProductId,
    item.skuName,
    item.customerSkuName,
    item.modelName,
    item.collectionName,
    item.customerCollectionName
  ].filter(Boolean);
  const tokens = baseValues.flatMap((value) => String(value).match(/[A-Za-z가-힣]*\d+[A-Za-z0-9가-힣-]*|[A-Za-z]{2,}-\d+[A-Za-z0-9-]*/g) || []);
  return unique([...baseValues, ...tokens]);
}

function scoreExact(needles, values, weight) {
  const normalizedValues = normalizeArray(values).map(normalizeSearch);
  return (needles || []).some((needle) => normalizedValues.includes(normalizeSearch(needle))) ? weight : 0;
}

function scoreTokenGroups(groups, searchText) {
  if (!groups?.length) return 0;
  return groups.reduce((sum, group) => sum + (group.some((token) => searchText.includes(token)) ? 7 : 0), 0);
}

function scoreSimilarity(tokens, searchText, maxScore) {
  const usableTokens = (tokens || []).filter((token) => token.length >= 2);
  if (!usableTokens.length) return 0;
  const matched = usableTokens.filter((token) => searchText.includes(token) || getPartialTokenScore(token, searchText) > 0.72).length;
  return Math.round((matched / usableTokens.length) * maxScore);
}

function getPartialTokenScore(token, searchText) {
  if (!token || !searchText) return 0;
  if (searchText.includes(token)) return 1;
  const chunks = getSearchChunks(searchText);
  let best = 0;
  for (const chunk of chunks) {
    const common = [...token].filter((char) => chunk.includes(char)).length;
    best = Math.max(best, common / Math.max(token.length, chunk.length));
  }
  return best;
}

function isMosaicIntent(intent) {
  const raw = normalizeSearch(intent?.raw || "");
  return (intent?.applications || []).includes("모자이크 타일")
    || (intent?.specialTypes || []).includes("모자이크")
    || /모자이크|모자익|mosaic|페니|헥사|헥사곤|육각|팔각|랜턴|다이아|스틱|조약돌|pebble|penny|hex/.test(raw);
}

function isMosaicItem(item, searchText = "") {
  const text = getMosaicText(item, searchText);
  if (/부자재|접착|접착제|줄눈|메지|홈멘트|시멘트|실리콘|방수|아덱스|ardex|grout|adhesive/.test(text)) return false;
  return (item.applicationCategories || []).includes("모자이크 타일")
    || (item.functionCategories || []).includes("모자이크")
    || /모자이크|모자익|mosaic|페니|헥사|헥사곤|육각|팔각|랜턴|다이아|스틱|조약돌|pebble|penny|hex/.test(text);
}

function hasAny(values = [], needles = []) {
  const normalizedValues = normalizeArray(values).map(normalizeSearch);
  return (needles || []).some((needle) => normalizedValues.includes(normalizeSearch(needle)));
}

function hasSemanticAny(values = [], needles = [], searchText = "") {
  if (hasAny(values, needles)) return true;
  const text = normalizeSearch(searchText);
  return (needles || []).some((needle) => {
    const group = makeTokenGroup(needle);
    return group.some((token) => text.includes(token));
  });
}

function getTileKnowledgeText(item, searchText = "") {
  if (!item || typeof item !== "object") {
    return normalizeSearch(searchText);
  }
  const raw = [
    searchText,
    item.materialCategory,
    item.materialDetail,
    item.finishGroup,
    item.finishDetail,
    item.surfaceFinish,
    item.surfaceTexture,
    item.slipRating,
    ...(item.functionCategories || []),
    ...(item.applicationCategories || []),
    ...(item.spaceCategories || [])
  ].filter(Boolean).join(" ");
  const cached = tileKnowledgeTextCache.get(item);
  if (cached?.raw === raw) return cached.value;
  const value = normalizeSearch(raw);
  tileKnowledgeTextCache.set(item, { raw, value });
  return value;
}

function getMosaicText(item, searchText = "") {
  if (!item || typeof item !== "object") {
    return normalizeSearch(searchText);
  }
  const raw = [
    searchText,
    item.patternDetail,
    ...(item.applicationCategories || []),
    ...(item.functionCategories || [])
  ].filter(Boolean).join(" ");
  const cached = mosaicTextCache.get(item);
  if (cached?.raw === raw) return cached.value;
  const value = normalizeSearch(raw);
  mosaicTextCache.set(item, { raw, value });
  return value;
}

function getSearchChunks(searchText) {
  const key = String(searchText || "");
  const cached = searchChunksCache.get(key);
  if (cached) return cached;
  const chunks = key.split(/\s+/).filter((part) => part.length >= 2);
  if (searchChunksCache.size > 10000) searchChunksCache.clear();
  searchChunksCache.set(key, chunks);
  return chunks;
}

function normalizeArray(values) {
  return Array.isArray(values) ? values.filter(Boolean) : [values].filter(Boolean);
}

export function normalizeRaw(value) {
  return String(value || "").toLowerCase().replace(/[×＊]/g, "x").replace(/\s+/g, "");
}

export function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/중국산/g, "중국")
    .replace(/국산|국내산/g, "한국")
    .replace(/재고있는|재고있|재고보유|출고가능|바로출고|당일출고/g, "재고")
    .replace(/육백각/g, "600x600")
    .replace(/삼백각/g, "300x300")
    .replace(/(\d{3,4})각/g, "$1x$1")
    .replace(/포쉐린/g, "포세린")
    .replace(/화장실|샤워부스/g, "욕실")
    .replace(/대리석/g, "마블")
    .replace(/트라버틴/g, "트래버틴")
    .replace(/모자익|모자이크타일|모자이크용/g, "모자이크")
    .replace(/페니라운드/g, "페니 원형")
    .replace(/헥사곤/g, "헥사 육각")
    .replace(/호텔느낌/g, "호텔")
    .replace(/카페느낌/g, "카페")
    .replace(/따뜻한느낌/g, "따뜻한")
    .replace(/매트|맷/g, "무광")
    .replace(/글로시/g, "유광")
    .replace(/미끄럼방지/g, "논슬립")
    .replace(/[×＊]/g, "x")
    .replace(/[^0-9a-z가-힣]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProductCode(value) {
  return String(value || "").toUpperCase().replace(/[^0-9A-Z가-힣]/g, "");
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null && value !== "")));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
