const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_SITE_SETTINGS,
  sanitizeSiteSettings
} = require("../../../src/server/services/site-settings-service");

test("site settings include editable customer pages with disabled overrides by default", () => {
  assert.equal(DEFAULT_SITE_SETTINGS.version, 3);
  assert.ok(Object.keys(DEFAULT_SITE_SETTINGS.pages).length >= 16);
  assert.equal(DEFAULT_SITE_SETTINGS.pages.homePage.contentEnabled, false);
  assert.equal(DEFAULT_SITE_SETTINGS.pages.productsPage.imageEnabled, false);
  assert.equal(DEFAULT_SITE_SETTINGS.pages.loginPage.designEnabled, false);
  assert.equal(DEFAULT_SITE_SETTINGS.pages.homePage.fontFamily, "inherit");
  assert.equal(DEFAULT_SITE_SETTINGS.pages.homePage.imageRatio, "auto");
  assert.equal(DEFAULT_SITE_SETTINGS.pages.homePage.buttonStyle, "solid");
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
        textColor: "#010203",
        mutedTextColor: "invalid",
        borderColor: "#FEDCBA",
        buttonColor: "#102030",
        buttonTextColor: "#FFFFFF",
        fontFamily: "comic-sans",
        headingWeight: 9999,
        textAlign: "justify",
        headingScale: 999,
        bodyScale: 5,
        sectionGap: 1,
        contentPadding: 999,
        contentWidth: 1,
        borderWidth: 20,
        cornerRadius: 99,
        shadowStrength: -10,
        imageRatio: "cinema",
        imageFit: "stretch",
        imagePosition: "middle",
        buttonStyle: "pill",
        cardStyle: "glass",
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
  assert.equal(settings.pages.homePage.textColor, "#010203");
  assert.equal(settings.pages.homePage.mutedTextColor, DEFAULT_SITE_SETTINGS.pages.homePage.mutedTextColor);
  assert.equal(settings.pages.homePage.borderColor, "#fedcba");
  assert.equal(settings.pages.homePage.buttonTextColor, "#ffffff");
  assert.equal(settings.pages.homePage.fontFamily, "inherit");
  assert.equal(settings.pages.homePage.headingWeight, 900);
  assert.equal(settings.pages.homePage.textAlign, "left");
  assert.equal(settings.pages.homePage.headingScale, 180);
  assert.equal(settings.pages.homePage.bodyScale, 80);
  assert.equal(settings.pages.homePage.sectionGap, 8);
  assert.equal(settings.pages.homePage.contentPadding, 64);
  assert.equal(settings.pages.homePage.contentWidth, 720);
  assert.equal(settings.pages.homePage.borderWidth, 4);
  assert.equal(settings.pages.homePage.cornerRadius, 32);
  assert.equal(settings.pages.homePage.shadowStrength, 0);
  assert.equal(settings.pages.homePage.imageRatio, "auto");
  assert.equal(settings.pages.homePage.imageFit, "cover");
  assert.equal(settings.pages.homePage.imagePosition, "center");
  assert.equal(settings.pages.homePage.buttonStyle, "solid");
  assert.equal(settings.pages.homePage.cardStyle, "bordered");
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

test("valid advanced page design choices are preserved", () => {
  const settings = sanitizeSiteSettings({
    pages: {
      productsPage: {
        fontFamily: "serif",
        headingWeight: 600,
        textAlign: "center",
        bodyScale: 115,
        contentWidth: 1320,
        imageRatio: "wide",
        imageFit: "contain",
        imagePosition: "top",
        buttonStyle: "outline",
        cardStyle: "elevated",
        designEnabled: true
      }
    }
  });

  assert.deepEqual(
    {
      fontFamily: settings.pages.productsPage.fontFamily,
      headingWeight: settings.pages.productsPage.headingWeight,
      textAlign: settings.pages.productsPage.textAlign,
      bodyScale: settings.pages.productsPage.bodyScale,
      contentWidth: settings.pages.productsPage.contentWidth,
      imageRatio: settings.pages.productsPage.imageRatio,
      imageFit: settings.pages.productsPage.imageFit,
      imagePosition: settings.pages.productsPage.imagePosition,
      buttonStyle: settings.pages.productsPage.buttonStyle,
      cardStyle: settings.pages.productsPage.cardStyle,
      designEnabled: settings.pages.productsPage.designEnabled
    },
    {
      fontFamily: "serif",
      headingWeight: 600,
      textAlign: "center",
      bodyScale: 115,
      contentWidth: 1320,
      imageRatio: "wide",
      imageFit: "contain",
      imagePosition: "top",
      buttonStyle: "outline",
      cardStyle: "elevated",
      designEnabled: true
    }
  );
});
