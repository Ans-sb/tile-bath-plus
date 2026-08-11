const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createSampleRequestStore } = require("../../../src/server/features/sample-requests/sample-request-store");

test("sample request store keeps member requests private and customer-safe", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jajaego-sample-request-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createSampleRequestStore({ filePath: path.join(directory, "sample-requests.json") });
  const owner = { type: "member", id: "123-45-67890" };

  const created = await store.createRequest({
    owner,
    projectId: "project-1",
    projectTitle: "Seongsu cafe",
    recipient: { name: "Alex", contact: "010-0000-0000", address: "Seoul" },
    items: [{
      id: "snt-1",
      code: "SNT-001",
      name: "Beige stone",
      size: "600*600",
      finish: "matte",
      internal_brand_name: "PRIVATE_BRAND",
      supplier_name: "PRIVATE_SUPPLIER",
      cost: 12000
    }]
  });

  assert.match(created.requestNumber, /^S\d{8}-0001$/);
  assert.equal(created.items.length, 1);
  assert.doesNotMatch(JSON.stringify(created), /PRIVATE|supplier|cost|internal_brand/i);
  assert.equal((await store.listRequests(owner)).length, 1);
  assert.deepEqual(await store.listRequests({ type: "member", id: "000-00-00000" }), []);
});

test("sample request store lets an admin update delivery state without exposing internal catalog fields", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jajaego-sample-admin-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createSampleRequestStore({ filePath: path.join(directory, "sample-requests.json") });
  const created = await store.createRequest({
    owner: { type: "member", id: "123-45-67890" },
    projectId: "project-1",
    items: [{ id: "snt-1", name: "Safe tile", quantity: 2 }]
  });

  const updated = await store.updateRequest({
    id: created.id,
    status: "배송중",
    carrier: "CJ",
    trackingNumber: "123456789",
    adminNote: "Dispatched"
  }, "admin@example.com");

  assert.equal(updated.status, "배송중");
  assert.equal(updated.tracking.number, "123456789");
  assert.equal(updated.reviewedBy, "admin@example.com");
  assert.doesNotMatch(JSON.stringify(updated), /supplier|cost|internal_brand/i);
});
