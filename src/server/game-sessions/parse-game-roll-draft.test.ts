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
