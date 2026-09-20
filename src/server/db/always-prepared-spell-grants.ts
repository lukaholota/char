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

import { subclassTranslations } from "@/lib/refs/translation";
import { findEarnedAlwaysPreparedSpells, type AlwaysPreparedSpellSource } from "@/rules/always-prepared-spells";
import { buildSubclassOptionSpellSources, type ChosenSubclassOption } from "@/rules/subclass-option-spells-2024";
import type { GrantedSpell } from "@/rules/spell-sources";
import type { AbilityKey } from "@/rules/types";

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
      sourceName: subclassTranslations[key as keyof typeof subclassTranslations] ?? key,
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
export async function findMissingSubclassOptionSpells(
  client: DatabaseClient,
  input: { choiceOptionIds: readonly number[]; subclasses: readonly SubclassAtClassLevel[]; ownedSpellIds: readonly number[] },
): Promise<GrantedSpell[]> {
  if (!input.choiceOptionIds.length || !input.subclasses.length) return [];

  const links = await client.subclassChoiceOption.findMany({
    where: {
      ruleset: "RULES_2024",
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

/**
 * Заклинання від правила лягають окремими рядками зі своїм джерелом і не зʼїдають ліміт
 * підготовки: книга каже «ви завжди маєте їх підготовленими», тобто понад норму класу.
 */
export function buildSubclassPersSpellRows(persId: number, spells: readonly GrantedSpell[], learnedAtLevel: number) {
  return spells.map((spell) => toPersSpellRow(persId, spell, learnedAtLevel, SUBCLASS_SPELL_BADGE_COLOR));
}

export function buildClassPersSpellRows(persId: number, spells: readonly GrantedSpell[], learnedAtLevel: number) {
  return spells.map((spell) => toPersSpellRow(persId, spell, learnedAtLevel, CLASS_SPELL_BADGE_COLOR));
}

function toPersSpellRow(persId: number, spell: GrantedSpell, learnedAtLevel: number, badgeColor: string) {
  return {
    persId,
    spellId: spell.spellId,
    learnedAtLevel,
    origin: SpellOrigin.CLASS,
    sourceName: spell.sourceKey,
    isPrepared: true,
    badgeText: spell.sourceName.slice(0, 24),
    badgeColor,
    excludeFromPreparedCount: true,
    excludeFromKnownCount: true,
  };
}
