import { describe, expect, it } from "vitest";
import { applyLevelUp, mergeUniqueLines } from "@/rules/levelup";

describe("KR3.3 — applyLevelUp", () => {
  it("applies ASI, retroactive CON HP, standard slots and Pact Magic separately", () => {
    const before = {
      ruleset: "RULES_2014" as const,
      level: 5,
      scores: { STR: 10, DEX: 10, CON: 13, INT: 10, WIS: 10, CHA: 10 },
      maxHp: 35,
      currentHp: 30,
      currentSpellSlots: [1, 0],
      currentPactSlots: 1,
      spellcasting: { level: 5, characterClass: { name: "WARLOCK_2014", spellcastingType: "PACT" as const } },
      featureIds: [10],
      proficientSkills: ["ARCANA"],
      expertiseSkills: [],
      additionalSaveProficiencies: ["CON"],
    };
    const after = applyLevelUp(before, {
      scores: { ...before.scores, CON: 14 },
      hitDieIncrease: 5,
      hasTough: false,
      takesTough: false,
      spellcastingAfter: { level: 6, characterClass: { name: "WARLOCK_2014", spellcastingType: "PACT" as const } },
      featureIdsToAdd: [10, 20],
      featureIdsToRemove: [10],
      proficientSkillsToAdd: ["ARCANA", "STEALTH"],
      expertiseSkillsToAdd: ["ARCANA"],
      saveProficienciesToAdd: ["CON", "WIS"],
    }, {
      standardProgression: { 0: [], 1: [2] },
      pactProgression: { 0: { slots: 0, level: 0 }, 5: { slots: 2, level: 3 }, 6: { slots: 2, level: 3 } },
    });

    expect(after).toMatchObject({ level: 6, maxHp: 47, currentHp: 42, currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0], currentPactSlots: 1, featureIds: [20], proficientSkills: ["ARCANA", "STEALTH"], expertiseSkills: ["ARCANA"], additionalSaveProficiencies: ["CON", "WIS"] });
    expect(applyLevelUp(before, { ...{ scores: before.scores, hasTough: false, takesTough: false, spellcastingAfter: before.spellcasting }, hitDieIncrease: -4 }, { standardProgression: { 0: [] }, pactProgression: { 0: { slots: 0, level: 0 } } }).maxHp).toBe(36);
    expect(mergeUniqueLines("Common\nElvish", ["Elvish", "  Draconic "])).toBe("Common\nElvish\nDraconic");
  });
});


describe("KR27.9 — стеля характеристики в переході рівня", () => {
  const base = {
    level: 19,
    scores: { STR: 8, DEX: 13, CON: 18, INT: 10, WIS: 12, CHA: 20 },
    maxHp: 100,
    currentHp: 100,
    currentSpellSlots: [],
    currentPactSlots: 0,
    spellcasting: { level: 19, characterClass: { name: "SORCERER_2024", spellcastingType: "FULL" as const } },
    featureIds: [],
    proficientSkills: [],
    expertiseSkills: [],
    additionalSaveProficiencies: [],
  };
  const content = { standardProgression: { 0: [] }, pactProgression: { 0: { slots: 0, level: 0 } } };
  const choices = {
    hitDieIncrease: 3,
    hasTough: false,
    takesTough: false,
    spellcastingAfter: base.spellcasting,
  };

  it("епічний дар 2024 доводить ХАР до 21", () => {
    const after = applyLevelUp({ ...base, ruleset: "RULES_2024" as const }, {
      ...choices,
      scores: { ...base.scores, CHA: 21 },
      abilityScoreSource: "EPIC_BOON" as const,
    }, content);

    expect(after.scores.CHA).toBe(21);
  });

  it("звичайне підвищення 2024 лишає ХАР на 20", () => {
    const after = applyLevelUp({ ...base, ruleset: "RULES_2024" as const }, {
      ...choices,
      scores: { ...base.scores, CHA: 22 },
    }, content);

    expect(after.scores.CHA).toBe(20);
  });

  it("2014 не пускає вище 20 навіть із джерелом епічного дару", () => {
    const after = applyLevelUp({ ...base, ruleset: "RULES_2014" as const }, {
      ...choices,
      scores: { ...base.scores, CHA: 21 },
      abilityScoreSource: "EPIC_BOON" as const,
    }, content);

    expect(after.scores.CHA).toBe(20);
  });

  it("ХАР 21 переживає наступний рівень, де стеля знову 20", () => {
    const after = applyLevelUp({ ...base, ruleset: "RULES_2024" as const, scores: { ...base.scores, CHA: 21 } }, {
      ...choices,
      scores: { ...base.scores, CHA: 21 },
    }, content);

    expect(after.scores.CHA).toBe(21);
  });
});
