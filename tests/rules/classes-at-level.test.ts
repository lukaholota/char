import { describe, expect, it } from "vitest";

import { collectClassesAfterLevelUp, type ClassAtLevelRow } from "@/rules/classes-at-level";

const paladin: ClassAtLevelRow = { classId: 1, subclassId: 11, classLevel: 3, ability: "CHA" };
const fighter: ClassAtLevelRow = { classId: 2, subclassId: null, classLevel: 2, ability: null };

describe("collectClassesAfterLevelUp", () => {
  it("додає клас, у який персонаж увійшов цим підвищенням, з його 1-м рівнем і підкласом", () => {
    const sorcerer: ClassAtLevelRow = { classId: 3, subclassId: 33, classLevel: 1, ability: "CHA" };

    expect(collectClassesAfterLevelUp([paladin], sorcerer)).toEqual([paladin, sorcerer]);
  });

  it("підіймає рівень наявного класу й не чіпає решту", () => {
    expect(collectClassesAfterLevelUp([paladin, fighter], { classId: 2, subclassId: 22, classLevel: 3, ability: null })).toEqual([
      paladin,
      { ...fighter, classLevel: 3, subclassId: 22 },
    ]);
  });

  it("лишає вже обраний підклас, коли цим підвищенням підклас не обирали", () => {
    expect(collectClassesAfterLevelUp([paladin], { classId: 1, subclassId: null, classLevel: 4, ability: "CHA" })).toEqual([{ ...paladin, classLevel: 4 }]);
  });
});
