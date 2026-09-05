import type { Ruleset } from "@prisma/client";

import type { CreatureData } from "@/lib/bestiaryData";
import { findCreatureByKey } from "@/lib/bestiaryData";
import { getFontsCss, generatePdfFromHtml } from "./pdfUtils";
import type { PdfLogContext } from "./pdfUtils";
import {
  escapePrintHtml,
  preparePrintableMarkdown,
  renderPrintableMarkdown,
} from "./printProjection";

type CreatureSection = {
  title: string;
  markdown: string | null | undefined;
};

export type PrintableCreature = Omit<CreatureData, "imageUrl" | "imageWidth" | "imageHeight">;

export class PrintableCreatureNotFoundError extends Error {}

export function loadPrintableCreatures(keys: readonly string[], ruleset: Ruleset): PrintableCreature[] {
  return keys.map((key) => {
    const creature = findCreatureByKey(key, ruleset);
    if (!creature) throw new PrintableCreatureNotFoundError(`Істоту не знайдено: ${key}`);
    return toPrintableCreature(creature);
  });
}

export async function buildCreaturesPrintHtml(creatures: readonly PrintableCreature[]): Promise<string> {
  if (creatures.length === 0) throw new Error("creatures must be a non-empty array");
  const cards = await Promise.all(creatures.map(buildCreatureCardHtml));
  return buildDocumentHtml(cards.join("\n"));
}

export async function generateCreaturesPdfBytes(
  creatures: readonly PrintableCreature[],
  logContext: PdfLogContext = {}
): Promise<Uint8Array> {
  const html = await buildCreaturesPrintHtml(creatures);
  return generatePdfFromHtml(html, {}, undefined, {
    ...logContext,
    tag: logContext.tag ?? "creatures",
  });
}

function toPrintableCreature(creature: CreatureData): PrintableCreature {
  const {
    imageUrl: _imageUrl,
    imageWidth: _imageWidth,
    imageHeight: _imageHeight,
    ...printableCreature
  } = creature;
  return printableCreature;
}

async function buildCreatureCardHtml(creature: PrintableCreature): Promise<string> {
  const sections = await buildCreatureSectionsHtml(creature);
  return `<article class="statblock">
    <header class="creature-header">
      <h1>${printText(creature.name)}</h1>
      <p>${printText([creature.size, creature.type, creature.alignment].filter(Boolean).join(", "))}</p>
    </header>
    ${buildCoreStatsHtml(creature)}
    ${buildAbilitiesHtml(creature)}
    ${buildMetadataHtml(creature)}
    ${sections}
  </article>`;
}

function buildCoreStatsHtml(creature: PrintableCreature): string {
  return `<section class="core-stats rule-block">
    ${buildStatLine("Клас обладунку", creature.ac)}
    ${buildStatLine("Хіт-поінти", creature.hp)}
    ${buildStatLine("Швидкість", creature.speed)}
  </section>`;
}

function buildAbilitiesHtml(creature: PrintableCreature): string {
  const abilities = [
    ["СИЛ", creature.strength],
    ["СПР", creature.dexterity],
    ["СТА", creature.constitution],
    ["ІНТ", creature.intelligence],
    ["МУД", creature.wisdom],
    ["ХАР", creature.charisma],
  ];
  return `<section class="abilities rule-block">${abilities
    .map(([label, score]) => `<div><strong>${label}</strong><span>${printText(score)}</span></div>`)
    .join("")}</section>`;
}

function buildMetadataHtml(creature: PrintableCreature): string {
  const rows: Array<[string, string | undefined]> = [
    ["Рятівні кидки", creature.savingThrows],
    ["Навички", creature.skills],
    ["Спорядження", creature.gear],
    ["Вразливість до ушкоджень", creature.damageVulnerability],
    ["Опір до ушкоджень", creature.damageResistance],
    ["Імунітет до ушкоджень", creature.damageImmunity],
    ["Імунітет до станів", creature.conditionImmunity],
    ["Чуття", creature.senses],
    ["Мови", creature.languages],
  ];
  const visibleRows = rows.filter(([, content]) => Boolean(content));

  return `<section class="metadata rule-block">
    ${visibleRows.map(([label, content]) => buildStatLine(label, content)).join("")}
    <div class="challenge-row">
      ${buildChallengeHtml(creature)}
      ${creature.proficiencyBonus ? buildStatLine("Бонус майстерності", creature.proficiencyBonus) : ""}
    </div>
  </section>`;
}

function buildChallengeHtml(creature: PrintableCreature): string {
  const xp = creature.xp && creature.xp !== "-" ? ` (${printText(creature.xp)} XP)` : "";
  return `<p><strong>Показник небезпеки</strong> ${printText(creature.challenge || "-")}${xp}</p>`;
}

async function buildCreatureSectionsHtml(creature: PrintableCreature): Promise<string> {
  const sections = collectCreatureSections(creature);
  const rendered = await Promise.all(sections.map(buildProseSectionHtml));
  return rendered.join("\n");
}

function collectCreatureSections(creature: PrintableCreature): CreatureSection[] {
  return [
    { title: "ОСОБЛИВОСТІ", markdown: creature.specialAbilities },
    { title: "ДІЇ", markdown: creature.actions },
    { title: "БОНУСНІ ДІЇ", markdown: creature.bonusActions },
    { title: "РЕАКЦІЇ", markdown: creature.reactions },
    { title: "ЛЕГЕНДАРНІ ДІЇ", markdown: creature.legendaryActions },
    { title: "ЛІГВО", markdown: creature.lairInfo },
    { title: "ДІЇ ЛІГВА", markdown: creature.lairActions },
    { title: "РЕГІОНАЛЬНІ ЕФЕКТИ", markdown: creature.regionEffects },
    { title: "МІФІЧНІ ДІЇ", markdown: [creature.mythicInfo, creature.mythicActions].filter(Boolean).join("\n") },
  ].filter((section) => Boolean(section.markdown));
}

async function buildProseSectionHtml(section: CreatureSection): Promise<string> {
  const content = await renderPrintableMarkdown(section.markdown ?? "");
  return `<section class="prose-section">
    <h2>${escapePrintHtml(section.title)}</h2>
    <div class="prose">${content}</div>
  </section>`;
}

function buildStatLine(label: string, content: string | null | undefined): string {
  if (!content) return "";
  return `<p><strong>${escapePrintHtml(label)}</strong> ${printText(content)}</p>`;
}

function printText(text: string): string {
  return escapePrintHtml(preparePrintableMarkdown(text));
}

function buildDocumentHtml(cards: string): string {
  return `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Бестіарій — друк</title>
  <style>${getFontsCss()}${STATBLOCK_CSS}</style>
</head>
<body><main class="columns">${cards}</main></body>
</html>`;
}

const STATBLOCK_CSS = `
  @page { size: letter portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #000; font-family: "NotoSansLocal", Arial, sans-serif; }
  .columns { column-count: 2; column-gap: 8mm; column-fill: auto; }
  .statblock { display: block; width: 100%; margin: 0 0 8mm; padding: 4mm; background: #fff; border-top: 2px solid #000; border-bottom: 2px solid #000; break-inside: auto; page-break-inside: auto; }
  .creature-header { border-bottom: 1.5px solid #000; padding-bottom: 2mm; }
  .creature-header h1 { margin: 0; color: #000; font-family: "Noto Serif", Georgia, serif; font-size: 18px; line-height: 1.05; font-variant: small-caps; }
  .creature-header p { margin: 1mm 0 0; font-size: 9px; font-style: italic; }
  .rule-block { padding: 2mm 0; border-bottom: 1.5px solid #000; }
  p { margin: 0 0 1mm; font-size: 9px; line-height: 1.35; }
  .abilities { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1mm; text-align: center; }
  .abilities div { display: flex; flex-direction: column; font-size: 8.5px; }
  .abilities strong { color: #000; }
  .challenge-row { display: flex; justify-content: space-between; gap: 3mm; }
  .challenge-row p:last-child { text-align: right; }
  .prose-section { margin-top: 2.5mm; }
  .prose-section h2 { margin: 0 0 1mm; padding-bottom: .5mm; border-bottom: 1px solid #000; color: #000; font-family: "Noto Serif", Georgia, serif; font-size: 13px; font-weight: 500; }
  .prose { font-size: 8.7px; line-height: 1.35; }
  .prose p { margin: 0 0 1.5mm; }
  .prose strong em, .prose em strong { color: #000; }
  .prose ul, .prose ol { margin: 1mm 0 1.5mm 4mm; padding: 0; }
  .prose table { width: 100%; border-collapse: collapse; font-size: 8px; }
  .prose th, .prose td { border: .5px solid #000; padding: 1mm; text-align: left; }
`;
