/**
 * Build data/2024/bastion-terms.md — бланк для власника: назви 61 приміщення та кожен
 * оригінал, що поїхав у текст під маркером Р20.
 * Run: npx tsx scripts/5etools/build-bastion-terms.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { findGlossaryMarkers } from "../../src/lib/refs/glossary-marker";

const CATALOG_PATH = join(process.cwd(), "src/lib/generated/bastions.json");
const REPORT_PATH = join(process.cwd(), "data/2024/bastion-terms.md");

type CatalogFacility = {
  slug: string;
  name: string;
  nameEng: string;
  source: string;
  level: number | null;
  facilityType: string;
  shortDescription: string;
  prerequisiteText: string;
  description: string;
};

function buildTermsForm(): void {
  const facilities = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as CatalogFacility[];

  const report = [
    describeHeader(facilities.length),
    describeNames(facilities),
    describeMarkers(facilities),
  ].join("\n\n");

  writeFileSync(REPORT_PATH, `${report}\n`, "utf-8");
  console.log(`Записано ${REPORT_PATH}`);
}

function describeHeader(total: number): string {
  return [
    "# Терміни бастіонів — бланк для власника",
    "",
    "> **Згенеровано** `bunx tsx scripts/5etools/build-bastion-terms.ts` з `src/lib/generated/bastions.json`.",
    "> Руками не редагувати — правити переклад у `data/2024/bastions-uk/` і перегенерувати.",
    "",
    "Системний словник — накази, розміри простору, типи приміщень — уже затверджено 2026-08-28 і",
    "він лежить у `translation.ts` (`bastionOrderTranslations`, `bastionSpaceTranslations`,",
    "`bastionFacilityTypeTranslations`) та в `dictionary.json` (`rules2024.bastionTerms`).",
    "Тут лишилося те, що агент обрав сам: назви приміщень і терміни під маркером Р20.",
    "",
    `Приміщень: **${total}**. Постав позначку в «Заперечую» там, де назва не влаштовує;`,
    "порожній рядок = згода, і назва лишається як є.",
  ].join("\n");
}

function describeNames(facilities: CatalogFacility[]): string {
  const rows = facilities.map(
    (facility) =>
      `| ${facility.nameEng} | **${facility.name}** | ${facility.source} | ${
        facility.level === null ? "базове" : `${facility.level}+`
      } | [ ] |`
  );

  return [
    "## Назви приміщень",
    "",
    "| Англійська | Українська | Книга | Рівень | Заперечую |",
    "|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function describeMarkers(facilities: CatalogFacility[]): string {
  const pairs = new Map<string, { terms: Set<string>; where: Set<string> }>();

  for (const facility of facilities) {
    const fields = [facility.name, facility.shortDescription, facility.prerequisiteText, facility.description];
    for (const field of fields) {
      for (const { term, original } of findGlossaryMarkers(field)) {
        const found = pairs.get(original) ?? { terms: new Set(), where: new Set() };
        found.terms.add(term);
        found.where.add(facility.name);
        pairs.set(original, found);
      }
    }
  }

  const rows = [...pairs]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([original, found]) =>
        `| ${original} | ${[...found.terms].join(" / ")} | ${found.where.size} | [ ] |`
    );

  return [
    "## Терміни під маркером Р20",
    "",
    `Разом: **${pairs.size}**. Це те, що читач побачить у підказці на наведення.`,
    "",
    "| Оригінал | Українською | Приміщень | Заперечую |",
    "|---|---|---:|---|",
    ...rows,
  ].join("\n");
}

buildTermsForm();
