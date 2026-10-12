import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { buildClassSpellFilters2014, canSwapKnownSpellOnLevel2014, findLevelUpSpellAllowance2014, findSchoolLimit2014, findSchoolLimitProblem, findSpellLists2014, isOutsideSchools, usesSpellbook2014, type LevelUpSpellAllowance2014, type OwnedSpell2014 } from "@/rules/class-spell-choices-2014";
import { findClassSpellSelectionProblem, NO_SPELLS, type ClassSpellFilters, type ClassSpellSelection } from "@/rules/class-spell-choices-2024";
import { collectOtherGenieKindSpellNames } from "@/rules/genie-kind-spells-2014";
import { findSpellKnowledge2014 } from "@/rules/spell-knowledge-2014";
import { isSpellChoiceCandidate, type SpellChoiceFilter, type SpellSchoolLimit } from "@/rules/spell-choice-filter";
import type { OpenSpellKeys, SpellPoolEntry, StepContext } from "./progression-walk-types";

type SpellCategory = "cantrips" | "knownSpells" | "spellbook";
type SpellIdsByCategory = Record<SpellCategory, number[]>;
type PickedSpells = { fixed: SpellIdsByCategory; open: SpellIdsByCategory };
type SpellReplacement = { dropId: number; addId: number };

const CATEGORIES: readonly SpellCategory[] = ["cantrips", "knownSpells", "spellbook"];
const CATEGORY_LABELS: Record<SpellCategory, string> = { cantrips: "замовляння (cantripKeys)", knownSpells: "відомі заклинання (knownSpellKeys)", spellbook: "заклинання до книги (spellbookKeys)" };

export function checkClassSpells(ctx: StepContext): OpenSpellKeys | null {
  const { step, progress } = ctx;
  const caster = { className: step.classKey, subclassName: progress.subclassKey };
  const owned = { cantrips: progress.ownedCantrips, prepared: progress.ownedLeveledSpells, spellbook: progress.ownedLeveledSpells };
  const allowance = findLevelUpSpellAllowance2014({ ...caster, classLevel: step.classLevel, owned });
  const fixed = resolveFixedSpellIds(ctx);
  const openCounts = readOpenCounts(ctx);
  if (hasUnknownSpellKey(ctx)) return null;
  const replacement = readSpellReplacement(ctx);

  const effectiveAllowance = allowance ?? findReplacementOnlyAllowance(ctx, replacement);
  if (!effectiveAllowance || (!allowance && declaresSpells(fixed, openCounts))) {
    reportStepWithoutAllowance(ctx, { fixed, openCounts, hasReplacement: replacement !== null });
    return null;
  }
  return checkSpellSelection(ctx, { allowance: effectiveAllowance, fixed, openCounts, replacement });
}

function checkSpellSelection(ctx: StepContext, input: { allowance: LevelUpSpellAllowance2014; fixed: SpellIdsByCategory; openCounts: Record<SpellCategory, number>; replacement: SpellReplacement | null }): OpenSpellKeys | null {
  const { step, state, progress, env } = ctx;
  const { allowance, fixed, openCounts, replacement } = input;
  const lists = findSpellLists2014({ className: step.classKey, subclassName: progress.subclassKey });
  const schoolLimit = findSchoolLimit2014({ caster: { className: step.classKey, subclassName: progress.subclassKey }, classLevel: step.classLevel, ownedOfClass: listOwnedSpells(ctx) });
  const filters = buildClassSpellFilters2014({ lists, quota: allowance.quota, schoolLimit });
  const unoffered = collectUnofferedSpellIds(ctx);
  const open = pickOpenSpellIds(ctx, { filters, fixed, openCounts, unoffered, schoolLimit });
  const selection = toSelection({ fixed, open }, replacement);
  const problem = findSchoolLimitProblem({ limit: schoolLimit, selection, candidates: env.spellPool, droppable: env.spellPool.filter((spell) => progress.ownedLeveledSpellIds.includes(spell.spellId)) })
    ?? findClassSpellSelectionProblem({
    quota: allowance.quota, catchUp: allowance.catchUp, filters, selection, candidates: env.spellPool.filter((spell) => !unoffered.has(spell.spellId)),
    usesSpellbook: usesSpellbook2014(step.classKey), bookSpellIds: progress.spellbookSpellIds,
    unavailableSpellIds: [...state.takenSpellIds], droppableSpellIds: progress.ownedLeveledSpellIds, spellsCountLabel: "нових заклинань",
  });
  if (problem) ctx.fail(describeSpellProblem(problem, fixed, openCounts));
  recordSpells(ctx, fixed, open, replacement);
  return toOpenSpellKeys(step.characterLevel, open, env.spellPool);
}

function reportStepWithoutAllowance(ctx: StepContext, input: { fixed: SpellIdsByCategory; openCounts: Record<SpellCategory, number>; hasReplacement: boolean }): void {
  reportSpellsWithoutAllowance(ctx, input.fixed, input.openCounts);
  if (input.hasReplacement) ctx.fail("replaceSpell: на цьому рівні клас ще не знає заклинань, замінювати нічого");
  recordSpells(ctx, input.fixed, emptyCategories(), null);
}

function readSpellReplacement(ctx: StepContext): SpellReplacement | null {
  const { step, progress, env } = ctx;
  const replace = step.decisions?.replaceSpell;
  if (!replace) return null;
  const unknownKeys = [replace.drop, replace.add].filter((key) => !env.catalog.spellIdsByKey.has(key));
  if (unknownKeys.length) return failReplacement(ctx, `немає заклинання ${unknownKeys.join(", ")}`);
  if (!canSwapKnownSpellOnLevel2014(step.classKey, progress.subclassKey)) return failReplacement(ctx, `${translateValue(step.classKey)} не міняє відомі заклинання з рівнем`);
  return { dropId: env.catalog.spellIdsByKey.get(replace.drop)!, addId: env.catalog.spellIdsByKey.get(replace.add)! };
}

function failReplacement(ctx: StepContext, reason: string): null {
  ctx.fail(`replaceSpell: ${reason}`);
  return null;
}

function findReplacementOnlyAllowance({ step, progress }: StepContext, replacement: SpellReplacement | null): LevelUpSpellAllowance2014 | null {
  const knowledge = replacement ? findSpellKnowledge2014(step.classKey, step.classLevel, progress.subclassKey) : null;
  return knowledge ? { quota: { ...NO_SPELLS, maxSpellLevel: knowledge.maxSpellLevel }, catchUp: NO_SPELLS } : null;
}

function declaresSpells(fixed: SpellIdsByCategory, openCounts: Record<SpellCategory, number>): boolean {
  return CATEGORIES.some((category) => fixed[category].length + openCounts[category] > 0);
}

function resolveFixedSpellIds({ step, env }: StepContext): SpellIdsByCategory {
  const keysByCategory = { cantrips: step.decisions?.spells?.cantripKeys ?? [], knownSpells: step.decisions?.spells?.knownSpellKeys ?? [], spellbook: step.decisions?.spells?.spellbookKeys ?? [] };
  const idByKey = env.catalog.spellIdsByKey;
  return Object.fromEntries(CATEGORIES.map((category) => [category, keysByCategory[category].flatMap((key) => idByKey.get(key) ?? [])])) as SpellIdsByCategory;
}

function hasUnknownSpellKey({ step, env }: StepContext): boolean {
  const spells = step.decisions?.spells;
  return [...(spells?.cantripKeys ?? []), ...(spells?.knownSpellKeys ?? []), ...(spells?.spellbookKeys ?? [])].some((key) => !env.catalog.spellIdsByKey.has(key));
}

function readOpenCounts({ step }: StepContext): Record<SpellCategory, number> {
  const picks = step.decisions?.openSpellPicks ?? [];
  return Object.fromEntries(CATEGORIES.map((category) => [category, picks.filter((pick) => pick.category === category).reduce((sum, pick) => sum + pick.count, 0)])) as Record<SpellCategory, number>;
}

function reportSpellsWithoutAllowance(ctx: StepContext, fixed: SpellIdsByCategory, openCounts: Record<SpellCategory, number>): void {
  if (declaresSpells(fixed, openCounts)) ctx.fail(`${translateValue(ctx.step.classKey)} ${ctx.step.classLevel}-го рівня не дає нових заклинань на вибір, а в плані їх ${describeDeclared(fixed, openCounts)}`);
}

function collectUnofferedSpellIds({ env, state }: StepContext): Set<number> {
  const optionNames = [...env.catalog.classes.flatMap((entry) => [...entry.choiceOptions, ...entry.subclasses.flatMap((subclass) => subclass.choiceOptions)])]
    .filter((option) => state.chosenOptionIds.has(option.id))
    .map((option) => option.nameEng);
  const otherKindNames = collectOtherGenieKindSpellNames(optionNames);
  return new Set(env.spellPool.filter((spell) => otherKindNames.has(spell.engName)).map((spell) => spell.spellId));
}

function listOwnedSpells({ env, progress }: StepContext): OwnedSpell2014[] {
  return progress.ownedLeveledSpellIds.flatMap((spellId) => env.spellPool.filter((spell) => spell.spellId === spellId))
    .map((spell) => ({ level: spell.level, school: spell.school, badgeText: null, excludeFromPreparedCount: false, spellLists: spell.spellLists ?? [] }));
}

function pickOpenSpellIds(ctx: StepContext, input: { filters: ClassSpellFilters; fixed: SpellIdsByCategory; openCounts: Record<SpellCategory, number>; unoffered: ReadonlySet<number>; schoolLimit: SpellSchoolLimit | null }): SpellIdsByCategory {
  const open = emptyCategories();
  const used = new Set<number>([...ctx.state.takenSpellIds, ...input.unoffered, ...CATEGORIES.flatMap((category) => input.fixed[category])]);
  for (const category of CATEGORIES) {
    const pool = category === "knownSpells" && usesSpellbook2014(ctx.step.classKey) ? listBookPool(ctx, input.fixed, open) : ctx.env.spellPool.filter((spell) => isSpellChoiceCandidate(findFilter(input.filters, category), spell));
    const inSchool = category === "knownSpells" && input.schoolLimit ? pool.filter((spell) => !isOutsideSchools(input.schoolLimit!.schools, spell.school)) : pool;
    const picked = inSchool.filter((spell) => !used.has(spell.spellId)).slice(0, input.openCounts[category]).map((spell) => spell.spellId);
    picked.forEach((spellId) => used.add(spellId));
    open[category] = picked;
  }
  return open;
}

function listBookPool(ctx: StepContext, fixed: SpellIdsByCategory, open: SpellIdsByCategory): readonly SpellPoolEntry[] {
  const bookIds = new Set([...ctx.progress.spellbookSpellIds, ...fixed.spellbook, ...open.spellbook]);
  return ctx.env.spellPool.filter((spell) => bookIds.has(spell.spellId));
}

function findFilter(filters: ClassSpellFilters, category: SpellCategory): SpellChoiceFilter {
  return category === "cantrips" ? filters.cantrips : filters.spells;
}

function toSelection({ fixed, open }: PickedSpells, replacement: SpellReplacement | null = null): ClassSpellSelection {
  return {
    cantripIds: [...fixed.cantrips, ...open.cantrips],
    preparedIds: [...fixed.knownSpells, ...open.knownSpells],
    spellbookIds: [...fixed.spellbook, ...open.spellbook],
    ...(replacement ? { preparedSwap: replacement } : {}),
  };
}

function recordSpells({ state, progress, step }: StepContext, fixed: SpellIdsByCategory, open: SpellIdsByCategory, replacement: SpellReplacement | null): void {
  const selection = toSelection({ fixed, open });
  const usesBook = usesSpellbook2014(step.classKey);
  progress.ownedCantrips += selection.cantripIds.length;
  progress.ownedCantripIds.push(...selection.cantripIds);
  progress.ownedLeveledSpells += selection.spellbookIds.length + (usesBook ? 0 : selection.preparedIds.length);
  progress.ownedLeveledSpellIds.push(...(usesBook ? selection.spellbookIds : selection.preparedIds));
  progress.spellbookSpellIds.push(...selection.spellbookIds);
  [...selection.cantripIds, ...selection.preparedIds, ...selection.spellbookIds].forEach((spellId) => state.takenSpellIds.add(spellId));
  if (replacement) applySpellReplacement({ state, progress }, replacement);
}

function applySpellReplacement({ state, progress }: Pick<StepContext, "state" | "progress">, { dropId, addId }: SpellReplacement): void {
  progress.ownedLeveledSpellIds = progress.ownedLeveledSpellIds.filter((spellId) => spellId !== dropId).concat(addId);
  state.takenSpellIds.delete(dropId);
  state.takenSpellIds.add(addId);
}

function toOpenSpellKeys(characterLevel: number, open: SpellIdsByCategory, pool: readonly SpellPoolEntry[]): OpenSpellKeys | null {
  const keysOf = (ids: readonly number[]) => ids.flatMap((spellId) => pool.find((spell) => spell.spellId === spellId)?.key ?? []);
  if (!CATEGORIES.some((category) => open[category].length)) return null;
  return { characterLevel, cantripKeys: keysOf(open.cantrips), knownSpellKeys: keysOf(open.knownSpells), spellbookKeys: keysOf(open.spellbook) };
}

function emptyCategories(): SpellIdsByCategory {
  return { cantrips: [], knownSpells: [], spellbook: [] };
}

function describeSpellProblem(problem: string, fixed: SpellIdsByCategory, openCounts: Record<SpellCategory, number>): string {
  return `заклинання: ${problem}. Фіксовані заклинання — spells.*Keys, вибір гравця — openSpellPicks; зараз у плані ${describeDeclared(fixed, openCounts)}`;
}

function describeDeclared(fixed: SpellIdsByCategory, openCounts: Record<SpellCategory, number>): string {
  const parts = CATEGORIES.filter((category) => fixed[category].length + openCounts[category] > 0)
    .map((category) => `${CATEGORY_LABELS[category]}: ${fixed[category].length} назв. + ${openCounts[category]} на вибір гравця`);
  return parts.join("; ") || "жодного заклинання";
}
