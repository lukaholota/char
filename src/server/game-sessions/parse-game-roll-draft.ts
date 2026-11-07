import { findGameRollProblem, GAME_ROLL_LIMITS, isGameRollVisibility, type GameRoll } from "@/rules/game-roll";
import { parseGameRollHeroTarget } from "@/rules/game-roll-hero-target";
import { parseGameRollSaves } from "@/rules/game-roll-saves";
import { findGameRollTargetProblem, parseGameRollTarget } from "@/rules/game-roll-target";
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
  const target = parseGameRollTarget(input.target);
  if (target === undefined) return { problem: "bad target" };
  const saves = parseGameRollSaves(input.saves);
  if (saves === undefined) return { problem: "bad saves" };
  const heroTarget = parseGameRollHeroTarget(input.heroTarget);
  if (heroTarget === undefined) return { problem: "bad hero target" };
  if ([target, saves, heroTarget].filter(Boolean).length > 1) return { problem: "a roll has one kind of target" };
  if (saves && (saves.spell ? input.source !== "CHARACTER" : input.source !== "FREE")) return { problem: "spell saves come from a sheet, action saves from a statblock" };
  const kind = target?.kind ?? heroTarget?.kind ?? (saves ? "damage" : null);
  const targetProblem = kind ? findGameRollTargetProblem(input.roll as GameRoll, kind) : null;
  if (targetProblem) return { problem: targetProblem };
  return {
    draft: {
      idempotencyKey: input.idempotencyKey.toLowerCase(),
      visibility: input.visibility,
      source: input.source,
      persId: input.persId as number | null,
      label,
      roll: pickRollFields(input.roll as GameRoll),
      rolledAt: alignRollTime(rolledAt, readClientTime(input.sentAt), now),
      target,
      saves,
      heroTarget,
    },
  };
}

function readClientTime(value: unknown): number | null {
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isNaN(time) ? null : time;
}

/// Годинник гравця може відставати на хвилини: беремо лише те, скільки кидок чекав за тим самим годинником.
function alignRollTime(rolledAt: Date, sentAt: number | null, now: number): Date {
  const waited = sentAt === null ? now - rolledAt.getTime() : sentAt - rolledAt.getTime();
  return new Date(now - Math.min(MAX_ROLL_AGE_MS, Math.max(0, waited)));
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
