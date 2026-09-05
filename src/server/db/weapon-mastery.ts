/**
 * KR18.6 — читання й запис майстерності зброї.
 *
 * Ємність тут не зберігається: вона щоразу виводиться з прогресії класів персонажа
 * ([`src/rules/weapon-mastery.ts`](../../rules/weapon-mastery.ts)). У базі лежить лише вибір гравця.
 */

import type { Prisma, PrismaClient, Ruleset } from "@prisma/client";
import { findMainClassLevel } from "@/rules/hit-dice";
import {
  type MasteryClassOffer,
  type MasteryWeapon,
  findWeaponMasteryCapacity,
  findWeaponMasteryOptionsForClasses,
  limitWeaponMasteryChoice,
} from "@/rules/weapon-mastery";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type OfferedMasteryWeapon = MasteryWeapon & { sortOrder: number };

export type WeaponMasteryOffer = {
  capacity: number;
  options: OfferedMasteryWeapon[];
  selectedWeaponIds: number[];
};

const MASTERY_CLASS_SELECT = {
  name: true,
  weapon_mastery_progression: true,
  weaponProficiencies: true,
  weaponProficienciesSpecial: true,
} as const;

type MasteryClassRow = Prisma.ClassGetPayload<{ select: typeof MASTERY_CLASS_SELECT }>;

/** Пул конструктора: один клас першого рівня, вибору ще немає. */
export async function findCreationWeaponMasteryOffer(
  client: DatabaseClient,
  input: { classId: number; ruleset: Ruleset },
): Promise<WeaponMasteryOffer> {
  const characterClass = await client.class.findUnique({
    where: { classId: input.classId },
    select: MASTERY_CLASS_SELECT,
  });
  if (!characterClass) return emptyOffer();

  const weapons = await findMasteryWeapons(client, input.ruleset);
  return buildOffer([{ row: characterClass, classLevel: 1 }], weapons, []);
}

/** Пул листа персонажа й підвищення рівня: усі класи персонажа зі своїми рівнями. */
export async function findPersWeaponMasteryOffer(
  client: DatabaseClient,
  persId: number,
): Promise<WeaponMasteryOffer> {
  const pers = await client.pers.findUnique({
    where: { persId },
    select: {
      level: true,
      ruleset: true,
      class: { select: MASTERY_CLASS_SELECT },
      multiclasses: { select: { classLevel: true, class: { select: MASTERY_CLASS_SELECT } } },
      pers_weapon_mastery: { select: { weapon_id: true }, orderBy: { pers_weapon_mastery_id: "asc" } },
    },
  });
  if (!pers) return emptyOffer();

  const classes = [
    { row: pers.class, classLevel: findMainClassLevel(pers.level, pers.multiclasses) },
    ...pers.multiclasses.map((entry) => ({ row: entry.class, classLevel: entry.classLevel })),
  ];
  const weapons = await findMasteryWeapons(client, pers.ruleset);

  return buildOffer(classes, weapons, pers.pers_weapon_mastery.map((entry) => entry.weapon_id));
}

/**
 * Вибір змінний будь-коли, не лише після довгого відпочинку (рішення власника 2026-08-30) — тому
 * запис завжди повний перезапис, а не доливання.
 */
export async function replacePersWeaponMastery(
  client: DatabaseClient,
  persId: number,
  weaponIds: readonly number[],
  offer: WeaponMasteryOffer,
): Promise<number[]> {
  const kept = limitWeaponMasteryChoice(weaponIds, offer.options, offer.capacity);

  await client.pers_weapon_mastery.deleteMany({ where: { pers_id: persId, NOT: { weapon_id: { in: kept } } } });
  if (kept.length > 0) {
    await client.pers_weapon_mastery.createMany({
      data: kept.map((weaponId) => ({ pers_id: persId, weapon_id: weaponId })),
      skipDuplicates: true,
    });
  }

  return kept;
}

function buildOffer(
  classes: Array<{ row: MasteryClassRow; classLevel: number }>,
  weapons: OfferedMasteryWeapon[],
  selectedWeaponIds: number[],
): WeaponMasteryOffer {
  const capacity = findWeaponMasteryCapacity(toClassOffers(classes));
  if (capacity === 0) return emptyOffer();

  const options = findWeaponMasteryOptionsForClasses(toClassOffers(classes), weapons);
  return { capacity, options, selectedWeaponIds };
}

function toClassOffers(classes: Array<{ row: MasteryClassRow; classLevel: number }>): MasteryClassOffer[] {
  return classes.map(({ row, classLevel }) => ({
    className: row.name,
    classLevel,
    masteryProgression: row.weapon_mastery_progression,
    weaponProficiencies: row.weaponProficiencies,
    weaponProficienciesSpecial: row.weaponProficienciesSpecial,
  }));
}

async function findMasteryWeapons(client: DatabaseClient, ruleset: Ruleset): Promise<OfferedMasteryWeapon[]> {
  const weapons = await client.weapon.findMany({
    where: { ruleset, mastery: { not: null } },
    select: { weaponId: true, name: true, mastery: true, weaponType: true, isRanged: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { weaponId: "asc" }],
  });

  return weapons;
}

function emptyOffer(): WeaponMasteryOffer {
  return { capacity: 0, options: [], selectedWeaponIds: [] };
}
