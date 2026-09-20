import { describe, expect, it } from "vitest";
import {
  findWeaponMasteryCapacity,
  findWeaponMasteryOptions,
  findWeaponMasteryOptionsForClasses,
  hasWeaponMastery,
  limitWeaponMasteryChoice,
  readWeaponProficiencyGrant,
  type MasteryWeapon,
} from "@/rules/weapon-mastery";

const FIGHTER_PROGRESSION = [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6];
const BARBARIAN_PROGRESSION = [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
const ROGUE_PROGRESSION = Array<number>(20).fill(2);
const MONK_PROGRESSION = Array<number>(20).fill(0);

const fighterAt = (classLevel: number) => [
  { className: "FIGHTER_2024", classLevel, masteryProgression: FIGHTER_PROGRESSION },
];

const WEAPONS: MasteryWeapon[] = [
  { weaponId: 1, name: "GREATSWORD", mastery: "GRAZE", weaponType: "MARTIAL_WEAPON", isRanged: false },
  { weaponId: 2, name: "HANDAXE", mastery: "VEX", weaponType: "SIMPLE_WEAPON", isRanged: false },
  { weaponId: 3, name: "LONGBOW", mastery: "SLOW", weaponType: "MARTIAL_WEAPON", isRanged: true },
  { weaponId: 4, name: "SHORTBOW", mastery: "VEX", weaponType: "SIMPLE_WEAPON", isRanged: true },
  { weaponId: 5, name: "NET", mastery: null, weaponType: "MARTIAL_WEAPON", isRanged: true },
  // Рядок 2014 у тій самій таблиці: властивості майстерності не має й у пул потрапити не може.
  { weaponId: 6, name: "CLUB", mastery: null, weaponType: "SIMPLE_WEAPON", isRanged: false },
];

const SIMPLE_AND_MARTIAL = { weaponTypes: ["SIMPLE_WEAPON", "MARTIAL_WEAPON"], specificWeaponNames: [] };
const SIMPLE_ONLY = { weaponTypes: ["SIMPLE_WEAPON"], specificWeaponNames: [] };

describe("KR18.6 — ємність майстерності виводиться з прогресії класу", () => {
  it("росте разом із рівнем воїна: 3 на 1-му, 4 на 5-му, 6 на 20-му", () => {
    expect(findWeaponMasteryCapacity(fighterAt(1))).toBe(3);
    expect(findWeaponMasteryCapacity(fighterAt(5))).toBe(4);
    expect(findWeaponMasteryCapacity(fighterAt(20))).toBe(6);
  });

  it("клас без майстерності не дає жодної, хоч на 20-му рівні", () => {
    const monk = [{ className: "MONK_2024", classLevel: 20, masteryProgression: MONK_PROGRESSION }];

    expect(findWeaponMasteryCapacity(monk)).toBe(0);
    expect(hasWeaponMastery(monk)).toBe(false);
  });

  it("клас 2014 не має прогресії взагалі — і майстерності не бачить", () => {
    const fighter2014 = [{ className: "FIGHTER_2014", classLevel: 20, masteryProgression: [] }];

    expect(findWeaponMasteryCapacity(fighter2014)).toBe(0);
    expect(hasWeaponMastery(fighter2014)).toBe(false);
  });

  it("мультиклас бере найбільшу ємність, а не суму", () => {
    const barbarianFourRogueOne = [
      { className: "BARBARIAN_2024", classLevel: 4, masteryProgression: BARBARIAN_PROGRESSION },
      { className: "ROGUE_2024", classLevel: 1, masteryProgression: ROGUE_PROGRESSION },
    ];

    expect(findWeaponMasteryCapacity(barbarianFourRogueOne)).toBe(3);
  });
});

describe("KR18.6 — пул зброї для вибору", () => {
  it("бере лише зброю з властивістю майстерності, якою клас володіє", () => {
    const options = findWeaponMasteryOptions(WEAPONS, SIMPLE_ONLY, "ROGUE_2024").map((w) => w.name);

    expect(options).toEqual(["HANDAXE", "SHORTBOW"]);
  });

  it("варвар не бачить дальньої зброї — його майстерність лише рукопашна", () => {
    const options = findWeaponMasteryOptions(WEAPONS, SIMPLE_AND_MARTIAL, "BARBARIAN_2024").map((w) => w.name);

    expect(options).toEqual(["GREATSWORD", "HANDAXE"]);
  });

  it("іменне володіння відкриває зброю поза типом класу", () => {
    const rogueWithMartialFinesse = { weaponTypes: ["SIMPLE_WEAPON"], specificWeaponNames: ["GREATSWORD"] };
    const options = findWeaponMasteryOptions(WEAPONS, rogueWithMartialFinesse, "ROGUE_2024").map((w) => w.name);

    expect(options).toEqual(["GREATSWORD", "HANDAXE", "SHORTBOW"]);
  });
});

describe("KR18.6 — сервер не довіряє надісланому вибору", () => {
  const options = findWeaponMasteryOptions(WEAPONS, SIMPLE_AND_MARTIAL, "FIGHTER_2024");

  it("обрізає до ємності класу", () => {
    expect(limitWeaponMasteryChoice([1, 2, 3, 4], options, 2)).toEqual([1, 2]);
  });

  it("викидає дублікати й зброю поза пулом", () => {
    expect(limitWeaponMasteryChoice([1, 1, 5, 999, 2], options, 4)).toEqual([1, 2]);
  });

  it("на нульовій ємності не лишає нічого", () => {
    expect(limitWeaponMasteryChoice([1, 2], options, 0)).toEqual([]);
  });
});

describe("KR18.6 — пул мультикласу", () => {
  const barbarian = {
    className: "BARBARIAN_2024",
    classLevel: 4,
    masteryProgression: BARBARIAN_PROGRESSION,
    weaponProficiencies: { type: ["SIMPLE_WEAPON", "MARTIAL_WEAPON"] },
    weaponProficienciesSpecial: null,
  };
  const rogue = {
    className: "ROGUE_2024",
    classLevel: 1,
    masteryProgression: ROGUE_PROGRESSION,
    weaponProficiencies: { type: ["SIMPLE_WEAPON"] },
    weaponProficienciesSpecial: null,
  };
  const wizard = {
    className: "WIZARD_2024",
    classLevel: 5,
    masteryProgression: [],
    weaponProficiencies: { type: ["SIMPLE_WEAPON"] },
    weaponProficienciesSpecial: null,
  };

  it("обʼєднує пули класів, а не перетинає їх", () => {
    const options = findWeaponMasteryOptionsForClasses([barbarian, rogue], WEAPONS).map((w) => w.name);

    // Варвар дає рукопашну марціальну, шахрай — просту дальню; разом видно обидві.
    expect(options).toEqual(["GREATSWORD", "HANDAXE", "SHORTBOW"]);
  });

  it("клас без майстерності не додає до пулу нічого", () => {
    const options = findWeaponMasteryOptionsForClasses([wizard], WEAPONS);

    expect(options).toEqual([]);
  });

  // У базі такі класи несуть двадцять нулів, а не порожній масив.
  it("прогресія з нулів — теж клас без майстерності", () => {
    const options = findWeaponMasteryOptionsForClasses([{ ...wizard, masteryProgression: MONK_PROGRESSION }], WEAPONS);

    expect(options).toEqual([]);
  });
});

describe("KR18.6 — три форми запису володіння зброєю", () => {
  it("читає обʼєкт {category, type}", () => {
    const grant = readWeaponProficiencyGrant({ type: ["MARTIAL_WEAPON"], category: ["RAPIER"] }, null);

    expect(grant).toEqual({ weaponTypes: ["MARTIAL_WEAPON"], specificWeaponNames: ["RAPIER"] });
  });

  it("читає масив, розводячи типи й конкретну зброю", () => {
    const grant = readWeaponProficiencyGrant(["SIMPLE_WEAPON", "SHORTSWORD"], null);

    expect(grant).toEqual({ weaponTypes: ["SIMPLE_WEAPON"], specificWeaponNames: ["SHORTSWORD"] });
  });

  it("додає іменне володіння з окремої колонки", () => {
    const grant = readWeaponProficiencyGrant({ type: ["SIMPLE_WEAPON"] }, { specific: ["RAPIER", "WHIP"] });

    expect(grant).toEqual({ weaponTypes: ["SIMPLE_WEAPON"], specificWeaponNames: ["RAPIER", "WHIP"] });
  });

  it("порожнє значення не дає володіння нічим", () => {
    expect(readWeaponProficiencyGrant(null, undefined)).toEqual({ weaponTypes: [], specificWeaponNames: [] });
  });
});
