import { describe, expect, it } from "vitest";
import { applyAbilityScoreIncrease, calculateAbilityModifier } from "@/rules/abilities";
import { calculateArmorClass } from "@/rules/armor";
import { calculateAverageHitPointIncrease, calculateInitialHitPoints, calculateLevelUpHitPoints } from "@/rules/health";
import { calculateProficiencyBonus, calculateSavingThrowProficiencyBonus, calculateSkillProficiencyBonus } from "@/rules/proficiency";
import { isAbilityScoreIncreaseLevel, needsSubclassSelection } from "@/rules/progression";
import { calculateCasterLevel, getPactMagicSlots, getStandardSpellSlots } from "@/rules/spellcasting";

describe("KR3.1 — чистий rules module", () => {
  it("обчислює modifier і не піднімає ASI вище 20", () => {
    expect(calculateAbilityModifier(9)).toBe(-1);
    expect(applyAbilityScoreIncrease({ STR: 20, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }, "STR", 1).STR).toBe(20);
  });

  it("обчислює proficiency, expertise та saving throw", () => {
    expect(calculateProficiencyBonus(5)).toBe(3);
    expect(calculateSkillProficiencyBonus("EXPERTISE", 3, false)).toBe(6);
    expect(calculateSavingThrowProficiencyBonus(false, 3)).toBe(0);
  });

  it("обчислює current HP за поточною формулою", () => {
    expect(calculateInitialHitPoints(10, 2)).toBe(12);
    expect(calculateAverageHitPointIncrease(10)).toBe(6);
    expect(calculateLevelUpHitPoints({ currentHitPoints: 12, hitDieIncrease: 6, constitutionModifier: 2, toughBonus: 0, retroactiveConstitutionBonus: 0 })).toBe(20);
  });

  it("обчислює unarmored, medium armor і shield AC", () => {
    expect(calculateArmorClass({ dexterityModifier: 4, abilityModifiers: { DEX: 4 }, wearsShield: false, shieldArmorClassBonus: 0, simpleArmorClassBonus: 0, featureArmorClassBonus: 0, magicItemArmorClassBonus: 0 })).toBe(14);
    expect(calculateArmorClass({ dexterityModifier: 4, abilityModifiers: { DEX: 4 }, equippedArmor: { baseArmorClass: 14, characterAbilityBonuses: ["DEX"], characterAbilityBonusType: "MAX2" }, wearsShield: true, shieldArmorClassBonus: 0, simpleArmorClassBonus: 0, featureArmorClassBonus: 0, magicItemArmorClassBonus: 0 })).toBe(18);
  });

  it("залишає Pact Magic окремою і читає обидві slot tables", () => {
    const caster = calculateCasterLevel({
      level: 10,
      characterClass: { name: "WIZARD_2014", spellcastingType: "FULL" },
      multiclasses: [{ classLevel: 5, characterClass: { name: "WARLOCK_2014", spellcastingType: "PACT" } }],
    }, "RULES_2014");
    expect(caster).toEqual({ casterLevel: 5, pactLevel: 5 });
    expect(calculateCasterLevel({
      level: 14,
      characterClass: { name: "PALADIN_2014", spellcastingType: "HALF" },
      multiclasses: [
        { classLevel: 6, characterClass: { name: "FIGHTER_2014", spellcastingType: "NONE" }, subclass: { spellcastingType: "THIRD" } },
        { classLevel: 3, characterClass: { name: "WIZARD_2014", spellcastingType: "FULL" } },
      ],
    }, "RULES_2014")).toEqual({ casterLevel: 7, pactLevel: 0 });
    expect(getStandardSpellSlots(2, { 2: [3, 0, 0] })).toEqual([3, 0, 0]);
    expect(getPactMagicSlots(5, { 5: { slots: 2, level: 3 } })).toEqual({ slots: 2, level: 3 });
  });

  it("визначає subclass та ASI levels з власної class progression структури", () => {
    const fighter = { subclassLevel: 3, abilityScoreUpLevels: [4, 6, 8, 12, 14, 16, 19] };
    expect(needsSubclassSelection(fighter, false, 3)).toBe(true);
    expect(isAbilityScoreIncreaseLevel(fighter, 6)).toBe(true);
  });
});
