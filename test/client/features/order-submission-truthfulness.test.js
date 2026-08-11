const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../../..");

test("failed or ambiguous server submission is never fabricated as a successful order", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const start = source.indexOf("async function saveCurrentCartAsPastOrder()");
  const end = source.indexOf("const QUALITY_CORE_FIELDS", start);
  const body = source.slice(start, end);

  assert.ok(start >= 0 && end > start, "order submission function must exist");
  assert.match(body, /if \(orderSubmissionInFlight\) return;/);
  assert.match(body, /clientOrderId/);
  assert.match(source, /function getOrCreatePendingOrderAttempt\(signature\)/);
  assert.match(source, /localStorage\.setItem\(storageKey[\s\S]*signature, clientOrderId/);
  assert.match(body, /getOrCreatePendingOrderAttempt\(attemptSignature\)/);
  assert.match(body, /body: JSON\.stringify\(\{[\s\S]*clientOrderId/);
  assert.match(body, /const acceptOrder = \(rawOrder\)/);
  assert.match(body, /reconciliation[\s\S]*clientOrderId/);
  assert.match(body, /주문 응답을 확인하지 못했습니다/);
  assert.doesNotMatch(body, /orderNumber: `TBP-/);
  assert.doesNotMatch(body, /totalQuote: getCartQuoteTotal/);
  assert.match(body, /finally \{[\s\S]*orderSubmissionInFlight = false;/);
});

test("approval rule UI only commits local state after authenticated persistence succeeds", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const start = source.indexOf("async function saveApprovalRulesFromForm()");
  const end = source.indexOf("function parseRuleInput", start);
  const body = source.slice(start, end);
  const catchIndex = body.indexOf("} catch (error) {");
  const commitIndex = body.indexOf("localStorage.setItem(\"tbpApprovalRules\"");

  assert.ok(start >= 0 && end > start);
  assert.match(body, /const previousRules = cloneApprovalRules/);
  assert.match(body, /catch \(error\)[\s\S]*approvalRules = previousRules;[\s\S]*return;/);
  assert.match(body, /savedRules = await requestJson/);
  assert.match(body, /approvalRules = \{[\s\S]*businessTypes: savedRules\.businessTypes[\s\S]*businessItems: savedRules\.businessItems/);
  assert.ok(commitIndex > catchIndex, "local approval state must only commit after the server request succeeds");
});
