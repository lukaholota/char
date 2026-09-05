import { describe, expect, it } from "vitest";
import {
  addAbilityBonuses,
  applyAbilityScoreIncrease,
  applyRacialChoices,
  calculateAbilityModifier,
  extractFlexibleGroups,
  getPlainBonuses,
  getSimpleBonuses,
  isAbilityKey,
  isRecord,
  normalizeASI,
  plainAsiChoiceGroups,
} from "@/rules/abilities";
import { calculateArmorClass } from "@/rules/armor";
import { buildCreationAbilityScores, buildInitialCharacterState, getInitialSpellSlots } from "@/rules/character-creation";
import { calculateAverageHitPointIncrease, calculateInitialHitPoints, calculateLevelUpHitPoints } from "@/rules/health";
import { applyLevelUp, mergeUniqueLines } from "@/rules/levelup";
import {
  calculateProficiencyBonus,
  calculateSavingThrowProficiencyBonus,
  calculateSkillProficiencyBonus,
  normalizeSkillProficiencies,
} from "@/rules/proficiency";
import { isAbilityScoreIncreaseLevel, needsSubclassSelection } from "@/rules/progression";
import {
  applySpellSlotMaximumDelta,
  calculateCasterLevel,
  getMaximumPactSpellSlots,
  getMaximumStandardSpellSlots,
  getPactMagicSlots,
  getStandardSpellSlots,
  normalizeSpellSlotArray,
} from "@/rules/spellcasting";

const scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

describe("KR3.5 — pure rules coverage", () => {
  it("keeps Pact Magic out of standard caster levels", () => {
    expect(calculateCasterLevel({
      level: 10,
      characterClass: { name: "WIZARD_2014", spellcastingType: "FULL" },
      multiclasses: [{ classLevel: 5, characterClass: { name: "WARLOCK_2014", spellcastingType: "PACT" } }],
    }, "RULES_2014")).toEqual({ casterLevel: 5, pactLevel: 5 });
  });

  it("accepts only valid ability payloads and applies bounded increases", () => {
    expect(isAbilityKey("dex")).toBe(true);
    expect(isAbilityKey("luck")).toBe(false);
    expect(isRecord({ value: 1 })).toBe(true);
    expect(isRecord(["STR"])).toBe(false);
    expect(getSimpleBonuses({ basic: { simple: { STR: "2", DEX: "bad", LUCK: 3 } } })).toEqual({ STR: 2 });
    expect(getSimpleBonuses(null)).toEqual({});
    expect(getPlainBonuses({ STR: 2, DEX: 0, CON: "1", WIS: "bad", basic: {} })).toEqual({});
    expect(getPlainBonuses({ STR: 2, DEX: 0, CON: "1", WIS: "bad", LUCK: 3 })).toEqual({ STR: 2, CON: 1 });
    expect(addAbilityBonuses({ STR: 10 }, { STR: 2, DEX: 3, CON: Number.NaN })).toEqual({ STR: 12 });
    expect(applyAbilityScoreIncrease({ ...scores, STR: 19 }, "STR", 3).STR).toBe(20);
    expect(calculateAbilityModifier(9)).toBe(-1);
  });

  it("normalizes legacy ASI shapes and applies selected groups immutably", () => {
    const flexibleOnly = { flexible: { groups: [{ value: "2" }] } };
    const tashaOnly = { tasha: { flexible: { groups: [{ value: 1, choiceCount: 2 }] } } };
    expect(normalizeASI(flexibleOnly)).toEqual({ basic: { simple: {}, flexible: flexibleOnly.flexible }, flexible: flexibleOnly.flexible });
    expect(extractFlexibleGroups(tashaOnly, "basic")).toEqual([{ value: 1, choiceCount: 2 }]);
    expect(extractFlexibleGroups("invalid", "tasha")).toEqual([]);
    expect(plainAsiChoiceGroups({ STR: 2, DEX: 1, CON: 1, WIS: 0 })).toEqual([
      { groupName: "+2 до 1", value: 2, choiceCount: 1, unique: true },
      { groupName: "+1 до 2", value: 1, choiceCount: 2, unique: true },
    ]);
    expect(applyRacialChoices(scores, undefined, [])).toEqual(scores);
    expect(applyRacialChoices(scores, [{ groupIndex: 0, selectedAbilities: ["STR", "MISSING"] }], [{ value: "2" }])).toMatchObject({ STR: 12 });
  });

  it("calculates every armor source and armor ability mode", () => {
    const common = { dexterityModifier: 4, abilityModifiers: { DEX: 4, CON: 2 }, wearsShield: true, shieldArmorClassBonus: 1, simpleArmorClassBonus: 1, featureArmorClassBonus: 2, magicItemArmorClassBonus: 1 };
    expect(calculateArmorClass({ ...common, baseArmorClassOverride: 17.8, raceStaticArmorClassBonus: 1.9 })).toBe(25);
    expect(calculateArmorClass({ ...common, equippedArmor: { baseArmorClass: 14, armorAbilityBonuses: ["DEX"], armorAbilityBonusType: "MAX2", characterAbilityBonusType: "FULL", characterAbilityBonuses: [] } })).toBe(23);
    expect(calculateArmorClass({ ...common, equippedArmor: { baseArmorClass: 16, characterAbilityBonuses: ["DEX", "DEX"], characterAbilityBonusType: "NONE" }, raceStaticArmorClassBonus: Number.NaN })).toBe(23);
    expect(calculateArmorClass({ ...common, equippedArmor: null, raceStaticArmorClassBonus: null })).toBe(21);
    expect(calculateArmorClass({ ...common, equippedArmor: { baseArmorClass: 12, characterOverrideBaseArmorClass: 13, characterAbilityBonuses: ["CON"], characterAbilityBonusType: "FULL", miscArmorClassBonus: 1 } })).toBe(23);
  });

  it("covers health, proficiency and class progression boundaries", () => {
    expect(calculateInitialHitPoints(8, -1)).toBe(7);
    expect(calculateAverageHitPointIncrease(7)).toBe(4);
    expect(calculateLevelUpHitPoints({ currentHitPoints: 10, hitDieIncrease: 5, constitutionModifier: 2, toughBonus: 2, retroactiveConstitutionBonus: 3 })).toBe(22);
    expect(calculateProficiencyBonus(20)).toBe(6);
    expect(calculateSkillProficiencyBonus("EXPERTISE", 3, false)).toBe(6);
    expect(calculateSkillProficiencyBonus("PROFICIENT", 3, false)).toBe(3);
    expect(calculateSkillProficiencyBonus("HALF", 3, false)).toBe(1);
    expect(calculateSkillProficiencyBonus("NONE", 3, true)).toBe(1);
    expect(calculateSkillProficiencyBonus("NONE", 3, false)).toBe(0);
    expect(calculateSavingThrowProficiencyBonus(true, 4)).toBe(4);
    expect(needsSubclassSelection({}, false, 3)).toBe(true);
    expect(needsSubclassSelection({ subclassLevel: 1 }, true, 20)).toBe(false);
    expect(isAbilityScoreIncreaseLevel({ abilityScoreUpLevels: [4] }, 4)).toBe(true);
    expect(isAbilityScoreIncreaseLevel({}, 4)).toBe(false);
    expect(normalizeSkillProficiencies(null, ["ARCANA", "STEALTH"])).toBeNull();
    expect(normalizeSkillProficiencies({ choices: ["ARCANA"], choiceCount: "1" }, ["ARCANA", "STEALTH"])).toEqual({ type: "choice", choiceCount: 1, options: ["ARCANA"] });
    expect(normalizeSkillProficiencies({ options: ["ANY"], choiceCount: 0 }, ["ARCANA"])).toBeNull();
  });

  it("clamps slot values and accounts for full, half, third, artificer and subclass casters", () => {
    expect(calculateCasterLevel({ level: 40, characterClass: { name: "ARTIFICER_2014", spellcastingType: "HALF" } }, "RULES_2014")).toEqual({ casterLevel: 10, pactLevel: 0 });
    expect(calculateCasterLevel({ level: 6, characterClass: { spellcastingType: "NONE" }, subclass: { spellcastingType: "THIRD" } }, "RULES_2014")).toEqual({ casterLevel: 2, pactLevel: 0 });
    expect(calculateCasterLevel({ level: Number.NaN, characterClass: { spellcastingType: "HALF" }, multiclasses: [{ classLevel: 3.9, characterClass: { spellcastingType: "FULL" } }] }, "RULES_2014")).toEqual({ casterLevel: 3, pactLevel: 0 });
    expect(getStandardSpellSlots(-1, { 0: [1] })).toEqual([1]);
    expect(getPactMagicSlots(50, { 20: { slots: 4, level: 5 } })).toEqual({ slots: 4, level: 5 });
    expect(normalizeSpellSlotArray(["2", -1, 1.8, "bad"])).toEqual([2, 0, 1, 0, 0, 0, 0, 0, 0]);
    expect(applySpellSlotMaximumDelta([3, 1], [2, 2], [1, 4])).toEqual([1, 3, 0, 0, 0, 0, 0, 0, 0]);
    const character = { level: 5, characterClass: { spellcastingType: "FULL" as const } };
    expect(getMaximumStandardSpellSlots(character, { 5: [4, 3] }, "RULES_2014")).toEqual([4, 3, 0, 0, 0, 0, 0, 0, 0]);
    expect(getMaximumPactSpellSlots({ ...character, characterClass: { spellcastingType: "PACT" as const } }, { 5: { slots: 2, level: 3 } }, "RULES_2014")).toBe(2);
  });

  it("builds creation state across Tasha choices, feat effects and slot kinds", () => {
    expect(buildCreationAbilityScores({
      asiSystem: "CUSTOM", pointBuy: [], simple: [], custom: [{ ability: "CON", value: "14" }, { ability: "LUCK", value: 99 }],
      isDefaultASI: false, raceASI: { STR: 2 }, subraceASI: { DEX: 1 }, subraceReplacesASI: false,
      racialChoices: { basicChoices: [], tashaChoices: [{ groupIndex: 0, selectedAbilities: ["STR"] }, { groupIndex: 1, selectedAbilities: ["DEX"] }] },
      feats: [{ grantedASI: { WIS: 1 }, selectedChoiceOptionIds: [[1, 2], 99], choiceOptions: [
        { choiceOptionId: 1, effectKind: "ASI", effectAbility: "CHA", effectAmount: 2 },
        { choiceOptionId: 2, optionNameEng: "Resilient (Constitution)" },
      ], resilient: true }],
    })).toEqual({ scores: { STR: 12, DEX: 11, CON: 15, INT: 10, WIS: 11, CHA: 12 }, resilientSavingThrows: ["CON"] });
    expect(getInitialSpellSlots({ className: "NONE", spellcastingType: "NONE", standardProgression: {}, pactProgression: {} })).toEqual({ currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0], currentPactSlots: 0 });
    expect(buildInitialCharacterState({
      asiSystem: "SIMPLE", pointBuy: [], simple: [{ ability: "CON", value: 22 }], isDefaultASI: true, raceASI: { STR: 1 }, subraceReplacesASI: false,
      feats: [], className: "WARLOCK_2014", spellcastingType: "PACT", savingThrows: ["WIS", "WIS"], hitDie: 8, hasTough: true,
      standardProgression: {}, pactProgression: { 1: { slots: 1, level: 1 } },
    })).toMatchObject({ scores: { CON: 20, STR: 11 }, currentPactSlots: 1, maxHp: 15, savingThrows: ["WIS"] });
    expect(buildCreationAbilityScores({
      asiSystem: "POINT_BUY", pointBuy: [{ ability: "STR", value: 19 }], simple: [], isDefaultASI: true,
      raceASI: { basic: { simple: { STR: 1 } } }, subraceASI: { DEX: 1 }, subraceReplacesASI: false,
      feats: [{ grantedASI: {}, selectedChoiceOptionIds: [1], choiceOptions: [{ choiceOptionId: 1, optionNameEng: "Unrelated option" }], resilient: true }],
    })).toEqual({ scores: { STR: 20, DEX: 11, CON: 10, INT: 10, WIS: 10, CHA: 10 }, resilientSavingThrows: [] });
  });

  it("applies level-up deltas, clamps state and deduplicates additions", () => {
    const before = {
      level: 4, scores, maxHp: 20, currentHp: 19, currentSpellSlots: [1], currentPactSlots: 3,
      spellcasting: { level: 4, characterClass: { spellcastingType: "FULL" as const } }, featureIds: [1, 2.8, Number.NaN],
      proficientSkills: ["ARCANA"], expertiseSkills: [], additionalSaveProficiencies: ["CON"],
    };
    const after = applyLevelUp(before, {
      scores: { ...scores, CON: 21 }, hitDieIncrease: -4, hasTough: true, takesTough: true,
      spellcastingAfter: { level: 5, characterClass: { spellcastingType: "PACT" as const } }, featureIdsToAdd: [2, 3.5], featureIdsToRemove: [1],
      proficientSkillsToAdd: ["ARCANA"], expertiseSkillsToAdd: ["STEALTH"], saveProficienciesToAdd: ["WIS"],
    }, { standardProgression: { 4: [3], 5: [4] }, pactProgression: { 5: { slots: 2, level: 3 } } });
    expect(after).toMatchObject({ level: 5, scores: { CON: 20 }, maxHp: 55, currentHp: 54, currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0], currentPactSlots: 2, featureIds: [2, 3], proficientSkills: ["ARCANA", "STEALTH"], expertiseSkills: ["STEALTH"], additionalSaveProficiencies: ["CON", "WIS"] });
    expect(mergeUniqueLines(null, [" Common ", "", "Elvish", "Common"])).toBe("Common\nElvish");
    // KR27.9: підвищення рівня показник не знижує — сміттєвий STR (NaN) і CON 9 лишають
    // персонажеві його десятки, а DEX 21 обрізається стелею. Раніше тут виходили 0 і 9.
    expect(applyLevelUp({ ...before, currentPactSlots: -1 }, {
      scores: { STR: Number.NaN, DEX: 21, CON: 9, INT: 10, WIS: 10, CHA: 10 }, hitDieIncrease: Number.NaN,
      hasTough: true, takesTough: false, spellcastingAfter: before.spellcasting,
    }, { standardProgression: { 4: [3] }, pactProgression: {} })).toMatchObject({
      scores: { STR: 10, DEX: 20, CON: 10 }, currentPactSlots: 0, featureIds: [1, 2], proficientSkills: ["ARCANA"],
    });
  });
});
