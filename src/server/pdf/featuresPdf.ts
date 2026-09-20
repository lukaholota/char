import { getFontsCss, generatePdfFromHtml } from "./pdfUtils";
import type { PdfLogContext } from "./pdfUtils";
import { escapePrintHtml, renderPrintableMarkdown, renderPrintableUserText } from "./printProjection";
import type { PrintableWeaponMastery } from "./weaponMasteryPrint";

import type { CharacterFeaturesGroupedResult, CharacterFeatureItem } from "@/lib/actions/pers";
import { 
  normalizeFeatureSource, 
  getFeatureSourceLabel, 
  getFeatureDisplayName 
} from "@/lib/utils/features";

export interface FeaturesPdfInput {
  characterName: string;
  features: CharacterFeaturesGroupedResult;
  weaponMasteries?: PrintableWeaponMastery[];
}

interface FeatureSection {
  title: string;
  items: CharacterFeatureItem[];
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
  const counter = formatUsesCounter(item);
  if (!item.isActive) return counter;
  return counter ? `${counter} активна` : "активна";
}

function formatUsesCounter(item: CharacterFeatureItem): string {
  if (typeof item.usesPer !== "number") return "";

  // If usesRemaining isn't tracked (null/undefined), assume it's full.
  // This avoids odd labels like "/1" and keeps the output consistently "x/y".
  const rawRemaining = typeof item.usesRemaining === "number" ? item.usesRemaining : item.usesPer;
  const remaining = Number.isFinite(rawRemaining) ? Math.max(0, Math.min(item.usesPer, rawRemaining)) : item.usesPer;

  const used = `${remaining}/${item.usesPer}`;
  const restLabel = item.restType ? ` ${translateRestType(item.restType)}` : "";
  return `[${used}${restLabel}]`;
}

function translateRestType(restType: unknown): string {
  const v = String(restType ?? "");

  // Covers common enum/string variants.
  if (v === "LONG_REST" || v.toLowerCase() === "long rest" || v.toLowerCase() === "long_rest") return "трив. відп.";
  if (v === "SHORT_REST" || v.toLowerCase() === "short rest" || v.toLowerCase() === "short_rest") return "кор. відп.";

  return v;
}

/** Вибрана майстерність зброї 2024 — окремий блок, бо це не риса, а властивість вибраної зброї. */
function renderWeaponMasterySection(masteries: PrintableWeaponMastery[]): string {
  if (masteries.length === 0) return "";

  const itemsHtml = masteries.map(
    (mastery) => `
          <article class="feature">
            <div class="header">
              <h2 class="name">${escapePrintHtml(mastery.weaponName)}</h2>
              <span class="usage">${escapePrintHtml(mastery.masteryLabel)}</span>
            </div>
            <div class="desc"><p>${escapePrintHtml(mastery.description)}</p></div>
          </article>`
  );

  return `
        <section class="section">
          <h1 class="section-title">Майстерність зброї</h1>
          ${itemsHtml.join("\n")}
        </section>`;
}

export async function generateFeaturesPdfBytes(input: FeaturesPdfInput, logCtx: PdfLogContext = {}): Promise<Uint8Array> {
  const { characterName, features } = input;

  const sections = groupFeaturesByType(features);
  const weaponMasteryHtml = renderWeaponMasterySection(input.weaponMasteries ?? []);

  if (sections.length === 0 && !weaponMasteryHtml) {
    throw new Error("No features to render");
  }

  const sectionsHtml = await Promise.all(
    sections.map(async (section) => {
      const itemsHtml = await Promise.all(
        section.items.map(async (item) => {
          const descriptionHtml = await (item.hasCustomDescription ? renderPrintableUserText(item.description) : renderPrintableMarkdown(item.description || ""));
          const usageInfo = formatUsageInfo(item);
          
          const normalizedSource = normalizeFeatureSource(item.source);
          const displayName = getFeatureDisplayName(item.name, item.source);
          
          // Use shared source label logic
          const sourceLabel = normalizedSource && normalizedSource !== 'PERS' ? getFeatureSourceLabel(normalizedSource) : null;
          const sourceNote = sourceLabel ? `(${sourceLabel})` : "";

          return `
          <article class="feature">
            <div class="header">
              <h2 class="name">${escapePrintHtml(displayName)} ${escapePrintHtml(sourceNote)}</h2>
              ${usageInfo ? `<span class="usage">${escapePrintHtml(usageInfo)}</span>` : ""}
            </div>
            <div class="desc">${descriptionHtml}</div>
          </article>`;
        })
      );

      return `
        <section class="section">
          <h1 class="section-title">${escapePrintHtml(section.title)}</h1>
          ${itemsHtml.join("\n")}
        </section>`;
    })
  );

  const html = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Features — ${escapePrintHtml(characterName)}</title>

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
        break-inside: auto;
        page-break-inside: auto;
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
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1 class="page-title">Здібності — ${escapePrintHtml(characterName)}</h1>
      <div class="columns">
        ${[...sectionsHtml, weaponMasteryHtml].filter(Boolean).join("\n")}
      </div>
    </div>
  </body>
</html>`;

  return generatePdfFromHtml(html, {}, undefined, { ...logCtx, tag: logCtx.tag ?? "features" });
}
