import { describe, expect, it } from "vitest";
import { Ability, Skills } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import {
  calculateFinalAC,
  calculateFinalInitiative,
  calculateFinalSave,
  calculateFinalSkill,
  calculateFinalSpeed,
  calculateFinalStat,
  explainFinalAC,
  explainFinalInitiative,
  explainFinalSave,
  explainFinalSkill,
  explainFinalSpeed,
  explainFinalStat,
} from "./bonus-calculator";

function buildRichPersonas(): PersWithRelations[] {
  const bard2014 = {
    level: 6,
    ruleset: "RULES_2014",
    str: 10, dex: 15, con: 14, int: 12, wis: 13, cha: 17,
    statBonuses: { CHA: 1 },
    statModifierBonuses: { DEX: 1 },
    saveBonuses: { WIS: 2 },
    miscSaveBonuses: { CON: 1 },
    skillBonuses: { STEALTH: 2 },
    additionalSaveProficiencies: [Ability.DEX, Ability.CHA],
    skills: [
      { name: Skills.PERFORMANCE, proficiencyType: "EXPERTISE" },
      { name: Skills.PERCEPTION, proficiencyType: "PROFICIENT" },
    ],
    initiativeBonuses: { value: 1 },
    speedBonuses: { value: 5 },
    acBonuses: { value: 1 },
    wearsShield: true,
    additionalShieldBonus: 1,
    armors: [{ equipped: true, overrideBaseAC: null, miscACBonus: 1, armor: { name: "STUDDED_LEATHER", baseAC: 12, abilityBonuses: ["DEX"], abilityBonusType: "FULL" } }],
    race: { speed: 25, traits: [] },
    subrace: { speedModifier: 5, traits: [] },
    class: { name: "BARD_2014", features: [{ levelGranted: 2, feature: { featureId: 1, engName: "Jack of All Trades" } }] },
    feats: [{ feat: { grantsFeature: [{ featureId: 2, engName: "Fighting Style: Defense", givesAC: 1, requiresArmorForACBonus: true, speedBonus: 10 }] } }],
    magicItems: [{ isEquipped: true, isAttuned: true, magicItem: { requiresAttunement: true, bonusToAC: 1, bonusToSavingThrows: 1 } }],
  };
  const monk2024 = {
    level: 10,
    ruleset: "RULES_2024",
    str: 12, dex: 18, con: 14, int: 10, wis: 16, cha: 8,
    skills: [{ name: Skills.ACROBATICS, proficiencyType: "PROFICIENT" }],
    wearsShield: false,
    armors: [{ equipped: true, overrideBaseAC: null, miscACBonus: null, armor: { name: "UNARMORED_DEFENSE_MONK", baseAC: 10, abilityBonuses: ["DEX", "WIS"], abilityBonusType: "FULL" } }],
    race: { speed: 30, traits: [] },
    class: { name: "MONK_2024", features: [] },
    feats: [{ feat: { grantsFeature: [{ featureId: 3, engName: "Alert: Initiative Proficiency (2024)", initiativeProficiency: true }] } }],
  };
  return [bard2014, monk2024].map((draft) => draft as unknown as PersWithRelations);
}

function readAllTotals(pers: PersWithRelations) {
  return {
    stats: Object.values(Ability).map((ability) => calculateFinalStat(pers, ability)),
    saves: Object.values(Ability).map((ability) => calculateFinalSave(pers, ability)),
    skills: Object.values(Skills).map((skill) => calculateFinalSkill(pers, skill).total),
    ac: calculateFinalAC(pers),
    speed: calculateFinalSpeed(pers),
    initiative: calculateFinalInitiative(pers),
  };
}

describe("характеризація підсумків перед розкладкою", () => {
  it("числа двох багатих персонажів не змінюються", () => {
    expect(buildRichPersonas().map(readAllTotals)).toMatchInlineSnapshot(`
      [
        {
          "ac": 22,
          "initiative": 5,
          "saves": [
            0,
            6,
            3,
            1,
            3,
            7,
          ],
          "skills": [
            1,
            4,
            4,
            6,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            4,
            2,
            5,
            5,
            10,
            5,
          ],
          "speed": 45,
          "stats": [
            10,
            15,
            14,
            12,
            13,
            18,
          ],
        },
        {
          "ac": 17,
          "initiative": 8,
          "saves": [
            1,
            4,
            2,
            0,
            3,
            -1,
          ],
          "skills": [
            1,
            8,
            4,
            4,
            0,
            0,
            0,
            0,
            0,
            3,
            3,
            3,
            3,
            3,
            -1,
            -1,
            -1,
            -1,
          ],
          "speed": 50,
          "stats": [
            12,
            18,
            14,
            10,
            16,
            8,
          ],
        },
      ]
    `);
  });
});

describe("розкладка «звідки число»", () => {
  const [bard, monk] = buildRichPersonas();

  it("КЗ барда: обладунок, щит, ручний бонус, риса й предмет", () => {
    expect(explainFinalAC(bard)).toEqual([
      { label: "Базовий КЗ: Проклепаний шкіряний обладунок", value: 16 },
      { label: "Щит", value: 3 },
      { label: "Ручний бонус", value: 1 },
      { label: "Риси", value: 1 },
      { label: "Магічні предмети", value: 1 },
    ]);
  });

  it("швидкість монаха: вид і Рух без обладунків", () => {
    expect(explainFinalSpeed(monk)).toEqual([
      { label: "Вид", value: 30 },
      { label: "Рух без обладунків", value: 20 },
    ]);
  });

  it("ініціатива барда 2014: Спритність, ручний бонус, Майстер на всі руки", () => {
    expect(explainFinalInitiative(bard)).toEqual([
      { label: "Модифікатор (Спритність)", value: 3 },
      { label: "Ручний бонус", value: 1 },
      { label: "Майстер на всі руки", value: 1 },
    ]);
  });

  it("навичка з експертизою", () => {
    expect(explainFinalSkill(bard, Skills.PERFORMANCE)).toEqual([
      { label: "Модифікатор (Харизма)", value: 4 },
      { label: "Експертиза", value: 6 },
    ]);
  });

  it("сума складників дорівнює числу на листі для кожного значення", () => {
    const mismatches = buildRichPersonas().flatMap((pers) => [
      ...Object.values(Ability).flatMap((ability) => [
        sumOf(explainFinalStat(pers, ability)) === calculateFinalStat(pers, ability) ? [] : [`stat ${ability}`],
        sumOf(explainFinalSave(pers, ability)) === calculateFinalSave(pers, ability) ? [] : [`save ${ability}`],
      ]).flat(),
      ...Object.values(Skills).flatMap((skill) => (sumOf(explainFinalSkill(pers, skill)) === calculateFinalSkill(pers, skill).total ? [] : [`skill ${skill}`])),
      ...(sumOf(explainFinalAC(pers)) === calculateFinalAC(pers) ? [] : ["ac"]),
      ...(sumOf(explainFinalSpeed(pers)) === calculateFinalSpeed(pers) ? [] : ["speed"]),
      ...(sumOf(explainFinalInitiative(pers)) === calculateFinalInitiative(pers) ? [] : ["initiative"]),
    ]);
    expect(mismatches).toEqual([]);
  });
});

function sumOf(parts: { value: number }[]): number {
  return parts.reduce((total, part) => total + part.value, 0);
}
