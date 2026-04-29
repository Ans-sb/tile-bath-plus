import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "../vendor/@oai/artifact-tool/dist/artifact_tool.mjs";

const W = 1280;
const H = 720;

const THEMES = {
  "beige-black": {
    id: "beige-black",
    label: "Beige & Black Simple Clean",
    title: "Simple Clean",
    colors: {
      paper: "#F3EADF",
      paperAlt: "#E4D6C7",
      ink: "#171311",
      muted: "#6B625B",
      line: "#D7C8B7",
      card: "#FFFDFC",
      accent: "#141414",
      accentSoft: "#EDE2D5",
      highlight: "#B79D82",
      panel: "#2A2420",
      white: "#FFFFFF"
    },
    fonts: {
      title: "Aptos Display",
      body: "Aptos"
    }
  },
  "beige-red": {
    id: "beige-red",
    label: "Beige Red Modern Creative",
    title: "Modern Creative",
    colors: {
      paper: "#F4E7DA",
      paperAlt: "#F0D1C8",
      ink: "#221715",
      muted: "#6F5D58",
      line: "#DDC3B8",
      card: "#FFFDFB",
      accent: "#B44C37",
      accentSoft: "#F4D8D0",
      highlight: "#E88C6D",
      panel: "#4D2D24",
      white: "#FFFFFF"
    },
    fonts: {
      title: "Aptos Display",
      body: "Aptos"
    }
  },
  "beige-brown": {
    id: "beige-brown",
    label: "Beige Brown Neutral Modern",
    title: "Neutral Modern",
    colors: {
      paper: "#F5EFE6",
      paperAlt: "#E6D7C5",
      ink: "#2A231D",
      muted: "#70645A",
      line: "#D8CBBC",
      card: "#FEFCF9",
      accent: "#8D6B4B",
      accentSoft: "#EEE3D6",
      highlight: "#C1A07E",
      panel: "#645245",
      white: "#FFFFFF"
    },
    fonts: {
      title: "Aptos Display",
      body: "Aptos"
    }
  }
};

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("프로 제안서 입력 파일 경로가 필요합니다.");
}

const raw = await fs.readFile(inputPath, "utf8");
const payload = JSON.parse(raw.replace(/^\uFEFF/, ""));
const rootDir = path.resolve(path.dirname(inputPath), "..", "..");
const theme = THEMES[payload?.proposal?.theme] || THEMES["beige-black"];

await fs.mkdir(payload.outputDir, { recursive: true });

const presentation = Presentation.create({
  slideSize: { width: W, height: H }
});

const productChunks = chunk(payload.cart, 4);
const renderedItems = payload.cart.filter((item) => item.renderedImage);
const renderedChunks = chunk(renderedItems, 2);

await addCoverSlide();
await addSummarySlide();
for (let index = 0; index < productChunks.length; index += 1) {
  await addProductSlide(productChunks[index], index + 1, productChunks.length);
}
for (let index = 0; index < renderedChunks.length; index += 1) {
  await addRenderedSlide(renderedChunks[index], index + 1, renderedChunks.length);
}
await addEstimateSlide();
await addContactSlide();

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(payload.outputPath);

process.stdout.write(`${JSON.stringify({ outputPath: payload.outputPath })}\n`);

async function addCoverSlide() {
  const slide = presentation.slides.add();
  slide.background.fill = theme.colors.paper;

  if (theme.id === "beige-red") {
    addBlock(slide, 0, 0, W, H, theme.colors.paper, theme.colors.paper);
    addBlock(slide, 0, 0, 140, H, theme.colors.accent, theme.colors.accent);
    addBlock(slide, 780, 0, 500, H, theme.colors.paperAlt, theme.colors.paperAlt);
    addBlock(slide, 188, 92, 132, 10, theme.colors.accent, theme.colors.accent);

    addText(slide, "Tile & Bath Plus", 188, 78, 260, 24, {
      fontSize: 18,
      color: theme.colors.accent,
      bold: true
    });
    addText(slide, "현장 맞춤\n프로 제안서", 188, 128, 420, 150, {
      fontSize: 46,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, buildCoverCopy(), 188, 302, 388, 140, {
      fontSize: 20,
      color: theme.colors.muted
    });
    addContactStrip(slide, 188, 536, 360, 116);

    const hero = collectHeroImages(3);
    await addImageFrame(slide, hero[0], { left: 814, top: 64, width: 396, height: 226 }, { borderFill: theme.colors.card, padding: 12 });
    await addImageFrame(slide, hero[1], { left: 748, top: 314, width: 222, height: 286 }, { borderFill: theme.colors.card, padding: 10 });
    await addImageFrame(slide, hero[2], { left: 986, top: 392, width: 230, height: 174 }, { borderFill: theme.colors.panel, padding: 10 });
  } else if (theme.id === "beige-brown") {
    addBlock(slide, 0, 0, W, H, theme.colors.paper, theme.colors.paper);
    addBlock(slide, 66, 60, 1148, 600, theme.colors.card, theme.colors.line, 1);
    addBlock(slide, 92, 88, 270, 544, theme.colors.paperAlt, theme.colors.paperAlt);
    addBlock(slide, 390, 560, 790, 44, theme.colors.accentSoft, theme.colors.accentSoft);

    addText(slide, "Tile & Bath Plus", 400, 106, 260, 24, {
      fontSize: 18,
      color: theme.colors.accent,
      bold: true
    });
    addText(slide, "현장 맞춤 제안서", 400, 144, 420, 62, {
      fontSize: 42,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, buildCoverCopy(), 400, 226, 480, 110, {
      fontSize: 20,
      color: theme.colors.muted
    });

    addMeta(slide, "고객", payload.proposal.customerName || "고객", 400, 364, 330);
    addMeta(slide, "현장", payload.proposal.siteAddress || "현장 주소 미입력", 400, 434, 420);
    addMeta(slide, "유효기간", formatDate(payload.proposal.validDate), 400, 504, 300);
    addText(slide, companyDisplayName(), 400, 580, 360, 20, {
      fontSize: 17,
      color: theme.colors.ink,
      bold: true
    });

    const hero = collectHeroImages(3);
    await addImageFrame(slide, hero[0], { left: 110, top: 106, width: 236, height: 164 }, { borderFill: theme.colors.card, padding: 0 });
    await addImageFrame(slide, hero[1], { left: 110, top: 292, width: 236, height: 148 }, { borderFill: theme.colors.card, padding: 0 });
    await addImageFrame(slide, hero[2], { left: 834, top: 126, width: 324, height: 398 }, { borderFill: theme.colors.card, padding: 12 });
  } else {
    addBlock(slide, 0, 0, W, H, theme.colors.paper, theme.colors.paper);
    addBlock(slide, 0, 0, 126, H, theme.colors.panel, theme.colors.panel);
    addBlock(slide, 814, 0, 466, H, theme.colors.paperAlt, theme.colors.paperAlt);

    addText(slide, "Tile & Bath Plus", 170, 78, 260, 24, {
      fontSize: 18,
      color: theme.colors.highlight,
      bold: true
    });
    addText(slide, "프로 현장 제안서", 170, 120, 430, 66, {
      fontSize: 38,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, buildCoverCopy(), 170, 204, 470, 94, {
      fontSize: 20,
      color: theme.colors.muted
    });

    addMeta(slide, "현장", payload.proposal.siteAddress || "현장 주소 미입력", 170, 342, 458);
    addMeta(slide, "담당", payload.proposal.customerName || "고객", 170, 412, 458);
    addMeta(slide, "제안일", formatDate(payload.proposal.proposalDate), 170, 482, 240);
    addMeta(slide, "유효기간", formatDate(payload.proposal.validDate), 430, 482, 240);

    addContactStrip(slide, 170, 580, 420, 72);

    const hero = collectHeroImages(3);
    await addImageFrame(slide, hero[0], { left: 860, top: 72, width: 332, height: 186 }, { borderFill: theme.colors.card, padding: 10 });
    await addImageFrame(slide, hero[1], { left: 894, top: 282, width: 278, height: 176 }, { borderFill: theme.colors.card, padding: 10 });
    await addImageFrame(slide, hero[2], { left: 848, top: 480, width: 320, height: 168 }, { borderFill: theme.colors.card, padding: 10 });
  }
}

async function addSummarySlide() {
  const slide = presentation.slides.add();
  slide.background.fill = theme.colors.paper;

  addSectionHeader(slide, "Project Summary", "제안 개요");

  const metrics = [
    { label: "선정 품목", value: `${payload.summary.itemCount}개` },
    { label: "공급가", value: formatMoney(payload.summary.subtotal) },
    { label: "부가세", value: formatMoney(payload.summary.vat) },
    { label: "총 제안금액", value: formatMoney(payload.summary.total) }
  ];

  if (theme.id === "beige-red") {
    addBlock(slide, 72, 132, 352, 520, theme.colors.card, theme.colors.line, 1);
    addBlock(slide, 72, 132, 28, 520, theme.colors.accent, theme.colors.accent);
    addText(slide, "Design Brief", 120, 166, 220, 34, {
      fontSize: 26,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, buildProjectSummaryText(), 120, 220, 266, 260, {
      fontSize: 19,
      color: theme.colors.muted
    });
    addText(slide, "핵심 분류", 120, 520, 140, 20, {
      fontSize: 15,
      color: theme.colors.accent,
      bold: true
    });
    addBulletRows(slide, categoryRows(), 120, 552, 250, 22, {
      color: theme.colors.ink,
      bulletFill: theme.colors.accent
    });

    metrics.forEach((metric, index) => {
      const left = 468 + ((index % 2) * 344);
      const top = 152 + (Math.floor(index / 2) * 194);
      addBlock(slide, left, top, 286, 150, theme.colors.card, theme.colors.line, 1);
      addBlock(slide, left, top, 286, 12, theme.colors.accent, theme.colors.accent);
      addText(slide, metric.label, left + 22, top + 38, 190, 24, {
        fontSize: 17,
        color: theme.colors.muted,
        bold: true
      });
      addText(slide, metric.value, left + 22, top + 74, 236, 42, {
        fontSize: 30,
        color: theme.colors.ink,
        bold: true,
        typeface: theme.fonts.title
      });
    });
    addContactSummaryCard(slide, 468, 548, 630, 92);
  } else if (theme.id === "beige-brown") {
    metrics.forEach((metric, index) => {
      const left = 72 + (index * 286);
      addBlock(slide, left, 134, 258, 112, theme.colors.card, theme.colors.line, 1);
      addText(slide, metric.label, left + 18, 158, 180, 22, {
        fontSize: 16,
        color: theme.colors.muted,
        bold: true
      });
      addText(slide, metric.value, left + 18, 190, 220, 34, {
        fontSize: 27,
        color: theme.colors.ink,
        bold: true,
        typeface: theme.fonts.title
      });
    });

    addBlock(slide, 72, 284, 504, 338, theme.colors.card, theme.colors.line, 1);
    addText(slide, "프로젝트 메모", 102, 316, 180, 28, {
      fontSize: 22,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, buildProjectSummaryText(), 102, 360, 438, 230, {
      fontSize: 19,
      color: theme.colors.muted
    });

    addBlock(slide, 608, 284, 600, 338, theme.colors.accentSoft, theme.colors.accentSoft);
    addText(slide, "제안 포인트", 646, 316, 180, 28, {
      fontSize: 22,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addBulletRows(slide, buildProposalHighlights(), 646, 362, 498, 24, {
      color: theme.colors.ink,
      bulletFill: theme.colors.accent
    });
    addText(slide, buildContactLine(), 646, 560, 480, 24, {
      fontSize: 17,
      color: theme.colors.muted
    });
  } else {
    metrics.forEach((metric, index) => {
      const left = 72 + (index * 285);
      addBlock(slide, left, 126, 260, 104, theme.colors.card, theme.colors.line, 1);
      addText(slide, metric.label, left + 20, 148, 180, 22, {
        fontSize: 16,
        color: theme.colors.muted,
        bold: true
      });
      addText(slide, metric.value, left + 20, 178, 220, 34, {
        fontSize: 28,
        color: theme.colors.ink,
        bold: true,
        typeface: theme.fonts.title
      });
    });

    addBlock(slide, 72, 266, 564, 364, theme.colors.card, theme.colors.line, 1);
    addText(slide, "제안 개요", 100, 296, 220, 28, {
      fontSize: 20,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, buildProjectSummaryText(), 100, 338, 500, 250, {
      fontSize: 20,
      color: theme.colors.muted
    });

    addBlock(slide, 666, 266, 542, 364, theme.colors.panel, theme.colors.panel);
    addText(slide, "선정 카테고리", 704, 302, 240, 28, {
      fontSize: 20,
      color: theme.colors.white,
      bold: true,
      typeface: theme.fonts.title
    });
    addBulletRows(slide, categoryRows(), 704, 350, 430, 24, {
      color: "#E8ECEF",
      bulletFill: theme.colors.highlight
    });
  }
}

async function addProductSlide(items, pageNumber, pageCount) {
  const slide = presentation.slides.add();
  slide.background.fill = theme.colors.paper;

  addSectionHeader(slide, `Selected Products ${pageNumber}/${pageCount}`, "선정 상품");

  const positions = [
    { left: 72, top: 142, width: 540, height: 232 },
    { left: 668, top: 142, width: 540, height: 232 },
    { left: 72, top: 404, width: 540, height: 232 },
    { left: 668, top: 404, width: 540, height: 232 }
  ];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const frame = positions[index];
    await addProductCard(slide, item, frame, index);
  }
}

async function addRenderedSlide(items, pageNumber, pageCount) {
  const slide = presentation.slides.add();
  slide.background.fill = theme.colors.paper;

  addSectionHeader(slide, `Rendered Showcase ${pageNumber}/${pageCount}`, "실사 보정 이미지");

  if (theme.id === "beige-red") {
    for (let index = 0; index < items.length; index += 1) {
      const left = 72 + (index * 580);
      addBlock(slide, left, 132, 556, 510, theme.colors.card, theme.colors.line, 1);
      addBlock(slide, left, 132, 556, 14, theme.colors.accent, theme.colors.accent);
      await addImageFrame(slide, items[index].renderedImage || items[index].image, { left: left + 26, top: 158, width: 504, height: 320 }, { borderFill: theme.colors.paperAlt, padding: 0 });
      addText(slide, items[index].name || "-", left + 28, 500, 420, 28, {
        fontSize: 22,
        color: theme.colors.ink,
        bold: true,
        typeface: theme.fonts.title
      });
      addText(slide, getRenderedCaption(items[index]), left + 28, 536, 474, 72, {
        fontSize: 16,
        color: theme.colors.muted
      });
    }
    return;
  }

  if (theme.id === "beige-brown") {
    const first = items[0];
    addBlock(slide, 72, 132, 728, 500, theme.colors.card, theme.colors.line, 1);
    await addImageFrame(slide, first.renderedImage || first.image, { left: 92, top: 152, width: 688, height: 390 }, { borderFill: theme.colors.paperAlt, padding: 0 });
    addText(slide, first.name || "-", 92, 560, 420, 28, {
      fontSize: 22,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, getRenderedCaption(first), 92, 594, 660, 30, {
      fontSize: 16,
      color: theme.colors.muted
    });

    const second = items[1];
    addBlock(slide, 836, 132, 372, 500, theme.colors.accentSoft, theme.colors.accentSoft);
    addText(slide, "적용 타일 정보", 864, 164, 180, 24, {
      fontSize: 20,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addBulletRows(slide, buildSurfaceDetails(first), 864, 214, 300, 22, {
      color: theme.colors.ink,
      bulletFill: theme.colors.accent
    });
    if (second) {
      await addImageFrame(slide, second.renderedImage || second.image, { left: 864, top: 380, width: 318, height: 180 }, { borderFill: theme.colors.card, padding: 0 });
      addText(slide, second.name || "-", 864, 570, 280, 24, {
        fontSize: 16,
        color: theme.colors.ink,
        bold: true
      });
      addText(slide, getRenderedCaption(second), 864, 598, 290, 22, {
        fontSize: 14,
        color: theme.colors.muted
      });
    }
    return;
  }

  const first = items[0];
  const second = items[1];

  addBlock(slide, 72, 136, 700, 490, theme.colors.card, theme.colors.line, 1);
  await addImageFrame(slide, first.renderedImage || first.image, { left: 88, top: 152, width: 668, height: 458 }, { borderFill: theme.colors.paperAlt, padding: 0 });
  addText(slide, getRenderedCaption(first), 88, 616, 620, 24, {
    fontSize: 17,
    color: theme.colors.muted
  });

  addBlock(slide, 814, 136, 394, 490, theme.colors.panel, theme.colors.panel);
  addText(slide, "적용 정보", 846, 170, 220, 28, {
    fontSize: 20,
    color: theme.colors.white,
    bold: true,
    typeface: theme.fonts.title
  });
  addBulletRows(slide, buildSurfaceDetails(first), 846, 214, 300, 24, {
    color: "#E8ECEF",
    bulletFill: theme.colors.highlight
  });

  if (second) {
    addBlock(slide, 846, 434, 320, 128, theme.colors.card, theme.colors.card);
    await addImageFrame(slide, second.renderedImage || second.image, { left: 854, top: 442, width: 104, height: 112 }, { borderFill: theme.colors.card, padding: 0 });
    addText(slide, second.name || "-", 972, 458, 172, 22, {
      fontSize: 16,
      color: theme.colors.ink,
      bold: true,
      autoFit: "shrinkText"
    });
    addText(slide, getRenderedCaption(second), 972, 490, 174, 48, {
      fontSize: 14,
      color: theme.colors.muted
    });
  }
}

async function addEstimateSlide() {
  const slide = presentation.slides.add();
  slide.background.fill = theme.colors.paper;

  addSectionHeader(slide, "Estimate Summary", "견적 요약");

  if (theme.id === "beige-red") {
    addBlock(slide, 72, 134, 1136, 84, theme.colors.accentSoft, theme.colors.accentSoft);
    const totals = [
      ["공급가", formatMoney(payload.summary.subtotal)],
      ["부가세", formatMoney(payload.summary.vat)],
      ["총 금액", formatMoney(payload.summary.total)]
    ];
    totals.forEach(([label, value], index) => {
      const left = 110 + (index * 350);
      addText(slide, label, left, 154, 120, 18, {
        fontSize: 15,
        color: theme.colors.accent,
        bold: true
      });
      addText(slide, value, left, 178, 220, 28, {
        fontSize: 26,
        color: theme.colors.ink,
        bold: true,
        typeface: theme.fonts.title
      });
    });
    addEstimateTable(slide, { left: 72, top: 258, width: 760, height: 370 });
    addEstimateNotePanel(slide, { left: 870, top: 258, width: 338, height: 370 });
    return;
  }

  if (theme.id === "beige-brown") {
    addEstimateTable(slide, { left: 72, top: 142, width: 690, height: 500 });
    addBlock(slide, 804, 142, 404, 500, theme.colors.accentSoft, theme.colors.accentSoft);
    addText(slide, "금액 정리", 838, 178, 180, 28, {
      fontSize: 22,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addSummaryTotals(slide, 838, 236, 336);
    addText(slide, "안내 사항", 838, 450, 160, 24, {
      fontSize: 18,
      color: theme.colors.accent,
      bold: true
    });
    addText(slide, buildEstimateNote(), 838, 484, 304, 100, {
      fontSize: 16,
      color: theme.colors.muted
    });
    return;
  }

  addEstimateTable(slide, { left: 72, top: 132, width: 760, height: 520 });
  addBlock(slide, 870, 132, 338, 520, theme.colors.panel, theme.colors.panel);
  addText(slide, "견적 합계", 904, 170, 200, 26, {
    fontSize: 22,
    color: theme.colors.white,
    bold: true,
    typeface: theme.fonts.title
  });
  addSummaryTotals(slide, 904, 236, 270, { inverted: true });
  addText(slide, buildEstimateNote(), 904, 500, 236, 72, {
    fontSize: 16,
    color: "#E4ECEE"
  });
}

async function addContactSlide() {
  const slide = presentation.slides.add();
  slide.background.fill = theme.colors.paper;

  if (theme.id === "beige-red") {
    addBlock(slide, 0, 0, W, H, theme.colors.paper, theme.colors.paper);
    addBlock(slide, 0, 0, W, 120, theme.colors.panel, theme.colors.panel);
    addText(slide, "Contact & Closing", 72, 44, 260, 30, {
      fontSize: 28,
      color: theme.colors.white,
      bold: true,
      typeface: theme.fonts.title
    });
    addBlock(slide, 72, 170, 470, 420, theme.colors.card, theme.colors.line, 1);
    addText(slide, companyDisplayName(), 108, 210, 320, 32, {
      fontSize: 28,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, buildManagerBlock(), 108, 266, 320, 120, {
      fontSize: 19,
      color: theme.colors.muted
    });
    addText(slide, "감사합니다. 제안드린 상품과 실사보정 이미지를 기준으로 상담을 이어가실 수 있습니다.", 108, 434, 340, 90, {
      fontSize: 18,
      color: theme.colors.ink
    });
    await addClosingImageStrip(slide, 614, 170, 594, 420, 3);
    return;
  }

  if (theme.id === "beige-brown") {
    addBlock(slide, 72, 82, 1136, 556, theme.colors.card, theme.colors.line, 1);
    addText(slide, "상담 및 마무리 안내", 108, 118, 280, 30, {
      fontSize: 28,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, "선정 상품과 보정 이미지를 기준으로 후속 상담, 색상 조정, 수량 검토를 이어갈 수 있도록 정리했습니다.", 108, 166, 450, 70, {
      fontSize: 20,
      color: theme.colors.muted
    });
    addBlock(slide, 108, 272, 350, 250, theme.colors.accentSoft, theme.colors.accentSoft);
    addText(slide, companyDisplayName(), 136, 304, 280, 32, {
      fontSize: 28,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addText(slide, buildManagerBlock(), 136, 360, 270, 100, {
      fontSize: 18,
      color: theme.colors.muted
    });
    await addClosingImageStrip(slide, 514, 164, 640, 390, 4);
    return;
  }

  addBlock(slide, 0, 0, W, H, theme.colors.paper, theme.colors.paper);
  addBlock(slide, 0, 0, 138, H, theme.colors.panel, theme.colors.panel);
  addText(slide, "Thanks", 180, 116, 180, 44, {
    fontSize: 42,
    color: theme.colors.ink,
    bold: true,
    typeface: theme.fonts.title
  });
  addText(slide, "선정 상품과 실사보정 결과를 바탕으로 다음 상담을 이어갈 수 있도록 정리했습니다.", 180, 180, 410, 76, {
    fontSize: 20,
    color: theme.colors.muted
  });
  addBlock(slide, 180, 314, 356, 216, theme.colors.card, theme.colors.line, 1);
  addText(slide, companyDisplayName(), 208, 346, 290, 30, {
    fontSize: 28,
    color: theme.colors.ink,
    bold: true,
    typeface: theme.fonts.title
  });
  addText(slide, buildManagerBlock(), 208, 402, 250, 84, {
    fontSize: 18,
    color: theme.colors.muted
  });
  await addClosingImageStrip(slide, 624, 112, 534, 458, 3);
}

async function addProductCard(slide, item, frame, index) {
  const cardFill = theme.id === "beige-brown" && index % 2 === 1 ? theme.colors.accentSoft : theme.colors.card;
  addRoundBlock(slide, frame.left, frame.top, frame.width, frame.height, cardFill, theme.colors.line, 1, 0.12);

  if (theme.id === "beige-red") {
    addBlock(slide, frame.left, frame.top, 14, frame.height, theme.colors.accent, theme.colors.accent);
  } else if (theme.id === "beige-black") {
    addBlock(slide, frame.left, frame.top, frame.width, 12, theme.colors.highlight, theme.colors.highlight);
  }

  const imageWidth = theme.id === "beige-brown" ? 196 : 172;
  const imageHeight = theme.id === "beige-brown" ? 188 : 192;
  await addImageFrame(
    slide,
    item.renderedImage || item.image,
    { left: frame.left + 20, top: frame.top + 20, width: imageWidth, height: imageHeight },
    { borderFill: theme.colors.paperAlt, padding: 0 }
  );

  const textLeft = frame.left + imageWidth + 42;
  addText(slide, item.name || "-", textLeft, frame.top + 24, frame.width - imageWidth - 60, 42, {
    fontSize: 22,
    color: theme.colors.ink,
    bold: true,
    typeface: theme.fonts.title,
    autoFit: "shrinkText"
  });
  addText(slide, buildProductMeta(item), textLeft, frame.top + 76, frame.width - imageWidth - 60, 36, {
    fontSize: 15,
    color: theme.id === "beige-red" ? theme.colors.accent : theme.colors.muted,
    bold: true
  });
  addText(slide, `규격  ${item.size || "-"}`, textLeft, frame.top + 120, 260, 22, {
    fontSize: 17,
    color: theme.colors.ink
  });
  addText(slide, `수량  ${formatQty(item.qty, item.unit)}`, textLeft, frame.top + 150, 260, 22, {
    fontSize: 17,
    color: theme.colors.ink
  });
  addText(slide, `견적가  ${formatMoney(item.quotePrice)}`, textLeft, frame.top + 180, 280, 22, {
    fontSize: 18,
    color: theme.colors.ink,
    bold: true
  });
}

function addEstimateTable(slide, frame) {
  addBlock(slide, frame.left, frame.top, frame.width, frame.height, theme.colors.card, theme.colors.line, 1);
  addText(slide, "품목", frame.left + 32, frame.top + 30, 260, 22, { fontSize: 16, color: theme.colors.muted, bold: true });
  addText(slide, "규격", frame.left + 342, frame.top + 30, 150, 22, { fontSize: 16, color: theme.colors.muted, bold: true });
  addText(slide, "수량", frame.left + 510, frame.top + 30, 80, 22, { fontSize: 16, color: theme.colors.muted, bold: true });
  addText(slide, "견적가", frame.left + 610, frame.top + 30, 120, 22, { fontSize: 16, color: theme.colors.muted, bold: true });

  payload.cart.slice(0, 8).forEach((item, index) => {
    const top = frame.top + 70 + (index * 48);
    addBlock(slide, frame.left + 24, top + 30, frame.width - 48, 1, theme.colors.line, theme.colors.line);
    addText(slide, item.name || "-", frame.left + 32, top, 280, 22, {
      fontSize: 16,
      color: theme.colors.ink,
      autoFit: "shrinkText"
    });
    addText(slide, item.size || "-", frame.left + 342, top, 140, 22, {
      fontSize: 15,
      color: theme.colors.ink
    });
    addText(slide, formatQty(item.qty, item.unit), frame.left + 510, top, 84, 22, {
      fontSize: 15,
      color: theme.colors.ink
    });
    addText(slide, formatMoney(item.quotePrice), frame.left + 610, top, 110, 22, {
      fontSize: 15,
      color: theme.colors.ink,
      bold: true
    });
  });

  if (payload.cart.length > 8) {
    addText(slide, `외 ${payload.cart.length - 8}개 품목은 장바구니와 견적서에서 계속 확인할 수 있습니다.`, frame.left + 32, frame.top + frame.height - 42, frame.width - 64, 20, {
      fontSize: 14,
      color: theme.colors.muted
    });
  }
}

function addEstimateNotePanel(slide, frame) {
  addBlock(slide, frame.left, frame.top, frame.width, frame.height, theme.colors.panel, theme.colors.panel);
  addText(slide, "상담 메모", frame.left + 30, frame.top + 34, 180, 26, {
    fontSize: 22,
    color: theme.colors.white,
    bold: true,
    typeface: theme.fonts.title
  });
  addText(slide, payload.proposal.memo || "추가 메모는 아직 입력되지 않았습니다.", frame.left + 30, frame.top + 82, frame.width - 60, 168, {
    fontSize: 17,
    color: "#E7E6E3"
  });
  addText(slide, buildEstimateNote(), frame.left + 30, frame.top + 302, frame.width - 60, 80, {
    fontSize: 15,
    color: "#D5D9DB"
  });
  addText(slide, buildContactLine(), frame.left + 30, frame.top + 420, frame.width - 60, 48, {
    fontSize: 16,
    color: theme.colors.white
  });
}

function addSummaryTotals(slide, left, top, width, options = {}) {
  const rows = [
    ["공급가", formatMoney(payload.summary.subtotal)],
    ["부가세", formatMoney(payload.summary.vat)],
    ["총 제안금액", formatMoney(payload.summary.total)]
  ];
  const labelColor = options.inverted ? "#E4ECEE" : theme.colors.muted;
  const valueColor = options.inverted ? theme.colors.white : theme.colors.ink;
  const fill = options.inverted ? theme.colors.card : theme.colors.card;
  const line = options.inverted ? theme.colors.card : theme.colors.line;

  rows.forEach(([label, value], index) => {
    const rowTop = top + (index * 102);
    addBlock(slide, left, rowTop, width, 76, fill, line, options.inverted ? 0 : 1);
    addText(slide, label, left + 20, rowTop + 16, width - 40, 18, {
      fontSize: 15,
      color: labelColor,
      bold: true
    });
    addText(slide, value, left + 20, rowTop + 38, width - 40, 24, {
      fontSize: 24,
      color: valueColor,
      bold: true,
      typeface: theme.fonts.title
    });
  });
}

function addSectionHeader(slide, eyebrow, title) {
  if (theme.id === "beige-red") {
    addText(slide, eyebrow, 72, 54, 260, 24, {
      fontSize: 15,
      color: theme.colors.accent,
      bold: true
    });
    addText(slide, title, 72, 84, 320, 42, {
      fontSize: 32,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    addBlock(slide, 72, 122, 84, 6, theme.colors.accent, theme.colors.accent);
    return;
  }

  if (theme.id === "beige-brown") {
    addText(slide, eyebrow, 72, 54, 260, 24, {
      fontSize: 15,
      color: theme.colors.accent,
      bold: true
    });
    addText(slide, title, 72, 84, 320, 42, {
      fontSize: 30,
      color: theme.colors.ink,
      bold: true,
      typeface: theme.fonts.title
    });
    return;
  }

  addText(slide, eyebrow, 72, 58, 240, 24, {
    fontSize: 16,
    color: theme.colors.highlight,
    bold: true
  });
  addText(slide, title, 72, 86, 320, 40, {
    fontSize: 30,
    color: theme.colors.ink,
    bold: true,
    typeface: theme.fonts.title
  });
}

function addMeta(slide, label, value, left, top, width) {
  addText(slide, label, left, top, 120, 22, {
    fontSize: 15,
    color: theme.colors.accent,
    bold: true
  });
  addText(slide, value, left, top + 24, width, 28, {
    fontSize: 20,
    color: theme.colors.ink,
    typeface: theme.fonts.title,
    autoFit: "shrinkText"
  });
}

function addContactStrip(slide, left, top, width, height) {
  addBlock(slide, left, top, width, height, theme.colors.card, theme.colors.line, 1);
  addText(slide, companyDisplayName(), left + 18, top + 16, width - 36, 22, {
    fontSize: 18,
    color: theme.colors.ink,
    bold: true
  });
  addText(slide, buildContactLine(), left + 18, top + 42, width - 36, 22, {
    fontSize: 14,
    color: theme.colors.muted
  });
}

function addContactSummaryCard(slide, left, top, width, height) {
  addBlock(slide, left, top, width, height, theme.colors.card, theme.colors.line, 1);
  addText(slide, companyDisplayName(), left + 20, top + 18, 260, 22, {
    fontSize: 18,
    color: theme.colors.ink,
    bold: true
  });
  addText(slide, buildContactLine(), left + 20, top + 48, width - 40, 22, {
    fontSize: 15,
    color: theme.colors.muted
  });
}

function addBlock(slide, left, top, width, height, fill, line = fill, lineWidth = 0) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: line, width: lineWidth }
  });
}

function addRoundBlock(slide, left, top, width, height, fill, line, lineWidth, roundness = 0.16) {
  return slide.shapes.add({
    geometry: "roundRect",
    adjustmentList: [{ name: "adj", formula: `val ${Math.round(roundness * 100000)}` }],
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
  box.text.color = options.color ?? theme.colors.ink;
  box.text.bold = Boolean(options.bold);
  box.text.typeface = options.typeface ?? theme.fonts.body;
  box.text.alignment = options.alignment ?? "left";
  box.text.verticalAlignment = options.verticalAlignment ?? "top";
  box.text.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  if (options.autoFit) {
    box.text.autoFit = options.autoFit;
  }
  return box;
}

function addBulletRows(slide, rows, left, top, width, rowHeight, options = {}) {
  rows.filter(Boolean).slice(0, 8).forEach((row, index) => {
    const rowTop = top + (index * rowHeight);
    addBlock(slide, left, rowTop + 4, 12, 12, options.bulletFill || theme.colors.accent, options.bulletFill || theme.colors.accent);
    addText(slide, row, left + 22, rowTop, width - 22, rowHeight + 8, {
      fontSize: 16,
      color: options.color || theme.colors.ink
    });
  });
}

async function addImageFrame(slide, source, frame, options = {}) {
  const padding = options.padding ?? 8;
  if (padding > 0) {
    addBlock(
      slide,
      frame.left - padding,
      frame.top - padding,
      frame.width + (padding * 2),
      frame.height + (padding * 2),
      options.borderFill || theme.colors.card,
      options.borderLine || theme.colors.line,
      options.borderWidth ?? 1
    );
  }
  return addImageOrPlaceholder(slide, source, frame, options.alt || "proposal-image");
}

async function addImageOrPlaceholder(slide, source, frame, alt) {
  const imageConfig = await resolveImageConfig(source, alt);
  if (imageConfig) {
    const image = slide.images.add(imageConfig);
    image.position = frame;
    return image;
  }

  addBlock(slide, frame.left, frame.top, frame.width, frame.height, theme.colors.accentSoft, theme.colors.line, 1);
  addText(slide, "이미지 준비중", frame.left + 24, frame.top + (frame.height / 2) - 12, frame.width - 48, 24, {
    fontSize: 17,
    color: theme.colors.accent,
    bold: true,
    alignment: "center"
  });
  return null;
}

async function addClosingImageStrip(slide, left, top, width, height, maxCount) {
  const images = collectHeroImages(maxCount);
  if (!images.length) {
    addBlock(slide, left, top, width, height, theme.colors.accentSoft, theme.colors.line, 1);
    addText(slide, "상품 또는 실사보정 이미지를 추가하면 마지막 슬라이드에 함께 배치됩니다.", left + 24, top + (height / 2) - 22, width - 48, 44, {
      fontSize: 18,
      color: theme.colors.muted,
      alignment: "center"
    });
    return;
  }

  const gap = 18;
  const cellWidth = (width - (gap * (images.length - 1))) / images.length;
  for (let index = 0; index < images.length; index += 1) {
    await addImageFrame(
      slide,
      images[index],
      { left: left + (index * (cellWidth + gap)), top, width: cellWidth, height },
      { borderFill: theme.colors.card, padding: 0 }
    );
  }
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

function collectHeroImages(maxCount = 3) {
  return payload.cart
    .flatMap((item) => [item.renderedImage, item.image].filter(Boolean))
    .filter(Boolean)
    .slice(0, maxCount);
}

function categoryRows() {
  return [...new Set(payload.cart.map((item) => [item.kind, item.productType].filter(Boolean).join(" · ")).filter(Boolean))];
}

function buildCoverCopy() {
  return `${payload.proposal.customerName || "고객"} 현장에 맞춰 선정한 타일, 위생도기, 부자재를 전문 제안서 형식으로 정리했습니다.`;
}

function buildProjectSummaryText() {
  return [
    `${payload.proposal.customerName || "고객"} 현장의 주소는 ${payload.proposal.siteAddress || "미입력"}입니다.`,
    `공사 희망일은 ${payload.proposal.startDate || "미정"}이며, 제안서 유효기간은 ${payload.proposal.validDays}일입니다.`,
    "",
    payload.proposal.memo || "추가 메모는 아직 입력되지 않았습니다."
  ].join("\n");
}

function buildEstimateNote() {
  return `본 제안은 ${formatDate(payload.proposal.validDate)}까지 유효합니다.\n현장 실측, 재고, 시공 조건에 따라 최종 금액은 조정될 수 있습니다.`;
}

function buildProposalHighlights() {
  const rows = [
    `${payload.summary.itemCount}개 품목을 장바구니 기준으로 정리`,
    "상품 이미지와 핵심 규격을 한 번에 비교 가능",
    renderedItems.length ? `실사보정 이미지 ${renderedItems.length}건 포함` : "실사보정 이미지는 생성 후 자동 포함 가능",
    `업체 정보는 ${companyDisplayName()} 기준으로 표지와 마지막 슬라이드에 반영`
  ];
  return rows;
}

function buildProductMeta(item) {
  return [item.kind, item.option || item.finish, item.maker].filter(Boolean).join(" · ") || item.productType || "-";
}

function buildSurfaceDetails(item) {
  const rows = [];
  const selections = item.renderSurfaceSelections || {};
  ["wall", "floor", "point"].forEach((surface) => {
    const tileId = selections?.[surface]?.tileId || "";
    if (!tileId) return;
    const tile = payload.cart.find((entry) => entry.id === tileId);
    const label = surface === "wall" ? "벽" : surface === "floor" ? "바닥" : "포인트";
    const extra = surface === "point" && item.renderPointMemo ? ` (${item.renderPointMemo})` : "";
    rows.push(`${label}${extra}: ${tile?.name || "선택 타일"}${tile?.size ? ` · ${tile.size}` : ""}`);
  });
  if (!rows.length) {
    rows.push(item.renderTarget || "적용 영역 정보 없음");
  }
  return rows;
}

function getRenderedCaption(item) {
  const area = item.renderTarget ? `적용 영역: ${item.renderTarget}` : "적용 영역 정보 없음";
  const memo = item.renderPointMemo ? ` · ${item.renderPointMemo}` : "";
  return `${area}${memo}`;
}

function companyDisplayName() {
  return payload.company?.name || "타일앤바스플러스";
}

function buildContactLine() {
  const parts = [payload.company?.managerName, payload.company?.managerTitle, payload.company?.managerPhone].filter(Boolean);
  return parts.join(" · ") || "담당자 정보 미입력";
}

function buildManagerBlock() {
  return [companyDisplayName(), buildContactLine()].filter(Boolean).join("\n");
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
