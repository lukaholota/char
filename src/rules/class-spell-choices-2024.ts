/**
 * KR31.5 — заклинання, які заклинач 2024 обирає сам: при створенні (P6-class-sweep-level1-07) і на
 * кожному підвищенні рівня класу (L08-levelup-machine-11). Число — таблиця класу на новому рівні
 * (`SPELL_PREPARATION_2024`) мінус те, що персонаж уже має з бейджем цього класу, тож персонаж, який
 * відстав, доганяє норму. Книга чарівника — «six level 1 Wizard spells», далі «add two Wizard spells»
 * за рівень; підготовлені чарівник бере з книги. Тауматург клірика й Маг друїда — «one extra cantrip».
 * Магічні таємниці барда з 10-го рівня — «choose any of your new prepared spells from the Bard, Cleric,
 * Druid, and Wizard spell lists»: розширюється список підготовлених, замовляння лишаються бардівськими.
 */

import { classTranslations } from "@/lib/refs/translation";

import { findSpellSwapProblem, isSwapStarted, type SpellSwap } from "./class-spell-swaps-2024";
import { findSpellCounts2024, findSpellListClass2024 } from "./spell-preparation-2024";
import {
  areAllSpellsOffered,
  hasExactSpellCount,
  isSpellChoiceCandidate,
  type SpellChoiceCandidate,
  type SpellChoiceFilter,
  type SpellChoiceOption,
  type SpellSchoolLimit,
} from "./spell-choice-filter";

export type ClassSpellQuota = {
  cantrips: number;
  prepared: number;
  spellbook: number;
  maxSpellLevel: number;
};

export type ClassSpellCounts = Pick<ClassSpellQuota, "cantrips" | "prepared" | "spellbook">;

export type ClassSpellSelection = {
  cantripIds: number[];
  preparedIds: number[];
  spellbookIds: number[];
  cantripSwap?: SpellSwap | null;
  preparedSwap?: SpellSwap | null;
};

export type ClassSpellOffer = {
  className: string;
  classLabel: string;
  ruleset: "RULES_2014" | "RULES_2024";
  quota: ClassSpellQuota;
  /** 2014: скільки ще до норми таблиці можна додати понад обовʼязкову прибавку рівня; у 2024 — нулі. */
  catchUp: ClassSpellCounts;
  cantrips: SpellChoiceOption[];
  spells: SpellChoiceOption[];
  /** Заклинання вже в книзі чарівника, ще не підготовлені: з них теж можна готувати. */
  bookSpells: SpellChoiceOption[];
  /** Р38: заклинання, яке інше джерело вже дає завжди підготовленим, — у книгу можна, у підготовлені ні. */
  bookOnlySpellIds: number[];
  /** Власні заклинання класу, які рівень дає замінити одне на одне; `null` — заміни на цьому рівні немає. */
  swap: { droppableCantrips: SpellChoiceOption[]; droppableSpells: SpellChoiceOption[] } | null;
  canSkipPrepared: boolean;
  /** 2014, третинний підклас: школи чарівника, з яких він бере заклинання, і скільки поза ними ще можна. */
  schoolLimit?: SpellSchoolLimit | null;
  /** 2014: звідки береться список — «зі списку чарівника», «з розширеного списку покровителя». */
  spellListNote?: string | null;
};

export type ClassSpellFilters = {
  cantrips: SpellChoiceFilter;
  spells: SpellChoiceFilter;
};

const WIZARD_SPELLBOOK_AT_LEVEL_ONE = 6;
const WIZARD_SPELLBOOK_PER_LEVEL = 2;

const MAGICAL_SECRETS_BARD_LEVEL = 10;
const MAGICAL_SECRETS_SPELL_LISTS = ["BARD_2024", "CLERIC_2024", "DRUID_2024", "WIZARD_2024"] as const;

const EXTRA_CANTRIP_CLASS_OPTIONS = new Set(["Divine Order: Thaumaturge (2024)", "Primal Order: Magician (2024)"]);

/**
 * «Whenever you finish a Long Rest, you can change your list of prepared spells» — клірик, друїд, чарівник.
 * Нові підготовлені на підвищенні вони можуть доготувати на листі без втрат; паладин і слідопит міняють
 * за відпочинок лише одне заклинання, тому обирають одразу, як бард, чародій і чорнокнижник.
 */
const PREPARED_LIST_CHANGES_ON_LONG_REST = new Set(["CLERIC_2024", "DRUID_2024", "WIZARD_2024"]);

export const EMPTY_CLASS_SPELL_SELECTION: ClassSpellSelection = { cantripIds: [], preparedIds: [], spellbookIds: [] };

export const NO_SPELLS: ClassSpellCounts = { cantrips: 0, prepared: 0, spellbook: 0 };

export function findCreationSpellQuota(className: string, chosenClassOptionNames: readonly string[]): ClassSpellQuota | null {
  const quota = findClassSpellQuota({ className, classLevel: 1, subclassName: null, chosenClassOptionNames, current: NO_SPELLS });
  return quota && hasSpellsToChoose(quota) ? quota : null;
}

export function findClassSpellQuota(input: {
  className: string;
  classLevel: number;
  subclassName: string | null;
  chosenClassOptionNames: readonly string[];
  current: ClassSpellCounts;
}): ClassSpellQuota | null {
  const counts = findSpellCounts2024(input.className, input.classLevel, input.subclassName);
  if (!counts || counts.prepared === 0) return null;

  const extraCantrips = input.chosenClassOptionNames.filter((name) => EXTRA_CANTRIP_CLASS_OPTIONS.has(name)).length;
  const spellbook = usesSpellbook(input.className) ? findWizardSpellbookSize(input.classLevel) : 0;
  return {
    cantrips: Math.max(0, counts.cantrips + extraCantrips - input.current.cantrips),
    prepared: Math.max(0, counts.prepared - input.current.prepared),
    spellbook: Math.max(0, spellbook - input.current.spellbook),
    maxSpellLevel: counts.maxSpellLevel,
  };
}

export type OwnedClassSpell = {
  level: number;
  isPrepared: boolean;
  badgeText: string | null;
  excludeFromPreparedCount: boolean;
};

/**
 * Скільки класу вже зараховано — тим самим бейджем, за яким лист рахує підготовлені за класом (KR27.7).
 * Книга бере й рядок іншого джерела з бейджем класу (Р38): він записаний у книгу, але підготовлений не класом.
 */
export function countOwnedClassSpells(owned: readonly OwnedClassSpell[], classLabel: string): ClassSpellCounts {
  const withBadge = owned.filter((spell) => spell.badgeText === classLabel);
  const ofClass = withBadge.filter((spell) => !spell.excludeFromPreparedCount);
  return {
    cantrips: ofClass.filter((spell) => spell.level === 0).length,
    prepared: ofClass.filter((spell) => spell.level > 0 && spell.isPrepared).length,
    spellbook: withBadge.filter((spell) => spell.level > 0).length,
  };
}

export function usesSpellbook(className: string): boolean {
  return className === "WIZARD_2024";
}

/** Лише на підвищенні: із конструктора персонаж виходить із повним списком (Р43). */
export function canSkipPreparedSpells(className: string, isLevelUp: boolean): boolean {
  return isLevelUp && PREPARED_LIST_CHANGES_ON_LONG_REST.has(className);
}

export function hasSpellsToChoose(quota: ClassSpellQuota): boolean {
  return quota.cantrips + quota.prepared + quota.spellbook > 0;
}

export function buildClassSpellFilters(input: {
  className: string;
  classLevel: number;
  subclassName: string | null;
  quota: ClassSpellQuota;
}): ClassSpellFilters {
  const listClass = findSpellListClass2024(input.className, input.subclassName);
  const spellList = translateSpellList(listClass);
  const spellLevels = Array.from({ length: input.quota.maxSpellLevel }, (_, index) => index + 1);
  const preparedLists = hasMagicalSecrets(input.className, input.classLevel) ? MAGICAL_SECRETS_SPELL_LISTS.map(translateSpellList) : spellList;

  return {
    cantrips: { levels: [0], schools: null, spellList },
    spells: { levels: spellLevels, schools: null, spellList: preparedLists },
  };
}

function hasMagicalSecrets(className: string, classLevel: number): boolean {
  return className === "BARD_2024" && classLevel >= MAGICAL_SECRETS_BARD_LEVEL;
}

function translateSpellList(className: string): string {
  return classTranslations[className as keyof typeof classTranslations] ?? className;
}

export function findClassSpellSelectionProblem(input: {
  quota: ClassSpellQuota;
  filters: ClassSpellFilters;
  selection: ClassSpellSelection;
  candidates: readonly SpellChoiceCandidate[];
  usesSpellbook: boolean;
  bookSpellIds: readonly number[];
  bookOnlySpellIds?: readonly number[];
  unavailableSpellIds: readonly number[];
  droppableCantripIds?: readonly number[];
  droppableSpellIds?: readonly number[];
  canSkipPrepared?: boolean;
  catchUp?: ClassSpellCounts;
  spellsCountLabel?: string;
}): string | null {
  const { quota, filters, selection, candidates } = input;
  const cantrips = candidates.filter((spell) => isSpellChoiceCandidate(filters.cantrips, spell));
  const spells = candidates.filter((spell) => isSpellChoiceCandidate(filters.spells, spell));
  const limits = findSelectionLimits(quota, input.catchUp ?? NO_SPELLS, input.canSkipPrepared ?? false);

  const countProblem =
    findSpellCountProblem(selection.cantripIds, limits.cantrips, "замовлянь") ??
    findSpellCountProblem(selection.spellbookIds, limits.spellbook, "заклинань до книги") ??
    findSpellCountProblem(selection.preparedIds, limits.prepared, input.spellsCountLabel ?? "підготовлених заклинань");
  if (countProblem) return countProblem;

  if (!areAllSpellsOffered(selection.cantripIds, cantrips)) return "Обране замовляння не з вашого списку класу";
  if (!areAllSpellsOffered(selection.spellbookIds, spells)) return "Обране заклинання не з вашого списку класу або зависокого рівня";
  if (input.usesSpellbook) {
    const book = new Set([...selection.spellbookIds, ...input.bookSpellIds]);
    if (!selection.preparedIds.every((spellId) => book.has(spellId))) return "Підготувати можна лише заклинання з книги";
    const bookOnly = new Set(input.bookOnlySpellIds ?? []);
    if (selection.preparedIds.some((spellId) => bookOnly.has(spellId))) {
      return "Це заклинання вже завжди підготоване іншим джерелом — у книзі воно є, підготуйте інше";
    }
  } else if (!areAllSpellsOffered(selection.preparedIds, spells)) {
    return "Обране заклинання не з вашого списку класу або зависокого рівня";
  }

  const swapProblem =
    findSpellSwapProblem({ swap: selection.cantripSwap, droppableIds: input.droppableCantripIds ?? [], candidateIds: cantrips.map((spell) => spell.spellId) }) ??
    findSpellSwapProblem({ swap: selection.preparedSwap, droppableIds: input.droppableSpellIds ?? [], candidateIds: spells.map((spell) => spell.spellId) });
  if (swapProblem) return swapProblem;

  const unavailable = new Set(input.unavailableSpellIds);
  const picked = new Set([...selection.cantripIds, ...selection.spellbookIds, ...selection.preparedIds]);
  const swapAddIds = collectSwapAddIds(selection);
  if (swapAddIds.some((spellId) => picked.has(spellId)) || new Set(swapAddIds).size !== swapAddIds.length) return "Одне заклинання обрано двічі";
  const chosen = [...picked, ...swapAddIds];
  return chosen.some((spellId) => unavailable.has(spellId)) ? "Це заклинання вже дає інше джерело — оберіть інше" : null;
}

export type SpellCountLimit = { min: number; max: number };

export type ClassSpellSelectionLimits = Record<keyof ClassSpellCounts, SpellCountLimit>;

/** Мінімум — обовʼязкова квота (у готуючих на підвищенні підготовлені — від нуля), максимум — квота плюс доганяння таблиці. */
export function findSelectionLimits(quota: ClassSpellQuota, catchUp: ClassSpellCounts, canSkipPrepared: boolean): ClassSpellSelectionLimits {
  return {
    cantrips: { min: quota.cantrips, max: quota.cantrips + catchUp.cantrips },
    spellbook: { min: quota.spellbook, max: quota.spellbook + catchUp.spellbook },
    prepared: { min: canSkipPrepared ? 0 : quota.prepared, max: quota.prepared + catchUp.prepared },
  };
}

export function isSpellCountWithinLimit(spellIds: readonly number[], limit: SpellCountLimit): boolean {
  return spellIds.length >= limit.min && spellIds.length <= limit.max && new Set(spellIds).size === spellIds.length;
}

function findSpellCountProblem(spellIds: readonly number[], limit: SpellCountLimit, label: string): string | null {
  if (limit.min === limit.max) return hasExactSpellCount(spellIds, limit.min) ? null : `Оберіть ${label}: ${limit.min}`;
  if (isSpellCountWithinLimit(spellIds, limit)) return null;
  if (new Set(spellIds).size !== spellIds.length) return "Одне заклинання обрано двічі";
  return spellIds.length > limit.max ? `Оберіть ${label}: не більше ${limit.max}` : `Оберіть ${label}: щонайменше ${limit.min}`;
}

export function collectSwapAddIds(selection: ClassSpellSelection): number[] {
  return [selection.cantripSwap, selection.preparedSwap].flatMap((swap) => (isSwapStarted(swap) && swap.addId !== null ? [swap.addId] : []));
}

export type SpellbookTally = { inBook: number; size: number };

/** Лічильник книги на листі: скільки заклинань чарівника вже записано й скільки дає рівень. */
export function tallyWizardSpellbook(classLevel: number, owned: readonly OwnedClassSpell[]): SpellbookTally {
  return { inBook: countOwnedClassSpells(owned, classTranslations.WIZARD_2024).spellbook, size: findWizardSpellbookSize(classLevel) };
}

function findWizardSpellbookSize(classLevel: number): number {
  return WIZARD_SPELLBOOK_AT_LEVEL_ONE + WIZARD_SPELLBOOK_PER_LEVEL * (Math.max(1, classLevel) - 1);
}
