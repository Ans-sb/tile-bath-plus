const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const workspaceRoot = path.resolve(__dirname, "../../..");

test("Native social auth opens the system browser with the detected mobile platform", () => {
  const source = fs.readFileSync(
    path.join(workspaceRoot, "src/client/mobile/native-bridge.js"),
    "utf8"
  );

  assert.match(source, /getPlatform/);
  assert.match(source, /searchParams\.set\("client", nativePlatform\)/);
  assert.match(source, /\["android", "ios"\]/);
  assert.match(source, /browserPlugin\.open/);
  assert.match(source, /appUrlOpen/);
  assert.match(source, /getLaunchUrl/);
  assert.match(source, /browserPlugin\?\.close/);
});

test("Web OAuth callback bridges Android and iOS results back into the installed app", () => {
  const source = fs.readFileSync(
    path.join(workspaceRoot, "src/client/mobile/auth-bridge.js"),
    "utf8"
  );

  assert.match(source, /mobileClient/);
  assert.match(source, /\["android", "ios"\]/);
  assert.match(source, /jajaego:\/\/app\//);
  assert.match(source, /access_token=/);
});
