import { findGameRollProblem, GAME_ROLL_LIMITS, isGameRollVisibility, type GameRoll } from "@/rules/game-roll";
import type { GameRollDraft } from "@/server/db/game-roll-events";

export const MAX_ROLL_BODY_BYTES = 8 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ROLL_AGE_MS = 24 * 60 * 60_000;

export function parseGameRollDraft(body: unknown, now = Date.now()): { draft: GameRollDraft } | { problem: string } {
  if (typeof body !== "object" || body === null) return { problem: "body is not an object" };
  const input = body as Record<string, unknown>;
  if (typeof input.idempotencyKey !== "string" || !UUID.test(input.idempotencyKey)) return { problem: "bad idempotency key" };
  if (!isGameRollVisibility(input.visibility)) return { problem: "bad visibility" };
  if (input.source !== "CHARACTER" && input.source !== "FREE") return { problem: "bad source" };
  if (input.persId !== null && !(Number.isInteger(input.persId) && (input.persId as number) > 0)) return { problem: "bad pers" };
  const label = typeof input.label === "string" ? input.label.trim() : "";
  if (!label || label.length > GAME_ROLL_LIMITS.label) return { problem: "bad label" };
  const rolledAt = typeof input.rolledAt === "string" ? new Date(input.rolledAt) : null;
  if (!rolledAt || Number.isNaN(rolledAt.getTime())) return { problem: "bad roll time" };
  const rollProblem = findGameRollProblem(input.roll);
  if (rollProblem) return { problem: rollProblem };
  return {
    draft: {
      idempotencyKey: input.idempotencyKey.toLowerCase(),
      visibility: input.visibility,
      source: input.source,
      persId: input.persId as number | null,
      label,
      roll: pickRollFields(input.roll as GameRoll),
      rolledAt: clampRollTime(rolledAt, now),
    },
  };
}

function clampRollTime(rolledAt: Date, now: number): Date {
  return new Date(Math.min(now, Math.max(now - MAX_ROLL_AGE_MS, rolledAt.getTime())));
}

function pickRollFields(roll: GameRoll): GameRoll {
  return {
    d20Mode: roll.d20Mode,
    modeSources: roll.modeSources,
    groups: roll.groups.map(({ sides, values }) => ({ sides, values })),
    extra: roll.extra.map(({ sides, sign, label, value }) => ({ sides, sign, label, value })),
    bonus: roll.bonus,
    total: roll.total,
    check: roll.check ? { dc: roll.check.dc, isSuccess: roll.check.isSuccess } : null,
  };
}
