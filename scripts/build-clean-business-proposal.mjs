import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "../vendor/@oai/artifact-tool/dist/artifact_tool.mjs";

const TEMPLATE_PATH = path.join("assets", "proposal-templates", "clean-business.pptx");

export async function buildCleanBusinessProposal(payload, rootDir) {
  const templatePath = path.resolve(rootDir, TEMPLATE_PATH);
  const presentation = await PresentationFile.importPptx(await FileBlob.load(templatePath));
  const slides = presentation.slides.items;

  if (slides.length < 10) {
    throw new Error("클린 비즈니스 제안서 템플릿의 슬라이드 구성이 올바르지 않습니다.");
  }

  const companyName = cleanText(payload.company?.name) || "자재GO";
  const customerName = cleanText(payload.proposal?.customerName) || "고객";
  const siteAddress = cleanText(payload.proposal?.siteAddress) || "현장 주소 미입력";
  const intro = cleanText(payload.proposal?.intro)
    || `${customerName} 현장에 맞춰 선정한 자재와 견적을 정리했습니다.`;
  const memo = cleanText(payload.proposal?.memo) || "현장 조건과 실제 발주 수량은 최종 확인 후 확정됩니다.";
  const notice = cleanText(payload.proposal?.notice) || "상품 재고와 납기 일정은 주문 시점에 다시 확인합니다.";
  const featuredProducts = payload.cart.slice(0, 3);
  const detailCards = getDetailCards(payload.cart);

  replaceCoverTitle(slides[0], proposalTitle(payload));
  replaceText(slides[0], "TextBox 10", truncate(intro, 120));
  replaceText(slides[0], "TextBox 14", "제안 내용 보기");
  replaceText(slides[0], "TextBox 18", companyName);
  replaceText(slides[0], "TextBox 19", proposalYear(payload));

  replaceBrand(slides.slice(1), companyName);

  replaceText(slides[1], "TextBox 12", "제안 개요");
  replaceText(slides[1], "TextBox 13", truncate(intro, 260));
  replaceText(slides[1], "TextBox 14", `고객  ${customerName}\n현장  ${siteAddress}`);
  replaceText(
    slides[1],
    "TextBox 15",
    `제안일  ${formatDate(payload.proposal?.proposalDate)}\n유효기간  ${formatDate(payload.proposal?.validDate)}`
  );

  replaceText(slides[2], "TextBox 12", "선정 자재");
  ["TextBox 13", "TextBox 14", "TextBox 15"].forEach((name, index) => {
    replaceText(slides[2], name, featuredProductCopy(payload.cart[index], index));
  });

  replaceText(slides[3], "TextBox 14", "현장 제안");
  replaceText(slides[3], "TextBox 15", truncate(intro, 280));
  replaceText(slides[3], "TextBox 16", truncate([memo, notice].filter(Boolean).join("\n\n"), 320));

  replaceText(slides[4], "TextBox 12", "견적 요약");
  replaceText(slides[4], "TextBox 13", `선정 상품\n${number(payload.summary?.itemCount || payload.cart.length)}개`);
  replaceText(slides[4], "TextBox 14", `공급가액\n${currency(payload.summary?.subtotal)}`);
  replaceText(slides[4], "TextBox 15", `부가세\n${currency(payload.summary?.vat)}`);
  replaceText(slides[4], "TextBox 16", `총 제안금액\n${currency(payload.summary?.total)}`);

  replaceText(slides[5], "TextBox 14", "상품 상세");
  replaceText(slides[5], "TextBox 15", buildCompactProductLines(payload.cart).join("\n") || "선정 상품 정보");
  setTextSize(slides[5], "TextBox 15", payload.cart.length > 10 ? 11 : 13);
  replaceText(slides[5], "TextBox 16", "");

  replaceText(slides[6], "TextBox 20", "선정 상품 이미지");
  replaceText(slides[6], "TextBox 21", buildProductImageIndex(payload.cart.slice(0, 5)));

  replaceText(slides[7], "TextBox 29", "상품 및 현장 보정 이미지");
  replaceText(slides[7], "TextBox 28", "장바구니의 나머지 상품과 선택한 자재를 적용한 현장 보정 결과입니다.");
  ["TextBox 21", "TextBox 24", "TextBox 27"].forEach((name, index) => {
    replaceText(slides[7], name, productLabel(detailCards[index], index));
  });

  replaceText(slides[8], "TextBox 14", "견적 및 문의");
  replaceText(slides[8], "TextBox 16", cleanText(payload.company?.managerPhone) || "담당자 연락처 미입력");
  replaceText(slides[8], "TextBox 18", "www.jajaego.com");
  replaceText(slides[8], "TextBox 20", managerLabel(payload));
  replaceText(slides[8], "TextBox 22", siteAddress);
  replaceText(slides[8], "TextBox 23", truncate(notice, 240));

  replaceText(slides[9], "TextBox 12", "검토해주셔서 감사합니다");
  replaceText(
    slides[9],
    "TextBox 13",
    `${customerName} 현장의 제안 내용입니다. 최종 발주 전 수량, 재고와 납기 일정을 확인해주세요.`
  );

  await replaceTemplateImages(slides, buildTemplateImagePlan(payload.cart), rootDir);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(payload.outputPath);
  return { outputPath: payload.outputPath };
}

function replaceBrand(slides, companyName) {
  slides.forEach((slide) => replaceText(slide, "TextBox 9", companyName));
}

function replaceCoverTitle(slide, value) {
  const shape = slide.shapes.items.find((item) => item.name === "TextBox 6");
  if (!shape?.text) return;
  const [firstLine, secondLine] = splitCoverTitle(truncate(value, 36));
  const longestLine = Math.max(firstLine.length, secondLine.length);
  shape.text.replace("Interior", firstLine);
  shape.text.replace("Design", secondLine);
  shape.text.fontSize = longestLine <= 10 ? 104 : longestLine <= 14 ? 84 : 68;
  shape.text.autoFit = "shrinkText";
}

function splitCoverTitle(value) {
  const title = cleanText(value).replace(/\n+/g, " ");
  const words = title.split(" ").filter(Boolean);
  if (words.length < 2) {
    const midpoint = Math.ceil(title.length / 2);
    return [title.slice(0, midpoint), title.slice(midpoint)];
  }

  let bestIndex = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const firstLength = words.slice(0, index).join(" ").length;
    const secondLength = words.slice(index).join(" ").length;
    const difference = Math.abs(firstLength - secondLength);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestIndex = index;
    }
  }

  return [words.slice(0, bestIndex).join(" "), words.slice(bestIndex).join(" ")];
}

function replaceText(slide, shapeName, value) {
  const shape = slide.shapes.items.find((item) => item.name === shapeName);
  if (!shape?.text) return;
  const previous = String(shape.text || "");
  shape.text.replace(previous, cleanText(value));
  shape.text.autoFit = "shrinkText";
}

function setTextSize(slide, shapeName, fontSize) {
  const shape = slide.shapes.items.find((item) => item.name === shapeName);
  if (!shape?.text) return;
  shape.text.fontSize = fontSize;
  shape.text.autoFit = "shrinkText";
}

async function replaceTemplateImages(slides, imagePlan, rootDir) {
  if (!imagePlan.length) return;
  const imageCache = new Map();

  for (const { slideIndex, imageNames, sources } of imagePlan) {
    if (!sources.length) continue;
    for (const imageName of imageNames) {
      const sourceIndex = imageNames.indexOf(imageName);
      const source = sources[sourceIndex % sources.length];
      if (!imageCache.has(source)) imageCache.set(source, loadImageSource(source, rootDir));
      const imageData = await imageCache.get(source);
      if (!imageData) continue;
      const image = slides[slideIndex].images.items.find((item) => item.name === imageName);
      if (!image) continue;
      const oldFrame = image.frame;
      const oldCrop = image.crop;
      const oldFit = image.fit;
      const oldAlt = image.alt;
      const oldPrompt = image.prompt;
      const oldGeometry = image.geometry;
      const oldBorderRadius = image.borderRadius;
      const oldRotation = image.rotation;
      const oldFlipHorizontal = image.flipHorizontal;
      const oldFlipVertical = image.flipVertical;
      const oldLockAspectRatio = image.lockAspectRatio;

      image.replace({
        blob: imageData.bytes,
        contentType: imageData.contentType,
        alt: oldAlt || "선정 상품 이미지",
        fit: oldFit || "cover",
        ...(oldPrompt ? { prompt: oldPrompt } : {})
      });
      image.frame = oldFrame;
      image.crop = oldCrop;
      image.geometry = oldGeometry;
      image.borderRadius = oldBorderRadius;
      image.rotation = oldRotation;
      image.flipHorizontal = oldFlipHorizontal;
      image.flipVertical = oldFlipVertical;
      image.lockAspectRatio = oldLockAspectRatio;
    }
  }
}

function buildTemplateImagePlan(cart) {
  const productSources = cart.map((item) => cleanText(item.image)).filter(Boolean);
  const renderSources = cart.map((item) => cleanText(item.renderedImage)).filter(Boolean);
  const allSources = unique([...renderSources, ...productSources]);
  if (!allSources.length) return [];

  const primaryRenderSources = renderSources.length ? renderSources : productSources;
  const portfolioSources = productSources.slice(0, 5).length ? productSources.slice(0, 5) : allSources;
  const detailSources = getDetailCards(cart).map((item) => cleanText(item.image)).filter(Boolean);

  return [
    { slideIndex: 1, imageNames: ["Picture 11"], sources: productSources.slice(11, 12).length ? productSources.slice(11, 12) : primaryRenderSources },
    { slideIndex: 2, imageNames: ["Picture 11"], sources: productSources.length ? productSources : allSources },
    { slideIndex: 3, imageNames: ["Picture 11", "Picture 13"], sources: productSources.slice(1, 3).length ? productSources.slice(1, 3) : primaryRenderSources },
    { slideIndex: 4, imageNames: ["Picture 11"], sources: productSources.slice(3, 4).length ? productSources.slice(3, 4) : allSources },
    { slideIndex: 5, imageNames: ["Picture 11", "Picture 13"], sources: productSources.slice(4, 6).length ? productSources.slice(4, 6) : unique([productSources[0], primaryRenderSources[0]]) },
    { slideIndex: 6, imageNames: ["Picture 11", "Picture 13", "Picture 15", "Picture 17", "Picture 19"], sources: portfolioSources },
    { slideIndex: 7, imageNames: ["Picture 11", "Picture 23", "Picture 26"], sources: detailSources.length ? detailSources : productSources },
    { slideIndex: 8, imageNames: ["Picture 11", "Picture 13"], sources: productSources.slice(8, 10).length ? productSources.slice(8, 10) : primaryRenderSources },
    { slideIndex: 9, imageNames: ["Picture 11"], sources: productSources.slice(10, 11).length ? productSources.slice(10, 11) : primaryRenderSources }
  ];
}

function getDetailCards(cart) {
  const cards = cart.slice(5, 8);
  const renderItem = cart.find((item) => cleanText(item.renderedImage));

  if (cards.length < 3 && renderItem) {
    cards.push({
      isRender: true,
      name: "현장 보정 이미지",
      image: cleanText(renderItem.renderedImage),
      option: cleanText(renderItem.renderTarget) || "선택 영역",
      description: cleanText(renderItem.renderPointMemo) || "선택한 자재를 현장 사진에 적용한 결과"
    });
  }

  return cards.slice(0, 3);
}

async function loadImageSource(source, rootDir) {
  const value = String(source || "").trim();
  if (!value) return null;

  if (value.startsWith("data:image/")) {
    const match = value.match(/^data:([^;,]+);base64,(.+)$/s);
    if (!match) return null;
    const buffer = Buffer.from(match[2], "base64");
    return { bytes: toArrayBuffer(buffer), contentType: match[1] };
  }

  if (/^https?:\/\//i.test(value)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(value, { signal: controller.signal });
      if (!response.ok) return null;
      return {
        bytes: await response.arrayBuffer(),
        contentType: response.headers.get("content-type")?.split(";")[0] || contentTypeFromPath(value)
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  const decoded = safeDecode(value);
  const cleaned = decoded.replace(/^\/+/, "");
  const candidates = [
    decoded,
    cleaned,
    path.resolve(rootDir, cleaned),
    path.resolve(rootDir, decoded)
  ].filter(Boolean);

  for (const candidate of candidates) {
    const target = path.isAbsolute(candidate) ? candidate : path.resolve(rootDir, candidate);
    try {
      const stat = await fs.stat(target);
      if (!stat.isFile()) continue;
      const buffer = await fs.readFile(target);
      return { bytes: toArrayBuffer(buffer), contentType: contentTypeFromPath(target) };
    } catch {}
  }
  return null;
}

function buildProductLines(cart) {
  const maxItems = 12;
  const lines = cart.slice(0, maxItems).map((item, index) => {
    const productCode = cleanText(item.productCode);
    const name = cleanText(item.name) || "선정 상품";
    const identity = productCode && normalizeCompareText(productCode) !== normalizeCompareText(name)
      ? `${truncate(name, 34)}  |  품번 ${truncate(productCode, 24)}`
      : truncate(name, 58);
    const specs = buildSpecParts(item).join(" · ") || truncate(cleanText(item.description), 72) || "상세 규격 확인";
    const quantity = `${number(item.qty)}${cleanText(item.unit) || "개"}`;
    const pricing = Number(item.quotePrice || 0) > 0
      ? `단가 ${currency(item.quotePrice)}  |  합계 ${currency(item.lineTotal || (Number(item.quotePrice) * Number(item.qty)))}`
      : "금액 협의";
    return `${String(index + 1).padStart(2, "0")}  ${identity}\n${truncate(specs, 76)}  |  수량 ${truncate(quantity, 24)}  |  ${pricing}`;
  });
  if (cart.length > maxItems) lines.push(`외 ${number(cart.length - maxItems)}개 상품`);
  return lines;
}

function buildCompactProductLines(cart) {
  return cart.slice(0, 12).map((item, index) => {
    const name = truncate(cleanText(item.name) || "선정 상품", 24);
    const specs = [
      cleanText(item.size),
      cleanText(item.finish),
      cleanText(item.material),
      cleanText(item.color)
    ].filter(Boolean).map((value) => truncate(value, 14)).join(" · ") || "규격 확인";
    const quantity = `${number(item.qty)}${cleanText(item.unit) || "개"}`;
    const price = Number(item.quotePrice || 0) > 0
      ? currency(item.lineTotal || (Number(item.quotePrice) * Number(item.qty)))
      : "금액 협의";
    return `${String(index + 1).padStart(2, "0")}  ${name} | ${specs} | ${quantity} | ${price}`;
  });
}

function featuredProductCopy(item, index) {
  if (!item) return index === 0 ? "선정 상품 정보" : "현장 조건에 맞춰 상품을 구성했습니다.";
  const specs = buildSpecParts(item).join(" · ");
  const price = Number(item.quotePrice || 0) > 0 ? currency(item.quotePrice) : "금액 협의";
  return `${truncate(cleanText(item.name) || "선정 상품", 46)}\n${truncate(specs || cleanText(item.description) || "상세 규격 확인", 68)}\n제안 단가 ${price}`;
}

function productLabel(item, index) {
  if (!item) return `선정 상품 ${index + 1}`;
  if (item.isRender) {
    const target = renderTargetLabel(item.option);
    const description = cleanText(item.description) || "선택한 자재를 현장 사진에 적용한 결과";
    return `현장 보정 이미지\n${truncate(target, 18)} · ${truncate(description, 32)}`;
  }
  const specs = buildSpecParts(item).slice(0, 3).join(" · ");
  const price = Number(item.quotePrice || 0) > 0
    ? `단가 ${currency(item.quotePrice)} · 합계 ${currency(item.lineTotal || (Number(item.quotePrice) * Number(item.qty)))}`
    : "금액 협의";
  return [truncate(cleanText(item.name) || `선정 상품 ${index + 1}`, 30), truncate(specs, 44), truncate(price, 44)].filter(Boolean).join("\n");
}

function buildProductImageIndex(items) {
  if (!items.length) return "장바구니에 담은 상품의 실제 이미지와 규격을 함께 확인할 수 있습니다.";
  const labels = items.map((item, index) => {
    const name = truncate(cleanText(item.name) || `선정 상품 ${index + 1}`, 18);
    const size = cleanText(item.size) || "규격 확인";
    const price = Number(item.quotePrice || 0) > 0 ? currency(item.quotePrice) : "금액 협의";
    return `${String(index + 1).padStart(2, "0")} ${name} · ${size} · ${price}`;
  });
  return [
    `상단 ${labels[0]}`,
    labels.length > 1 ? `하단 왼쪽부터 ${labels.slice(1).join("  /  ")}` : ""
  ].filter(Boolean).join("\n");
}

function buildSpecParts(item) {
  return [
    cleanText(item.size) ? `규격 ${cleanText(item.size)}` : "",
    cleanText(item.thickness) ? `두께 ${cleanText(item.thickness)}` : "",
    cleanText(item.finish) ? `마감 ${cleanText(item.finish)}` : "",
    cleanText(item.material) ? `재질 ${cleanText(item.material)}` : "",
    cleanText(item.color) ? `색상 ${cleanText(item.color)}` : "",
    cleanText(item.option) ? `용도 ${cleanText(item.option)}` : ""
  ].filter(Boolean);
}

function normalizeCompareText(value) {
  return cleanText(value).toLowerCase().replace(/[\s_./()[\]{}-]+/g, "");
}

function renderTargetLabel(value) {
  const target = cleanText(value).toLowerCase();
  if (target === "wall") return "벽";
  if (target === "floor") return "바닥";
  if (target === "point") return "포인트";
  return cleanText(value) || "선택 영역";
}

function proposalTitle(payload) {
  return cleanText(payload.proposal?.title) || "현장 맞춤 자재 제안서";
}

function proposalYear(payload) {
  const date = new Date(payload.proposal?.proposalDate || Date.now());
  return Number.isNaN(date.getTime()) ? String(new Date().getFullYear()) : String(date.getFullYear());
}

function managerLabel(payload) {
  const name = cleanText(payload.company?.managerName);
  const title = cleanText(payload.company?.managerTitle);
  return [name, title].filter(Boolean).join(" · ") || "자재GO 온라인 문의";
}

function formatDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return cleanText(value) || "미정";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function currency(value) {
  return `${number(value)}원`;
}

function number(value) {
  return Math.round(Number(value) || 0).toLocaleString("ko-KR");
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(value, maxLength) {
  const text = cleanText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function contentTypeFromPath(value) {
  const extension = path.extname(String(value).split("?")[0]).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".svg") return "image/svg+xml";
  return "image/png";
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
