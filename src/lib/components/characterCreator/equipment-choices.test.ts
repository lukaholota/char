import { describe, expect, it } from "vitest";

import {
  buildChoiceHeading,
  buildDefaultSelection,
  buildEquipmentLines,
  buildItemLines,
  describeEquipmentRow,
  formatVariantTitle,
  type EquipmentOptionRow,
} from "./equipment-choices";

/// KR26.4. Рядки 2024 приходять без `description` — підпис збирається зі звʼязків, — а рядки
/// 2014 його мають і мусять лишитися дослівними.

const row = (fields: Partial<EquipmentOptionRow> & { optionId: number }): EquipmentOptionRow => ({
  option: "a",
  quantity: 1,
  ...fields,
});

/// Варвар 2024, літера A — рівно так, як її пише сід KR26.2.
const barbarian2024LetterA: EquipmentOptionRow[] = [
  row({ optionId: 1001, weapon: { name: "GREATAXE" } }),
  row({ optionId: 1002, quantity: 4, weapon: { name: "HANDAXE" } }),
  row({
    optionId: 1003,
    equipmentPack: {
      name: "EXPLORERS_PACK",
      description: "Набір для подорожей дикою місцевістю.",
      items: [
        { name: "Рюкзак", quantity: 1 },
        { name: "Смолоскип", quantity: 10 },
      ],
    },
  }),
  row({ optionId: 1004, quantity: 15, item: "зм" }),
];

describe("заголовок групи говорить літерами, як книга", () => {
  it("дві літери — «Оберіть A або B»", () => {
    expect(buildChoiceHeading(["a", "b"])).toBe("Оберіть A або B");
  });

  it("три літери — «Оберіть A, B або C»", () => {
    expect(buildChoiceHeading(["a", "b", "c"])).toBe("Оберіть A, B або C");
  });

  it("одна літера — це не вибір, а видача", () => {
    expect(buildChoiceHeading(["a"])).toBe("Ви отримуєте");
  });

  it("варіант підписаний великою літерою", () => {
    expect(formatVariantTitle("b")).toBe("Варіант B");
  });
});

describe("рядки варіанта", () => {
  it("2024: підпис збирається зі звʼязків, бо опису в рядку немає", () => {
    const lines = buildEquipmentLines(barbarian2024LetterA);

    expect(lines.belongings.map((line) => line.text)).toEqual([
      "Велика сокира",
      "Ручна сокира x4",
      "Набір мандрівника",
    ]);
  });

  it("монети йдуть окремо від речей і останніми", () => {
    const lines = buildEquipmentLines(barbarian2024LetterA);

    expect(lines.coins.map((line) => line.text)).toEqual(["15 зм"]);
    expect(lines.belongings.some((line) => line.text.includes("зм"))).toBe(false);
  });

  it("2014: опис рядка лишається дослівним", () => {
    const lines = buildEquipmentLines([
      row({ optionId: 18, quantity: 4, weapon: { name: "JAVELIN" }, description: "4 списи (1к6), метальні" }),
    ]);

    expect(lines.belongings.map((line) => line.text)).toEqual(["4 списи (1к6), метальні"]);
  });

  it("вміст набору їде разом із рядком — його показує кнопка «?»", () => {
    const pack = buildEquipmentLines(barbarian2024LetterA).belongings[2].pack;

    expect(pack?.name).toBe("Набір мандрівника");
    expect(pack?.items).toEqual([
      { name: "Рюкзак", quantity: 1 },
      { name: "Смолоскип", quantity: 10 },
    ]);
  });

  it("зброя й обладунок із засіяними характеристиками несуть рядок характеристик і звʼязок із каталогом", () => {
    const [leather, quarterstaff] = buildEquipmentLines([
      row({
        optionId: 30,
        armor: { name: "LEATHER", armorType: "LIGHT", baseAC: 11, abilityBonusType: "FULL", strengthReq: null, stealthDisadvantage: false },
      }),
      row({
        optionId: 31,
        weapon: {
          name: "QUARTERSTAFF",
          damage: "1d6",
          damageType: "BLUDGEONING",
          properties: ["VERSATILE"],
          versatileDamage: "1d8",
          normalRange: null,
          longRange: null,
          isRanged: false,
        },
      }),
    ]).belongings;

    expect(leather).toMatchObject({
      text: "Шкіряний обладунок",
      stats: "легкі обладунки · КБ 11 + Мод. СПР",
      catalogItem: { kind: "armor", code: "LEATHER" },
    });
    expect(quarterstaff).toMatchObject({
      stats: "1к6 + СИЛ, дробяча шкода · універсальна (1к8)",
      catalogItem: { kind: "weapon", code: "QUARTERSTAFF" },
    });
  });

  it("майно походження розкладається тим самим кодом", () => {
    const lines = buildItemLines([
      { name: "Священний символ", quantity: 1 },
      { name: "зм", quantity: 8 },
    ]);

    expect(lines.belongings.map((line) => line.text)).toEqual(["Священний символ"]);
    expect(lines.coins.map((line) => line.text)).toEqual(["8 зм"]);
  });
});

describe("вибір за замовчуванням", () => {
  it("бере всю літеру, а не її перший рядок", () => {
    const selection = buildDefaultSelection({
      "1": { a: barbarian2024LetterA, b: [row({ optionId: 1005, option: "b", quantity: 75, item: "зм" })] },
    });

    expect(selection["1"]).toEqual([1001, 1002, 1003, 1004]);
  });

  it("без літери «a» бере першу наявну", () => {
    const selection = buildDefaultSelection({
      "2": { b: [row({ optionId: 7, option: "b" })] },
    });

    expect(selection["2"]).toEqual([7]);
  });
});

describe("KR31.14 — підсумок спорядження на кроці «Імʼя» (P2-elf-wizard-09)", () => {
  it("предмет 2024, записаний лише назвою, підписаний назвою, а не id рядка", () => {
    expect(describeEquipmentRow(row({ optionId: 204, item: "Містичне фокусування (палиця)" }))).toBe("Містичне фокусування (палиця)");
    expect(describeEquipmentRow(row({ optionId: 203, quantity: 2, weapon: { name: "DAGGER" } }))).toBe("Кинджал x2");
  });
});
