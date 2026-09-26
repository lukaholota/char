import { describe, expect, it } from "vitest";
import { Classes, SpellcastingType } from "@prisma/client";
import { calculateCasterLevel, type SpellcastingPersLike } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { readBloodHunterSource } from "../../prisma/seed/bloodHunter";

const profaneSoul = readBloodHunterSource().subclasses.find((subclass) => subclass.enum === "ORDER_OF_THE_PROFANE_SOUL") as unknown as {
  spellcastingTable: { spellSlots: number[]; slotLevel: number[] };
};

const RULESETS = [
  { ruleset: "RULES_2014", bloodHunter: Classes.BLOOD_HUNTER_2014, warlock: Classes.WARLOCK_2014 },
  { ruleset: "RULES_2024", bloodHunter: Classes.BLOOD_HUNTER_2024, warlock: Classes.WARLOCK_2024 },
] as const;

const PROFANE_SOUL = { spellcastingType: SpellcastingType.PACT };

function buildBloodHunter(edition: (typeof RULESETS)[number], level: number, warlockLevel = 0): SpellcastingPersLike {
  const bloodHunterLevel = level - warlockLevel;
  return {
    ruleset: edition.ruleset,
    level,
    class: { name: edition.bloodHunter, spellcastingType: SpellcastingType.NONE },
    subclass: bloodHunterLevel >= 3 ? PROFANE_SOUL : null,
    multiclasses: warlockLevel
      ? [{ classLevel: warlockLevel, class: { name: edition.warlock, spellcastingType: SpellcastingType.PACT }, subclass: null }]
      : [],
  };
}

function findPactSlots(pers: SpellcastingPersLike) {
  const { pactLevel } = calculateCasterLevel(pers);
  return SPELL_SLOT_PROGRESSION.PACT[pactLevel as keyof typeof SPELL_SLOT_PROGRESSION.PACT] ?? null;
}

describe("O45 — магія пакту Ордену нечестивої душі", () => {
  for (const edition of RULESETS) {
    it(`${edition.ruleset}: слоти й рівень слотів на кожному рівні мисливця — з таблиці ордену`, () => {
      for (let level = 3; level <= 20; level++) {
        const index = level - 1;
        expect(findPactSlots(buildBloodHunter(edition, level)), `рівень ${level}`).toEqual({
          slots: profaneSoul.spellcastingTable.spellSlots[index],
          level: profaneSoul.spellcastingTable.slotLevel[index],
        });
      }
    });

    it(`${edition.ruleset}: мисливець без ордену магії пакту не має`, () => {
      expect(calculateCasterLevel(buildBloodHunter(edition, 2)).pactLevel).toBe(0);
    });

    it(`${edition.ruleset}: BH-005 — мисливець 7 / чорнокнижник 3 = пакт 5: два слоти 3-го рівня, а не 2 + 2`, () => {
      const pers = buildBloodHunter(edition, 10, 3);
      expect(calculateCasterLevel(pers)).toEqual({ casterLevel: 0, pactLevel: 5 });
      expect(findPactSlots(pers)).toEqual({ slots: 2, level: 3 });
    });

    it(`${edition.ruleset}: чорнокнижник першим класом — та сама третина рівнів мисливця`, () => {
      const pers: SpellcastingPersLike = {
        ruleset: edition.ruleset,
        level: 11,
        class: { name: edition.warlock, spellcastingType: SpellcastingType.PACT },
        subclass: null,
        multiclasses: [{ classLevel: 9, class: { name: edition.bloodHunter, spellcastingType: SpellcastingType.NONE }, subclass: PROFANE_SOUL }],
      };
      expect(calculateCasterLevel(pers).pactLevel).toBe(2 + 3);
    });
  }
});
