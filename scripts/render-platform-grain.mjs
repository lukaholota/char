// Перемальовує плитку зерна фону: `node scripts/render-platform-grain.mjs` → public/assets/platform-grain-v1.png,
// далі `cwebp -q 60 -alpha_q 60 … -o public/assets/platform-grain-vN.webp` і нове імʼя в PlatformBackdrop.tsx.
import { chromium } from "playwright";

const TILE_CSS_PX = 128;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: TILE_CSS_PX, height: TILE_CSS_PX }, deviceScaleFactor: 2 });
await page.setContent(`<svg width="${TILE_CSS_PX}" height="${TILE_CSS_PX}" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <filter id="n" filterUnits="userSpaceOnUse" x="0" y="0" width="${TILE_CSS_PX}" height="${TILE_CSS_PX}">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
    <feColorMatrix type="saturate" values="0" />
  </filter>
  <rect width="${TILE_CSS_PX}" height="${TILE_CSS_PX}" filter="url(#n)" />
</svg>`);
await page.addStyleTag({ content: "body{margin:0;background:transparent}" });
await page.screenshot({ path: "public/assets/platform-grain-v1.png", omitBackground: true, clip: { x: 0, y: 0, width: TILE_CSS_PX, height: TILE_CSS_PX } });
await browser.close();
