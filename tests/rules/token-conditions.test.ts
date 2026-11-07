import { describe, expect, it } from "vitest";
import dictionary from "@/lib/refs/dictionary.json";
import {
  TOKEN_CONDITION_KEYS,
  TOKEN_CONDITION_LABELS,
  applyTokenConditionChange,
  buildTokenConditionMarks,
  canChangeTokenConditions,
  normalizeTokenConditions,
  parseTokenConditionChange,
  splitTokenConditionMarks,
} from "@/rules/token-conditions";

describe("стани токена", () => {
  it("назви збігаються зі словником, а виснаження живе окремо з рівнем", () => {
    const { exhaustion, ...standard } = dictionary.DND_DICTIONARY.conditions;
    expect(TOKEN_CONDITION_LABELS).toEqual(standard);
    expect(exhaustion).toBe("Виснажений");
    expect(TOKEN_CONDITION_KEYS).toHaveLength(15);
    expect(parseTokenConditionChange({ kind: "toggle", condition: "blessed", isActive: true })).toEqual({ kind: "toggle", condition: "blessed", isActive: true });
    expect(buildTokenConditionMarks({ conditions: ["blessed"], exhaustionLevel: 0 })).toEqual([{ key: "blessed", label: "Благословенний", shortLabel: "Бл" }]);
  });

  it("розбирає перемикання стану й рівень виснаження", () => {
    expect(parseTokenConditionChange({ kind: "toggle", condition: "prone", isActive: true })).toEqual({ kind: "toggle", condition: "prone", isActive: true });
    expect(parseTokenConditionChange({ kind: "exhaustion", level: 6 })).toEqual({ kind: "exhaustion", level: 6 });
    expect(parseTokenConditionChange({ kind: "exhaustion", level: 0 })).toEqual({ kind: "exhaustion", level: 0 });
  });

  it.each([
    null,
    "prone",
    {},
    { kind: "toggle", condition: "exhaustion", isActive: true },
    { kind: "toggle", condition: "toString", isActive: true },
    { kind: "toggle", condition: "prone", isActive: "yes" },
    { kind: "exhaustion", level: 7 },
    { kind: "exhaustion", level: -1 },
    { kind: "exhaustion", level: 1.5 },
    { kind: "other", level: 1 },
  ])("відхиляє %j", (raw) => {
    expect(parseTokenConditionChange(raw)).toBeNull();
  });

  it("відкидає невідомі ключі, тримає порядок і обмежує рівень", () => {
    expect(normalizeTokenConditions({ conditions: ["stunned", "legacy", "blinded"], exhaustionLevel: 9 })).toEqual({ conditions: ["blinded", "stunned"], exhaustionLevel: 6 });
  });

  it("позначки: стани за порядком, виснаження останнім із рівнем", () => {
    const marks = buildTokenConditionMarks({ conditions: ["blinded", "prone"], exhaustionLevel: 3 });
    expect(marks.map((mark) => mark.label)).toEqual(["Засліплений", "Повалений", "Виснажений 3"]);
    expect(marks[2].shortLabel).toBe("Ви3");
    expect(buildTokenConditionMarks({ conditions: [], exhaustionLevel: 0 })).toEqual([]);
  });

  it("на токені — не більше двох позначок і лічильник решти", () => {
    const marks = buildTokenConditionMarks({ conditions: ["blinded", "prone", "stunned"], exhaustionLevel: 1 });
    expect(splitTokenConditionMarks(marks)).toMatchObject({ hiddenCount: 2, shown: [{ key: "blinded" }, { key: "prone" }] });
    expect(splitTokenConditionMarks(marks.slice(0, 1))).toMatchObject({ hiddenCount: 0, shown: [{ key: "blinded" }] });
  });

  it("героя міняє майстер або його власник", () => {
    expect(canChangeTokenConditions({ userId: 1, isGm: true }, { userId: 2 })).toBe(true);
    expect(canChangeTokenConditions({ userId: 2, isGm: false }, { userId: 2 })).toBe(true);
    expect(canChangeTokenConditions({ userId: 3, isGm: false }, { userId: 2 })).toBe(false);
    expect(canChangeTokenConditions({ userId: 3, isGm: false }, null)).toBe(false);
  });

  it("зміна застосовується так само, як на сервері: без дублів, у сталому порядку, виснаження окремо", () => {
    const start = { conditions: ["prone" as const], exhaustionLevel: 1 };
    expect(applyTokenConditionChange(start, { kind: "toggle", condition: "blinded", isActive: true })).toEqual({ conditions: ["blinded", "prone"], exhaustionLevel: 1 });
    expect(applyTokenConditionChange(start, { kind: "toggle", condition: "prone", isActive: true })).toEqual(start);
    expect(applyTokenConditionChange(start, { kind: "toggle", condition: "prone", isActive: false })).toEqual({ conditions: [], exhaustionLevel: 1 });
    expect(applyTokenConditionChange(start, { kind: "exhaustion", level: 3 })).toEqual({ conditions: ["prone"], exhaustionLevel: 3 });
  });
});
