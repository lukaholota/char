/**
 * KR16.5 — бʼє по spells_test, а не по JSON: доводить, що обладунок 2024 і виправлені
 * набори спорядження реально доїхали в базу. `tests/content/5etools-equipment.test.ts`
 * перевіряє каталожні файли й тому діри «сід не прогнали» не бачить — прямий урок O13
 * і KR14.5.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ArmorCategory, EquipmentPackCategory, Ruleset } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { EQUIPMENT_PACKS_2014, EQUIPMENT_PACKS_2024 } from "../../prisma/seed/equipmentPackSeed";
import { readBaseItems } from "../../scripts/5etools/schema";
import { ARMOR_NAME_IN_SOURCE, ARMOR_TYPE_BY_TYPE_CODE } from "../../scripts/5etools/equipment-registry";

/// Зріз 2026-09-04. Каталог 2014 — 13 категорій книги, `HOMEBREW` і шість джерел КБ;
/// каталог 2024 — 13 категорій книги плюс три альтернативні формули базового КЗ, які KR27.8
/// завів тими самими рядками `armor`, що й беззбройний захист 2014.
const ARMOR_ROWS_2014 = 20;
const ARMOR_ROWS_2024 = 16;

/// У книзі це фічі класу, а не обладунок, тому звірка з XPHB їх пропускає — як пропускає
/// джерела КБ 2014.
const ARMOR_CLASS_FORMULAS_2024: ArmorCategory[] = [
  "UNARMORED_DEFENSE_MONK",
  "UNARMORED_DEFENSE_BARBARIAN",
  "DRACONIC_RESILIENCE",
];

const STANDARD_CATEGORIES: ArmorCategory[] = [
  "PADDED", "LEATHER", "STUDDED_LEATHER", "HIDE", "CHAIN_SHIRT", "SCALE_MAIL",
  "BREASTPLATE", "HALF_PLATE", "RING_MAIL", "CHAIN_MAIL", "SPLINT", "PLATE", "SHIELD",
];

type SeededArmor = {
  armorId: number;
  name: ArmorCategory;
  armorType: string;
  baseAC: number;
  strengthReq: number | null;
  stealthDisadvantage: boolean;
  abilityBonusType: string;
  abilityBonuses: string[];
  ruleset: Ruleset;
};

let armor: SeededArmor[] = [];

beforeAll(async () => {
  armor = await prisma.armor.findMany({
    orderBy: { armorId: "asc" },
    select: {
      armorId: true,
      name: true,
      armorType: true,
      baseAC: true,
      strengthReq: true,
      stealthDisadvantage: true,
      abilityBonusType: true,
      abilityBonuses: true,
      ruleset: true,
    },
  });
});

afterAll(disconnectDatabase);

function rowsOf(ruleset: Ruleset): SeededArmor[] {
  return armor.filter((row) => row.ruleset === ruleset);
}

describe("обладунок 2024 у базі", () => {
  it("обидві редакції тримають повний перелік стандартних категорій", () => {
    const missing2014 = STANDARD_CATEGORIES.filter(
      (category) => !rowsOf("RULES_2014").some((row) => row.name === category)
    );
    const missing2024 = STANDARD_CATEGORIES.filter(
      (category) => !rowsOf("RULES_2024").some((row) => row.name === category)
    );

    expect(missing2014).toEqual([]);
    expect(missing2024).toEqual([]);
    expect(rowsOf("RULES_2014").length).toBe(ARMOR_ROWS_2014);
    expect(rowsOf("RULES_2024").length).toBe(ARMOR_ROWS_2024);
  });

  /// Саме тут ловиться дефект, з якого KR16.5 почався: `PADDED` стояв у RULES_2024 і
  /// каталог 2014 губив рядок при кожній перегенерації.
  it("жодна категорія не стоїть лише в одній редакції", () => {
    const stranded = STANDARD_CATEGORIES.filter((category) => {
      const editions = armor.filter((row) => row.name === category).map((row) => row.ruleset);
      return new Set(editions).size !== 2;
    });

    expect(stranded).toEqual([]);
  });

  it("пара «назва + редакція» унікальна", () => {
    const keys = armor.map((row) => `${row.name}|${row.ruleset}`);
    expect(new Set(keys).size).toBe(armor.length);
  });

  it("кожен рядок 2024 збігається з XPHB поле-в-поле", () => {
    const inBook = new Map(
      readBaseItems()
        .filter((item) => item.source === "XPHB")
        .map((item) => [item.nameEng, item])
    );

    const mismatched: string[] = [];
    for (const row of rowsOf("RULES_2024").filter((row) => !ARMOR_CLASS_FORMULAS_2024.includes(row.name))) {
      const source = inBook.get(ARMOR_NAME_IN_SOURCE[row.name] ?? row.name);

      if (source === undefined) {
        mismatched.push(`${row.name}: немає в XPHB`);
        continue;
      }

      const differences = [
        row.armorType === ARMOR_TYPE_BY_TYPE_CODE[source.typeCode] ? null : "armorType",
        row.baseAC === source.armorClass ? null : "baseAC",
        row.strengthReq === source.strengthRequirement ? null : "strengthReq",
        row.stealthDisadvantage === source.hasStealthDisadvantage ? null : "stealthDisadvantage",
      ].filter(Boolean);

      if (differences.length > 0) mismatched.push(`${row.name}: ${differences.join(", ")}`);
    }

    expect(mismatched).toEqual([]);
  });

  /// KR27.8: альтернативна формула базового КЗ живе рядком `armor`, який гравець вдягає, — саме
  /// так «одна за раз» із SRD 2024 тримається наявним прапорцем `equipped`, без другого сховища.
  it("три альтернативні формули базового КЗ стоять у 2024 зі своїми характеристиками", () => {
    const formulas = Object.fromEntries(
      rowsOf("RULES_2024")
        .filter((row) => ARMOR_CLASS_FORMULAS_2024.includes(row.name))
        .map((row) => [row.name, { baseAC: row.baseAC, abilityBonuses: [...row.abilityBonuses].sort() }]),
    );

    expect(formulas).toEqual({
      UNARMORED_DEFENSE_MONK: { baseAC: 10, abilityBonuses: ["DEX", "WIS"] },
      UNARMORED_DEFENSE_BARBARIAN: { baseAC: 10, abilityBonuses: ["CON", "DEX"] },
      DRACONIC_RESILIENCE: { baseAC: 10, abilityBonuses: ["CHA", "DEX"] },
    });
  });
});

describe("набори спорядження в базі", () => {
  it("кожен набір лежить у базі рівно тим вмістом, який тримає сід", async () => {
    const seeded = await readSeededPacks();
    const byKey = new Map(seeded.map((pack) => [`${pack.name}|${pack.ruleset}`, pack]));

    const mismatched = [
      ...describeMismatches(EQUIPMENT_PACKS_2014, "RULES_2014", byKey),
      ...describeMismatches(EQUIPMENT_PACKS_2024, "RULES_2024", byKey),
    ];

    expect(mismatched).toEqual([]);
    expect(seeded.length).toBe(EQUIPMENT_PACKS_2014.length + EQUIPMENT_PACKS_2024.length);
  });

  it("пара «категорія + редакція» унікальна", async () => {
    const seeded = await readSeededPacks();
    const keys = seeded.map((pack) => `${pack.name}|${pack.ruleset}`);

    expect(new Set(keys).size).toBe(seeded.length);
  });

  /// KR26.1 — головна перевірка: набір 2024 мусить бути набором 2024, а не копією 2014 під
  /// іншою редакцією. Голої нерівності мало — вона проходить і на випадковій дрібниці, — тому
  /// звіряються поіменні речі, які книга 2024 додала або прибрала (`data/2024/srd/equipment.md`).
  it("вміст 2024 розходиться з 2014 саме там, де розходиться книга", async () => {
    const packsByEdition = await readPacksByEdition();
    const wrong: string[] = [];

    for (const [category, change] of Object.entries(BOOK_CHANGED_IN_2024)) {
      const in2014 = packsByEdition.get(`${category}|RULES_2014`);
      const in2024 = packsByEdition.get(`${category}|RULES_2024`);

      if (!in2014 || !in2024) {
        wrong.push(`${category}: категорії немає в обох редакціях`);
        continue;
      }
      if (JSON.stringify(in2014) === JSON.stringify(in2024)) {
        wrong.push(`${category}: вміст 2024 дослівно повторює 2014`);
        continue;
      }

      const names2014 = new Set(in2014.map((item) => item.name));
      const names2024 = new Set(in2024.map((item) => item.name));

      for (const added of change.added) {
        if (!names2024.has(added)) wrong.push(`${category}: у 2024 немає «${added}»`);
        if (names2014.has(added)) wrong.push(`${category}: «${added}» не мала б стояти в 2014`);
      }
      for (const removed of change.removed) {
        if (names2024.has(removed)) wrong.push(`${category}: у 2024 лишилася «${removed}» з 2014`);
        if (!names2014.has(removed)) wrong.push(`${category}: у 2014 немає «${removed}»`);
      }
    }

    expect(wrong).toEqual([]);
  });

  it("у назвах речей 2024 немає латиниці", async () => {
    const packsByEdition = await readPacksByEdition();

    const latin = [...packsByEdition]
      .filter(([key]) => key.endsWith("|RULES_2024"))
      .flatMap(([key, items]) =>
        items.filter((item) => /[A-Za-z]/.test(item.name)).map((item) => `${key}: ${item.name}`)
      );

    expect(latin).toEqual([]);
  });
});

/// Що саме книга 2024 переписала в кожному з шести наборів. Джерело — розділ Equipment Packs
/// у `data/2024/srd/equipment.md`; українські назви — ратифікований переклад тієї ж глави,
/// `data/2024/rules-uk/batch-31.json`.
const BOOK_CHANGED_IN_2024: Record<string, { added: string[]; removed: string[] }> = {
  BURGLARS_PACK: {
    added: ["Металеві кульки", "Мотузка"],
    removed: ["Мішок з 1000 кульок", "Нитка (10 футів)", "Молоток", "Кілок", "Конопляна мотузка (50 футів)"],
  },
  DUNGEONEERS_PACK: {
    added: ["Шипи-часник", "Фляга олії", "Мотузка"],
    removed: ["Молоток", "Кілок", "Конопляна мотузка (50 футів)"],
  },
  ENTERTAINERS_PACK: {
    added: ["Дзвіночок", "Ліхтар-прожектор", "Дзеркало", "Фляга олії", "Вогниво"],
    removed: ["Свічка", "Набір для маскування"],
  },
  EXPLORERS_PACK: {
    added: ["Фляга олії", "Мотузка"],
    removed: ["Набір для приготування їжі", "Конопляна мотузка (50 футів)"],
  },
  PRIESTS_PACK: {
    added: ["Свята вода", "Лампа", "Мантія"],
    removed: ["Свічка", "Скринька для милостині", "Брусок ладану", "Кадило", "Ризи", "Бурдюк"],
  },
  SCHOLARS_PACK: {
    added: ["Книга", "Чорнило", "Лампа", "Фляга олії", "Вогниво"],
    removed: ["Книга знань", "Пляшка чорнила", "Маленький мішечок піску", "Маленький ніж"],
  },
};

type SeededPack = {
  name: EquipmentPackCategory;
  ruleset: Ruleset;
  description: string;
  items: unknown;
};

function readSeededPacks(): Promise<SeededPack[]> {
  return prisma.equipmentPack.findMany({
    orderBy: { equipmentPackId: "asc" },
    select: { name: true, ruleset: true, description: true, items: true },
  }) as Promise<SeededPack[]>;
}

async function readPacksByEdition(): Promise<Map<string, Array<{ name: string; quantity: number }>>> {
  const seeded = await readSeededPacks();

  return new Map(
    seeded.map((pack) => [
      `${pack.name}|${pack.ruleset}`,
      pack.items as Array<{ name: string; quantity: number }>,
    ])
  );
}

function describeMismatches(
  expectedPacks: Array<{ name: unknown; description: string; items: unknown }>,
  ruleset: Ruleset,
  byKey: Map<string, SeededPack>
): string[] {
  return expectedPacks.flatMap((expected) => {
    const key = `${expected.name as EquipmentPackCategory}|${ruleset}`;
    const found = byKey.get(key);

    if (found === undefined) return [`${key}: у базі немає`];
    if (found.description !== expected.description) return [`${key}: description`];
    if (JSON.stringify(found.items) !== JSON.stringify(expected.items)) return [`${key}: items`];
    return [];
  });
}
