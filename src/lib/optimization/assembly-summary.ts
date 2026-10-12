import { listExecutableSteps } from "./build-executable-levels";
import type { AssemblyCatalog } from "./assembly-catalog";
import type { BuildProgressionStep, BuildRecipe } from "./types";

export type AssemblySummaryLevel = {
  characterLevel: number;
  classKey: string;
  classLevel: number;
  isMulticlassEntry: boolean;
  subclassKey: string | null;
  featKey: string | null;
  hasAbilityScoreIncrease: boolean;
};
export type AssemblyClassLevel = { classKey: string; classLevel: number };

export function summarizeAssemblyLevels(recipe: BuildRecipe, targetLevel: number): AssemblySummaryLevel[] {
  const owned = new Set([recipe.startingClassKey]);
  return listExecutableSteps(recipe)
    .filter((step) => step.characterLevel <= targetLevel)
    .map((step) => {
      const isMulticlassEntry = !owned.has(step.classKey);
      owned.add(step.classKey);
      return {
        characterLevel: step.characterLevel, classKey: step.classKey, classLevel: step.classLevel, isMulticlassEntry,
        subclassKey: step.subclassKey ?? null, featKey: step.decisions?.featKey ?? null, hasAbilityScoreIncrease: !!step.decisions?.abilityScoreIncrease,
      };
    });
}

export function summarizeClassLevels(recipe: BuildRecipe, targetLevel: number): AssemblyClassLevel[] {
  const levels = new Map<string, number>([[recipe.startingClassKey, 1]]);
  for (const step of summarizeAssemblyLevels(recipe, targetLevel)) levels.set(step.classKey, step.classLevel);
  return [...levels].map(([classKey, classLevel]) => ({ classKey, classLevel }));
}

export type AssemblyLevelChange = {
  characterLevel: number;
  classKey: string;
  classLevel: number;
  isMulticlassEntry: boolean;
  subclassKey: string | null;
  abilityScoreIncrease: { ability: string; amount: number }[];
  featKey: string | null;
  optionNames: string[];
  spellKeys: string[];
  featureSpellKeys: string[];
  replacements: string[];
  openSpellPicks: { category: string; count: number }[];
  expertise: string[];
  skillProficiencies: string[];
  infusions: string[];
  featureNames: string[];
};

export function listAssemblyLevelChanges(recipe: BuildRecipe, targetLevel: number, catalog: AssemblyCatalog): AssemblyLevelChange[] {
  const subclassByClass = new Map<string, string>();
  const startSubclassKey = recipe.progression.find((step) => step.characterLevel === 1)?.subclassKey;
  if (startSubclassKey) subclassByClass.set(recipe.startingClassKey, startSubclassKey);
  return summarizeAssemblyLevels(recipe, targetLevel).map((level) => {
    const step = recipe.progression.find((entry) => entry.characterLevel === level.characterLevel)!;
    if (step.subclassKey) subclassByClass.set(step.classKey, step.subclassKey);
    return toLevelChange(level, step, listLevelFeatureNames(catalog, step, subclassByClass.get(step.classKey) ?? null));
  });
}

function toLevelChange(level: AssemblySummaryLevel, step: BuildProgressionStep, featureNames: string[]): AssemblyLevelChange {
  const decisions = step.decisions ?? {};
  return {
    characterLevel: level.characterLevel, classKey: level.classKey, classLevel: level.classLevel, isMulticlassEntry: level.isMulticlassEntry,
    subclassKey: level.subclassKey, abilityScoreIncrease: (decisions.abilityScoreIncrease ?? []).map((entry) => ({ ability: entry.ability, amount: entry.amount })),
    featKey: level.featKey,
    optionNames: [...(decisions.featOptions ?? []), ...(decisions.classOptions ?? []), ...(decisions.subclassOptions ?? [])].map((ref) => ref.optionNameEng),
    spellKeys: [...(decisions.spells?.cantripKeys ?? []), ...(decisions.spells?.knownSpellKeys ?? []), ...(decisions.spells?.spellbookKeys ?? [])],
    featureSpellKeys: decisions.classOptionSpellKeys ?? [],
    replacements: describeReplacements(decisions),
    openSpellPicks: (decisions.openSpellPicks ?? []).map((pick) => ({ category: pick.category, count: pick.count })),
    expertise: decisions.expertise ?? [], skillProficiencies: [...(decisions.skillProficiencies ?? []), ...(decisions.multiclassSkills ?? [])], infusions: decisions.infusions ?? [], featureNames,
  };
}

function listLevelFeatureNames(catalog: AssemblyCatalog, step: BuildProgressionStep, subclassKey: string | null): string[] {
  const characterClass = catalog.classes.find((entry) => entry.key === step.classKey);
  const subclass = characterClass?.subclasses.find((entry) => entry.key === subclassKey);
  return [...(characterClass?.features ?? []), ...(subclass?.features ?? [])].filter((feature) => feature.levelGranted === step.classLevel).map((feature) => feature.engName);
}

function describeReplacements(decisions: NonNullable<BuildProgressionStep["decisions"]>): string[] {
  const spell = decisions.replaceSpell ? [`${decisions.replaceSpell.drop} → ${decisions.replaceSpell.add}`] : [];
  return [...spell, ...(decisions.replaceOptions ?? []).map((entry) => `${entry.drop.optionNameEng} → ${entry.add.optionNameEng}`)];
}
