/**
 * Заклинання, які клас 2014 дає обрати в конструкторі й на підвищенні рівня. У конструкторі це вся таблиця
 * 1-го рівня: персонаж ще нічого не має, тож прибавка й норма збігаються. Рішення власника 2026-09-15: прибавка
 * рівня за таблицею PHB обовʼязкова, а решта до норми таблиці — за бажанням. Заклинання живих
 * персонажів 2014 додані руками на листі без бейджа класу, тому «уже наявне» — рядок із бейджем
 * класу або без бейджа, але зі списку цього класу.
 *
 * Бард, чародій, чорнокнижник і слідопит знають заклинання й на кожному рівні класу можуть замінити
 * одне («when you gain a level in this class, you can choose one of the … spells you know and replace
 * it»). Клірик, друїд, паладин і винахідник готують зі списку, тож обирають лише замовляння. Чарівник
 * обирає замовляння й два заклинання до книги («each time you gain a wizard level, you can add two
 * wizard spells»), а готує з книги на відпочинку.
 *
 * Потойбічний лицар і Містичний спритник беруть зі списку чарівника за третинною таблицею: заклинання
 * лише двох шкіл підкласу, а будь-якої школи — по одному на 3, 8, 14 і 20-му рівнях класу. Покровитель
 * чорнокнижника додає до списку класу свій розширений перелік («added to the warlock spell list for you»).
 * Школа хронургії й Школа гравітургії (EGW) так само додають чарівникові свої заклинання дунамантії, яких у
 * загальному списку чарівника немає.
 */

import { classTranslations, spellSchoolTranslations, subclassTranslations } from "@/lib/refs/translation";

import { NO_SPELLS, type ClassSpellCounts, type ClassSpellFilters, type ClassSpellQuota, type ClassSpellSelection } from "./class-spell-choices-2024";
import { isSwapStarted } from "./class-spell-swaps-2024";
import type { SpellChoiceCandidate, SpellSchoolKey, SpellSchoolLimit } from "./spell-choice-filter";
import { findSpellKnowledge2014, isThirdCaster2014, type SpellKnowledge2014 } from "./spell-knowledge-2014";

export type SpellCaster2014 = { className: string; subclassName: string | null };

export type LevelUpSpellAllowance2014 = { quota: ClassSpellQuota; catchUp: ClassSpellCounts };

export type OwnedSpell2014 = {
  level: number;
  school?: string | null;
  badgeText: string | null;
  excludeFromPreparedCount: boolean;
  spellLists: readonly string[];
};

/** Список, з якого клас бере заклинання, і список підкласу поверх нього: покровителя чи школи дунамантії. */
export type SpellLists2014 = { base: string; expanded: string | null };

const WIZARD_SPELLBOOK_AT_LEVEL_ONE = 6;
const WIZARD_SPELLBOOK_PER_LEVEL = 2;

const SWAPS_KNOWN_SPELL_ON_LEVEL = new Set(["BARD_2014", "SORCERER_2014", "WARLOCK_2014", "RANGER_2014"]);

const PATRON_CLASS = "WARLOCK_2014";

const DUNAMANCY_CLASS = "WIZARD_2014";
const DUNAMANCY_SCHOOLS = new Set(["SCHOOL_OF_CHRONURGY", "SCHOOL_OF_GRAVITURGY"]);

const THIRD_CASTER_SCHOOLS: Readonly<Record<string, readonly SpellSchoolKey[]>> = {
  ELDRITCH_KNIGHT: ["ABJURATION", "EVOCATION"],
  ARCANE_TRICKSTER: ["ENCHANTMENT", "ILLUSION"],
};

const ANY_SCHOOL_LEVELS = [3, 8, 14, 20] as const;

export function findCreationSpellAllowance2014(caster: SpellCaster2014): LevelUpSpellAllowance2014 | null {
  return findLevelUpSpellAllowance2014({ ...caster, classLevel: 1, owned: NO_SPELLS });
}

export function hasCreationSpellChoice2014(className: string): boolean {
  return findCreationSpellAllowance2014({ className, subclassName: null }) !== null;
}

export function findLevelUpSpellAllowance2014(input: SpellCaster2014 & { classLevel: number; owned: ClassSpellCounts }): LevelUpSpellAllowance2014 | null {
  const now = findSpellKnowledge2014(input.className, input.classLevel, input.subclassName);
  if (!now) return null;

  const before = input.classLevel > 1 ? findSpellKnowledge2014(input.className, input.classLevel - 1, input.subclassName) : null;
  const norm = findNormCounts(input.className, input.classLevel, now);
  const gained = findGainedCounts(input.className, input.classLevel, now, before);
  const required = mapCounts((key) => Math.min(gained[key], Math.max(0, norm[key] - input.owned[key])));
  const catchUp = mapCounts((key) => Math.max(0, norm[key] - input.owned[key] - required[key]));

  if (sumCounts(required) + sumCounts(catchUp) === 0) return null;
  return { quota: { ...required, maxSpellLevel: now.maxSpellLevel }, catchUp };
}

export function findSpellLists2014(caster: SpellCaster2014): SpellLists2014 {
  const base = isThirdCaster2014(caster.className, caster.subclassName) ? classTranslations.WIZARD_2014 : translateClass(caster.className);
  const expanded = hasSubclassSpellList2014(caster) ? translateSubclass(caster.subclassName ?? "") : null;
  return { base, expanded };
}

function hasSubclassSpellList2014(caster: SpellCaster2014): boolean {
  if (!caster.subclassName) return false;
  return caster.className === PATRON_CLASS || (caster.className === DUNAMANCY_CLASS && DUNAMANCY_SCHOOLS.has(caster.subclassName));
}

export function listSpellLists2014(lists: SpellLists2014): string[] {
  return lists.expanded ? [lists.base, lists.expanded] : [lists.base];
}

export function describeSpellListNote2014(caster: SpellCaster2014, lists: SpellLists2014): string {
  if (isThirdCaster2014(caster.className, caster.subclassName)) return `зі списку чарівника (${translateSubclass(caster.subclassName ?? "")})`;
  if (lists.expanded && caster.className === PATRON_CLASS) return `зі свого списку й розширеного списку покровителя «${lists.expanded}»`;
  if (lists.expanded) return `зі свого списку й заклинань дунамантії («${lists.expanded}»)`;
  return "зі свого списку";
}

export function collectOwnedClassSpells2014<T extends OwnedSpell2014>(owned: readonly T[], classLabel: string, lists: readonly string[]): T[] {
  return owned.filter((spell) => isOwnedClassSpell2014(spell, classLabel, lists));
}

export function countOwnedClassSpells2014(owned: readonly OwnedSpell2014[], classLabel: string, lists: readonly string[]): ClassSpellCounts {
  const ofClass = collectOwnedClassSpells2014(owned, classLabel, lists);
  const spells = ofClass.filter((spell) => spell.level > 0).length;
  return { cantrips: ofClass.filter((spell) => spell.level === 0).length, prepared: spells, spellbook: spells };
}

export function isOwnedClassSpell2014(spell: OwnedSpell2014, classLabel: string, lists: readonly string[]): boolean {
  if (spell.excludeFromPreparedCount) return false;
  if (spell.badgeText === classLabel) return true;
  return spell.badgeText === null && spell.spellLists.some((list) => lists.includes(list));
}

export function canSwapKnownSpellOnLevel2014(className: string, subclassName: string | null = null): boolean {
  return SWAPS_KNOWN_SPELL_ON_LEVEL.has(className) || isThirdCaster2014(className, subclassName);
}

export function usesSpellbook2014(className: string): boolean {
  return className === "WIZARD_2014";
}

/** Скільки заклинань поза школами підкласу ще можна взяти: по одному дають 3, 8, 14 і 20-й рівні, а наявні вже зʼїли частину. */
export function findSchoolLimit2014(input: { caster: SpellCaster2014; classLevel: number; ownedOfClass: readonly OwnedSpell2014[] }): SpellSchoolLimit | null {
  const schools = input.caster.subclassName ? THIRD_CASTER_SCHOOLS[input.caster.subclassName] : undefined;
  if (!schools || !isThirdCaster2014(input.caster.className, input.caster.subclassName)) return null;

  const anySchoolPicks = ANY_SCHOOL_LEVELS.filter((level) => level <= input.classLevel).length;
  const ownedOutside = input.ownedOfClass.filter((spell) => spell.level > 0 && isOutsideSchools(schools, spell.school)).length;
  return { schools, outsideAllowed: Math.max(0, anySchoolPicks - ownedOutside) };
}

export function buildClassSpellFilters2014(input: { lists: SpellLists2014; quota: ClassSpellQuota; schoolLimit: SpellSchoolLimit | null }): ClassSpellFilters {
  const spellList = input.lists.expanded ? listSpellLists2014(input.lists) : input.lists.base;
  const spellLevels = Array.from({ length: input.quota.maxSpellLevel }, (_, index) => index + 1);
  const schools = input.schoolLimit && input.schoolLimit.outsideAllowed === 0 ? input.schoolLimit.schools : null;
  return {
    cantrips: { levels: [0], schools: null, spellList },
    spells: { levels: spellLevels, schools, spellList },
  };
}

export function findSchoolLimitProblem(input: {
  limit: SpellSchoolLimit | null | undefined;
  selection: ClassSpellSelection;
  candidates: readonly SpellChoiceCandidate[];
  droppable: readonly SpellChoiceCandidate[];
}): string | null {
  if (!input.limit) return null;
  if (countOutsideSchools(input.limit, input.selection, input.candidates, input.droppable) <= input.limit.outsideAllowed) return null;

  const schools = describeSchools(input.limit.schools);
  return input.limit.outsideAllowed === 0 ? `Підклас дає лише школи ${schools}` : `Поза школами ${schools} можна взяти не більше ${input.limit.outsideAllowed}`;
}

/** Нові заклинання поза школами плюс узяте на заміну, мінус прибране: заміна звільняє місце «будь-якої школи». */
export function countOutsideSchools(
  limit: SpellSchoolLimit,
  selection: ClassSpellSelection,
  candidates: readonly SpellChoiceCandidate[],
  droppable: readonly SpellChoiceCandidate[],
): number {
  const schoolById = new Map([...candidates, ...droppable].map((spell) => [spell.spellId, spell.school]));
  const isOutside = (spellId: number) => isOutsideSchools(limit.schools, schoolById.get(spellId) ?? null);
  const swap = selection.preparedSwap;
  const added = isSwapStarted(swap) && swap.addId !== null && isOutside(swap.addId) ? 1 : 0;
  const dropped = isSwapStarted(swap) && swap.dropId !== null && isOutside(swap.dropId) ? 1 : 0;
  return selection.preparedIds.filter(isOutside).length + added - dropped;
}

export function isOutsideSchools(schools: readonly SpellSchoolKey[], school: string | null | undefined): boolean {
  return typeof school === "string" && !schools.some((allowed) => allowed === school);
}

export function describeSchoolLimit2014(limit: SpellSchoolLimit): string {
  const schools = describeSchools(limit.schools);
  return limit.outsideAllowed > 0
    ? `Школи підкласу — ${schools}; поза ними можна взяти ще ${limit.outsideAllowed}.`
    : `Лише школи ${schools}: заклинання будь-якої школи підклас дає на 3, 8, 14 і 20-му рівнях.`;
}

function describeSchools(schools: readonly SpellSchoolKey[]): string {
  return schools.map((school) => `«${spellSchoolTranslations[school]}»`).join(" і ");
}

function translateClass(className: string): string {
  return classTranslations[className as keyof typeof classTranslations] ?? className;
}

function translateSubclass(subclassName: string): string {
  return (subclassTranslations as Partial<Record<string, string>>)[subclassName] ?? subclassName;
}

function findNormCounts(className: string, classLevel: number, now: SpellKnowledge2014): ClassSpellCounts {
  return {
    cantrips: now.cantrips,
    prepared: now.known ?? 0,
    spellbook: usesSpellbook2014(className) ? WIZARD_SPELLBOOK_AT_LEVEL_ONE + WIZARD_SPELLBOOK_PER_LEVEL * (classLevel - 1) : 0,
  };
}

function findGainedCounts(className: string, classLevel: number, now: SpellKnowledge2014, before: SpellKnowledge2014 | null): ClassSpellCounts {
  return {
    cantrips: Math.max(0, now.cantrips - (before?.cantrips ?? 0)),
    prepared: Math.max(0, (now.known ?? 0) - (before?.known ?? 0)),
    spellbook: usesSpellbook2014(className) ? (classLevel === 1 ? WIZARD_SPELLBOOK_AT_LEVEL_ONE : WIZARD_SPELLBOOK_PER_LEVEL) : 0,
  };
}

const COUNT_KEYS = ["cantrips", "prepared", "spellbook"] as const;

function mapCounts(read: (key: (typeof COUNT_KEYS)[number]) => number): ClassSpellCounts {
  return { cantrips: read("cantrips"), prepared: read("prepared"), spellbook: read("spellbook") };
}

function sumCounts(counts: ClassSpellCounts): number {
  return counts.cantrips + counts.prepared + counts.spellbook;
}
