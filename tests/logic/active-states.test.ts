import { describe, expect, it } from "vitest";
import { Skills } from "@prisma/client";
import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import { applyActiveStates } from "@/lib/logic/active-states";
import { canActivateFeature, markFeatureActive } from "@/lib/logic/feature-state-rows";
import { describeRollState, findStateValueTone } from "@/lib/logic/state-labels";
import {
  calculateDamageResistances,
  calculateFinalAC,
  calculateFinalInitiative,
  calculateFinalMaxHP,
  calculatePassiveSkill,
  calculateFinalSkill,
  explainFinalAC,
  calculateFinalSpeed,
  calculateWeaponAttackBonus,
  calculateWeaponDamageBonus,
  explainFinalSkill,
  getWeaponAbility,
} from "@/lib/logic/bonus-calculator";

/// O38. Числа — з QA-персонажів №006 (Людина, Берсерк 7, Сила 18) і №004 (Голіаф 5).

const RAGE_2024 = { featureId: 48849, engName: "Barbarian: Rage (2024)" };
const PRIMAL_KNOWLEDGE_2024 = { featureId: 48855, engName: "Barbarian: Primal Knowledge (2024)" };
const LARGE_FORM = { featureId: 48550, engName: "Goliath: Large Form (2024)" };
const RAGE_2014 = { featureId: 2077, engName: "Rage" };
const FRENZY_2014 = { featureId: 8404, engName: "Frenzy" };
const BLADESONG_2014 = { featureId: 8639, engName: "Bladesong" };
const BLADESONG_2024 = { featureId: 51971, engName: "Bladesinger: Bladesong (2024)" };

function buildPers(overrides: Partial<Record<string, unknown>>): PersWithRelations {
  return {
    persId: 6,
    level: 7,
    str: 18,
    dex: 14,
    con: 16,
    int: 8,
    wis: 12,
    cha: 10,
    statBonuses: {},
    statModifierBonuses: {},
    skillBonuses: {},
    speedBonuses: {},
    proficiencyBonuses: {},
    skills: [
      { name: Skills.ATHLETICS, proficiencyType: "PROFICIENT" },
      { name: Skills.PERCEPTION, proficiencyType: "PROFICIENT" },
    ],
    features: [],
    race: { speed: 30, traits: [] },
    subrace: null,
    raceVariants: [],
    raceChoiceOptions: [],
    class: {
      name: "BARBARIAN_2024",
      features: [
        { levelGranted: 1, feature: { ...RAGE_2024, damageResistances: [] } },
        { levelGranted: 3, feature: { ...PRIMAL_KNOWLEDGE_2024, damageResistances: [] } },
      ],
    },
    subclass: null,
    multiclasses: [],
    classOptionalFeatures: [],
    choiceOptions: [],
    feats: [],
    magicItems: [],
    armors: [],
    effects: [],
    exhaustionLevel: 0,
    ruleset: "RULES_2024",
    maxHp: 60,
    hpBonuses: {},
    acBonuses: {},
    initiativeBonuses: {},
    wearsShield: false,
    overrideBaseAC: null,
    additionalShieldBonus: 0,
    ...overrides,
  } as unknown as PersWithRelations;
}

function withFeatureRow(pers: PersWithRelations, feature: { featureId: number; engName: string }, isActive: boolean) {
  return {
    ...pers,
    features: [...pers.features, { featureId: feature.featureId, usesRemaining: 3, isActive, feature }],
  } as unknown as PersWithRelations;
}

const barbarian = buildPers({});
const skillTotals = (pers: PersWithRelations) =>
  [Skills.PERCEPTION, Skills.STEALTH, Skills.ATHLETICS].map((skill) => calculateFinalSkill(pers, skill).total);

describe("O38 — Лють 2024 з Первісним знанням (№006)", () => {
  it("без Люті навички рахуються від звичайних характеристик", () => {
    const calm = applyActiveStates(withFeatureRow(barbarian, RAGE_2024, false));
    expect(skillTotals(calm)).toEqual([4, 2, 7]);
  });

  it("у Люті Сприйняття й Непомітність беруть Силу: +7, +4, Атлетика +7", () => {
    const raging = applyActiveStates(withFeatureRow(barbarian, RAGE_2024, true));
    expect(skillTotals(raging)).toEqual([7, 4, 7]);
  });

  it("розбивка показує Силу як характеристику навички", () => {
    const raging = applyActiveStates(withFeatureRow(barbarian, RAGE_2024, true));
    expect(explainFinalSkill(raging, Skills.PERCEPTION)[0]).toEqual({ label: "Модифікатор (Сила)", value: 4 });
  });

  it("Сила не нав'язується, коли звичайна характеристика краща", () => {
    const wise = buildPers({ wis: 20 });
    const raging = applyActiveStates(withFeatureRow(wise, RAGE_2024, true));
    expect(calculateFinalSkill(raging, Skills.PERCEPTION).total).toBe(8);
  });

  it("навички поза списком Первісного знання не міняються", () => {
    const raging = applyActiveStates(withFeatureRow(barbarian, RAGE_2024, true));
    expect(calculateFinalSkill(raging, Skills.INSIGHT).total).toBe(1);
  });

  it("Лють дає опір дробильній, колючій і рубальній шкоді", () => {
    const calm = applyActiveStates(withFeatureRow(barbarian, RAGE_2024, false));
    const raging = applyActiveStates(withFeatureRow(barbarian, RAGE_2024, true));

    expect(calculateDamageResistances(calm)).toEqual([]);
    expect(calculateDamageResistances(raging)).toEqual(["BLUDGEONING", "PIERCING", "SLASHING"]);
  });
});

describe("O38 — Велика форма Голіафа (№004)", () => {
  const goliath = buildPers({
    level: 5,
    class: { name: "SORCERER_2024", features: [] },
    race: { speed: 35, traits: [{ feature: { ...LARGE_FORM, damageResistances: [] } }] },
  });

  it("без форми швидкість Голіафа 35", () => {
    expect(calculateFinalSpeed(applyActiveStates(withFeatureRow(goliath, LARGE_FORM, false)))).toBe(35);
  });

  it("у Великій формі швидкість 45", () => {
    expect(calculateFinalSpeed(applyActiveStates(withFeatureRow(goliath, LARGE_FORM, true)))).toBe(45);
  });
});

const longsword = {
  isProficient: true,
  attackBonus: 0,
  customDamageBonus: 0,
  customDamageAbility: null,
  weapon: { isRanged: false, properties: [], damage: "1d8" },
} as unknown as PersWeaponWithWeapon;

const rapier = { ...longsword, weapon: { isRanged: false, properties: ["FINESSE"], damage: "1d8" } } as unknown as PersWeaponWithWeapon;

describe("O38 — бонус шкоди Люті до атак Силою", () => {
  it("Лють варвара 7 додає +2 до шкоди атак Силою, але не Спритністю", () => {
    const calm = applyActiveStates(withFeatureRow(barbarian, RAGE_2024, false));
    const raging = applyActiveStates(withFeatureRow(barbarian, RAGE_2024, true));
    const nimble = applyActiveStates(withFeatureRow(buildPers({ str: 10, dex: 18 }), RAGE_2024, true));

    expect(calculateWeaponDamageBonus(calm, longsword)).toBe(4);
    expect(calculateWeaponDamageBonus(raging, longsword)).toBe(6);
    expect(calculateWeaponDamageBonus(nimble, rapier)).toBe(4);
  });
});

describe("O38 — Шаленство 2014 живе лише в Люті", () => {
  const berserker = buildPers({
    class: {
      name: "BARBARIAN_2014",
      features: [
        { levelGranted: 1, feature: { ...RAGE_2014, damageResistances: [] } },
        { levelGranted: 3, feature: { ...FRENZY_2014, damageResistances: [] } },
      ],
    },
  });

  it("вимкнення Люті гасить і Шаленство", () => {
    const frenzied = withFeatureRow(withFeatureRow(berserker, RAGE_2014, true), FRENZY_2014, true);
    expect(canActivateFeature(withFeatureRow(berserker, RAGE_2014, false), FRENZY_2014.featureId)).toBe(false);
    expect(canActivateFeature(withFeatureRow(berserker, RAGE_2014, true), FRENZY_2014.featureId)).toBe(true);

    const calm = markFeatureActive(frenzied, RAGE_2014.featureId, false);
    expect(calm.features.map((row) => row.isActive)).toEqual([false, false]);
  });
});

describe("O38 — Пісня клинка", () => {
  const bladesinger = (className: string, song: { featureId: number; engName: string }) =>
    buildPers({
      level: 6,
      str: 8,
      dex: 16,
      int: 18,
      armors: [],
      wearsShield: false,
      overrideBaseAC: null,
      additionalShieldBonus: 0,
      acBonuses: {},
      class: { name: className, features: [] },
      subclass: { features: [{ levelGranted: 2, feature: { ...song, damageResistances: [] } }] },
    });

  it("2014 — КБ +4 від Інтелекту і швидкість 40", () => {
    const wizard = bladesinger("WIZARD_2014", BLADESONG_2014);
    const calm = applyActiveStates(withFeatureRow(wizard, BLADESONG_2014, false));
    const singing = applyActiveStates(withFeatureRow(wizard, BLADESONG_2014, true));

    expect([calculateFinalAC(calm), calculateFinalSpeed(calm)]).toEqual([13, 30]);
    expect([calculateFinalAC(singing), calculateFinalSpeed(singing)]).toEqual([17, 40]);
  });

  it("2014 — зброя лишається на Силі чи Спритності", () => {
    const singing = applyActiveStates(withFeatureRow(bladesinger("WIZARD_2014", BLADESONG_2014), BLADESONG_2014, true));
    expect(getWeaponAbility(singing, rapier)).toBe("DEX");
  });

  it("2024 — Робота клинком бере Інтелект для зброї, якою володієш", () => {
    const wizard = bladesinger("WIZARD_2024", BLADESONG_2024);
    const calm = applyActiveStates(withFeatureRow(wizard, BLADESONG_2024, false));
    const singing = applyActiveStates(withFeatureRow(wizard, BLADESONG_2024, true));
    const unfamiliar = { ...rapier, isProficient: false } as PersWeaponWithWeapon;

    expect(getWeaponAbility(calm, rapier)).toBe("DEX");
    expect(getWeaponAbility(singing, rapier)).toBe("INT");
    expect(calculateWeaponAttackBonus(singing, rapier)).toBe(4 + 3);
    expect(getWeaponAbility(singing, unfamiliar)).toBe("DEX");
  });

  it("стан, вимкнений після правки листа, не лишає ефектів у копії", () => {
    const wizard = bladesinger("WIZARD_2014", BLADESONG_2014);
    const singing = applyActiveStates(withFeatureRow(wizard, BLADESONG_2014, true));
    const editedThenStopped = applyActiveStates(markFeatureActive({ ...singing }, BLADESONG_2014.featureId, false));

    expect(calculateFinalAC(editedThenStopped)).toBe(13);
  });
});


function withEffects(pers: PersWithRelations, effects: Array<{ effectKey: string; name?: string; endsWithConcentration?: boolean }>, exhaustionLevel = 0) {
  return applyActiveStates({
    ...pers,
    exhaustionLevel,
    effects: effects.map((effect, index) => ({
      persEffectId: index + 1,
      effectKey: effect.effectKey,
      spellId: null,
      endsWithConcentration: effect.endsWithConcentration ?? false,
      spell: effect.name ? { spellId: 900 + index, name: effect.name, engName: "", hasConcentration: "так" } : null,
    })),
  } as unknown as PersWithRelations);
}

describe("O39 — бафи на КБ і швидкість", () => {
  const wizard = buildPers({ str: 8, dex: 16, int: 18, class: { name: "WIZARD_2024", features: [] } });

  it("Обладунок мага: без обладунку 13 + Спр замість 10 + Спр, і база так і підписана", () => {
    expect(calculateFinalAC(withEffects(wizard, []))).toBe(13);
    const armored = withEffects(wizard, [{ effectKey: "MAGE_ARMOR" }]);
    expect(calculateFinalAC(armored)).toBe(16);
    expect(explainFinalAC(armored)[0]).toEqual({ label: "Обладунок мага (13 + Спритність)", value: 16 });
  });

  it("Обладунок мага не діє поверх справжнього обладунку", () => {
    const leather = { equipped: true, overrideBaseAC: null, miscACBonus: 0, abilityBonuses: ["DEX"], abilityBonusType: "FULL", armor: { name: "LEATHER", baseAC: 11, abilityBonuses: ["DEX"], abilityBonusType: "FULL" } };
    const inLeather = buildPers({ dex: 16, armors: [leather] });
    expect(calculateFinalAC(withEffects(inLeather, [{ effectKey: "MAGE_ARMOR" }]))).toBe(14);
  });

  it("Обладунок мага проти Захисту без обладунків — гравець бере кращу формулу", () => {
    const unarmored = { equipped: true, overrideBaseAC: null, miscACBonus: 0, abilityBonuses: ["DEX", "CON"], abilityBonusType: "FULL", armor: { name: "UNARMORED_DEFENSE_BARBARIAN", baseAC: 10, abilityBonuses: ["DEX", "CON"], abilityBonusType: "FULL" } };
    const barbarianUnarmored = buildPers({ dex: 14, con: 18, armors: [unarmored] });
    expect(calculateFinalAC(withEffects(barbarianUnarmored, []))).toBe(16);
    expect(calculateFinalAC(withEffects(barbarianUnarmored, [{ effectKey: "MAGE_ARMOR" }]))).toBe(16);
  });

  it("Дубова шкіра тримає нижню межу окремим рядком розбивки: 2014 — 16, 2024 — 17", () => {
    const bark2014 = withEffects(buildPers({ dex: 16, ruleset: "RULES_2014" }), [{ effectKey: "BARKSKIN" }]);
    expect(calculateFinalAC(bark2014)).toBe(16);
    expect(explainFinalAC(bark2014)).toContainEqual({ label: "Дубова шкіра (щонайменше 16)", value: 3 });
    expect(calculateFinalAC(withEffects(buildPers({ dex: 16 }), [{ effectKey: "BARKSKIN" }]))).toBe(17);
  });

  it("Прискорення і Щит віри: КБ +4, швидкість 30 → 60", () => {
    const hasted = withEffects(wizard, [{ effectKey: "HASTE" }, { effectKey: "SHIELD_OF_FAITH" }]);
    expect(calculateFinalAC(hasted)).toBe(17);
    expect(calculateFinalSpeed(hasted)).toBe(60);
  });

  it("Скорохід і Прискорення: спершу +10, тоді ×2", () => {
    expect(calculateFinalSpeed(withEffects(wizard, [{ effectKey: "LONGSTRIDER" }, { effectKey: "HASTE" }]))).toBe(80);
  });
});

describe("O39 — виснаження на листі", () => {
  it("2024, рівень 2: навички й ініціатива −4, пасивна уважність — ні, швидкість 30 → 20", () => {
    const calm = withEffects(barbarian, []);
    const tired = withEffects(barbarian, [], 2);

    expect(calculateFinalSkill(tired, Skills.PERCEPTION).total).toBe(calculateFinalSkill(calm, Skills.PERCEPTION).total - 4);
    expect(calculateFinalInitiative(tired)).toBe(calculateFinalInitiative(calm) - 4);
    expect(calculatePassiveSkill(tired, Skills.PERCEPTION)).toBe(calculatePassiveSkill(calm, Skills.PERCEPTION));
    expect(calculateFinalSpeed(tired)).toBe(20);
  });

  it("2014: рівень 2 — швидкість ÷2, рівень 4 — максимум хітів ÷2, рівень 5 — швидкість 0", () => {
    const pers2014 = buildPers({ ruleset: "RULES_2014" });
    expect(calculateFinalSpeed(withEffects(pers2014, [], 2))).toBe(15);
    expect(calculateFinalMaxHP(withEffects(pers2014, [], 3))).toBe(60);
    expect(calculateFinalMaxHP(withEffects(pers2014, [], 4))).toBe(30);
    expect(calculateFinalSpeed(withEffects(pers2014, [], 5))).toBe(0);
  });
});

describe("O39 — стан кидка з назвами джерел", () => {
  it("Лють: Атлетика з перевагою, джерело підписане назвою риси", () => {
    const named = buildPers({ class: { name: "BARBARIAN_2024", features: [{ levelGranted: 1, feature: { ...RAGE_2024, name: "Лють", damageResistances: [] } }] } });
    const raging = applyActiveStates(withFeatureRow(named, { ...RAGE_2024, name: "Лють" } as never, true));
    expect(describeRollState(raging, { kind: "check", ability: "STR", skill: "ATHLETICS" })).toEqual({ mode: "ADVANTAGE", sources: ["Лють"], extraDice: [] });
  });

  it("Благословення: ряткидок отримує к4 з назвою заклинання без англійської частини", () => {
    const blessed = withEffects(barbarian, [{ effectKey: "BLESS", name: "Благословення [Bless]" }]);
    expect(describeRollState(blessed, { kind: "save", ability: "WIS" }, "SAVE").extraDice).toEqual([{ sides: 4, sign: 1, label: "Благословення" }]);
    expect(describeRollState(blessed, { kind: "check", ability: "WIS" }, "SAVE").mode).toBe("NORMAL");
  });

  it("Лють 2014 і виснаження 1-го рівня гасять одне одного на перевірці Сили", () => {
    const barbarian2014 = buildPers({ ruleset: "RULES_2014", class: { name: "BARBARIAN_2014", features: [{ levelGranted: 1, feature: { ...RAGE_2014, name: "Лють", damageResistances: [] } }] } });
    const state = describeRollState(withEffects(withFeatureRow(barbarian2014, RAGE_2014, true), [], 1), { kind: "check", ability: "STR" });
    expect(state).toMatchObject({ mode: "NORMAL", sources: ["Лють", "Виснаження"] });
  });
});

describe("O39 — підсвітка чисел, змінених станом", () => {
  it("вище — зелене, нижче — червоне, без змін і без станів — нічого", () => {
    const wizard = buildPers({ dex: 16, class: { name: "WIZARD_2024", features: [] } });
    expect(findStateValueTone(withEffects(wizard, [{ effectKey: "HASTE" }]), calculateFinalAC)).toBe("!text-emerald-300");
    expect(findStateValueTone(withEffects(wizard, [], 2), calculateFinalSpeed)).toBe("!text-rose-300");
    expect(findStateValueTone(withEffects(wizard, [{ effectKey: "BLESS" }]), calculateFinalAC)).toBe("");
    expect(findStateValueTone(wizard, calculateFinalAC)).toBe("");
  });
});
