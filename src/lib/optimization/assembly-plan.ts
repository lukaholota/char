import { levelUpInputSchema, type LevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import { MULTICLASS_SKILL_SELECTION_KEY } from "@/rules/multiclass-skill-choice";
import { findExecutableLevels, listExecutableSteps } from "./build-executable-levels";
import { findSimilarKeysBySeparator } from "./build-similar-keys";
import { resolveOptionReplacements } from "./assembly-replacements";
import type { AssemblyCatalog, AssemblyChoiceOption, AssemblyClass, AssemblySubclass } from "./assembly-catalog";
import type { BuildProgressionStep, BuildRecipe, LevelDecisions, OptimizationRuleset } from "./types";

export type OpenSpellSelection = { characterLevel: number; cantripKeys?: string[]; knownSpellKeys?: string[]; spellbookKeys?: string[] };
export type OpenAdvancementSelection = {
  characterLevel: number;
  featKey?: string;
  featOptions?: { optionNameEng: string }[];
  abilityScoreIncrease?: { ability: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"; amount: 1 | 2 }[];
};
export type OpenClassOptionSelection = { characterLevel: number; classOptions: { optionNameEng: string; groupName?: string }[] };
export type AssemblyIssue = { characterLevel: number | null; code: string; message: string; hint?: string };
export type AssemblyStep = { characterLevel: number; classKey: string; classLevel: number; isMulticlassEntry: boolean; input: LevelUpInput };
export type AssemblyPlan = {
  buildId: string;
  revisionId: string;
  ruleset: OptimizationRuleset;
  targetLevel: number;
  steps: AssemblyStep[];
  preparedSpellIds: number[] | null;
};
export type AssemblyPlanInput = {
  recipe: BuildRecipe;
  targetLevel: number;
  catalog: AssemblyCatalog;
  openSelections?: readonly OpenSpellSelection[];
  openAdvancements?: readonly OpenAdvancementSelection[];
  openClassOptions?: readonly OpenClassOptionSelection[];
  preparedSpellKeys?: readonly string[];
};
export type AssemblyPlanResult = { plan: AssemblyPlan; issues: [] } | { plan: null; issues: AssemblyIssue[] };

type Selections = Record<string, number | number[]>;
type PlanContext = {
  catalog: AssemblyCatalog;
  ownedClassKeys: Set<string>;
  subclassByClass: Map<string, string>;
  issues: AssemblyIssue[];
};
type SpellCategory = "cantrips" | "knownSpells" | "spellbook";
const SPELL_CATEGORIES: readonly SpellCategory[] = ["cantrips", "knownSpells", "spellbook"];

export function buildAssemblyPlan(input: AssemblyPlanInput): AssemblyPlanResult {
  const { recipe, targetLevel } = input;
  const levelIssue = findTargetLevelIssue(recipe, targetLevel);
  if (levelIssue) return { plan: null, issues: [levelIssue] };

  const steps = listExecutableSteps(recipe).filter((step) => step.characterLevel <= targetLevel);
  const context: PlanContext = { catalog: input.catalog, ownedClassKeys: new Set([recipe.startingClassKey]), subclassByClass: seedStartingSubclass(recipe), issues: [] };
  const selections = input.openSelections ?? [];
  const advancements = input.openAdvancements ?? [];
  const optionChoices = input.openClassOptions ?? [];
  context.issues.push(...findUnusedSelectionIssues(selections, steps), ...findAdvancementIssues(advancements, steps), ...findClassOptionIssues(optionChoices, steps));
  const assembled = steps.map((step) => buildAssemblyStep(step, {
    selection: selections.find((entry) => entry.characterLevel === step.characterLevel),
    advancement: advancements.find((entry) => entry.characterLevel === step.characterLevel),
    classOptions: optionChoices.find((entry) => entry.characterLevel === step.characterLevel),
  }, context));
  const preparedSpellIds = resolveSpellKeys(input.preparedSpellKeys ?? [], null, context);

  if (context.issues.length) return { plan: null, issues: context.issues };
  return { plan: { buildId: recipe.buildId, revisionId: recipe.revisionId, ruleset: recipe.ruleset, targetLevel, steps: assembled, preparedSpellIds: input.preparedSpellKeys?.length ? preparedSpellIds : null }, issues: [] };
}

export type LiveClassContext = { ownedClassKeys: ReadonlySet<string>; subclassByClass: ReadonlyMap<string, string> };

export function buildSingleAssemblyStep(step: BuildProgressionStep, catalog: AssemblyCatalog, live: LiveClassContext): { step: AssemblyStep; issues: AssemblyIssue[] } {
  const context: PlanContext = { catalog, ownedClassKeys: new Set(live.ownedClassKeys), subclassByClass: new Map(live.subclassByClass), issues: [] };
  return { step: buildAssemblyStep(step, {}, context), issues: context.issues };
}

export function listOpenSpellChoices(recipe: BuildRecipe, targetLevel: number) {
  return listExecutableSteps(recipe)
    .filter((step) => step.characterLevel <= targetLevel)
    .flatMap((step) => (step.decisions?.openSpellPicks ?? []).map((pick) => ({ characterLevel: step.characterLevel, classKey: step.classKey, category: pick.category, count: pick.count })));
}

function findTargetLevelIssue(recipe: BuildRecipe, targetLevel: number): AssemblyIssue | null {
  if (!Number.isInteger(targetLevel) || !recipe.supportedLevels.includes(targetLevel)) {
    return { characterLevel: targetLevel, code: "level-not-supported", message: `Рівень ${targetLevel} не підтримано цим білдом` };
  }
  if (!findExecutableLevels(recipe).includes(targetLevel)) return { characterLevel: targetLevel, code: "level-not-executable", message: `Рівень ${targetLevel} не має виконуваного плану` };
  return null;
}

function seedStartingSubclass(recipe: BuildRecipe): Map<string, string> {
  const startingStep = recipe.progression.find((step) => step.characterLevel === 1);
  return startingStep?.subclassKey ? new Map([[startingStep.classKey, startingStep.subclassKey]]) : new Map();
}

function findUnusedSelectionIssues(selections: readonly OpenSpellSelection[], steps: readonly BuildProgressionStep[]): AssemblyIssue[] {
  const levels = new Set(steps.map((step) => step.characterLevel));
  const duplicated = selections.filter((entry, index) => selections.findIndex((other) => other.characterLevel === entry.characterLevel) !== index);
  return [...selections.filter((entry) => !levels.has(entry.characterLevel)), ...duplicated]
    .map((entry) => ({ characterLevel: entry.characterLevel, code: "selection-without-step", message: `Вибір для рівня ${entry.characterLevel} не належить плану` }));
}

function findAdvancementIssues(advancements: readonly OpenAdvancementSelection[], steps: readonly BuildProgressionStep[]): AssemblyIssue[] {
  const openLevels = new Set(steps.filter((step) => step.decisions?.openAdvancement).map((step) => step.characterLevel));
  const duplicated = advancements.filter((entry, index) => advancements.findIndex((other) => other.characterLevel === entry.characterLevel) !== index);
  return [...advancements.filter((entry) => !openLevels.has(entry.characterLevel)), ...duplicated]
    .map((entry) => ({ characterLevel: entry.characterLevel, code: "advancement-not-open", message: `Рівень ${entry.characterLevel}: автор уже назвав риси або підвищення, їх не можна змінювати` }));
}

function findClassOptionIssues(choices: readonly OpenClassOptionSelection[], steps: readonly BuildProgressionStep[]): AssemblyIssue[] {
  const openLevels = new Set(steps.filter((step) => step.decisions?.openClassOptions).map((step) => step.characterLevel));
  const duplicated = choices.filter((entry, index) => choices.findIndex((other) => other.characterLevel === entry.characterLevel) !== index);
  return [...choices.filter((entry) => !openLevels.has(entry.characterLevel)), ...duplicated]
    .map((entry) => ({ characterLevel: entry.characterLevel, code: "class-options-not-open", message: `Рівень ${entry.characterLevel}: автор уже назвав ці вибори, їх не можна змінювати` }));
}

type OpenChoices = { selection?: OpenSpellSelection; advancement?: OpenAdvancementSelection; classOptions?: OpenClassOptionSelection };

function chooseDecisions(step: BuildProgressionStep, choices: OpenChoices): LevelDecisions {
  const decisions = step.decisions ?? {};
  const { advancement, classOptions } = choices;
  const withAdvancement = decisions.openAdvancement && advancement
    ? { ...omitKeys(decisions, ["featKey", "featOptions", "abilityScoreIncrease"]), featKey: advancement.featKey, featOptions: advancement.featOptions, abilityScoreIncrease: advancement.abilityScoreIncrease }
    : decisions;
  return decisions.openClassOptions && classOptions ? { ...withAdvancement, classOptions: classOptions.classOptions } : withAdvancement;
}

function omitKeys<Value extends object>(value: Value, keys: readonly (keyof Value)[]): Partial<Value> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key as keyof Value))) as Partial<Value>;
}

function buildAssemblyStep(step: BuildProgressionStep, choices: OpenChoices, context: PlanContext): AssemblyStep {
  const characterClass = findClass(step, context);
  const isMulticlassEntry = !context.ownedClassKeys.has(step.classKey);
  const input = buildLevelUpInput(step, chooseDecisions(step, choices), choices.selection, characterClass, context);
  context.ownedClassKeys.add(step.classKey);
  if (step.subclassKey) context.subclassByClass.set(step.classKey, step.subclassKey);
  return { characterLevel: step.characterLevel, classKey: step.classKey, classLevel: step.classLevel, isMulticlassEntry, input: { ...input, levelUpPath: isMulticlassEntry ? "MULTICLASS" : "EXISTING" } };
}

function buildLevelUpInput(step: BuildProgressionStep, decisions: LevelDecisions, selection: OpenSpellSelection | undefined, characterClass: AssemblyClass | undefined, context: PlanContext): LevelUpInput {
  const subclassKey = step.subclassKey ?? context.subclassByClass.get(step.classKey);
  const subclass = subclassKey ? findSubclass(characterClass, subclassKey, step, context) : undefined;
  const feat = decisions.featKey ? findFeat(decisions.featKey, step, context) : undefined;
  return levelUpInputSchema.parse({
    classId: characterClass?.id,
    ...(step.subclassKey && subclass ? { subclassId: subclass.id } : {}),
    customAsi: (decisions.abilityScoreIncrease ?? []).map((increase) => ({ ability: increase.ability, value: increase.amount })),
    ...(feat ? { featId: feat.id } : {}),
    featChoiceSelections: resolveChoiceSelections(decisions.featOptions, feat?.choiceOptions ?? [], null, step, context),
    classChoiceSelections: resolveChoiceSelections(decisions.classOptions, characterClass?.choiceOptions ?? [], step.classLevel, step, context),
    subclassChoiceSelections: resolveChoiceSelections(decisions.subclassOptions, subclass?.choiceOptions ?? [], step.classLevel, step, context),
    classSpells: resolveClassSpells(decisions, selection, step, context),
    ...resolveOptionReplacementSelections(decisions, characterClass, step, context),
    ...(decisions.classOptionSpellKeys ? { classOptionSpellIds: resolveSpellKeys(decisions.classOptionSpellKeys, step, context) } : {}),
    ...(decisions.expertise ? { expertiseSchema: { expertises: decisions.expertise } } : {}),
    levelUpSkillSelections: { ...resolveSkillChoices(decisions.skillProficiencies, characterClass, subclass, step, context), ...resolveMulticlassSkillChoice(decisions.multiclassSkills) },
    ...(decisions.infusions ? { infusionSelections: resolveInfusionIds(decisions.infusions, step, context) } : {}),
  });
}

function resolveInfusionIds(names: readonly string[], step: BuildProgressionStep, context: PlanContext): number[] {
  return names.flatMap((name) => {
    const infusion = context.catalog.infusions.find((entry) => entry.engName === name);
    if (!infusion) reportIssue(context, step, "unknown-infusion", `Немає вливання ${name}`, listSimilarKeys(name, context.catalog.infusions.map((entry) => entry.engName), " "));
    return infusion ? [infusion.id] : [];
  });
}

function resolveSkillChoices(skills: readonly string[] | undefined, characterClass: AssemblyClass | undefined, subclass: AssemblySubclass | undefined, step: BuildProgressionStep, context: PlanContext): Record<string, string[]> {
  if (!skills) return {};
  const features = [...(characterClass?.features ?? []), ...(subclass?.features ?? [])]
    .filter((feature) => feature.levelGranted === step.classLevel && feature.skillChoice);
  if (features.length !== 1) {
    reportIssue(context, step, "skill-choice-feature", `Рівень ${step.characterLevel}: вибір навичок очікує рівно одну здібність із вибором навичок, а їх ${features.length}`);
    return {};
  }
  return { [String(features[0].featureId)]: [...skills] };
}

function resolveMulticlassSkillChoice(skills: readonly string[] | undefined): Record<string, string[]> {
  return skills ? { [MULTICLASS_SKILL_SELECTION_KEY]: [...skills] } : {};
}

function findClass(step: BuildProgressionStep, context: PlanContext): AssemblyClass | undefined {
  const characterClass = context.catalog.classes.find((entry) => entry.key === step.classKey);
  if (!characterClass) reportIssue(context, step, "unknown-class", `Немає класу ${step.classKey}`, listSimilarKeys(step.classKey, context.catalog.classes.map((entry) => entry.key), "_"));
  return characterClass;
}

function findSubclass(characterClass: AssemblyClass | undefined, subclassKey: string, step: BuildProgressionStep, context: PlanContext) {
  const subclass = characterClass?.subclasses.find((entry) => entry.key === subclassKey);
  if (characterClass && !subclass) reportIssue(context, step, "unknown-subclass", `Клас ${step.classKey} не має підкласу ${subclassKey}`, `Підкласи: ${characterClass.subclasses.map((entry) => entry.key).join(", ")}`);
  return subclass;
}

function findFeat(featKey: string, step: BuildProgressionStep, context: PlanContext) {
  const feat = context.catalog.feats.find((entry) => entry.key === featKey);
  if (!feat) reportIssue(context, step, "unknown-feat", `Немає риси ${featKey}`, listSimilarKeys(featKey, context.catalog.feats.map((entry) => entry.key), "_"));
  return feat;
}

function resolveChoiceSelections(
  refs: LevelDecisions["classOptions"],
  options: readonly AssemblyChoiceOption[],
  classLevel: number | null,
  step: BuildProgressionStep,
  context: PlanContext,
): Selections {
  const available = classLevel === null ? options : options.filter((option) => option.levelsGranted.includes(classLevel));
  const idsByGroup = new Map<string, number[]>();
  for (const ref of refs ?? []) {
    const matches = available.filter((option) => option.nameEng === ref.optionNameEng && (!ref.groupName || option.groupName === ref.groupName));
    if (matches.length !== 1) {
      reportIssue(context, step, "unresolved-option", `Опція «${ref.optionNameEng}» ${matches.length ? "неоднозначна" : "недоступна"} на рівні ${step.characterLevel}`, describeAvailableOptions(matches.length ? matches : available));
      continue;
    }
    idsByGroup.set(matches[0].groupName, [...(idsByGroup.get(matches[0].groupName) ?? []), matches[0].id]);
  }
  return Object.fromEntries([...idsByGroup].map(([groupName, ids]) => [groupName, ids.length === 1 ? ids[0] : ids]));
}

function resolveOptionReplacementSelections(decisions: LevelDecisions, characterClass: AssemblyClass | undefined, step: BuildProgressionStep, context: PlanContext): Partial<LevelUpInput> {
  if (!decisions.replaceOptions) return {};
  const { replacements, problems } = resolveOptionReplacements(characterClass, step.classLevel, decisions.replaceOptions);
  problems.forEach((problem) => reportIssue(context, step, "unresolved-replacement", problem));
  return {
    classOptionalFeatureSelections: Object.fromEntries(replacements.map((entry) => [String(entry.optionalFeatureId), true])),
    classOptionalFeatureReplacementSelections: Object.fromEntries(replacements.map((entry) => [String(entry.optionalFeatureId), { removeChoiceOptionId: entry.remove.id, addChoiceOptionId: entry.add.id }])),
  };
}

function resolveSpellSwap(decisions: LevelDecisions, step: BuildProgressionStep, context: PlanContext): { dropId: number; addId: number } | null {
  if (!decisions.replaceSpell) return null;
  const [dropId, addId] = resolveSpellKeys([decisions.replaceSpell.drop, decisions.replaceSpell.add], step, context);
  return dropId === undefined || addId === undefined ? null : { dropId, addId };
}

function resolveClassSpells(decisions: LevelDecisions, selection: OpenSpellSelection | undefined, step: BuildProgressionStep, context: PlanContext): LevelUpInput["classSpells"] | undefined {
  const swap = resolveSpellSwap(decisions, step, context);
  if (!decisions.spells && !decisions.openSpellPicks) {
    if (selection) reportIssue(context, step, "override-not-allowed", `Рівень ${step.characterLevel} не залишає відкритих виборів заклинань`);
    return swap ? { cantripIds: [], preparedIds: [], spellbookIds: [], preparedSwap: swap } : undefined;
  }
  const idsByCategory = Object.fromEntries(SPELL_CATEGORIES.map((category) => [category, collectCategorySpellIds(category, decisions, selection, step, context)])) as Record<SpellCategory, number[]>;
  const allIds = Object.values(idsByCategory).flat();
  if (new Set(allIds).size !== allIds.length) reportIssue(context, step, "duplicate-spell", "Заклинання обрано двічі");
  return { cantripIds: idsByCategory.cantrips, preparedIds: idsByCategory.knownSpells, spellbookIds: idsByCategory.spellbook, ...(swap ? { preparedSwap: swap } : {}) };
}

function collectCategorySpellIds(category: SpellCategory, decisions: LevelDecisions, selection: OpenSpellSelection | undefined, step: BuildProgressionStep, context: PlanContext): number[] {
  const fixedKeys = readFixedKeys(category, decisions);
  const providedKeys = readProvidedKeys(category, selection);
  const openCount = decisions.openSpellPicks?.find((pick) => pick.category === category)?.count ?? 0;
  if (providedKeys.length !== openCount) {
    const code = openCount === 0 ? "override-not-allowed" : "unresolved-choice";
    reportIssue(context, step, code, `Рівень ${step.characterLevel}: для «${category}» потрібно обрати ${openCount}, отримано ${providedKeys.length}`);
  }
  return resolveSpellKeys([...fixedKeys, ...providedKeys], step, context);
}

function readFixedKeys(category: SpellCategory, decisions: LevelDecisions): readonly string[] {
  if (category === "cantrips") return decisions.spells?.cantripKeys ?? [];
  if (category === "knownSpells") return decisions.spells?.knownSpellKeys ?? [];
  return decisions.spells?.spellbookKeys ?? [];
}

function readProvidedKeys(category: SpellCategory, selection: OpenSpellSelection | undefined): readonly string[] {
  if (category === "cantrips") return selection?.cantripKeys ?? [];
  if (category === "knownSpells") return selection?.knownSpellKeys ?? [];
  return selection?.spellbookKeys ?? [];
}

function resolveSpellKeys(keys: readonly string[], step: BuildProgressionStep | null, context: PlanContext): number[] {
  return keys.flatMap((key) => {
    const spellId = context.catalog.spellIdsByKey.get(key);
    if (spellId === undefined) {
      const hint = listSimilarKeys(key, [...context.catalog.spellIdsByKey.keys()], "-");
      context.issues.push({ characterLevel: step?.characterLevel ?? null, code: "unknown-spell", message: `Немає заклинання ${key}`, ...(hint ? { hint } : {}) });
      return [];
    }
    return [spellId];
  });
}

function reportIssue(context: PlanContext, step: BuildProgressionStep, code: string, message: string, hint?: string): void {
  context.issues.push({ characterLevel: step.characterLevel, code, message, ...(hint ? { hint } : {}) });
}

function listSimilarKeys(key: string, available: readonly string[], separator: string): string | undefined {
  const similar = findSimilarKeysBySeparator(key, available, separator);
  return similar.length ? `Схожі: ${similar.join(", ")}` : undefined;
}

function describeAvailableOptions(options: readonly AssemblyChoiceOption[]): string | undefined {
  if (!options.length) return "На цьому рівні класу вибору опцій немає";
  const groups = [...new Set(options.map((option) => option.groupName))];
  return `Доступні: ${groups.map((group) => `${group}: ${options.filter((option) => option.groupName === group).map((option) => option.nameEng).join(", ")}`).join("; ")}`;
}
