import fs from "fs/promises";
import path from "path";

const root = process.cwd();
const productsPath = path.join(root, "data", "products.json");
const outputPath = path.join(root, "data", "product-images.json");

const products = JSON.parse(await fs.readFile(productsPath, "utf8"));
if (!Array.isArray(products)) {
  throw new Error("data/products.json must contain an array.");
}

const images = [];
const productStats = new Map();

for (const product of products) {
  const productId = String(product?.id || "").trim();
  if (!productId) continue;

  const refs = collectProductImageRefs(product);
  if (!refs.length) continue;
  productStats.set(productId, refs.length);

  refs.forEach((ref, index) => {
    images.push({
      id: `${productId}::${index + 1}`,
      productId,
      productType: String(product?.productType || "").trim(),
      url: ref.url,
      role: ref.role,
      priority: ref.priority,
      sourceField: ref.sourceField,
      ordinal: index + 1
    });
  });
}

const roleCounts = images.reduce((counts, image) => {
  counts[image.role] = (counts[image.role] || 0) + 1;
  return counts;
}, {});

const payload = {
  generatedAt: new Date().toISOString(),
  source: "data/products.json",
  productCount: productStats.size,
  imageCount: images.length,
  roleCounts,
  images
};

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  productCount: payload.productCount,
  imageCount: payload.imageCount,
  roleCounts: payload.roleCounts,
  outputPath
}, null, 2));

function collectProductImageRefs(product) {
  const refs = [];
  const seen = new Set();
  const add = (url, role, priority, sourceField) => {
    const normalized = String(url || "").trim();
    if (!normalized || seen.has(normalized)) return;
    if (!/^https?:\/\//i.test(normalized) && !/^data:image\//i.test(normalized)) return;
    seen.add(normalized);
    refs.push({ url: normalized, role, priority, sourceField });
  };

  add(product?.image, "primary", 0, "image");
  add(product?.originalImage, "primary", 1, "originalImage");

  const imageUrls = Array.isArray(product?.imageUrls) ? product.imageUrls : [];
  imageUrls.forEach((url, index) => {
    const role = getProductImageRole(url);
    add(url, role, getProductImagePriority(role), `imageUrls[${index}]`);
  });

  add(product?.detailImage, "detail", 8, "detailImage");
  add(product?.closeImage, "detail", 9, "closeImage");
  add(product?.daylightImage, "scene", 10, "daylightImage");
  add(product?.fluorescentImage, "scene", 11, "fluorescentImage");
  add(product?.sceneImage, "scene", 12, "sceneImage");

  return refs.sort((left, right) => left.priority - right.priority || left.url.localeCompare(right.url));
}

function getProductImageRole(url) {
  const text = String(url || "").toLowerCase();
  if (/\/(?:origin|detail|editor)\//.test(text)) return "detail";
  if (/\/uploads\/product\/[^/]+\.(?:jpe?g|png|webp)(?:\?|$)/.test(text)) return "detail";
  if (/\/750\//.test(text)) return "large";
  if (/\/320\//.test(text)) return "scene";
  if (/\/80\//.test(text)) return "thumb";
  return "detail";
}

function getProductImagePriority(role) {
  if (role === "large") return 3;
  if (role === "detail") return 4;
  if (role === "scene") return 5;
  if (role === "thumb") return 20;
  return 12;
}
