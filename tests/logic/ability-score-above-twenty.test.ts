import { describe, expect, it } from "vitest";
import { Ability, Skills } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import {
  calculateFinalModifier,
  calculateFinalSave,
  calculateFinalSkill,
  calculateFinalStat,
  calculateSpellAttack,
  calculateSpellDC,
} from "@/lib/logic/bonus-calculator";
import { formatModifier } from "@/lib/logic/utils";

/// KR27.9. Епічний дар виводить показник за 20, тож усе, що лист і PDF рахують від нього, має
/// рахуватися формулою, а не таблицею до двадцяти. Числа беруться з №24 (Аазимар, Чародій 19 /
/// Чорнокнижник 1): ХАР 21, бонус вправності 6.

function buildSorcerer(charisma: number): PersWithRelations {
  return {
    persId: 1,
    level: 20,
    str: 8,
    dex: 13,
    con: 18,
    int: 10,
    wis: 12,
    cha: charisma,
    maxHp: 122,
    currentHp: 122,
    tempHp: 0,
    statBonuses: {},
    statModifierBonuses: {},
    saveBonuses: {},
    skillBonuses: {},
    hpBonuses: {},
    speedBonuses: {},
    acBonuses: {},
    initiativeBonuses: {},
    proficiencyBonuses: {},
    additionalSaveProficiencies: [Ability.CHA],
    raceStaticAcBonus: 0,
    overrideBaseAC: null,
    wearsShield: false,
    additionalShieldBonus: 0,
    armors: [],
    skills: [{ name: Skills.PERSUASION, proficiencyType: "PROFICIENT" }],
    features: [],
    race: { traits: [] },
    subrace: null,
    raceVariants: [],
    raceChoiceOptions: [],
    class: { features: [] },
    subclass: null,
    multiclasses: [],
    classOptionalFeatures: [],
    choiceOptions: [],
    feats: [],
    magicItems: [],
  } as unknown as PersWithRelations;
}

describe("KR27.9 — лист і друк при характеристиці вище 20", () => {
  it("показник 21 доходить до листа без обрізання до 20", () => {
    expect(calculateFinalStat(buildSorcerer(21), Ability.CHA)).toBe(21);
  });

  it("модифікатор рахується формулою: 21 дає +5, 22 — +6", () => {
    expect(calculateFinalModifier(buildSorcerer(21), Ability.CHA)).toBe(5);
    expect(calculateFinalModifier(buildSorcerer(22), Ability.CHA)).toBe(6);
    expect(formatModifier(calculateFinalModifier(buildSorcerer(22), Ability.CHA))).toBe("+6");
  });

  it("рятівний кидок, СК заклинань і бонус атаки заклинанням ростуть разом із модифікатором", () => {
    const twentyTwo = buildSorcerer(22);

    expect(calculateFinalSave(twentyTwo, Ability.CHA)).toBe(12);
    expect(calculateSpellDC(twentyTwo, Ability.CHA)).toBe(20);
    expect(calculateSpellAttack(twentyTwo, Ability.CHA)).toBe(12);
    expect(calculateFinalSkill(twentyTwo, Skills.PERSUASION).total).toBe(12);
  });

  it("21 і 20 дають однаковий модифікатор — це правило, а не обрізання", () => {
    expect(calculateSpellDC(buildSorcerer(21), Ability.CHA)).toBe(calculateSpellDC(buildSorcerer(20), Ability.CHA));
    expect(calculateSpellDC(buildSorcerer(22), Ability.CHA)).toBe(calculateSpellDC(buildSorcerer(20), Ability.CHA) + 1);
  });
});
