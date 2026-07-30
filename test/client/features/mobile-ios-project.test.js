const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const workspaceRoot = path.resolve(__dirname, "../../..");
const iosRoot = path.join(workspaceRoot, "mobile", "ios", "App");

test("iOS project uses the production bundle ID and automatic signing", () => {
  const project = fs.readFileSync(
    path.join(iosRoot, "App.xcodeproj", "project.pbxproj"),
    "utf8"
  );

  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = com\.jajaego\.app;/);
  assert.match(project, /CODE_SIGN_STYLE = Automatic;/);
  assert.match(project, /CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/);
});

test("iOS app declares image permissions and the native auth URL scheme", () => {
  const info = fs.readFileSync(path.join(iosRoot, "App", "Info.plist"), "utf8");

  assert.match(info, /NSCameraUsageDescription/);
  assert.match(info, /NSPhotoLibraryUsageDescription/);
  assert.match(info, /NSPhotoLibraryAddUsageDescription/);
  assert.match(info, /CFBundleURLSchemes/);
  assert.match(info, /<string>jajaego<\/string>/);
});

test("iOS associated domains cover the production domain", () => {
  const entitlements = fs.readFileSync(
    path.join(iosRoot, "App", "App.entitlements"),
    "utf8"
  );

  assert.match(entitlements, /applinks:jajaego\.com/);
  assert.match(entitlements, /webcredentials:jajaego\.com/);
});

test("iOS App Store icon is a 1024px PNG asset", () => {
  const contents = JSON.parse(fs.readFileSync(
    path.join(iosRoot, "App", "Assets.xcassets", "AppIcon.appiconset", "Contents.json"),
    "utf8"
  ));

  assert.equal(contents.images[0].filename, "AppIcon-512@2x.png");
  assert.equal(contents.images[0].size, "1024x1024");
});
