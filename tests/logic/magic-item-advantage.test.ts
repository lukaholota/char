import { describe, expect, it } from "vitest";
import type { PersWithRelations } from "@/lib/actions/pers";
import { applyActiveStates, listActiveStateParts } from "@/lib/logic/active-states";
import { describeRollState } from "@/lib/logic/state-labels";
import type { D20Roll } from "@/rules/state-effects";
import { buildPersWithItems } from "./magic-item-pers-fixture";

const SHIELD = { magicItemId: 11, name: "Щит вартового", engName: "Sentinel Shield", requiresAttunement: false };
const CLOAK_2024 = { magicItemId: 12, name: "Плащ ельфів", engName: "Cloak of Elvenkind", ruleset: "RULES_2024" };
const CLOAK_2014 = { magicItemId: 13, name: "Плащ ельфів", engName: "Cloak of Elvenkind" };

const INITIATIVE: D20Roll = { kind: "check", ability: "DEX", isInitiative: true };
const PERCEPTION: D20Roll = { kind: "check", ability: "WIS", skill: "PERCEPTION" };
const STEALTH: D20Roll = { kind: "check", ability: "DEX", skill: "STEALTH" };
const roll = (pers: PersWithRelations, d20: D20Roll) => describeRollState(applyActiveStates(pers), d20);

describe("пасивна перевага від магічних предметів", () => {
  it("екіпірований щит вартового дає перевагу на ініціативу й Уважність з назвою предмета", () => {
    const pers = buildPersWithItems([SHIELD]);
    expect(roll(pers, INITIATIVE)).toMatchObject({ mode: "ADVANTAGE", sources: ["Щит вартового"] });
    expect(roll(pers, PERCEPTION).mode).toBe("ADVANTAGE");
    expect(roll(pers, { kind: "check", ability: "DEX" }).mode).toBe("NORMAL");
    expect(roll(pers, STEALTH).mode).toBe("NORMAL");
  });

  it("незекіпірований чи неналаштований предмет переваги не дає", () => {
    expect(roll(buildPersWithItems([{ ...SHIELD, isEquipped: false }]), INITIATIVE).mode).toBe("NORMAL");
    expect(roll(buildPersWithItems([{ ...CLOAK_2024, isAttuned: false }]), STEALTH).mode).toBe("NORMAL");
  });

  it("плащ ельфів 2024 діє сам, а 2014 — лише з накинутим каптуром", () => {
    expect(roll(buildPersWithItems([CLOAK_2024]), STEALTH).mode).toBe("ADVANTAGE");
    expect(roll(buildPersWithItems([CLOAK_2014]), STEALTH).mode).toBe("NORMAL");
  });

  it("пасивна перевага не стає станом, який можна вимкнути в «Станах»", () => {
    expect(listActiveStateParts(buildPersWithItems([SHIELD]))).toEqual([]);
  });
});
