import { existsSync } from "node:fs";

import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

import type { CharacterFeaturesGroupedResult, CharacterFeatureItem } from "@/lib/actions/pers";

export interface FeaturesPdfInput {
  characterName: string;
  features: CharacterFeaturesGroupedResult;
}

interface FeatureSection {
  title: string;
  items: CharacterFeatureItem[];
}

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

function getLocalPuppeteerExecutablePath() {
  const fromEnv =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    process.env.GOOGLE_CHROME_BIN ||
    process.env.CHROMIUM_PATH;

  if (fromEnv && existsSync(fromEnv)) return fromEnv;

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

function groupFeaturesByType(features: CharacterFeaturesGroupedResult): FeatureSection[] {
  const sections: FeatureSection[] = [];

  if (features.passive.length > 0) {
    sections.push({ title: "Пасивні здібності", items: features.passive });
  }
  if (features.actions.length > 0) {
    sections.push({ title: "Дії", items: features.actions });
  }
  if (features.bonusActions.length > 0) {
    sections.push({ title: "Бонусні дії", items: features.bonusActions });
  }
  if (features.reactions.length > 0) {
    sections.push({ title: "Реакції", items: features.reactions });
  }

  return sections;
}

function formatUsageInfo(item: CharacterFeatureItem): string {
  if (typeof item.usesPer !== "number") return "";
  const used = typeof item.usesRemaining === "number" ? `${item.usesRemaining}/${item.usesPer}` : `/${item.usesPer}`;
  const restLabel = item.restType ? ` ${item.restType}` : "";
  return `[${used}${restLabel}]`;
}

export async function generateFeaturesPdfBytes(input: FeaturesPdfInput): Promise<Uint8Array> {
  const { characterName, features } = input;

  const sections = groupFeaturesByType(features);

  if (sections.length === 0) {
    throw new Error("No features to render");
  }

  const sectionsHtml = await Promise.all(
    sections.map(async (section) => {
      const itemsHtml = await Promise.all(
        section.items.map(async (item) => {
          const descriptionHtml = await markdownToHtml(item.description || "");
          const usageInfo = formatUsageInfo(item);
          const sourceNote = item.sourceName && item.sourceName !== item.name ? `(${escapeHtml(item.sourceName)})` : "";

          return `
          <article class="feature">
            <div class="header">
              <h2 class="name">${escapeHtml(item.name)} ${sourceNote}</h2>
              ${usageInfo ? `<span class="usage">${escapeHtml(usageInfo)}</span>` : ""}
            </div>
            <div class="desc">${descriptionHtml}</div>
          </article>`;
        })
      );

      return `
        <section class="section">
          <h1 class="section-title">${escapeHtml(section.title)}</h1>
          ${itemsHtml.join("\n")}
        </section>`;
    })
  );

  const html = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Features — ${escapeHtml(characterName)}</title>

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&family=Noto+Serif:wght@600;700&display=swap"
      rel="stylesheet"
    />

    <style>
      @page { size: letter portrait; margin: 16mm 12mm; }
      * { box-sizing: border-box; }
      body {
        font-family: "Noto Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
      }
      .wrap { padding: 0; }
      .page-title {
        font-family: "Noto Serif", Georgia, "Times New Roman", serif;
        font-size: 22px;
        font-weight: 700;
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #0f172a;
      }
      .columns {
        column-count: 2;
        column-gap: 14px;
        column-fill: auto;
      }
      .section {
        break-inside: avoid-column;
        page-break-inside: avoid;
        margin-bottom: 16px;
      }
      .section-title {
        font-family: "Noto Serif", Georgia, "Times New Roman", serif;
        font-size: 16px;
        font-weight: 700;
        margin: 0 0 10px 0;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(15, 23, 42, 0.3);
        color: #1e293b;
      }
      .feature {
        display: block;
        padding: 0 0 8px 0;
        margin: 0 0 10px 0;
        border-bottom: 1px solid rgba(15, 23, 42, 0.12);
        break-inside: avoid-column;
        page-break-inside: avoid;
      }
      .header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .name {
        font-family: "Noto Serif", Georgia, "Times New Roman", serif;
        font-size: 14px;
        font-weight: 700;
        margin: 0;
        color: #0f172a;
      }
      .usage {
        font-size: 11px;
        color: rgba(15,23,42,0.7);
        white-space: nowrap;
      }
      .desc {
        margin-top: 6px;
        font-size: 11px;
        line-height: 1.5;
        color: #334155;
      }
      .desc h1 { font-size: 13px; margin: 8px 0 4px 0; font-weight: 700; }
      .desc h2 { font-size: 12px; margin: 8px 0 4px 0; font-weight: 700; }
      .desc h3 { font-size: 11px; margin: 8px 0 4px 0; font-weight: 700; }
      .desc p { margin: 0 0 6px 0; }
      .desc table { width: 100%; border-collapse: collapse; margin: 6px 0; }
      .desc th, .desc td { border: 1px solid rgba(15,23,42,0.2); padding: 4px; text-align: left; font-size: 10px; }
      .desc ul, .desc ol { margin: 0 0 6px 16px; padding: 0; }
      .desc li { margin-bottom: 2px; }
      .generated {
        column-span: all;
        margin-top: 14px;
        font-size: 10px;
        color: rgba(15,23,42,0.6);
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1 class="page-title">Здібності — ${escapeHtml(characterName)}</h1>
      <div class="columns">
        ${sectionsHtml.join("\n")}
      </div>
      <div class="generated">сформовано на pers.holota.family</div>
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
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: "letter",
      margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
    });

    return Uint8Array.from(pdfBuffer);
  } finally {
    await browser?.close();
  }
}
