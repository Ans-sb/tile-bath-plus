import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productsPath = path.join(root, "data", "products.json");
const productsDbPath = path.join(root, "products-db.js");

const products = JSON.parse(await fs.readFile(productsPath, "utf8"));
const counters = new Map();

const codedProducts = products.map((product) => {
  const base = buildManagementCodeBase(product);
  const sequence = nextSequence(base);
  return {
    ...product,
    managementCode: `${base}-${sequence}`
  };
});

await fs.writeFile(productsPath, `${JSON.stringify(codedProducts, null, 2)}\n`, "utf8");
await fs.writeFile(productsDbPath, `window.PRODUCTS_DB = ${JSON.stringify(codedProducts, null, 2)};\n`, "utf8");

console.log(`Applied managementCode to ${codedProducts.length} products.`);

function nextSequence(base) {
  const next = (counters.get(base) || 0) + 1;
  counters.set(base, next);
  return String(next).padStart(3, "0");
}

function buildManagementCodeBase(product) {
  const productType = String(product.productType || "").trim();
  const kind = String(product.kind || "").trim();
  const source = normalizeSource(product);

  if (productType === "tile") {
    return [
      "TIL",
      tileMaterialCode(source, kind),
      tileFinishCode(source, product.finish),
      tileSizeCode(product.size, source),
      tileColorCode(source)
    ].join("-");
  }

  if (productType === "material" || kind === "부자재") {
    return ["MAT", materialItemCode(source), brandCode(product.maker, source), materialPackCode(product.size, source)].filter(Boolean).join("-");
  }

  if (kind === "양변기") return ["TOI", toiletTypeCode(source), brandCode(product.maker, source)].join("-");
  if (kind === "세면대") return ["BAS", basinTypeCode(source), brandCode(product.maker, source)].join("-");
  if (kind === "비데") return [source.includes("일체형") ? "IBD" : "SBD", brandCode(product.maker, source)].join("-");
  if (kind === "악세사리") return ["BAC", accessoryItemCode(source), finishOrColorCode(source)].join("-");
  if (kind === "욕실장") return ["CAB", cabinetSizeCode(product.size, source), finishOrColorCode(source)].join("-");
  if (kind === "수전 금구") return faucetCode(product, source);

  return ["MAT", materialItemCode(source), brandCode(product.maker, source)].join("-");
}

function normalizeSource(product) {
  return [
    product.name,
    product.kind,
    product.size,
    product.finish,
    product.option,
    product.maker,
    product.catalogType,
    product.catalogCode
  ].filter(Boolean).join(" ").toLowerCase();
}

function tileMaterialCode(source, kind) {
  if (/모자이크|mosaic/.test(source)) return "MOS";
  if (/외장|exterior/.test(source)) return "EXT";
  if (/수영장|pool/.test(source)) return "POO";
  if (/폴리싱|polished|polishing/.test(source)) return "POL";
  if (/포세린|pos/.test(source)) return "POS";
  if (/자기질|porcelain|por/.test(source)) return "POR";
  if (/도기질|ceramic|cer/.test(source) || kind.includes("벽")) return "CER";
  return "POR";
}

function tileFinishCode(source, finish) {
  const value = `${finish || ""} ${source}`;
  if (/논슬립|non.?slip|nsp/.test(value)) return "NSP";
  if (/반무광|satin|sat/.test(value)) return "SAT";
  if (/러프|rough|ruf/.test(value)) return "RUF";
  if (/혼드|honed|hon/.test(value)) return "HON";
  if (/래핑|lappato|lap/.test(value)) return "LAP";
  if (/폴리싱광|polished|polishing/.test(value)) return "POL";
  if (/유광|gloss|glossy|gls/.test(value)) return "GLS";
  return "MAT";
}

function tileSizeCode(size, source) {
  const text = `${size || ""} ${source}`.replace(/[×x]/gi, "*");
  const pair = text.match(/(1200|800|600|400|300|250|200|150|100)\s*\*\s*(3600|2400|1200|800|600|400|300|250|200|150|100)/);
  if (pair) return `${pair[1]}${pair[2]}`;
  if (/대형|빅슬랩|slab/.test(text)) return "12003600";
  return "600600";
}

function tileColorCode(source) {
  if (/다크\s*그레이|dark\s*gray|dark\s*grey|charcoal|차콜/.test(source)) return "DGY";
  if (/화이트|white|snow|ivory white/.test(source)) return "WHT";
  if (/아이보리|ivory/.test(source)) return "IVR";
  if (/베이지|beige|cream|크림/.test(source)) return "BEG";
  if (/그레이|gray|grey|silver|실버|ash|애쉬/.test(source)) return "GRY";
  if (/블랙|black/.test(source)) return "BLK";
  if (/브라운|brown|coffee|월넛|walnut/.test(source)) return "BRN";
  if (/우드|wood|oak|오크/.test(source)) return "WOD";
  if (/마블|marble|carrara|카라라/.test(source)) return "MAR";
  if (/테라조|terrazzo/.test(source)) return "TRZ";
  if (/콘크리트|concrete/.test(source)) return "CON";
  if (/시멘트|cement/.test(source)) return "CEM";
  if (/스톤|stone|rock|석재/.test(source)) return "STN";
  return "PTN";
}

function faucetCode(product, source) {
  const brand = brandCode(product.maker, source);
  const model = faucetModelCode(source);
  if (/해바라기|레인|rain/.test(source)) return ["RSH", brand, model].join("-");
  if (/주방|싱크|sink|kitchen/.test(source)) return ["KFA", brand, model].join("-");
  if (/샤워|욕조|bath|shower/.test(source)) return ["SFA", brand, model].join("-");
  return ["BFA", brand, model].join("-");
}

function faucetModelCode(source) {
  if (/블랙|black/.test(source)) return "BLK";
  if (/인출|pull|pul/.test(source)) return "PUL";
  if (/매립|wall|벽/.test(source)) return "WAL";
  if (/센서|sensor/.test(source)) return "SNS";
  return "STD";
}

function toiletTypeCode(source) {
  if (/투피스|two/.test(source)) return "TWO";
  if (/벽걸이|wall|wal/.test(source)) return "WAL";
  return "ONE";
}

function basinTypeCode(source) {
  if (/반다리|half|hlf/.test(source)) return "HLF";
  if (/긴다리|pedestal|ped/.test(source)) return "PED";
  if (/벽걸이|wall|wal/.test(source)) return "WAL";
  return "CNT";
}

function accessoryItemCode(source) {
  if (/휴지|paper|toilet roll/.test(source)) return "THD";
  if (/수건|타월|towel/.test(source)) return "TOW";
  if (/컵/.test(source)) return "CUP";
  if (/비누|soap/.test(source)) return "SOP";
  if (/코너/.test(source)) return "CSF";
  if (/선반|shelf/.test(source)) return "SHF";
  return "ACC";
}

function materialItemCode(source) {
  if (/본드|접착|adhesive/.test(source)) return "ADH";
  if (/압착|pcm/.test(source)) return "PCM";
  if (/홈멘트|cmt/.test(source)) return "CMT";
  if (/줄눈|grout|epoxy/.test(source)) return "GRT";
  if (/메지|joint/.test(source)) return "JOI";
  if (/실리콘|silicone/.test(source)) return "SIL";
  if (/방수|waterproof/.test(source)) return "WPR";
  return "ETC";
}

function cabinetSizeCode(size, source) {
  const text = `${size || ""} ${source}`;
  if (/1200/.test(text)) return "1200";
  if (/800/.test(text)) return "800";
  return "600";
}

function materialPackCode(size, source) {
  const text = `${size || ""} ${source}`.toUpperCase();
  const kg = text.match(/([0-9]{1,3})\s*KG/);
  if (kg) return `${kg[1]}KG`;
  return finishOrColorCode(source);
}

function finishOrColorCode(source) {
  if (/스테인리스|스텐|stainless|steel|stl/.test(source)) return "STL";
  return tileColorCode(source);
}

function brandCode(maker, source) {
  const text = `${maker || ""} ${source || ""}`.toLowerCase();
  if (/대림도비도스|도비도스|dobidos/.test(text)) return "DBD";
  if (/대림/.test(text)) return "DL";
  if (/로얄|royal/.test(text)) return "RC";
  if (/엘림/.test(text)) return "ELM";
  if (/american|아메리칸/.test(text)) return "AST";
  if (/계림/.test(text)) return "KLM";
  if (/쌍곰/.test(text)) return "SGB";
  if (/노루/.test(text)) return "NRP";
  if (/kcc/.test(text)) return "KCC";
  if (/삼화/.test(text)) return "SHP";
  if (/오공/.test(text)) return "OGC";
  if (/헨켈/.test(text)) return "HNK";
  if (/마페이/.test(text)) return "MPY";
  if (/테라코/.test(text)) return "TRC";
  if (/다우/.test(text)) return "DOW";
  return "TBP";
}
