const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_SITE_SETTINGS,
  sanitizeSiteSettings
} = require("../../../src/server/services/site-settings-service");

test("site settings include editable customer pages with disabled overrides by default", () => {
  assert.equal(DEFAULT_SITE_SETTINGS.version, 2);
  assert.ok(Object.keys(DEFAULT_SITE_SETTINGS.pages).length >= 16);
  assert.equal(DEFAULT_SITE_SETTINGS.pages.homePage.contentEnabled, false);
  assert.equal(DEFAULT_SITE_SETTINGS.pages.productsPage.imageEnabled, false);
  assert.equal(DEFAULT_SITE_SETTINGS.pages.loginPage.designEnabled, false);
});

test("page editor settings are sanitized and unknown pages are discarded", () => {
  const settings = sanitizeSiteSettings({
    pages: {
      homePage: {
        label: "변조된 이름",
        eyebrow: "",
        title: "새 메인 제목",
        description: "새 설명",
        heroImage: "javascript:alert(1)",
        backgroundColor: "#ABCDEF",
        surfaceColor: "#123456",
        accentColor: "red",
        headingScale: 999,
        sectionGap: 1,
        contentEnabled: true,
        imageEnabled: true,
        designEnabled: true
      },
      hiddenAdminPage: {
        title: "노출되면 안 됨"
      }
    }
  });

  assert.equal(settings.pages.homePage.label, "메인");
  assert.equal(settings.pages.homePage.eyebrow, "");
  assert.equal(settings.pages.homePage.title, "새 메인 제목");
  assert.equal(settings.pages.homePage.heroImage, DEFAULT_SITE_SETTINGS.pages.homePage.heroImage);
  assert.equal(settings.pages.homePage.backgroundColor, "#abcdef");
  assert.equal(settings.pages.homePage.accentColor, DEFAULT_SITE_SETTINGS.pages.homePage.accentColor);
  assert.equal(settings.pages.homePage.headingScale, 140);
  assert.equal(settings.pages.homePage.sectionGap, 12);
  assert.equal(settings.pages.homePage.contentEnabled, true);
  assert.equal(settings.pages.homePage.imageEnabled, true);
  assert.equal(settings.pages.homePage.designEnabled, true);
  assert.equal(Object.hasOwn(settings.pages, "hiddenAdminPage"), false);
});

test("page images can be cleared or use protected site-studio uploads", () => {
  const cleared = sanitizeSiteSettings({
    pages: {
      homePage: {
        heroImage: "",
        imageEnabled: true
      }
    }
  });
  const uploaded = sanitizeSiteSettings({
    pages: {
      homePage: {
        heroImage: "/uploads/site-studio/home.webp",
        imageEnabled: true
      }
    }
  });

  assert.equal(cleared.pages.homePage.heroImage, "");
  assert.equal(uploaded.pages.homePage.heroImage, "/uploads/site-studio/home.webp");
});
