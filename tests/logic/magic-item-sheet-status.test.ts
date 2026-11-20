import { describe, expect, it } from "vitest";
import { listManualBonusOverlaps } from "@/lib/logic/magic-item-sheet-status";
import { describeMissingSteps, findMissingActivationSteps, isMagicItemActive } from "@/lib/logic/magic-item-activation";
import { describeMagicItemEffect, hasCountedEffects, isCountedBySheet } from "@/lib/logic/magic-item-effect-text";
import { findMagicItemEffects } from "@/rules/magic-item-effects";
import { buildPersWithItems } from "./magic-item-pers-fixture";

const link = (isEquipped: boolean, isAttuned: boolean, requiresAttunement = true) => ({ isEquipped, isAttuned, magicItem: { requiresAttunement } });
const effectsOf = (engName: string) => findMagicItemEffects({ engName, ruleset: "RULES_2014" });

describe("стан предмета на листі", () => {
  it("називає кроки, яких бракує", () => {
    expect(findMissingActivationSteps(link(true, true))).toEqual([]);
    expect(findMissingActivationSteps(link(false, false))).toEqual(["EQUIP", "ATTUNE"]);
    expect(findMissingActivationSteps(link(false, false, false))).toEqual(["EQUIP"]);
    expect(findMissingActivationSteps(link(true, false))).toEqual(["ATTUNE"]);
    expect(isMagicItemActive(link(true, false, false))).toBe(true);
    expect(isMagicItemActive(link(true, false))).toBe(false);
    expect(describeMissingSteps(["EQUIP", "ATTUNE"])).toBe("екіпіруйте предмет і налаштуйтеся на нього");
    expect(describeMissingSteps(["ATTUNE"])).toBe("налаштуйтеся на предмет");
  });

  it("показує лише те, що лист рахує сам", () => {
    const effects = effectsOf("Rod of the Pact Keeper +1");
    expect(effects.filter(isCountedBySheet).map(describeMagicItemEffect)).toEqual(["Атака заклинаннями +1", "СК заклинань +1"]);
    expect(hasCountedEffects(effects)).toBe(true);
    expect(hasCountedEffects([{ kind: "NOTE", text: "Лише опис" }])).toBe(false);
  });

  it("попереджає про ручний бонус там, де предмет уже рахується", () => {
    const pers = buildPersWithItems([], {
      spellAttackBonuses: { value: 1 },
      skillBonuses: { SLEIGHT_OF_HAND: 5 },
      saveBonuses: { WIS: 1 },
      statBonuses: { CON: 2 },
      acBonuses: { value: 1 },
      proficiencyBonuses: { value: 1 },
      spellDCBonuses: { value: 0 },
    });
    expect(listManualBonusOverlaps(pers, effectsOf("Rod of the Pact Keeper +1"))).toEqual(["атаки заклинаннями"]);
    expect(listManualBonusOverlaps(pers, effectsOf("Gloves of Thievery"))).toEqual(["Спритність рук"]);
    expect(listManualBonusOverlaps(pers, effectsOf("Stone of Good Luck (Luckstone)"))).toEqual(["навичок", "рятівних кидків"]);
    expect(listManualBonusOverlaps(pers, effectsOf("Ioun Stone (Fortitude)"))).toEqual(["Статура"]);
    expect(listManualBonusOverlaps(pers, effectsOf("Ioun Stone (Mastery)"))).toEqual(["бонусу майстерності"]);
    expect(listManualBonusOverlaps(pers, [{ kind: "SAVE_BONUS", bonus: 1, ability: "DEX" }, { kind: "AC_BONUS", bonus: 1 }])).toEqual(["КБ"]);
    expect(listManualBonusOverlaps(buildPersWithItems([]), effectsOf("Rod of the Pact Keeper +1"))).toEqual([]);
    expect(listManualBonusOverlaps(pers, effectsOf("Headband of Intellect"))).toEqual([]);
  });
});
