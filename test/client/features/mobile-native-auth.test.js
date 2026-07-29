const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const workspaceRoot = path.resolve(__dirname, "../../..");

test("Native social auth opens the system browser and supports cold-start callbacks", () => {
  const source = fs.readFileSync(
    path.join(workspaceRoot, "src/client/mobile/native-bridge.js"),
    "utf8"
  );

  assert.match(source, /searchParams\.set\("client", "android"\)/);
  assert.match(source, /browserPlugin\.open/);
  assert.match(source, /appUrlOpen/);
  assert.match(source, /getLaunchUrl/);
  assert.match(source, /browserPlugin\?\.close/);
});

test("Web OAuth callback bridges Android results back into the installed app", () => {
  const source = fs.readFileSync(
    path.join(workspaceRoot, "src/client/mobile/auth-bridge.js"),
    "utf8"
  );

  assert.match(source, /mobileClient/);
  assert.match(source, /jajaego:\/\/app\//);
  assert.match(source, /access_token=/);
});
