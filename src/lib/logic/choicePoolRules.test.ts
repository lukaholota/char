import { describe, expect, it } from "vitest";
import { getChoicePoolRule, CHOICE_GROUPS } from "@/lib/logic/choicePoolRules";

it("KR31.2 — метамагія 2014 дає 2 опції на 3-му і по одній на 10-му та 17-му", () => {
  const rule = getChoicePoolRule({ scope: "class", groupName: CHOICE_GROUPS.SORCERER_METAMAGIC, className: "SORCERER_2014" });
  expect(rule).toBeDefined();
  expect(Array.from({ length: 20 }, (_, index) => rule!.picksAtLevel(index + 1)))
    .toEqual([0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
});

it("KR31.2 — метамагія 2024 дає по 2 опції на 2-му, 10-му та 17-му", () => {
  const rule = getChoicePoolRule({ scope: "class", groupName: CHOICE_GROUPS.SORCERER_METAMAGIC, className: "SORCERER_2024" });
  expect(rule).toBeDefined();
  expect(Array.from({ length: 20 }, (_, index) => rule!.picksAtLevel(index + 1)))
    .toEqual([0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0]);
});

it.each([
  ["BARD_2024", 3],
  ["MONK_2024", 1],
  ["ARTIFICER_2024", 1],
] as const)("KR31.2 — %s обирає %i класових інструментів на 1-му рівні", (className, count) => {
  const rule = getChoicePoolRule({
    scope: "class",
    groupName: CHOICE_GROUPS.CLASS_TOOLS,
    className,
  });
  expect(rule?.picksAtLevel(1)).toBe(count);
  expect(rule?.picksAtLevel(2)).toBe(0);
});

const cumulativeInvocationsKnown = (className: string, level: number): number => {
  const rule = getChoicePoolRule({ scope: "class", groupName: CHOICE_GROUPS.WARLOCK_INVOCATIONS, className });
  if (!rule) throw new Error(`no rule for ${className}`);
  let total = 0;
  for (let l = 1; l <= level; l++) total += rule.picksAtLevel(l);
  return total;
};

describe("KR18.8 — прогресія відомих потойбічних викликів", () => {
  it("2014: 2 на 2-му рівні, 8 на 18-му (PHB 2014)", () => {
    expect(cumulativeInvocationsKnown("WARLOCK_2014", 2)).toBe(2);
    expect(cumulativeInvocationsKnown("WARLOCK_2014", 18)).toBe(8);
    expect(cumulativeInvocationsKnown("WARLOCK_2014", 20)).toBe(8);
  });

  it("2024: 1 на 1-му, 3 на 2-му, 10 на 18-му і далі (SRD 5.2 Warlock Features table)", () => {
    expect(cumulativeInvocationsKnown("WARLOCK_2024", 1)).toBe(1);
    expect(cumulativeInvocationsKnown("WARLOCK_2024", 2)).toBe(3);
    expect(cumulativeInvocationsKnown("WARLOCK_2024", 5)).toBe(5);
    expect(cumulativeInvocationsKnown("WARLOCK_2024", 7)).toBe(6);
    expect(cumulativeInvocationsKnown("WARLOCK_2024", 9)).toBe(7);
    expect(cumulativeInvocationsKnown("WARLOCK_2024", 12)).toBe(8);
    expect(cumulativeInvocationsKnown("WARLOCK_2024", 15)).toBe(9);
    expect(cumulativeInvocationsKnown("WARLOCK_2024", 18)).toBe(10);
    expect(cumulativeInvocationsKnown("WARLOCK_2024", 20)).toBe(10);
  });
});

it("O43 / KR43.8 — руни Рунного лицаря під воїном 2024 — ті самі 2 на 3-му й по одній на 7, 10, 15", () => {
  const rule = getChoicePoolRule({ scope: "subclass", groupName: CHOICE_GROUPS.RUNE_KNIGHT_RUNES, className: "FIGHTER_2024", subclassName: "RUNE_KNIGHT" });
  expect(rule).toBeDefined();
  expect(Array.from({ length: 20 }, (_, index) => rule!.picksAtLevel(index + 1)))
    .toEqual([0, 0, 2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
});
