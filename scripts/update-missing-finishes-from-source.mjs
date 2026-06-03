import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const cli = parseCliArgs(process.argv.slice(2));
const productsPath = path.join(root, "data", "products.json");
const outputDir = path.join(root, "outputs", "finish-update");
const reportPath = path.join(outputDir, `missing-finish-update-${timestamp()}.json`);
const limit = Number(cli.limit || 0) || 0;
const dryRun = String(cli.dryRun || cli["dry-run"] || "false") === "true";
const concurrency = Math.max(1, Math.min(10, Number(cli.concurrency || 4) || 4));
const fetchDetails = String(cli.details || cli.fetchDetails || cli["fetch-details"] || "true") !== "false";
const sourceSiteFilter = String(cli.sourceSite || cli["source-site"] || "").trim().toLowerCase();
const detailCapableSites = new Set(["tile114", "sgcera", "thegoldtile", "myhwashin"]);

const env = await loadEnvFile(path.join(root, ".env"));
await fs.mkdir(outputDir, { recursive: true });

const products = await readJsonArray(productsPath);
const referenceFinishIndex = buildReferenceFinishIndex(products);
const missingCandidates = products
  .filter((product) => product.productType === "tile")
  .filter((product) => !hasExplicitFinish(product) || hasAjFinishCorrection(product))
  .filter((product) => !sourceSiteFilter || String(product.sourceSite || "").toLowerCase() === sourceSiteFilter)
  .filter((product) => product.sourceUrl || product.sourceProductId);
const targets = limit ? missingCandidates.slice(0, limit) : missingCandidates;

const sessions = new Map();
const updates = [];
const failures = [];
let checked = 0;

console.log(`[finish-update] targets=${targets.length} dryRun=${dryRun}`);

await mapWithConcurrency(targets, concurrency, async (product) => {
  try {
    const result = await inspectProduct(product);
    checked += 1;
    if (result.finish) {
      updates.push(result);
      if (updates.length % 25 === 0) console.log(`  updated candidates=${updates.length} checked=${checked}/${targets.length}`);
    }
    if (checked % 250 === 0 || checked === targets.length) console.log(`  checked=${checked}/${targets.length} updates=${updates.length}`);
    await sleep(30);
  } catch (error) {
    failures.push({ id: product.id, name: product.name, sourceSite: product.sourceSite, message: error.message });
  }
});

if (!dryRun && updates.length) {
  const byId = new Map(updates.map((entry) => [entry.id, entry]));
  for (const product of products) {
    const update = byId.get(product.id);
    if (!update) continue;
    product.finish = update.finish;
    product.surface = update.finish;
    product.features = appendFeature(product.features, update.finish);
    product.finishSource = update.source;
    product.finishUpdatedAt = new Date().toISOString();
    product.lastSyncedAt = new Date().toISOString();
  }
  await fs.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
}

const report = {
  ok: true,
  dryRun,
  checked,
  updates: updates.length,
  failures: failures.length,
  byFinish: countBy(updates, (entry) => entry.finish),
  bySource: countBy(updates, (entry) => entry.sourceSite),
  sampleUpdates: updates.slice(0, 80),
  sampleFailures: failures.slice(0, 80),
  productsPath,
  reportPath
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

async function inspectProduct(product) {
  const baseText = [
    product.name,
    product.modelName,
    product.option,
    product.sourceCategoryName,
    product.features,
    product.material,
    product.patternCategory,
    product.size
  ].filter(Boolean).join(" ");
  const ajVendorFinish = inferAjVendorFinish(product, baseText);
  if (ajVendorFinish.finish) {
    return makeUpdate(product, ajVendorFinish.finish, "aj-category-finish-rule", { rule: ajVendorFinish.rule });
  }

  const localFinish = inferFinishFromTrustedText(baseText);
  if (localFinish) {
    return makeUpdate(product, localFinish, "local-category-name-spec");
  }

  const linkedSetFinish = inferFinishFromLinkedSetProduct(product, referenceFinishIndex);
  if (linkedSetFinish.finish) {
    return makeUpdate(product, linkedSetFinish.finish, "linked-set-product-finish", {
      referenceCodes: linkedSetFinish.referenceCodes,
      referenceProducts: linkedSetFinish.referenceProducts
    });
  }

  if (!shouldFetchDetail(product)) {
    return { id: product.id, finish: "" };
  }

  const html = await fetchDetailHtml(product);
  const detail = parseTrustedDetail(product, html);
  const detailFinish = inferFinishFromTrustedText([
    detail.labelledText,
    detail.title,
    detail.summaryText,
    detail.breadcrumb,
    product.sourceCategoryName,
    product.option
  ].filter(Boolean).join(" "));
  if (detailFinish) {
    return makeUpdate(product, detailFinish, "source-detail-labelled-category");
  }
  return { id: product.id, finish: "" };
}

function makeUpdate(product, finish, source, extra = {}) {
  return {
    id: product.id,
    name: product.name,
    sourceSite: product.sourceSite || product.catalogSource || product.kind || "",
    sourceProductId: product.sourceProductId || "",
    sourceUrl: product.sourceUrl || "",
    previousFinish: product.finish || "",
    finish,
    source,
    ...extra
  };
}

function inferAjVendorFinish(product, text) {
  if (!isAjProduct(product)) return { finish: "" };
  const existingFinish = String(product.finish || product.surface || "").trim();
  const normalizedText = normalizeMatchText(text);

  if (existingFinish === "폴리싱") {
    return { finish: "유광", rule: "aj-polishing-existing-finish-to-glossy" };
  }
  if (existingFinish) return { finish: "" };

  if (/무광|매트|맷|matt|matte|\bmat\b/.test(String(text || "").toLowerCase())) {
    return { finish: "무광", rule: "aj-explicit-matte" };
  }
  if (/유광|글로시|gloss|glossy|gls/.test(normalizedText)) {
    return { finish: "유광", rule: "aj-explicit-glossy" };
  }
  if (/폴리싱|polishing|polished/.test(normalizedText)) {
    return { finish: "유광", rule: "aj-polishing-category-to-glossy" };
  }
  if (/포쉐린|포세린|porcelain/.test(normalizedText)) {
    return { finish: "무광", rule: "aj-porcelain-category-to-matte" };
  }
  return { finish: "" };
}

function hasAjFinishCorrection(product) {
  return isAjProduct(product) && String(product.finish || product.surface || "").trim() === "폴리싱";
}

function isAjProduct(product) {
  return String(product.catalogSource || product.kind || product.maker || "").trim().toUpperCase() === "AJ";
}

function inferFinishFromLinkedSetProduct(product, index) {
  const referenceCodes = extractSetReferenceCodes(product);
  if (!referenceCodes.length) return { finish: "" };
  const sourceMap = index.get(getSourceKey(product));
  if (!sourceMap) return { finish: "" };

  const matches = [];
  for (const code of referenceCodes) {
    const entries = sourceMap.get(code) || [];
    for (const entry of entries) {
      if (entry.id === product.id) continue;
      matches.push({ code, ...entry });
    }
  }
  if (!matches.length) return { finish: "" };

  const finishes = [...new Set(matches.map((entry) => entry.finish).filter(Boolean))];
  if (finishes.length !== 1) return { finish: "" };
  return {
    finish: finishes[0],
    referenceCodes,
    referenceProducts: matches.slice(0, 8)
  };
}

function buildReferenceFinishIndex(items) {
  const index = new Map();
  for (const product of items) {
    const finish = String(product.finish || product.surface || "").trim();
    if (product.productType !== "tile" || !finish) continue;

    const sourceKey = getSourceKey(product);
    if (!index.has(sourceKey)) index.set(sourceKey, new Map());
    const sourceMap = index.get(sourceKey);
    const codes = [
      ...extractModelCodes(product.name),
      ...extractModelCodes(product.modelName),
      ...extractSetReferenceCodes(product)
    ];

    for (const code of new Set(codes)) {
      if (!sourceMap.has(code)) sourceMap.set(code, []);
      sourceMap.get(code).push({
        id: product.id,
        name: product.name,
        sourceProductId: product.sourceProductId || "",
        finish
      });
    }
  }
  return index;
}

function extractSetReferenceCodes(product) {
  const text = [product.features, product.memo, product.note].filter(Boolean).join(" / ");
  const codes = [];
  const setRegex = /\[세트\]([^/]+)/gi;
  let match;
  while ((match = setRegex.exec(text))) {
    codes.push(...extractModelCodes(match[1]));
  }
  return [...new Set(codes)];
}

function extractModelCodes(value) {
  const text = String(value || "").toUpperCase();
  const codes = [];
  const regexes = [
    /\b\d{2}[A-Z]\s*-\s*\d{2,5}[A-Z]?\b/g,
    /\b[A-Z@]{1,6}\s*\d{2,5}(?:[-\s]\d{2,5}[A-Z]?)?\b/g,
    /\b\d{2,5}-\d{2,5}[A-Z]?\b/g,
    /\b\d{5,6}\b/g
  ];
  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(text))) {
      const raw = match[0];
      const normalized = normalizeProductCode(raw);
      if (isUsableProductCode(raw, normalized)) codes.push(normalized);
    }
  }
  return [...new Set(codes)];
}

function normalizeProductCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isUsableProductCode(raw, normalized) {
  if (!normalized || normalized.length < 4) return false;
  if (/[X×＊*]/i.test(raw)) return false;
  const commonSizeNumbers = new Set(["1000", "1200", "1600", "2400", "2600", "3000", "3200", "3600"]);
  if (/^\d+$/.test(normalized) && commonSizeNumbers.has(normalized)) return false;
  return true;
}

function getSourceKey(product) {
  return [
    product.sourceSite,
    product.catalogSource || product.kind || product.maker || ""
  ].map((value) => String(value || "").trim().toLowerCase()).join(":");
}

function parseTrustedDetail(product, html) {
  const labelled = [];
  const rowRegexes = [
    /<tr\b[^>]*>\s*<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)(?:<\/td>|<\/tr>)/gi,
    /<li\b[^>]*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>\s*<span\b[^>]*>([\s\S]*?)<\/span>\s*<\/li>/gi,
    /<tr\b[^>]*>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi
  ];
  for (const regex of rowRegexes) {
    let match;
    while ((match = regex.exec(html))) {
      const key = cleanHtml(match[1]).replace(/\s+/g, "");
      const value = cleanHtml(match[2]);
      if (!key || !value || value === "-") continue;
      if (isTrustedSpecKey(key)) labelled.push(`${key}: ${value}`);
    }
  }

  const title = cleanHtml(
    findFirst(html, /<div class=["']pd_view_tit["']>([\s\S]*?)<\/div>/i)
      || findFirst(html, /<p class=["']tit["']>([\s\S]*?)<\/p>/i)
      || findFirst(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
      || findFirst(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/i)
      || product.name
  );
  const breadcrumb = cleanHtml(
    findFirst(html, /<div class=["']breadcrumb["'][\s\S]*?<\/div>/i)
      || findFirst(html, /<nav\b[^>]*class=["'][^"']*breadcrumb[^"']*["'][\s\S]*?<\/nav>/i)
  );
  const summaryText = parseSummaryText(product, html);
  return {
    title,
    breadcrumb,
    summaryText,
    labelledText: labelled.join(" / ")
  };
}

function shouldFetchDetail(product) {
  if (!fetchDetails) return false;
  const site = String(product.sourceSite || "").toLowerCase();
  return detailCapableSites.has(site);
}

function parseSummaryText(product, html) {
  const site = String(product.sourceSite || "").toLowerCase();
  if (site === "thegoldtile") {
    const lines = Array.from(String(html || "").matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
      .map((match) => cleanHtml(match[1]))
      .filter((line) => /sheet|tile|size|pcs|box|matt|matte|gloss|polished|non|slip|유광|무광|논슬립|폴리싱|반무광|표면|마감/i.test(line));
    return lines.join(" / ");
  }
  return "";
}

function isTrustedSpecKey(key) {
  return /마감|표면|유광|무광|finish|surface|품명|품번|분류|종류|규격|소재|재질|특징|메모|시리즈/i.test(key);
}

async function fetchDetailHtml(product) {
  const site = String(product.sourceSite || "").toLowerCase();
  if (site === "tile114") {
    const session = await getTile114Session(product);
    return await session.fetchText(product.sourceUrl || `/Web/productView.asp?ItemId=${encodeURIComponent(product.sourceProductId)}`);
  }
  if (site === "sgcera") {
    const session = await getSgCeraSession();
    return await session.fetchText(product.sourceUrl);
  }
  if (site === "thegoldtile") {
    const session = await getGoldTileSession();
    return await session.fetchText(product.sourceUrl);
  }
  if (site === "myhwashin") {
    const session = await getHwashinSession();
    return await session.fetchText(product.sourceUrl);
  }
  return "";
}

async function getTile114Session(product) {
  const code = String(product.catalogSource || product.kind || product.maker || "").toUpperCase();
  const prefix = code === "AJ" ? "AJTILE114"
    : code === "US" ? "usong"
      : code === "VG" ? "VGTILE114"
        : "VGTILE114";
  const key = `tile114:${prefix}`;
  if (sessions.has(key)) return sessions.get(key);
  const loginUrl = firstEnvValue(`${prefix}_LOGIN_URL`);
  const userId = firstEnvValue(`${prefix}_USER_ID`);
  const password = firstEnvValue(`${prefix}_PASSWORD`);
  if (!loginUrl || !userId || !password) throw new Error(`${prefix} 로그인 정보가 없습니다.`);
  const session = createSession(loginUrl);
  await session.fetchText("/Inc/LogInOut.asp", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({ LogOut: "0", mb_id: userId, mb_password: password }).toString()
  });
  const home = await session.fetchText("/Web/product.Asp");
  if (!/로그아웃|LogOutPut/i.test(home)) throw new Error(`${prefix} 로그인 실패`);
  sessions.set(key, session);
  return session;
}

async function getSgCeraSession() {
  if (sessions.has("sgcera")) return sessions.get("sgcera");
  const session = createSession(firstEnvValue("SGCERA_LOGIN_URL") || "https://www.sgcera.kr/front/index.php?g_page=member&m_page=member01");
  await session.fetchText("/front/index.php?g_page=member&m_page=member01&act=loginOk", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({
      act: "loginOk",
      returnURL: "",
      userId: firstEnvValue("SGCERA_USER_ID"),
      userPw: firstEnvValue("SGCERA_PASSWORD")
    }).toString()
  });
  sessions.set("sgcera", session);
  return session;
}

async function getGoldTileSession() {
  if (sessions.has("thegoldtile")) return sessions.get("thegoldtile");
  const session = createSession(firstEnvValue("thegold_LOGIN_URL", "THEGOLD_LOGIN_URL", "GOLDTILE_LOGIN_URL") || "https://thegoldtile.com/");
  await session.fetchText("/backpg/login.cm", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      back_url: "Lw%3D%3D",
      back_url_auth: "",
      used_login_btn: "Y",
      uid: firstEnvValue("thegold_USER_ID", "THEGOLD_USER_ID", "GOLDTILE_USER_ID"),
      passwd: firstEnvValue("thegold_PASSWORD", "THEGOLD_PASSWORD", "GOLDTILE_PASSWORD"),
      auto_login: "ok"
    }).toString()
  });
  sessions.set("thegoldtile", session);
  return session;
}

async function getHwashinSession() {
  if (sessions.has("myhwashin")) return sessions.get("myhwashin");
  const session = createSession(firstEnvValue("hwashin_LOGIN_URL", "HWASHIN_LOGIN_URL") || "https://www.myhwashin.com/front/main");
  const loginPage = await session.fetchText("/front/login/login");
  const token = findFirst(loginPage, /name=["']witplus_csrf_token["'][^>]*value=["']([^"']+)/i) || session.csrfToken || "";
  await session.fetchText("/front/auth/login_check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      witplus_csrf_token: token,
      recaptcha_yn: "N",
      captcha: "",
      prev_url: "",
      login_user_id: firstEnvValue("hwashin_USER_ID", "HWASHIN_USER_ID"),
      login_passwd: firstEnvValue("hwashin_PASSWORD", "HWASHIN_PASSWORD")
    }).toString()
  });
  sessions.set("myhwashin", session);
  return session;
}

function createSession(baseUrl) {
  const origin = new URL(baseUrl).origin;
  const cookieJar = new Map();
  return {
    csrfToken: "",
    absoluteUrl(pathValue) {
      return new URL(pathValue, `${origin}/`).toString();
    },
    async fetch(pathValue, options = {}) {
      const headers = new Headers(options.headers || {});
      const cookie = Array.from(cookieJar.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
      if (cookie) headers.set("Cookie", cookie);
      if (!headers.has("User-Agent")) headers.set("User-Agent", "Mozilla/5.0 TileBathPlusFinishUpdater/1.0");
      const response = await fetch(new URL(pathValue, `${origin}/`), { ...options, headers, redirect: "manual" });
      storeCookies(response.headers, cookieJar);
      const textToken = response.headers.get("x-csrf-token");
      if (textToken) this.csrfToken = textToken;
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        return await this.fetch(response.headers.get("location"), { method: "GET" });
      }
      if (!response.ok) throw new Error(`요청 실패 ${origin}: ${response.status}`);
      return response;
    },
    async fetchText(pathValue, options = {}) {
      const response = await this.fetch(pathValue, options);
      const html = await response.text();
      const token = findFirst(html, /name=["']witplus_csrf_token["'][^>]*value=["']([^"']+)/i);
      if (token) this.csrfToken = token;
      return html;
    }
  };
}

function inferFinishFromTrustedText(value) {
  const text = normalizeMatchText(value);
  const rawText = String(value || "");
  const lowerText = rawText.toLowerCase();
  if (!text) return "";
  if (/폴리싱|폴리쉬|폴리시|polishing|polished|polish|polishedtile/.test(text)) return "유광";
  if (hasGlossyPCode(rawText)) return "유광";
  if (/반무광|세미무광|새틴|satin|라파토|lappato|\blap\b/.test(lowerText)) return "반무광";
  if (/논슬립|미끄럼방지|nonslip|non[-\s]?slip|nsp|\bns\b|\br10\b|\br11\b|\br12\b|grip|계단/.test(lowerText)) return "논슬립";
  if (/유광|글로시|gloss|glossy|gls/.test(text)) return "유광";
  if (/무광|매트|맷|matt|matte|\bmat\b/.test(lowerText)) return "무광";
  if (hasMatteMCode(rawText)) return "무광";
  if (/혼드|honed/.test(text)) return "혼드";
  if (/엠보|emboss|양각/.test(text)) return "엠보";
  if (/3d|입체/.test(text)) return "3D";
  if (/텍스처|텍스쳐|texture|브러쉬|브러시|brush|러프|rough|요철|조면/.test(text)) return "텍스쳐";
  if (/내추럴|natural/.test(text)) return "내추럴";
  return "";
}

function hasGlossyPCode(value) {
  const text = String(value || "");
  if (!text || hasNonTileMaterialCue(text)) return false;
  const compact = text.toUpperCase().replace(/\s+/g, " ").trim();
  const patterns = [
    /(?:^|[\s(/_.-])P(?=\)|\(|$|[\s/_-])/,
    /(?:^|[\s(/_.-])[A-Z]{1,3}\/P(?=\)|\(|$|[\s/_-])/,
    /\(P\)/,
  ];
  return patterns.some((pattern) => pattern.test(compact));
}

function hasMatteMCode(value) {
  const text = String(value || "");
  if (!text || hasNonTileMaterialCue(text)) return false;
  const compact = text.toUpperCase().replace(/\s+/g, " ").trim();
  const patterns = [
    /(?:^|[\s(/_.-])M(?=\)|$|\s)/,
    /\(M\)/,
    /-M(?:$|[\s)\]])/,
  ];
  return patterns.some((pattern) => pattern.test(compact));
}

function hasNonTileMaterialCue(value) {
  return /부\s*자\s*재|폼블럭|몰그린|접착|본드|시멘트|줄눈|메지|실리콘|방수|공구|부속/i.test(String(value || ""));
}

function hasExplicitFinish(product) {
  return Boolean(String(product.finish || product.surface || "").trim());
}

function appendFeature(features, finish) {
  const clean = cleanText(features);
  if (!finish) return clean;
  if (clean.includes(finish)) return clean;
  return [clean, finish].filter(Boolean).join(" / ");
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[×＊]/g, "x")
    .replace(/\s+/g, "")
    .replace(/[(){}\[\]_/·]/g, "");
}

function cleanHtml(value) {
  return decodeHtmlEntities(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findFirst(text, regex) {
  const match = regex.exec(String(text || ""));
  return match ? match[1] || "" : "";
}

function storeCookies(headers, cookieJar) {
  const setCookies = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : splitSetCookieHeader(headers.get("set-cookie") || "");
  for (const cookieText of setCookies) {
    const firstPart = String(cookieText || "").split(";")[0];
    const separatorIndex = firstPart.indexOf("=");
    if (separatorIndex <= 0) continue;
    cookieJar.set(firstPart.slice(0, separatorIndex).trim(), firstPart.slice(separatorIndex + 1).trim());
  }
}

function splitSetCookieHeader(value) {
  if (!value) return [];
  return String(value).split(/,(?=\s*[^;,=]+=[^;,]+)/g);
}

async function mapWithConcurrency(items, workerCount, worker) {
  let index = 0;
  const workers = Array.from({ length: workerCount }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current], current);
    }
  });
  await Promise.all(workers);
}

function countBy(items, getValue) {
  const map = new Map();
  for (const item of items) {
    const value = getValue(item) || "미확인";
    map.set(value, (map.get(value) || 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")));
}

async function readJsonArray(filePath) {
  try {
    const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
}

async function loadEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = {};
    for (const line of content.split(/\r?\n/)) {
      const match = /^\s*([^#=]+)=(.*)$/.exec(line);
      if (!match) continue;
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      parsed[key] = value;
      if (!process.env[key]) process.env[key] = value;
    }
    return parsed;
  } catch {
    return {};
  }
}

function firstEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key] || env[key];
    if (value) return String(value).trim();
  }
  return "";
}

function parseCliArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const entry = args[index];
    if (!entry.startsWith("--")) continue;
    const raw = entry.slice(2);
    const equalIndex = raw.indexOf("=");
    if (equalIndex >= 0) {
      parsed[raw.slice(0, equalIndex)] = raw.slice(equalIndex + 1);
    } else {
      parsed[raw] = args[index + 1]?.startsWith("--") ? "true" : (args[index + 1] || "true");
      if (args[index + 1] && !args[index + 1].startsWith("--")) index += 1;
    }
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
