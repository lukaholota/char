import { describe, expect, it } from "vitest";
import { PERS_SHEET_INCLUDE } from "./pers-sheet-include";

describe("PERS_SHEET_INCLUDE", () => {
  it("keeps lists the sheet edits in place in a stable order", () => {
    expect(PERS_SHEET_INCLUDE.magicItems.orderBy).toEqual({ persMagicItemId: "asc" });
    expect(PERS_SHEET_INCLUDE.weapons.orderBy).toEqual({ persWeaponId: "asc" });
    expect(PERS_SHEET_INCLUDE.armors.orderBy).toEqual({ persArmorId: "asc" });
  });
});
