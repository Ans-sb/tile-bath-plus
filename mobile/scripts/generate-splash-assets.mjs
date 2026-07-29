import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptRoot, "..");
const projectRoot = path.resolve(mobileRoot, "..");
const resourceRoot = path.join(mobileRoot, "android", "app", "src", "main", "res");
const logoPath = path.join(projectRoot, "images", "branding", "app-icon-jajaego-512.png");
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
  const shortestSide = Math.min(width, height);
  const logoSize = Math.max(96, Math.round(shortestSide * 0.42));
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: "contain" })
    .png()
    .toBuffer();
  const top = Math.round((height - logoSize) / 2 - height * 0.025);

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
      left: Math.round((width - logoSize) / 2),
      top
    }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}
