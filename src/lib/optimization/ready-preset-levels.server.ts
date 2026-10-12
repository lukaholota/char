import "server-only";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getAllClasses } from "@/lib/classesData";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { buildSpellSlug } from "@/lib/spell-link";
import { getAllSpells } from "@/lib/spellsData";
import { buildClassSpellFilters2014, findSchoolLimit2014, findSpellLists2014 } from "@/rules/class-spell-choices-2014";
import { NO_SPELLS } from "@/rules/class-spell-choices-2024";
import { isSpellChoiceCandidate, type SpellChoiceFilter } from "@/rules/spell-choice-filter";
import { findSpellKnowledge2014 } from "@/rules/spell-knowledge-2014";
import type { CreatorContent } from "@/server/db/creator-content-query";
import { collectFeatGrants } from "@/rules/feat-grants";
import { summarizeAssemblyLevels, summarizeClassLevels, type AssemblySummaryLevel } from "./assembly-summary";
import type { AbilityGain, AdvancementAbility, AdvancementChoice } from "./ready-preset-advancements";
import type { ClassOptionPoolEntry, LevelOptionPick } from "./ready-preset-class-options";
import { buildFeatPool, buildFeatPoolEntry } from "./ready-preset-feat-pool";
import { findExecutableLevels, listExecutableSteps } from "./build-executable-levels";
import { findSchoolKey } from "./ready-preset-spells";
import { buildSpellScoreFinder } from "./ready-preset-spell-scores";
import { listSubclassGrantedSpellKeys } from "./progression-granted-spells";
import {
  OPEN_PICK_CATEGORIES, WIZARD_CLASS_KEY, type LevelAdvancement, type LevelClassLevel, type LevelOpenPick, type LevelSpell, type LevelStep, type OpenPickCategory, type ReadyPresetLevels,
} from "./ready-preset-levels";
import type { BuildProgressionStep, BuildRecipe, LevelDecisions } from "./types";

const MAX_CLASS_LEVEL = 20;

type SpellCatalog = { byKey: Map<string, LevelSpell>; all: (LevelSpell & { spellLists: string[] })[] };
type OptionRef = { optionNameEng: string };
type BuildContext = {
  recipe: BuildRecipe;
  content: CreatorContent;
  fullContent: CreatorContent;
  spells: SpellCatalog;
  subclassByClass: Map<string, string>;
  spellPools: Record<string, LevelSpell[]>;
};

const SPELL_KEYS_BY_CATEGORY = { cantrips: "cantripKeys", knownSpells: "knownSpellKeys", spellbook: "spellbookKeys" } as const;

export function buildReadyPresetLevels(recipe: BuildRecipe, content: CreatorContent): ReadyPresetLevels | null {
  const targetLevels = listSelectableTargetLevels(recipe);
  if (!targetLevels.length) return null;

  const context = createBuildContext(recipe, content);
  const rawByLevel = new Map(listExecutableSteps(recipe).map((step) => [step.characterLevel, step]));
  const steps = summarizeAssemblyLevels(recipe, targetLevels[targetLevels.length - 1])
    .map((summary) => buildLevelStep(summary, rawByLevel.get(summary.characterLevel)!, context));
  const openOptionClassKeys = [...new Set(steps.filter((step) => step.optionPick).map((step) => step.classKey))];
  return {
    startingClassKey: recipe.startingClassKey,
    targetLevels,
    steps,
    classLevelsByTarget: Object.fromEntries(targetLevels.map((level) => [level, listClassLevels(recipe, level)])),
    spellPools: context.spellPools,
    featPool: buildFeatPool(content.feats),
    classOptionPools: Object.fromEntries(openOptionClassKeys.map((classKey) => [classKey, buildClassOptionPool(context.fullContent, classKey)])),
    wizardSpellScores: hasWizardLevels(recipe, steps) ? buildWizardSpellScores(context.spells.all) : {},
  };
}

function hasWizardLevels(recipe: BuildRecipe, steps: LevelStep[]): boolean {
  return recipe.startingClassKey === WIZARD_CLASS_KEY || steps.some((step) => step.classKey === WIZARD_CLASS_KEY);
}

function buildWizardSpellScores(spells: readonly LevelSpell[]): Record<string, number> {
  const findScore = buildSpellScoreFinder(WIZARD_CLASS_KEY, null);
  return Object.fromEntries(spells.flatMap((spell) => {
    const score = findScore(spell.engName);
    return score === undefined ? [] : [[spell.key, score]];
  }));
}

function listSelectableTargetLevels(recipe: BuildRecipe): number[] {
  const executable = new Set(findExecutableLevels(recipe));
  return recipe.supportedLevels.filter((level) => level > 1 && executable.has(level)).sort((first, second) => first - second);
}

function createBuildContext(recipe: BuildRecipe, content: CreatorContent): BuildContext {
  const startingStep = recipe.progression.find((step) => step.characterLevel === 1);
  return {
    recipe, content, fullContent: findCharacterCreatorOptions(recipe.ruleset), spells: buildSpellCatalog(),
    subclassByClass: startingStep?.subclassKey ? new Map([[startingStep.classKey, startingStep.subclassKey]]) : new Map(),
    spellPools: {},
  };
}

function buildSpellCatalog(): SpellCatalog {
  const all = getAllSpells("RULES_2014").map((spell) => ({
    key: buildSpellSlug(spell.engName), spellId: spell.spellId, name: spell.name, engName: spell.engName, level: spell.level, school: findSchoolKey(spell.school) ?? undefined, spellLists: spell.spellClasses.map((entry) => entry.className),
  }));
  return { all, byKey: new Map(all.map((spell) => [spell.key, toLevelSpell(spell)])) };
}

function toLevelSpell({ key, spellId, name, engName, level }: LevelSpell): LevelSpell {
  return { key, spellId, name, engName, level };
}

function toSchoolLevelSpell({ key, spellId, name, engName, level, school }: LevelSpell): LevelSpell {
  return { key, spellId, name, engName, level, school };
}

function withSpellScore(findScore: (spellEngName: string) => number | undefined) {
  return (spell: LevelSpell): LevelSpell => {
    const score = findScore(spell.engName);
    return score === undefined ? spell : { ...spell, score };
  };
}

function listClassLevels(recipe: BuildRecipe, targetLevel: number): LevelClassLevel[] {
  return summarizeClassLevels(recipe, targetLevel).map((entry) => ({ className: translateValue(entry.classKey), classLevel: entry.classLevel }));
}

function buildLevelStep(summary: AssemblySummaryLevel, raw: BuildProgressionStep, context: BuildContext): LevelStep {
  const decisions = raw.decisions ?? {};
  const subclassKey = raw.subclassKey ?? context.subclassByClass.get(raw.classKey) ?? null;
  const step: LevelStep = {
    characterLevel: summary.characterLevel,
    classKey: summary.classKey,
    className: translateValue(summary.classKey),
    classLevel: summary.classLevel,
    isMulticlassEntry: summary.isMulticlassEntry,
    subclassName: summary.subclassKey ? findSubclassName(summary.classKey, summary.subclassKey) : null,
    featName: summary.featKey ? translateValue(summary.featKey) : null,
    featKey: summary.featKey,
    optionNames: listOptionNames(decisions.openClassOptions ? { ...decisions, classOptions: undefined } : decisions, summary.classKey, subclassKey, context.content),
    abilityIncreases: (decisions.abilityScoreIncrease ?? []).map((increase) => ({ ability: increase.ability, amount: increase.amount })),
    fixedGains: decisions.openAdvancement ? [] : listFixedGains(decisions, context.content),
    advancement: decisions.openAdvancement ? buildAdvancement(decisions, raw, context.content) : null,
    classOptionNames: (decisions.classOptions ?? []).map((ref) => ref.optionNameEng),
    replacedOptions: (decisions.replaceOptions ?? []).map((entry) => ({ drop: entry.drop.optionNameEng, add: entry.add.optionNameEng })),
    optionPick: decisions.openClassOptions ? buildOptionPick(decisions, raw, context.fullContent) : null,
    newSpells: buildNewSpells(decisions, context.spells),
    openPicks: buildOpenPicks(decisions, raw, subclassKey, context),
  };
  if (raw.subclassKey) context.subclassByClass.set(raw.classKey, raw.subclassKey);
  return step;
}

function buildClassOptionPool(content: CreatorContent, classKey: string): ClassOptionPoolEntry[] {
  const characterClass = content.classes.find((entry) => entry.name === classKey);
  return (characterClass?.classChoiceOptions ?? []).map((row) => ({
    id: row.choiceOptionId, nameEng: row.choiceOption.optionNameEng, name: row.choiceOption.optionName, groupName: row.choiceOption.groupName ?? "",
    levelsGranted: row.levelsGranted, prerequisites: row.choiceOption.prerequisites ?? null,
  }));
}

function buildOptionPick(decisions: LevelDecisions, step: BuildProgressionStep, content: CreatorContent): LevelOptionPick {
  const pool = buildClassOptionPool(content, step.classKey).filter((entry) => entry.levelsGranted.includes(step.classLevel));
  return {
    defaults: (decisions.classOptions ?? []).map((ref) => {
      const match = pool.find((entry) => entry.nameEng === ref.optionNameEng && (!ref.groupName || entry.groupName === ref.groupName));
      if (!match) throw new Error(`рівень ${step.characterLevel}: немає опції ${ref.optionNameEng} у класу ${step.classKey}`);
      return { nameEng: match.nameEng, groupName: match.groupName };
    }),
  };
}

function listFixedGains(decisions: LevelDecisions, content: CreatorContent): AbilityGain[] {
  const feat = content.feats.find((entry) => entry.name === decisions.featKey);
  const optionIds = (decisions.featOptions ?? []).flatMap((ref) => feat?.featChoiceOptions.filter((row) => row.choiceOption.optionNameEng === ref.optionNameEng).map((row) => row.choiceOptionId) ?? []);
  const fromFeat = feat ? collectFeatGrants(feat, optionIds).abilityIncreases : [];
  const fromScores = (decisions.abilityScoreIncrease ?? []).map((increase) => ({ ability: increase.ability, amount: increase.amount }));
  return [...fromScores, ...fromFeat].map((gain) => ({ ability: gain.ability as AdvancementAbility, amount: gain.amount }));
}

function buildAdvancement(decisions: LevelDecisions, step: BuildProgressionStep, content: CreatorContent): LevelAdvancement {
  const where = `рівень ${step.characterLevel}`;
  if (decisions.featKey) {
    const feat = content.feats.find((entry) => entry.name === decisions.featKey);
    if (!feat) throw new Error(`${where}: немає риси ${decisions.featKey}`);
    if ((decisions.featOptions ?? []).length > 1) throw new Error(`${where}: типова риса для вільного вибору має мати не більше одного варіанта`);
    const choice: AdvancementChoice = { kind: "feat", featKey: feat.name, optionNameEng: decisions.featOptions?.[0]?.optionNameEng ?? null };
    return { default: choice, defaultFeat: buildFeatPoolEntry(feat) };
  }
  return { default: { kind: "asi", abilities: readDefaultAbilities(decisions, where) }, defaultFeat: null };
}

function readDefaultAbilities(decisions: LevelDecisions, where: string): [AdvancementAbility, AdvancementAbility] {
  const increases = decisions.abilityScoreIncrease ?? [];
  if (increases.length === 1 && increases[0].amount === 2) return [increases[0].ability, increases[0].ability];
  if (increases.length === 2 && increases.every((increase) => increase.amount === 1)) return [increases[0].ability, increases[1].ability];
  throw new Error(`${where}: типове підвищення має бути +2 до однієї характеристики або +1 до двох`);
}

function findSubclassName(classKey: string, subclassKey: string): string {
  const subclass = getAllClasses("RULES_2014").find((entry) => entry.key === classKey)?.subclasses.find((entry) => entry.key === subclassKey);
  return subclass?.name ?? translateValue(subclassKey);
}

function listOptionNames(decisions: LevelDecisions, classKey: string, subclassKey: string | null, content: CreatorContent): string[] {
  const characterClass = content.classes.find((entry) => entry.name === classKey);
  const subclass = characterClass?.subclasses.find((entry) => entry.name === subclassKey);
  const feat = content.feats.find((entry) => entry.name === decisions.featKey);
  return [
    ...translateOptionNames(decisions.classOptions, characterClass?.classChoiceOptions ?? []),
    ...translateOptionNames(decisions.subclassOptions, subclass?.subclassChoiceOptions ?? []),
    ...translateOptionNames(decisions.featOptions, feat?.featChoiceOptions ?? []),
  ];
}

function translateOptionNames(refs: readonly OptionRef[] | undefined, rows: readonly { choiceOption: { optionNameEng: string; optionName: string } }[]): string[] {
  return (refs ?? []).map((ref) => rows.find((row) => row.choiceOption.optionNameEng === ref.optionNameEng)?.choiceOption.optionName ?? ref.optionNameEng);
}

function buildNewSpells(decisions: LevelDecisions, spells: SpellCatalog): LevelStep["newSpells"] {
  const fixed = decisions.spells;
  return Object.fromEntries(OPEN_PICK_CATEGORIES.map((category) => [
    category, (fixed?.[SPELL_KEYS_BY_CATEGORY[category]] ?? []).map((key) => findCatalogSpell(spells, key)),
  ])) as LevelStep["newSpells"];
}

function findCatalogSpell(spells: SpellCatalog, key: string): LevelSpell {
  const spell = spells.byKey.get(key);
  if (!spell) throw new Error(`Missing ready preset level spell: ${key}`);
  return spell;
}

function buildOpenPicks(decisions: LevelDecisions, step: BuildProgressionStep, subclassKey: string | null, context: BuildContext): LevelOpenPick[] {
  return (decisions.openSpellPicks ?? []).map((pick) => ({
    category: pick.category, count: pick.count, poolId: registerSpellPool(step, pick.category, subclassKey, context),
    ...withSchoolLimit(findSchoolLimitedSubclassKey(step, pick.category, subclassKey)),
  }));
}

function findSchoolLimitedSubclassKey(step: BuildProgressionStep, category: OpenPickCategory, subclassKey: string | null): string | undefined {
  if (category === "cantrips" || !subclassKey) return undefined;
  const limit = findSchoolLimit2014({ caster: { className: step.classKey, subclassName: subclassKey }, classLevel: step.classLevel, ownedOfClass: [] });
  return limit ? subclassKey : undefined;
}

function withSchoolLimit(schoolLimitedSubclassKey: string | undefined): Pick<LevelOpenPick, "schoolLimitedSubclassKey"> {
  return schoolLimitedSubclassKey ? { schoolLimitedSubclassKey } : {};
}

function registerSpellPool(step: BuildProgressionStep, category: OpenPickCategory, subclassKey: string | null, context: BuildContext): string {
  const knowledge = findSpellKnowledge2014(step.classKey, step.classLevel, subclassKey);
  const maxSpellLevel = knowledge?.maxSpellLevel ?? 0;
  const poolId = `${step.classKey}:${subclassKey ?? ""}:${category === "cantrips" ? "cantrips" : "spells"}:${maxSpellLevel}`;
  if (!context.spellPools[poolId]) {
    const filter = findPoolFilter(step.classKey, subclassKey, category, maxSpellLevel);
    const granted = new Set(listSubclassGrantedSpellKeys({ classKey: step.classKey, subclassKey, classLevel: MAX_CLASS_LEVEL }));
    context.spellPools[poolId] = context.spells.all
      .filter((spell) => !granted.has(spell.key) && isSpellChoiceCandidate(filter, { spellId: 0, level: spell.level, school: null, spellLists: spell.spellLists }))
      .sort((first, second) => first.level - second.level || first.name.localeCompare(second.name, "uk"))
      .map(findSchoolLimitedSubclassKey(step, category, subclassKey) ? toSchoolLevelSpell : toLevelSpell)
      .map(withSpellScore(buildSpellScoreFinder(step.classKey, subclassKey)));
  }
  return poolId;
}

function findPoolFilter(classKey: string, subclassKey: string | null, category: OpenPickCategory, maxSpellLevel: number): SpellChoiceFilter {
  const lists = findSpellLists2014({ className: classKey, subclassName: subclassKey });
  const filters = buildClassSpellFilters2014({ lists, quota: { ...NO_SPELLS, maxSpellLevel }, schoolLimit: null });
  return category === "cantrips" ? filters.cantrips : filters.spells;
}
