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
  assert.match(html, /id="services"/);
  assert.match(html, /id="catalog"/);
  assert.match(html, /id="business"/);
  assert.match(html, /id="process"/);
  assert.match(html, /빠른 출고/);
  assert.match(html, /제안서·견적서/);
  assert.equal((html.match(/class="promo-service-card /g) || []).length, 4);
});

test("promotion reference page remains responsive and interactive", () => {
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media \(max-width:\s*760px\)/);
  assert.match(css, /\.promo-service-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(script, /promoMenuButton/);
  assert.match(script, /IntersectionObserver/);
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
  assert.match(appHtml, /id="guestHomeGate"[\s\S]*data-promo-source="\/promotion-reference-test\.html\?v=4"/);
  assert.match(appHtml, /promotion-reference-test\.css\?v=20260730-promo-main3/);
  assert.match(appHtml, /promotion-reference-test\.js\?v=20260730-promo-main1/);
  assert.match(script, /host\.replaceChildren/);
  assert.match(script, /APP_PAGE_HASH_PATTERN/);
  assert.match(appScript, /classList\.toggle\("guest-session", !isLoggedIn\)/);
  assert.match(appScript, /guestHomeGate\?\.classList\.toggle\("hidden", isLoggedIn\)/);
  assert.match(appScript, /memberHomeExperience\?\.classList\.toggle\("hidden", !isLoggedIn\)/);
  assert.match(appCss, /body\.guest-session\[data-page="homePage"\][\s\S]*\.app-shell > \.topbar/);
});
