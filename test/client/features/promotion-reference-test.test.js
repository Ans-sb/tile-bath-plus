const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../..");
const html = fs.readFileSync(path.join(root, "promotion-reference-test.html"), "utf8");
const css = fs.readFileSync(path.join(root, "promotion-reference-test.css"), "utf8");
const script = fs.readFileSync(path.join(root, "promotion-reference-test.js"), "utf8");
const appHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appCss = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const appScript = fs.readFileSync(path.join(root, "app.js"), "utf8");

test("promotion reference page follows the full JAJAEGO landing flow", () => {
  assert.match(html, /id="top"/);
  assert.match(html, /id="numbers"/);
  assert.match(html, /id="promises"/);
  assert.match(html, /id="ai-tools"/);
  assert.match(html, /id="calculator"/);
  assert.match(html, /id="field-preview"/);
  assert.match(html, /id="catalog"/);
  assert.match(html, /id="business"/);
  assert.match(html, /id="process"/);
  assert.match(html, /id="faq"/);
  assert.match(html, /빠른 출고/);
  assert.match(html, /제안서·견적서/);
  assert.match(html, /현장 자재 검색의/);
  assert.match(html, /<mark>새로운 기준<\/mark>/);
  assert.match(html, /hero-warehouse-aisle-20260802\.webp/);
  assert.match(html, /hero-tile-warehouse-20260802\.webp/);
  assert.doesNotMatch(html, /promo-visual-badge/);
  assert.match(html, /fast-material-search-20260802\.webp/);
  assert.match(html, /promo-service-card-search/);
  assert.match(html, /one-click-tile-sample-20260802\.webp/);
  assert.match(html, /클릭 한 번으로<br \/>샘플을 받을 수 있습니다/);
  assert.match(html, /href="\/#samplePage"/);
  assert.match(html, /field-next-morning-delivery-20260803\.webp/);
  assert.match(html, /promo-service-card-field/);
  assert.match(html, /오늘 주문하면<br \/>내일 아침 현장 도착/);
  assert.match(html, /선택한 자재를 현장 일정에 맞춰 빠르게 배송합니다/);
  assert.match(html, /one-click-proposal-consulting-20260802\.webp/);
  assert.match(html, /견적서·제안서,<br \/>이제 클릭 한 번으로/);
  assert.match(html, /장바구니 상품으로 고객 제안서 제작/);
  assert.equal(html.includes("promo-hero-watermark"), false);
  assert.match(html, /data-platform-stat="totalProducts"/);
  assert.match(html, /data-platform-stat="tileProducts"/);
  assert.match(html, /data-platform-stat="partnerCompanies">342/);
  assert.match(html, /data-platform-stat="fieldDeliveries">10,800/);
  assert.doesNotMatch(html, /통합 상품군/);
  assert.doesNotMatch(html, /사진과 말로 함께 찾기/);
  assert.match(html, /<strong>AI 타일검색<\/strong>/);
  assert.equal((html.match(/class="promo-service-card /g) || []).length, 3);
});

test("promotion reference page remains responsive and interactive", () => {
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.promo-hero-visual\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media \(max-width:\s*760px\)/);
  assert.match(css, /\.promo-service-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(script, /promoMenuButton/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /promoMotionInitialized/);
  assert.match(script, /promo-header-scrolled/);
  assert.match(script, /applyStagger/);
  assert.match(script, /\[data-counter\], \[data-platform-stat\]/);
  assert.match(css, /@keyframes promo-hero-enter/);
  assert.match(css, /@keyframes promo-media-float-primary/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(script, /\/api\/public\/platform-stats/);
  assert.match(script, /calculateQuantity/);
  assert.match(script, /promo-faq-item/);
});

test("promotion reference page does not expose internal product metadata", () => {
  [
    "internal_brand_id",
    "internal_brand_code",
    "internal_brand_name",
    "supplier_name",
    "margin_grade",
    "quality_grade",
  ].forEach((field) => {
    assert.equal(html.includes(field), false, `${field} must stay out of the customer page`);
  });
});

test("approved promotion design is mounted only on the guest home", () => {
  assert.match(appHtml, /id="guestHomeGate"[\s\S]*data-promo-source="\/promotion-reference-test\.html\?v=[^"]+"/);
  assert.match(appHtml, /promotion-reference-test\.css\?v=[^"]+/);
  assert.match(appHtml, /promotion-reference-test\.js\?v=[^"]+/);
  assert.doesNotMatch(html, /promo-scroll-link|>SCROLL</);
  assert.doesNotMatch(css, /promo-scroll-link|promo-scroll-pulse/);
  assert.match(html, /field-cart-tile-preview-20260802\.webp/);
  assert.match(html, /tile-material-quantity-20260802\.webp/);
  assert.match(html, /construction-materials-20260802\.webp/);
  assert.match(html, /bathroom-products-navy-20260802\.webp/);
  assert.match(html, /현장주문은 <em>이렇게 진행됩니다<\/em>/);
  assert.match(html, /<span>01<\/span>[\s\S]*상품 담기/);
  assert.match(html, /<span>02<\/span>[\s\S]*샘플 신청/);
  assert.match(html, /<span>03<\/span>[\s\S]*현장 배송/);
  assert.doesNotMatch(html, /<span>04<\/span>|<span>05<\/span>|<span>06<\/span>/);
  assert.match(html, /현장 사진에 장바구니 타일 적용/);
  assert.match(script, /host\.replaceChildren/);
  assert.match(script, /APP_PAGE_HASH_PATTERN/);
  assert.match(appScript, /classList\.toggle\("guest-session", !isLoggedIn\)/);
  assert.match(appScript, /guestHomeGate\?\.classList\.toggle\("hidden", isLoggedIn\)/);
  assert.match(appScript, /memberHomeExperience\?\.classList\.toggle\("hidden", !isLoggedIn\)/);
  assert.match(appCss, /body\.guest-session\[data-page="homePage"\][\s\S]*\.app-shell > \.topbar/);
});
