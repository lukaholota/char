import { describe, expect, it } from "vitest";

import {
  EPIC_BOON_ABILITY_SCORE_CEILING,
  STANDARD_ABILITY_SCORE_CEILING,
  findAbilityScoreCeiling,
  findFeatAbilityScoreSource,
  raiseAbilityScore,
} from "./ability-score-ceiling";

describe("стеля характеристики", () => {
  it("епічний дар 2024 підіймає стелю до 30, решта підвищень лишається на 20", () => {
    expect(findAbilityScoreCeiling({ ruleset: "RULES_2024", source: "EPIC_BOON" })).toBe(30);
    expect(findAbilityScoreCeiling({ ruleset: "RULES_2024", source: "STANDARD" })).toBe(20);
  });

  it("2014 стелі не має жодним шляхом — навіть із джерелом епічного дару", () => {
    expect(findAbilityScoreCeiling({ ruleset: "RULES_2014", source: "EPIC_BOON" })).toBe(20);
    expect(findAbilityScoreCeiling({ ruleset: "RULES_2014", source: "STANDARD" })).toBe(20);
    expect(findAbilityScoreCeiling({ ruleset: null, source: "EPIC_BOON" })).toBe(20);
  });

  it("джерело виводиться з категорії риси, а не з її назви", () => {
    expect(findFeatAbilityScoreSource("EPIC_BOON")).toBe("EPIC_BOON");
    expect(findFeatAbilityScoreSource("GENERAL")).toBe("STANDARD");
    expect(findFeatAbilityScoreSource(null)).toBe("STANDARD");
  });
});

describe("підвищення показника", () => {
  it("звичайна риса на 20 не дає 21, епічний дар дає", () => {
    expect(raiseAbilityScore(20, 1, STANDARD_ABILITY_SCORE_CEILING)).toBe(20);
    expect(raiseAbilityScore(20, 1, EPIC_BOON_ABILITY_SCORE_CEILING)).toBe(21);
  });

  it("підвищення обрізається стелею, а не відкидається цілком", () => {
    expect(raiseAbilityScore(19, 2, STANDARD_ABILITY_SCORE_CEILING)).toBe(20);
  });

  it("показник вище стелі не знижується: ХАР 21 переживає 20-й рівень зі стелею 20", () => {
    expect(raiseAbilityScore(21, 0, STANDARD_ABILITY_SCORE_CEILING)).toBe(21);
    expect(raiseAbilityScore(21, 2, STANDARD_ABILITY_SCORE_CEILING)).toBe(21);
  });

  it("нечислові значення проходять як є — рядок персонажа буває порожнім", () => {
    expect(raiseAbilityScore(Number.NaN, 1, STANDARD_ABILITY_SCORE_CEILING)).toBeNaN();
    expect(raiseAbilityScore(18, Number.NaN, STANDARD_ABILITY_SCORE_CEILING)).toBe(18);
  });
});
