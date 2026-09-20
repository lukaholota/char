import { ArmorType, Language, ToolCategory } from "@prisma/client";
import {
  formatArmorProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { countFeatToolChoices } from "@/rules/feat-tool-choices";
import { parseEnumArray, parseOptionalNumber, parseWeaponProficiencies } from "@/server/db/json";

export type FeatTextSource = {
  name: string;
  grantedLanguages: unknown;
  grantedLanguageCount: unknown;
  grantedArmorProficiencies: unknown;
  grantedToolProficiencies: unknown;
  grantedWeaponProficiencies: unknown;
};

const EMPTY_FORMATTED = "—";

export function buildFeatLanguageLines(feat: FeatTextSource): string[] {
  const granted = parseEnumArray(feat.grantedLanguages, Language).map((language) => translateValue(String(language)));
  const choiceCount = parseOptionalNumber(feat.grantedLanguageCount) ?? 0;
  return [...granted, ...(choiceCount > 0 ? [`Обери ще ${choiceCount}`] : [])];
}

export function buildFeatProficiencyLines(feat: FeatTextSource): string[] {
  return [
    formatArmorProficiencies(parseEnumArray(feat.grantedArmorProficiencies, ArmorType)),
    formatToolProficiencies(parseEnumArray(feat.grantedToolProficiencies, ToolCategory), countFeatToolChoices(feat.name)),
    formatWeaponProficiencies(parseWeaponProficiencies(feat.grantedWeaponProficiencies)),
  ].filter((line) => line && line !== EMPTY_FORMATTED);
}
