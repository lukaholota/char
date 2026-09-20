import { describe, expect, it } from "vitest";
import { findClassOptionSpellChoice, findClassOptionSpellLabel, findSubclassFeatureSpellChoice } from "@/rules/class-option-spell-choices-2024";
import { findFeatSpellSelectionProblem } from "@/rules/feat-spell-choices";

const cantrip = (spellId: number) => ({ spellId, level: 0, school: "EVOCATION", spellLists: ["Жрець"] });
const ritual = (spellId: number) => ({ spellId, level: 1, school: "DIVINATION", spellLists: ["Чарівник"], isRitual: true });
const candidates = [cantrip(1), cantrip(2), cantrip(3), cantrip(4), ritual(11), ritual(12), { spellId: 13, level: 1, school: "EVOCATION", spellLists: ["Чарівник"], isRitual: false }];

describe("Pact of the Tome 2024 — Книга тіней", () => {
  it("виклик дає три замовляння й два ритуали 1-го рівня з будь-якого списку", () => {
    expect(findClassOptionSpellChoice(["Agonizing Blast (2024)", "Pact of the Tome (2024)"])).toEqual({
      sourceName: "Pact of the Tome (2024)",
      label: "Книга тіней",
      rule: {
        picks: [
          { count: 3, spellLevel: 0, schools: null, spellList: null },
          { count: 2, spellLevel: 1, schools: null, spellList: null, ritualOnly: true },
        ],
      },
    });
  });

  it("інші виклики вибору заклинань не дають", () => {
    expect(findClassOptionSpellChoice(["Agonizing Blast (2024)", "Pact of the Blade (2024)"])).toBeNull();
  });

  it("заклинання 1-го рівня без мітки ритуалу до книги не йде, а неповний вибір не приймається", () => {
    const { rule, label } = findClassOptionSpellChoice(["Pact of the Tome (2024)"])!;

    expect(findFeatSpellSelectionProblem(rule, [1, 2, 3, 11, 12], candidates, label)).toBeNull();
    expect(findFeatSpellSelectionProblem(rule, [1, 2, 3, 11, 13], candidates, label)).toBe("Обране заклинання не підходить: Книга тіней");
    expect(findFeatSpellSelectionProblem(rule, [1, 2, 11, 12], candidates, label)).toBe("Оберіть 3 замовляння: Книга тіней");
  });
});

const listed = (spellId: number, level: number, spellLists: string[]) => ({ spellId, level, school: "EVOCATION", spellLists });
const loreCandidates = [
  listed(31, 0, ["Клірик", "Бард"]),
  listed(32, 1, ["Клірик"]),
  listed(33, 3, ["Чарівник", "Чародій"]),
  listed(34, 3, ["Друїд"]),
  listed(35, 4, ["Чарівник"]),
  listed(36, 0, ["Бард"]),
];

describe("Magical Discoveries 2024 — Магічні відкриття Колегії знань", () => {
  it("на 6-му рівні барда дає два заклинання зі списків клірика, друїда й чарівника до рівня слотів барда", () => {
    expect(findSubclassFeatureSpellChoice({ ruleset: "RULES_2024", subclassName: "COLLEGE_OF_LORE", classLevel: 6 })).toEqual({
      sourceName: "College of Lore: Magical Discoveries (2024)",
      label: "Магічні відкриття",
      rule: { picks: [{ count: 2, spellLevel: 0, maxSpellLevel: 3, schools: null, spellList: ["Клірик", "Друїд", "Чарівник"] }] },
    });
  });

  it("на інших рівнях, в інших підкласах і в редакції 2014 вибору немає", () => {
    expect(findSubclassFeatureSpellChoice({ ruleset: "RULES_2024", subclassName: "COLLEGE_OF_LORE", classLevel: 5 })).toBeNull();
    expect(findSubclassFeatureSpellChoice({ ruleset: "RULES_2024", subclassName: "COLLEGE_OF_LORE", classLevel: 7 })).toBeNull();
    expect(findSubclassFeatureSpellChoice({ ruleset: "RULES_2024", subclassName: "COLLEGE_OF_VALOR", classLevel: 6 })).toBeNull();
    expect(findSubclassFeatureSpellChoice({ ruleset: "RULES_2014", subclassName: "COLLEGE_OF_LORE", classLevel: 6 })).toBeNull();
  });

  it("замовляння й заклинання 3-го рівня проходять, заклинання 4-го рівня й суто бардівське — ні", () => {
    const { rule, label } = findSubclassFeatureSpellChoice({ ruleset: "RULES_2024", subclassName: "COLLEGE_OF_LORE", classLevel: 6 })!;

    expect(findFeatSpellSelectionProblem(rule, [31, 33], loreCandidates, label)).toBeNull();
    expect(findFeatSpellSelectionProblem(rule, [32, 34], loreCandidates, label)).toBeNull();
    expect(findFeatSpellSelectionProblem(rule, [33, 35], loreCandidates, label)).toBe("Обране заклинання не підходить: Магічні відкриття");
    expect(findFeatSpellSelectionProblem(rule, [33, 36], loreCandidates, label)).toBe("Обране заклинання не підходить: Магічні відкриття");
    expect(findFeatSpellSelectionProblem(rule, [33], loreCandidates, label)).toBe("Оберіть 2 заклинання: Магічні відкриття");
  });

  it("бейдж рядка знає обидва джерела за ключем", () => {
    expect(findClassOptionSpellLabel("College of Lore: Magical Discoveries (2024)")).toBe("Магічні відкриття");
    expect(findClassOptionSpellLabel("Pact of the Tome (2024)")).toBe("Книга тіней");
    expect(findClassOptionSpellLabel("Pact of the Blade (2024)")).toBeNull();
  });
});
