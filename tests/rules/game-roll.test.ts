import { describe, expect, it } from "vitest";
import { buildSecretRollLabel, canSeeGameRoll, canSeeGameRollValues, computeGameRollTotal, findGameRollProblem, findNaturalD20, isGameRollVisibility, type GameRoll } from "@/rules/game-roll";

const attack: GameRoll = {
  d20Mode: "ADVANTAGE",
  modeSources: ["Безрозсудна атака"],
  groups: [{ sides: 20, values: [7, 15] }],
  extra: [{ sides: 4, sign: 1, label: "Благословення", value: 3 }],
  bonus: 5,
  total: 23,
  check: null,
};

describe("computeGameRollTotal", () => {
  it("keeps the higher d20 with advantage and adds extra dice and bonus", () => {
    expect(computeGameRollTotal(attack)).toBe(23);
  });

  it("keeps the lower d20 with disadvantage", () => {
    expect(computeGameRollTotal({ ...attack, d20Mode: "DISADVANTAGE" })).toBe(15);
  });

  it("sums damage dice and never goes below 1 when a penalty die drags it down", () => {
    const damage = { d20Mode: null, groups: [{ sides: 6, values: [1] }], extra: [{ sides: 4, sign: -1 as const, label: "Скорочення", value: 4 }], bonus: 0 };
    expect(computeGameRollTotal(damage)).toBe(1);
  });

  it("sums several free dice groups", () => {
    expect(computeGameRollTotal({ d20Mode: null, groups: [{ sides: 6, values: [2, 5] }, { sides: 8, values: [8] }], extra: [], bonus: 0 })).toBe(15);
  });
});

describe("findGameRollProblem", () => {
  it("кидок без кубиків приймається лише як ряткидок цілі без шкоди, і тоді кубиків у ньому бути не може", () => {
    const diceless: GameRoll = { d20Mode: null, modeSources: [], groups: [], extra: [], bonus: 0, total: 0, check: null };
    expect(findGameRollProblem(diceless, { isDiceless: true })).toBeNull();
    expect(findGameRollProblem(diceless)).toBe("bad dice groups");
    expect(findGameRollProblem(attack, { isDiceless: true })).toBe("bad dice groups");
    expect(findGameRollProblem({ ...diceless, bonus: 4, total: 4 }, { isDiceless: true })).toMatch(/no dice/);
    expect(findGameRollProblem({ ...diceless, extra: attack.extra, total: 3 }, { isDiceless: true })).toMatch(/no dice/);
  });

  it("accepts a consistent roll", () => {
    expect(findGameRollProblem(attack)).toBeNull();
  });

  it.each([
    ["not an object", null],
    ["a face above the die", { ...attack, groups: [{ sides: 20, values: [21, 3] }] }],
    ["a zero face", { ...attack, groups: [{ sides: 20, values: [0, 3] }] }],
    ["unknown die", { ...attack, d20Mode: null, groups: [{ sides: 7, values: [3] }], total: 11 }],
    ["empty groups", { ...attack, groups: [] }],
    ["fractional bonus", { ...attack, bonus: 1.5 }],
    ["huge bonus", { ...attack, bonus: 5000 }],
    ["bad mode", { ...attack, d20Mode: "LUCKY" }],
    ["too many extra dice", { ...attack, extra: Array.from({ length: 7 }, () => attack.extra[0]) }],
    ["bad extra sign", { ...attack, extra: [{ ...attack.extra[0], sign: 2 }] }],
    ["long extra label", { ...attack, extra: [{ ...attack.extra[0], label: "x".repeat(61) }] }],
    ["bad mode sources", { ...attack, modeSources: "Безрозсудна" }],
    ["fractional total", { ...attack, total: 23.5 }],
    ["malformed check", { ...attack, check: { dc: "15" } }],
    ["too many dice", { ...attack, d20Mode: null, groups: [{ sides: 6, values: Array.from({ length: 51 }, () => 1) }], extra: [], total: 56 }],
  ])("rejects %s", (_name, roll) => {
    expect(findGameRollProblem(roll)).not.toBeNull();
  });

  it("rejects a total the dice do not add up to", () => {
    expect(findGameRollProblem({ ...attack, total: 30 })).toBe("total does not match dice");
  });

  it("rejects a d20 mode without exactly the d20 dice it needs", () => {
    expect(findGameRollProblem({ ...attack, d20Mode: "NORMAL" })).toMatch(/d20 mode/);
    expect(findGameRollProblem({ ...attack, groups: [{ sides: 12, values: [7, 12] }] })).toMatch(/d20 mode/);
  });

  it("rejects a check whose success flag disagrees with the total", () => {
    expect(findGameRollProblem({ ...attack, check: { dc: 15, isSuccess: true } })).toBeNull();
    expect(findGameRollProblem({ ...attack, check: { dc: 25, isSuccess: true } })).toMatch(/check/);
  });
});

describe("findNaturalD20", () => {
  it("marks the kept die, not any die", () => {
    expect(findNaturalD20({ d20Mode: "ADVANTAGE", groups: [{ sides: 20, values: [1, 14] }] })).toBeNull();
    expect(findNaturalD20({ d20Mode: "DISADVANTAGE", groups: [{ sides: 20, values: [1, 14] }] })).toBe("NAT_1");
    expect(findNaturalD20({ d20Mode: "NORMAL", groups: [{ sides: 20, values: [20] }] })).toBe("NAT_20");
  });

  it("ignores damage rolls", () => {
    expect(findNaturalD20({ d20Mode: null, groups: [{ sides: 20, values: [20] }] })).toBeNull();
  });
});

describe("canSeeGameRoll", () => {
  it.each([
    ["PUBLIC", false, false, true],
    ["GM", false, true, true],
    ["GM", false, false, false],
    ["SELF", false, true, false],
    ["SELF", true, false, true],
    ["GM", true, false, true],
  ] as const)("%s roll, author=%s gm=%s → %s", (visibility, isAuthor, isGm, expected) => {
    expect(canSeeGameRoll(visibility, { isAuthor, isGm })).toBe(expected);
  });

  it("recognises only the three visibility modes", () => {
    expect(isGameRollVisibility("GM")).toBe(true);
    expect(isGameRollVisibility("gm")).toBe(false);
  });
});

describe("secret rolls", () => {
  const viewers = { gm: { isAuthor: false, isGm: true }, otherPlayer: { isAuthor: false, isGm: false }, author: { isAuthor: true, isGm: false } };

  it("lets only the room gm and the author see that a secret roll happened", () => {
    expect(canSeeGameRoll("SECRET", viewers.gm)).toBe(true);
    expect(canSeeGameRoll("SECRET", viewers.author)).toBe(true);
    expect(canSeeGameRoll("SECRET", viewers.otherPlayer)).toBe(false);
  });

  it("keeps the old author-only visibility readable", () => {
    expect(canSeeGameRoll("SELF", viewers.author)).toBe(true);
    expect(canSeeGameRoll("SELF", viewers.gm)).toBe(false);
  });

  it("hides secret values from everyone except a gm", () => {
    expect(canSeeGameRollValues("SECRET", { isGm: false })).toBe(false);
    expect(canSeeGameRollValues("SECRET", { isGm: true })).toBe(true);
    expect(canSeeGameRollValues("GM", { isGm: false })).toBe(true);
    expect(isGameRollVisibility("SECRET")).toBe(true);
  });

  it("labels a secret roll by its dice formula only", () => {
    expect(buildSecretRollLabel({ groups: [{ sides: 20, values: [17] }] })).toBe("Секретний кидок · 1к20");
    expect(buildSecretRollLabel({ groups: [{ sides: 6, values: [2, 5] }, { sides: 8, values: [8] }] })).toBe("Секретний кидок · 2к6 + 1к8");
    expect(buildSecretRollLabel({ groups: [] })).toBe("Секретний кидок");
  });
});
