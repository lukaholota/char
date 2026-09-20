import { describe, expect, it } from "vitest";
import { buildCreationAbilityScores, buildInitialCharacterState, getInitialHitPoints, getInitialSpellSlots } from "@/rules/character-creation";

const abilityChoiceFeat = (name: string, optionNameEng: string, effectAbility: string) => ({
  name,
  ruleset: "RULES_2014",
  grantedASI: {},
  grantedSkills: null,
  featChoiceOptions: [{ choiceOptionId: 1, choiceOption: { optionNameEng, effectKind: "ASI", effectAbility, effectAmount: 1 } }],
});

describe("KR3.2 — pure character creation rules", () => {
  it("combines fixed, flexible and feat ASI while preserving Resilient", () => {
    expect(buildCreationAbilityScores({
      asiSystem: "POINT_BUY",
      pointBuy: [{ ability: "STR", value: 15 }, { ability: "DEX", value: 14 }],
      simple: [],
      isDefaultASI: true,
      raceASI: { basic: { simple: { STR: 2 } } },
      subraceReplacesASI: false,
      racialChoices: { basicChoices: [], tashaChoices: [] },
      raceChoiceAbilityBonuses: [{ ASI: { DEX: 1 } }],
      feats: [{ source: abilityChoiceFeat("RESILIENT", "Resilient (Dexterity)", "DEX"), chosenOptionIds: [1] }],
    })).toEqual({ scores: { STR: 17, DEX: 16, CON: 10, INT: 10, WIS: 10, CHA: 10 }, resilientSavingThrows: ["DEX"] });
  });

  it("половинна риса дає +1 при створенні — те саме правило, що й підвищення рівня", () => {
    expect(buildCreationAbilityScores({
      asiSystem: "SIMPLE", pointBuy: [], simple: [{ ability: "WIS", value: 13 }], isDefaultASI: false,
      raceASI: {}, subraceReplacesASI: false,
      feats: [{ source: abilityChoiceFeat("OBSERVANT", "OBSERVANT Ability (Wisdom)", "WIS"), chosenOptionIds: [1] }],
    })).toEqual({ scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 14, CHA: 10 }, resilientSavingThrows: [] });
  });

  it("keeps standard and pact slots separate and calculates Tough HP", () => {
    expect(getInitialSpellSlots({ className: "WIZARD_2014", spellcastingType: "FULL", standardProgression: { 1: [2] }, pactProgression: {} })).toEqual({ currentSpellSlots: [2, 0, 0, 0, 0, 0, 0, 0, 0], currentPactSlots: 0 });
    expect(getInitialSpellSlots({ className: "WARLOCK_2014", spellcastingType: "PACT", standardProgression: {}, pactProgression: { 1: { slots: 1, level: 1 } } })).toEqual({ currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0], currentPactSlots: 1 });
    expect(getInitialHitPoints(8, 14, true)).toBe(12);
  });

  it("builds the initial pure state without Prisma inputs", () => {
    expect(buildInitialCharacterState({
      asiSystem: "SIMPLE", pointBuy: [], simple: [{ ability: "CON", value: 14 }], isDefaultASI: false,
      raceASI: {}, subraceReplacesASI: false, feats: [], className: "WIZARD_2014", spellcastingType: "FULL",
      savingThrows: ["INT"], hitDie: 6, hasTough: true, standardProgression: { 1: [2] }, pactProgression: {},
    })).toMatchObject({
      scores: { CON: 14 }, savingThrows: ["INT"], currentSpellSlots: [2, 0, 0, 0, 0, 0, 0, 0, 0], currentPactSlots: 0, maxHp: 10,
    });
  });
});
