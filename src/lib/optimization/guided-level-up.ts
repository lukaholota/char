import type { LevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import type { ClassSpellOffer, ClassSpellSelection } from "@/rules/class-spell-choices-2024";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";
import { buildSingleAssemblyStep } from "./assembly-plan";
import { listExecutableSteps } from "./build-executable-levels";
import type { AssemblyCatalog } from "./assembly-catalog";
import type { BuildProgressionStep, BuildRecipe, LevelDecisions } from "./types";

type Ability = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
export type GuidedPersClass = { classKey: string; classLevel: number; subclassKey: string | null };
export type GuidedPersState = {
  level: number;
  classes: readonly GuidedPersClass[];
  abilityScores: Readonly<Record<Ability, number>>;
  nonRepeatableFeatIds: readonly number[];
  choiceOptionIds: readonly number[];
};
export type OpenSpellPick = { category: string; count: number };
export type GuidedStepPlan =
  | {
    status: "ready"; nextLevel: number; classKey: string; subclassKey: string | null; classLevel: number; isMulticlassEntry: boolean; hasSeveralClasses: boolean;
    input: LevelUpInput; skipped: string[]; open: string[]; openSpellPicks: OpenSpellPick[];
  }
  | { status: "unavailable"; reason: string };
export type GuidedBuildLink = { title: string; href: string };
export type GuidedLevelUp =
  | { status: "ready"; build: GuidedBuildLink; nextLevel: number; classLabel: string; classLevel: number; input: LevelUpInput; picks: string[]; skipped: string[]; open: string[] }
  | { status: "unavailable"; build: GuidedBuildLink | null; reason: string };

const MAX_LEVEL = 20;
const MAX_ABILITY_SCORE = 20;
const OPEN_SPELL_LABELS: Record<string, string> = { cantrips: "замовляння", knownSpells: "нові заклинання", spellbook: "заклинання до книги" };

export function planGuidedLevelUp(recipe: BuildRecipe, catalog: AssemblyCatalog, pers: GuidedPersState): GuidedStepPlan {
  const nextLevel = pers.level + 1;
  if (nextLevel > MAX_LEVEL) return { status: "unavailable", reason: "Персонаж уже на 20-му рівні." };
  const steps = listExecutableSteps(recipe);
  const step = steps.find((candidate) => candidate.characterLevel === nextLevel);
  if (!step) return { status: "unavailable", reason: `План пресета закінчився: рекомендацій для ${nextLevel}-го рівня немає.` };

  const plannedClasses = collectPlannedClasses(recipe, steps, pers.level);
  const mismatch = findCompositionMismatch(plannedClasses, pers.classes);
  if (mismatch) return { status: "unavailable", reason: mismatch };

  const live = buildLiveClassContext(pers.classes, plannedClasses);
  const { step: assembled, issues } = buildSingleAssemblyStep(step, catalog, live);
  const fitted = fitToCharacter(assembled.input, step, pers);
  return {
    status: "ready",
    nextLevel,
    classKey: step.classKey,
    subclassKey: step.subclassKey ?? live.subclassByClass.get(step.classKey) ?? null,
    classLevel: step.classLevel,
    isMulticlassEntry: assembled.isMulticlassEntry,
    hasSeveralClasses: pers.classes.length > 1,
    input: fitted.input,
    skipped: [...issues.filter((issue) => issue.code !== "unresolved-choice").map((issue) => issue.message), ...fitted.skipped],
    open: listOpenChoices(step.decisions ?? {}),
    openSpellPicks: (step.decisions?.openSpellPicks ?? []).map((pick) => ({ category: pick.category, count: pick.count })),
  };
}

type PlannedClass = { classLevel: number; subclassKey: string | null };

function collectPlannedClasses(recipe: BuildRecipe, steps: readonly BuildProgressionStep[], level: number): Map<string, PlannedClass> {
  const startingSubclass = recipe.progression.find((step) => step.characterLevel === 1)?.subclassKey ?? null;
  const planned = new Map<string, PlannedClass>([[recipe.startingClassKey, { classLevel: 1, subclassKey: startingSubclass }]]);
  for (const step of steps.filter((candidate) => candidate.characterLevel <= level)) {
    planned.set(step.classKey, { classLevel: step.classLevel, subclassKey: step.subclassKey ?? planned.get(step.classKey)?.subclassKey ?? null });
  }
  return planned;
}

function findCompositionMismatch(planned: ReadonlyMap<string, PlannedClass>, classes: readonly GuidedPersClass[]): string | null {
  const sameClasses = classes.length === planned.size && classes.every((entry) => planned.get(entry.classKey)?.classLevel === entry.classLevel);
  if (!sameClasses) return "Рівні класів персонажа відрізняються від плану пресета.";
  const otherSubclass = classes.some((entry) => {
    const plannedSubclass = planned.get(entry.classKey)?.subclassKey;
    return entry.subclassKey && plannedSubclass && entry.subclassKey !== plannedSubclass;
  });
  return otherSubclass ? "Підклас персонажа відрізняється від плану пресета." : null;
}

function buildLiveClassContext(classes: readonly GuidedPersClass[], planned: ReadonlyMap<string, PlannedClass>) {
  const subclassByClass = new Map<string, string>();
  for (const [classKey, entry] of planned) if (entry.subclassKey) subclassByClass.set(classKey, entry.subclassKey);
  for (const entry of classes) if (entry.subclassKey) subclassByClass.set(entry.classKey, entry.subclassKey);
  return { ownedClassKeys: new Set(classes.map((entry) => entry.classKey)), subclassByClass };
}

type FittedFields = { fields: Partial<LevelUpInput>; skipped: string | null };

function fitToCharacter(input: LevelUpInput, step: BuildProgressionStep, pers: GuidedPersState): { input: LevelUpInput; skipped: string[] } {
  const parts = [keepNewSubclass(input, step, pers), keepUnownedFeat(input, pers), keepAsiUnderCap(input, pers), keepUnownedOptions(input, pers)];
  const { subclassId: _subclassId, ...rest } = input;
  return {
    input: Object.assign({ ...rest }, ...parts.map((part) => part.fields)),
    skipped: parts.flatMap((part) => (part.skipped ? [part.skipped] : [])),
  };
}

function keepNewSubclass(input: LevelUpInput, step: BuildProgressionStep, pers: GuidedPersState): FittedFields {
  const hasSubclass = pers.classes.some((entry) => entry.classKey === step.classKey && entry.subclassKey);
  return { fields: input.subclassId !== undefined && !hasSubclass ? { subclassId: input.subclassId } : {}, skipped: null };
}

function keepUnownedFeat(input: LevelUpInput, pers: GuidedPersState): FittedFields {
  if (input.featId === undefined || !pers.nonRepeatableFeatIds.includes(input.featId)) return { fields: {}, skipped: null };
  return { fields: { featId: undefined, featChoiceSelections: {} }, skipped: "Рису з плану персонаж уже має — оберіть іншу рису або підвищення характеристик." };
}

function keepAsiUnderCap(input: LevelUpInput, pers: GuidedPersState): FittedFields {
  const isOverCap = input.customAsi.some((increase) => pers.abilityScores[increase.ability as Ability] + Number(increase.value) > MAX_ABILITY_SCORE);
  return isOverCap ? { fields: { customAsi: [] }, skipped: "Підвищення характеристик із плану перевищило б 20 — розподіліть його самі." } : { fields: {}, skipped: null };
}

function keepUnownedOptions(input: LevelUpInput, pers: GuidedPersState): FittedFields {
  const classChoiceSelections = dropOwnedOptions(input.classChoiceSelections, pers.choiceOptionIds);
  const subclassChoiceSelections = dropOwnedOptions(input.subclassChoiceSelections, pers.choiceOptionIds);
  const hasDropped = countSelections(classChoiceSelections) + countSelections(subclassChoiceSelections) < countSelections(input.classChoiceSelections) + countSelections(input.subclassChoiceSelections);
  return { fields: { classChoiceSelections, subclassChoiceSelections }, skipped: hasDropped ? "Частину опцій класу з плану персонаж уже має — оберіть замість них інші." : null };
}

function dropOwnedOptions(selections: LevelUpInput["classChoiceSelections"], ownedIds: readonly number[]): LevelUpInput["classChoiceSelections"] {
  const entries = Object.entries(selections).flatMap(([group, value]) => {
    const kept = (Array.isArray(value) ? value : [value]).filter((id) => !ownedIds.includes(id));
    if (!kept.length) return [];
    return [[group, kept.length === 1 && !Array.isArray(value) ? kept[0] : kept] as const];
  });
  return Object.fromEntries(entries);
}

function countSelections(selections: LevelUpInput["classChoiceSelections"]): number {
  return Object.values(selections).flat().length;
}

export function describeOpenSpellPick(pick: OpenSpellPick): string {
  return `${capitalize(OPEN_SPELL_LABELS[pick.category] ?? "заклинання")}: оберіть ${pick.count}.`;
}

function listOpenChoices(decisions: LevelDecisions): string[] {
  return [
    ...(decisions.openAdvancement ? ["Риса або підвищення характеристик — на ваш вибір."] : []),
    ...(decisions.openClassOptions ? ["Опції класу цього рівня — на ваш вибір."] : []),
  ];
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const OPEN_PICK_COLUMNS = {
  cantrips: { column: "cantripIds", quota: "cantrips" },
  knownSpells: { column: "preparedIds", quota: "prepared" },
  spellbook: { column: "spellbookIds", quota: "spellbook" },
} as const;

export type FilledOpenSpells = { selection: ClassSpellSelection; filledIds: number[]; unfilled: OpenSpellPick[] };

/// Як і створення з пресета: місце, яке автор не називає, займає найкраще за оцінкою RPGbot, при рівній — вищого рівня.
export function fillOpenSpellPicks(selection: ClassSpellSelection, offer: ClassSpellOffer, picks: readonly OpenSpellPick[], findScore: (engName: string) => number | undefined): FilledOpenSpells {
  // shortcut: межу шкіл (лицар-чарівник, містифікатор) не рахуємо — такий вибір лишається гравцю.
  if (offer.schoolLimit) return { selection, filledIds: [], unfilled: [...picks] };
  const filled = { ...selection };
  const filledIds: number[] = [];
  const unfilled: OpenSpellPick[] = [];
  for (const pick of picks) {
    const target = OPEN_PICK_COLUMNS[pick.category as keyof typeof OPEN_PICK_COLUMNS];
    if (!target) continue;
    const room = Math.min(pick.count, offer.quota[target.quota] - filled[target.column].length);
    const chosen = rankOfferedSpells(listFreeCandidates(filled, offer, pick.category), findScore).slice(0, Math.max(0, room)).map((spell) => spell.spellId);
    filled[target.column] = [...filled[target.column], ...chosen];
    filledIds.push(...chosen);
    if (chosen.length < pick.count) unfilled.push({ category: pick.category, count: pick.count - chosen.length });
  }
  return { selection: filled, filledIds, unfilled };
}

function listFreeCandidates(selection: ClassSpellSelection, offer: ClassSpellOffer, category: string): SpellChoiceOption[] {
  const taken = new Set([...selection.cantripIds, ...selection.preparedIds, ...selection.spellbookIds]);
  const pool = category === "cantrips" ? offer.cantrips : offer.spells.filter((spell) => category !== "knownSpells" || !offer.bookOnlySpellIds.includes(spell.spellId));
  return pool.filter((spell) => !taken.has(spell.spellId));
}

function rankOfferedSpells(spells: readonly SpellChoiceOption[], findScore: (engName: string) => number | undefined): SpellChoiceOption[] {
  return [...spells].sort((first, second) => (findScore(second.engName) ?? 0) - (findScore(first.engName) ?? 0) || second.level - first.level);
}

export type GuidedPickNames = {
  className: string;
  subclassName: string | null;
  featName: string | null;
  optionNames: string[];
  spellNameById: ReadonlyMap<number, string>;
};

const ABILITY_LABELS: Record<string, string> = { STR: "Сила", DEX: "Спритність", CON: "Статура", INT: "Інтелект", WIS: "Мудрість", CHA: "Харизма" };

/// Що саме заповнить гайд — щоб кнопку не натискали наосліп і рівень без виборів не обіцяв нічого.
export function listGuidedPicks(plan: Extract<GuidedStepPlan, { status: "ready" }>, names: GuidedPickNames): string[] {
  const { input } = plan;
  const spellNames = (ids: readonly number[]) => ids.map((id) => names.spellNameById.get(id) ?? `#${id}`).join(", ");
  const spells = input.classSpells;
  const swap = spells?.preparedSwap ?? spells?.cantripSwap;
  return [
    ...(plan.isMulticlassEntry ? [`Новий клас: ${names.className}.`] : plan.hasSeveralClasses ? [`Клас: ${names.className}.`] : []),
    ...(names.subclassName ? [`Підклас: ${names.subclassName}.`] : []),
    ...(names.featName ? [`Риса: ${names.featName}.`] : []),
    ...(input.customAsi.length ? [`Характеристики: ${input.customAsi.map((increase) => `${ABILITY_LABELS[increase.ability ?? ""] ?? increase.ability} +${increase.value}`).join(", ")}.`] : []),
    ...(names.optionNames.length ? [`Опції класу: ${names.optionNames.join(", ")}.`] : []),
    ...(spells?.cantripIds.length ? [`Замовляння: ${spellNames(spells.cantripIds)}.`] : []),
    ...(spells?.preparedIds.length ? [`Заклинання: ${spellNames(spells.preparedIds)}.`] : []),
    ...(spells?.spellbookIds.length ? [`До книги: ${spellNames(spells.spellbookIds)}.`] : []),
    ...(swap?.dropId && swap.addId ? [`Заміна: ${spellNames([swap.dropId])} → ${spellNames([swap.addId])}.`] : []),
    ...(hasOtherChoices(input) ? ["Інші вибори рівня за планом: навички, мови чи вміння."] : []),
  ];
}

function hasOtherChoices(input: LevelUpInput): boolean {
  return Object.values(input.levelUpSkillSelections).some((skills) => skills.length > 0)
    || input.expertiseSchema.expertises.length > 0
    || input.languagesSchema.languages.length > 0
    || Object.keys(input.classOptionalFeatureSelections).length > 0
    || input.infusionSelections.length > 0
    || Boolean(input.weaponMasteryWeaponIds?.length)
    || input.featSpellIds.length + input.featGrowthSpellIds.length + input.classOptionSpellIds.length > 0;
}
