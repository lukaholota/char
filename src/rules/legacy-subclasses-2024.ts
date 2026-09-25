import registry from "../../data/2024/legacy-subclasses.json";

export type LegacySubclass2024 = { class2014: string; class2024: string; subclass: string; source: string };

export const LEGACY_SUBCLASSES_2024: readonly LegacySubclass2024[] = registry.subclasses;

const SPELL_RENAMES_2014_TO_2024: Readonly<Record<string, string>> = registry.spellRenames2014To2024;

export function findLegacySubclass2024(class2024: string, subclass: string): LegacySubclass2024 | null {
  return LEGACY_SUBCLASSES_2024.find((entry) => entry.class2024 === class2024 && entry.subclass === subclass) ?? null;
}

export function isLegacySubclass2024(class2024: string, subclass: string): boolean {
  return findLegacySubclass2024(class2024, subclass) !== null;
}

// O43: так 5etools будує XPHB-копії старих підкласів — риса нижче рівня підкласу 2024 приходить на ньому.
export function shiftLegacyLevel(levelIn2014: number, subclassLevel2024: number): number {
  return Math.max(levelIn2014, subclassLevel2024);
}

export function shiftLegacyLevels(levels: readonly number[], subclassLevel2024: number): number[] {
  const shifted = levels.map((level) => shiftLegacyLevel(level, subclassLevel2024));
  return [...new Set(shifted)].sort((a, b) => a - b);
}

export function findSpellEngName2024(engName2014: string): string {
  return SPELL_RENAMES_2014_TO_2024[engName2014] ?? engName2014;
}
