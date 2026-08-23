/**
 * KR14.5 — б'є по spells_test, а не по JSON: доводить, що сід предметів реально доїхав
 * у базу. tests/content/magic-items-2014.test.ts перевіряє каталожний JSON і тому діри
 * «сід не прогнали» не бачить — прямий урок O13.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ItemRarity, MagicItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { readMagicItemBatches } from "../../prisma/seed/magicItemBatches";

/// Числа зняті з бази 2026-08-22 після партії 10. Перекладений корпус росте партіями,
/// залишок старого перекладу тільки зменшується — обидві межі тут навмисно точні.
const SEEDED_ROWS = 475;
const TRANSLATED_ROWS = 268;
const UNTRANSLATED_ROWS = 207;
const UNTRANSLATED_WITHOUT_SHORT_DESCRIPTION = 124;
const UNTRANSLATED_WITH_URON = 27;

const ITEM_TYPE_DISTRIBUTION: Record<MagicItemType, number> = {
  ARMOR: 38,
  POTION: 51,
  RING: 22,
  ROD: 11,
  SCROLL: 12,
  STAFF: 26,
  WAND: 18,
  WEAPON: 63,
  WONDROUS_ITEM: 234,
};

const RARITY_DISTRIBUTION: Record<ItemRarity, number> = {
  COMMON: 56,
  UNCOMMON: 125,
  RARE: 129,
  VERY_RARE: 96,
  LEGENDARY: 61,
  ARTIFACT: 8,
};

/// Затверджене написання — «ХП»; «хіт поїнт» лишився тільки в неперекладеному залишку.
const HIT_POINTS_SPELLINGS = {
  "ХП": /(^|[^\p{L}])ХП($|[^\p{L}])/u,
  "хіт поїнт": /хіт[-\s]по[ії]нт/iu,
} as const;

const UKRAINIAN_NAME_WITH_ENGLISH = /^\S.*\s\[.+\]$/u;
const URON = /урон/iu;

type SeededItem = {
  magicItemId: number;
  engName: string;
  name: string;
  itemType: MagicItemType;
  rarity: ItemRarity;
  requiresAttunement: boolean;
  shortDescription: string | null;
  description: string;
};

const batchRows = readMagicItemBatches();
const translatedIds = new Set(batchRows.map((row) => row.magicItemId));

let seeded: SeededItem[] = [];
let translated: SeededItem[] = [];
let untranslated: SeededItem[] = [];

beforeAll(async () => {
  seeded = await prisma.magicItem.findMany({
    where: { ruleset: "RULES_2014" },
    orderBy: { magicItemId: "asc" },
    select: {
      magicItemId: true,
      engName: true,
      name: true,
      itemType: true,
      rarity: true,
      requiresAttunement: true,
      shortDescription: true,
      description: true,
    },
  });
  translated = seeded.filter((item) => translatedIds.has(item.magicItemId));
  untranslated = seeded.filter((item) => !translatedIds.has(item.magicItemId));
});

afterAll(disconnectDatabase);

function readSearchableText(item: SeededItem): string {
  return `${item.name}\n${item.shortDescription ?? ""}\n${item.description}`;
}

function countBy<T extends string>(items: SeededItem[], readKey: (item: SeededItem) => T): Record<T, number> {
  const counts = {} as Record<T, number>;
  for (const item of items) {
    const key = readKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

describe("сід магічних предметів у базі", () => {
  it("база містить увесь корпус 2014 і жодного предмета іншої редакції", async () => {
    expect(seeded.length).toBe(SEEDED_ROWS);
    expect(await prisma.magicItem.count()).toBe(SEEDED_ROWS);
  });

  it("engName і magicItemId унікальні в межах RULES_2014", () => {
    expect(new Set(seeded.map((item) => item.engName)).size).toBe(SEEDED_ROWS);
    expect(new Set(seeded.map((item) => item.magicItemId)).size).toBe(SEEDED_ROWS);
  });

  it("кожен рядок партії стоїть у базі своїм текстом", () => {
    const byId = new Map(seeded.map((item) => [item.magicItemId, item]));
    const mismatched: string[] = [];

    for (const row of batchRows) {
      const item = byId.get(row.magicItemId);
      if (!item) {
        mismatched.push(`${row.magicItemId} ${row.engName}: у базі немає`);
        continue;
      }
      const differences = [
        item.engName === row.engName ? null : "engName",
        item.name === row.name ? null : "name",
        item.itemType === row.itemType ? null : "itemType",
        item.rarity === row.rarity ? null : "rarity",
        item.requiresAttunement === row.requiresAttunement ? null : "requiresAttunement",
        (item.shortDescription ?? "") === row.shortDescription ? null : "shortDescription",
        item.description === row.description ? null : "description",
      ].filter(Boolean);

      if (differences.length > 0) {
        mismatched.push(`${row.magicItemId} ${row.engName}: ${differences.join(", ")}`);
      }
    }

    expect(mismatched).toEqual([]);
    expect(translated.length).toBe(TRANSLATED_ROWS);
  });

  it("кожен перекладений предмет має непорожній shortDescription", () => {
    const empty = translated
      .filter((item) => !item.shortDescription?.trim())
      .map((item) => `${item.magicItemId} ${item.engName}`);

    expect(empty).toEqual([]);
  });

  it("назва перекладеного предмета має формат «Українська [English]»", () => {
    const malformed = translated
      .filter((item) => !UKRAINIAN_NAME_WITH_ENGLISH.test(item.name))
      .map((item) => `${item.magicItemId} ${item.name}`);

    expect(malformed).toEqual([]);
  });

  it("перекладений корпус не містить «урон» — словникове слово «шкода»", () => {
    const withUron = translated
      .filter((item) => URON.test(readSearchableText(item)))
      .map((item) => `${item.magicItemId} ${item.engName}`);

    expect(withUron).toEqual([]);
  });

  it("перекладений корпус тримає одне написання хіт-поїнтів", () => {
    const usedSpellings = Object.entries(HIT_POINTS_SPELLINGS)
      .filter(([, pattern]) => translated.some((item) => pattern.test(readSearchableText(item))))
      .map(([label]) => label);

    expect(usedSpellings).toEqual(["ХП"]);
  });

  /// Невалідного itemType чи rarity в базі бути не може — це енуми Postgres, і Prisma
  /// відмовляється десеріалізувати чуже значення ще до перевірки. Червоніти має інше:
  /// сід, який мовчки пересортував предмети між типами й рідкостями.
  it("розподіл предметів за типом і рідкістю не поїхав", () => {
    expect(countBy(seeded, (item) => item.itemType)).toEqual(ITEM_TYPE_DISTRIBUTION);
    expect(countBy(seeded, (item) => item.rarity)).toEqual(RARITY_DISTRIBUTION);
  });

  it("описи непорожні по всьому корпусу", () => {
    const tooShort = seeded
      .filter((item) => item.description.trim().length <= 10)
      .map((item) => `${item.magicItemId} ${item.engName}`);

    expect(tooShort).toEqual([]);
  });

  /// Залишок старого перекладу — черга O14, а не норма. Числа тільки зменшуються:
  /// наступна партія має опустити їх, а не лишити на місці.
  it("залишок старого перекладу не росте", () => {
    expect(untranslated.length).toBe(UNTRANSLATED_ROWS);
    expect(untranslated.filter((item) => !item.shortDescription?.trim()).length).toBe(
      UNTRANSLATED_WITHOUT_SHORT_DESCRIPTION,
    );
    expect(untranslated.filter((item) => URON.test(readSearchableText(item))).length).toBe(
      UNTRANSLATED_WITH_URON,
    );
  });
});

describe("колонки, яких партії не називають", () => {
  it("механічні колонки і звʼязок із заклинаннями сід не зачіпає", async () => {
    const [mechanics] = await prisma.$queryRawUnsafe<
      Array<{
        bonus_to_ac: bigint;
        bonus_to_saving_throws: bigint;
        weapon_proficiencies_special: bigint;
        no_armor_or_shield: bigint;
      }>
    >(
      `SELECT count(bonus_to_ac)::bigint AS bonus_to_ac,
              count(bonus_to_saving_throws)::bigint AS bonus_to_saving_throws,
              count(weapon_proficiencies_special)::bigint AS weapon_proficiencies_special,
              count(no_armor_or_shield_for_ac_bonus)::bigint AS no_armor_or_shield
       FROM magic_item`,
    );

    expect(Number(mechanics.bonus_to_ac)).toBe(14);
    expect(Number(mechanics.bonus_to_saving_throws)).toBe(5);
    expect(Number(mechanics.weapon_proficiencies_special)).toBe(1);
    expect(Number(mechanics.no_armor_or_shield)).toBe(1);

    const [links] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT count(*)::bigint AS count FROM "_MagicItemToSpell"',
    );
    expect(Number(links.count)).toBe(48);
  });
});
