import { describe, expect, it } from "vitest";
import { Ability, AbilityBonusType } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import { calculateFinalAC } from "@/lib/logic/bonus-calculator";

type ArmorRule = {
  baseAC: number;
  abilityBonusType: AbilityBonusType;
};

describe("KR2.5 — armor class за PHB 2014", () => {
  // PHB 2014, с. 144-145 «Armor and Shields».
  it.each([
    ["без броні", 18, null, 14],
    ["легка броня", 18, { baseAC: 11, abilityBonusType: AbilityBonusType.FULL }, 15],
    ["середня броня", 18, { baseAC: 14, abilityBonusType: AbilityBonusType.MAX2 }, 16],
    ["важка броня", 18, { baseAC: 16, abilityBonusType: AbilityBonusType.NONE }, 16],
  ] as const)("%s рахує AC за формулою 2014", (_name, dex, armor, expected) => {
    expect(calculateFinalAC(buildPers({ dex, armor }))).toBe(expected);
  });
});

// KR31.4 — критерій власника: бойовий стиль «Оборона» 2024 дає 17 КЗ у кольчузі, а не 16.
describe("KR31.4 — бойовий стиль «Оборона» 2024", () => {
  const chainMail: ArmorRule = { baseAC: 16, abilityBonusType: AbilityBonusType.NONE };
  const defense = { featureId: 1, givesAC: 1, requiresArmorForACBonus: true };

  it("додає +1 КЗ у кольчузі", () => {
    expect(calculateFinalAC(buildPers({ dex: 10, armor: chainMail }))).toBe(16);
    expect(calculateFinalAC(buildPers({ dex: 10, armor: chainMail, featFeature: defense }))).toBe(17);
  });

  it("без обладунку не додає нічого — «While you're wearing Light, Medium, or Heavy armor»", () => {
    expect(calculateFinalAC(buildPers({ dex: 10, armor: null, featFeature: defense }))).toBe(10);
  });
});

function buildPers({ dex, armor, featFeature }: {
  dex: number;
  armor: ArmorRule | null;
  featFeature?: Record<string, unknown>;
}): PersWithRelations {
  return {
    level: 1,
    str: 10,
    dex,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    armors: armor
      ? [{
        equipped: true,
        abilityBonuses: [Ability.DEX],
        abilityBonusType: armor.abilityBonusType,
        armor: {
          baseAC: armor.baseAC,
          abilityBonuses: [Ability.DEX],
          abilityBonusType: armor.abilityBonusType,
        },
      }]
      : [],
    wearsShield: false,
    additionalShieldBonus: 0,
    features: [],
    traits: [],
    race: { traits: [] },
    subrace: null,
    raceVariants: [],
    raceChoiceOptions: [],
    class: { features: [] },
    subclass: null,
    multiclasses: [],
    classOptionalFeatures: [],
    feats: featFeature ? [{ feat: { grantsFeature: [featFeature] } }] : [],
    magicItems: [],
  } as unknown as PersWithRelations;
}
