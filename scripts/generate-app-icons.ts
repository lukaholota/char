import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { APP_THEME_COLOR, APP_STARTUP_IMAGES } from "../src/lib/pwa/app-metadata";

const sourcePath = fileURLToPath(new URL("../public/images/logo.png", import.meta.url));
const outputDirectory = fileURLToPath(new URL("../public/icons/", import.meta.url));

async function writeOpaqueIcon(filename: string, size: number, logoRatio: number) {
  const logoSize = Math.floor(size * logoRatio);
  const logo = await sharp(sourcePath).resize(logoSize, logoSize, { fit: "inside" }).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 3, background: APP_THEME_COLOR },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .removeAlpha()
    .png()
    .toFile(`${outputDirectory}/${filename}`);
}

async function buildMonochromeLogo() {
  const logo = await sharp(sourcePath)
    .resize(409, 409, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < logo.data.length; offset += 4) {
    logo.data[offset] = logo.data[offset + 1] = logo.data[offset + 2] = 255;
  }
  return logo;
}

async function writeMonochromeIcon() {
  const size = 512;
  const logo = await buildMonochromeLogo();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#00000000" } })
    .composite([{ input: logo.data, raw: logo.info, gravity: "centre" }])
    .png()
    .toFile(`${outputDirectory}/icon-monochrome-512.png`);
}

async function generateAppIcons() {
  await mkdir(outputDirectory, { recursive: true });
  for (const size of [192, 512]) {
    await writeOpaqueIcon(`icon-${size}.png`, size, 0.8);
    await writeOpaqueIcon(`icon-maskable-${size}.png`, size, 0.6);
  }
  await writeOpaqueIcon("icon-96.png", 96, 0.8);
  await writeOpaqueIcon("apple-touch-icon.png", 180, 0.8);
  await writeMonochromeIcon();
  for (const image of APP_STARTUP_IMAGES) await writeStartupImage(image);
  await copyFile(`${outputDirectory}/apple-touch-icon.png`, `${outputDirectory}/../apple-touch-icon.png`);
}

async function writeStartupImage(image: typeof APP_STARTUP_IMAGES[number]) {
  const logoSize = Math.floor(Math.min(image.width, image.height) * 0.3);
  const logo = await sharp(sourcePath).resize(logoSize, logoSize, { fit: "inside" }).png().toBuffer();
  await sharp({ create: { width: image.width, height: image.height, channels: 3, background: APP_THEME_COLOR } })
    .composite([{ input: logo, gravity: "centre" }])
    .removeAlpha()
    .png()
    .toFile(fileURLToPath(new URL(`../public${image.url}`, import.meta.url)));
}

await generateAppIcons();
