import { describe, expect, it } from "vitest";
import { parseGameRollDraft } from "./parse-game-roll-draft";

const NOW = Date.parse("2026-11-02T15:17:00Z");
const draftBody = (clientTimes: { rolledAt: string; sentAt?: string }) => ({
  idempotencyKey: "0b8f2c4e-1d2a-4f3b-9c8d-7e6f5a4b3c2d",
  visibility: "PUBLIC",
  source: "FREE",
  persId: null,
  label: "1к20",
  roll: { groups: [{ sides: 20, values: [12] }], d20Mode: null, modeSources: [], extra: [], bonus: 0, total: 12, check: null },
  ...clientTimes,
});
const rolledAtOf = (result: ReturnType<typeof parseGameRollDraft>) => ("draft" in result ? result.draft.rolledAt.getTime() : null);

describe("час кидка", () => {
  it("годинник гравця, що відстає, не робить живий кидок «надісланим пізніше»", () => {
    const slowClock = NOW - 60_000;
    const body = draftBody({ rolledAt: new Date(slowClock - 200).toISOString(), sentAt: new Date(slowClock).toISOString() });
    expect(rolledAtOf(parseGameRollDraft(body, NOW))).toBe(NOW - 200);
  });

  it("кидок із черги лишається пізнім на стільки, скільки чекав у гравця", () => {
    const body = draftBody({ rolledAt: new Date(NOW - 5 * 60_000).toISOString(), sentAt: new Date(NOW).toISOString() });
    expect(rolledAtOf(parseGameRollDraft(body, NOW))).toBe(NOW - 5 * 60_000);
  });

  it("без часу надсилання бере час гравця, але не з майбутнього", () => {
    expect(rolledAtOf(parseGameRollDraft(draftBody({ rolledAt: new Date(NOW + 60_000).toISOString() }), NOW))).toBe(NOW);
  });
});

describe("ряткидки цілей", () => {
  const damage = { groups: [{ sides: 6, values: [4, 5] }], d20Mode: null, modeSources: [], extra: [], bonus: 0, total: 9, check: null };
  const saves = { creatureIds: [3, 4], spell: { engName: "Fireball", level: 3, ruleset: "RULES_2014" }, dc: 15 };
  const sheetBody = (extra: Record<string, unknown>) => ({ ...draftBody({ rolledAt: new Date(NOW).toISOString() }), source: "CHARACTER", persId: 5, label: "Вогняна куля · Шкода", roll: damage, ...extra });

  it("кладе ряткидки зони в кидок шкоди з листа", () => {
    const result = parseGameRollDraft(sheetBody({ saves }), NOW);
    expect("draft" in result && result.draft.saves).toMatchObject({ ...saves, persIds: [] });
  });

  it("шкода двох типів приходить двома групами кубиків — інакше не видно, де який тип", () => {
    const iceStorm = { ...saves, spell: { engName: "Ice Storm", level: 4, ruleset: "RULES_2014" } };
    const twoGroups = { ...damage, groups: [{ sides: 8, values: [5, 4] }, { sides: 6, values: [6, 3, 2, 4] }], total: 24 };
    const result = parseGameRollDraft(sheetBody({ saves: iceStorm, roll: twoGroups }), NOW);
    expect("draft" in result && result.draft.saves?.effect).toMatchObject({ damageType: "bludgeoning", secondDamageType: "cold" });
    expect(parseGameRollDraft(sheetBody({ saves: iceStorm }), NOW)).toEqual({ problem: "damage of two types needs two dice groups" });
  });

  it("відмовляє ряткидкам разом з ціллю, з вільного кидка, з к20 чи з зіпсованим записом", () => {
    expect(parseGameRollDraft(sheetBody({ saves, target: { creatureId: 3, kind: "damage" } }), NOW)).toEqual({ problem: "a roll has one kind of target" });
    expect(parseGameRollDraft(sheetBody({ saves, source: "FREE", persId: null }), NOW)).toEqual({ problem: "spell saves come from a sheet, action saves from a statblock" });
    expect(parseGameRollDraft(sheetBody({ saves: { ...saves, dc: "15" } }), NOW)).toEqual({ problem: "bad saves" });
    const d20 = { ...damage, groups: [{ sides: 20, values: [12] }], d20Mode: "NORMAL", total: 12 };
    expect("problem" in parseGameRollDraft(sheetBody({ saves, roll: d20 }), NOW)).toBe(true);
  });
});

describe("ціль-герой кидка зі статблоку", () => {
  const damage = { groups: [{ sides: 6, values: [4, 5] }], d20Mode: null, modeSources: [], extra: [], bonus: 0, total: 9, check: null };
  const creatureBody = (extra: Record<string, unknown>) => ({ ...draftBody({ rolledAt: new Date(NOW).toISOString() }), source: "FREE", persId: null, label: "Гоблін · Шкода", roll: damage, ...extra });

  it("кладе героя в кидок шкоди зі статблоку", () => {
    const result = parseGameRollDraft(creatureBody({ heroTarget: { persId: 5, kind: "damage" } }), NOW);
    expect("draft" in result && result.draft.heroTarget).toEqual({ persId: 5, kind: "damage" });
  });

  it("«Зцілення» без кубиків лікує героя числом", () => {
    const heal = { ...damage, groups: [], bonus: 70, total: 70 };
    const result = parseGameRollDraft(creatureBody({ source: "CHARACTER", persId: 4, label: "Зцілення · Лікування", roll: heal, heroTarget: { persId: 5, kind: "heal" } }), NOW);
    expect("draft" in result && result.draft).toMatchObject({ heroTarget: { persId: 5, kind: "heal" }, roll: { groups: [], total: 70 } });
  });

  it("приймає героя з листа (вогонь по своїх), відмовляє зіпсованому запису й шкоді на к20", () => {
    expect("draft" in parseGameRollDraft(creatureBody({ source: "CHARACTER", persId: 4, heroTarget: { persId: 5, kind: "damage" } }), NOW)).toBe(true);
    expect(parseGameRollDraft(creatureBody({ heroTarget: { persId: "5", kind: "damage" } }), NOW)).toEqual({ problem: "bad hero target" });
    const d20 = { ...damage, groups: [{ sides: 20, values: [12] }], d20Mode: "NORMAL", total: 12 };
    expect(parseGameRollDraft(creatureBody({ roll: d20, heroTarget: { persId: 5, kind: "damage" } }), NOW)).toEqual({ problem: "damage cannot be a d20 roll" });
    expect("draft" in parseGameRollDraft(creatureBody({ roll: d20, heroTarget: { persId: 5, kind: "attack" } }), NOW)).toBe(true);
  });
});
