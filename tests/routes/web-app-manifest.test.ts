import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { APP_THEME_COLOR, APPLE_WEB_APP, APPLE_WEB_APP_TAGS, APP_STARTUP_IMAGES } from "@/lib/pwa/app-metadata";
import { buildStaticAssetHeaders } from "@/lib/assets/cache-policy";

type ManifestImage = { src: string; sizes: string; type: string; purpose?: string };
type Manifest = {
  id: string;
  start_url: string;
  scope: string;
  background_color: string;
  theme_color: string;
  icons: ManifestImage[];
  screenshots: (ManifestImage & { form_factor: string; label: string })[];
  shortcuts: { name: string; url: string; icons: ManifestImage[] }[];
};

const publicDirectory = resolve(process.env.PWA_TEST_PUBLIC_DIR ?? "public");
const manifest: Manifest = JSON.parse(readFileSync(resolve(publicDirectory, "manifest.json"), "utf8"));
const origin = "https://char.holota.family";

function resolveAssetPath(src: string) {
  const url = new URL(src, origin);
  expect(url.origin).toBe(origin);
  return resolve(publicDirectory, `.${url.pathname}`);
}

describe("web app manifest", () => {
  it("enables iOS standalone with matching portrait startup images", async () => {
    expect(APPLE_WEB_APP.capable).toBe(true);
    expect(APPLE_WEB_APP_TAGS["apple-mobile-web-app-capable"]).toBe("yes");
    expect(APPLE_WEB_APP.statusBarStyle).toBe("black-translucent");
    expect(APP_STARTUP_IMAGES.length).toBeGreaterThan(0);
    for (const image of APP_STARTUP_IMAGES) {
      const width = Number(image.media.match(/device-width: (\d+)px/)?.[1]);
      const height = Number(image.media.match(/device-height: (\d+)px/)?.[1]);
      const ratio = Number(image.media.match(/device-pixel-ratio: (\d+)/)?.[1]);
      const metadata = await sharp(resolveAssetPath(image.url)).metadata();
      expect([metadata.width, metadata.height]).toEqual([width * ratio, height * ratio]);
      expect([image.width, image.height]).toEqual([metadata.width, metadata.height]);
      expect(metadata.hasAlpha).toBe(false);
      expect(image.media).toContain("orientation: portrait");
      expect(APPLE_WEB_APP.startupImage).toContainEqual({ url: image.url, media: image.media });
    }
  });

  it("preserves app identity, launch scope and theme", () => {
    expect(manifest.id).toBe("/char/home");
    expect(manifest.theme_color).toBe(APP_THEME_COLOR);
    expect(manifest.background_color).toBe(APP_THEME_COLOR);
    const scope = new URL(manifest.scope, origin);
    for (const path of [manifest.start_url, ...manifest.shortcuts.map((shortcut) => shortcut.url)]) {
      const url = new URL(path, origin);
      expect(url.origin).toBe(scope.origin);
      expect(url.pathname.startsWith(scope.pathname)).toBe(true);
    }
  });

  it.each(["any", "maskable"])("provides real 192 and 512 pixel %s icons", (purpose) => {
    for (const size of [192, 512]) {
      expect(manifest.icons.some((icon) => icon.purpose === purpose && icon.sizes === `${size}x${size}`)).toBe(true);
    }
  });

  it("provides a monochrome icon and four shortcuts", () => {
    expect(manifest.icons.some((icon) => icon.purpose === "monochrome" && icon.sizes === "512x512")).toBe(true);
    expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual([
      "/char/home", "/spells", "/bestiary", "/char/create",
    ]);
  });

  it("matches every declared image to an existing PNG with its actual size", async () => {
    const images = [
      ...manifest.icons,
      ...manifest.screenshots,
      ...manifest.shortcuts.flatMap((shortcut) => shortcut.icons),
    ];
    for (const image of images) {
      const metadata = await sharp(resolveAssetPath(image.src)).metadata();
      expect(`${metadata.width}x${metadata.height}`, image.src).toBe(image.sizes);
      expect(metadata.format, image.src).toBe("png");
      expect(image.type).toBe("image/png");
    }
  });

  it("provides a labelled install gallery for phones and larger screens", () => {
    const narrow = manifest.screenshots.filter((screenshot) => screenshot.form_factor === "narrow");
    const wide = manifest.screenshots.filter((screenshot) => screenshot.form_factor === "wide");
    expect(narrow).toHaveLength(4);
    expect(wide).toHaveLength(1);
    for (const screenshot of narrow) expect(screenshot.sizes).toBe("1080x2400");
    for (const screenshot of manifest.screenshots) expect(screenshot.label.trim().length).toBeGreaterThan(0);
  });

  it("provides identical opaque 180 pixel Apple icons at both addresses", async () => {
    const rootIcon = readFileSync(resolve(publicDirectory, "apple-touch-icon.png"));
    expect(rootIcon.equals(readFileSync(resolve(publicDirectory, "icons/apple-touch-icon.png")))).toBe(true);
    const metadata = await sharp(rootIcon).metadata();
    expect([metadata.width, metadata.height]).toEqual([180, 180]);
    expect(metadata.hasAlpha).toBe(false);
  });

  it("keeps maskable artwork inside the safe circle on an opaque background", async () => {
    for (const icon of manifest.icons.filter((icon) => icon.purpose === "maskable")) {
      const image = sharp(resolveAssetPath(icon.src));
      expect((await image.metadata()).hasAlpha).toBe(false);
      const { data: pixels, info } = await image.raw().toBuffer({ resolveWithObject: true });
      let artworkPixels = 0;
      let outsidePixels = 0;
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const offset = (y * info.width + x) * info.channels;
          const isBackground = pixels[offset] === 2 && pixels[offset + 1] === 6 && pixels[offset + 2] === 23;
          if (isBackground) continue;
          artworkPixels++;
          if (Math.hypot(x + 0.5 - info.width / 2, y + 0.5 - info.height / 2) > info.width * 0.4) outsidePixels++;
        }
      }
      expect(artworkPixels).toBeGreaterThan(0);
      expect(outsidePixels, icon.src).toBe(0);
    }
  });

  it("uses only white RGB for the monochrome silhouette and preserves transparency", async () => {
    const icon = manifest.icons.find((icon) => icon.purpose === "monochrome")!;
    const { data: pixels, info } = await sharp(resolveAssetPath(icon.src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let visiblePixels = 0;
    let transparentPixels = 0;
    let coloredPixels = 0;
    for (let offset = 0; offset < pixels.length; offset += info.channels) {
      if (pixels[offset + 3] === 0) transparentPixels++;
      else {
        visiblePixels++;
        if (pixels[offset] !== 255 || pixels[offset + 1] !== 255 || pixels[offset + 2] !== 255) coloredPixels++;
      }
    }
    expect(visiblePixels).toBeGreaterThan(0);
    expect(transparentPixels).toBeGreaterThan(0);
    expect(coloredPixels).toBe(0);
  });

  it("revalidates the manifest and caches icons for one week", () => {
    const rules = buildStaticAssetHeaders();
    expect(rules.find((rule) => rule.source === "/manifest.json")?.headers).toContainEqual({ key: "Cache-Control", value: "no-cache" });
    expect(rules.find((rule) => rule.source === "/icons/:path*")?.headers).toContainEqual({ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" });
  });
});
