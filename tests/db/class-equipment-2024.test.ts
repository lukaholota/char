/**
 * KR26.2 — гейт «сід не розійшовся з книгою».
 *
 * Бʼє по `spells_test`, а не по JSON: діру «сід написали, але не прогнали» каталожні тести не
 * бачать (урок O13 і KR14.5). Очікуване береться не з константи, а з того самого розбору
 * книжкового тексту, який будує сід, — інакше тест перевіряв би, що сід дорівнює сам собі.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Ruleset } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { parseClassEquipment2024 } from "../../scripts/parse-2024-class-equipment";
import { BLOOD_HUNTER_CLASS_NAMES } from "../../prisma/seed/bloodHunter";

const ROWS_2014 = 113;

/// Мисливець за кровʼю — власний носій O45, його звіряє blood-hunter-carrier.
const WITHOUT_BLOOD_HUNTER = { class: { name: { notIn: [...BLOOD_HUNTER_CLASS_NAMES] } } };

type SeededRow = {
  option: string;
  quantity: number;
  item: string | null;
  ruleset: Ruleset;
  class: { name: string };
  weapon: { name: string } | null;
  armor: { name: string } | null;
  equipmentPack: { name: string; ruleset: Ruleset } | null;
};

let rows2024: SeededRow[] = [];

beforeAll(async () => {
  rows2024 = await prisma.classStartingEquipmentOption.findMany({
    where: { ruleset: "RULES_2024", ...WITHOUT_BLOOD_HUNTER },
    select: {
      option: true, quantity: true, item: true, ruleset: true,
      class: { select: { name: true } },
      weapon: { select: { name: true } },
      armor: { select: { name: true } },
      equipmentPack: { select: { name: true, ruleset: true } },
    },
  });
});

afterAll(disconnectDatabase);

const toClassEnum = (engName: string) => `${engName.toUpperCase()}_2024`;

const countByLetter = (className: string): Map<string, number> => {
  const tally = new Map<string, number>();
  for (const row of rows2024.filter((r) => r.class.name === className)) {
    tally.set(row.option, (tally.get(row.option) ?? 0) + 1);
  }
  return tally;
};

describe("класове спорядження 2024 в базі", () => {
  it("кожен із 13 класів має рядки", () => {
    const empty = parseClassEquipment2024()
      .map((cls) => toClassEnum(cls.engName))
      .filter((name) => !rows2024.some((row) => row.class.name === name));

    expect(empty).toEqual([]);
    expect(new Set(rows2024.map((r) => r.class.name)).size).toBe(13);
  });

  /// Ядро KR26.2: набір літер і кількість рядків під кожною літерою — рівно як у книзі.
  it("набір літер і склад кожної літери збігається з книгою", () => {
    const wrong: string[] = [];

    for (const cls of parseClassEquipment2024()) {
      const className = toClassEnum(cls.engName);
      const inBase = countByLetter(className);
      const inBook = new Map(cls.options.map((o) => [o.letter, o.entries.length]));

      const lettersInBase = [...inBase.keys()].sort().join("");
      const lettersInBook = [...inBook.keys()].sort().join("");
      if (lettersInBase !== lettersInBook) {
        wrong.push(`${cls.engName}: літери «${lettersInBase}», книга каже «${lettersInBook}»`);
        continue;
      }

      for (const [letter, expected] of inBook) {
        const actual = inBase.get(letter) ?? 0;
        if (actual !== expected) {
          wrong.push(`${cls.engName} (${letter}): рядків ${actual}, у книзі ${expected}`);
        }
      }
    }

    expect(wrong).toEqual([]);
  });

  /// Не тільки скільки рядків, а й що саме в них: кількість кожного предмета теж із книги.
  it("кількість кожного предмета збігається з книгою", () => {
    const wrong: string[] = [];

    for (const cls of parseClassEquipment2024()) {
      const className = toClassEnum(cls.engName);
      for (const option of cls.options) {
        const quantitiesInBase = rows2024
          .filter((r) => r.class.name === className && r.option === option.letter)
          .map((r) => r.quantity)
          .sort((a, b) => a - b);
        const quantitiesInBook = option.entries.map((e) => e.quantity).sort((a, b) => a - b);

        if (quantitiesInBase.join(",") !== quantitiesInBook.join(",")) {
          wrong.push(
            `${cls.engName} (${option.letter}): кількості [${quantitiesInBase}], у книзі [${quantitiesInBook}]`
          );
        }
      }
    }

    expect(wrong).toEqual([]);
  });

  it("жоден рядок 2024 не тягне набір чужої редакції", () => {
    const foreign = rows2024
      .filter((row) => row.equipmentPack && row.equipmentPack.ruleset !== "RULES_2024")
      .map((row) => `${row.class.name}: ${row.equipmentPack!.name} / ${row.equipmentPack!.ruleset}`);

    expect(foreign).toEqual([]);
  });

  it("у назвах предметів немає латиниці", () => {
    const latin = rows2024
      .filter((row) => row.item !== null && /[A-Za-z]/.test(row.item))
      .map((row) => `${row.class.name}: ${row.item}`);

    expect(latin).toEqual([]);
  });

  it("монети записані токеном «зм», який розуміє створення персонажа", () => {
    const coins = rows2024.filter((row) => row.item !== null && /^\d+\s*(GP|gp)$/.test(row.item));
    expect(coins).toEqual([]);

    const perClass = new Set(
      rows2024.filter((row) => row.item === "зм").map((row) => row.class.name)
    );
    expect(perClass.size).toBe(13);
  });

  it("113 рядків 2014 не зрушили", async () => {
    expect(await prisma.classStartingEquipmentOption.count({ where: { ruleset: "RULES_2014", ...WITHOUT_BLOOD_HUNTER } })).toBe(ROWS_2014);
  });
});
