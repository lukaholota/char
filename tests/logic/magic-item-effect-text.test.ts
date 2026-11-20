import { describe, expect, it } from "vitest";
import { describeMagicItemEffect, isCountedBySheet } from "@/lib/logic/magic-item-effect-text";
import type { MagicItemEffect } from "@/rules/magic-item-effects";

describe("describeMagicItemEffect", () => {
  it.each<[MagicItemEffect, string]>([
    [{ kind: "AC_BONUS", bonus: 2, unarmoredOnly: true }, "КБ +2 без обладунку й щита"],
    [{ kind: "AC_BONUS", bonus: 1 }, "КБ +1"],
    [{ kind: "SAVE_BONUS", bonus: 1 }, "Усі рятівні кидки +1"],
    [{ kind: "ABILITY_BONUS", ability: "CON", bonus: 2, max: 20 }, "Статура +2, не вище 20"],
    [{ kind: "MOVEMENT", mode: "FLY", feet: "WALK" }, "Швидкість польоту дорівнює швидкості ходьби"],
    [{ kind: "MOVEMENT", mode: "SWIM", feet: 40 }, "Швидкість плавання 40 футів"],
    [{ kind: "DARKVISION", range: 60, extendsExisting: true }, "Темнозір 60 футів або +60 до наявного"],
    [{ kind: "SPELL_DC_BONUS", bonus: -1 }, "СК заклинань -1"],
    [{ kind: "ADVANTAGE", scope: "INITIATIVE" }, "Перевага на кидки Ініціативи"],
  ])("%o", (effect, text) => {
    expect(describeMagicItemEffect(effect)).toBe(text);
  });

  it("примітки лист не рахує", () => {
    expect(isCountedBySheet({ kind: "NOTE", text: "x" })).toBe(false);
    expect(isCountedBySheet({ kind: "CHECK_BONUS", bonus: 1 })).toBe(true);
  });
});
