const assert = require("node:assert/strict");
const test = require("node:test");

const { handleAccountRoutes } = require("../../../src/server/routes/account-routes");
const { handleAdminRoutes } = require("../../../src/server/routes/admin-routes");
const { handleMediaRoutes } = require("../../../src/server/routes/media-routes");

test("public account routes do not accept approval rule mutations", async () => {
  const handled = await handleAccountRoutes({
    method: "POST",
    url: "/api/approval-rules",
    headers: { host: "localhost" }
  }, {}, {
    readRequestBody: async () => { throw new Error("body must not be read"); },
    sendJson: () => { throw new Error("response must not be sent"); },
    saveApprovalRules: async () => { throw new Error("rules must not be saved"); }
  });

  assert.equal(handled, false);
});

test("admin approval rule mutation authenticates before reading the body", async () => {
  const calls = [];
  let sent;
  const handled = await handleAdminRoutes({
    method: "POST",
    url: "/api/admin/approval-rules",
    headers: { host: "localhost" }
  }, {}, {
    readAdminCredentialsFromRequest: () => {
      calls.push("credentials");
      return { adminUsername: "admin", adminToken: "valid" };
    },
    assertAdminCredentials: (username, token) => {
      calls.push("auth");
      assert.equal(username, "admin");
      assert.equal(token, "valid");
    },
    readRequestBody: async () => {
      calls.push("body");
      return JSON.stringify({ businessTypes: ["인테리어"] });
    },
    saveApprovalRules: async (payload, reviewer) => {
      calls.push("save");
      assert.deepEqual(payload.businessTypes, ["인테리어"]);
      assert.equal(reviewer, "admin");
      return { businessTypes: ["인테리어"], businessItems: [] };
    },
    sendJson: (_response, status, body) => {
      calls.push("send");
      sent = { status, body };
    }
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, ["credentials", "auth", "body", "save", "send"]);
  assert.equal(sent.status, 200);
});

test("order routes enforce rate limits before reading request bodies", async () => {
  let sent;
  const handled = await handleAccountRoutes({
    method: "POST",
    url: "/api/orders",
    headers: { host: "localhost" }
  }, {}, {
    allowOrderRequest: () => false,
    readRequestBody: async () => { throw new Error("body must not be read"); },
    createOrderFromCart: async () => { throw new Error("order must not be created"); },
    sendJson: (_response, status, body) => { sent = { status, body }; }
  });

  assert.equal(handled, true);
  assert.equal(sent.status, 429);
  assert.match(sent.body.error, /주문 요청이 너무 많습니다/);
});

test("media routes do not expose process control", async () => {
  const handled = await handleMediaRoutes({
    method: "POST",
    url: "/api/server-control",
    headers: { host: "localhost" }
  }, {}, {
    readRequestBody: async () => { throw new Error("body must not be read"); },
    handleServerControl: async () => { throw new Error("process control must not run"); },
    sendJson: () => { throw new Error("response must not be sent"); }
  });

  assert.equal(handled, false);
});

test("high-cost media routes enforce rate limits before reading request bodies", async () => {
  let sent;
  const handled = await handleMediaRoutes({
    method: "POST",
    url: "/api/render",
    headers: { host: "localhost" }
  }, {}, {
    allowMediaRequest: () => false,
    readRequestBody: async () => { throw new Error("body must not be read"); },
    generateRenderPreview: async () => { throw new Error("render must not run"); },
    sendJson: (_response, status, body) => { sent = { status, body }; }
  });

  assert.equal(handled, true);
  assert.equal(sent.status, 429);
  assert.match(sent.body.error, /요청이 너무 많습니다/);
});
