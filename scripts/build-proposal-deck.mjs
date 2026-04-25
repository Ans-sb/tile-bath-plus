import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "../vendor/@oai/artifact-tool/dist/artifact_tool.mjs";

const W = 1280;
const H = 720;

const COLORS = {
  paper: "#F6F1E8",
  ink: "#152126",
  muted: "#6A747C",
  line: "#D8CCBB",
  white: "#FFFFFF",
  accent: "#0B7A75",
  accentSoft: "#DCEFED",
  sand: "#E9DECF",
  dark: "#20333A"
};

const FONT = {
  title: "Aptos Display",
  body: "Aptos"
};

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("프로 제안서 입력 파일 경로가 필요합니다.");
}

const raw = await fs.readFile(inputPath, "utf8");
const payload = JSON.parse(raw.replace(/^\uFEFF/, ""));
const rootDir = path.resolve(path.dirname(inputPath), "..", "..");

await fs.mkdir(payload.outputDir, { recursive: true });

const presentation = Presentation.create({
  slideSize: { width: W, height: H }
});

const productChunks = chunk(payload.cart, 4);
const renderedItems = payload.cart.filter((item) => item.renderedImage);

await addCoverSlide();
await addSummarySlide();
for (let index = 0; index < productChunks.length; index += 1) {
  await addProductSlide(productChunks[index], index + 1, productChunks.length);
}
if (renderedItems.length) {
  await addRenderedSlide(renderedItems.slice(0, 4));
}
await addEstimateSlide();

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(payload.outputPath);

process.stdout.write(`${JSON.stringify({ outputPath: payload.outputPath })}\n`);

async function addCoverSlide() {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.paper;

  addBlock(slide, 0, 0, W, H, COLORS.paper, COLORS.paper);
  addBlock(slide, 0, 0, 128, H, COLORS.dark, COLORS.dark);
  addBlock(slide, 820, 0, 460, H, COLORS.sand, COLORS.sand);

  addText(slide, "Tile & Bath Plus", 164, 72, 320, 28, {
    fontSize: 18,
    color: COLORS.accent,
    bold: true
  });
  addText(slide, "프로 현장 제안서", 164, 118, 480, 72, {
    fontSize: 34,
    color: COLORS.ink,
    bold: true,
    typeface: FONT.title
  });
  addText(
    slide,
    `${payload.proposal.customerName} 현장에 맞춰 선정한 타일, 위생도기, 부자재를 전문 제안서 형식으로 정리했습니다.`,
    164,
    206,
    520,
    72,
    {
      fontSize: 20,
      color: COLORS.muted
    }
  );

  const metaLeft = 164;
  addMeta(slide, "현장", payload.proposal.siteAddress || "현장 주소 미입력", metaLeft, 332, 460);
  addMeta(slide, "담당", payload.proposal.customerName || "고객님", metaLeft, 400, 460);
  addMeta(slide, "제안일", formatDate(payload.proposal.proposalDate), metaLeft, 468, 460);
  addMeta(slide, "유효기간", formatDate(payload.proposal.validDate), metaLeft, 536, 460);

  const heroImages = payload.cart
    .flatMap((item) => [item.renderedImage, item.image].filter(Boolean))
    .slice(0, 3);

  const frames = [
    { left: 864, top: 68, width: 352, height: 186 },
    { left: 898, top: 274, width: 286, height: 178 },
    { left: 850, top: 470, width: 334, height: 192 }
  ];

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    addBlock(slide, frame.left - 10, frame.top - 10, frame.width + 20, frame.height + 20, COLORS.white, COLORS.line, 1);
    await addImageOrPlaceholder(slide, heroImages[index], frame, index === 0 ? "대표 이미지" : `선정 이미지 ${index + 1}`);
  }
}

async function addSummarySlide() {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.paper;

  addSectionHeader(slide, "Project Summary", "현장 핵심 정보");

  const metrics = [
    { label: "선정 품목", value: `${payload.summary.itemCount}개` },
    { label: "공급가", value: formatMoney(payload.summary.subtotal) },
    { label: "부가세", value: formatMoney(payload.summary.vat) },
    { label: "총 제안금액", value: formatMoney(payload.summary.total) }
  ];

  metrics.forEach((metric, index) => {
    const left = 72 + (index * 285);
    addBlock(slide, left, 124, 260, 104, COLORS.white, COLORS.line, 1);
    addText(slide, metric.label, left + 20, 148, 180, 22, { fontSize: 16, color: COLORS.muted, bold: true });
    addText(slide, metric.value, left + 20, 178, 220, 34, { fontSize: 28, color: COLORS.ink, bold: true, typeface: FONT.title });
  });

  addBlock(slide, 72, 266, 564, 364, COLORS.white, COLORS.line, 1);
  addText(slide, "제안 개요", 100, 296, 220, 28, { fontSize: 20, color: COLORS.ink, bold: true, typeface: FONT.title });
  addText(
    slide,
    `${payload.proposal.customerName} 현장의 주소는 ${payload.proposal.siteAddress || "미입력"}입니다.\n공사 희망일은 ${payload.proposal.startDate || "미정"}이며, 제안서 유효기간은 ${payload.proposal.validDays}일입니다.\n\n${payload.proposal.memo || "추가 메모는 아직 입력되지 않았습니다."}`,
    100,
    336,
    500,
    250,
    { fontSize: 20, color: COLORS.muted }
  );

  addBlock(slide, 666, 266, 542, 364, COLORS.dark, COLORS.dark);
  addText(slide, "선정 카테고리", 704, 302, 220, 28, { fontSize: 20, color: COLORS.white, bold: true, typeface: FONT.title });

  const categoryRows = [...new Set(payload.cart.map((item) => `${item.kind || "-"} · ${item.productType || "-"}`))];
  categoryRows.slice(0, 8).forEach((row, index) => {
    addBlock(slide, 704, 354 + (index * 32), 18, 18, COLORS.accent, COLORS.accent);
    addText(slide, row, 736, 348 + (index * 32), 420, 24, { fontSize: 18, color: COLORS.white });
  });
}

async function addProductSlide(items, pageNumber, pageCount) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.paper;

  addSectionHeader(slide, `Selected Products ${pageNumber}/${pageCount}`, "선정 제품");

  const positions = [
    { left: 72, top: 140, width: 540, height: 232 },
    { left: 668, top: 140, width: 540, height: 232 },
    { left: 72, top: 402, width: 540, height: 232 },
    { left: 668, top: 402, width: 540, height: 232 }
  ];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const frame = positions[index];
    addBlock(slide, frame.left, frame.top, frame.width, frame.height, COLORS.white, COLORS.line, 1);
    await addImageOrPlaceholder(
      slide,
      item.renderedImage || item.image,
      { left: frame.left + 20, top: frame.top + 20, width: 172, height: 192 },
      item.name || "상품 이미지"
    );
    addText(slide, item.name || "-", frame.left + 214, frame.top + 24, 290, 44, {
      fontSize: 22,
      color: COLORS.ink,
      bold: true,
      typeface: FONT.title,
      autoFit: "shrinkText"
    });
    addText(slide, `${item.kind || "-"}${item.option ? ` · ${item.option}` : item.finish ? ` · ${item.finish}` : ""}`, frame.left + 214, frame.top + 76, 280, 24, {
      fontSize: 16,
      color: COLORS.accent,
      bold: true
    });
    addText(slide, `규격  ${item.size || "-"}`, frame.left + 214, frame.top + 112, 280, 24, {
      fontSize: 18,
      color: COLORS.ink
    });
    addText(slide, `수량  ${formatQty(item.qty, item.unit)}`, frame.left + 214, frame.top + 146, 280, 24, {
      fontSize: 18,
      color: COLORS.ink
    });
    addText(slide, `견적단가  ${formatMoney(item.quotePrice)}`, frame.left + 214, frame.top + 180, 280, 24, {
      fontSize: 18,
      color: COLORS.ink,
      bold: true
    });
  }
}

async function addRenderedSlide(items) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.paper;

  addSectionHeader(slide, "Styled Preview", "실사 보정 이미지");

  const large = items[0];
  const side = items.slice(1, 3);

  addBlock(slide, 72, 136, 700, 490, COLORS.white, COLORS.line, 1);
  await addImageOrPlaceholder(slide, large.renderedImage || large.image, { left: 88, top: 152, width: 668, height: 458 }, `${large.name} 실사 보정`);
  addText(slide, `${large.name}${large.renderTarget ? ` · ${large.renderTarget}` : ""}`, 88, 616, 620, 24, {
    fontSize: 17,
    color: COLORS.muted
  });

  addBlock(slide, 814, 136, 394, 490, COLORS.dark, COLORS.dark);
  addText(slide, "적용 포인트", 846, 170, 220, 28, { fontSize: 20, color: COLORS.white, bold: true, typeface: FONT.title });
  addText(
    slide,
    items.map((item) => `${item.name}\n${item.renderTarget || "적용 영역 미지정"}${item.renderPointMemo ? ` · ${item.renderPointMemo}` : ""}`).join("\n\n"),
    846,
    214,
    320,
    148,
    { fontSize: 18, color: "#E4ECEE" }
  );

  for (let index = 0; index < side.length; index += 1) {
    const top = 392 + (index * 108);
    addBlock(slide, 846, top, 320, 92, COLORS.white, COLORS.white);
    await addImageOrPlaceholder(
      slide,
      side[index].renderedImage || side[index].image,
      { left: 854, top: top + 8, width: 92, height: 76 },
      side[index].name
    );
    addText(slide, side[index].name, 960, top + 18, 190, 22, {
      fontSize: 16,
      color: COLORS.ink,
      bold: true,
      autoFit: "shrinkText"
    });
    addText(slide, side[index].renderTarget || side[index].size || "-", 960, top + 48, 190, 18, {
      fontSize: 14,
      color: COLORS.muted
    });
  }
}

async function addEstimateSlide() {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.paper;

  addSectionHeader(slide, "Estimate Summary", "견적 요약");

  addBlock(slide, 72, 132, 760, 520, COLORS.white, COLORS.line, 1);
  addText(slide, "품목", 104, 162, 280, 24, { fontSize: 16, color: COLORS.muted, bold: true });
  addText(slide, "규격", 410, 162, 150, 24, { fontSize: 16, color: COLORS.muted, bold: true });
  addText(slide, "수량", 576, 162, 90, 24, { fontSize: 16, color: COLORS.muted, bold: true });
  addText(slide, "견적단가", 676, 162, 120, 24, { fontSize: 16, color: COLORS.muted, bold: true });

  payload.cart.slice(0, 8).forEach((item, index) => {
    const top = 202 + (index * 48);
    addBlock(slide, 96, top + 34, 712, 1, COLORS.line, COLORS.line);
    addText(slide, item.name || "-", 104, top, 280, 22, {
      fontSize: 17,
      color: COLORS.ink,
      autoFit: "shrinkText"
    });
    addText(slide, item.size || "-", 410, top, 140, 22, { fontSize: 16, color: COLORS.ink });
    addText(slide, formatQty(item.qty, item.unit), 576, top, 90, 22, { fontSize: 16, color: COLORS.ink });
    addText(slide, formatMoney(item.quotePrice), 676, top, 120, 22, { fontSize: 16, color: COLORS.ink, bold: true });
  });

  if (payload.cart.length > 8) {
    addText(slide, `외 ${payload.cart.length - 8}개 품목은 앱 장바구니와 견적서에서 계속 확인할 수 있습니다.`, 104, 596, 620, 20, {
      fontSize: 15,
      color: COLORS.muted
    });
  }

  addBlock(slide, 870, 132, 338, 520, COLORS.dark, COLORS.dark);
  addText(slide, "견적 합계", 904, 170, 200, 26, { fontSize: 22, color: COLORS.white, bold: true, typeface: FONT.title });

  const summaryRows = [
    ["공급가", formatMoney(payload.summary.subtotal)],
    ["부가세", formatMoney(payload.summary.vat)],
    ["총 제안금액", formatMoney(payload.summary.total)]
  ];
  summaryRows.forEach(([label, value], index) => {
    const top = 236 + (index * 102);
    addBlock(slide, 904, top, 270, 76, COLORS.white, COLORS.white);
    addText(slide, label, 924, top + 16, 140, 18, { fontSize: 15, color: COLORS.muted, bold: true });
    addText(slide, value, 924, top + 38, 220, 24, { fontSize: 24, color: COLORS.ink, bold: true, typeface: FONT.title });
  });

  addText(
    slide,
    `본 제안은 ${formatDate(payload.proposal.validDate)}까지 유효합니다.\n현장 실측, 재고, 시공 조건에 따라 최종 금액은 조정될 수 있습니다.`,
    904,
    500,
    236,
    72,
    { fontSize: 16, color: "#E4ECEE" }
  );
}

function addSectionHeader(slide, eyebrow, title) {
  addText(slide, eyebrow, 72, 58, 240, 24, {
    fontSize: 16,
    color: COLORS.accent,
    bold: true
  });
  addText(slide, title, 72, 86, 320, 40, {
    fontSize: 30,
    color: COLORS.ink,
    bold: true,
    typeface: FONT.title
  });
}

function addMeta(slide, label, value, left, top, width) {
  addText(slide, label, left, top, 120, 22, { fontSize: 15, color: COLORS.accent, bold: true });
  addText(slide, value, left, top + 24, width, 28, { fontSize: 21, color: COLORS.ink, typeface: FONT.title });
}

function addBlock(slide, left, top, width, height, fill, line = fill, lineWidth = 0) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: line, width: lineWidth }
  });
}

function addText(slide, text, left, top, width, height, options = {}) {
  const box = slide.shapes.add({
    geometry: "rect",
    position: { left, top, width, height },
    fill: "#00000000",
    line: { style: "solid", fill: "#00000000", width: 0 }
  });
  box.text = String(text ?? "");
  box.text.fontSize = options.fontSize ?? 18;
  box.text.color = options.color ?? COLORS.ink;
  box.text.bold = Boolean(options.bold);
  box.text.typeface = options.typeface ?? FONT.body;
  box.text.alignment = options.alignment ?? "left";
  box.text.verticalAlignment = options.verticalAlignment ?? "top";
  box.text.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  if (options.autoFit) {
    box.text.autoFit = options.autoFit;
  }
  return box;
}

async function addImageOrPlaceholder(slide, source, frame, alt) {
  const imageConfig = await resolveImageConfig(source, alt);
  if (imageConfig) {
    const image = slide.images.add(imageConfig);
    image.position = frame;
    return image;
  }

  addBlock(slide, frame.left, frame.top, frame.width, frame.height, COLORS.accentSoft, COLORS.line, 1);
  addText(slide, "이미지 준비중", frame.left + 24, frame.top + (frame.height / 2) - 12, frame.width - 48, 24, {
    fontSize: 18,
    color: COLORS.accent,
    bold: true,
    alignment: "center"
  });
  return null;
}

async function resolveImageConfig(source, alt) {
  if (!source) return null;

  if (String(source).startsWith("data:image/")) {
    return { dataUrl: String(source), fit: "cover", alt };
  }

  const candidate = await resolveImagePath(String(source));
  if (!candidate) return null;
  const bytes = await fs.readFile(candidate);
  return {
    blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    fit: "cover",
    alt
  };
}

async function resolveImagePath(source) {
  const decoded = decodeURIComponent(source);
  const cleaned = decoded.replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+/, "");
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
      if (stat.isFile()) return target;
    } catch {}
  }
  return null;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function formatMoney(value) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatQty(value, unit) {
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(Number(value) || 0)}${unit || ""}`;
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}
