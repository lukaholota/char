import { beforeEach, describe, expect, it } from "vitest";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import {
  buildAbilityRollContext,
  buildInitiativeRollContext,
  buildRollOutcome,
  buildSkillRollContext,
  buildSpellAttackRollContext,
  buildWeaponRollContext,
  formatExtraDice,
  listRollNotations,
} from "./roll-contexts";

describe("підсумок кидка", () => {
  it("к20 з перевагою бере більший кубик і додає бонус", () => {
    expect(buildRollOutcome({ actionKey: "save", label: "Ряткидок", bonus: 3, d20Mode: "ADVANTAGE", mainDiceCount: 2, extraDice: [] }, [6, 15])).toMatchObject({ baseValue: 15, total: 18 });
    expect(buildRollOutcome({ actionKey: "save", label: "Ряткидок", bonus: 3, d20Mode: "DISADVANTAGE", mainDiceCount: 2, extraDice: [] }, [6, 15])).toMatchObject({ baseValue: 6, total: 9 });
  });

  it("шкода складає всі кубики", () => {
    expect(buildRollOutcome({ actionKey: "damage", label: "Шкода", bonus: 2, d20Mode: null, mainDiceCount: 2, extraDice: [] }, [3, 5])).toMatchObject({ baseValue: 8, total: 10 });
  });
});

describe("O39 — кубики стану в кидку", () => {
  const bless = { sides: 4, sign: 1 as const, label: "Благословення" };
  const reduce = { sides: 4, sign: -1 as const, label: "Зменшення" };

  it("Благословення додає к4 до ряткидка з перевагою", () => {
    const outcome = buildRollOutcome({ actionKey: "save", label: "Ряткидок", bonus: 3, d20Mode: "ADVANTAGE", mainDiceCount: 2, extraDice: [bless] }, [6, 15, 3]);
    expect(outcome).toMatchObject({ dieValues: [6, 15], baseValue: 15, total: 21 });
    expect(outcome.extraValues).toEqual([{ ...bless, value: 3 }]);
  });

  it("Зменшення віднімає к4 від шкоди, але не нижче 1", () => {
    const small = buildRollOutcome({ actionKey: "damage", label: "Шкода", bonus: 0, d20Mode: null, mainDiceCount: 1, extraDice: [reduce] }, [2, 4]);
    expect(small.total).toBe(1);
  });

  it("звичайна шкода без від'ємних кубиків може бути й нульовою", () => {
    expect(buildRollOutcome({ actionKey: "damage", label: "Шкода", bonus: -1, d20Mode: null, mainDiceCount: 1, extraDice: [] }, [1]).total).toBe(0);
  });

  it("кубики стану коротко: «+к4», від'ємний — «−к4»", () => {
    expect(formatExtraDice([bless])).toBe("+к4");
    expect(formatExtraDice([bless, reduce])).toBe("+к4 −к4");
    expect(formatExtraDice([])).toBe("");
  });

  it("нотації: к20 за режимом, далі кубики стану", () => {
    const action = { key: "save", label: "Ряткидок", count: 1, sides: 20, bonus: 0, isD20: true, extraDice: [bless] };
    expect(listRollNotations(action, "ADVANTAGE")).toEqual(["2d20", "1d4"]);
    expect(listRollNotations(action, "NORMAL")).toEqual(["1d20", "1d4"]);
  });

  it("стан іде в дію: режим і джерела", () => {
    const context = buildSkillRollContext("Атлетика", "Сила", 7, undefined, { mode: "ADVANTAGE", sources: ["Лють"], extraDice: [] });
    expect(context.actions[0]).toMatchObject({ mode: "ADVANTAGE", modeSources: ["Лють"] });
  });
});

describe("контексти кидків листа", () => {
  it("зброя — атака к20 і шкода з кубиків зброї, атака летить одразу", () => {
    const context = buildWeaponRollContext({ weaponName: "Довгий меч", attackBonus: 5, damageBonus: 3, damageDice: "1к8" });
    expect(context.actions).toEqual([
      { key: "attack", label: "Атака", count: 1, sides: 20, bonus: 5, isD20: true },
      { key: "damage", label: "Шкода", count: 1, sides: 8, bonus: 3, isD20: false },
    ]);
    expect(context.autoRollKey).toBe("attack");
  });

  it("характеристика — перевірка й ряткидок зі своїми бонусами, летить те, чого торкнулися", () => {
    const check = buildAbilityRollContext("Сила", 2, 5);
    expect(check.actions.map((action) => [action.label, action.bonus])).toEqual([
      ["Перевірка", 2],
      ["Ряткидок", 5],
    ]);
    expect(check.autoRollKey).toBe("check");
    expect(buildAbilityRollContext("Сила", 2, 5, "save").autoRollKey).toBe("save");
  });

  it("навичка, ініціатива й атака заклинанням — один кидок, що летить одразу", () => {
    expect(buildSkillRollContext("Виживання", "Мудрість", 4)).toMatchObject({ title: "Виживання", subtitle: "Мудрість", autoRollKey: "check" });
    expect(buildInitiativeRollContext(2)).toMatchObject({ autoRollKey: "initiative", actions: [{ bonus: 2, isD20: true }] });
    expect(buildSpellAttackRollContext(7, "Чарівник")).toMatchObject({ subtitle: "Чарівник", autoRollKey: "spell-attack" });
  });

  it("контекст несе правку туди, де лист дозволяє правити", () => {
    const onEdit = () => {};
    expect(buildAbilityRollContext("Сила", 2, 5, "check", onEdit).onEdit).toBe(onEdit);
    expect(buildAbilityRollContext("Сила", 2, 5).onEdit).toBeUndefined();
  });
});

describe("стан панелі кубиків", () => {
  beforeEach(() => useDiceUIStore.getState().close());

  it("тап по числу відкриває панель у режимі кидка з контекстом", () => {
    const store = useDiceUIStore;
    store.getState().openRoll(buildAbilityRollContext("Сила", 2, 5));
    expect(store.getState()).toMatchObject({ isOpen: true, mode: "roll", rollContext: { title: "Сила" } });
  });

  it("закриття панелі кидка закриває її повністю, а кнопка в навігації перемикає вільні кубики", () => {
    const store = useDiceUIStore;
    store.getState().openRoll(buildInitiativeRollContext(2));
    store.getState().close();
    expect(store.getState()).toMatchObject({ isOpen: false, rollContext: null });

    store.getState().toggle();
    expect(store.getState()).toMatchObject({ isOpen: true, mode: "free" });
    store.getState().openRoll(buildInitiativeRollContext(2));
    store.getState().toggle();
    expect(store.getState().isOpen).toBe(false);
  });
});
