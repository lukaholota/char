import { describe, expect, it } from "vitest";
import { buildGameRollSavesView, MAX_SAVE_TARGETS, parseGameRollSaves, type StoredSaves } from "@/rules/game-roll-saves";

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

  it("порожні ряткидки не показуються", () => {
    expect(buildGameRollSavesView(undefined, { isGm: true })).toBeNull();
    expect(buildGameRollSavesView({ ...stored, rows: [] }, { isGm: true })).toBeNull();
  });
});
