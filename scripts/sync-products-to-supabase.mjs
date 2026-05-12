import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const env = await loadEnvFile(path.join(root, ".env"));
const supabaseUrl = String(env.SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const supabaseSecretKey = String(
  env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SECRET_KEY
  || ""
).trim();
const productsPath = path.join(root, "data", "products.json");

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("SUPABASE_URL 과 SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
}

const raw = await fs.readFile(productsPath, "utf8");
const products = JSON.parse(raw);
const payload = products.map(mapAppProductToSupabase);

const response = await fetch(`${supabaseUrl}/rest/v1/products`, {
  method: "POST",
  headers: {
    apikey: supabaseSecretKey,
    Authorization: `Bearer ${supabaseSecretKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation"
  },
  body: JSON.stringify(payload)
});

if (!response.ok) {
  const text = await response.text();
  throw new Error(`Supabase 업로드 실패 (${response.status}): ${text}`);
}

const inserted = await response.json();
console.log(JSON.stringify({
  ok: true,
  uploaded: payload.length,
  returned: Array.isArray(inserted) ? inserted.length : 0
}, null, 2));

function mapAppProductToSupabase(product) {
  return {
    id: String(product.id || "").trim(),
    management_code: String(product.managementCode || "").trim(),
    product_type: String(product.productType || "").trim(),
    kind: String(product.kind || "").trim(),
    name: String(product.name || "").trim(),
    size: String(product.size || "").trim(),
    finish: String(product.finish || "").trim(),
    maker: String(product.maker || "").trim(),
    unit: String(product.unit || "").trim(),
    option_text: String(product.option || "").trim(),
    cost_price: Number(product.costPrice) || 0,
    retail_price: Number(product.retailPrice) || 0,
    wholesale_price: Number(product.wholesalePrice) || 0,
    stock_qty: Number(product.stockQty) || 0,
    image: String(product.image || "").trim(),
    original_image: String(product.originalImage || "").trim(),
    close_image: String(product.closeImage || "").trim(),
    detail_image: String(product.detailImage || "").trim(),
    daylight_image: String(product.daylightImage || "").trim(),
    fluorescent_image: String(product.fluorescentImage || "").trim(),
    scene_image: String(product.sceneImage || "").trim(),
    catalog_source: String(product.catalogSource || "").trim(),
    catalog_page: Number(product.catalogPage) || 0
  };
}

async function loadEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const values = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key) values[key] = value;
    }
    return values;
  } catch {
    return {};
  }
}
