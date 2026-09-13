/**
 * KR31.3 — англійський текст рис видів 2024 із локальних сторінок
 * `data/2024/source/raw/species/*.html`.
 *
 * Чому джерело саме тут, а не в `data/2024/normalized/species.json`, який `descriptionEng` уже
 * несе: цей файл — **мета** проходу, а не його джерело, і він уже розійшовся з книгою. Виміряно
 * 2026-09-08: «Orc: Relentless Endurance» несе у `descriptionEng` зайве речення, зняте з
 * Адреналінового ривка («You can use this trait a number of times equal to your Proficiency
 * Bonus…»). Витяг із такого тексту дав би рисі БМ використань замість одного — хибний позитив,
 * тобто рівно те, що гірше за пропуск.
 *
 * SRD 5.2 (`data/2024/srd/character-origins.md`) описує девʼять видів із десяти — аазимара в
 * ньому немає. Тому витяг іде з вікі-сторінок, які покривають усі десять однаково, а SRD лишається
 * **другим, незалежним** читанням у гейті ([Р19](../../docs/DECISIONS.md#р19),
 * [Р27](../../docs/DECISIONS.md#р27)).
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBodyAsMarkdown, splitByBoldHeadings } from "./parse-class-features";

const RAW_SPECIES_DIR = "data/2024/source/raw/species";

export type SpeciesTraitSource = { name: string; descriptionEng: string };
export type SpeciesSource = { engName: string; traits: SpeciesTraitSource[] };

/// Порядок той самий, що в `data/2024/normalized/species.json`.
const SPECIES_PAGES: Array<[engName: string, fileName: string]> = [
  ["Aasimar", "aasimar.html"],
  ["Dragonborn", "dragonborn.html"],
  ["Dwarf", "dwarf.html"],
  ["Elf", "elf.html"],
  ["Gnome", "gnome.html"],
  ["Goliath", "goliath.html"],
  ["Halfling", "halfling.html"],
  ["Human", "human.html"],
  ["Orc", "orc.html"],
  ["Tiefling", "tiefling.html"],
];

export function readSpeciesSources(): SpeciesSource[] {
  return SPECIES_PAGES.map(([engName, fileName]) => ({
    engName,
    traits: parseSpeciesTraits(readFileSync(join(process.cwd(), RAW_SPECIES_DIR, fileName), "utf-8"), engName),
  }));
}

function parseSpeciesTraits(pageHtml: string, engName: string): SpeciesTraitSource[] {
  const traits = splitByBoldHeadings(renderBodyAsMarkdown(findTraitsSection(pageHtml, engName)));

  if (!traits.length) throw new Error(`${engName}: у секції рис не знайдено жодної риси.`);
  return traits;
}

function findTraitsSection(pageHtml: string, engName: string): string {
  const contentStart = pageHtml.indexOf('id="page-content"');
  if (contentStart === -1) throw new Error(`${engName}: не знайдено page-content.`);

  const content = pageHtml.slice(contentStart).split(/<script|<!-- mobile bottom|<div class="page-tags"/)[0];
  // Рівень заголовка на сторінках різний: в аазимара це <h1>, у решти — <h3>.
  const heading = new RegExp(`<h[1-6][^>]*>\\s*<span>\\s*${engName} Traits\\s*</span>\\s*</h[1-6]>`).exec(content);
  if (!heading) throw new Error(`${engName}: не знайдено заголовок «${engName} Traits».`);

  return content.slice(heading.index + heading[0].length);
}

function main() {
  for (const species of readSpeciesSources()) {
    console.log(`  ${species.engName.padEnd(12)} ${String(species.traits.length).padStart(2)} рис`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
