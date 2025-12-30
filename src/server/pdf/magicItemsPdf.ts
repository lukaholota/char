import { prisma } from "@/lib/prisma";
import { existsSync } from "node:fs";
import { getFontsCss } from "./pdfUtils";

import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { MagicItemType, ItemRarity } from "@prisma/client";

async function markdownToHtml(markdown: string) {
  const file = await remark().use(remarkGfm).use(remarkHtml, { sanitize: false }).process(markdown);
  return String(file);
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function translateRarity(rarity: ItemRarity) {
  const map: Partial<Record<ItemRarity, string>> = {
    COMMON: "Звичайний",
    UNCOMMON: "Незвичайний",
    RARE: "Рідкісний",
    VERY_RARE: "Дуже рідкісний",
    LEGENDARY: "Легендарний",
    ARTIFACT: "Артефакт",
  };
  return map[rarity] || rarity;
}

function translateType(type: MagicItemType) {
  // Use simple translation for print to save space/complexity, or use shared translation map if imported
  const map: Partial<Record<MagicItemType, string>> = {
    ARMOR: "Обладунок",
    POTION: "Зілля",
    RING: "Кільце",
    ROD: "Жезл",
    SCROLL: "Сувій",
    STAFF: "Посох",
    WAND: "Чарівна паличка",
    WEAPON: "Зброя",
    WONDROUS_ITEM: "Дивовижний предмет",
  };
  return map[type] || type;
}

function getLocalPuppeteerExecutablePath() {
  const fromEnv =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    process.env.GOOGLE_CHROME_BIN ||
    process.env.CHROMIUM_PATH;

  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  // Common macOS locations
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  return undefined;
}

export async function generateMagicItemsPdfBytes(magicItemIds: number[]): Promise<Uint8Array> {
  if (magicItemIds.length === 0) {
    throw new Error("magicItemIds must be a non-empty array");
  }

  const items = await prisma.magicItem.findMany({
    where: { magicItemId: { in: magicItemIds } },
    orderBy: { name: "asc" },
  });

  // Keep order consistent with input if possible, or just alpha? Alpha is better for list.

  const sections = await Promise.all(
    items.map(async (item) => {
      const descriptionHtml = await markdownToHtml(item.description);
      return {
        ...item,
        descriptionHtml,
      };
    })
  );

  const fontsCss = getFontsCss();

  const html = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Magic Items Print</title>

    <style>
      ${fontsCss}
      @page { size: letter portrait; margin: 16mm 12mm; }
      * { box-sizing: border-box; }
      body {
        font-family: "NotoSansLocal", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
      }
      .wrap { padding: 0; }
      .columns {
        column-count: 2;
        column-gap: 14px;
        column-fill: auto;
      }
      .item {
        display: block;
        padding: 0 0 10px 0;
        margin: 0 0 12px 0;
        border-bottom: 1px solid rgba(15, 23, 42, 0.18);
        break-inside: auto;
        page-break-inside: auto;
      }
      .header { display:flex; align-items: baseline; justify-content: space-between; gap: 12px; }
      .name { font-family: "Noto Serif", Georgia, "Times New Roman", serif; font-size: 18px; font-weight: 700; margin: 0; }
      .meta { font-size: 11px; color: rgba(15,23,42,0.65); text-align: right; white-space: nowrap; }
      .sub { margin-top: 6px; display:flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: rgba(15,23,42,0.8); }
      .sub em { font-style: italic; }
      .desc { margin-top: 10px; font-size: 12px; line-height: 1.5; }
      .desc h1 { font-size: 14px; margin: 10px 0 6px 0; font-weight: 700; }
      .desc h2 { font-size: 13px; margin: 10px 0 6px 0; font-weight: 700; }
      .desc h3 { font-size: 12px; margin: 10px 0 6px 0; font-weight: 700; }
      .desc p { margin: 0 0 8px 0; }
      .desc table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      .desc th, .desc td { border: 1px solid rgba(15,23,42,0.2); padding: 6px; text-align: left; }
      .desc ul, .desc ol { margin: 0 0 8px 18px; }
      .attunement { color: #b91c1c; font-weight: 600; font-size: 11px; margin-left: auto; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="columns">
      ${sections
        .map(
          (s) => `
      <section class="item">
        <div class="header">
          <h1 class="name">${escapeHtml(s.name)}</h1>
          <div class="meta">${escapeHtml(translateRarity(s.rarity))}</div>
        </div>
        <div class="sub">
          <div><em>${escapeHtml(translateType(s.itemType))}</em></div>
          ${s.requiresAttunement ? `<div class="attunement">Вимагає налаштування</div>` : ""}
        </div>
        <div class="desc">${s.descriptionHtml}</div>
      </section>`
        )
        .join("\n")}
      </div>
    </div>
  </body>
</html>`;

  let browser: Browser | null = null;

  try {
    const isVercelLike = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

    const executablePath = isVercelLike ? await chromium.executablePath() : getLocalPuppeteerExecutablePath();

    if (!executablePath) {
      throw new Error(
        "Puppeteer не знайшов браузер. Для локальної розробки встанови Chrome/Chromium або задай PUPPETEER_EXECUTABLE_PATH (або CHROME_PATH)."
      );
    }

    browser = await puppeteer.launch({
      args: isVercelLike ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.98,
      format: "letter",
      margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
      timeout: 60000,
    });

    return Uint8Array.from(pdfBuffer);
  } finally {
    await browser?.close();
  }
}
