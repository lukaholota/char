import { describe, expect, it } from "vitest";
import { Ability, DamageType, SkillProficiencyType, Skills } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import { DAMAGE_TYPE_KEYS } from "@/rules/types";
import {
  calculateDamageResistances,
  calculateDarkvisionRange,
  calculateFinalModifier,
  calculateFinalProficiency,
  calculateFinalSave,
  calculateFinalSkill,
  calculateFinalStat,
  calculateFinalInitiative,
  calculateFinalMaxHP,
  calculateFinalSpeed,
  calculatePassiveSkill,
  calculateWeaponAttackBonus,
  calculateWeaponDamageBonus,
  calculateWeaponDamageDice,
  collectActiveFeatures,
  findWeaponDamageType,
  findWeaponRange,
} from "./bonus-calculator";

type PersDraft = {
  level: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  skills: { name: Skills; proficiencyType: SkillProficiencyType }[];
  statBonuses?: Partial<Record<Ability, number>>;
  statModifierBonuses?: Partial<Record<Ability, number>>;
  saveBonuses?: Partial<Record<Ability, number>>;
  skillBonuses?: Partial<Record<Skills, number>>;
  additionalSaveProficiencies?: Ability[];
};

// PersWithRelations is inferred from a Prisma query with ~20 relations, so a
// literal fixture cannot satisfy it. The single cast is confined to here.
function buildPers(draft: Partial<PersDraft> = {}): PersWithRelations {
  return {
    level: 1,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    skills: [],
    ...draft,
  } as unknown as PersWithRelations;
}

describe("calculateFinalProficiency", () => {
  // PHB 2014, Character Advancement table.
  const byLevel: [number, number][] = [
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6],
  ];

  it.each(byLevel)("рівень %i дає бонус майстерності +%i", (level, expected) => {
    expect(calculateFinalProficiency(buildPers({ level }))).toBe(expected);
  });
});

describe("calculateFinalModifier", () => {
  const byScore: [number, number][] = [
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [15, 2],
    [16, 3],
    [20, 5],
  ];

  it.each(byScore)("характеристика %i дає модифікатор %i", (score, expected) => {
    expect(calculateFinalModifier(buildPers({ str: score }), Ability.STR)).toBe(expected);
  });

  it("statBonuses додаються до характеристики, а не до модифікатора", () => {
    const pers = buildPers({ str: 15, statBonuses: { STR: 2 } });

    expect(calculateFinalStat(pers, Ability.STR)).toBe(17);
    expect(calculateFinalModifier(pers, Ability.STR)).toBe(3);
  });

  it("непарна сума округлюється вниз", () => {
    const pers = buildPers({ str: 14, statBonuses: { STR: 1 } });

    expect(calculateFinalStat(pers, Ability.STR)).toBe(15);
    expect(calculateFinalModifier(pers, Ability.STR)).toBe(2);
  });

  it("statModifierBonuses додаються після округлення", () => {
    const pers = buildPers({ str: 15, statModifierBonuses: { STR: 1 } });

    expect(calculateFinalStat(pers, Ability.STR)).toBe(15);
    expect(calculateFinalModifier(pers, Ability.STR)).toBe(3);
  });
});

describe("calculateFinalSkill", () => {
  const athletics = (proficiencyType: SkillProficiencyType) =>
    buildPers({
      level: 5,
      str: 16,
      skills: [{ name: Skills.ATHLETICS, proficiencyType }],
    });

  it("без майстерності — тільки модифікатор характеристики", () => {
    expect(calculateFinalSkill(athletics(SkillProficiencyType.NONE), Skills.ATHLETICS).total).toBe(3);
  });

  it("майстерність додає повний бонус", () => {
    expect(calculateFinalSkill(athletics(SkillProficiencyType.PROFICIENT), Skills.ATHLETICS).total).toBe(6);
  });

  it("експертиза подвоює бонус майстерності", () => {
    expect(calculateFinalSkill(athletics(SkillProficiencyType.EXPERTISE), Skills.ATHLETICS).total).toBe(9);
  });

  it("половина бонусу округлюється вниз", () => {
    expect(calculateFinalSkill(athletics(SkillProficiencyType.HALF), Skills.ATHLETICS).total).toBe(4);
  });

  it("навичка без запису в skills вважається без майстерності", () => {
    const pers = buildPers({ level: 5, dex: 14, skills: [] });
    const result = calculateFinalSkill(pers, Skills.STEALTH);

    expect(result.proficiency).toBe("NONE");
    expect(result.total).toBe(2);
  });

  it("skillBonuses додаються поверх усього", () => {
    const pers = buildPers({
      level: 5,
      str: 16,
      skills: [{ name: Skills.ATHLETICS, proficiencyType: SkillProficiencyType.PROFICIENT }],
      skillBonuses: { ATHLETICS: 2 },
    });

    expect(calculateFinalSkill(pers, Skills.ATHLETICS).total).toBe(8);
  });
});

describe("calculateFinalSave", () => {
  it("бонус майстерності додається лише для рятівних кидків із майстерністю", () => {
    const pers = buildPers({
      level: 5,
      str: 16,
      dex: 16,
      additionalSaveProficiencies: [Ability.STR],
    });

    expect(calculateFinalSave(pers, Ability.STR)).toBe(6);
    expect(calculateFinalSave(pers, Ability.DEX)).toBe(3);
  });

  it("saveBonuses додаються незалежно від майстерності", () => {
    const pers = buildPers({ level: 1, con: 14, saveBonuses: { CON: 1 } });

    expect(calculateFinalSave(pers, Ability.CON)).toBe(3);
  });
});

// KR31.4 — числа, які до цієї цілі могли прийти лише ручним бонусом персонажа.
describe("числові надання від рис 2024", () => {
  const withFeatFeature = (feature: Record<string, unknown>) =>
    buildPers({ feats: [{ feat: { grantsFeature: [feature] } }] } as never);

  it("Швидкий додає 10 футів до швидкості", () => {
    expect(calculateFinalSpeed(buildPers())).toBe(30);
    expect(calculateFinalSpeed(withFeatFeature({ featureId: 1, speedBonus: 10 }))).toBe(40);
  });

  it("Дар швидкості додає 30 футів поверх ручного бонусу", () => {
    const pers = buildPers({ speedBonuses: { value: 5 }, feats: [{ feat: { grantsFeature: [{ featureId: 2, speedBonus: 30 }] } }] } as never);
    expect(calculateFinalSpeed(pers)).toBe(65);
  });

  it("Пильність додає бонус майстерності до ініціативи, і лише один раз", () => {
    const alert = { featureId: 3, initiativeProficiency: true };
    expect(calculateFinalInitiative(buildPers({ level: 5, dex: 14 }))).toBe(2);
    expect(calculateFinalInitiative(withFeatFeature(alert))).toBe(2);

    const level5 = buildPers({ level: 5, dex: 14, feats: [{ feat: { grantsFeature: [alert] } }] } as never);
    expect(calculateFinalInitiative(level5)).toBe(5);

    const twice = buildPers({
      level: 5,
      dex: 14,
      feats: [{ feat: { grantsFeature: [alert] } }, { feat: { grantsFeature: [{ ...alert, featureId: 4 }] } }],
    } as never);
    expect(calculateFinalInitiative(twice)).toBe(5);
  });

  it("Дар витривалості додає 40 до максимуму хітів", () => {
    expect(calculateFinalMaxHP(buildPers({ maxHp: 100 } as never))).toBe(100);
    const boon = buildPers({ maxHp: 100, feats: [{ feat: { grantsFeature: [{ featureId: 5, bonusHitPoints: 40 }] } }] } as never);
    expect(calculateFinalMaxHP(boon)).toBe(140);
  });
});

describe("KR31.6 — базова швидкість виду", () => {
  it("бере 35 футів Голіафа з виду, а не захардкоджені 30", () => {
    const goliath = buildPers({ race: { speed: 35 } } as never);

    expect(calculateFinalSpeed(goliath)).toBe(35);
  });

  it("складає модифікатори підвиду, вибраних опцій, фічі й ручної поправки", () => {
    const pers = buildPers({
      race: { speed: 25 },
      subrace: { speedModifier: 5 },
      raceChoiceOptions: [{ modifiesSpeed: 5 }],
      speedBonuses: { value: 5 },
      feats: [{ feat: { grantsFeature: [{ featureId: 6, speedBonus: 10 }] } }],
    } as never);

    expect(calculateFinalSpeed(pers)).toBe(50);
  });

  it("варіант виду заміщує базову швидкість", () => {
    const pers = buildPers({ race: { speed: 30 }, raceVariants: [{ overridesRaceSpeed: 35 }] } as never);

    expect(calculateFinalSpeed(pers)).toBe(35);
  });
});

describe("KR31.6 — пасивні значення", () => {
  it("рахує пасивне значення тим самим модифікатором навички", () => {
    const pers = buildPers({
      level: 5,
      wis: 16,
      skills: [{ name: Skills.PERCEPTION, proficiencyType: SkillProficiencyType.PROFICIENT }],
    });

    expect(calculatePassiveSkill(pers, Skills.PERCEPTION)).toBe(16);
  });
});

describe("KR31.6 — опори й Темнозір з фіч виду", () => {
  it("дроу 2014 бачить на 120 футів, а не на 60 від раси", () => {
    const drow = buildPers({
      race: { traits: [{ feature: { featureId: 1534, darkvisionRange: 60, damageResistances: [] } }] },
      subrace: { traits: [{ feature: { featureId: 5801, darkvisionRange: 120, damageResistances: [] } }] },
    } as never);

    expect(calculateDarkvisionRange(drow)).toBe(120);
  });

  it("тифлінг 2024 бере опір з обраної спадщини", () => {
    const tiefling = buildPers({
      raceChoiceOptions: [{ traits: [{ feature: { featureId: 9, damageResistances: [DamageType.POISON], darkvisionRange: null } }] }],
    } as never);

    expect(calculateDamageResistances(tiefling)).toEqual([DamageType.POISON]);
    expect(calculateDarkvisionRange(buildPers())).toBeNull();
  });
});

describe("типи шкоди правил повторюють enum бази", () => {
  it("той самий набір і порядок, що й DamageType", () => {
    expect([...DAMAGE_TYPE_KEYS]).toEqual(Object.values(DamageType));
  });
});

describe("KR31.6 — Майстер на всі руки в обох редакціях", () => {
  const bardWith = (engName: string) =>
    buildPers({
      level: 2,
      cha: 10,
      skills: [],
      class: { features: [{ levelGranted: 2, feature: { featureId: 1, engName } }] },
    } as never);

  it("бард 2014 додає половину майстерності до навички без володіння", () => {
    expect(calculateFinalSkill(bardWith("Jack of All Trades"), Skills.PERFORMANCE).total).toBe(1);
  });

  it("бард 2024 додає те саме, хоча фіча зветься інакше", () => {
    expect(calculateFinalSkill(bardWith("Bard: Jack of all Trades (2024)"), Skills.PERFORMANCE).total).toBe(1);
  });

  it("чужа фіча половини майстерності не дає", () => {
    expect(calculateFinalSkill(bardWith("Bard: Expertise (2024)"), Skills.PERFORMANCE).total).toBe(0);
  });
});

describe("риси класу в мультикласі", () => {
  it.each([
    ["RULES_2014", "Jack of All Trades"],
    ["RULES_2024", "Bard: Jack of all Trades (2024)"],
  ])("основний бард 1 / паладин 1 не отримує рису барда 2 (%s)", (ruleset, engName) => {
    const pers = buildPers({
      level: 2,
      ruleset,
      class: { features: [{ levelGranted: 2, feature: { featureId: 1, engName } }] },
      subclass: { features: [{ levelGranted: 2, feature: { featureId: 2, engName: "Second-level subclass feature" } }] },
      multiclasses: [{ classLevel: 1, class: { features: [] } }],
    } as never);

    expect(collectActiveFeatures(pers)).toEqual([]);
    expect(calculateFinalSkill(pers, Skills.PERFORMANCE).total).toBe(0);
    expect(calculateFinalInitiative(pers)).toBe(0);
  });

  it("риса основного класу й підкласу зʼявляється на рівні саме цього класу", () => {
    const classFeature = { featureId: 1, engName: "Jack of All Trades" };
    const subclassFeature = { featureId: 2, engName: "Second-level subclass feature" };
    const pers = buildPers({
      level: 3,
      ruleset: "RULES_2014",
      class: { features: [{ levelGranted: 2, feature: classFeature }] },
      subclass: { features: [{ levelGranted: 2, feature: subclassFeature }] },
      multiclasses: [{ classLevel: 1, class: { features: [] } }],
    } as never);

    expect(collectActiveFeatures(pers)).toEqual([classFeature, subclassFeature]);
    expect(calculateFinalSkill(pers, Skills.PERFORMANCE).total).toBe(1);
    expect(calculateFinalInitiative(pers)).toBe(1);
  });

  it("риса другого класу чекає на рівень саме другого класу", () => {
    const feature = { featureId: 1, engName: "Jack of All Trades" };
    const pers = buildPers({
      level: 2,
      ruleset: "RULES_2014",
      class: { features: [] },
      multiclasses: [{ classLevel: 1, class: { features: [{ levelGranted: 2, feature }] } }],
    } as never);

    expect(collectActiveFeatures(pers)).toEqual([]);
    expect(calculateFinalInitiative(pers)).toBe(0);

    const bardTwo = { ...pers, level: 3, multiclasses: [{ ...pers.multiclasses[0], classLevel: 2 }] };
    expect(collectActiveFeatures(bardTwo)).toEqual([feature]);
    expect(calculateFinalInitiative(bardTwo)).toBe(1);
  });
});

describe("KR31.6 — Спритні атаки монаха", () => {
  const quarterstaff = {
    isProficient: true,
    weapon: { name: "QUARTERSTAFF", weaponType: "SIMPLE_WEAPON", properties: ["VERSATILE"], isRanged: false },
  };
  const monk = (armorName: string, ruleset = "RULES_2024") =>
    buildPers({
      level: 5,
      ruleset,
      str: 12,
      dex: 16,
      wearsShield: false,
      armors: [{ equipped: true, armor: { name: armorName } }],
      class: { features: [{ levelGranted: 1, feature: { featureId: 1, engName: "Monk: Martial Arts (2024)" } }] },
    } as never);

  it("монах 2024 без обладунку б'є посохом від Спритності: +6 / +3", () => {
    const pers = monk("UNARMORED_DEFENSE_MONK");
    expect(calculateWeaponAttackBonus(pers, quarterstaff as never)).toBe(6);
    expect(calculateWeaponDamageBonus(pers, quarterstaff as never)).toBe(3);
  });

  it("в обладунку посох знову від Сили: +4", () => {
    expect(calculateWeaponAttackBonus(monk("LEATHER"), quarterstaff as never)).toBe(4);
  });
});

describe("KR31.6 — Майстер на всі руки до ініціативи", () => {
  const bard = (ruleset: string, engName: string) =>
    buildPers({
      level: 5,
      ruleset,
      dex: 14,
      class: { features: [{ levelGranted: 2, feature: { featureId: 1, engName } }] },
    } as never);

  it("бард 2014 5-го рівня: СПР +2 і половина БМ 3 вниз — +3", () => {
    expect(calculateFinalInitiative(bard("RULES_2014", "Jack of All Trades"))).toBe(3);
  });

  it("бард 2024: ініціатива не використовує навичку — лише +2", () => {
    expect(calculateFinalInitiative(bard("RULES_2024", "Bard: Jack of all Trades (2024)"))).toBe(2);
  });
});

describe("KR31.6 — Рух без обладунків монаха", () => {
  const unarmoredDefense = [{ equipped: true, armor: { name: "UNARMORED_DEFENSE_MONK" } }];

  it("Монах 10 без обладунку ходить на 50 футів", () => {
    const pers = buildPers({ level: 10, race: { speed: 30 }, class: { name: "MONK_2024" }, armors: unarmoredDefense, wearsShield: false } as never);
    expect(calculateFinalSpeed(pers)).toBe(50);
  });

  it("у мультикласі рахується рівень Монаха, а не персонажа: Воїн 8 / Монах 6 — +15", () => {
    const pers = buildPers({
      level: 14,
      race: { speed: 30 },
      class: { name: "FIGHTER_2014" },
      multiclasses: [{ classLevel: 6, class: { name: "MONK_2014" } }],
      armors: [],
      wearsShield: false,
    } as never);
    expect(calculateFinalSpeed(pers)).toBe(45);
  });

  it("Монах у шкіряному обладунку бонусу не має", () => {
    const pers = buildPers({ level: 10, race: { speed: 30 }, class: { name: "MONK_2024" }, armors: [{ equipped: true, armor: { name: "LEATHER" } }], wearsShield: false } as never);
    expect(calculateFinalSpeed(pers)).toBe(30);
  });
});

describe("KR31.6 — кубик Бойових мистецтв на зброї", () => {
  const monk = (armorName: string) =>
    buildPers({
      level: 5,
      ruleset: "RULES_2024",
      str: 12,
      dex: 16,
      wearsShield: false,
      class: { name: "MONK_2024", features: [{ levelGranted: 1, feature: { featureId: 1, engName: "Monk: Martial Arts (2024)" } }] },
      armors: [{ equipped: true, armor: { name: armorName } }],
    } as never);
  const quarterstaff = { weapon: { name: "QUARTERSTAFF", weaponType: "SIMPLE_WEAPON", properties: ["VERSATILE"], isRanged: false, damage: "1d6" } };

  it("Монах 5 2024 б'є посохом кубиком 1d8", () => {
    expect(calculateWeaponDamageDice(monk("UNARMORED_DEFENSE_MONK"), quarterstaff as never)).toBe("1d8");
  });

  it("в обладунку — кубик самої зброї", () => {
    expect(calculateWeaponDamageDice(monk("LEATHER"), quarterstaff as never)).toBe("1d6");
  });

  it("ручний кубик гравця перемагає", () => {
    expect(calculateWeaponDamageDice(monk("UNARMORED_DEFENSE_MONK"), { ...quarterstaff, customDamageDice: "2d4" } as never)).toBe("2d4");
  });

  it("кубик, скопійований з каталогу діалогом «Додати зброю», ручним не вважається", () => {
    expect(calculateWeaponDamageDice(monk("UNARMORED_DEFENSE_MONK"), { ...quarterstaff, customDamageDice: "1d6" } as never)).toBe("1d8");
  });

  it("беззбройний удар Монаха 4 2014, доданий діалогом, б'є 1к4", () => {
    const monk2014 = buildPers({
      level: 4,
      ruleset: "RULES_2014",
      str: 8,
      dex: 18,
      wearsShield: false,
      class: { name: "MONK_2014", features: [{ levelGranted: 1, feature: { featureId: 1, engName: "Martial Arts" } }] },
      armors: [{ equipped: true, armor: { name: "UNARMORED_DEFENSE_MONK" } }],
    } as never);
    const unarmedStrike = { customDamageDice: "1", weapon: { name: "UNARMED_STRIKE", weaponType: "SIMPLE_WEAPON", properties: [], isRanged: false, damage: "1" } };
    expect(calculateWeaponDamageDice(monk2014, unarmedStrike as never)).toBe("1d4");
  });
});

describe("KR31.13 — тип шкоди й дальність зброї з налаштування", () => {
  const dagger = { weapon: { damageType: "PIERCING", normalRange: 20, longRange: 60 } };

  it("без налаштування беруться книжні тип шкоди й дальність", () => {
    expect(findWeaponDamageType(dagger as never)).toBe("PIERCING");
    expect(findWeaponRange(dagger as never)).toEqual({ normal: 20, long: 60 });
  });

  it("налаштування гравця перемагає книжні значення", () => {
    const frostDagger = { ...dagger, overrideDamageType: "COLD", overrideNormalRange: 30, overrideLongRange: 90 };

    expect(findWeaponDamageType(frostDagger as never)).toBe("COLD");
    expect(findWeaponRange(frostDagger as never)).toEqual({ normal: 30, long: 90 });
  });

  it("зброя ближнього бою без дальності не має дальності", () => {
    const longsword = { weapon: { damageType: "SLASHING", normalRange: null, longRange: null } };

    expect(findWeaponRange(longsword as never)).toBeNull();
  });
});

describe("плоскі +5 рис PHB 2014", () => {
  const withFeat = (name: string, ruleset: string, draft: Partial<PersDraft> = {}) =>
    buildPers({ ...draft, feats: [{ feat: { name, ruleset, grantsFeature: [] } }] } as never);

  it("«Пильний» 2014 додає +5 до ініціативи", () => {
    expect(calculateFinalInitiative(withFeat("ALERT", "RULES_2014", { dex: 14 }))).toBe(7);
  });

  it("«Пильний» 2024 плоских +5 не дає — його бонус іде через фічу", () => {
    expect(calculateFinalInitiative(withFeat("ALERT", "RULES_2024", { dex: 14 }))).toBe(2);
  });

  it("«Спостережливий» 2014 додає +5 до пасивних Уважності й Розслідування, але не до Аналізу поведінки", () => {
    const pers = withFeat("OBSERVANT", "RULES_2014");

    expect(calculatePassiveSkill(pers, Skills.PERCEPTION)).toBe(15);
    expect(calculatePassiveSkill(pers, Skills.INVESTIGATION)).toBe(15);
    expect(calculatePassiveSkill(pers, Skills.INSIGHT)).toBe(10);
  });

  it("«Спостережливий» не змінює саму перевірку навички", () => {
    expect(calculateFinalSkill(withFeat("OBSERVANT", "RULES_2014"), Skills.PERCEPTION).total).toBe(0);
  });
});

describe("ручний бонус до пасивних значень", () => {
  it("додається лише до свого пасивного значення й не змінює перевірку навички", () => {
    const pers = buildPers({ passiveBonuses: { PERCEPTION: 2 } } as never);

    expect(calculatePassiveSkill(pers, Skills.PERCEPTION)).toBe(12);
    expect(calculatePassiveSkill(pers, Skills.INVESTIGATION)).toBe(10);
    expect(calculateFinalSkill(pers, Skills.PERCEPTION).total).toBe(0);
  });

  it("складається з «Спостережливим» — бонус риси й ручний не підміняють одне одного", () => {
    const pers = buildPers({ passiveBonuses: { PERCEPTION: 1 }, feats: [{ feat: { name: "OBSERVANT", ruleset: "RULES_2014", grantsFeature: [] } }] } as never);

    expect(calculatePassiveSkill(pers, Skills.PERCEPTION)).toBe(16);
  });
});
