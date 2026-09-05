import { describe, expect, it } from "vitest";
import { getAllSpells } from "@/lib/spellsData";
import { shortenCastingTime } from "@/lib/spell-casting-time";
import {
  SPELL_DURATION_BUCKETS,
  SPELL_RANGE_BUCKETS,
  findSpellComponents,
  findSpellDurationBucket,
  findSpellRangeBucket,
} from "@/lib/spell-filter-facets";

describe("shortenCastingTime", () => {
  it("лишає від реакції й бонусної дії з умовою тільки саме значення", () => {
    expect(
      shortenCastingTime("1 реакція, яку ви здійснюєте, коли ви або істота у межах 60 футів від вас падає")
    ).toBe("1 реакція");
    expect(
      shortenCastingTime("1 бонусна дія, яку ви здійснюєте одразу після влучення по цілі зброєю ближнього бою")
    ).toBe("1 бонусна дія");
  });

  it("не чіпає решту значень, але прибирає зайві пробіли", () => {
    expect(shortenCastingTime("1 дія")).toBe("1 дія");
    expect(shortenCastingTime("1 дія або 8 годин")).toBe("1 дія або 8 годин");
    expect(shortenCastingTime(" 1 хвилина")).toBe("1 хвилина");
    expect(shortenCastingTime(null)).toBe("");
  });

  it("у каталозі жоден час накладання не довший за коротке значення", () => {
    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      const times = new Set(getAllSpells(ruleset).map((spell) => shortenCastingTime(spell.castingTime)));
      for (const time of times) expect(time.length).toBeLessThan(25);
    }
  });
});

describe("findSpellComponents", () => {
  it("читає літери до дужки з описом матеріалу", () => {
    expect(Array.from(findSpellComponents("В, С, М (жива блоха)"))).toEqual(["V", "S", "M"]);
    expect(Array.from(findSpellComponents("С"))).toEqual(["S"]);
    expect(Array.from(findSpellComponents("В, М (святий символ)"))).toEqual(["V", "M"]);
    expect(findSpellComponents(null).size).toBe(0);
  });
});

describe("findSpellRangeBucket", () => {
  it("зводить дистанцію до кошика", () => {
    expect(findSpellRangeBucket("На себе (радіус 15 футів)")).toBe("На себе");
    expect(findSpellRangeBucket("Дотик")).toBe("Дотик");
    expect(findSpellRangeBucket("5 футів")).toBe("До 30 футів");
    expect(findSpellRangeBucket("30 футів")).toBe("До 30 футів");
    expect(findSpellRangeBucket("60 футів")).toBe("60 футів");
    expect(findSpellRangeBucket("120 футів")).toBe("90–150 футів");
    expect(findSpellRangeBucket("300 футів")).toBe("300 футів і далі");
    expect(findSpellRangeBucket("1 миля")).toBe("300 футів і далі");
    expect(findSpellRangeBucket("Особлива")).toBe("Особлива");
    expect(findSpellRangeBucket("Поле зору")).toBe("Особлива");
  });

  it("кожне заклинання каталогу потрапляє в один із оголошених кошиків", () => {
    for (const spell of getAllSpells("RULES_2014")) {
      expect(SPELL_RANGE_BUCKETS).toContain(findSpellRangeBucket(spell.range));
    }
  });
});

describe("findSpellDurationBucket", () => {
  it("зводить тривалість до кошика незалежно від концентрації", () => {
    expect(findSpellDurationBucket("Миттєво")).toBe("Миттєво");
    expect(findSpellDurationBucket("Миттєва")).toBe("Миттєво");
    expect(findSpellDurationBucket("1 раунд")).toBe("До 1 хвилини");
    expect(findSpellDurationBucket("Концентрація, до 1 хвилини")).toBe("До 1 хвилини");
    expect(findSpellDurationBucket("Концентрація. до 1 хвилини")).toBe("До 1 хвилини");
    expect(findSpellDurationBucket("Концентрація, до 10 хвилин")).toBe("До 10 хвилин");
    expect(findSpellDurationBucket("1 година")).toBe("До 1 години");
    expect(findSpellDurationBucket("8 годин")).toBe("До 8 годин");
    expect(findSpellDurationBucket("24 години")).toBe("Добу й довше");
    expect(findSpellDurationBucket("10 днів")).toBe("Добу й довше");
    expect(findSpellDurationBucket("Доки не розвіють")).toBe("Доки не розвіють");
    expect(findSpellDurationBucket("До розвіювання або спрацювання")).toBe("Доки не розвіють");
    expect(findSpellDurationBucket("Особлива")).toBe("Особлива");
  });

  it("кожне заклинання каталогу потрапляє в один із оголошених кошиків", () => {
    for (const spell of getAllSpells("RULES_2014")) {
      expect(SPELL_DURATION_BUCKETS).toContain(findSpellDurationBucket(spell.duration));
    }
  });
});
