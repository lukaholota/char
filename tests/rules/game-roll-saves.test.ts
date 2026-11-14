import { describe, expect, it } from "vitest";
import { buildGameRollSavesView, MAX_SAVE_TARGETS, parseGameRollSaves, splitSaveDamage, type StoredSaves } from "@/rules/game-roll-saves";

const fireball = { engName: "Fireball", level: 3, ruleset: "RULES_2014" as const };

describe("parseGameRollSaves", () => {
  it("приймає зону з заклинанням ряткидка й прибирає повтори", () => {
    expect(parseGameRollSaves({ creatureIds: [3, 4, 3], spell: fireball, dc: 15 })).toEqual({ creatureIds: [3, 4], persIds: [], spell: fireball, effect: { ability: "DEX", damageType: "fire", isHalfOnSave: true }, dc: 15 });
    expect(parseGameRollSaves({ creatureIds: [3], persIds: [7, 7], spell: fireball, dc: 15 })).toMatchObject({ creatureIds: [3], persIds: [7] });
  });

  it("без ряткидків — null, а зіпсований запис — undefined", () => {
    expect(parseGameRollSaves(undefined)).toBeNull();
    expect(parseGameRollSaves(null)).toBeNull();
    expect(parseGameRollSaves("Fireball")).toBeUndefined();
    expect(parseGameRollSaves({ creatureIds: [], spell: fireball, dc: 15 })).toBeUndefined();
    expect(parseGameRollSaves({ creatureIds: [0], spell: fireball, dc: 15 })).toBeUndefined();
    expect(parseGameRollSaves({ creatureIds: Array.from({ length: MAX_SAVE_TARGETS + 1 }, (_, index) => index + 1), spell: fireball, dc: 15 })).toBeUndefined();
    expect(parseGameRollSaves({ creatureIds: [3], spell: fireball, dc: 0 })).toBeUndefined();
    expect(parseGameRollSaves({ creatureIds: [3], spell: { ...fireball, ruleset: "RULES_2030" }, dc: 15 })).toBeUndefined();
  });

  it("дія статблоку без шкоди передає стан, а невідомий стан чи тип шкоди — зіпсований запис", () => {
    const gaze = { ability: "WIS", damageType: null, isHalfOnSave: false, condition: "frightened" };
    expect(parseGameRollSaves({ creatureIds: [3], effect: gaze, dc: 12 })).toEqual({ creatureIds: [3], persIds: [], spell: null, effect: gaze, dc: 12 });
    expect(parseGameRollSaves({ creatureIds: [3], effect: { ...gaze, condition: undefined }, dc: 12 })?.effect).toEqual({ ability: "WIS", damageType: null, isHalfOnSave: false });
    expect(parseGameRollSaves({ creatureIds: [3], effect: { ...gaze, condition: "cursed" }, dc: 12 })).toBeUndefined();
    expect(parseGameRollSaves({ creatureIds: [3], effect: { ...gaze, condition: "toString" }, dc: 12 })).toBeUndefined();
    expect(parseGameRollSaves({ creatureIds: [3], effect: { ...gaze, damageType: "sonic" }, dc: 12 })).toBeUndefined();
  });

  it("відмовляє заклинанню без шкоди з ряткидком: його не можна прикрити ряткидками", () => {
    expect(parseGameRollSaves({ creatureIds: [3], spell: { engName: "Hold Person", level: 2, ruleset: "RULES_2014" }, dc: 15 })).toBeUndefined();
  });
});

describe("buildGameRollSavesView", () => {
  const stored: StoredSaves = {
    ability: "DEX",
    dc: 15,
    damageType: "fire",
    isHalfOnSave: true,
    rows: [
      { creatureId: 3, name: "Гоблін 1", d20: [12], mode: "NORMAL", bonus: 2, total: 14, isSaved: false, isAutoFail: false, defense: null, damage: 20, hpBefore: 7, hpChange: 7, isUndone: false },
      { creatureId: 4, name: "Гоблін 2", d20: [18], mode: "NORMAL", bonus: 2, total: 20, isSaved: true, isAutoFail: false, defense: null, damage: 10, hpBefore: 7, hpChange: 7, isUndone: true },
      { creatureId: 5, name: "Мефіт", d20: [3], mode: "NORMAL", bonus: 1, total: 4, isSaved: false, isAutoFail: false, defense: "immune", damage: 0, hpBefore: null, hpChange: null, isUndone: false },
    ],
  };

  it("гравець бачить лише імʼя, успіх і шкоду", () => {
    const view = buildGameRollSavesView(stored, { isGm: false });
    expect(view?.rows.map(({ name, isSaved, damage, gm }) => ({ name, isSaved, damage, gm }))).toEqual([
      { name: "Гоблін 1", isSaved: false, damage: 20, gm: null },
      { name: "Гоблін 2", isSaved: true, damage: 10, gm: null },
      { name: "Мефіт", isSaved: false, damage: 0, gm: null },
    ]);
  });

  it("майстер бачить кидок, хіти й може скасувати лише зняті, ще не скасовані хіти", () => {
    const rows = buildGameRollSavesView(stored, { isGm: true })!.rows.map((row) => row.gm!);
    expect(rows[0]).toMatchObject({ d20: [12], bonus: 2, total: 14, hitPointsBefore: 7, hitPointsAfter: 0, canUndo: true, isUndone: false });
    expect(rows[1]).toMatchObject({ canUndo: false, isUndone: true });
    expect(rows[2]).toMatchObject({ defense: "immune", hitPointsBefore: null, hitPointsAfter: null, canUndo: false });
  });

  it("скасований стан гравець більше не бачить, а майстер бачить його поруч зі «скасовано»", () => {
    const row = { persId: 5, name: "Варлок", d20: [7], mode: "NORMAL" as const, bonus: 2, total: 9, isSaved: false, isAutoFail: false, defense: null, damage: 0, condition: "frightened" as const, hpBefore: null, hpChange: null, isConditionAdded: true, isUndone: true };
    const gaze: StoredSaves = { ability: "WIS", dc: 12, damageType: null, isHalfOnSave: false, condition: "frightened", rows: [row] };
    expect(buildGameRollSavesView(gaze, { isGm: false })?.rows[0].condition).toBeNull();
    expect(buildGameRollSavesView(gaze, { isGm: true })?.rows[0]).toMatchObject({ condition: "frightened", gm: { isUndone: true } });
  });

  it("стан від провалу бачать усі, а скасувати його можна, лише якщо провал його справді додав", () => {
    const gaze: StoredSaves = {
      ability: "WIS",
      dc: 12,
      damageType: null,
      isHalfOnSave: false,
      condition: "frightened",
      rows: [
        { ...stored.rows[0], damage: 0, hpBefore: 7, hpChange: 0, condition: "frightened", isConditionAdded: true },
        { ...stored.rows[0], damage: 0, hpBefore: 7, hpChange: 0, condition: "frightened", isConditionAdded: false },
        { ...stored.rows[1], damage: 0, hpBefore: 7, hpChange: 0, isUndone: false },
      ],
    };
    expect(buildGameRollSavesView(gaze, { isGm: false })!.rows.map((row) => row.condition)).toEqual(["frightened", "frightened", null]);
    expect(buildGameRollSavesView(gaze, { isGm: true })!.rows.map((row) => row.gm!.canUndo)).toEqual([true, false, false]);
  });

  it("порожні ряткидки не показуються", () => {
    expect(buildGameRollSavesView(undefined, { isGm: true })).toBeNull();
    expect(buildGameRollSavesView({ ...stored, rows: [] }, { isGm: true })).toBeNull();
  });
});

describe("шкода двох типів", () => {
  const iceStorm = { ability: "DEX", damageType: "bludgeoning", isHalfOnSave: true, secondDamageType: "cold" } as const;
  const roll = { groups: [{ sides: 8, values: [5, 4] }, { sides: 6, values: [6, 3, 2, 4] }], total: 24 };

  it("заклинання несе другий тип в ефекті ряткидка", () => {
    expect(parseGameRollSaves({ creatureIds: [3], spell: { engName: "Ice Storm", level: 4, ruleset: "RULES_2014" }, dc: 15 })?.effect).toEqual(iceStorm);
  });

  it("друга група кубиків — шкода другого типу, решта з бонусом — першого", () => {
    expect(splitSaveDamage(roll, iceStorm)).toEqual({ rolledDamage: 9, secondRolledDamage: 15 });
    expect(splitSaveDamage({ ...roll, total: 27 }, iceStorm)).toEqual({ rolledDamage: 12, secondRolledDamage: 15 });
    expect(splitSaveDamage(roll, { ability: "DEX", damageType: "fire", isHalfOnSave: true })).toEqual({ rolledDamage: 24, secondRolledDamage: 0 });
    expect(splitSaveDamage({ groups: [roll.groups[0]], total: 9 }, iceStorm)).toEqual({ rolledDamage: 9, secondRolledDamage: 0 });
  });

  it("майстер бачить опір до кожного типу, а одному типу другий не домальовується", () => {
    const row = { creatureId: 3, name: "Єті", d20: [4], mode: "NORMAL" as const, bonus: 1, total: 5, isSaved: false, isAutoFail: false, defense: null, secondDefense: "immune" as const, damage: 9, hpBefore: 20, hpChange: 9, isUndone: false };
    const stored: StoredSaves = { ability: "DEX", dc: 15, damageType: "bludgeoning", secondDamageType: "cold", isHalfOnSave: true, rows: [row] };
    const view = buildGameRollSavesView(stored, { isGm: true })!;
    expect(view.secondDamageType).toBe("cold");
    expect(view.rows[0].gm).toMatchObject({ defense: null, secondDefense: "immune" });
    const single = buildGameRollSavesView({ ...stored, secondDamageType: undefined }, { isGm: true })!;
    expect(single).not.toHaveProperty("secondDamageType");
    expect(single.rows[0].gm).not.toHaveProperty("secondDefense");
  });
});
