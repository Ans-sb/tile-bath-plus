const assert = require("node:assert/strict");
const test = require("node:test");

const { createApprovalRulesService } = require("../../../src/server/services/approval-rules-service");

function makeService({ configured = true, persistenceEnabled = true, requestSupabase = async () => [] } = {}) {
  return createApprovalRulesService({
    cloneApprovalRules: (rules) => ({
      businessTypes: [...rules.businessTypes],
      businessItems: [...rules.businessItems]
    }),
    defaultApprovalRules: { businessTypes: ["인테리어"], businessItems: ["타일"] },
    hasSupabaseConfig: () => configured,
    isMissingSupabaseTableError: (error, table) => error?.missingTable === table,
    normalizeStringArray: (value) => Array.isArray(value) ? value.map(String) : [],
    persistenceEnabled: () => persistenceEnabled,
    requestSupabase
  });
}

const payload = {
  businessTypes: ["인테리어", "건설"],
  businessItems: ["타일", "욕실"]
};

test("approval rule persistence is disabled until the RLS migration is explicitly enabled", async () => {
  let called = false;
  const service = makeService({
    persistenceEnabled: false,
    requestSupabase: async () => { called = true; return []; }
  });
  const read = await service.readApprovalRules();
  assert.equal(read.source, "disabled");
  await assert.rejects(service.saveApprovalRules(payload), (error) => error.statusCode === 503);
  assert.equal(called, false);
});

test("approval rule writes fail closed without durable storage", async () => {
  await assert.rejects(
    makeService({ configured: false }).saveApprovalRules(payload),
    (error) => error.statusCode === 503
  );
});

test("approval rule writes fail closed when the table is missing", async () => {
  const missing = new Error("approval_settings missing");
  missing.missingTable = "approval_settings";
  await assert.rejects(
    makeService({ requestSupabase: async () => { throw missing; } }).saveApprovalRules(payload),
    (error) => error.statusCode === 503
  );
});

test("approval rule writes require a verified returned row", async () => {
  await assert.rejects(
    makeService({ requestSupabase: async () => [] }).saveApprovalRules(payload),
    (error) => error.statusCode === 503
  );
  await assert.rejects(
    makeService({
      requestSupabase: async () => [{
        id: "default",
        business_types: ["different"],
        business_items: payload.businessItems
      }]
    }).saveApprovalRules(payload),
    (error) => error.statusCode === 503
  );
});

test("approval rule writes return only the verified durable row", async () => {
  const result = await makeService({
    requestSupabase: async () => [{
      id: "default",
      business_types: payload.businessTypes,
      business_items: payload.businessItems,
      updated_at: "2026-08-11T00:00:00.000Z"
    }]
  }).saveApprovalRules(payload);

  assert.deepEqual(result, {
    businessTypes: payload.businessTypes,
    businessItems: payload.businessItems,
    updatedAt: "2026-08-11T00:00:00.000Z",
    source: "supabase"
  });
});
