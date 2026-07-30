const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../../..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");

test("signup page exposes only Google, Kakao, and Naver signup actions", () => {
  const signupStart = indexHtml.indexOf('id="signupPage"');
  const partnerStart = indexHtml.indexOf('id="partnerApplicationPage"');
  const signupMarkup = indexHtml.slice(signupStart, partnerStart);

  assert.ok(signupStart >= 0);
  assert.ok(partnerStart > signupStart);
  assert.match(signupMarkup, /id="googleSignupBtn"/);
  assert.match(signupMarkup, /id="kakaoSignupBtn"/);
  assert.match(signupMarkup, /id="naverSignupBtn"/);
  assert.match(signupMarkup, /id="signupEntryStatus" role="status" aria-live="polite"><\/div>/);
  assert.doesNotMatch(signupMarkup, /Google, 카카오, 네이버 중 하나를 선택해주세요/);
  assert.doesNotMatch(signupMarkup, /id="signupForm"/);
  assert.doesNotMatch(signupMarkup, /name="businessNumber"/);
  assert.doesNotMatch(signupMarkup, /type="password"/);
});

test("signup page uses compact typography and controls", () => {
  const stylesCss = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

  assert.match(stylesCss, /#signupPage \.social-signup-heading h2\s*\{[\s\S]*?font-size:\s*28px/);
  assert.match(stylesCss, /#signupPage \.social-signup-copy h3\s*\{[\s\S]*?font-size:\s*30px/);
  assert.match(
    stylesCss,
    /#signupPage \.social-signup-grid--entry \.social-signup-button strong\s*\{[\s\S]*?font-size:\s*15px/
  );
});

test("partner application owns business verification and contact fields", () => {
  const partnerStart = indexHtml.indexOf('id="partnerApplicationPage"');
  const productsStart = indexHtml.indexOf('id="productsPage"');
  const partnerMarkup = indexHtml.slice(partnerStart, productsStart);

  assert.ok(partnerStart >= 0);
  assert.ok(productsStart > partnerStart);
  assert.match(partnerMarkup, /id="signupForm"/);
  assert.match(partnerMarkup, /id="signupBizFile"/);
  assert.match(partnerMarkup, /id="signupBusinessCardFile"/);
  assert.match(partnerMarkup, /파트너 등록 신청/);
  assert.doesNotMatch(partnerMarkup, /id="googleSignupBtn"/);
  assert.doesNotMatch(partnerMarkup, /id="saveApprovalRulesBtn"/);
  assert.doesNotMatch(partnerMarkup, /type="password"/);
});

test("social signup callback continues on the partner application page", () => {
  const partnerRedirects = appJs.match(/switchPage\("partnerApplicationPage"\)/g) || [];

  assert.ok(partnerRedirects.length >= 2);
  assert.match(appJs, /tbpPendingSocialSignupProfile/);
  assert.match(appJs, /socialSignupToken/);
  assert.match(appJs, /const approvalStatus = "보류"/);
  assert.doesNotMatch(appJs, /catch \(error\) \{\s*console\.warn\(error\);\s*saveSignupRequest\(signupPayload\)/);
  assert.match(appJs, /renderPartnerApplicationAccess/);
});
