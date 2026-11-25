import { describe, expect, it } from "vitest";
import { parseGameRollDraft } from "@/server/game-sessions/parse-game-roll-draft";

const now = Date.parse("2026-11-08T10:00:00Z");
const diceless = { d20Mode: null, modeSources: [], groups: [], extra: [], bonus: 0, total: 0, check: null };
const damageRoll = { ...diceless, groups: [{ sides: 6, values: [4] }], total: 4 };
const gaze = { creatureIds: [3], persIds: [], spell: null, effect: { ability: "WIS", damageType: null, isHalfOnSave: false, condition: "frightened" }, dc: 12 };

function buildBody(overrides: Record<string, unknown>) {
  return { idempotencyKey: "0b7c3c1e-1d2f-4a9b-8c3d-5e6f7a8b9c0d", visibility: "PUBLIC", source: "FREE", persId: null, label: "Погляд · Ряткидок", rolledAt: new Date(now).toISOString(), roll: diceless, saves: gaze, ...overrides };
}

describe("parseGameRollDraft: ряткидок цілі без шкоди", () => {
  it("приймає кидок без кубиків, коли ряткидок без шкоди", () => {
    const parsed = parseGameRollDraft(buildBody({}), now);
    expect(parsed).toMatchObject({ draft: { roll: { groups: [], total: 0 }, saves: { effect: { damageType: null, condition: "frightened" }, dc: 12 } } });
  });

  it("кидок без кубиків без такого ряткидка й ряткидок без шкоди з кубиками — відмова", () => {
    expect(parseGameRollDraft(buildBody({ saves: undefined }), now)).toEqual({ problem: "bad dice groups" });
    expect(parseGameRollDraft(buildBody({ saves: { ...gaze, effect: { ...gaze.effect, damageType: "fire" } } }), now)).toEqual({ problem: "bad dice groups" });
    expect(parseGameRollDraft(buildBody({ roll: damageRoll }), now)).toEqual({ problem: "bad dice groups" });
  });

  it("ряткидок дії статблоку — лише кидок без листа", () => {
    expect(parseGameRollDraft(buildBody({ source: "CHARACTER" }), now)).toMatchObject({ problem: expect.stringMatching(/statblock/) });
  });
});

describe("parseGameRollDraft: кидок зі статблоку своєї істоти", () => {
  it("несе id істоти лише з кидка без листа; без нього — null, кривий id — відмова", () => {
    const attack = { saves: undefined, roll: damageRoll, target: { creatureId: 9, kind: "damage" } };
    expect(parseGameRollDraft(buildBody({ ...attack, fromCreatureId: 4 }), now)).toMatchObject({ draft: { fromCreatureId: 4 } });
    expect(parseGameRollDraft(buildBody(attack), now)).toMatchObject({ draft: { fromCreatureId: null } });
    expect(parseGameRollDraft(buildBody({ ...attack, fromCreatureId: "4" }), now)).toEqual({ problem: "bad roller creature" });
    expect(parseGameRollDraft(buildBody({ ...attack, source: "CHARACTER", persId: 2, fromCreatureId: 4 }), now)).toEqual({ problem: "bad roller creature" });
  });

  it("заклинання з ряткидком зі статблоку приймається, як і з листа", () => {
    const fireball = { creatureIds: [], persIds: [7], spell: { engName: "Fireball", level: 3, ruleset: "RULES_2014" }, dc: 14 };
    const fromStatblock = parseGameRollDraft(buildBody({ roll: damageRoll, saves: fireball, fromCreatureId: 4 }), now);
    expect(fromStatblock).toMatchObject({ draft: { source: "FREE", fromCreatureId: 4, saves: { persIds: [7], spell: { engName: "Fireball" }, effect: { ability: "DEX", damageType: "fire" } } } });
    expect(parseGameRollDraft(buildBody({ roll: damageRoll, saves: fireball, source: "CHARACTER", persId: 2 }), now)).toMatchObject({ draft: { source: "CHARACTER" } });
  });
});
