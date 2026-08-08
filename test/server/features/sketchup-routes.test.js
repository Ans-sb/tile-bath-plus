const test = require("node:test");
const assert = require("node:assert/strict");

const { handleSketchupRoutes } = require("../../../src/server/features/sketchup/sketchup-routes");

test("SketchUp package API rejects non-local requests", async () => {
  let sent;
  const handled = await handleSketchupRoutes(
    { method: "GET", url: "/api/local/sketchup/packages", headers: { host: "jajaego.com" } },
    {},
    {
      isLocalRequest: () => false,
      sendJson: (_response, status, body) => { sent = { status, body }; }
    }
  );

  assert.equal(handled, true);
  assert.equal(sent.status, 403);
  assert.match(sent.body.error, /로컬/);
});

test("SketchUp package API ignores unrelated routes", async () => {
  const handled = await handleSketchupRoutes(
    { method: "GET", url: "/api/products", headers: {} },
    {},
    {}
  );
  assert.equal(handled, false);
});
