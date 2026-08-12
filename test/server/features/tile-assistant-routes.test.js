const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createTileAssistantRateLimiter,
  handleTileAssistantRoutes
} = require("../../../src/server/features/tile-assistant/tile-assistant-routes");
const { resolveClientAddress } = require("../../../src/server/security/client-address-policy");

function jsonRequest(overrides = {}) {
  return {
    method: "POST",
    url: "/api/tile-assistant/chat",
    headers: { "content-type": "application/json" },
    socket: { remoteAddress: "127.0.0.1" },
    ...overrides
  };
}

test("tile assistant route answers a public chat request", async () => {
  let sent;
  const handled = await handleTileAssistantRoutes(jsonRequest(), {}, {
    readRequestBody: async (_request, options) => {
      assert.equal(options.bodyLimit, 32 * 1024);
      return JSON.stringify({ message: "포세린 타일이 뭔가요?", history: [] });
    },
    sendJson: (_response, status, body) => { sent = { status, body }; },
    answerTileQuestion: async (payload) => ({ ok: true, message: payload.message, source: "ai" })
  });
  assert.equal(handled, true);
  assert.equal(sent.status, 200);
  assert.equal(sent.body.message, "포세린 타일이 뭔가요?");
});

test("tile assistant route rejects requests over the public rate limit", async () => {
  let sent;
  await handleTileAssistantRoutes(jsonRequest(), {}, {
    allowTileAssistantRequest: () => false,
    readRequestBody: async () => { throw new Error("body must not be read"); },
    sendJson: (_response, status, body) => { sent = { status, body }; }
  });
  assert.equal(sent.status, 429);
  assert.match(sent.body.error, /잠시 후/);
});

test("tile assistant rate limiter allows a bounded number of requests per client", () => {
  let now = 1000;
  const allow = createTileAssistantRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
  const request = jsonRequest();
  assert.equal(allow(request), true);
  assert.equal(allow(request), true);
  assert.equal(allow(request), false);
  now = 2001;
  assert.equal(allow(request), true);
});

test("rate limiter ignores spoofed forwarded addresses unless proxy trust is explicit", () => {
  const allow = createTileAssistantRateLimiter({ limit: 1 });
  const base = { socket: { remoteAddress: "203.0.113.5" } };
  assert.equal(allow({ ...base, headers: { "x-forwarded-for": "1.1.1.1" } }), true);
  assert.equal(allow({ ...base, headers: { "x-forwarded-for": "2.2.2.2" } }), false);
});

test("trusted proxy rate limiting cannot be bypassed with spoofed leading addresses", () => {
  const allow = createTileAssistantRateLimiter({ limit: 1, trustProxy: true });
  const base = { socket: { remoteAddress: "10.0.0.5" } };
  assert.equal(allow({ ...base, headers: { "x-forwarded-for": "1.1.1.1, 203.0.113.10" } }), true);
  assert.equal(allow({ ...base, headers: { "x-forwarded-for": "2.2.2.2, 203.0.113.10" } }), false);
});

test("proxy-aware rate limiting keeps unrelated users in separate buckets", () => {
  const allow = createTileAssistantRateLimiter({
    limit: 5,
    resolveAddress: (request) => resolveClientAddress(request, { trustProxy: true })
  });
  const base = { socket: { remoteAddress: "10.0.0.5" } };

  for (let index = 1; index <= 6; index += 1) {
    assert.equal(allow({
      ...base,
      headers: { "x-forwarded-for": `203.0.113.${index}` }
    }), true);
  }

  const attacker = {
    ...base,
    headers: { "x-forwarded-for": "1.1.1.1, 203.0.113.99" }
  };
  for (let index = 0; index < 5; index += 1) assert.equal(allow(attacker), true);
  assert.equal(allow(attacker), false);
  assert.equal(allow({
    ...base,
    headers: { "x-forwarded-for": "2.2.2.2, 203.0.113.100" }
  }), true);
});

test("rate limiter rejects new identities when its bounded store is full", () => {
  const allow = createTileAssistantRateLimiter({ limit: 1, maxClients: 2 });
  assert.equal(allow({ headers: {}, socket: { remoteAddress: "a" } }), true);
  assert.equal(allow({ headers: {}, socket: { remoteAddress: "b" } }), true);
  assert.equal(allow({ headers: {}, socket: { remoteAddress: "c" } }), false);
});

test("tile assistant route requires JSON requests", async () => {
  let sent;
  await handleTileAssistantRoutes(jsonRequest({ headers: { "content-type": "text/plain" } }), {}, {
    sendJson: (_response, status, body) => { sent = { status, body }; }
  });
  assert.equal(sent.status, 415);
});

test("tile assistant route restores an owned field project", async () => {
  let sent;
  let readArgs;
  const handled = await handleTileAssistantRoutes({
    method: "GET",
    url: "/api/tile-assistant/project?projectId=project-1&clientKey=browser-1",
    headers: { host: "localhost:4173" },
    socket: { remoteAddress: "127.0.0.1" }
  }, {}, {
    resolveTileAssistantActor: async (_request, payload) => ({ type: "guest", id: payload.clientKey }),
    readTileAssistantProject: async (projectId, actor) => {
      readArgs = { projectId, actor };
      return { id: projectId, stage: "상품추천" };
    },
    sendJson: (_response, status, body) => { sent = { status, body }; }
  });

  assert.equal(handled, true);
  assert.deepEqual(readArgs, { projectId: "project-1", actor: { type: "guest", id: "browser-1" } });
  assert.equal(sent.status, 200);
  assert.equal(sent.body.project.stage, "상품추천");
});

test("tile assistant route lists projects for the resolved owner", async () => {
  let sent;
  let listedActor;
  const handled = await handleTileAssistantRoutes({
    method: "GET",
    url: "/api/tile-assistant/projects?clientKey=browser-1",
    headers: { host: "localhost:4173" },
    socket: { remoteAddress: "127.0.0.1" }
  }, {}, {
    resolveTileAssistantActor: async (_request, payload) => ({ type: "guest", id: payload.clientKey }),
    listTileAssistantProjects: async (actor) => {
      listedActor = actor;
      return [{ id: "project-1", title: "성수동 카페" }];
    },
    sendJson: (_response, status, body) => { sent = { status, body }; }
  });

  assert.equal(handled, true);
  assert.deepEqual(listedActor, { type: "guest", id: "browser-1" });
  assert.equal(sent.status, 200);
  assert.equal(sent.body.projects[0].title, "성수동 카페");
});

test("tile assistant route creates a site project and stores a selected product", async () => {
  const writes = [];
  let requestBody = { clientKey: "browser-1", site: { siteName: "성수동 카페" } };
  const context = {
    allowTileAssistantRequest: () => true,
    readRequestBody: async () => JSON.stringify(requestBody),
    resolveTileAssistantActor: async (_request, payload) => ({ type: "guest", id: payload.clientKey }),
    createTileAssistantProject: async (actor, site) => {
      writes.push({ type: "create", actor, site });
      return { id: "project-1", title: site.siteName };
    },
    setTileAssistantSelectedProduct: async (projectId, actor, product, selected) => {
      writes.push({ type: "product", projectId, actor, product, selected });
      return { id: projectId, selectedProducts: [product] };
    },
    sendJson: (_response, status, body) => { context.sent = { status, body }; }
  };

  await handleTileAssistantRoutes(jsonRequest({ url: "/api/tile-assistant/projects" }), {}, context);
  assert.equal(context.sent.status, 201);
  assert.equal(writes[0].site.siteName, "성수동 카페");

  requestBody = { clientKey: "browser-1", projectId: "project-1", product: { id: "tile-1" }, selected: true };
  await handleTileAssistantRoutes(jsonRequest({ url: "/api/tile-assistant/project/products" }), {}, context);
  assert.equal(context.sent.status, 200);
  assert.equal(writes[1].product.id, "tile-1");
  assert.equal(writes[1].selected, true);
});
