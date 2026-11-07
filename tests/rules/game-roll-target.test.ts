import { describe, expect, it } from "vitest";
import { buildGameRollTargetView, findAttackHit, findGameRollKind, findGameRollTargetProblem, parseArmorClass, parseGameRollTarget, type GameRollTargetRow } from "@/rules/game-roll-target";

const d20 = (value: number) => ({ d20Mode: "NORMAL" as const, groups: [{ sides: 20, values: [value] }] });

describe("ціль кидка", () => {
  it("розбирає ціль, відсутню ціль і зіпсований запис", () => {
    expect(parseGameRollTarget(undefined)).toBeNull();
    expect(parseGameRollTarget(null)).toBeNull();
    expect(parseGameRollTarget({ creatureId: 4, kind: "attack" })).toEqual({ creatureId: 4, kind: "attack" });
    for (const raw of ["x", {}, { creatureId: 0, kind: "attack" }, { creatureId: 1.5, kind: "attack" }, { creatureId: 1, kind: "heal" }]) expect(parseGameRollTarget(raw)).toBeUndefined();
  });

  it("атака — к20, шкода — сума без к20 і не менша за нуль", () => {
    expect(findGameRollTargetProblem({ d20Mode: "NORMAL", total: 12 }, "attack")).toBeNull();
    expect(findGameRollTargetProblem({ d20Mode: null, total: 12 }, "attack")).not.toBeNull();
    expect(findGameRollTargetProblem({ d20Mode: null, total: 0 }, "damage")).toBeNull();
    expect(findGameRollTargetProblem({ d20Mode: null, total: -1 }, "damage")).not.toBeNull();
    expect(findGameRollTargetProblem({ d20Mode: "NORMAL", total: 9 }, "damage")).not.toBeNull();
  });

  it("ціль мають лише атака й шкода", () => {
    expect(findGameRollKind({ key: "attack", label: "Атака", isD20: true })).toBe("attack");
    expect(findGameRollKind({ key: "spell-attack", label: "Атака", isD20: true })).toBe("attack");
    expect(findGameRollKind({ key: "damage", label: "Шкода", isD20: false })).toBe("damage");
    expect(findGameRollKind({ key: "spell-0", label: "Шкода", isD20: false })).toBe("damage");
    expect(findGameRollKind({ key: "initiative", label: "Ініціатива", isD20: true })).toBeNull();
    expect(findGameRollKind({ key: "str-save", label: "Сила", isD20: true })).toBeNull();
    expect(findGameRollKind({ key: "spell-1", label: "Лікування", isD20: false })).toBeNull();
    expect(findGameRollKind({ key: "roll-0", label: "Перезарядка 5–6", isD20: false })).toBeNull();
  });

  it("КБ береться з початку рядка; змінні КБ не розбираються", () => {
    expect(parseArmorClass("15 (природний)")).toBe(15);
    expect(parseArmorClass("18 (пластинчастий обладунок, щит)")).toBe(18);
    expect(parseArmorClass("9")).toBe(9);
    expect(parseArmorClass("11 + рівень заклинання (природний обладунок)")).toBeNull();
    expect(parseArmorClass("13 + БМ (природний обладунок)")).toBeNull();
    expect(parseArmorClass("11 у подобі гуманоїда, 12 (природний обладунок) у подобі вовка")).toBeNull();
    expect(parseArmorClass("")).toBeNull();
    expect(parseArmorClass(undefined)).toBeNull();
  });

  it("влучання: 20 завжди, 1 ніколи, інакше сума не менша за КБ", () => {
    expect(findAttackHit(d20(20), 5, 30)).toBe(true);
    expect(findAttackHit(d20(1), 25, 10)).toBe(false);
    expect(findAttackHit(d20(10), 15, 15)).toBe(true);
    expect(findAttackHit(d20(10), 14, 15)).toBe(false);
    expect(findAttackHit(d20(10), 14, null)).toBeNull();
    expect(findAttackHit(d20(20), 14, null)).toBe(true);
  });

  it("при перевазі натуральна 20 береться з кращого куба", () => {
    const advantage = { d20Mode: "ADVANTAGE" as const, groups: [{ sides: 20, values: [3, 20] }] };
    expect(findAttackHit(advantage, 4, 18)).toBe(true);
  });
});

const damageRow: GameRollTargetRow = { targetName: "Гоблін 2", targetCreatureId: 7, rollKind: "damage", total: 9, targetAc: null, isHit: null, hpBefore: 7, hpChange: 7, hpChangeUndone: false };
const attackRow: GameRollTargetRow = { targetName: "Гоблін 2", targetCreatureId: 7, rollKind: "attack", total: 14, targetAc: 15, isHit: false, hpBefore: null, hpChange: null, hpChangeUndone: false };

describe("вигляд цілі в журналі", () => {
  it("рядок без цілі не дає вигляду", () => {
    expect(buildGameRollTargetView({ ...attackRow, targetName: null, rollKind: null }, { isGm: true })).toBeNull();
    expect(buildGameRollTargetView({ ...attackRow, rollKind: "weird" }, { isGm: true })).toBeNull();
  });

  it("гравець бачить кинуту шкоду, але ні хітів, ні КБ, ні кнопки скасування", () => {
    const view = buildGameRollTargetView(damageRow, { isGm: false });
    expect(view).toEqual({ name: "Гоблін 2", kind: "damage", isHit: null, damage: 9, isDowned: true, gm: null });
    expect(JSON.stringify(view)).not.toContain("7");
  });

  it("майстер бачить хіти до й після та може скасувати один раз", () => {
    expect(buildGameRollTargetView(damageRow, { isGm: true })?.gm).toEqual({ armorClass: null, hitPointsBefore: 7, hitPointsAfter: 0, canUndo: true, isUndone: false });
    expect(buildGameRollTargetView({ ...damageRow, hpChangeUndone: true }, { isGm: true })).toMatchObject({ gm: { canUndo: false, isUndone: true } });
    expect(buildGameRollTargetView({ ...damageRow, targetCreatureId: null }, { isGm: true })?.gm?.canUndo).toBe(false);
    expect(buildGameRollTargetView({ ...damageRow, hpChange: 0 }, { isGm: true })?.gm?.canUndo).toBe(false);
  });

  it("«повалений» — лише коли саме цей удар довів хіти до нуля і його не скасували", () => {
    expect(buildGameRollTargetView({ ...damageRow, hpChange: 6 }, { isGm: false })?.isDowned).toBe(false);
    expect(buildGameRollTargetView({ ...damageRow, hpBefore: 0, hpChange: 0 }, { isGm: false })?.isDowned).toBe(false);
    expect(buildGameRollTargetView({ ...damageRow, hpChangeUndone: true }, { isGm: false })?.isDowned).toBe(false);
    expect(buildGameRollTargetView({ ...damageRow, hpBefore: null, hpChange: null }, { isGm: false })?.isDowned).toBe(false);
  });

  it("шкода без хітів не дає ні діапазону, ні скасування", () => {
    expect(buildGameRollTargetView({ ...damageRow, hpBefore: null, hpChange: null }, { isGm: true })?.gm).toEqual({ armorClass: null, hitPointsBefore: null, hitPointsAfter: null, canUndo: false, isUndone: false });
  });

  it("атаку всі бачать як влучання чи промах, КБ — лише майстер", () => {
    expect(buildGameRollTargetView(attackRow, { isGm: false })).toMatchObject({ kind: "attack", isHit: false, damage: null, gm: null });
    expect(buildGameRollTargetView(attackRow, { isGm: true })?.gm?.armorClass).toBe(15);
  });
});
