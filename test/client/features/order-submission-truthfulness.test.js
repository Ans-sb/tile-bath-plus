const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../../..");

test("failed server order submission is not persisted as a successful local order", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const start = source.indexOf("async function saveCurrentCartAsPastOrder()");
  const end = source.indexOf("const QUALITY_CORE_FIELDS", start);
  const body = source.slice(start, end);
  const catchStart = body.indexOf("} catch (error) {");
  const saveStart = body.indexOf("savePastOrders(");

  assert.ok(start >= 0 && end > start, "order submission function must exist");
  assert.ok(catchStart >= 0 && saveStart > catchStart, "failure handling must precede persistence");
  const failureBranch = body.slice(catchStart, saveStart);
  assert.match(failureBranch, /window\.alert\(/);
  assert.match(failureBranch, /return;/);
  assert.match(body, /if \(orderSubmissionInFlight\) return;/);
  assert.match(body, /clientOrderId/);
  assert.match(body, /if \(!payload\?\.order\) throw/);
  assert.match(body, /finally \{[\s\S]*orderSubmissionInFlight = false;/);
});
