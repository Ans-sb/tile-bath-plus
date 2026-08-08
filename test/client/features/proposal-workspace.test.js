const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../../..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const stylesCss = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

test("proposal page presents a compact three-step workflow", () => {
  assert.match(indexHtml, /<span class="proposal-step-badge">1<\/span>[\s\S]*?<h2>제안서 내용<\/h2>/);
  assert.match(indexHtml, /<span class="proposal-step-badge">2<\/span>[\s\S]*?<h3>상품 선택<\/h3>/);
  assert.match(indexHtml, /<span class="proposal-step-badge">3<\/span>[\s\S]*?<strong>제안서 확인<\/strong>/);
  assert.match(indexHtml, /<details class="wide proposal-advanced-panel">/);
  assert.match(indexHtml, /id="createProProposalBtn"[^>]*>프로 제안서 만들기<\/button>/);
  assert.match(indexHtml, /class="proposal-template-grid"/);
  assert.match(indexHtml, /<strong>클린 비즈니스<\/strong>/);
  assert.match(indexHtml, /<strong>비주얼 프리미엄<\/strong>/);
  assert.match(indexHtml, /<strong>웜 인테리어<\/strong>/);
  assert.doesNotMatch(indexHtml, /Proposal Template|Choose What To Include|Company Info|Minimal Proposal|Creative Brief|Warm Neutral/);
});

test("proposal generation sends the active member or admin session to the server", () => {
  const start = appJs.indexOf("async function generateProfessionalProposalDeck(");
  const end = appJs.indexOf("function showProposalGenerationDialog(", start);
  const source = appJs.slice(start, end);

  assert.match(source, /getAdminAuthHeaders\(\{ "Content-Type": "application\/json" \}\)/);
  assert.match(source, /getMemberProductAuthHeaders\(\{ "Content-Type": "application\/json" \}\)/);
  assert.match(source, /timeoutMs:\s*120000/);
});

test("proposal workspace stays split on desktop and stacks on mobile", () => {
  assert.match(stylesCss, /#proposalPage\s*\{[\s\S]*?grid-template-columns:\s*minmax\(420px, 0\.92fr\) minmax\(520px, 1\.08fr\)/);
  assert.match(stylesCss, /\.proposal-preview-panel\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(stylesCss, /@media \(max-width: 980px\)[\s\S]*?#proposalPage\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
});

test("proposal rendering uses one selected-product list with Korean states", () => {
  const start = appJs.indexOf("function renderProposalSelectionControls(");
  const end = appJs.indexOf("function renderProposalRenderedItems(", start);
  const proposalSource = appJs.slice(start, end);
  const itemListAssignments = proposalSource.match(/document\.querySelector\("#proposalItems"\)\.innerHTML/g) || [];

  assert.equal(itemListAssignments.length, 1);
  assert.doesNotMatch(proposalSource, /products selected|No Image|No selected products|Open render workspace|Add contact details/);
  assert.match(proposalSource, /선택 상품/);
  assert.match(proposalSource, /이미지 없음/);
  assert.match(proposalSource, /선정된 품목이 없습니다/);
});
