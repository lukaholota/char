import { describe, expect, it } from "vitest";
import { Ability } from "@prisma/client";
import {
  calculateAbilityCheckBonus,
  calculateDarkvisionRange,
  calculateFinalAC,
  calculateFinalInitiative,
  calculateFinalSave,
  calculateFinalSkill,
  calculateFinalStat,
  calculateSpellAttack,
  calculateSpellDC,
  explainFinalSave,
} from "@/lib/logic/bonus-calculator";
import { buildSpellcastingStatRows } from "@/lib/logic/spellcasting-stats";

import { buildPersWithItems } from "./magic-item-pers-fixture";

const CLOAK_2014 = { engName: "Cloak of Protection", bonusToAC: 1, bonusToSavingThrows: { all: 1 } };
const BRACERS_2014 = { engName: "Bracers of Defense", bonusToAC: 2, noArmorOrShieldForACBonus: true };
const LEATHER = { equipped: true, overrideBaseAC: null, miscACBonus: null, armor: { name: "LEATHER", baseAC: 11, abilityBonuses: ["DEX"], abilityBonusType: "FULL" } };

describe("магічні предмети в числах листа — поведінка колонок 2014", () => {
  it("плащ захисту додає +1 до КБ і рятівних кидків, лише коли екіпірований і налаштований", () => {
    expect(calculateFinalAC(buildPersWithItems([CLOAK_2014]))).toBe(13);
    expect(calculateFinalSave(buildPersWithItems([CLOAK_2014]), Ability.CON)).toBe(2);
    expect(calculateFinalAC(buildPersWithItems([{ ...CLOAK_2014, isAttuned: false }]))).toBe(12);
    expect(calculateFinalSave(buildPersWithItems([{ ...CLOAK_2014, isEquipped: false }]), Ability.CON)).toBe(1);
  });

  it("наручі захисту діють лише без обладунку й щита", () => {
    expect(calculateFinalAC(buildPersWithItems([BRACERS_2014]))).toBe(14);
    expect(calculateFinalAC(buildPersWithItems([BRACERS_2014], { armors: [LEATHER] }))).toBe(13);
    expect(calculateFinalAC(buildPersWithItems([BRACERS_2014], { wearsShield: true }))).toBe(14);
  });
});

describe("магічні предмети в числах листа — ефекти з реєстру", () => {
  it("плащ захисту 2024 без колонок дає +1 до КБ і ряткидків з назвою предмета", () => {
    const pers = buildPersWithItems([{ name: "Плащ захисту", engName: "Cloak of Protection", ruleset: "RULES_2024" }], { ruleset: "RULES_2024" });
    expect(calculateFinalAC(pers)).toBe(13);
    expect(explainFinalSave(pers, Ability.CON)).toContainEqual({ label: "Плащ захисту", value: 1 });
  });

  it("повʼязка інтелекту ставить 19 і доходить до навичок", () => {
    const pers = buildPersWithItems([{ engName: "Headband of Intellect" }]);
    expect(calculateFinalStat(pers, Ability.INT)).toBe(19);
    expect(calculateFinalSkill(pers, "ARCANA").total).toBe(4);
    expect(calculateFinalStat(buildPersWithItems([{ engName: "Headband of Intellect", isAttuned: false }]), Ability.INT)).toBe(10);
  });

  it("камінь удачі додає до перевірок, ініціативи й ряткидків", () => {
    const pers = buildPersWithItems([{ engName: "Stone of Good Luck (Luckstone)" }]);
    expect(calculateAbilityCheckBonus(pers, Ability.STR)).toBe(1);
    expect(calculateFinalInitiative(pers)).toBe(3);
    expect(calculateFinalSave(pers, Ability.STR)).toBe(1);
  });

  it("жезл хранителя пакту підвищує атаку й СК заклинань, зокрема без джерела", () => {
    const pers = buildPersWithItems([{ engName: "Rod of the Pact Keeper +1" }]);
    expect(calculateSpellAttack(pers, Ability.INT)).toBe(4);
    expect(calculateSpellDC(pers, Ability.INT)).toBe(12);
    expect(buildSpellcastingStatRows(pers, [])[0]).toMatchObject({ attackBonus: 1, saveDC: 9 });
  });

  it("окуляри нічного бачення дають темнозір", () => {
    expect(calculateDarkvisionRange(buildPersWithItems([{ engName: "Goggles of Night", requiresAttunement: false }]))).toBe(60);
  });
});
