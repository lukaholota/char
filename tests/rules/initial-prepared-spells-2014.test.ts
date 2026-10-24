import { describe, expect, it } from "vitest";
import { findInitialPreparedLimit2014, findListPreparedRoom2014 } from "@/rules/initial-prepared-spells-2014";

const scores = (INT: number, WIS: number) => ({ INT, WIS });

describe("підготовлені 2014 у конструкторі й на підвищенні", () => {
  it("на 1-му рівні клірик і друїд беруть Мудрість, винахідник і чарівник — Інтелект", () => {
    expect(findInitialPreparedLimit2014("CLERIC_2014", scores(10, 16))).toBe(4);
    expect(findInitialPreparedLimit2014("DRUID_2014", scores(18, 12))).toBe(2);
    expect(findInitialPreparedLimit2014("ARTIFICER_2014", scores(16, 10))).toBe(3);
    expect(findInitialPreparedLimit2014("WIZARD_2014", scores(16, 10))).toBe(4);
  });

  it("слабка характеристика все одно дає одне, а інші класи нічого", () => {
    expect(findInitialPreparedLimit2014("CLERIC_2014", scores(10, 6))).toBe(1);
    expect(findInitialPreparedLimit2014("SORCERER_2014", scores(18, 18))).toBe(0);
  });

  it("на підвищенні лишає місце до ліміту рівня, без від'ємних", () => {
    expect(findListPreparedRoom2014({ className: "CLERIC_2014", classLevel: 3, scores: scores(10, 14), preparedCount: 3 })).toBe(2);
    expect(findListPreparedRoom2014({ className: "ARTIFICER_2014", classLevel: 5, scores: scores(14, 10), preparedCount: 1 })).toBe(3);
    expect(findListPreparedRoom2014({ className: "DRUID_2014", classLevel: 2, scores: scores(10, 12), preparedCount: 7 })).toBe(0);
    expect(findListPreparedRoom2014({ className: "BARD_2014", classLevel: 4, scores: scores(18, 18), preparedCount: 0 })).toBe(0);
  });
});
