import { describe, expect, it } from "vitest";
import { buildD20Action, buildRollOutcome, buildWeaponRollContext } from "@/lib/components/dice/roll-contexts";
import { findGameRollProblem } from "@/rules/game-roll";
import { buildActionGameRoll, buildFreeGameRoll, takeDiceToPublish } from "./build-game-roll";

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
