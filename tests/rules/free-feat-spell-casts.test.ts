import { describe, expect, it } from "vitest";
import { findFreeSpellCasts, findFreeSpellCastsForSpell, type FeatFreeCastFeature } from "@/rules/free-feat-spell-casts";

const bless = { spellId: 11, level: 1, origin: "FEAT", sourceName: "MAGIC_INITIATE" };
const tollTheDead = { spellId: 12, level: 0, origin: "FEAT", sourceName: "MAGIC_INITIATE" };
const thunderwave = { spellId: 13, level: 1, origin: "CLASS", sourceName: "WIZARD_2024" };

const clericList: FeatFreeCastFeature = {
  featName: "MAGIC_INITIATE",
  featureId: 49277,
  featureName: "Посвячений у магію: список клірика",
  maxUses: 1,
  usesRemaining: null,
};

describe("Р38 — безкоштовне застосування заклинання риси як лічильник фічі", () => {
  it("заклинання 1-го рівня від риси отримує лічильник цієї риси", () => {
    expect(findFreeSpellCasts([bless], [clericList])).toEqual([
      { spellId: 11, featureId: 49277, featureName: "Посвячений у магію: список клірика", remaining: 1, maxUses: 1 },
    ]);
  });

  it("рядка використань ще немає — залишок повний, витрачене — те, що в рядку", () => {
    expect(findFreeSpellCasts([bless], [{ ...clericList, usesRemaining: 0 }])[0].remaining).toBe(0);
  });

  it("замовляння й заклинання класу лічильника не мають", () => {
    expect(findFreeSpellCasts([tollTheDead, thunderwave], [clericList])).toEqual([]);
  });

  it("заклинання чужої риси лічильник не бачить", () => {
    expect(findFreeSpellCasts([{ ...bless, sourceName: "FEY_TOUCHED" }], [clericList])).toEqual([]);
  });

  it("риса, взята двічі, дає два лічильники — вибір за гравцем", () => {
    const wizardList: FeatFreeCastFeature = { ...clericList, featureId: 49278, featureName: "Посвячений у магію: список чарівника" };

    expect(findFreeSpellCasts([bless], [clericList, wizardList]).map((cast) => cast.featureId)).toEqual([49277, 49278]);
  });

  it("залишок понад максимум не показується більшим за максимум", () => {
    expect(findFreeSpellCasts([bless], [{ ...clericList, usesRemaining: 4 }])[0].remaining).toBe(1);
  });

  it("пропозиції відбираються за заклинанням", () => {
    const casts = findFreeSpellCasts([bless], [clericList]);

    expect(findFreeSpellCastsForSpell(casts, 11)).toHaveLength(1);
    expect(findFreeSpellCastsForSpell(casts, 13)).toHaveLength(0);
  });
});
