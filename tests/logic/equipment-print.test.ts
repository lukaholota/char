import { describe, expect, it } from "vitest";

import {
  formatEquipmentText,
  groupPrintableWeaponAttacks,
  type PrintableWeaponAttack,
} from "@/server/pdf/equipmentPrint";

describe("printed equipment quantities", () => {
  it("collapses ten equal lines into one quantity", () => {
    expect(formatEquipmentText("Спис x1\nСпис x9\nКинджал x1")).toBe(
      "Спис ×10\nКинджал"
    );
  });

  it("preserves the first-seen order and omits ×1", () => {
    expect(formatEquipmentText("Мотузка x1\nСпис x2\nМотузка x1")).toBe(
      "Мотузка ×2\nСпис ×2"
    );
  });
});

describe("printed weapon attacks", () => {
  const spear: PrintableWeaponAttack = {
    name: "Спис",
    attackBonus: "+4",
    damage: "1к6+2",
  };

  it("uses one attack row for ten equal spears", () => {
    expect(groupPrintableWeaponAttacks(Array.from({ length: 10 }, () => spear))).toEqual([
      { ...spear, quantity: 10 },
    ]);
  });

  it("does not merge attacks with different printed mechanics", () => {
    const customized = { ...spear, damage: "1к8+2" };

    expect(groupPrintableWeaponAttacks([spear, customized])).toEqual([
      { ...spear, quantity: 1 },
      { ...customized, quantity: 1 },
    ]);
  });
});
