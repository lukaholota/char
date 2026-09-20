import { describe, expect, it } from "vitest";
import { findLevelUpWeaponMastery } from "@/lib/components/levelUp/levelup-weapon-mastery";
import { NO_WEAPON_PROFICIENCY } from "@/rules/weapon-mastery";

const FIGHTER_PROGRESSION = [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6];

const fighter = {
  classId: 1,
  name: "FIGHTER_2024",
  weapon_mastery_progression: FIGHTER_PROGRESSION,
  weaponProficiencies: { type: ["SIMPLE_WEAPON", "MARTIAL_WEAPON"] },
};
const wizard = {
  classId: 2,
  name: "WIZARD_2024",
  weapon_mastery_progression: [],
  weaponProficiencies: { type: ["SIMPLE_WEAPON"] },
};

const weapons = [
  { weaponId: 10, name: "GREATSWORD", mastery: "GRAZE", weaponType: "MARTIAL_WEAPON", isRanged: false },
  { weaponId: 11, name: "HANDAXE", mastery: "VEX", weaponType: "SIMPLE_WEAPON", isRanged: false },
];

describe("майстерність зброї на підвищенні рівня", () => {
  it("рахує ємність за новим рівнем обраного класу, а не за поточним", () => {
    const mastery = findLevelUpWeaponMastery({
      pers: { classId: 1, class: fighter, multiclasses: [], pers_weapon_mastery: [{ weapon_id: 10 }] },
      selectedClass: fighter,
      selectedClassId: 1,
      classLevelAfter: 4,
      mainClassLevel: 3,
      weapons,
      proficiency: NO_WEAPON_PROFICIENCY,
    });

    expect(mastery.capacity).toBe(4);
    expect(mastery.currentWeaponIds).toEqual([10]);
    expect(mastery.needsChoice).toBe(true);
  });

  it("рівень чужого класу не рухає ємність воїна", () => {
    const mastery = findLevelUpWeaponMastery({
      pers: {
        classId: 1,
        class: fighter,
        multiclasses: [{ classId: 2, classLevel: 1, class: wizard }],
        pers_weapon_mastery: [{ weapon_id: 10 }, { weapon_id: 11 }, { weapon_id: 12 }],
      },
      selectedClass: wizard,
      selectedClassId: 2,
      classLevelAfter: 2,
      mainClassLevel: 3,
      weapons,
      proficiency: NO_WEAPON_PROFICIENCY,
    });

    expect(mastery.capacity).toBe(3);
    expect(mastery.needsChoice).toBe(false);
  });

  it("новий мультиклас приносить свою майстерність із першим рівнем", () => {
    const mastery = findLevelUpWeaponMastery({
      pers: { classId: 2, class: wizard, multiclasses: [], pers_weapon_mastery: [] },
      selectedClass: fighter,
      selectedClassId: 1,
      classLevelAfter: 1,
      mainClassLevel: 3,
      weapons,
      proficiency: NO_WEAPON_PROFICIENCY,
    });

    expect(mastery.capacity).toBe(3);
    expect(mastery.options.map((weapon) => weapon.weaponId)).toEqual([10, 11]);
    expect(mastery.needsChoice).toBe(true);
  });
});

// KR31.4 — «Weapon Master» дає окремий слот поверх класової прогресії.
describe("слот майстерності від риси", () => {
  const weaponMaster = { feat: { name: "WEAPON_MASTER" } };

  it("риса додає слот воїну поверх класової ємності", () => {
    const withoutFeat = findLevelUpWeaponMastery({
      pers: { classId: 1, class: fighter, multiclasses: [], feats: [], pers_weapon_mastery: [] },
      selectedClass: fighter,
      selectedClassId: 1,
      classLevelAfter: 4,
      mainClassLevel: 3,
      weapons,
      proficiency: NO_WEAPON_PROFICIENCY,
    });
    const withFeat = findLevelUpWeaponMastery({
      pers: { classId: 1, class: fighter, multiclasses: [], feats: [weaponMaster], pers_weapon_mastery: [] },
      selectedClass: fighter,
      selectedClassId: 1,
      classLevelAfter: 4,
      mainClassLevel: 3,
      weapons,
      proficiency: NO_WEAPON_PROFICIENCY,
    });

    expect(withoutFeat.capacity).toBe(4);
    expect(withFeat.capacity).toBe(5);
  });

  const simpleWeaponsOnly = { weaponTypes: ["SIMPLE_WEAPON"], specificWeaponNames: [] };

  it("риса відкриває майстерність класу, який її не має, — із простої зброї, якою він володіє", () => {
    const mastery = findLevelUpWeaponMastery({
      pers: { classId: 2, class: wizard, multiclasses: [], feats: [weaponMaster], pers_weapon_mastery: [] },
      selectedClass: wizard,
      selectedClassId: 2,
      classLevelAfter: 4,
      mainClassLevel: 3,
      weapons,
      proficiency: simpleWeaponsOnly,
    });

    expect(mastery.capacity).toBe(1);
    expect(mastery.needsChoice).toBe(true);
    expect(mastery.options.map((weapon) => weapon.name)).toEqual(["HANDAXE"]);
  });

  it("володіння бойовою зброєю від риси відкриває її для слота Weapon Master", () => {
    const mastery = findLevelUpWeaponMastery({
      pers: { classId: 2, class: wizard, multiclasses: [], feats: [weaponMaster], pers_weapon_mastery: [] },
      selectedClass: wizard,
      selectedClassId: 2,
      classLevelAfter: 4,
      mainClassLevel: 3,
      weapons,
      proficiency: { weaponTypes: ["SIMPLE_WEAPON", "MARTIAL_WEAPON"], specificWeaponNames: [] },
    });

    expect(mastery.options.map((weapon) => weapon.name)).toEqual(["GREATSWORD", "HANDAXE"]);
  });

  it("без риси володіння чарівника пулу не відкривають", () => {
    const mastery = findLevelUpWeaponMastery({
      pers: { classId: 2, class: wizard, multiclasses: [], feats: [], pers_weapon_mastery: [] },
      selectedClass: wizard,
      selectedClassId: 2,
      classLevelAfter: 4,
      mainClassLevel: 3,
      weapons,
      proficiency: simpleWeaponsOnly,
    });

    expect(mastery).toMatchObject({ capacity: 0, options: [], needsChoice: false });
  });
});
