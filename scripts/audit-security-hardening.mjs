import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sensitiveProductFields = [
  "brand",
  "brandCode",
  "brandName",
  "internalBrandId",
  "internalBrandCode",
  "internalBrandName",
  "internal_brand_id",
  "internal_brand_code",
  "internal_brand_name",
  "isCustomerBrandVisible",
  "is_customer_brand_visible",
  "maker",
  "manufacturer",
  "supplier",
  "supplierCode",
  "supplierName",
  "supplier_code",
  "supplier_name",
  "sourceSite",
  "sourceUrl",
  "sourceProductId",
  "sourceCategoryCode",
  "sourceCategoryName",
  "source_site",
  "source_url",
  "source_product_id",
  "source_category_code",
  "source_category_name",
  "catalogSource",
  "catalog_source",
  "cost",
  "costPrice",
  "cost_price",
  "purchasePrice",
  "purchase_price",
  "priceSortRank",
  "margin",
  "marginGrade",
  "qualityGrade",
  "margin_grade",
  "quality_grade",
  "adminSearchableText",
  "adminSearchText",
  "admin_searchable_text",
  "admin_search_text",
  "internalMemo",
  "internalNote",
  "internal_memo",
  "internal_note"
];

const checks = [];

const serverJs = await readText("server.js");
const appJs = await readText("app.js");
const accountSessionJs = await readText("src/server/services/account-session.js");
const passwordServiceJs = await readText("src/server/services/password-service.js");
const authServiceJs = await readText("src/server/services/auth-service.js");
const accountRoutesJs = await readText("src/server/routes/account-routes.js");
const cartStoreJs = await readText("src/server/services/cart-store.js");
const productResponseMapperJs = await readText("src/server/services/product-response-mapper.js");
const productDtoJs = await readText("src/client/shared/product-dto.js");
const productsDbRows = await readProductsDbBundle("products-db.js");
const alwaysDeniedProductFields = sensitiveProductFields.filter((field) => field !== "priceSortRank");

record("passwordHashing", /crypto\.scrypt/.test(passwordServiceJs)
  && /hashPassword/.test(serverJs)
  && /verifyPassword/.test(serverJs));
record("legacyPasswordRehash", /needsRehash/.test(serverJs) && /updateSignupPasswordHash/.test(serverJs));
record("adminTokenExpiry", /expiresAt/.test(accountSessionJs) && /verifyAdminToken/.test(authServiceJs));
record("memberTokenExpiry", /expiresAt/.test(accountSessionJs) && /verifyMemberToken/.test(accountSessionJs));
record("serverOrderPricing", /buildServerPricedOrderItems/.test(serverJs) && /getServerOrderUnitPrice/.test(serverJs));
record("cartTokenRequired", /verifyMemberSessionAccess/.test(accountRoutesJs) && /verifyMemberSessionAccess/.test(serverJs));
record("cartSensitivePriceNotPersisted", /sanitizeStoredCartItem/.test(cartStoreJs)
  && !/costPrice:\s*normalized\.costPrice/.test(cartStoreJs)
  && !/retailPrice:\s*normalized\.retailPrice/.test(cartStoreJs)
  && !/wholesalePrice:\s*normalized\.wholesalePrice/.test(cartStoreJs));
record("clientSignupPasswordNotCached", /delete safePayload\.password/.test(appJs) && /delete safePayload\.passwordConfirm/.test(appJs));
record("serverCustomerSensitiveList", alwaysDeniedProductFields.every((field) => productResponseMapperJs.includes(`"${field}"`)));
record("clientCustomerSensitiveList", alwaysDeniedProductFields.every((field) => productDtoJs.includes(`"${field}"`)));

const leakedFields = auditRowsForSensitiveFields(productsDbRows, sensitiveProductFields);
record("publicBundleSensitiveFields", leakedFields.rows === 0, leakedFields);

const result = {
  ok: checks.every((check) => check.ok),
  checkedAt: new Date().toISOString(),
  checks
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;

function record(name, ok, details = {}) {
  checks.push({ name, ok: Boolean(ok), ...details });
}

async function readText(relativePath) {
  return fs.readFile(path.join(root, relativePath), "utf8");
}

async function readProductsDbBundle(relativePath) {
  const content = await readText(relativePath);
  const match = content.match(/window\.PRODUCTS_DB\s*=\s*(\[[\s\S]*\]);?\s*$/);
  if (!match) throw new Error("products-db.js does not contain window.PRODUCTS_DB.");
  return JSON.parse(match[1]);
}

function auditRowsForSensitiveFields(rows, fields) {
  const fieldSet = new Set(fields);
  const leaked = new Set();
  let rowCount = 0;
  for (const row of rows) {
    const rowFields = Object.keys(row || {}).filter((field) => fieldSet.has(field));
    if (!rowFields.length) continue;
    rowCount += 1;
    rowFields.forEach((field) => leaked.add(field));
  }
  return {
    rows: rowCount,
    fields: [...leaked].sort()
  };
}
