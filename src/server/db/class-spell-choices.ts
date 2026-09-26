/**
 * Заклинання, які клас дає обрати в конструкторі й на підвищенні: 2024 — за [Р43](../../../docs/DECISIONS.md#р43),
 * 2014 — за [Р44](../../../docs/DECISIONS.md#р44) (прибавка рівня обовʼязкова, решта до таблиці за бажанням). Правила чисел і перевірки —
 * [`src/rules/class-spell-choices-2024.ts`](../../rules/class-spell-choices-2024.ts) і
 * [`src/rules/class-spell-choices-2014.ts`](../../rules/class-spell-choices-2014.ts), кандидати — зі списку
 * класу в `spell_classes`.
 */

import { type Prisma, type PrismaClient, SpellOrigin } from "@prisma/client";

import { classTranslations } from "@/lib/refs/translation";
import {
  buildClassSpellFilters2014,
  canSwapKnownSpellOnLevel2014,
  collectOwnedClassSpells2014,
  countOwnedClassSpells2014,
  describePatronSpellListNote,
  describeSpellListNote2014,
  findLevelUpSpellAllowance2014,
  findSchoolLimit2014,
  findSchoolLimitProblem,
  findSpellLists2014,
  listSpellLists2014,
} from "@/rules/class-spell-choices-2014";
import {
  buildClassSpellFilters,
  canSkipPreparedSpells,
  countOwnedClassSpells,
  EMPTY_CLASS_SPELL_SELECTION,
  findClassSpellQuota,
  findClassSpellSelectionProblem,
  hasSpellsToChoose,
  NO_SPELLS,
  usesSpellbook,
  type ClassSpellCounts,
  type ClassSpellFilters,
  type ClassSpellOffer,
  type ClassSpellQuota,
  type ClassSpellSelection,
} from "@/rules/class-spell-choices-2024";
import { collectSwappableSpellIds, findLevelUpSpellSwapRule, isSwapStarted } from "@/rules/class-spell-swaps-2024";
import { collectOtherGenieKindSpellNames } from "@/rules/genie-kind-spells-2014";
import { findLegacyPatronSpellList } from "@/rules/legacy-patron-spells-2024";
import type { SpellChoiceOption, SpellSchoolLimit } from "@/rules/spell-choice-filter";
import { findSpellKnowledge2014 } from "@/rules/spell-knowledge-2014";
import { findPactCantripPool, type PactCantripPool, type PactPoolClassLevel } from "@/rules/pact-cantrip-pool";
import { findSchoolKey, loadSpellChoiceOptions } from "@/server/db/spell-choice-options";

export type { ClassSpellOffer } from "@/rules/class-spell-choices-2024";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

type OwnedSpell = Awaited<ReturnType<typeof loadOwnedSpells>>[number];

export type ClassSpellOfferInput = {
  classId: number;
  classLevel: number;
  subclassId: number | null;
  chosenClassOptionIds: readonly number[];
  persId: number | null;
};

type SwappableSpellIds = { cantripIds: number[]; preparedIds: number[] };

type OfferAllowance = {
  quota: ClassSpellQuota;
  catchUp: ClassSpellCounts;
  filters: ClassSpellFilters;
  swappable: SwappableSpellIds;
  schoolLimit: SpellSchoolLimit | null;
  spellListNote: string | null;
};

type AllowanceInput = {
  ruleset: ClassSpellOffer["ruleset"];
  className: string;
  classLabel: string;
  classLevel: number;
  subclassName: string | null;
  chosenClassOptionNames: string[];
  owned: OwnedSpell[];
  persId: number | null;
  cantripPool: PactCantripPool | null;
};

const NO_SWAP: SwappableSpellIds = { cantripIds: [], preparedIds: [] };

export async function loadCreationSpellOffer(
  client: DatabaseClient,
  input: { classId: number; subclassId: number | null; classChoiceOptionIds: readonly number[] },
): Promise<ClassSpellOffer | null> {
  return loadClassSpellOffer(client, {
    classId: input.classId,
    classLevel: 1,
    subclassId: input.subclassId,
    chosenClassOptionIds: input.classChoiceOptionIds,
    persId: null,
  });
}

/** `null` — клас нічого не дає обрати на цьому рівні, і кроку немає. */
export async function loadClassSpellOffer(client: DatabaseClient, input: ClassSpellOfferInput): Promise<ClassSpellOffer | null> {
  return (await loadClassSpellChoice(client, input))?.offer ?? null;
}

async function loadClassSpellChoice(
  client: DatabaseClient,
  input: ClassSpellOfferInput,
): Promise<{ offer: ClassSpellOffer; filters: ClassSpellFilters } | null> {
  const [characterClass, subclass, optionNames, owned, otherClassLevels] = await Promise.all([
    client.class.findUnique({ where: { classId: input.classId }, select: { name: true, ruleset: true } }),
    input.subclassId ? client.subclass.findUnique({ where: { subclassId: input.subclassId }, select: { name: true } }) : null,
    loadChoiceOptionNames(client, input.chosenClassOptionIds),
    loadOwnedSpells(client, input.persId),
    loadOtherClassLevels(client, input.persId, input.classId),
  ]);
  if (!characterClass) return null;

  const ruleset = characterClass.ruleset as ClassSpellOffer["ruleset"];
  const classLabel = classTranslations[characterClass.name] ?? characterClass.name;
  const allowance = findOfferAllowance({
    ruleset,
    className: characterClass.name,
    classLabel,
    classLevel: input.classLevel,
    subclassName: subclass?.name ?? null,
    chosenClassOptionNames: optionNames,
    owned,
    persId: input.persId,
    cantripPool: findPactCantripPool({
      leveling: { className: characterClass.name, classLevel: input.classLevel, subclassName: subclass?.name ?? null },
      otherClassLevels,
      ownedCantripsByClass: countOwnedCantripsByClass(owned, otherClassLevels),
    }),
  });
  if (!allowance || !hasAnythingToOffer(allowance)) return null;

  const { quota, catchUp, filters, swappable, schoolLimit, spellListNote } = allowance;
  const hasSwap = swappable.cantripIds.length + swappable.preparedIds.length > 0;
  const [cantrips, spells, grantedByRules, bookSpells, droppable] = await Promise.all([
    quota.cantrips + catchUp.cantrips > 0 || swappable.cantripIds.length > 0 ? loadSpellChoiceOptions(client, ruleset, filters.cantrips) : [],
    loadSpellChoiceOptions(client, ruleset, filters.spells),
    loadRuleGrantedSpellIds(client, input),
    usesSpellbook(characterClass.name) ? loadUnpreparedBookSpells(client, owned, classLabel) : [],
    hasSwap ? loadSpellChoiceOptions(client, ruleset, ANY_LEVEL_FILTER, [...swappable.cantripIds, ...swappable.preparedIds]) : [],
  ]);

  const ownedIds = new Set(owned.map((spell) => spell.spellId));
  const otherGenieKind = collectOtherGenieKindSpellNames(optionNames);
  const isOwnChoice = (spell: SpellChoiceOption) => !grantedByRules.has(spell.spellId) && !ownedIds.has(spell.spellId) && !otherGenieKind.has(spell.engName);
  const bookOnly = usesSpellbook(characterClass.name) ? findAlwaysPreparedOutsideBook(owned, classLabel) : new Set<number>();
  const offeredSpells = spells.filter((spell) => isOwnChoice(spell) || bookOnly.has(spell.spellId));
  const offer: ClassSpellOffer = {
    className: characterClass.name,
    classLabel,
    ruleset,
    quota,
    catchUp,
    cantrips: cantrips.filter(isOwnChoice),
    spells: offeredSpells,
    bookSpells,
    bookOnlySpellIds: offeredSpells.filter((spell) => bookOnly.has(spell.spellId)).map((spell) => spell.spellId),
    swap: hasSwap
      ? { droppableCantrips: droppable.filter((spell) => spell.level === 0), droppableSpells: droppable.filter((spell) => spell.level > 0) }
      : null,
    canSkipPrepared: ruleset === "RULES_2024" && canSkipPreparedSpells(characterClass.name, input.persId !== null),
    schoolLimit,
    spellListNote,
  };
  return { offer, filters };
}

function findOfferAllowance(input: AllowanceInput): OfferAllowance | null {
  return input.ruleset === "RULES_2014" ? findOfferAllowance2014(input) : findOfferAllowance2024(input);
}

function findOfferAllowance2024(input: AllowanceInput): OfferAllowance | null {
  const quota = findClassSpellQuota({
    className: input.className,
    classLevel: input.classLevel,
    subclassName: input.subclassName,
    chosenClassOptionNames: input.chosenClassOptionNames,
    current: countOwnedClassSpells(input.owned, input.classLabel),
    cantripPool: input.cantripPool,
  });
  if (!quota) return null;
  const extraList = findLegacyPatronSpellList(input.className, input.subclassName);
  return {
    quota,
    catchUp: NO_SPELLS,
    filters: buildClassSpellFilters({ className: input.className, classLevel: input.classLevel, subclassName: input.subclassName, quota, extraList }),
    swappable: findSwappableSpellIds(input.className, input.persId, input.owned, input.classLabel),
    schoolLimit: null,
    spellListNote: extraList ? describePatronSpellListNote(extraList.name) : null,
  };
}

function findOfferAllowance2014(input: AllowanceInput): OfferAllowance | null {
  const caster = { className: input.className, subclassName: input.subclassName };
  const knowledge = findSpellKnowledge2014(input.className, input.classLevel, input.subclassName);
  if (!knowledge) return null;

  const lists = findSpellLists2014(caster);
  const ownedOfClass = collectOwnedClassSpells2014(input.owned, input.classLabel, listSpellLists2014(lists));
  const allowance = findLevelUpSpellAllowance2014({
    ...caster,
    classLevel: input.classLevel,
    owned: countOwnedClassSpells2014(ownedOfClass, input.classLabel, listSpellLists2014(lists)),
    cantripPool: input.cantripPool,
  });
  const quota = allowance?.quota ?? { ...NO_SPELLS, maxSpellLevel: knowledge.maxSpellLevel };
  const schoolLimit = findSchoolLimit2014({ caster, classLevel: input.classLevel, ownedOfClass });
  const swappable = canSwapKnownSpellOnLevel2014(input.className, input.subclassName)
    ? { cantripIds: [], preparedIds: ownedOfClass.filter((spell) => spell.level > 0).map((spell) => spell.spellId) }
    : NO_SWAP;
  return {
    quota,
    catchUp: allowance?.catchUp ?? NO_SPELLS,
    filters: buildClassSpellFilters2014({ lists, quota, schoolLimit }),
    swappable,
    schoolLimit,
    spellListNote: describeSpellListNote2014(caster, lists),
  };
}

function hasAnythingToOffer(allowance: OfferAllowance): boolean {
  const { quota, catchUp, swappable } = allowance;
  return hasSpellsToChoose(quota) || hasSpellsToChoose({ ...catchUp, maxSpellLevel: 0 }) || swappable.cantripIds.length + swappable.preparedIds.length > 0;
}

/** Р38: «Посвячений у магію» чи вид уже дають заклинання завжди підготованим — у книгу його вписати можна. */
function findAlwaysPreparedOutsideBook(owned: OwnedSpell[], classLabel: string): Set<number> {
  return new Set(
    owned.filter((spell) => spell.excludeFromPreparedCount && spell.level > 0 && spell.badgeText !== classLabel).map((spell) => spell.spellId),
  );
}

const ANY_LEVEL_FILTER = { levels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], schools: null, spellList: null };

/** Заміна — лише на підвищенні: у конструкторі персонажа ще нема чого міняти. */
function findSwappableSpellIds(className: string, persId: number | null, owned: OwnedSpell[], classLabel: string): SwappableSpellIds {
  const rule = persId ? findLevelUpSpellSwapRule(className) : null;
  return rule ? collectSwappableSpellIds(rule, owned, classLabel) : NO_SWAP;
}

export async function findClassSpellProblem(
  client: DatabaseClient,
  input: ClassSpellOfferInput & { selection: ClassSpellSelection | undefined; unavailableSpellIds: readonly number[] },
): Promise<{ offer: ClassSpellOffer | null; problem: string | null }> {
  const choice = await loadClassSpellChoice(client, input);
  if (!choice) return { offer: null, problem: null };

  const { offer, filters } = choice;
  const problem = findClassSpellSelectionProblem({
    quota: offer.quota,
    filters,
    selection: input.selection ?? EMPTY_CLASS_SPELL_SELECTION,
    candidates: [...offer.cantrips, ...offer.spells],
    usesSpellbook: usesSpellbook(offer.className),
    bookSpellIds: offer.bookSpells.map((spell) => spell.spellId),
    bookOnlySpellIds: offer.bookOnlySpellIds,
    unavailableSpellIds: input.unavailableSpellIds,
    droppableCantripIds: offer.swap?.droppableCantrips.map((spell) => spell.spellId) ?? [],
    droppableSpellIds: offer.swap?.droppableSpells.map((spell) => spell.spellId) ?? [],
    canSkipPrepared: offer.canSkipPrepared,
    catchUp: offer.catchUp,
    spellsCountLabel: offer.ruleset === "RULES_2014" ? "нових заклинань" : undefined,
  });
  const schoolProblem = findSchoolLimitProblem({
    limit: offer.schoolLimit,
    selection: input.selection ?? EMPTY_CLASS_SPELL_SELECTION,
    candidates: offer.spells,
    droppable: offer.swap?.droppableSpells ?? [],
  });
  return { offer, problem: problem ?? schoolProblem };
}

/**
 * Замовляння й підготовлені лягають підготовленими, заклинання книги поза підготовкою — ні; уже
 * записане в книгу, яке гравець тепер готує, лише стає підготовленим.
 * Бейдж — назва класу: за ним лист 2024 рахує підготовлені за класом (KR27.7).
 */
export async function saveClassSpellSelection(
  tx: Prisma.TransactionClient,
  input: { persId: number; offer: ClassSpellOffer; selection: ClassSpellSelection; learnedAtLevel: number },
): Promise<void> {
  const { persId, offer, selection } = input;
  const alreadyInBook = new Set(offer.bookSpells.map((spell) => spell.spellId));
  const prepared = new Set([...selection.cantripIds, ...selection.preparedIds]);
  const newSpellIds = [...new Set([...selection.cantripIds, ...selection.spellbookIds, ...selection.preparedIds])].filter(
    (spellId) => !alreadyInBook.has(spellId),
  );
  const preparedFromBook = selection.preparedIds.filter((spellId) => alreadyInBook.has(spellId));

  if (newSpellIds.length) {
    await tx.persSpell.createMany({
      data: newSpellIds.map((spellId) => ({
        persId,
        spellId,
        learnedAtLevel: input.learnedAtLevel,
        origin: SpellOrigin.CLASS,
        sourceName: offer.className,
        isPrepared: prepared.has(spellId),
        badgeText: offer.classLabel,
      })),
      skipDuplicates: true,
    });
  }
  if (usesSpellbook(offer.className) && selection.spellbookIds.length) {
    await writeAlwaysPreparedIntoBook(tx, { persId, spellIds: selection.spellbookIds, classLabel: offer.classLabel });
  }
  if (preparedFromBook.length) {
    await tx.persSpell.updateMany({ where: { persId, spellId: { in: preparedFromBook } }, data: { isPrepared: true } });
  }
  for (const swap of [selection.cantripSwap, selection.preparedSwap]) {
    if (isSwapStarted(swap) && swap.dropId !== null && swap.addId !== null) {
      await replaceClassSpell(tx, { persId, offer, dropId: swap.dropId, addId: swap.addId, learnedAtLevel: input.learnedAtLevel });
    }
  }
}

/**
 * Р38: рядок іншого джерела лишається своїм — риса, характеристика, «завжди підготоване» й поза лімітом;
 * книга забирає його лише бейджем, за яким лист і квота рахують книгу чарівника.
 */
async function writeAlwaysPreparedIntoBook(
  tx: Prisma.TransactionClient,
  input: { persId: number; spellIds: readonly number[]; classLabel: string },
): Promise<void> {
  await tx.persSpell.updateMany({
    where: { persId: input.persId, spellId: { in: [...input.spellIds] }, excludeFromPreparedCount: true },
    data: { badgeText: input.classLabel },
  });
}

async function replaceClassSpell(
  tx: Prisma.TransactionClient,
  input: { persId: number; offer: ClassSpellOffer; dropId: number; addId: number; learnedAtLevel: number },
): Promise<void> {
  const badgeOfDropped = input.offer.ruleset === "RULES_2014" ? { OR: [{ badgeText: input.offer.classLabel }, { badgeText: null }] } : { badgeText: input.offer.classLabel };
  await tx.persSpell.deleteMany({ where: { persId: input.persId, spellId: input.dropId, ...badgeOfDropped } });
  await tx.persSpell.create({
    data: {
      persId: input.persId,
      spellId: input.addId,
      learnedAtLevel: input.learnedAtLevel,
      origin: SpellOrigin.CLASS,
      sourceName: input.offer.className,
      isPrepared: true,
      badgeText: input.offer.classLabel,
    },
  });
}

async function loadChoiceOptionNames(client: DatabaseClient, choiceOptionIds: readonly number[]): Promise<string[]> {
  if (!choiceOptionIds.length) return [];
  const options = await client.choiceOption.findMany({
    where: { choiceOptionId: { in: [...choiceOptionIds] } },
    select: { optionNameEng: true },
  });
  return options.map((option) => option.optionNameEng);
}

/** Інші класи персонажа з їхніми рівнями — без класу, що зараз підвищується. */
async function loadOtherClassLevels(client: DatabaseClient, persId: number | null, levelingClassId: number): Promise<PactPoolClassLevel[]> {
  if (!persId) return [];
  const pers = await client.pers.findUnique({
    where: { persId },
    select: {
      level: true,
      classId: true,
      class: { select: { name: true } },
      subclass: { select: { name: true } },
      multiclasses: { select: { classId: true, classLevel: true, class: { select: { name: true } }, subclass: { select: { name: true } } } },
    },
  });
  if (!pers) return [];

  const mainLevel = pers.level - pers.multiclasses.reduce((sum, multiclass) => sum + multiclass.classLevel, 0);
  const classLevels = [
    { classId: pers.classId, classLevel: mainLevel, class: pers.class, subclass: pers.subclass },
    ...pers.multiclasses,
  ];
  return classLevels
    .filter((entry) => entry.classId !== levelingClassId && entry.classLevel > 0)
    .map((entry) => ({ className: entry.class.name, classLevel: entry.classLevel, subclassName: entry.subclass?.name ?? null }));
}

function countOwnedCantripsByClass(owned: OwnedSpell[], classLevels: readonly PactPoolClassLevel[]): Record<string, number> {
  return Object.fromEntries(
    classLevels.map((entry) => {
      const label = classTranslations[entry.className as keyof typeof classTranslations] ?? entry.className;
      return [entry.className, owned.filter((spell) => spell.level === 0 && spell.badgeText === label && !spell.excludeFromPreparedCount).length];
    }),
  );
}

async function loadOwnedSpells(client: DatabaseClient, persId: number | null) {
  if (!persId) return [];
  const rows = await client.persSpell.findMany({
    where: { persId },
    select: {
      spellId: true,
      isPrepared: true,
      badgeText: true,
      excludeFromPreparedCount: true,
      spell: { select: { level: true, school: true, spellClasses: { select: { className: true } } } },
    },
  });
  return rows.map(({ spell, ...row }) => ({
    ...row,
    level: spell.level,
    school: findSchoolKey(spell.school),
    spellLists: spell.spellClasses.map((entry) => entry.className),
  }));
}

async function loadRuleGrantedSpellIds(client: DatabaseClient, input: ClassSpellOfferInput): Promise<Set<number>> {
  const [classRows, subclassRows] = await Promise.all([
    client.classFeature.findMany({
      where: { classId: input.classId, levelGranted: { lte: input.classLevel } },
      select: { feature: { select: { givesSpells: { select: { spellId: true } } } } },
    }),
    input.subclassId
      ? client.subclassSpell.findMany({ where: { subclassId: input.subclassId, classLevel: { lte: input.classLevel } }, select: { spellId: true } })
      : [],
  ]);
  return new Set([
    ...classRows.flatMap((row) => row.feature.givesSpells.map((spell) => spell.spellId)),
    ...subclassRows.map((row) => row.spellId),
  ]);
}

async function loadUnpreparedBookSpells(
  client: DatabaseClient,
  owned: Awaited<ReturnType<typeof loadOwnedSpells>>,
  classLabel: string,
): Promise<SpellChoiceOption[]> {
  const bookSpellIds = owned
    .filter((spell) => spell.badgeText === classLabel && !spell.excludeFromPreparedCount && spell.level > 0 && !spell.isPrepared)
    .map((spell) => spell.spellId);
  if (!bookSpellIds.length) return [];
  return loadSpellChoiceOptions(client, "RULES_2024", { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9], schools: null, spellList: null }, bookSpellIds);
}
