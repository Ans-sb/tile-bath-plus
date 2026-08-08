const assert = require("node:assert/strict");
const test = require("node:test");

const { handleMediaRoutes } = require("../../../src/server/routes/media-routes");

test("proposal generation authenticates before reading and building the deck", async () => {
  const calls = [];
  let sent;
  const request = {
    method: "POST",
    url: "/api/proposal-ppt",
    headers: { host: "localhost", "content-type": "application/json" }
  };
  const actor = { actorType: "member", actorId: "123", memberAccess: { priceTier: "wholesale" } };
  const handled = await handleMediaRoutes(request, {}, {
    authorizeProposalRequest: async () => {
      calls.push("auth");
      return actor;
    },
    readRequestBody: async (_request, options) => {
      calls.push("body");
      assert.equal(options.bodyLimit, 16 * 1024 * 1024);
      return JSON.stringify({ cart: [{ id: "tile-1", qty: 1 }] });
    },
    buildProfessionalProposalDeck: async (payload, receivedActor) => {
      calls.push("build");
      assert.equal(payload.cart[0].id, "tile-1");
      assert.equal(receivedActor, actor);
      return { ok: true, downloadUrl: "/api/proposal-download?token=test" };
    },
    sendJson: (_response, status, body) => { sent = { status, body }; }
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, ["auth", "body", "build"]);
  assert.equal(sent.status, 200);
  assert.equal("outputPath" in sent.body, false);
});

test("proposal download route resolves an opaque token", async () => {
  let receivedToken = "";
  const handled = await handleMediaRoutes({
    method: "GET",
    url: "/api/proposal-download?token=opaque-token",
    headers: { host: "localhost" }
  }, {}, {
    sendProposalDownload: async (_response, token) => { receivedToken = token; }
  });
  assert.equal(handled, true);
  assert.equal(receivedToken, "opaque-token");
});
