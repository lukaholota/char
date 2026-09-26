/**
 * KR31.5 — що персонаж має підготовленим не своїм вибором, і рядки, якими воно лягає.
 *
 * Два джерела, один підрахунок: підклас несе перелік у `subclass_spell`, клас — звʼязком
 * «фіча → заклинання», де рівень уже стоїть на самій фічі. Правило, яке каже, ЩО заслужено, —
 * у [`src/rules/always-prepared-spells.ts`](../../rules/always-prepared-spells.ts).
 *
 * Перелік читається з бази, а не з каталогу конструктора: каталог — знімок робочої бази, а рядок
 * пишеться в ту базу, з якою працює процес.
 */

import { type Prisma, type PrismaClient, SpellOrigin } from "@prisma/client";

import { findEarnedAlwaysPreparedSpells, type AlwaysPreparedSpellSource } from "@/rules/always-prepared-spells";
import { buildSubclassOptionSpellSources, type ChosenSubclassOption } from "@/rules/subclass-option-spells-2024";
import { listSubclassOptionSpells2014 } from "@/rules/subclass-option-spells-2014";
import type { GrantedSpell } from "@/rules/spell-sources";
import type { AbilityKey } from "@/rules/types";
import { translateSubclassName } from "@/lib/refs/subclass-name";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

/** Кольори бейджів — ті самі, що MagicSlide пропонує для пресетів «підклас» і «клас». */
const SUBCLASS_SPELL_BADGE_COLOR = "#fbbf24";
const CLASS_SPELL_BADGE_COLOR = "#fb7185";

export type SubclassAtClassLevel = { subclassId: number; classLevel: number; ability: AbilityKey | null };
export type ClassAtLevel = { classId: number; classLevel: number; ability: AbilityKey | null };

export async function findMissingSubclassSpells(
  client: DatabaseClient,
  input: { subclasses: readonly SubclassAtClassLevel[]; ownedSpellIds: readonly number[] },
): Promise<GrantedSpell[]> {
  if (!input.subclasses.length) return [];

  const rows = await client.subclassSpell.findMany({
    where: { subclassId: { in: input.subclasses.map((subclass) => subclass.subclassId) } },
    select: { subclassId: true, spellId: true, classLevel: true, subclass: { select: { name: true } } },
    orderBy: [{ classLevel: "asc" }, { spellId: "asc" }],
  });

  const sources = input.subclasses.flatMap((subclass) => {
    const own = rows.filter((row) => row.subclassId === subclass.subclassId);
    if (!own.length) return [];

    const key = own[0].subclass.name;
    return [{
      sourceKey: key,
      sourceName: translateSubclassName(key),
      classLevel: subclass.classLevel,
      ability: subclass.ability,
      spells: own.map((row) => ({ spellId: row.spellId, classLevel: row.classLevel })),
    } satisfies AlwaysPreparedSpellSource];
  });

  return findEarnedAlwaysPreparedSpells(sources, input.ownedSpellIds);
}

export async function findMissingClassSpells(
  client: DatabaseClient,
  input: { classes: readonly ClassAtLevel[]; ownedSpellIds: readonly number[] },
): Promise<GrantedSpell[]> {
  if (!input.classes.length) return [];

  const rows = await client.classFeature.findMany({
    where: {
      classId: { in: input.classes.map((characterClass) => characterClass.classId) },
      feature: { givesSpells: { some: {} } },
    },
    select: {
      classId: true,
      levelGranted: true,
      feature: { select: { engName: true, name: true, givesSpells: { select: { spellId: true } } } },
    },
    orderBy: [{ levelGranted: "asc" }],
  });

  const sources = rows.flatMap((row) => {
    const characterClass = input.classes.find((candidate) => candidate.classId === row.classId);
    if (!characterClass) return [];

    return [{
      sourceKey: row.feature.engName,
      sourceName: row.feature.name,
      classLevel: characterClass.classLevel,
      ability: characterClass.ability,
      spells: row.feature.givesSpells.map((spell) => ({ spellId: spell.spellId, classLevel: row.levelGranted })),
    } satisfies AlwaysPreparedSpellSource];
  });

  return findEarnedAlwaysPreparedSpells(sources, input.ownedSpellIds);
}

/**
 * Третє джерело — обрана опція підкласу, яка сама несе заклинання: Коло землі 2024. Рівень
 * класу на звʼязку «фіча → заклинання» не стоїть, його виводить правило з рівня заклинання
 * (KR37.3). Лише 2024: 26 опцій 2014 теж мають заклинання на фічах, але їх дає інший шлях.
 */
/// Опції підкласу 2014 заклинань не несуть — крім покровителя Ордену нечестивої душі (O45), спільного для обох редакцій.
const SUBCLASS_OPTION_SPELLS_IN_BOTH_EDITIONS = ["ORDER_OF_THE_PROFANE_SOUL"] as const;

export async function findMissingSubclassOptionSpells(
  client: DatabaseClient,
  input: { choiceOptionIds: readonly number[]; subclasses: readonly SubclassAtClassLevel[]; ownedSpellIds: readonly number[] },
): Promise<GrantedSpell[]> {
  if (!input.choiceOptionIds.length || !input.subclasses.length) return [];

  const links = await client.subclassChoiceOption.findMany({
    where: {
      OR: [{ ruleset: "RULES_2024" }, { subclass: { name: { in: [...SUBCLASS_OPTION_SPELLS_IN_BOTH_EDITIONS] } } }],
      choiceOptionId: { in: [...input.choiceOptionIds] },
      subclassId: { in: input.subclasses.map((subclass) => subclass.subclassId) },
      choiceOption: { features: { some: { feature: { givesSpells: { some: {} } } } } },
    },
    select: {
      subclassId: true,
      levelsGranted: true,
      subclass: { select: { name: true, class: { select: { name: true } } } },
      choiceOption: {
        select: {
          optionName: true,
          optionNameEng: true,
          features: { select: { feature: { select: { givesSpells: { select: { spellId: true, level: true } } } } } },
        },
      },
    },
    orderBy: [{ choiceOptionId: "asc" }],
  });

  const options = links.flatMap((link): ChosenSubclassOption[] => {
    const subclass = input.subclasses.find((candidate) => candidate.subclassId === link.subclassId);
    if (!subclass) return [];

    return [{
      optionNameEng: link.choiceOption.optionNameEng,
      optionName: link.choiceOption.optionName,
      className: link.subclass.class.name,
      subclassName: link.subclass.name,
      pickLevel: Math.min(...link.levelsGranted),
      classLevel: subclass.classLevel,
      ability: subclass.ability,
      spells: link.choiceOption.features.flatMap((entry) =>
        entry.feature.givesSpells.map((spell) => ({ spellId: spell.spellId, spellLevel: spell.level })),
      ),
    }];
  });

  return findEarnedAlwaysPreparedSpells(buildSubclassOptionSpellSources(options), input.ownedSpellIds);
}

export type SubclassSpellGrants = { created: GrantedSpell[]; adopted: GrantedSpell[] };

/**
 * O48, рішення власника 2026-09-26: заклинання, яке гравець уже тримав своїм вибором (руками чи
 * кроком класу), підклас забирає собі — рядок стає «від підкласу, поза лімітом», і місце в
 * підготовці чи відомих звільняється. Рядок іншого правила (риса, вид) лишається своїм.
 */
type SubclassGrantInput = { persId: number; subclasses: readonly SubclassAtClassLevel[]; choiceOptionIds?: readonly number[] };

export async function saveSubclassSpellGrants(
  client: DatabaseClient,
  input: SubclassGrantInput & { learnedAtLevel: number },
): Promise<SubclassSpellGrants> {
  const grants = await findSubclassSpellGrants(client, input);
  await writeSubclassSpellGrants(client, { persId: input.persId, grants, learnedAtLevel: input.learnedAtLevel });
  return grants;
}

export async function findSubclassSpellGrants(client: DatabaseClient, input: SubclassGrantInput): Promise<SubclassSpellGrants> {
  const owned = await loadOwnedSpellRows(client, input.persId);
  const ruleGrantedIds = owned.filter(isRuleGrantedRow).map((row) => row.spellId);
  const fromSubclass = await findMissingSubclassSpells(client, { subclasses: input.subclasses, ownedSpellIds: ruleGrantedIds });
  const fromOptions = await findMissingSubclassOptionSpells2014(client, {
    choiceOptionIds: input.choiceOptionIds ?? [],
    subclasses: input.subclasses,
    ownedSpellIds: [...ruleGrantedIds, ...fromSubclass.map((spell) => spell.spellId)],
  });
  return splitGrantsByOwnership([...fromSubclass, ...fromOptions], owned);
}

/** Біом Кола землі 2014: опція несе таблицю «рівень друїда → заклинання» з файлу, а не звʼязок у базі. */
async function findMissingSubclassOptionSpells2014(
  client: DatabaseClient,
  input: { choiceOptionIds: readonly number[]; subclasses: readonly SubclassAtClassLevel[]; ownedSpellIds: readonly number[] },
): Promise<GrantedSpell[]> {
  const fileOptions = listSubclassOptionSpells2014();
  if (!input.choiceOptionIds.length || !input.subclasses.length) return [];

  const chosen = await client.choiceOption.findMany({
    where: { choiceOptionId: { in: [...input.choiceOptionIds] }, optionNameEng: { in: fileOptions.map((option) => option.optionNameEng) } },
    select: { optionNameEng: true, optionName: true },
  });
  if (!chosen.length) return [];

  const [subclassRows, spellRows] = await Promise.all([
    client.subclass.findMany({ where: { subclassId: { in: input.subclasses.map((subclass) => subclass.subclassId) } }, select: { subclassId: true, name: true } }),
    client.spell.findMany({ where: { ruleset: "RULES_2014", engName: { in: fileOptions.flatMap((option) => option.spells.map((spell) => spell.engName)) } }, select: { spellId: true, engName: true } }),
  ]);
  const subclassNameById = new Map(subclassRows.map((row) => [row.subclassId, String(row.name)]));
  const spellIdByName = new Map(spellRows.map((row) => [row.engName, row.spellId]));

  const sources = chosen.flatMap((option): AlwaysPreparedSpellSource[] => {
    const entry = fileOptions.find((candidate) => candidate.optionNameEng === option.optionNameEng);
    const subclass = input.subclasses.find((candidate) => subclassNameById.get(candidate.subclassId) === entry?.subclass);
    if (!entry || !subclass) return [];

    return [{
      sourceKey: option.optionNameEng,
      sourceName: option.optionName,
      classLevel: subclass.classLevel,
      ability: subclass.ability,
      spells: entry.spells.flatMap((spell) => {
        const spellId = spellIdByName.get(spell.engName);
        return spellId ? [{ spellId, classLevel: spell.classLevel }] : [];
      }),
    }];
  });
  return findEarnedAlwaysPreparedSpells(sources, input.ownedSpellIds);
}

export type OwnedSpellRow = { spellId: number; origin: SpellOrigin; excludeFromPreparedCount: boolean };

export async function loadOwnedSpellRows(client: DatabaseClient, persId: number): Promise<OwnedSpellRow[]> {
  return client.persSpell.findMany({ where: { persId }, select: { spellId: true, origin: true, excludeFromPreparedCount: true } });
}

/** Р53: заклинання, яке вже дало інше правило, лишається його; тримане гравцем — переходить до нового правила. */
export function splitGrantsByOwnership(granted: readonly GrantedSpell[], owned: readonly OwnedSpellRow[]): SubclassSpellGrants {
  const ruleGrantedIds = new Set(owned.filter(isRuleGrantedRow).map((row) => row.spellId));
  const ownChoiceIds = new Set(owned.filter((row) => !isRuleGrantedRow(row)).map((row) => row.spellId));
  const earned = granted.filter((spell) => !ruleGrantedIds.has(spell.spellId));
  return {
    created: earned.filter((spell) => !ownChoiceIds.has(spell.spellId)),
    adopted: earned.filter((spell) => ownChoiceIds.has(spell.spellId)),
  };
}

export async function writeSubclassSpellGrants(
  client: DatabaseClient,
  input: { persId: number; grants: SubclassSpellGrants; learnedAtLevel: number },
): Promise<void> {
  const { persId, grants } = input;
  if (grants.created.length) {
    await client.persSpell.createMany({ data: buildSubclassPersSpellRows(persId, grants.created, input.learnedAtLevel), skipDuplicates: true });
  }
  for (const spell of grants.adopted) {
    await client.persSpell.update({
      where: { persId_spellId: { persId, spellId: spell.spellId } },
      data: toGrantFields(spell, SUBCLASS_SPELL_BADGE_COLOR),
    });
  }
}

function isRuleGrantedRow(row: OwnedSpellRow): boolean {
  return row.origin !== SpellOrigin.MANUAL && row.excludeFromPreparedCount;
}

/**
 * Заклинання від правила лягають окремими рядками зі своїм джерелом і не зʼїдають ліміт
 * підготовки: книга каже «ви завжди маєте їх підготовленими», тобто понад норму класу.
 */
export function buildSubclassPersSpellRows(persId: number, spells: readonly GrantedSpell[], learnedAtLevel: number) {
  return spells.map((spell) => ({ persId, spellId: spell.spellId, learnedAtLevel, ...toGrantFields(spell, SUBCLASS_SPELL_BADGE_COLOR) }));
}

export function buildClassPersSpellRows(persId: number, spells: readonly GrantedSpell[], learnedAtLevel: number) {
  return spells.map((spell) => ({ persId, spellId: spell.spellId, learnedAtLevel, ...toGrantFields(spell, CLASS_SPELL_BADGE_COLOR) }));
}

function toGrantFields(spell: GrantedSpell, badgeColor: string) {
  return {
    origin: SpellOrigin.CLASS,
    sourceName: spell.sourceKey,
    isPrepared: true,
    badgeText: spell.sourceName.slice(0, 24),
    badgeColor,
    excludeFromPreparedCount: true,
    excludeFromKnownCount: true,
  };
}
