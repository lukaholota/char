import { describe, expect, it } from "vitest";
import { buildItemStateKey, findMagicItemState, findSwitchableItemState, readItemStateMagicItemId } from "@/rules/magic-item-states";
import { findD20RollState, mergeStateEffects } from "@/rules/state-effects";

const KEY = buildItemStateKey(42);
const partOf = (engName: string, ruleset = "RULES_2014") => findMagicItemState({ engName, ruleset })!.findPart(KEY);

describe("стани магічних предметів", () => {
  it("ключ стану несе id предмета й не плутається з іншими ефектами", () => {
    expect(KEY).toBe("ITEM:42");
    expect(readItemStateMagicItemId(KEY)).toBe(42);
    expect(readItemStateMagicItemId("HASTE")).toBeNull();
    expect(readItemStateMagicItemId("ITEM:")).toBeNull();
    expect(readItemStateMagicItemId("ITEM:-3")).toBeNull();
  });

  it("редакції розходяться там, де предмет різний", () => {
    expect(findMagicItemState({ engName: "Cloak of Elvenkind", ruleset: "RULES_2014" })?.activationLabel).toBe("Накинути каптур");
    expect(findMagicItemState({ engName: "Cloak of Elvenkind", ruleset: "RULES_2024" })).toBeNull();
    expect(findMagicItemState({ engName: "Boots of Speed", ruleset: "RULES_2024" })?.activationLabel).toBe("Клацнути підборами");
    expect(findMagicItemState({ engName: "Armor of Invulnerability", ruleset: "RULES_2024" })?.effects).toEqual([
      { kind: "IMMUNITY", damageTypes: ["BLUDGEONING", "PIERCING", "SLASHING"] },
    ]);
    expect(findMagicItemState({ engName: "Cloak of Protection" })).toBeNull();
    expect(findMagicItemState({ engName: null })).toBeNull();
  });

  it("каптур дає перевагу на Непомітність, але не на інші перевірки", () => {
    const effects = mergeStateEffects([partOf("Cloak of Elvenkind")]);
    expect(findD20RollState(effects, { kind: "check", ability: "DEX", skill: "STEALTH" })).toMatchObject({ mode: "ADVANTAGE", advantageSources: [KEY] });
    expect(findD20RollState(effects, { kind: "check", ability: "DEX", skill: "ACROBATICS" }).mode).toBe("NORMAL");
  });

  it("ініціатива й Уважність — окремі кидки, яких не зачіпає перевага на інші перевірки", () => {
    const effects = mergeStateEffects([
      { rollModifiers: [{ mode: "ADVANTAGE", scope: "INITIATIVE", sourceKey: KEY }, { mode: "ADVANTAGE", scope: "PERCEPTION_CHECK", sourceKey: KEY }] },
    ]);
    expect(findD20RollState(effects, { kind: "check", ability: "DEX", isInitiative: true }).mode).toBe("ADVANTAGE");
    expect(findD20RollState(effects, { kind: "check", ability: "DEX" }).mode).toBe("NORMAL");
    expect(findD20RollState(effects, { kind: "check", ability: "WIS", skill: "PERCEPTION" }).mode).toBe("ADVANTAGE");
    expect(findD20RollState(effects, { kind: "check", ability: "WIS", skill: "INSIGHT" }).mode).toBe("NORMAL");
  });

  it("невидимість — перевага на атаки; примітки двох предметів не зливаються", () => {
    const effects = mergeStateEffects([partOf("Ring of Invisibility"), partOf("Boots of Speed")]);
    expect(findD20RollState(effects, { kind: "attack" }).mode).toBe("ADVANTAGE");
    expect(effects?.speedMultiplier).toBe(2);
    expect(effects?.marks.map((mark) => (mark.kind === "NOTE" ? mark.text : mark.kind))).toEqual([
      "невидимі: атаки по вас — з перешкодою",
      "зникає, коли ви атакуєте чи творите заклинання",
      "принагідні атаки по вас — з перешкодою",
      "сумарно 10 хв до Довгого відпочинку",
    ]);
  });

  it("крила дають швидкість польоту як ефект предмета", () => {
    const wings = findMagicItemState({ engName: "Wings of Flying", ruleset: "RULES_2024" })!;
    expect(wings.effects).toEqual([{ kind: "MOVEMENT", mode: "FLY", feet: 60 }]);
    expect(wings.findPart(KEY).marks).toHaveLength(1);
    expect(partOf("Cloak of Invisibility", "RULES_2024").marks).toContainEqual({ kind: "NOTE", text: "1 година за 1 заряд" });
    expect(partOf("Armor of Invulnerability").marks).toContainEqual({ kind: "NOTE", text: "імунітет до немагічної шкоди" });
  });

  it("випите зілля має стан «Випито»; опір 2014 — за типом шкоди, загальний 2024 — без стану", () => {
    expect(findMagicItemState({ engName: "Potion of Hill Giant Strength" })).toMatchObject({ activationLabel: "Випито", effects: [{ kind: "ABILITY_SCORE", ability: "STR", score: 21 }] });
    expect(findMagicItemState({ engName: "Potion of Resistance (Fire)", ruleset: "RULES_2014" })?.effects).toEqual([{ kind: "RESISTANCE", damageTypes: ["FIRE"] }]);
    expect(findMagicItemState({ engName: "Potion of Resistance (Fire)", ruleset: "RULES_2024" })).toBeNull();
    expect(findSwitchableItemState({ engName: "Potion of Hill Giant Strength", itemType: "POTION" })).toBeNull();
    expect(findSwitchableItemState({ engName: "Boots of Speed", itemType: "WONDROUS_ITEM", ruleset: "RULES_2014" })?.activationLabel).toBe("Клацнути підборами");
    expect(partOf("Potion of Heroism").bonusDice).toHaveLength(2);
    expect(partOf("Potion of Invisibility", "RULES_2024").marks).toContainEqual({ kind: "NOTE", text: "зникає, коли ви атакуєте, завдаєте шкоди чи творите заклинання" });
  });
});
