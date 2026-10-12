import { calculateAbilityModifier } from "@/rules/abilities";
import { findAbilityScoreCeiling, raiseAbilityScore } from "@/rules/ability-score-ceiling";
import { getInitialHitPoints } from "@/rules/character-creation";
import { applyAbilityIncreases, collectFeatGrants } from "@/rules/feat-grants";
import { calculateAverageHitPointIncrease } from "@/rules/health";
import { listSubclassGrantedSpellKeys } from "@/lib/optimization/progression-granted-spells";
import { findRaceSpellOwner, listRaceGrantedSpells } from "@/lib/optimization/progression-race-spells";
import { buildSpellSlug } from "@/lib/spell-link";
import { findSubclassFeatureSpellChoice } from "@/rules/class-option-spell-choices-2024";
import { getMaximumPactSpellSlots, getMaximumStandardSpellSlots } from "@/rules/spellcasting";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import type { CreatorContent } from "@/server/db/creator-content-query";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { AssemblyStep } from "@/lib/optimization/assembly-plan";
import type { OpenSpellKeys } from "@/lib/optimization/progression-walk-types";
import type { ReadyPreset } from "@/lib/optimization/ready-preset";
import type { AbilityKey, AbilityScores, SpellcastingCharacter } from "@/rules/types";
import type { BuildRecipe } from "@/lib/optimization/types";
import { findExpectedAbilityScores } from "./ready-preset-acceptance";

export type ExpectedClassLevel = { classKey: string; classLevel: number; subclassKey: string | null };
export type ExpectedSpell = { key: string; classKey: string; origin: "CLASS" | "RACE"; sourceName: string; isTakenOver: boolean; learnedAtLevel: number };
export type ExpectedFeatureSpell = { key: string; sourceName: string; learnedAtLevel: number };
export type AssemblyExpectation = {
  targetLevel: number;
  classes: ExpectedClassLevel[];
  scores: AbilityScores;
  featKeys: string[];
  choiceOptionIds: number[];
  expertise: string[];
  chosenSpells: ExpectedSpell[];
  featureSpells: ExpectedFeatureSpell[];
  droppedSpellKeys: string[];
  droppedOptionIds: number[];
  hitPoints: { min: number; max: number };
  spellSlots: number[];
  pactSlots: number;
};

export type AssemblyExpectationInput = {
  recipe: BuildRecipe;
  preset: ReadyPreset;
  draft: PersFormData;
  fullContent: CreatorContent;
  creationContent: CreatorContent;
  steps: readonly AssemblyStep[];
  openSelections: readonly OpenSpellKeys[];
  targetLevel: number;
};

const HP_FEATURE_BONUS_PER_LEVEL = 3;

export function buildAssemblyExpectation(input: AssemblyExpectationInput): AssemblyExpectation {
  const classes = buildExpectedClasses(input);
  const startScores = findExpectedAbilityScores(input.draft, input.creationContent);
  const scores = applyStepIncreases(input, startScores);
  return {
    targetLevel: input.targetLevel,
    classes,
    scores,
    featKeys: [...findStartFeatKeys(input), ...collectDecisionValues(input, (decisions) => (decisions.featKey ? [decisions.featKey] : []))],
    choiceOptionIds: buildExpectedChoiceOptionIds(input.steps),
    expertise: [...input.preset.expertise, ...collectDecisionValues(input, (decisions) => decisions.expertise ?? [])],
    chosenSpells: markRuleTakeovers(buildExpectedSpells(input), classes, input),
    featureSpells: buildExpectedFeatureSpells(input),
    droppedSpellKeys: buildDroppedSpellKeys(input),
    droppedOptionIds: buildDroppedOptionIds(input.steps),
    hitPoints: buildHitPointWindow(input, startScores, scores),
    ...buildExpectedSlots(input, classes),
  };
}

function buildExpectedClasses({ recipe, steps, draft, fullContent }: AssemblyExpectationInput): ExpectedClassLevel[] {
  const startSubclass = fullContent.classes.flatMap((entry) => entry.subclasses).find((entry) => entry.subclassId === draft.subclassId)?.name ?? null;
  const classes: ExpectedClassLevel[] = [{ classKey: recipe.startingClassKey, classLevel: 1, subclassKey: startSubclass }];
  for (const step of steps) {
    const recipeStep = recipe.progression.find((entry) => entry.characterLevel === step.characterLevel)!;
    const existing = classes.find((entry) => entry.classKey === step.classKey);
    if (existing) {
      existing.classLevel = step.classLevel;
      existing.subclassKey = recipeStep.subclassKey ?? existing.subclassKey;
    } else {
      classes.push({ classKey: step.classKey, classLevel: step.classLevel, subclassKey: recipeStep.subclassKey ?? null });
    }
  }
  return classes;
}

function collectDecisionValues<T>(input: AssemblyExpectationInput, read: (decisions: NonNullable<BuildRecipe["progression"][number]["decisions"]>) => T[]): T[] {
  return input.steps.flatMap((step) => read(input.recipe.progression.find((entry) => entry.characterLevel === step.characterLevel)?.decisions ?? {}));
}

function findStartFeatKeys({ draft, creationContent }: AssemblyExpectationInput): string[] {
  return creationContent.feats.filter((feat) => feat.featId === draft.featId).map((feat) => feat.name);
}

function flattenSelectionIds(selections: Record<string, number | number[]>): number[] {
  return Object.values(selections).flat();
}

function applyStepIncreases(input: AssemblyExpectationInput, startScores: AbilityScores): AbilityScores {
  const ceiling = findAbilityScoreCeiling({ ruleset: "RULES_2014", source: "STANDARD" });
  let scores = { ...startScores };
  for (const step of input.steps) {
    for (const increase of step.input.customAsi) {
      const ability = increase.ability as AbilityKey;
      scores = { ...scores, [ability]: raiseAbilityScore(scores[ability], Number(increase.value), ceiling) };
    }
    const feat = input.fullContent.feats.find((entry) => entry.featId === step.input.featId);
    if (feat) scores = applyAbilityIncreases(scores, collectFeatGrants(feat, flattenSelectionIds(step.input.featChoiceSelections)).abilityIncreases, ceiling);
  }
  return scores;
}

function buildExpectedChoiceOptionIds(steps: readonly AssemblyStep[]): number[] {
  const optionIds: number[] = [];
  for (const step of steps) {
    optionIds.push(...[step.input.classChoiceSelections, step.input.subclassChoiceSelections, step.input.featChoiceSelections].flatMap(flattenSelectionIds));
    for (const { removeChoiceOptionId, addChoiceOptionId } of Object.values(step.input.classOptionalFeatureReplacementSelections)) {
      optionIds.splice(optionIds.indexOf(removeChoiceOptionId), 1);
      optionIds.push(addChoiceOptionId);
    }
  }
  return optionIds;
}

function buildExpectedSpells(input: AssemblyExpectationInput): ExpectedSpell[] {
  const start = input.recipe.startingClassKey;
  const startKeys = input.preset.spells ? [...input.preset.spells.classCantripKeys, ...input.preset.spells.knownSpellKeys, ...input.preset.spells.spellbookKeys] : [];
  const expected: ExpectedSpell[] = startKeys.map((key) => ({ key, classKey: start, origin: "CLASS", sourceName: start, isTakenOver: false, learnedAtLevel: 1 }));
  for (const step of input.steps) {
    const decisions = input.recipe.progression.find((entry) => entry.characterLevel === step.characterLevel)?.decisions;
    const open = input.openSelections.find((entry) => entry.characterLevel === step.characterLevel);
    const spells = decisions?.spells;
    const keys = [...(spells?.cantripKeys ?? []), ...(spells?.knownSpellKeys ?? []), ...(spells?.spellbookKeys ?? []), ...(open?.cantripKeys ?? []), ...(open?.knownSpellKeys ?? []), ...(open?.spellbookKeys ?? [])];
    expected.push(...keys.map((key) => ({ key, classKey: step.classKey, origin: "CLASS", sourceName: step.classKey, isTakenOver: false, learnedAtLevel: step.characterLevel })));
    if (decisions?.replaceSpell) {
      expected.splice(expected.findIndex((entry) => entry.key === decisions.replaceSpell!.drop), 1);
      expected.push({ key: decisions.replaceSpell.add, classKey: step.classKey, origin: "CLASS", sourceName: step.classKey, isTakenOver: false, learnedAtLevel: step.characterLevel });
    }
  }
  return expected;
}

function markRuleTakeovers(spells: readonly ExpectedSpell[], classes: readonly ExpectedClassLevel[], input: AssemblyExpectationInput): ExpectedSpell[] {
  const raceGrants = listRaceGrantedSpells(findRaceSpellOwner(input.fullContent, input.draft), input.targetLevel);
  return spells.map((spell) => {
    const owner = classes.find((entry) => entry.classKey === spell.classKey);
    if (owner && listSubclassGrantedSpellKeys(owner).includes(spell.key)) return { ...spell, sourceName: owner.subclassKey!, isTakenOver: true };
    const raceGrant = raceGrants.find((grant) => buildSpellSlug(grant.engName) === spell.key);
    return raceGrant ? { ...spell, origin: "RACE", sourceName: raceGrant.sourceKey, isTakenOver: true } : spell;
  });
}

function buildDroppedSpellKeys(input: AssemblyExpectationInput): string[] {
  const kept = new Set(buildExpectedSpells(input).map((spell) => spell.key));
  const dropped = collectDecisionValues(input, (decisions) => (decisions.replaceSpell ? [decisions.replaceSpell.drop] : []));
  return dropped.filter((key) => !kept.has(key));
}

function buildDroppedOptionIds(steps: readonly AssemblyStep[]): number[] {
  const kept = new Set(buildExpectedChoiceOptionIds(steps));
  const dropped = steps.flatMap((step) => Object.values(step.input.classOptionalFeatureReplacementSelections).map((entry) => entry.removeChoiceOptionId));
  return dropped.filter((optionId) => !kept.has(optionId));
}

function buildExpectedFeatureSpells({ recipe, steps, draft, fullContent }: AssemblyExpectationInput): ExpectedFeatureSpell[] {
  const startSubclass = fullContent.classes.flatMap((entry) => entry.subclasses).find((entry) => entry.subclassId === draft.subclassId)?.name ?? null;
  const subclassByClass = new Map<string, string | null>([[recipe.startingClassKey, startSubclass]]);
  return steps.flatMap((step) => {
    const recipeStep = recipe.progression.find((entry) => entry.characterLevel === step.characterLevel)!;
    if (recipeStep.subclassKey) subclassByClass.set(step.classKey, recipeStep.subclassKey);
    const subclassName = subclassByClass.get(step.classKey);
    const choice = subclassName ? findSubclassFeatureSpellChoice({ ruleset: "RULES_2014", subclassName, classLevel: step.classLevel }) : null;
    return (recipeStep.decisions?.classOptionSpellKeys ?? []).map((key) => ({ key, sourceName: choice!.sourceName, learnedAtLevel: step.characterLevel }));
  });
}

function buildHitPointWindow(input: AssemblyExpectationInput, startScores: AbilityScores, finalScores: AbilityScores): { min: number; max: number } {
  const classOf = (classKey: string) => input.fullContent.classes.find((entry) => entry.name === classKey)!;
  const startClass = classOf(input.recipe.startingClassKey);
  const hasTough = input.creationContent.feats.some((feat) => feat.featId === input.draft.featId && feat.name === "TOUGH");
  const startConModifier = calculateAbilityModifier(startScores.CON);
  const averages = input.steps.map((step) => calculateAverageHitPointIncrease(classOf(step.classKey).hitDie));
  const min = getInitialHitPoints(startClass.hitDie, startScores.CON, hasTough) + averages.reduce((sum, average) => sum + average + startConModifier, 0);
  const growth = calculateAbilityModifier(finalScores.CON) - startConModifier + HP_FEATURE_BONUS_PER_LEVEL;
  return { min, max: min + input.targetLevel * growth };
}

function buildExpectedSlots(input: AssemblyExpectationInput, classes: readonly ExpectedClassLevel[]): Pick<AssemblyExpectation, "spellSlots" | "pactSlots"> {
  const describe = (entry: ExpectedClassLevel) => {
    const characterClass = input.fullContent.classes.find((candidate) => candidate.name === entry.classKey)!;
    const subclass = characterClass.subclasses.find((candidate) => candidate.name === entry.subclassKey);
    return { classLevel: entry.classLevel, characterClass: { name: characterClass.name, spellcastingType: characterClass.spellcastingType }, subclass: { spellcastingType: subclass?.spellcastingType } };
  };
  const [main, ...others] = classes.map(describe);
  const character: SpellcastingCharacter = { level: input.targetLevel, characterClass: main.characterClass, subclass: main.subclass, multiclasses: others };
  return {
    spellSlots: getMaximumStandardSpellSlots(character, SPELL_SLOT_PROGRESSION.FULL, "RULES_2014"),
    pactSlots: getMaximumPactSpellSlots(character, SPELL_SLOT_PROGRESSION.PACT, "RULES_2014"),
  };
}
