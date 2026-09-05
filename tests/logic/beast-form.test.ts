import { describe, expect, it } from "vitest";
import { Ability, AbilityBonusType, Skills } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import { getAllCreatures } from "@/lib/bestiaryData";
import type { CreatureData } from "@/lib/bestiaryData";
import { buildBeastFormPers, listBeastAbilities } from "@/lib/logic/beast-form";
import type { WildshapeContext } from "@/rules/wildshape";
import {
  calculateFinalAC,
  calculateFinalInitiative,
  calculateFinalMaxHP,
  calculateFinalModifier,
  calculateFinalSave,
  calculateFinalSkill,
  calculateFinalSpeed,
  calculateFinalStat,
} from "@/lib/logic/bonus-calculator";

/// KR24.4. Підміна перевіряється тим самим калькулятором, яким малюється лист: на синтетичному
/// `pers` він мусить дати числа звіра, на звичайному — ті самі, що й до роботи. Істоти беруться
/// з каталогу репозиторію, а не пишуться літералом: числа ведмедя мають бути ті, які побачить
/// гравець.

function findCreature(nameEng: string): CreatureData {
  const creature = getAllCreatures("RULES_2014").find((candidate) => candidate.nameEng === nameEng);
  if (!creature) throw new Error(`У каталозі 2014 немає істоти ${nameEng}`);
  return creature;
}

const brownBear = findCreature("Brown Bear");
const giantEagle = findCreature("Giant Eagle");

/// KR24.6. Форми 2024 беруться з каталогу 2024: та сама істота там має інші володіння, і саме
/// вони вирішують, чиє число покаже лист.
function find2024Creature(nameEng: string): CreatureData {
  const creature = getAllCreatures("RULES_2024").find((candidate) => candidate.nameEng === nameEng);
  if (!creature) throw new Error(`У каталозі 2024 немає істоти ${nameEng}`);
  return creature;
}

const wolf2024 = find2024Creature("Wolf");
const giantLizard2024 = find2024Creature("Giant Lizard");

/// Друїд у шкіряному обладунку зі щитом і расовим бонусом до КБ — усе те, що у формі не
/// застосовується. Володіння Атлетикою й рятівними кидками — його власні.
function buildDruid(): PersWithRelations {
  return {
    persId: 1,
    level: 6,
    str: 8,
    dex: 14,
    con: 12,
    int: 10,
    wis: 18,
    cha: 11,
    maxHp: 44,
    currentHp: 30,
    tempHp: 4,
    statBonuses: { STR: 2, WIS: 1 },
    statModifierBonuses: {},
    saveBonuses: {},
    skillBonuses: {},
    hpBonuses: { value: 6 },
    speedBonuses: { value: 5 },
    acBonuses: { value: 1 },
    initiativeBonuses: {},
    proficiencyBonuses: {},
    additionalSaveProficiencies: [Ability.CON, Ability.WIS],
    raceStaticAcBonus: 1,
    overrideBaseAC: null,
    wearsShield: true,
    additionalShieldBonus: 0,
    armors: [
      {
        equipped: true,
        overrideBaseAC: null,
        miscACBonus: 0,
        abilityBonuses: [Ability.DEX],
        abilityBonusType: AbilityBonusType.FULL,
        armor: { baseAC: 11, abilityBonuses: [Ability.DEX], abilityBonusType: AbilityBonusType.FULL },
      },
    ],
    skills: [{ name: Skills.ATHLETICS, proficiencyType: "PROFICIENT" }],
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

/// Редакція, рівень друїда й коло їдуть у шар: саме вони, а не каталог істоти, вирішують хіти,
/// КБ і володіння. Тут 2014 — те, що жило в проді до KR24.6.
const druid2014: WildshapeContext = { druidLevel: 6, isMoonCircle: true, ruleset: "RULES_2014" };

const bearLayer = { creature: brownBear, context: druid2014, beastCurrentHp: 34, beastMaxHp: 34 };

describe("KR24.4 — синтетичний pers у звіриній формі", () => {
  it("Сила, Спритність і Тілобудова стають звіриними", () => {
    const beast = buildBeastFormPers(buildDruid(), bearLayer);

    expect(calculateFinalStat(beast, Ability.STR)).toBe(19);
    expect(calculateFinalStat(beast, Ability.DEX)).toBe(10);
    expect(calculateFinalStat(beast, Ability.CON)).toBe(16);
  });

  it("расовий бонус до Сили не додається до Сили ведмедя", () => {
    const own = buildDruid();
    expect(calculateFinalStat(own, Ability.STR)).toBe(10);

    expect(calculateFinalStat(buildBeastFormPers(own, bearLayer), Ability.STR)).toBe(19);
  });

  it("Інтелект, Мудрість і Харизма лишаються персонажеві разом зі своїми бонусами", () => {
    const own = buildDruid();
    const beast = buildBeastFormPers(own, bearLayer);

    for (const ability of [Ability.INT, Ability.WIS, Ability.CHA]) {
      expect(calculateFinalStat(beast, ability)).toBe(calculateFinalStat(own, ability));
    }
    expect(calculateFinalStat(beast, Ability.WIS)).toBe(19);
  });

  it("володіння лишаються персонажеві, а модифікатор рахується від характеристики звіра", () => {
    const beast = buildBeastFormPers(buildDruid(), bearLayer);

    // Атлетика: Сила ведмедя +4 плюс власний бонус майстерності +3.
    expect(calculateFinalSkill(beast, Skills.ATHLETICS)).toEqual({ total: 7, proficiency: "PROFICIENT" });
    // Природознавство рахується від Інтелекту — його форма не чіпає.
    expect(calculateFinalSkill(beast, Skills.NATURE)).toEqual({ total: 0, proficiency: "NONE" });
  });

  it("рятівні кидки перераховані від звіра, але з власними володіннями", () => {
    const beast = buildBeastFormPers(buildDruid(), bearLayer);

    // Тілобудова 16 (+3) плюс володіння персонажа +3.
    expect(calculateFinalSave(beast, Ability.CON)).toBe(6);
    // Сила без володіння — самий модифікатор ведмедя.
    expect(calculateFinalSave(beast, Ability.STR)).toBe(4);
    // Мудрість не змінилася зовсім.
    expect(calculateFinalSave(beast, Ability.WIS)).toBe(calculateFinalSave(buildDruid(), Ability.WIS));
  });

  it("ініціатива йде за Спритністю звіра", () => {
    expect(calculateFinalInitiative(buildDruid())).toBe(2);
    expect(calculateFinalInitiative(buildBeastFormPers(buildDruid(), bearLayer))).toBe(0);
  });

  it("КБ — рівно той, що в статблоці: щит, обладунок і расовий бонус до нього не додаються", () => {
    const own = buildDruid();
    expect(calculateFinalAC(own)).toBe(17);

    expect(calculateFinalAC(buildBeastFormPers(own, bearLayer))).toBe(11);
  });

  it("швидкість — звірина, а не власна з бонусами", () => {
    expect(calculateFinalSpeed(buildDruid())).toBe(35);
    expect(calculateFinalSpeed(buildBeastFormPers(buildDruid(), bearLayer))).toBe(40);
  });

  it("швидкість орла на землі — 10 футів, а не власні 30", () => {
    const eagle = buildBeastFormPers(buildDruid(), {
      creature: giantEagle,
      context: druid2014,
      beastCurrentHp: 26,
      beastMaxHp: 26,
    });

    expect(calculateFinalSpeed(eagle)).toBe(10);
  });

  it("хіти — стос звіра, без власних бонусів і без тимчасових", () => {
    const own = buildDruid();
    expect(calculateFinalMaxHP(own)).toBe(50);

    const beast = buildBeastFormPers(own, { creature: brownBear, context: druid2014, beastCurrentHp: 12, beastMaxHp: 34 });
    expect(calculateFinalMaxHP(beast)).toBe(34);
    expect(beast.currentHp).toBe(12);
    expect(beast.tempHp).toBe(0);
  });

  it("хіти звіра не вилазять за межі стосу", () => {
    const beast = buildBeastFormPers(buildDruid(), { creature: brownBear, context: druid2014, beastCurrentHp: 99, beastMaxHp: 34 });
    expect(beast.currentHp).toBe(34);
  });

  it("риси, фічі й сам персонаж лишаються тими самими", () => {
    const own = buildDruid();
    const beast = buildBeastFormPers(own, bearLayer);

    expect(beast.persId).toBe(own.persId);
    expect(beast.level).toBe(own.level);
    expect(beast.features).toBe(own.features);
    expect(beast.skills).toBe(own.skills);
    expect(beast.armors).toBe(own.armors);
    expect(beast.additionalSaveProficiencies).toEqual(own.additionalSaveProficiencies);
  });

  it("підміна нічого не змінює у власному листі — вихід із форми повертає ті самі числа", () => {
    const own = buildDruid();
    const before = readSheetNumbers(own);

    buildBeastFormPers(own, bearLayer);

    expect(readSheetNumbers(own)).toEqual(before);
  });

  it("підмінені характеристики названі поіменно — саме їх лист позначає зміненими", () => {
    expect(listBeastAbilities(brownBear)).toEqual([Ability.STR, Ability.DEX, Ability.CON]);
  });

  it("нерозібраний статблок не вдає, що підмінив характеристики", () => {
    const wordless = { ...brownBear, strength: "", dexterity: "", constitution: "" };
    expect(listBeastAbilities(wordless)).toEqual([]);

    const beast = buildBeastFormPers(buildDruid(), { ...bearLayer, creature: wordless });
    expect(calculateFinalStat(beast, Ability.STR)).toBe(10);
  });
});

function readSheetNumbers(pers: PersWithRelations) {
  return {
    str: calculateFinalStat(pers, Ability.STR),
    dex: calculateFinalStat(pers, Ability.DEX),
    con: calculateFinalStat(pers, Ability.CON),
    strModifier: calculateFinalModifier(pers, Ability.STR),
    armorClass: calculateFinalAC(pers),
    speed: calculateFinalSpeed(pers),
    maxHp: calculateFinalMaxHP(pers),
    currentHp: pers.currentHp,
    initiative: calculateFinalInitiative(pers),
    athletics: calculateFinalSkill(pers, Skills.ATHLETICS).total,
  };
}

/// KR24.6. Друїд 2024 — той самий шар з іншою редакцією: хіти не підміняються взагалі, КБ Кола
/// місяця може перебити КБ звіра, а володіння беруться більші з двох.
const context2024 = (isMoonCircle = false): WildshapeContext => ({
  druidLevel: 6,
  isMoonCircle,
  ruleset: "RULES_2024",
});

function buildLayer2024(creature: CreatureData, isMoonCircle = false) {
  return { creature, context: context2024(isMoonCircle), beastCurrentHp: 11, beastMaxHp: 11 };
}

describe("KR24.6 — шар 2024 поруч із шаром 2014", () => {
  it("характеристики звіра підміняються так само, як у 2014", () => {
    const beast = buildBeastFormPers(buildDruid(), buildLayer2024(wolf2024));

    expect(calculateFinalStat(beast, Ability.STR)).toBe(14);
    expect(calculateFinalStat(beast, Ability.DEX)).toBe(15);
    expect(calculateFinalStat(beast, Ability.CON)).toBe(12);
  });

  /// Ключова відмінність редакцій: 2024 лишає персонажа у **своїх** хітах, тож блок хітів не
  /// підміняється взагалі — ані максимум, ані поточні, ані тимчасові.
  it("хіти лишаються власними, включно з тимчасовими", () => {
    const own = buildDruid();
    const beast = buildBeastFormPers(own, buildLayer2024(wolf2024));

    expect(calculateFinalMaxHP(beast)).toBe(calculateFinalMaxHP(own));
    expect(beast.currentHp).toBe(own.currentHp);
    expect(beast.tempHp).toBe(own.tempHp);
  });

  it("той самий вовк у 2014 забрав би блок хітів собі — редакції не змішалися", () => {
    const beast2014 = buildBeastFormPers(buildDruid(), {
      creature: wolf2024,
      context: druid2014,
      beastCurrentHp: 11,
      beastMaxHp: 11,
    });

    expect(calculateFinalMaxHP(beast2014)).toBe(11);
    expect(beast2014.tempHp).toBe(0);
  });

  it("звичайний друїд 2024 бере КБ звіра, друїд Кола місяця — 13 + МУД, коли це більше", () => {
    expect(calculateFinalAC(buildBeastFormPers(buildDruid(), buildLayer2024(wolf2024)))).toBe(12);
    expect(calculateFinalAC(buildBeastFormPers(buildDruid(), buildLayer2024(wolf2024, true)))).toBe(17);
  });

  /// «Якщо модифікатор навички у статблоці вищий за ваш, беріть той, що у статблоці» — і навпаки:
  /// власне володіння, яке вище, лишається на місці.
  it("навичка звіра перебиває власну, коли вона вища", () => {
    const beast = buildBeastFormPers(buildDruid(), buildLayer2024(wolf2024));

    // Уважність вовка +5 проти власних +4 (Мудрість 19 без володіння).
    expect(calculateFinalSkill(beast, Skills.PERCEPTION).total).toBe(5);
    // Непомітність вовка +4 проти +2 від його ж Спритності.
    expect(calculateFinalSkill(beast, Skills.STEALTH).total).toBe(4);
  });

  it("власне володіння, вище за звірине, лишається власним", () => {
    const own = buildDruid();
    own.skills = [
      { name: Skills.ATHLETICS, proficiencyType: "PROFICIENT" },
      { name: Skills.PERCEPTION, proficiencyType: "PROFICIENT" },
    ] as PersWithRelations["skills"];

    // Мудрість 19 (+4) плюс володіння +3 — це більше за вовчі +5.
    expect(calculateFinalSkill(buildBeastFormPers(own, buildLayer2024(wolf2024)), Skills.PERCEPTION).total).toBe(7);
  });

  it("рятівний кидок звіра перебиває власний, коли він вищий", () => {
    const beast = buildBeastFormPers(buildDruid(), buildLayer2024(giantLizard2024));

    // Спритність ящірки дала б +1, статблок каже +3.
    expect(calculateFinalSave(beast, Ability.DEX)).toBe(3);
    // Тілобудова: володіння персонажа +3 поверх +1 ящірки, у статблоці кидка немає.
    expect(calculateFinalSave(beast, Ability.CON)).toBe(4);
  });

  /// 2014 читає статблок лише заради характеристик: володіння там лишаються персонажеві «де
  /// застосовно», і жодне число зі статблока в них не потрапляє.
  it("2014 володіння зі статблока не бере — той самий вовк, інша редакція", () => {
    const beast2014 = buildBeastFormPers(buildDruid(), {
      creature: wolf2024,
      context: druid2014,
      beastCurrentHp: 11,
      beastMaxHp: 11,
    });

    expect(calculateFinalSkill(beast2014, Skills.PERCEPTION).total).toBe(4);
    expect(calculateFinalSkill(beast2014, Skills.STEALTH).total).toBe(2);
  });

  it("шар 2024 не змінює власного листа", () => {
    const own = buildDruid();
    const before = readSheetNumbers(own);

    buildBeastFormPers(own, buildLayer2024(wolf2024, true));

    expect(readSheetNumbers(own)).toEqual(before);
  });
});
