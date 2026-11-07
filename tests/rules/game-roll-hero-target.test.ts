import { describe, expect, it } from "vitest";
import { buildGameRollHeroTargetView, buildHeroDamageOperationId, findCreatureRollKind, isHealingAction, parseGameRollHeroTarget } from "@/rules/game-roll-hero-target";

describe("ціль-герой кидка майстра", () => {
  it("розбирає ціль і відкидає зіпсовану", () => {
    expect(parseGameRollHeroTarget(undefined)).toBeNull();
    expect(parseGameRollHeroTarget(null)).toBeNull();
    expect(parseGameRollHeroTarget({ persId: 7, kind: "damage" })).toEqual({ persId: 7, kind: "damage" });
    expect(parseGameRollHeroTarget("7")).toBeUndefined();
    expect(parseGameRollHeroTarget({ persId: 0, kind: "attack" })).toBeUndefined();
    expect(parseGameRollHeroTarget({ persId: 7, kind: "heal" })).toEqual({ persId: 7, kind: "heal" });
    expect(parseGameRollHeroTarget({ persId: 7, kind: "save" })).toBeUndefined();
  });

  it("лікування з листа бере героя-ціль, групове «Лікування кожного» — ні", () => {
    expect(isHealingAction({ label: "Лікування", isD20: false })).toBe(true);
    expect(isHealingAction({ label: "Лікування кожного", isD20: false })).toBe(false);
    expect(isHealingAction({ label: "Лікування", isD20: true })).toBe(false);
  });

  it("атака й шкода статблоку б'ють героя, перезарядка — ні", () => {
    expect(findCreatureRollKind({ label: "Атака", isD20: true })).toBe("attack");
    expect(findCreatureRollKind({ label: "Шкода", isD20: false })).toBe("damage");
    expect(findCreatureRollKind({ label: "Перезарядка 5–6", isD20: false })).toBeNull();
    expect(findCreatureRollKind({ label: "Ряткидок", isD20: true })).toBeNull();
  });

  it("шкода в журналі — сума кидка, атака — без шкоди", () => {
    const gm = { isGm: true };
    expect(buildGameRollHeroTargetView({ persId: 7, name: "Пивослав", kind: "damage" }, 9, gm)).toEqual({ persId: 7, name: "Пивослав", kind: "damage", damage: 9, healing: null, isHit: null, armorClass: null, isAppliedToSheet: false });
    expect(buildGameRollHeroTargetView({ persId: 7, name: "Пивослав", kind: "heal" }, 8, gm)).toMatchObject({ damage: null, healing: 8 });
    expect(buildGameRollHeroTargetView({ persId: 7, name: "Пивослав", kind: "damage", isAppliedToSheet: true }, 9, gm)?.isAppliedToSheet).toBe(true);
    expect(buildGameRollHeroTargetView({ persId: 7, name: "Пивослав", kind: "attack" }, 17, gm)?.damage).toBeNull();
    expect(buildGameRollHeroTargetView(undefined, 3, gm)).toBeNull();
  });

  it("влучання бачать усі, КЗ героя — лише майстер; стара подія без КЗ — без результату", () => {
    const stored = { persId: 7, name: "Пивослав", kind: "attack" as const, armorClass: 16, isHit: true };
    expect(buildGameRollHeroTargetView(stored, 17, { isGm: true })).toMatchObject({ isHit: true, armorClass: 16 });
    expect(buildGameRollHeroTargetView(stored, 17, { isGm: false })).toMatchObject({ isHit: true, armorClass: null });
    expect(buildGameRollHeroTargetView({ persId: 7, name: "Пивослав", kind: "attack" }, 17, { isGm: true })).toMatchObject({ isHit: null, armorClass: null });
  });

  it("ідентифікатор зняття хітів сталий для події й підходить черзі листа", () => {
    expect(buildHeroDamageOperationId(3, 41)).toBe(buildHeroDamageOperationId(3, 41));
    expect(buildHeroDamageOperationId(3, 41)).not.toBe(buildHeroDamageOperationId(3, 42));
    expect(buildHeroDamageOperationId(1, 1).length).toBeGreaterThanOrEqual(8);
    expect(buildHeroDamageOperationId(3, 41, 0)).not.toBe(buildHeroDamageOperationId(3, 41));
    expect(buildHeroDamageOperationId(3, 41, 0)).not.toBe(buildHeroDamageOperationId(3, 41, 1));
  });
});
