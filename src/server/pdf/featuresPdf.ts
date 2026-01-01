import { getFontsCss, generatePdfFromHtml } from "./pdfUtils";

import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

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

export async function generateFeaturesHtmlContents(input: FeaturesPdfInput): Promise<string> {
  const { characterName, features } = input;
  const sections = groupFeaturesByType(features);

  if (sections.length === 0) {
    return "";
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

  return `
    <div class="wrap">
      <h1 class="page-title">Здібності — ${escapeHtml(characterName)}</h1>
      <div class="columns">
        ${sectionsHtml.join("\n")}
      </div>
    </div>`;
}

export function getFeaturesStyles(): string {
  return `
      .section {
        break-inside: auto;
        page-break-inside: auto;
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
        break-inside: avoid;
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
  `;
}

export async function generateFeaturesPdfBytes(input: FeaturesPdfInput): Promise<Uint8Array> {
  const contentHtml = await generateFeaturesHtmlContents(input);

  const html = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Features — ${escapeHtml(input.characterName)}</title>

    <style>
      ${getFontsCss()}
      @page { size: letter portrait; margin: 16mm 12mm; }
      * { box-sizing: border-box; }
      body {
        font-family: "NotoSansLocal", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
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
      ${getFeaturesStyles()}
    </style>
  </head>
  <body>
    ${contentHtml}
  </body>
</html>`;

  return generatePdfFromHtml(html);
}
