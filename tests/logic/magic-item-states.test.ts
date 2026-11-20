import { describe, expect, it } from "vitest";
import type { PersWithRelations } from "@/lib/actions/pers";
import { applyActiveStates, findRollState, listActiveStateParts } from "@/lib/logic/active-states";
import { calculateDamageImmunities, calculateFinalStat, calculateItemMovementSpeeds, listSwitchedOnItemStates } from "@/lib/logic/bonus-calculator";
import { listOwnedItemStates } from "@/lib/logic/magic-item-sheet-status";
import { describeActivationAction } from "@/lib/logic/magic-item-activation";
import { endEffectsAfterRest, markItemState } from "@/lib/logic/pers-effect-rows";
import { findStateSourceLabel } from "@/lib/logic/state-labels";
import { buildPersWithItems } from "./magic-item-pers-fixture";

const CLOAK = { magicItemId: 7, name: "Плащ ельфів", engName: "Cloak of Elvenkind" };
const WINGS = { magicItemId: 8, name: "Крила польоту", engName: "Wings of Flying" };
const ARMOR_2024 = { magicItemId: 9, name: "Обладунок невразливості", engName: "Armor of Invulnerability", ruleset: "RULES_2024" };

const switchOn = (pers: PersWithRelations, ...ids: number[]) => ids.reduce((current, id) => markItemState(current, id, true), pers);
const stealth = (pers: PersWithRelations) => findRollState(applyActiveStates(pers), { kind: "check", ability: "DEX", skill: "STEALTH" }).mode;

describe("стани предметів на листі", () => {
  it("увімкнений каптур дає перевагу на Непомітність і підписаний назвою предмета", () => {
    const pers = switchOn(buildPersWithItems([CLOAK]), 7);
    expect(stealth(pers)).toBe("ADVANTAGE");
    expect(listActiveStateParts(pers).map((entry) => entry.sourceKey)).toContain("ITEM:7");
    expect(findStateSourceLabel(pers, "ITEM:7")).toBe("Плащ ельфів");
    expect(findStateSourceLabel(pers, "ITEM:99")).toBe("Магічний предмет");
  });

  it("стан не діє, поки предмет не екіпірований і не налаштований, і картка каже чого бракує", () => {
    const pers = switchOn(buildPersWithItems([{ ...CLOAK, isEquipped: false, isAttuned: false }]), 7);
    expect(stealth(pers)).toBe("NORMAL");
    expect(listSwitchedOnItemStates(pers)).toEqual([]);
    const [cloak] = listOwnedItemStates(pers);
    expect(cloak).toMatchObject({ magicItemId: 7, persMagicItemId: 100, isSwitchedOn: false, missingSteps: ["EQUIP", "ATTUNE"] });
    expect(describeActivationAction(cloak.missingSteps)).toBe("Екіпірувати й налаштуватися");
    expect(describeActivationAction(["EQUIP"])).toBe("Екіпірувати");
    expect(describeActivationAction(["ATTUNE"])).toBe("Налаштуватися");
  });

  it("крила й обладунок додають політ та імунітети лише увімкненими", () => {
    const pers = buildPersWithItems([WINGS, ARMOR_2024]);
    expect(calculateItemMovementSpeeds(pers).FLY).toBeUndefined();
    expect(calculateDamageImmunities(pers)).not.toContain("SLASHING");

    const active = switchOn(pers, 8, 9);
    expect(calculateItemMovementSpeeds(active).FLY).toBe(60);
    expect(calculateDamageImmunities(active)).toEqual(expect.arrayContaining(["BLUDGEONING", "PIERCING", "SLASHING"]));
  });

  it("пасивні предмети в стани не потрапляють; вимкнення й відпочинок знімають стан", () => {
    const pers = switchOn(buildPersWithItems([CLOAK, { magicItemId: 3, engName: "Cloak of Protection" }]), 7);
    expect(listOwnedItemStates(pers).map((item) => item.magicItemId)).toEqual([7]);
    expect(listOwnedItemStates(markItemState(pers, 7, false))[0].isSwitchedOn).toBe(false);
    expect(endEffectsAfterRest(pers, "SHORT").effects).toEqual([]);
  });

  it("випите зілля діє без предмета в спорядженні й не пропонується до вмикання", () => {
    const potion = { magicItemId: 20, name: "Зілля сили пагорбового велетня", engName: "Potion of Hill Giant Strength", ruleset: "RULES_2014", itemType: "POTION" };
    const withPotion = buildPersWithItems([{ ...potion, requiresAttunement: false }]);
    expect(listOwnedItemStates(withPotion)).toEqual([]);

    const drunk = { ...buildPersWithItems([]), effects: [{ effectKey: "ITEM:20", magicItemId: 20, magicItem: potion }] } as unknown as PersWithRelations;
    expect(calculateFinalStat(drunk, "STR")).toBe(21);
    expect(listOwnedItemStates(drunk)).toMatchObject([{ magicItemId: 20, persMagicItemId: null, isSwitchedOn: true, missingSteps: [] }]);
    expect(findStateSourceLabel(drunk, "ITEM:20")).toBe("Зілля сили пагорбового велетня");
    expect(calculateFinalStat(markItemState(drunk, 20, false), "STR")).toBe(10);
  });
});
