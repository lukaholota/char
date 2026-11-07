import { describe, expect, it } from "vitest";
import { describeHeroLifeState, findHeroLifeState } from "@/rules/hero-life-state";

const hero = (currentHp: number, extra: Partial<{ deathSaveSuccesses: number; deathSaveFailures: number; isDead: boolean }> = {}) => ({ currentHp, deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false, ...extra });

describe("стан героя на мапі", () => {
  it("з хітами герой на ногах, без листа теж", () => {
    expect(findHeroLifeState(hero(5, { deathSaveFailures: 2 }))).toEqual({ kind: "up" });
    expect(findHeroLifeState(null)).toEqual({ kind: "up" });
    expect(describeHeroLifeState({ kind: "up" })).toBeNull();
  });

  it("на 0 хітів кидає смерть, і рахунок видно", () => {
    const state = findHeroLifeState(hero(0, { deathSaveSuccesses: 1, deathSaveFailures: 2 }));
    expect(state).toEqual({ kind: "dying", successes: 1, failures: 2 });
    expect(describeHeroLifeState(state)).toBe("без тями, кидки смерті: успіхів 1 з 3, провалів 2 з 3");
  });

  it("загиблий лишається загиблим, навіть із хітами", () => {
    expect(findHeroLifeState(hero(3, { isDead: true }))).toEqual({ kind: "dead" });
    expect(describeHeroLifeState({ kind: "dead" })).toBe("загинув");
  });
});
