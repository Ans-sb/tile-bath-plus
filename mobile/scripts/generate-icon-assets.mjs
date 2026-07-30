import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptRoot, "..");
const projectRoot = path.resolve(mobileRoot, "..");
const resourceRoot = path.join(mobileRoot, "android", "app", "src", "main", "res");
const iosAppIconPath = path.join(
  mobileRoot,
  "ios",
  "App",
  "App",
  "Assets.xcassets",
  "AppIcon.appiconset",
  "AppIcon-512@2x.png"
);
const sourceLogoPath = path.join(projectRoot, "images", "branding", "btn-material-go.png");
const brandBlue = { r: 20, g: 100, b: 244, alpha: 1 };

const wordmark = await createWhiteWordmark();

await createRoundedIcon(path.join(mobileRoot, "assets", "icon-only.png"), 1024, 0.18, 0.78);
await createRoundedIcon(path.join(mobileRoot, "www", "app-icon.png"), 512, 0.18, 0.78);
await createRoundedIcon(
  path.join(projectRoot, "images", "branding", "app-icon-jajaego-512.png"),
  512,
  0.18,
  0.78
);
await createRoundedIcon(
  path.join(projectRoot, "images", "branding", "app-icon-jajaego-192.png"),
  192,
  0.18,
  0.78
);
if (await pathExists(path.dirname(iosAppIconPath))) {
  await createSquareIcon(iosAppIconPath, 1024, 0.78);
}

const densities = [
  ["ldpi", 36, 81],
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432]
];

for (const [density, launcherSize, foregroundSize] of densities) {
  const outputDirectory = path.join(resourceRoot, `mipmap-${density}`);
  await fs.mkdir(outputDirectory, { recursive: true });
  await createRoundedIcon(
    path.join(outputDirectory, "ic_launcher.png"),
    launcherSize,
    0.2,
    0.78
  );
  await createRoundIcon(
    path.join(outputDirectory, "ic_launcher_round.png"),
    launcherSize,
    0.7
  );
  await createAdaptiveForeground(
    path.join(outputDirectory, "ic_launcher_foreground.png"),
    foregroundSize
  );
}

const previewDirectory = path.join(projectRoot, "outputs", "mobile");
await fs.mkdir(previewDirectory, { recursive: true });
await createRoundedIcon(
  path.join(previewDirectory, "jajaego-app-icon-preview.png"),
  1024,
  0.18,
  0.78
);

console.log("ICON_ASSETS_OK");

async function createWhiteWordmark() {
  const crop = { left: 478, top: 45, width: 494, height: 123 };
  const { data, info } = await sharp(sourceLogoPath)
    .extract(crop)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(info.width * info.height * 4);

  for (let sourceOffset = 0, outputOffset = 0; sourceOffset < data.length; sourceOffset += 3, outputOffset += 4) {
    const difference = Math.max(
      255 - data[sourceOffset],
      255 - data[sourceOffset + 1],
      255 - data[sourceOffset + 2]
    );
    const alpha = Math.max(0, Math.min(255, Math.round((difference - 3) * 1.18)));
    output[outputOffset] = 255;
    output[outputOffset + 1] = 255;
    output[outputOffset + 2] = 255;
    output[outputOffset + 3] = alpha;
  }

  return sharp(output, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function createRoundedIcon(outputPath, size, radiusRatio, wordmarkWidthRatio) {
  await createMaskedIcon(
    outputPath,
    size,
    wordmarkWidthRatio,
    `<rect width="${size}" height="${size}" rx="${Math.round(size * radiusRatio)}" fill="#fff"/>`
  );
}

async function createRoundIcon(outputPath, size, wordmarkWidthRatio) {
  await createMaskedIcon(
    outputPath,
    size,
    wordmarkWidthRatio,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>`
  );
}

async function createSquareIcon(outputPath, size, wordmarkWidthRatio) {
  const resizedWordmark = await sharp(wordmark)
    .resize({ width: Math.round(size * wordmarkWidthRatio), fit: "inside" })
    .png()
    .toBuffer();
  const wordmarkMetadata = await sharp(resizedWordmark).metadata();
  const renderedWidth = wordmarkMetadata.width ?? Math.round(size * wordmarkWidthRatio);
  const renderedHeight = wordmarkMetadata.height ?? Math.round(size * 0.2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: brandBlue
    }
  })
    .composite([{
      input: resizedWordmark,
      left: Math.round((size - renderedWidth) / 2),
      top: Math.round((size - renderedHeight) / 2)
    }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function createMaskedIcon(outputPath, size, wordmarkWidthRatio, maskShape) {
  const resizedWordmark = await sharp(wordmark)
    .resize({ width: Math.round(size * wordmarkWidthRatio), fit: "inside" })
    .png()
    .toBuffer();
  const wordmarkMetadata = await sharp(resizedWordmark).metadata();
  const renderedWidth = wordmarkMetadata.width ?? Math.round(size * wordmarkWidthRatio);
  const renderedHeight = wordmarkMetadata.height ?? Math.round(size * 0.2);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${maskShape}</svg>`
  );

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: brandBlue
    }
  })
    .composite([
      {
        input: resizedWordmark,
        left: Math.round((size - renderedWidth) / 2),
        top: Math.round((size - renderedHeight) / 2)
      },
      { input: mask, blend: "dest-in" }
    ])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function createAdaptiveForeground(outputPath, size) {
  const resizedWordmark = await sharp(wordmark)
    .resize({ width: Math.round(size * 0.62), fit: "inside" })
    .png()
    .toBuffer();
  const wordmarkMetadata = await sharp(resizedWordmark).metadata();
  const renderedWidth = wordmarkMetadata.width ?? Math.round(size * 0.62);
  const renderedHeight = wordmarkMetadata.height ?? Math.round(size * 0.16);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .composite([{
      input: resizedWordmark,
      left: Math.round((size - renderedWidth) / 2),
      top: Math.round((size - renderedHeight) / 2)
    }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function pathExists(value) {
  try {
    await fs.access(value);
    return true;
  } catch {
    return false;
  }
}
