import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const cli = parseCliArgs(process.argv.slice(2));
const productsPath = path.join(root, "data", "products.json");
const outputDir = path.join(root, "outputs", "db-refresh");
const reportPath = path.join(outputDir, `field-enrichment-${timestamp()}.json`);
const dryRun = String(cli.dryRun || cli["dry-run"] || "false").toLowerCase() === "true";

await fs.mkdir(outputDir, { recursive: true });

const products = JSON.parse(await fs.readFile(productsPath, "utf8"));
const beforeMetrics = collectMetrics(products);
const updates = [];

for (const product of products) {
  const changes = {};
  const reasons = {};
  const text = buildProductText(product);
  const specText = buildSpecText(product);
  const visualText = buildVisualText(product);

  const inferredProductType = inferProductType(text, product);
  if (shouldCorrectProductType(product, inferredProductType)) {
    changes.productType = inferredProductType;
    reasons.productType = "category/name product type correction";
  }

  const inferredSize = normalizeSize(product.size) || inferSize(text);
  fillIfMissing(product, changes, reasons, "size", inferredSize, "name/category/detail text size inference");

  const inferredPcs = Number(product.pcsPerBox) || inferPcsPerBox(text);
  fillIfMissingNumber(product, changes, reasons, "pcsPerBox", inferredPcs, "unit/name pcs per box inference");

  const inferredSqm = Number(product.sqmPerBox) || inferSqmPerBox(text);
  fillIfMissingNumber(product, changes, reasons, "sqmPerBox", inferredSqm, "unit/name sqm per box inference");

  const inferredMaterial = inferMaterial(specText, product);
  fillIfMissing(product, changes, reasons, "material", inferredMaterial, "name/category/source material inference");

  const inferredFinish = inferFinish(specText, product);
  if (shouldCorrectFinish(product, inferredFinish)) {
    changes.finish = inferredFinish;
    changes.surface = inferredFinish;
    reasons.finish = "finish correction from vendor rule";
    reasons.surface = "surface synced with finish correction";
  } else {
    fillIfMissing(product, changes, reasons, "finish", inferredFinish, "name/category/source finish inference");
    fillIfMissing(product, changes, reasons, "surface", inferredFinish, "surface synced with inferred finish");
  }

  const inferredOrigin = inferOrigin(specText, product);
  if (shouldCorrectOrigin(product, inferredOrigin)) {
    changes.countryOfOrigin = inferredOrigin;
    reasons.countryOfOrigin = "dirty origin/spec text cleanup";
  } else if (shouldClearOrigin(product)) {
    changes.countryOfOrigin = "";
    reasons.countryOfOrigin = "unusable dirty origin cleanup";
  } else {
    fillIfMissing(product, changes, reasons, "countryOfOrigin", inferredOrigin, "maker/category/source origin inference");
  }

  const inferredColor = inferColor(visualText, product);
  if (shouldCorrectColor(product, inferredColor)) {
    changes.color = inferredColor;
    reasons.color = "false source-name color cleanup";
  } else {
    fillIfMissing(product, changes, reasons, "color", inferredColor, "name/category/source color inference");
  }

  if (Object.keys(changes).length) {
    changes.fieldEnrichedAt = new Date().toISOString();
    changes.lastSyncedAt = new Date().toISOString();
    product.fieldEnrichmentSource = [
      product.fieldEnrichmentSource,
      ...Object.entries(reasons).map(([field, reason]) => `${field}:${reason}`)
    ].filter(Boolean).join(" / ");
    Object.assign(product, changes);
    updates.push({
      id: product.id,
      name: product.name,
      sourceSite: product.sourceSite,
      kind: product.kind,
      maker: product.maker,
      changedFields: Object.keys(changes).filter((field) => !["fieldEnrichedAt", "lastSyncedAt"].includes(field)),
      changes,
      reasons
    });
  }
}

const afterMetrics = collectMetrics(products);
const backupPath = path.join(outputDir, `products-before-field-enrichment-${timestamp()}.json`);
await fs.copyFile(productsPath, backupPath);
if (!dryRun) {
  await fs.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
}

const report = {
  ok: true,
  dryRun,
  productCount: products.length,
  updatedProducts: updates.length,
  changedFieldCounts: countChangedFields(updates),
  beforeMetrics,
  afterMetrics,
  improvement: diffMetrics(beforeMetrics, afterMetrics),
  backupPath,
  reportPath,
  samples: updates.slice(0, 80)
};

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

function fillIfMissing(product, changes, reasons, field, value, reason) {
  if (!value || String(value).trim() === "") return;
  if (String(product[field] || "").trim()) return;
  changes[field] = String(value).trim();
  reasons[field] = reason;
}

function fillIfMissingNumber(product, changes, reasons, field, value, reason) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return;
  if (Number(product[field]) > 0) return;
  changes[field] = number;
  reasons[field] = reason;
}

function shouldCorrectFinish(product, inferredFinish) {
  if (!inferredFinish) return false;
  const current = String(product.finish || product.surface || "").trim();
  if (!current) return false;
  if (current === "폴리싱" && inferredFinish === "유광") return true;
  return false;
}

function shouldCorrectProductType(product, inferredProductType) {
  if (!inferredProductType) return false;
  const current = String(product.productType || "").trim();
  if (!current) return true;
  if (current === inferredProductType) return false;
  if (current === "tile" && inferredProductType !== "tile") return true;
  if (current === "fixture" && inferredProductType === "sanitary") return true;
  return false;
}

function shouldCorrectOrigin(product, inferredOrigin) {
  const current = String(product.countryOfOrigin || "").trim();
  if (!current) return false;
  if (!inferredOrigin) return false;
  if (current === inferredOrigin) return false;
  if (current === "이태리" && inferredOrigin === "이탈리아") return true;
  return isDirtyOrigin(current);
}

function shouldClearOrigin(product) {
  const current = String(product.countryOfOrigin || "").trim();
  if (!current) return false;
  if (!isDirtyOrigin(current)) return false;
  if (/국산|한국|중국|이태리|이탈리아|스페인|인도|일본|베트남|인도네시아|필리핀|유럽|아시아/i.test(current)) return false;
  return true;
}

function isDirtyOrigin(value) {
  return /마감|표면|판매단위|ea\/box|pcs\/box|p\/t|box|몰드|커팅|plt|중량|규격|시리즈|색상|바디/i.test(String(value || ""));
}

function shouldCorrectColor(product, inferredColor) {
  const current = String(product.color || "").trim();
  if (!current) return false;
  const sourceSite = String(product.sourceSite || "").trim().toLowerCase();
  if (sourceSite === "thegoldtile" && current === "골드") {
    const safeText = [
      product.name,
      product.modelName,
      product.option,
      product.features,
      product.sourceCategoryName
    ].filter(Boolean).join(" ");
    if (/골드|\bgold\b|giallo|yellow|옐로우|노랑/i.test(safeText)) return false;
    return true;
  }
  if (/판매단위|ea\/box|pcs\/box|p\/t|box|바디|색상|계열/i.test(current) && inferredColor && current !== inferredColor) {
    return true;
  }
  return false;
}

function buildProductText(product) {
  return [
    product.name,
    product.modelName,
    product.managementCode,
    product.majorCategory,
    product.productType,
    product.kind,
    product.option,
    product.size,
    product.material,
    product.patternCategory,
    product.finish,
    product.surface,
    product.countryOfOrigin,
    product.maker,
    product.unit,
    product.color,
    product.features,
    product.stockText,
    product.sourceSite,
    product.sourceUrl,
    product.sourceProductId,
    product.sourceCategoryCode,
    product.sourceCategoryName,
    product.catalogSource
  ].filter(Boolean).join(" ");
}

function buildSpecText(product) {
  return [
    product.name,
    product.modelName,
    product.managementCode,
    product.productType,
    product.kind,
    product.option,
    product.size,
    product.material,
    product.patternCategory,
    product.finish,
    product.surface,
    product.countryOfOrigin,
    product.maker,
    product.unit,
    product.color,
    product.features,
    product.stockText,
    product.sourceCategoryCode,
    product.sourceCategoryName
  ].filter(Boolean).join(" ");
}

function buildVisualText(product) {
  return [
    product.name,
    product.modelName,
    product.managementCode,
    product.option,
    product.size,
    product.material,
    product.patternCategory,
    product.finish,
    product.surface,
    product.countryOfOrigin,
    product.maker,
    product.unit,
    product.features,
    product.stockText,
    product.sourceCategoryName
  ].filter(Boolean).join(" ");
}

function inferSize(text) {
  const normalized = String(text || "").replace(/[×＊]/g, "x");
  const match = normalized.match(/(?:^|[^\d])(\d{2,4})\s*[xX*]\s*(\d{2,4})(?:[^\d]|$)/);
  if (!match) return "";
  return normalizeSize(`${match[1]}x${match[2]}`);
}

function normalizeSize(value) {
  const text = String(value || "").trim().replace(/[×＊]/g, "x");
  const match = text.match(/(\d{2,4})\s*[xX*]\s*(\d{2,4})/);
  if (!match) return "";
  return `${Number(match[1])}x${Number(match[2])}`;
}

function inferPcsPerBox(text) {
  const source = String(text || "");
  const patterns = [
    /(\d+(?:\.\d+)?)\s*pcs\s*\/?\s*box/i,
    /(\d+(?:\.\d+)?)\s*장\s*\/?\s*(?:box|박스|박)/i,
    /(\d+(?:\.\d+)?)\s*매\s*\/?\s*(?:box|박스|박)/i,
    /(\d+(?:\.\d+)?)\s*ea\s*\/?\s*(?:box|박스|박)/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return Number(match[1]) || 0;
  }
  return 0;
}

function inferSqmPerBox(text) {
  const source = String(text || "");
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:㎡|m2|m²)\s*\/?\s*(?:box|박스|박)?/i,
    /\((\d+(?:\.\d+)?)\s*(?:㎡|m2|m²)\)/i,
    /(\d+(?:\.\d+)?)\s*헤베/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return Number(match[1]) || 0;
  }
  return 0;
}

function inferMaterial(text, product) {
  const raw = String(text || "");
  const compact = normalizeMatchText(raw);
  if (product.productType === "material") return "부자재";
  if (product.productType === "sanitary" || /양변기|세면기|소변기|비데|수전|샤워|욕조|악세사리|욕실장/.test(raw)) return "욕실제품";
  if (/(^|[\s\]])포\s*[\dA-Z]/i.test(raw) || /후판.*포/i.test(raw)) return "포세린";
  if (/포쉐린|포세린|porcelain|\bpor\b|\bpos\b/.test(compact)) return "포세린";
  if (/폴리싱|polishing|polished|polishedtile|\bpol\b/.test(compact)) return "폴리싱";
  if (/자기질/.test(raw)) return "자기질";
  if (/도기질|세라믹|ceramic|\bcer\b/.test(compact)) return "도기질";
  if (/모자이크|mosaic|페니|헥사|육각|pebble/.test(compact)) return "모자이크";
  if (/천연석|대리석|마블|marble|travertine|트래버틴|라임스톤|limestone|스톤|stone|슬레이트|slate/.test(compact)) return "스톤";
  if (/테라조|terrazzo/.test(compact)) return "테라조";
  if (/우드|wood/.test(compact)) return "우드";
  if (/유리|glass/.test(compact)) return "유리";
  if (/시멘트|cement|콘크리트|concrete/.test(compact)) return "시멘트";
  return "";
}

function inferFinish(text, product) {
  const raw = String(text || "");
  const compact = normalizeMatchText(raw);
  const lower = raw.toLowerCase();
  if (product.productType !== "tile") return "";
  if (/폴리싱|폴리쉬|폴리시|polishing|polished|polish/.test(compact)) return "유광";
  if (hasGlossyPCode(raw)) return "유광";
  if (/반무광|세미무광|새틴|satin|라파토|라빠또|lappato|\blap\b/.test(lower)) return "반무광";
  if (/논슬립|미끄럼방지|nonslip|non[-\s]?slip|nsp|\bns\b|\br10\b|\br11\b|\br12\b|grip|계단/.test(lower)) return "논슬립";
  if (/유광|글로시|gloss|glossy|gls/.test(compact)) return "유광";
  if (/무광|매트|맷|matt|matte|\bmat\b/.test(lower)) return "무광";
  if (hasMatteMCode(raw)) return "무광";
  if (/혼드|honed/.test(compact)) return "혼드";
  if (/엠보|emboss|양각/.test(compact)) return "엠보";
  if (/3d|입체/.test(compact)) return "3D";
  if (/텍스처|텍스쳐|texture|브러쉬|브러시|brush|러프|rough|요철|조면/.test(compact)) return "텍스쳐";
  if (isAjProduct(product) && /포쉐린|포세린|porcelain|\bpor\b/.test(compact)) return "무광";
  if (/내추럴|natural/.test(compact)) return "내추럴";
  return "";
}

function inferOrigin(text, product) {
  const raw = String(text || "");
  const compact = normalizeMatchText(raw);
  const maker = String(product.maker || "").trim();
  const originMap = [
    [/국산|한국|korea|kor|domestic/i, "국산"],
    [/중국|china|\bcn\b/i, "중국"],
    [/이태리|이탈리아|italy|italia/i, "이탈리아"],
    [/스페인|spain|espana/i, "스페인"],
    [/인도|india/i, "인도"],
    [/일본|japan/i, "일본"],
    [/베트남|vietnam/i, "베트남"],
    [/인도네시아|indonesia|인니/i, "인도네시아"],
    [/필리핀|philippines|필리핀/i, "필리핀"],
    [/유럽|europe|it&sp/i, "유럽"],
    [/아시아|asia/i, "아시아"]
  ];
  for (const [pattern, value] of originMap) {
    if (pattern.test(maker) || pattern.test(raw) || pattern.test(compact)) return value;
  }
  return "";
}

function inferColor(text) {
  const raw = String(text || "");
  const compact = normalizeMatchText(raw);
  const colorRules = [
    ["다크그레이", /다크그레이|진그레이|차콜|charcoal|darkgrey|darkgray|\bdgy\b|\banthracite\b|grafito|grafite/],
    ["라이트그레이", /라이트그레이|연그레이|lightgrey|lightgray|\blgr\b|\bl\.gr\b/],
    ["그레이", /그레이|회색|grey|gray|\bgr\b|gris|greige|greva/],
    ["화이트", /화이트|백색|흰색|white|\bwht\b|\bwt\b|blanco|blanca|bianco|\bbia\b|milk/],
    ["아이보리", /아이보리|ivory|\biv\b|\bivr\b/],
    ["베이지", /베이지|beige|\bbg\b|\bbeg\b|sand|샌드/],
    ["블랙", /블랙|검정|black|\bblk\b|\bbk\b/],
    ["브라운", /브라운|갈색|brown|\bbrn\b|\bbr\b|월넛|walnut|caramel|cotto|terracota/],
    ["우드", /우드|wood|오크|oak|티크|teak/],
    ["블루", /블루|청색|blue|\bblu\b|aqua|sky|navy|cobalt/],
    ["그린", /그린|녹색|green|\bgrn\b|sage|mint|olive|forest/],
    ["핑크", /핑크|pink/],
    ["레드", /레드|빨강|red/],
    ["옐로우", /옐로우|노랑|yellow|giallo/],
    ["골드", /골드|\bgold\b/],
    ["테라코타", /테라코타|terracotta|오렌지|orange/],
    ["멀티", /멀티|multi|혼합|믹스|mix/]
  ];
  for (const [label, pattern] of colorRules) {
    if (pattern.test(compact) || pattern.test(raw.toLowerCase())) return label;
  }
  return "";
}

function inferProductType(text) {
  const raw = String(text || "");
  if (/부\s*자\s*재|접착|본드|압착|시멘트|줄눈|메지|실리콘|방수|홈멘트|몰탈|몰그린|공구|타일스페이서|코너비드/i.test(raw)) return "material";
  if (/양변기|세면기|세면대|소변기|비데|수전|샤워|욕조|수건걸이|휴지걸이|컵대|비누|선반|슬라이드바|스프레이건|폽업|팝업|트랩|유가|욕실장|악세사리|액세서리/i.test(raw)) return "sanitary";
  if (/타일|포세린|포쉐린|폴리싱|도기질|자기질|모자이크|석재|고벽돌|600[*x×]\d{3,4}|300[*x×]\d{3}/i.test(raw)) return "tile";
  return "";
}

function hasGlossyPCode(value) {
  const text = String(value || "");
  if (!text || hasNonTileMaterialCue(text)) return false;
  const compact = text.toUpperCase().replace(/\s+/g, " ").trim();
  return [
    /(?:^|[\s(/_.-])P(?=\)|\(|$|[\s/_-])/,
    /(?:^|[\s(/_.-])[A-Z]{1,3}\/P(?=\)|\(|$|[\s/_-])/,
    /\(P\)/,
    /\b[A-Z가-힣]*\d{2,}[A-Z0-9-]*P\b/
  ].some((pattern) => pattern.test(compact));
}

function hasMatteMCode(value) {
  const text = String(value || "");
  if (!text || hasNonTileMaterialCue(text)) return false;
  const compact = text.toUpperCase().replace(/\s+/g, " ").trim();
  return [
    /(?:^|[\s(/_.-])M(?=\)|$|\s)/,
    /\(M\)/,
    /-M(?:$|[\s)\]])/,
    /\b[A-Z가-힣]*\d{2,}[A-Z0-9-]*M\b/
  ].some((pattern) => pattern.test(compact));
}

function hasNonTileMaterialCue(value) {
  return /부\s*자\s*재|폼블럭|몰그린|접착|본드|시멘트|줄눈|메지|실리콘|방수|공구|부속/i.test(String(value || ""));
}

function isAjProduct(product) {
  return String(product.catalogSource || product.kind || product.maker || "").trim().toUpperCase() === "AJ";
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[×＊]/g, "x")
    .replace(/\s+/g, "")
    .replace(/[(){}\[\]_/·]/g, "");
}

function collectMetrics(items) {
  const fields = ["modelName", "size", "material", "patternCategory", "finish", "surface", "countryOfOrigin", "pcsPerBox", "sqmPerBox", "color", "costPrice", "stock", "image"];
  const metrics = {};
  for (const field of fields) metrics[field] = 0;
  for (const item of items) {
    for (const field of fields) {
      if (field === "stock") {
        if (!(Number(item.stockQty) > 0) && !String(item.stockText || "").trim()) metrics[field] += 1;
      } else if (["pcsPerBox", "sqmPerBox", "costPrice"].includes(field)) {
        if (!(Number(item[field]) > 0)) metrics[field] += 1;
      } else if (!String(item[field] || "").trim()) {
        metrics[field] += 1;
      }
    }
  }
  return metrics;
}

function diffMetrics(before, after) {
  const diff = {};
  for (const key of Object.keys(before)) diff[key] = before[key] - after[key];
  return diff;
}

function countChangedFields(entries) {
  const counts = {};
  for (const entry of entries) {
    for (const field of entry.changedFields || []) counts[field] = (counts[field] || 0) + 1;
  }
  return counts;
}

function parseCliArgs(args) {
  const result = {};
  for (const arg of args) {
    const match = String(arg || "").match(/^--([^=]+)=(.*)$/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
