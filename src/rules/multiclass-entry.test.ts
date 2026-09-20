import { describe, expect, it } from "vitest";
import { describeMulticlassEntryProblem, describeMulticlassRequirement, findMulticlassEntryProblem, type MulticlassEntryClass } from "./multiclass-entry";
import type { AbilityKey } from "./types";

const BARBARIAN_2024: MulticlassEntryClass = { name: "BARBARIAN_2024", multiclassReqs: { score: 13, choice: ["STR"] } };
const DRUID_2024: MulticlassEntryClass = { name: "DRUID_2024", multiclassReqs: { score: 13, choice: ["WIS"] } };
const FIGHTER_2024: MulticlassEntryClass = { name: "FIGHTER_2024", multiclassReqs: { score: 13, choice: ["STR", "DEX"] } };
const MONK_2024: MulticlassEntryClass = { name: "MONK_2024", multiclassReqs: { score: 13, and: ["DEX", "WIS"] } };
const ROGUE_2024: MulticlassEntryClass = { name: "ROGUE_2024", multiclassReqs: { score: 13, choice: ["DEX"] } };

const FIGHTER_2014: MulticlassEntryClass = { name: "FIGHTER_2014", multiclassReqs: { score: 13, choice: ["STR", "DEX"] } };
const MONK_2014: MulticlassEntryClass = { name: "MONK_2014", multiclassReqs: { score: 13, required: ["DEX", "WIS"] } };
const ROGUE_2014: MulticlassEntryClass = { name: "ROGUE_2014", multiclassReqs: { score: 13, required: ["DEX"] } };

function scores(overrides: Partial<Record<AbilityKey, number>>): Record<AbilityKey, number> {
  return { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10, ...overrides };
}

describe("передумова входу в новий клас (2024)", () => {
  it("відхиляє клас, чию базову характеристику персонаж не тягне", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2024",
      abilityScores: scores({ STR: 17, WIS: 8 }),
      currentClasses: [BARBARIAN_2024],
      newClass: DRUID_2024,
    });

    expect(problem).toEqual({
      className: "DRUID_2024",
      score: 13,
      needsAll: false,
      requiredAbilities: ["WIS"],
      unmetAbilities: [{ ability: "WIS", actual: 8 }],
    });
  });

  it("відхиляє й тоді, коли не тягне вже наявний клас — правило двостороннє", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2024",
      abilityScores: scores({ DEX: 17, WIS: 8 }),
      currentClasses: [MONK_2024],
      newClass: ROGUE_2024,
    });

    expect(problem?.className).toBe("MONK_2024");
    expect(problem?.unmetAbilities).toEqual([{ ability: "WIS", actual: 8 }]);
  });

  it("формі `choice` досить однієї характеристики з переліку", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2024",
      abilityScores: scores({ STR: 12, DEX: 16 }),
      currentClasses: [ROGUE_2024],
      newClass: FIGHTER_2024,
    });

    expect(problem).toBeNull();
  });

  it("формі `and` потрібні обидві — однієї мало", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2024",
      abilityScores: scores({ DEX: 16, WIS: 12 }),
      currentClasses: [ROGUE_2024],
      newClass: MONK_2024,
    });

    expect(problem?.className).toBe("MONK_2024");
    expect(problem?.needsAll).toBe(true);
    expect(problem?.unmetAbilities).toEqual([{ ability: "WIS", actual: 12 }]);
  });

  it("пропускає персонажа, який тягне і новий клас, і всі наявні", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2024",
      abilityScores: scores({ DEX: 17, WIS: 15 }),
      currentClasses: [MONK_2024],
      newClass: ROGUE_2024,
    });

    expect(problem).toBeNull();
  });
});

describe("передумова входу в новий клас (2014 — межа звужена навмисно)", () => {
  it("перевіряє новий клас у формі `required`", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2014",
      abilityScores: scores({ DEX: 16, WIS: 10 }),
      currentClasses: [ROGUE_2014],
      newClass: MONK_2014,
    });

    expect(problem?.className).toBe("MONK_2014");
  });

  it("наявний клас не блокує входу: 705 живих мультикласових персонажів цим KR не рухаються", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2014",
      abilityScores: scores({ DEX: 16, WIS: 10 }),
      currentClasses: [MONK_2014],
      newClass: ROGUE_2014,
    });

    expect(problem).toBeNull();
  });

  it("форму `choice` у 2014 не читає ніхто — воїн лишається доступним, як і сьогодні", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2014",
      abilityScores: scores({ STR: 12, DEX: 12 }),
      currentClasses: [ROGUE_2014],
      newClass: FIGHTER_2014,
    });

    expect(problem).toBeNull();
  });
});

describe("опис попередження про мультиклас (KR31.9 — попередження, не блок)", () => {
  const identity = (key: string) => key;

  it("«needsAll» зʼєднує вимоги сполучником «і»", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2024",
      abilityScores: scores({ DEX: 16, WIS: 12 }),
      currentClasses: [ROGUE_2024],
      newClass: MONK_2024,
    })!;

    expect(describeMulticlassEntryProblem(problem, identity)).toBe(
      "MONK_2024 вимагає DEX 13 і WIS 13; у персонажа WIS 12.",
    );
  });

  it("не «needsAll» зʼєднує вимоги сполучником «або»", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2024",
      abilityScores: scores({ STR: 17, WIS: 8 }),
      currentClasses: [BARBARIAN_2024],
      newClass: DRUID_2024,
    })!;

    expect(describeMulticlassEntryProblem(problem, identity)).toBe(
      "DRUID_2024 вимагає WIS 13; у персонажа WIS 8.",
    );
  });

  it("коротка вимога для замка на картці класу не згадує, що має персонаж", () => {
    const problem = findMulticlassEntryProblem({
      ruleset: "RULES_2014",
      abilityScores: scores({ DEX: 8, WIS: 14 }),
      currentClasses: [],
      newClass: MONK_2014,
    })!;

    expect(describeMulticlassRequirement(problem, identity)).toBe("DEX 13 і WIS 13");
  });
});
