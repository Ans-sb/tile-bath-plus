import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptRoot, "..");
const projectRoot = path.resolve(mobileRoot, "..");
const resourceRoot = path.join(mobileRoot, "android", "app", "src", "main", "res");
const logoPath = path.join(projectRoot, "images", "branding", "btn-material-go.png");
const background = { r: 255, g: 255, b: 255, alpha: 1 };

const targets = [
  ["drawable", 320, 480],
  ["drawable-port-ldpi", 320, 480],
  ["drawable-port-mdpi", 480, 720],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
  ["drawable-land-ldpi", 480, 320],
  ["drawable-land-mdpi", 720, 480],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280]
];

await createSplash(path.join(mobileRoot, "assets", "splash.png"), 2732, 2732);
await createSystemSplashLogo(path.join(resourceRoot, "drawable", "splash_logo.png"));
await fs.copyFile(logoPath, path.join(resourceRoot, "drawable", "splash_wordmark.png"));

for (const [directory, width, height] of targets) {
  const outputDirectory = path.join(resourceRoot, directory);
  await fs.mkdir(outputDirectory, { recursive: true });
  await createSplash(path.join(outputDirectory, "splash.png"), width, height);
}

const previewDirectory = path.join(projectRoot, "outputs", "mobile");
await fs.mkdir(previewDirectory, { recursive: true });
await createSplash(path.join(previewDirectory, "jajaego-splash-preview.png"), 1080, 1920);

console.log("SPLASH_ASSETS_OK");

async function createSplash(outputPath, width, height) {
  const isPortrait = height >= width;
  const logoWidth = Math.max(180, Math.round(width * (isPortrait ? 0.68 : 0.5)));
  const logoHeightLimit = Math.max(72, Math.round(height * 0.18));
  const logo = await sharp(logoPath)
    .resize({
      width: logoWidth,
      height: logoHeightLimit,
      fit: "inside",
      withoutEnlargement: false
    })
    .png()
    .toBuffer();
  const logoMetadata = await sharp(logo).metadata();
  const renderedWidth = logoMetadata.width ?? logoWidth;
  const renderedHeight = logoMetadata.height ?? logoHeightLimit;
  const top = Math.round((height - renderedHeight) / 2);

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background
    }
  })
    .composite([{
      input: logo,
      left: Math.round((width - renderedWidth) / 2),
      top
    }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function createSystemSplashLogo(outputPath) {
  const canvasSize = 960;
  const logoWidth = 800;
  const logo = await sharp(logoPath)
    .resize({ width: logoWidth, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const logoMetadata = await sharp(logo).metadata();
  const renderedWidth = logoMetadata.width ?? logoWidth;
  const renderedHeight = logoMetadata.height ?? 168;

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .composite([{
      input: logo,
      left: Math.round((canvasSize - renderedWidth) / 2),
      top: Math.round((canvasSize - renderedHeight) / 2)
    }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}
