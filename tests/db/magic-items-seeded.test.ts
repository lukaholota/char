/**
 * KR14.5 — бʼє по spells_test, а не по JSON: доводить, що сід предметів реально доїхав
 * у базу. tests/content/magic-items-2014.test.ts перевіряє каталожний JSON і тому діри
 * «сід не прогнали» не бачить — прямий урок O13.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ItemRarity, MagicItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { readMagicItemBaseline } from "../../prisma/seed/magicItemBaseline";
import {
  applyBatchesToBaseline,
  readMagicItemBatches,
} from "../../prisma/seed/magicItemBatches";

/// Числа зняті з `spells_test` 2026-08-27 після партії 18 (KR16.4). Перекладений корпус
/// росте партіями, залишок старого перекладу тільки зменшується — обидві межі тут навмисно
/// точні. Попередній зріз (після партії 10 O14): 475 рядків, 268 перекладених, 207 залишку,
/// 124 без підпису. KR16.4 доклав 191 рядок — 146 нових і 45 переписаних, — тому каталог
/// 475 → 621, а залишок 207 → 162.
const SEEDED_ROWS = 621;
/// Каталог 2024 — data/2024/normalized/magic-items.json, залитий KR12.5.
const CATALOG_2024_ROWS = 445;
const TRANSLATED_ROWS = 459;
const UNTRANSLATED_ROWS = 162;
const UNTRANSLATED_WITHOUT_SHORT_DESCRIPTION = 82;
const UNTRANSLATED_WITH_URON = 27;

const ITEM_TYPE_DISTRIBUTION: Record<MagicItemType, number> = {
  ARMOR: 55,
  POTION: 52,
  RING: 26,
  ROD: 12,
  SCROLL: 12,
  STAFF: 30,
  WAND: 21,
  WEAPON: 98,
  WONDROUS_ITEM: 315,
};

const RARITY_DISTRIBUTION: Record<ItemRarity, number> = {
  COMMON: 61,
  UNCOMMON: 156,
  RARE: 174,
  VERY_RARE: 127,
  LEGENDARY: 81,
  ARTIFACT: 22,
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
const effectiveTranslatedRows = applyBatchesToBaseline(
  readMagicItemBaseline(),
  batchRows,
  { requireAllTerminologyCorrections: true },
).items.filter((row) => translatedIds.has(Number(row.magicItemId)));

/// Ця звірка навмисно порівнює базу з файлами **напряму**, без жодного проходу поверх.
/// 2026-09-01 вона падала на шести променевих предметах, бо `seed:radiant-terminology`
/// правив текст уже після партій. Правильним виявилося не вчити звірку про той прохід, а
/// прибрати прохід: правки влиті в партії, предметів у корекційному файлі більше немає
/// ([Р33](../../docs/DECISIONS.md#р33)). Якщо цей тест знову почервоніє на тексті — шукати
/// новий прохід поверх сіду, а не додавати сюди його копію.

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
  /// До KR12.5 тут стояло «і жодного предмета іншої редакції»: таблиця тримала лише 2014.
  /// Тепер поруч лежить каталог 2024 ([Р28]), і сенс перевірки інший — сід 2014 не має ні
  /// залазити в чужу редакцію, ні недораховувати свою. Рядки 2024 живуть у власному тесті
  /// tests/db/magic-items-2024-seeded.test.ts.
  it("корпус 2014 повний, а редакції не перемішані", async () => {
    expect(seeded.length).toBe(SEEDED_ROWS);
    expect(await prisma.magicItem.count({ where: { ruleset: "RULES_2014" } })).toBe(SEEDED_ROWS);
    expect(await prisma.magicItem.count()).toBe(SEEDED_ROWS + CATALOG_2024_ROWS);
  });

  it("engName і magicItemId унікальні в межах RULES_2014", () => {
    expect(new Set(seeded.map((item) => item.engName)).size).toBe(SEEDED_ROWS);
    expect(new Set(seeded.map((item) => item.magicItemId)).size).toBe(SEEDED_ROWS);
  });

  it("кожен рядок партії стоїть у базі своїм текстом", () => {
    const byId = new Map(seeded.map((item) => [item.magicItemId, item]));
    const mismatched: string[] = [];

    for (const row of effectiveTranslatedRows) {
      const magicItemId = Number(row.magicItemId);
      const item = byId.get(magicItemId);
      if (!item) {
        mismatched.push(`${magicItemId} ${row.engName}: у базі немає`);
        continue;
      }
      const differences = [
        item.engName === row.engName ? null : "engName",
        item.name === row.name ? null : "name",
        item.itemType === row.itemType ? null : "itemType",
        item.rarity === row.rarity ? null : "rarity",
        item.requiresAttunement === row.requiresAttunement ? null : "requiresAttunement",
        (item.shortDescription ?? "") === (row.shortDescription ?? "") ? null : "shortDescription",
        item.description === row.description ? null : "description",
      ].filter(Boolean);

      if (differences.length > 0) {
        mismatched.push(`${magicItemId} ${row.engName}: ${differences.join(", ")}`);
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
