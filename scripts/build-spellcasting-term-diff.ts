/**
 * Діф на перегляд власником: «Чаклування» → «Чаротворення» у бестіарії 2014.
 *
 *   npx tsx scripts/build-spellcasting-term-diff.ts
 *
 * Нічого не змінює — лише друкує, що саме змінилося б. Рішення власника й обсяг —
 * docs/o12-srd-2024-import/kr12.8-spellcasting-term.md.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const OLD_TERM = "Чаклування";
const NEW_TERM = "Чаротворення";
const CREATURES_PATH = join(process.cwd(), "src/lib/generated/creatures.json");
const DICTIONARY_PATH = join(process.cwd(), "src/lib/refs/dictionary.json");
const OUTPUT_PATH = join(process.cwd(), "docs/o12-srd-2024-import/kr12.8-spellcasting-diff.md");

type Occurrence = { creature: string; field: string; before: string; after: string };

function readCreatures(): Array<Record<string, unknown>> {
  const parsed = JSON.parse(readFileSync(CREATURES_PATH, "utf-8"));
  return Array.isArray(parsed) ? parsed : (parsed.creatures ?? []);
}

function collectOccurrences(): Occurrence[] {
  const found: Occurrence[] = [];

  for (const creature of readCreatures()) {
    const creatureName = String(creature.name ?? creature.nameEng ?? "?");

    for (const [field, value] of Object.entries(creature)) {
      for (const html of collectStrings(value)) {
        if (!html.includes(OLD_TERM)) continue;
        for (const snippet of findSnippets(html)) {
          found.push({
            creature: creatureName,
            field,
            before: snippet,
            after: snippet.replaceAll(OLD_TERM, NEW_TERM),
          });
        }
      }
    }
  }

  return found;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}

/// Термін стоїть заголовком риси всередині HTML-блоку (<p><b>Чаклування …</b>),
/// тому в діф іде саме той жирний фрагмент, а не весь абзац.
function findSnippets(html: string): string[] {
  const bold = [...html.matchAll(/<b>([^<]*)<\/b>/g)]
    .map((match) => match[1])
    .filter((text) => text.includes(OLD_TERM));

  const boldCount = bold.length;
  const totalCount = (html.match(new RegExp(OLD_TERM, "g")) ?? []).length;
  if (boldCount === totalCount) return bold;

  /// Решта — згадки в прозі, а не заголовок риси. Вони посилаються на ту саму рису,
  /// тому міняються разом із нею; у діф іде вікно навколо слова, а не початок абзацу.
  return [...bold, ...findProseWindows(html, totalCount - boldCount)];
}

function findProseWindows(html: string, wanted: number): string[] {
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const windows: string[] = [];
  let from = 0;

  while (windows.length < wanted) {
    const at = plain.indexOf(OLD_TERM, from);
    if (at === -1) break;
    windows.push(`…${plain.slice(Math.max(0, at - 60), at + OLD_TERM.length + 60).trim()}…`);
    from = at + OLD_TERM.length;
  }

  return windows;
}

function buildReport(occurrences: Occurrence[]): string {
  const byCreature = new Map<string, Occurrence[]>();
  for (const occurrence of occurrences) {
    const bucket = byCreature.get(occurrence.creature) ?? [];
    bucket.push(occurrence);
    byCreature.set(occurrence.creature, bucket);
  }

  const variants = new Map<string, number>();
  for (const occurrence of occurrences) {
    variants.set(occurrence.before, (variants.get(occurrence.before) ?? 0) + 1);
  }

  const lines = [
    `# KR12.8 — діф «${OLD_TERM}» → «${NEW_TERM}» у бестіарії 2014`,
    "",
    "Згенеровано `npx tsx scripts/build-spellcasting-term-diff.ts`. Нічого не застосовано.",
    "",
    `- істот зачеплено: **${byCreature.size}**`,
    `- уживань: **${occurrences.length}**`,
    `- різних форм заголовка: **${variants.size}**`,
    "",
    "## Форми заголовка, за спаданням частоти",
    "",
    "| Було | Стане | Разів |",
    "| --- | --- | ---: |",
    ...[...variants.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([before, count]) => `| ${before} | ${before.replaceAll(OLD_TERM, NEW_TERM)} | ${count} |`),
    "",
    "## Істоти",
    "",
    ...[...byCreature.entries()]
      .sort((left, right) => left[0].localeCompare(right[0], "uk"))
      .map(([creature, entries]) => `- **${creature}** — ${entries.map((e) => e.field).join(", ")}`),
    "",
    "## Словник",
    "",
    "`src/lib/refs/dictionary.json` → `statblockFeatures`:",
    "",
    "```diff",
    `-      "Spellcasting": "${OLD_TERM}",`,
    `+      "Spellcasting": "${NEW_TERM}",`,
    "```",
    "",
  ];

  return lines.join("\n");
}

function main() {
  const occurrences = collectOccurrences();
  writeFileSync(OUTPUT_PATH, buildReport(occurrences), "utf-8");

  const dictionaryHits = (readFileSync(DICTIONARY_PATH, "utf-8").match(new RegExp(OLD_TERM, "g")) ?? []).length;
  console.log(`✅ ${occurrences.length} уживань у бестіарії, ${dictionaryHits} у словнику → ${OUTPUT_PATH}`);
  console.log("   Нічого не змінено — це діф на перегляд.");
}

main();
