import { describe, expect, it } from "vitest";
import { buildCreatureActionRollContext, buildD20Action, buildRollOutcome, buildSpellRollContext, buildWeaponRollContext } from "@/lib/components/dice/roll-contexts";
import { findGameRollProblem } from "@/rules/game-roll";
import { buildActionGameRoll, buildFreeGameRoll, canRollTakeTarget, findActionRollKind, takeDiceToPublish } from "./build-game-roll";

function rollAction(context: ReturnType<typeof buildWeaponRollContext>, actionIndex: number, d20Mode: "NORMAL" | "ADVANTAGE" | "DISADVANTAGE", values: number[]) {
  const action = context.actions[actionIndex];
  const outcome = buildRollOutcome(
    { actionKey: action.key, label: action.label, bonus: action.bonus, d20Mode: action.isD20 ? d20Mode : null, mainDiceCount: action.isD20 ? (d20Mode === "NORMAL" ? 1 : 2) : action.count, extraDice: action.extraDice ?? [] },
    values,
  );
  return buildActionGameRoll({ context, action, d20Mode }, outcome);
}

describe("buildActionGameRoll", () => {
  const blessed = { mode: "ADVANTAGE" as const, sources: ["Безрозсудна атака"], extraDice: [{ sides: 4, sign: 1 as const, label: "Благословення" }] };
  const context = buildWeaponRollContext({ weaponName: "Довгий меч", attackBonus: 5, damageBonus: 3, damageDice: "1d8", attackState: blessed, damageExtraDice: [{ sides: 6, sign: 1, label: "Лють" }] });

  it("keeps advantage sources and extra dice, and the server accepts it", () => {
    const published = rollAction(context, 0, "ADVANTAGE", [4, 17, 3]);
    expect(published.label).toBe("Довгий меч · Атака");
    expect(published.roll).toMatchObject({ d20Mode: "ADVANTAGE", modeSources: ["Безрозсудна атака"], groups: [{ sides: 20, values: [4, 17] }], bonus: 5, total: 25 });
    expect(findGameRollProblem(published.roll)).toBeNull();
  });

  it("drops mode sources when the player overrides the mode", () => {
    expect(rollAction(context, 0, "NORMAL", [12, 2]).roll.modeSources).toEqual([]);
  });

  it("publishes damage with its die sides", () => {
    const published = rollAction(context, 1, "NORMAL", [6, 5]);
    expect(published.roll).toMatchObject({ d20Mode: null, groups: [{ sides: 8, values: [6] }], extra: [{ sides: 6, value: 5, label: "Лють" }], total: 14 });
    expect(findGameRollProblem(published.roll)).toBeNull();
  });

  it("adds a check verdict that matches the total", () => {
    const concentration = { title: "Концентрація", actions: [buildD20Action("save", "Ряткидок", 2)], check: { dc: 10, successText: "", failureText: "", onResult: () => {} } };
    const outcome = buildRollOutcome({ actionKey: "save", label: "Ряткидок", bonus: 2, d20Mode: "NORMAL", mainDiceCount: 1, extraDice: [] }, [8]);
    const published = buildActionGameRoll({ context: concentration, action: concentration.actions[0], d20Mode: "NORMAL" }, outcome);
    expect(published.roll.check).toEqual({ dc: 10, isSuccess: true });
    expect(findGameRollProblem(published.roll)).toBeNull();
  });
});

describe("кидок істоти з бестіарію", () => {
  const owlbear = buildCreatureActionRollContext({
    creatureName: "Сововедмідь",
    actionName: "Роздирання",
    rolls: [{ kind: "attack", bonus: 7 }, { kind: "damage", count: 2, sides: 8, bonus: 5 }],
    index: 1,
  });

  it("іде вільним кидком з назвою істоти й дії, а шкода — з її кубиками", () => {
    expect(owlbear.autoRollKey).toBe("roll-1");
    const published = rollAction(owlbear, 1, "NORMAL", [3, 8]);
    expect(published).toMatchObject({ label: "Сововедмідь · Роздирання · Шкода", isFromSheet: false });
    expect(published.roll).toMatchObject({ d20Mode: null, groups: [{ sides: 8, values: [3, 8] }], bonus: 5, total: 16 });
    expect(findGameRollProblem(published.roll)).toBeNull();
  });

  it("атака кидає к20 з бонусом", () => {
    expect(rollAction(owlbear, 0, "NORMAL", [11]).roll).toMatchObject({ d20Mode: "NORMAL", groups: [{ sides: 20, values: [11] }], total: 18 });
  });
});

describe("buildFreeGameRoll", () => {
  it("groups dice by sides and names them with «к»", () => {
    const published = buildFreeGameRoll([{ sides: 8, value: 3 }, { sides: 6, value: 2 }, { sides: 6, value: 6 }]);
    expect(published?.label).toBe("2к6 + 1к8");
    expect(published?.roll.total).toBe(11);
    expect(findGameRollProblem(published?.roll)).toBeNull();
  });

  it("publishes nothing for an empty pool", () => {
    expect(buildFreeGameRoll([])).toBeNull();
  });
});

describe("takeDiceToPublish", () => {
  it("publishes an added die alone and a reroll of the pool in full", () => {
    const published = new Set<string>();
    const firstPool = [{ rollId: 0 }, { rollId: 1 }];
    expect(takeDiceToPublish(firstPool, published, false)).toEqual(firstPool);

    const withAdded = [...firstPool, { rollId: 2 }];
    expect(takeDiceToPublish(withAdded, published, true)).toEqual([{ rollId: 2 }]);
    expect(takeDiceToPublish(withAdded, published, true)).toEqual([]);

    expect(takeDiceToPublish(withAdded, published, false)).toEqual(withAdded);
  });
});

describe("шкода заклинання в журналі", () => {
  const fireball = buildSpellRollContext({
    spellName: "Вогняна куля",
    plan: { attack: false, save: "DEX", rollsLater: false, pieces: null, rolls: [{ key: "spell-0", label: "Шкода", count: 9, sides: 6, bonus: 0 }] },
    slotLabel: "Слот 4 рівня",
    attackBonus: 7,
    saveDC: 15,
  });

  it("підписана СК ряткидка цілі й іде від персонажа", () => {
    const published = rollAction(fireball, 0, "NORMAL", [1, 2, 3, 4, 5, 6, 1, 2, 3]);
    expect(published).toMatchObject({ label: "Вогняна куля · Шкода · ряткидок Спритності СК 15", isFromSheet: true });
    expect(published.roll).toMatchObject({ groups: [{ sides: 6, values: [1, 2, 3, 4, 5, 6, 1, 2, 3] }], total: 27 });
    expect(findGameRollProblem(published.roll)).toBeNull();
  });
});

describe("шкода заклинання з ряткидком", () => {
  const fireballPlan = { attack: false, save: "DEX" as const, rollsLater: false, pieces: null, rolls: [{ key: "damage", label: "Шкода", count: 8, sides: 6, bonus: 0 }] };
  const spell = { engName: "Fireball", level: 3, ruleset: "RULES_2014" as const };
  const fireball = buildSpellRollContext({ spellName: "Вогняна куля", plan: fireballPlan, attackBonus: 5, saveDC: 15, spell });
  const rollFireball = (context: typeof fireball) => {
    const outcome = buildRollOutcome({ actionKey: "damage", label: "Шкода", bonus: 0, d20Mode: null, mainDiceCount: 8, extraDice: [] }, [1, 2, 3, 4, 5, 6, 1, 2]);
    return buildActionGameRoll({ context, action: context.actions[0], d20Mode: "NORMAL" }, outcome);
  };

  it("несе заклинання й СК, щоб кімната кинула ряткидки цілей, і зону, якщо її наклали", () => {
    const targets = { creatureIds: [3, 4], persIds: [7] };
    expect(rollFireball(fireball)).toMatchObject({ kind: "damage", save: { spell, dc: 15 } });
    expect(rollFireball(fireball).areaTargets).toBeUndefined();
    expect(rollFireball({ ...fireball, areaTargets: targets }).areaTargets).toEqual(targets);
  });

  it("заклинання без шкоди з ряткидком лишається звичайною шкодою", () => {
    const sleep = buildSpellRollContext({ spellName: "Сон", plan: fireballPlan, attackBonus: 5, saveDC: 15, spell: { ...spell, engName: "Sleep" } });
    const targets = { creatureIds: [3], persIds: [] };
    expect(rollFireball({ ...sleep, areaTargets: targets })).not.toHaveProperty("save");
    expect(rollFireball({ ...sleep, areaTargets: targets })).not.toHaveProperty("areaTargets");
  });
});

describe("canRollTakeTarget", () => {
  const healingWord = buildSpellRollContext({
    spellName: "Цілюще слово",
    plan: { attack: false, save: null, rollsLater: false, pieces: null, rolls: [{ key: "spell-0", label: "Лікування", count: 1, sides: 4, bonus: 3 }] },
    attackBonus: 5,
    saveDC: 13,
  });

  it("лікування не бере ціль, атака зброєю й шкода — беруть", () => {
    expect(canRollTakeTarget(healingWord)).toBe(false);
    expect(findActionRollKind(healingWord, healingWord.actions[0])).toBe("heal");
    expect(findActionRollKind({ isCreatureRoll: true }, { ...healingWord.actions[0] })).toBeNull();
    expect(canRollTakeTarget(buildWeaponRollContext({ weaponName: "Лук", attackBonus: 5, damageBonus: 3, damageDice: "1d8" }))).toBe(true);
  });
});
