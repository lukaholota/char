/**
 * Build src/lib/generated/bastions.json from the pinned 5etools facility corpus
 * plus the Ukrainian translations in data/2024/bastions-uk/.
 * Run: npx tsx scripts/generate-bastions.ts
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

import { ParsedBastionFacility } from "./5etools/bastion-facilities";
import { stripGlossaryMarkers } from "../src/lib/refs/glossary-marker";
import { stripSpellAnchors } from "../src/lib/spell-link";

const NORMALIZED_PATH = join(process.cwd(), "data/2024/normalized/bastion-facilities.json");
const TRANSLATIONS_DIR = join(process.cwd(), "data/2024/bastions-uk");
const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/bastions.json");

export type BastionFacilityTranslation = {
  name: string;
  shortDescription: string;
  prerequisite?: string;
  description: string;
};

export type GeneratedBastionFacility = ParsedBastionFacility & {
  name: string;
  shortDescription: string;
  prerequisiteText: string;
  description: string;
  ruleset: "RULES_2024";
};

export function buildBastionFacilityCatalog(): GeneratedBastionFacility[] {
  const facilities = readNormalizedFacilities();
  const translations = readTranslations();

  return facilities
    .map((facility) => mergeTranslation(facility, translations.get(facility.slug)))
    .sort((left, right) => compareForCatalog(left, right));
}

function readNormalizedFacilities(): ParsedBastionFacility[] {
  const catalog = JSON.parse(readFileSync(NORMALIZED_PATH, "utf-8")) as {
    facilities: ParsedBastionFacility[];
  };
  return catalog.facilities;
}

function readTranslations(): Map<string, BastionFacilityTranslation> {
  const merged = new Map<string, BastionFacilityTranslation>();
  if (!existsSync(TRANSLATIONS_DIR)) return merged;

  for (const fileName of readdirSync(TRANSLATIONS_DIR).filter((name) => name.startsWith("batch-")).sort()) {
    const batch = JSON.parse(readFileSync(join(TRANSLATIONS_DIR, fileName), "utf-8")) as Record<
      string,
      BastionFacilityTranslation
    >;
    for (const [slug, translation] of Object.entries(batch)) {
      if (merged.has(slug)) throw new Error(`Переклад «${slug}» трапляється двічі (${fileName})`);
      merged.set(slug, translation);
    }
  }

  return merged;
}

function mergeTranslation(
  facility: ParsedBastionFacility,
  translation: BastionFacilityTranslation | undefined
): GeneratedBastionFacility {
  if (!translation) throw new Error(`${facility.nameEng}: немає перекладу у data/2024/bastions-uk/`);
  failOnUntranslated(facility, translation);

  return {
    ...facility,
    name: translation.name,
    shortDescription: translation.shortDescription,
    prerequisiteText: translation.prerequisite ?? "",
    description: translation.description,
    ruleset: "RULES_2024",
  };
}

/// Той самий гейт, що й у бестіарію: латиниця в українському полі означає недоперекладений
/// запис. Дозволені оригінали в маркерах Р20, назви заклинань у квадратних дужках і маршрут
/// каталогу в якорі на заклинання (O25, KR25.4).
function failOnUntranslated(
  facility: ParsedBastionFacility,
  translation: BastionFacilityTranslation
): void {
  for (const [field, value] of Object.entries(translation)) {
    const clean = stripSpellAnchors(stripGlossaryMarkers(String(value))).replace(/\[[^\]]*\]/g, "");
    if (/[a-zA-Z]/.test(clean)) {
      throw new Error(`${facility.nameEng} › ${field}: лишилася англійська — «${clean.trim()}»`);
    }
    if (!/[Ѐ-ӿ]/.test(String(value))) {
      throw new Error(`${facility.nameEng} › ${field}: немає кирилиці`);
    }
  }

  if (facility.prerequisite && !translation.prerequisite) {
    throw new Error(`${facility.nameEng}: передумова є в джерелі, але не перекладена`);
  }
}

/// Спершу базові, далі спеціальні за рівнем, усередині рівня — за українською назвою: саме в
/// такому порядку приміщення читають у книзі й у списку каталогу.
function compareForCatalog(left: GeneratedBastionFacility, right: GeneratedBastionFacility): number {
  if (left.facilityType !== right.facilityType) return left.facilityType === "basic" ? -1 : 1;
  if ((left.level ?? 0) !== (right.level ?? 0)) return (left.level ?? 0) - (right.level ?? 0);
  return left.name.localeCompare(right.name, "uk");
}

function writeCatalog(): void {
  const facilities = buildBastionFacilityCatalog();
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(facilities, null, 2)}\n`, "utf-8");
  console.log(`Приміщень бастіону: ${facilities.length} → ${OUTPUT_PATH}`);
}

if (process.argv[1]?.endsWith("generate-bastions.ts")) writeCatalog();
