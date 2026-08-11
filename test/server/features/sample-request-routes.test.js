const test = require("node:test");
const assert = require("node:assert/strict");

const { handleSampleRequestRoutes } = require("../../../src/server/features/sample-requests/sample-request-routes");

function request(overrides = {}) {
  return {
    method: "GET",
    url: "/api/sample-requests",
    headers: { host: "localhost:4173", "content-type": "application/json" },
    ...overrides
  };
}

test("sample request member routes resolve the signed-in owner", async () => {
  let sent;
  let actorUsed;
  const context = {
    resolveSampleRequestActor: async () => ({ type: "member", id: "123-45-67890" }),
    listSampleRequests: async (actor) => {
      actorUsed = actor;
      return [{ id: "request-1", status: "접수" }];
    },
    sendJson: (_response, status, body) => { sent = { status, body }; }
  };

  assert.equal(await handleSampleRequestRoutes(request(), {}, context), true);
  assert.deepEqual(actorUsed, { type: "member", id: "123-45-67890" });
  assert.equal(sent.status, 200);
  assert.equal(sent.body.requests[0].status, "접수");
});

test("sample request POST accepts JSON and delegates validated project creation", async () => {
  let sent;
  let created;
  const context = {
    readRequestBody: async (_request, options) => {
      assert.equal(options.bodyLimit, 48 * 1024);
      return JSON.stringify({ projectId: "project-1", items: [{ id: "snt-1", quantity: 2 }] });
    },
    resolveSampleRequestActor: async () => ({ type: "member", id: "123-45-67890" }),
    createSampleRequest: async (actor, payload) => {
      created = { actor, payload };
      return { id: "request-1", requestNumber: "S20260811-0001" };
    },
    sendJson: (_response, status, body) => { sent = { status, body }; }
  };

  await handleSampleRequestRoutes(request({ method: "POST" }), {}, context);
  assert.equal(created.payload.projectId, "project-1");
  assert.equal(created.actor.id, "123-45-67890");
  assert.equal(sent.status, 201);
});

test("sample request admin routes require admin context and update fulfillment", async () => {
  let sent;
  let updateArgs;
  const context = {
    assertSampleRequestAdmin: () => ({ adminUsername: "admin@example.com" }),
    readRequestBody: async () => JSON.stringify({ id: "request-1", status: "발송준비" }),
    updateAdminSampleRequest: async (payload, admin) => {
      updateArgs = { payload, admin };
      return { id: payload.id, status: payload.status };
    },
    sendJson: (_response, status, body) => { sent = { status, body }; }
  };

  await handleSampleRequestRoutes(request({ method: "PATCH", url: "/api/admin/sample-request" }), {}, context);
  assert.equal(updateArgs.admin.adminUsername, "admin@example.com");
  assert.equal(sent.status, 200);
  assert.equal(sent.body.request.status, "발송준비");
});

test("sample request writes reject non-JSON bodies", async () => {
  let sent;
  await handleSampleRequestRoutes(request({ method: "POST", headers: { host: "localhost:4173", "content-type": "text/plain" } }), {}, {
    sendJson: (_response, status, body) => { sent = { status, body }; }
  });
  assert.equal(sent.status, 415);
});
