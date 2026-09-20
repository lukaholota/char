import type { Ruleset } from "@prisma/client";
import { raceTranslations, subraceTranslations, variantTranslations } from "@/lib/refs/translation";

type NamedRow = { name: string } | null | undefined;

export type PersSpeciesSource = {
  ruleset: Ruleset;
  race: NamedRow;
  subrace?: NamedRow;
  raceVariants?: readonly { name: string }[] | null;
  raceChoiceOptions?: readonly { choiceGroupName: string; optionName: string }[] | null;
};

/** Групи виборів виду 2024, що задають родовід; назви — з prisma/seed/speciesChoices2024.ts. */
export const SPECIES_LINEAGE_CHOICE_GROUPS: readonly string[] = [
  "Драконяче походження",
  "Ельфійський родовід",
  "Гномський родовід",
  "Велетенське походження",
  "Почварна спадщина",
];

export function buildPersSpeciesName(pers: PersSpeciesSource): string {
  const raceName = translateName(raceTranslations, pers.race?.name);
  if (pers.ruleset === "RULES_2024") return appendLineage(raceName, findLineageOptionNames(pers));
  return findSubraceOrVariantName(pers) ?? raceName;
}

function findLineageOptionNames(pers: PersSpeciesSource): string[] {
  return (pers.raceChoiceOptions ?? [])
    .filter((option) => SPECIES_LINEAGE_CHOICE_GROUPS.includes(option.choiceGroupName))
    .map((option) => option.optionName);
}

function appendLineage(raceName: string, lineageNames: string[]): string {
  return lineageNames.length > 0 ? `${raceName} (${lineageNames.join(", ")})` : raceName;
}

function findSubraceOrVariantName(pers: PersSpeciesSource): string | null {
  if (pers.subrace?.name) return translateName(subraceTranslations, pers.subrace.name);
  const [variant] = pers.raceVariants ?? [];
  return variant ? translateName(variantTranslations, variant.name) : null;
}

function translateName(translations: Record<string, string>, name: string | undefined): string {
  if (!name) return "";
  return translations[name] ?? name;
}
