import { describe, expect, it } from "vitest";

import { collectPrintableWeaponMasteries } from "./weaponMasteryPrint";

describe("collectPrintableWeaponMasteries", () => {
  it("перекладає зброю й підписує властивість парою назв", () => {
    const masteries = collectPrintableWeaponMasteries({
      pers_weapon_mastery: [{ weapon: { name: "RAPIER", mastery: "VEX" } }],
    });

    expect(masteries).toEqual([
      {
        weaponName: "Рапіра",
        masteryLabel: "Знервування (Vex)",
        description: expect.stringContaining("перевагу"),
      },
    ]);
  });

  it("пропускає зброю без властивості майстерності", () => {
    expect(collectPrintableWeaponMasteries({ pers_weapon_mastery: [{ weapon: { name: "CLUB", mastery: null } }] })).toEqual([]);
    expect(collectPrintableWeaponMasteries({})).toEqual([]);
  });
});
