import type { ArmorType, Language, Prisma, Subclasses, ToolCategory } from "@prisma/client";
import { shiftLegacyLevel, shiftLegacyLevels } from "../../../src/rules/legacy-subclasses-2024";

export type LegacyFeatureLink = { featureId: number; engName: string; levelGranted: number; grantsSpellSlots: boolean };
export type LegacyChoiceOptionLink = { choiceOptionId: number; levelsGranted: number[] };
export type LegacySpellLink = { spellId: number; classLevel: number };

export type LegacySubclassColumns = {
  description: string | null;
  languages: Language[];
  languagesToChooseCount: number;
  toolProficiencies: ToolCategory[];
  toolToChooseCount: number | null;
  armorProficiencies: ArmorType[];
  weaponProficiencies: Prisma.JsonValue | null;
};

export type LegacySubclassSource = LegacySubclassColumns & {
  subclass: Subclasses;
  features: LegacyFeatureLink[];
  choiceOptions: LegacyChoiceOptionLink[];
  spells: LegacySpellLink[];
};

export type LegacySubclassRow = LegacySubclassColumns & {
  name: Subclasses;
  ruleset: "RULES_2024";
  spellcastingType: "NONE";
  grantsSpells: false;
  primaryCastingStat: null;
};

export type LegacySubclassLinks = {
  features: LegacyFeatureLink[];
  choiceOptions: LegacyChoiceOptionLink[];
  spells: LegacySpellLink[];
};

export type LegacySubclassPlan = LegacySubclassLinks & { class2024: string; row: LegacySubclassRow };

/** Риса 2014 зі списком заклинань 2014 міняється на рису легасі-рядка зі списком 2024 (KR43.5). */
export type ExpandedSpellsReplacement = { replaces: string; featureId: number; engName: string };

export type StoredLegacySubclassRow = LegacySubclassColumns & {
  name: Subclasses;
  ruleset: string;
  spellcastingType: string;
  grantsSpells: boolean;
  primaryCastingStat: string | null;
};

export type StoredLegacySubclass = LegacySubclassLinks & { row: StoredLegacySubclassRow };

export type LinkDiff<T> = { upsert: T[]; remove: T[] };

export type LegacySubclassDiff = {
  row: "create" | "update" | null;
  features: LinkDiff<LegacyFeatureLink>;
  choiceOptions: LinkDiff<LegacyChoiceOptionLink>;
  spells: LinkDiff<LegacySpellLink>;
};

export function planLegacySubclass(
  source: LegacySubclassSource,
  class2024: string,
  subclassLevel2024: number,
  expandedSpells: ExpandedSpellsReplacement | null = null,
): LegacySubclassPlan {
  return {
    class2024,
    row: buildLegacyRow(source),
    features: replaceExpandedSpellsFeature(buildLegacyFeatures(source.features, subclassLevel2024), expandedSpells, subclassLevel2024),
    choiceOptions: source.choiceOptions.map((option) => ({
      choiceOptionId: option.choiceOptionId,
      levelsGranted: shiftLegacyLevels(option.levelsGranted, subclassLevel2024),
    })),
    spells: source.spells.map((spell) => ({ spellId: spell.spellId, classLevel: shiftLegacyLevel(spell.classLevel, subclassLevel2024) })),
  };
}

export function diffLegacySubclass(plan: LegacySubclassPlan, stored: StoredLegacySubclass | null): LegacySubclassDiff {
  return {
    row: findRowChange(plan.row, stored?.row ?? null),
    features: diffLinks(plan.features, stored?.features ?? [], (link) => link.featureId),
    choiceOptions: diffLinks(plan.choiceOptions, stored?.choiceOptions ?? [], (link) => link.choiceOptionId),
    spells: diffLinks(plan.spells, stored?.spells ?? [], (link) => link.spellId),
  };
}

export function isLegacySubclassDiffEmpty(diff: LegacySubclassDiff): boolean {
  return (
    diff.row === null &&
    [diff.features, diff.choiceOptions, diff.spells].every((links) => links.upsert.length === 0 && links.remove.length === 0)
  );
}

function buildLegacyRow(source: LegacySubclassSource): LegacySubclassRow {
  return {
    name: source.subclass,
    ruleset: "RULES_2024",
    spellcastingType: "NONE",
    grantsSpells: false,
    primaryCastingStat: null,
    description: source.description,
    languages: source.languages,
    languagesToChooseCount: source.languagesToChooseCount,
    toolProficiencies: source.toolProficiencies,
    toolToChooseCount: source.toolToChooseCount,
    armorProficiencies: source.armorProficiencies,
    weaponProficiencies: source.weaponProficiencies,
  };
}

function buildLegacyFeatures(features: LegacySubclassSource["features"], subclassLevel2024: number): LegacyFeatureLink[] {
  return features.map((feature) => ({
    featureId: feature.featureId,
    engName: feature.engName,
    levelGranted: shiftLegacyLevel(feature.levelGranted, subclassLevel2024),
    grantsSpellSlots: feature.grantsSpellSlots,
  }));
}

function replaceExpandedSpellsFeature(
  features: LegacyFeatureLink[],
  expandedSpells: ExpandedSpellsReplacement | null,
  subclassLevel2024: number,
): LegacyFeatureLink[] {
  if (!expandedSpells) return features;
  if (!features.some((feature) => feature.engName === expandedSpells.replaces)) {
    throw new Error(`${expandedSpells.replaces}: такої риси в підкласу 2014 немає — нема чого замінювати`);
  }
  return [
    ...features.filter((feature) => feature.engName !== expandedSpells.replaces),
    { featureId: expandedSpells.featureId, engName: expandedSpells.engName, levelGranted: subclassLevel2024, grantsSpellSlots: false },
  ];
}

function findRowChange(planned: LegacySubclassRow, stored: StoredLegacySubclassRow | null): LegacySubclassDiff["row"] {
  if (stored === null) return "create";
  return isSameValue(planned, stored) ? null : "update";
}

function diffLinks<T>(planned: readonly T[], stored: readonly T[], keyOf: (link: T) => number): LinkDiff<T> {
  const storedByKey = new Map(stored.map((link) => [keyOf(link), link]));
  const plannedKeys = new Set(planned.map(keyOf));
  return {
    upsert: planned.filter((link) => !isSameValue(link, storedByKey.get(keyOf(link)))),
    remove: stored.filter((link) => !plannedKeys.has(keyOf(link))),
  };
}

function isSameValue(left: unknown, right: unknown): boolean {
  return toStableJson(left) === toStableJson(right);
}

function toStableJson(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner !== null && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a.localeCompare(b)))
      : inner,
  );
}
