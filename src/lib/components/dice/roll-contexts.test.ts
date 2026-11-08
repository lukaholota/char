import { beforeEach, describe, expect, it } from "vitest";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import {
  buildAbilityRollContext,
  buildCreatureActionRollContext,
  buildInitiativeRollContext,
  buildRollOutcome,
  buildSkillRollContext,
  buildSpellAttackRollContext,
  buildSpellRollContext,
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

describe("дія істоти з ряткидком цілі", () => {
  const ray = { creatureName: "Банка", actionName: "Промінь", rolls: [{ kind: "attack" as const, bonus: 8 }, { kind: "damage" as const, count: 2, sides: 8, bonus: 0 }, { kind: "save" as const, ability: "CON" as const, dc: 14 }], saveEffect: { ability: "CON" as const, dc: 14, condition: "poisoned" as const, area: { shape: "circle" as const, sizeFeet: 10 } } };

  it("ряткидок несе власний ефект, а шкода променя лишається звичайною", () => {
    const context = buildCreatureActionRollContext({ ...ray, index: 1, canRollTargetSave: true });
    expect(context.targetSave).toBeUndefined();
    expect(context.actions.map((action) => action.label)).toEqual(["Атака", "Шкода", "Ряткидок"]);
    expect(context.actions[2].targetSave).toEqual({ abilityName: "Статури", dc: 14, effect: { ability: "CON", damageType: null, isHalfOnSave: false, condition: "poisoned" } });
  });

  it("без права кидати ряткидок цілі кнопки немає, решта дії лишається", () => {
    expect(buildCreatureActionRollContext({ ...ray, index: 1 }).actions.map((action) => action.key)).toEqual(["roll-0", "roll-1"]);
  });

  it("зона ефекту — лише коли натиснуто сам ряткидок", () => {
    expect(buildCreatureActionRollContext({ ...ray, index: 2, canRollTargetSave: true }).targetArea).toMatchObject({ shape: "circle", sizeFeet: 10 });
    expect(buildCreatureActionRollContext({ ...ray, index: 1, canRollTargetSave: true }).targetArea).toBeUndefined();
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

describe("кидок заклинання", () => {
  const fireball = { attack: false, save: "DEX" as const, rollsLater: false, pieces: null, rolls: [{ key: "spell-0", label: "Шкода", count: 9, sides: 6, bonus: 0 }] };

  it("Вогняна куля кидає шкоду одразу й показує СК ряткидка цілі", () => {
    const context = buildSpellRollContext({ spellName: "Вогняна куля", plan: fireball, slotLabel: "Слот 4 рівня", attackBonus: 7, saveDC: 15 });
    expect(context).toMatchObject({ title: "Вогняна куля", subtitle: "Слот 4 рівня", autoRollKey: "spell-0", targetSave: { abilityName: "Спритності", dc: 15 } });
    expect(context.actions).toEqual([{ key: "spell-0", label: "Шкода", count: 9, sides: 6, bonus: 0, isD20: false }]);
  });

  it("атака заклинанням іде першою й кидається одразу, промені — в підписі", () => {
    const ray = { attack: true, save: null, rollsLater: false, pieces: { label: "Променів", count: 4 }, rolls: [{ key: "spell-0", label: "Шкода", count: 2, sides: 6, bonus: 0 }] };
    const context = buildSpellRollContext({ spellName: "Пекучий промінь", plan: ray, slotLabel: "Слот 3 рівня", attackBonus: 7, saveDC: 15 });
    expect(context.actions.map((action) => action.key)).toEqual(["spell-attack", "spell-0"]);
    expect(context).toMatchObject({ subtitle: "Слот 3 рівня · Променів: 4", autoRollKey: "spell-attack", targetSave: undefined });
    expect(context.actions[0]).toMatchObject({ isD20: true, bonus: 7 });
  });

  it("шкода, що приходить пізніше, не кидається сама", () => {
    const mark = { attack: false, save: null, rollsLater: true, pieces: null, rolls: [{ key: "spell-0", label: "Шкода", count: 1, sides: 6, bonus: 0 }] };
    expect(buildSpellRollContext({ spellName: "Мітка мисливця", plan: mark, attackBonus: 5, saveDC: 13 }).autoRollKey).toBeUndefined();
  });
});
