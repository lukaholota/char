import type { LevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import type { ClassSpellOffer, ClassSpellSelection } from "@/rules/class-spell-choices-2024";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";
import type { ExpertiseGrant } from "@/rules/expertise-selections";
import { MULTICLASS_SKILL_SELECTION_KEY } from "@/rules/multiclass-skill-choice";
import { checkPrerequisite } from "@/lib/logic/prerequisiteUtils";
import { engEnumSkills, skillTranslations } from "@/lib/refs/translation";
import { buildSingleAssemblyStep } from "./assembly-plan";
import { listExecutableSteps } from "./build-executable-levels";
import type { AssemblyCatalog, AssemblyChoiceOption, AssemblyFeature } from "./assembly-catalog";
import type { BuildProgressionStep, BuildRecipe } from "./types";

type Ability = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
export type GuidedPersClass = { classKey: string; classLevel: number; subclassKey: string | null };
export type GuidedPersSkill = { name: string; proficiencyType: string };
export type GuidedPersState = {
  level: number;
  classes: readonly GuidedPersClass[];
  abilityScores: Readonly<Record<Ability, number>>;
  nonRepeatableFeatIds: readonly number[];
  choiceOptionIds: readonly number[];
  skills: readonly GuidedPersSkill[];
};
/// Що гайд знає поза рецептом: навички, які дає вхід у клас, і оцінки RPGbot для опцій класу.
export type GuidedPlanContext = {
  classSkillOptions?: Readonly<Record<string, readonly string[]>>;
  findOptionScore?: (option: AssemblyChoiceOption) => number | undefined;
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

export function planGuidedLevelUp(recipe: BuildRecipe, catalog: AssemblyCatalog, pers: GuidedPersState, context: GuidedPlanContext = {}): GuidedStepPlan {
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
  const subclassKey = step.subclassKey ?? live.subclassByClass.get(step.classKey) ?? null;
  const fitted = fitToCharacter(assembled.input, { step, pers, catalog, context, features: listLevelFeatures(catalog, step, subclassKey) });
  return {
    status: "ready",
    nextLevel,
    classKey: step.classKey,
    subclassKey,
    classLevel: step.classLevel,
    isMulticlassEntry: assembled.isMulticlassEntry,
    hasSeveralClasses: pers.classes.length > 1,
    input: fitted.input,
    skipped: [...issues.filter((issue) => issue.code !== "unresolved-choice").map((issue) => issue.message), ...fitted.skipped],
    open: fitted.open,
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

type FitContext = { step: BuildProgressionStep; pers: GuidedPersState; catalog: AssemblyCatalog; context: GuidedPlanContext; features: readonly AssemblyFeature[] };
type FittedFields = { fields: Partial<LevelUpInput>; skipped: string[]; open: string[] };
type Selections = LevelUpInput["classChoiceSelections"];

const KEEP_AS_PLANNED: FittedFields = { fields: {}, skipped: [], open: [] };
const OPEN_ADVANCEMENT_NOTE = "Автор не називає рису чи підвищення на цьому рівні — гайд узяв типовий вибір, його можна змінити на кроці «Покращення».";
const OPEN_OPTIONS_NOTE = "Автор не називає опції класу на цьому рівні — гайд узяв типові, їх можна змінити на кроці «Опції класу».";
const RATED_OPTIONS_NOTE = "Типову опцію класу персонаж уже має — гайд узяв найкращу доступну за оцінкою RPGbot, її можна змінити на кроці «Опції класу».";

function fitToCharacter(input: LevelUpInput, fit: FitContext): { input: LevelUpInput; skipped: string[]; open: string[] } {
  const skills = keepNewSkills(input, fit);
  const fittedSkills = { ...input.levelUpSkillSelections, ...skills.fields.levelUpSkillSelections };
  const parts = [keepNewSubclass(input, fit), keepUnownedFeat(input, fit), keepAsiUnderCap(input, fit), keepUnownedOptions(input, fit), skills, keepValidExpertise(input, Object.values(fittedSkills).flat(), fit)];
  const { subclassId: _subclassId, ...rest } = input;
  const fitted: LevelUpInput = Object.assign({ ...rest }, ...parts.map((part) => part.fields));
  return {
    input: fitted,
    skipped: parts.flatMap((part) => part.skipped),
    open: [...describeOpenAdvancement(input, fitted, fit), ...parts.flatMap((part) => part.open)],
  };
}

function keepNewSubclass(input: LevelUpInput, { step, pers }: FitContext): FittedFields {
  const hasSubclass = pers.classes.some((entry) => entry.classKey === step.classKey && entry.subclassKey);
  return { ...KEEP_AS_PLANNED, fields: input.subclassId !== undefined && !hasSubclass ? { subclassId: input.subclassId } : {} };
}

function keepUnownedFeat(input: LevelUpInput, { pers }: FitContext): FittedFields {
  if (input.featId === undefined || !pers.nonRepeatableFeatIds.includes(input.featId)) return KEEP_AS_PLANNED;
  return { fields: { featId: undefined, featChoiceSelections: {} }, skipped: ["Рису з плану персонаж уже має — оберіть іншу рису або підвищення характеристик."], open: [] };
}

function keepAsiUnderCap(input: LevelUpInput, { pers }: FitContext): FittedFields {
  const isOverCap = input.customAsi.some((increase) => pers.abilityScores[increase.ability as Ability] + Number(increase.value) > MAX_ABILITY_SCORE);
  return isOverCap ? { fields: { customAsi: [] }, skipped: ["Підвищення характеристик із плану перевищило б 20 — розподіліть його самі."], open: [] } : KEEP_AS_PLANNED;
}

function describeOpenAdvancement(planned: LevelUpInput, fitted: LevelUpInput, { step }: FitContext): string[] {
  const hasPlannedAdvancement = planned.featId !== undefined || planned.customAsi.length > 0;
  const keepsAdvancement = fitted.featId !== undefined || fitted.customAsi.length > 0;
  return step.decisions?.openAdvancement && hasPlannedAdvancement && keepsAdvancement ? [OPEN_ADVANCEMENT_NOTE] : [];
}

function keepUnownedOptions(input: LevelUpInput, fit: FitContext): FittedFields {
  const isOpen = Boolean(fit.step.decisions?.openClassOptions);
  const classChoiceSelections = dropOwnedOptions(input.classChoiceSelections, fit.pers.choiceOptionIds);
  const subclassChoiceSelections = dropOwnedOptions(input.subclassChoiceSelections, fit.pers.choiceOptionIds);
  const hasDropped = countSelections(classChoiceSelections) + countSelections(subclassChoiceSelections) < countSelections(input.classChoiceSelections) + countSelections(input.subclassChoiceSelections);
  if (!hasDropped) return { fields: { classChoiceSelections, subclassChoiceSelections }, skipped: [], open: isOpen ? [OPEN_OPTIONS_NOTE] : [] };

  const subclassKept = countSelections(subclassChoiceSelections) === countSelections(input.subclassChoiceSelections);
  const refilled = isOpen && subclassKept ? refillWithRatedOptions(input.classChoiceSelections, classChoiceSelections, fit) : null;
  if (refilled) return { fields: { classChoiceSelections: refilled, subclassChoiceSelections }, skipped: [], open: [RATED_OPTIONS_NOTE] };
  return { fields: { classChoiceSelections, subclassChoiceSelections }, skipped: ["Частину опцій класу з плану персонаж уже має — оберіть замість них інші."], open: [] };
}

/// Як відкритий вибір заклинань: найвища оцінка RPGbot серед того, що персонаж може взяти, при рівній — за назвою.
function refillWithRatedOptions(planned: Selections, kept: Selections, { step, pers, catalog, context }: FitContext): Selections | null {
  const findScore = context.findOptionScore;
  if (!findScore) return null;
  const options = catalog.classes.find((entry) => entry.key === step.classKey)?.choiceOptions ?? [];
  const refilled: Record<string, number[]> = Object.fromEntries(Object.entries(kept).map(([group, value]) => [group, toIds(value)]));
  for (const [group, value] of Object.entries(planned)) {
    const missing = toIds(value).length - (refilled[group]?.length ?? 0);
    if (missing <= 0) continue;
    const taken = [...pers.choiceOptionIds, ...Object.values(refilled).flat()];
    const candidates = options.filter((option) => option.groupName === group && option.levelsGranted.includes(step.classLevel) && !taken.includes(option.id)
      && findScore(option) !== undefined && checkPrerequisite(option.prerequisites, { classLevel: step.classLevel, existingChoiceOptionIds: [...pers.choiceOptionIds] }).met);
    const chosen = [...candidates].sort((first, second) => (findScore(second) ?? 0) - (findScore(first) ?? 0) || first.nameEng.localeCompare(second.nameEng)).slice(0, missing);
    if (chosen.length < missing) return null;
    refilled[group] = [...(refilled[group] ?? []), ...chosen.map((option) => option.id)];
  }
  return Object.fromEntries(Object.entries(refilled).map(([group, ids]) => [group, ids.length === 1 && !Array.isArray(planned[group]) ? ids[0] : ids]));
}

function toIds(value: Selections[string] | undefined): number[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function listLevelFeatures(catalog: AssemblyCatalog, step: BuildProgressionStep, subclassKey: string | null): AssemblyFeature[] {
  const characterClass = catalog.classes.find((entry) => entry.key === step.classKey);
  const subclass = characterClass?.subclasses.find((entry) => entry.key === subclassKey);
  return [...(characterClass?.features ?? []), ...(subclass?.features ?? [])].filter((feature) => feature.levelGranted === step.classLevel);
}

const SKILL_ORDER: readonly string[] = engEnumSkills.map((skill) => skill.eng);
const isSkill = (value: string) => SKILL_ORDER.includes(value);
const sortSkills = (skills: Iterable<string>) => [...new Set(skills)].filter(isSkill).sort((first, second) => SKILL_ORDER.indexOf(first) - SKILL_ORDER.indexOf(second));
const nameSkill = (skill: string) => skillTranslations[skill] ?? skill;

/// Будь-який рядок навички в листі сервер уже не перетворить на володіння, тож гайд його не пропонує.
function keepNewSkills(input: LevelUpInput, { pers, features, context, step }: FitContext): FittedFields {
  const owned = new Set(pers.skills.map((skill) => skill.name));
  const planned = new Set(Object.values(input.levelUpSkillSelections).flat());
  const chosen = new Set<string>();
  const result: FittedFields = { fields: {}, skipped: [], open: [] };
  const levelUpSkillSelections = Object.fromEntries(Object.entries(input.levelUpSkillSelections).map(([key, skills]) => {
    const pool = key === MULTICLASS_SKILL_SELECTION_KEY ? context.classSkillOptions?.[step.classKey] : features.find((feature) => String(feature.featureId) === key)?.skillChoice?.options;
    const kept = skills.flatMap((skill) => {
      if (!owned.has(skill) && !chosen.has(skill)) {
        chosen.add(skill);
        return [skill];
      }
      const substitute = sortSkills(pool ?? []).find((candidate) => !owned.has(candidate) && !chosen.has(candidate) && !planned.has(candidate));
      if (!substitute) {
        result.skipped.push(`Навичку «${nameSkill(skill)}» персонаж уже має — оберіть іншу на кроці «Навички».`);
        return [];
      }
      chosen.add(substitute);
      result.open.push(`Навичку «${nameSkill(skill)}» персонаж уже має — гайд узяв «${nameSkill(substitute)}».`);
      return [substitute];
    });
    return [key, kept];
  }));
  return result.skipped.length || result.open.length ? { ...result, fields: { levelUpSkillSelections } } : KEEP_AS_PLANNED;
}

function keepValidExpertise(input: LevelUpInput, gainedSkills: readonly string[], { pers, features }: FitContext): FittedFields {
  const planned = input.expertiseSchema.expertises;
  const expert = new Set(pers.skills.filter((skill) => skill.proficiencyType === "EXPERTISE").map((skill) => skill.name));
  const proficient = new Set([...pers.skills.filter((skill) => skill.proficiencyType !== "NONE").map((skill) => skill.name), ...gainedSkills]);
  const grants = features.flatMap((feature) => (feature.expertiseGrant ? [feature.expertiseGrant] : []));
  const pool = sortSkills(listExpertiseCandidates(grants, proficient)).filter((skill) => !expert.has(skill));
  const result: FittedFields = { fields: {}, skipped: [], open: [] };
  const kept: string[] = [];
  for (const skill of planned) {
    if (!isSkill(skill) || (pool.includes(skill) && !kept.includes(skill))) {
      kept.push(skill);
      continue;
    }
    const reason = expert.has(skill) ? `Експертизу в «${nameSkill(skill)}» персонаж уже має` : `Експертизу в «${nameSkill(skill)}» не взяти без володіння навичкою`;
    const substitute = pool.find((candidate) => !kept.includes(candidate) && !planned.includes(candidate));
    if (!substitute) {
      result.skipped.push(`${reason} — оберіть іншу навичку на кроці «Експертиза».`);
      continue;
    }
    kept.push(substitute);
    result.open.push(`${reason} — гайд узяв «${nameSkill(substitute)}».`);
  }
  return result.skipped.length || result.open.length ? { ...result, fields: { expertiseSchema: { ...input.expertiseSchema, expertises: kept } } } : KEEP_AS_PLANNED;
}

function listExpertiseCandidates(grants: readonly ExpertiseGrant[], proficient: ReadonlySet<string>): string[] {
  if (!grants.length) return [...proficient];
  return grants.flatMap((grant) => [
    ...(grant.chooseFromCurrentProficiencies ? [...proficient] : []),
    ...(grant.options ?? []).filter((skill) => grant.getProficiencyAsWell || proficient.has(skill)),
  ]);
}

function dropOwnedOptions(selections: Selections, ownedIds: readonly number[]): Selections {
  const entries = Object.entries(selections).flatMap(([group, value]) => {
    const kept = (Array.isArray(value) ? value : [value]).filter((id) => !ownedIds.includes(id));
    if (!kept.length) return [];
    return [[group, kept.length === 1 && !Array.isArray(value) ? kept[0] : kept] as const];
  });
  return Object.fromEntries(entries);
}

function countSelections(selections: Selections): number {
  return Object.values(selections).flat().length;
}

export function describeOpenSpellPick(pick: OpenSpellPick): string {
  return `${capitalize(OPEN_SPELL_LABELS[pick.category] ?? "заклинання")}: оберіть ${pick.count}.`;
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
  const skills = Object.values(input.levelUpSkillSelections).flat();
  return [
    ...(plan.isMulticlassEntry ? [`Новий клас: ${names.className}.`] : plan.hasSeveralClasses ? [`Клас: ${names.className}.`] : []),
    ...(names.subclassName ? [`Підклас: ${names.subclassName}.`] : []),
    ...(names.featName ? [`Риса: ${names.featName}.`] : []),
    ...(input.customAsi.length ? [`Характеристики: ${input.customAsi.map((increase) => `${ABILITY_LABELS[increase.ability ?? ""] ?? increase.ability} +${increase.value}`).join(", ")}.`] : []),
    ...(names.optionNames.length ? [`Опції класу: ${names.optionNames.join(", ")}.`] : []),
    ...(skills.length ? [`Навички: ${skills.map(nameSkill).join(", ")}.`] : []),
    ...(input.expertiseSchema.expertises.length ? [`Експертиза: ${input.expertiseSchema.expertises.map(nameSkill).join(", ")}.`] : []),
    ...(spells?.cantripIds.length ? [`Замовляння: ${spellNames(spells.cantripIds)}.`] : []),
    ...(spells?.preparedIds.length ? [`Заклинання: ${spellNames(spells.preparedIds)}.`] : []),
    ...(spells?.spellbookIds.length ? [`До книги: ${spellNames(spells.spellbookIds)}.`] : []),
    ...(swap?.dropId && swap.addId ? [`Заміна: ${spellNames([swap.dropId])} → ${spellNames([swap.addId])}.`] : []),
    ...(hasOtherChoices(input) ? ["Інші вибори рівня за планом: мови чи вміння."] : []),
  ];
}

function hasOtherChoices(input: LevelUpInput): boolean {
  return input.languagesSchema.languages.length > 0
    || Object.keys(input.classOptionalFeatureSelections).length > 0
    || input.infusionSelections.length > 0
    || Boolean(input.weaponMasteryWeaponIds?.length)
    || input.featSpellIds.length + input.featGrowthSpellIds.length + input.classOptionSpellIds.length > 0;
}
