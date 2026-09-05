import { describe, expect, it } from "vitest";

import { findAbilityScoresAfterLevelUp } from "./levelup-ability-scores";

const SCORES = { STR: 8, DEX: 13, CON: 18, INT: 10, WIS: 12, CHA: 20 };

describe("характеристики після підвищення рівня", () => {
  it("епічний дар додає 21-шу одиницю, класовий ASI на тому самому показнику — ні", () => {
    const boon = findAbilityScoresAfterLevelUp({
      scores: SCORES,
      ruleset: "RULES_2024",
      feat: { category: "EPIC_BOON", grantedASI: { CHA: 1 } },
    });
    const asi = findAbilityScoresAfterLevelUp({
      scores: SCORES,
      ruleset: "RULES_2024",
      classIncreases: [{ ability: "CHA", value: "2" }],
    });

    expect(boon.CHA).toBe(21);
    expect(asi.CHA).toBe(20);
  });

  it("2014 стелю 20 тримає й для риси категорії епічного дару", () => {
    const scores = findAbilityScoresAfterLevelUp({
      scores: SCORES,
      ruleset: "RULES_2014",
      feat: { category: "EPIC_BOON", grantedASI: { CHA: 1 } },
    });

    expect(scores.CHA).toBe(20);
  });

  it("вкладена форма basic.simple виграє в плоскої, а не додається до неї", () => {
    const scores = findAbilityScoresAfterLevelUp({
      scores: SCORES,
      ruleset: "RULES_2024",
      feat: { category: "GENERAL", grantedASI: { CON: 1, basic: { simple: { CON: 1 } } } },
    });

    expect(scores.CON).toBe(19);
  });

  it("класовий ASI і риса складаються, кожен зі своєю стелею", () => {
    const scores = findAbilityScoresAfterLevelUp({
      scores: { ...SCORES, CON: 19 },
      ruleset: "RULES_2024",
      classIncreases: [{ ability: "CON", value: 2 }],
      feat: { category: "EPIC_BOON", grantedASI: { CON: 1 } },
    });

    expect(scores.CON).toBe(21);
  });

  it("порожній вибір лишає всі шість показників як були", () => {
    expect(findAbilityScoresAfterLevelUp({ scores: SCORES, ruleset: "RULES_2024" })).toEqual(SCORES);
  });
});
