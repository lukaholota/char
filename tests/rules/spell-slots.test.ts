import { describe, expect, it } from "vitest";
import {
  calculateCasterLevel,
  getMaximumStandardSpellSlots,
  getMaximumPactSpellSlots,
  applySpellSlotMaximumDelta,
} from "@/rules/spellcasting";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";

describe("KR2.5 — spell slots за PHB 2014", () => {
  // PHB 2014, с. 164 «Multiclassing → Spell Slots».
  it("повний кастер додає всі рівні класу", () => {
    const result = calculateCasterLevel({
      level: 20,
      characterClass: { name: "WIZARD_2014", spellcastingType: "FULL" },
      subclass: null,
      multiclasses: [],
    }, "RULES_2014");
    expect(result.casterLevel).toBe(20);
    expect(result.pactLevel).toBe(0);
  });

  // PHB 2014, с. 164 «Multiclassing → Spell Slots».
  it("половинний і третинний кастери округлюються вниз до сумування", () => {
    const pers = {
      level: 14,
      characterClass: { name: "PALADIN_2014", spellcastingType: "HALF" as const },
      subclass: null,
      multiclasses: [
        {
          classLevel: 6,
          characterClass: { name: "FIGHTER_2014", spellcastingType: "NONE" as const },
          subclass: { spellcastingType: "THIRD" as const },
        },
        {
          classLevel: 3,
          characterClass: { name: "WIZARD_2014", spellcastingType: "FULL" as const },
          subclass: null,
        },
      ],
    };

    expect(calculateCasterLevel(pers, "RULES_2014").casterLevel).toBe(7);
  });

  // PHB 2014, с. 164-165 «Multiclassing → Spell Slots»; BUG-010.
  it("некастер не має стандартних слотів", () => {
    const fighter = {
      level: 2,
      characterClass: { name: "FIGHTER_2014", spellcastingType: "NONE" as const },
      subclass: null,
      multiclasses: [],
    };
    const maxSlots = getMaximumStandardSpellSlots(fighter, SPELL_SLOT_PROGRESSION.FULL, "RULES_2014");
    expect(maxSlots).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("відокремлює пактову магію від стандартних слотів", () => {
    const warlockWizard = {
      level: 10,
      characterClass: { name: "WIZARD_2014", spellcastingType: "FULL" as const },
      subclass: null,
      multiclasses: [
        {
          classLevel: 5,
          characterClass: { name: "WARLOCK_2014", spellcastingType: "PACT" as const },
          subclass: null,
        },
      ],
    };
    const casterLevel = calculateCasterLevel(warlockWizard, "RULES_2014");
    expect(casterLevel).toEqual({ casterLevel: 5, pactLevel: 5 });
    expect(getMaximumStandardSpellSlots(warlockWizard, SPELL_SLOT_PROGRESSION.FULL, "RULES_2014")).toEqual([
      4, 3, 2, 0, 0, 0, 0, 0, 0,
    ]);
    expect(getMaximumPactSpellSlots(warlockWizard, SPELL_SLOT_PROGRESSION.PACT, "RULES_2014")).toBe(2);
  });

  it("правильно коригує слоти при підвищенні рівня", () => {
    const currentSlots = [2, 0, 0, 0, 0, 0, 0, 0, 0];
    const beforeMax = [2, 0, 0, 0, 0, 0, 0, 0, 0];
    const afterMax = [3, 0, 0, 0, 0, 0, 0, 0, 0];
    const updatedSlots = applySpellSlotMaximumDelta(currentSlots, beforeMax, afterMax);
    expect(updatedSlots).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});


describe("KR27.6 — рівень заклинача мультикласу 2024 (SRD 5.2.1, Multiclassing → Spell Slots)", () => {
  const halfCaster = (className: string) => ({ name: className, spellcastingType: "HALF" as const });
  const fullCaster = (className: string) => ({ name: className, spellcastingType: "FULL" as const });
  const martial = (className: string) => ({ name: className, spellcastingType: "NONE" as const });
  const thirdCasterSubclass = { spellcastingType: "THIRD" as const };

  // «Half your levels (round up) in the Paladin and Ranger classes».
  it("половина рівнів паладина й слідопита округлюється ВГОРУ", () => {
    const paladinSorcerer = {
      level: 8,
      characterClass: halfCaster("PALADIN_2024"),
      multiclasses: [{ classLevel: 3, characterClass: fullCaster("SORCERER_2024") }],
    };
    const rangerDruid = {
      level: 8,
      characterClass: halfCaster("RANGER_2024"),
      multiclasses: [{ classLevel: 3, characterClass: fullCaster("DRUID_2024") }],
    };

    expect(calculateCasterLevel(paladinSorcerer, "RULES_2024").casterLevel).toBe(6);
    expect(calculateCasterLevel(rangerDruid, "RULES_2024").casterLevel).toBe(6);
  });

  // Basic Rules 2024: «one third of your Fighter or Rogue levels (round down)». Р41: асиметрія
  // навмисна — Пройдисвіт 4 (Таємний) / Бард 4 має 5, не 6.
  it("третина рівнів Лицаря-Чаклуна й Таємного Пройдисвіта округлюється ВНИЗ", () => {
    const rogueBard = {
      level: 8,
      characterClass: martial("ROGUE_2024"),
      subclass: thirdCasterSubclass,
      multiclasses: [{ classLevel: 4, characterClass: fullCaster("BARD_2024") }],
    };
    const fighterWizard = {
      level: 8,
      characterClass: martial("FIGHTER_2024"),
      subclass: thirdCasterSubclass,
      multiclasses: [{ classLevel: 5, characterClass: fullCaster("WIZARD_2024") }],
    };

    expect(calculateCasterLevel(rogueBard, "RULES_2024").casterLevel).toBe(5);
    expect(calculateCasterLevel(fighterWizard, "RULES_2024").casterLevel).toBe(6);
  });

  // PHB 2014, с. 164: у 2014 половинні округлюються вниз — те саме тіло, інша редакція.
  it("та сама пара класів у 2014 округлюється вниз", () => {
    const paladinSorcerer = {
      level: 8,
      characterClass: halfCaster("PALADIN_2014"),
      multiclasses: [{ classLevel: 3, characterClass: fullCaster("SORCERER_2014") }],
    };

    expect(calculateCasterLevel(paladinSorcerer, "RULES_2014").casterLevel).toBe(5);
  });

  // TCoE: артифіцер округлюється вгору вже у 2014 — той самий випадок, що половинні 2024.
  it("артифіцер 2014 округлюється вгору тим самим правилом", () => {
    const artificer = { level: 5, characterClass: halfCaster("ARTIFICER_2014") };

    expect(calculateCasterLevel(artificer, "RULES_2014").casterLevel).toBe(3);
  });

  // 2024: паладин і слідопит мають слоти вже на 1-му рівні класу.
  it("одноклассовий паладин 2024 на 1-му рівні вже має рівень заклинача 1", () => {
    const paladin = { level: 1, characterClass: halfCaster("PALADIN_2024") };

    expect(calculateCasterLevel(paladin, "RULES_2024").casterLevel).toBe(1);
    expect(calculateCasterLevel(paladin, "RULES_2014").casterLevel).toBe(0);
  });
});
