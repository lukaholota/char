import type { GameRoll, GameRollVisibility } from "@/rules/game-roll";
import type { GameRollEventView } from "@/server/db/game-roll-events";

export const GAME_ROLL_OUTBOX_KEY = "holota-game-roll-outbox";
const MAX_QUEUED = 50;
export const MAX_QUEUED_AGE_MS = 10 * 60_000;

export type QueuedGameRoll = {
  sessionId: number;
  queuedAt: number;
  draft: { idempotencyKey: string; visibility: GameRollVisibility; source: "CHARACTER" | "FREE"; persId: number | null; label: string; roll: GameRoll; rolledAt: string };
};

export type SendOutcome = { kind: "sent"; event: GameRollEventView } | { kind: "rejected"; status: number } | { kind: "retry" };

type FlushHandlers = {
  send: (item: QueuedGameRoll) => Promise<SendOutcome>;
  onSent: (item: QueuedGameRoll, event: GameRollEventView) => void;
  onDropped: (item: QueuedGameRoll, reason: "rejected" | "expired") => void;
  now: () => number;
};

export function readOutbox(storage: Storage): QueuedGameRoll[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(GAME_ROLL_OUTBOX_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as QueuedGameRoll[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(storage: Storage, items: QueuedGameRoll[]) {
  if (items.length) storage.setItem(GAME_ROLL_OUTBOX_KEY, JSON.stringify(items));
  else storage.removeItem(GAME_ROLL_OUTBOX_KEY);
}

export function enqueueGameRoll(storage: Storage, item: QueuedGameRoll) {
  writeOutbox(storage, [...readOutbox(storage), item].slice(-MAX_QUEUED));
}

/// Черга спільна для вкладок, тож дві вкладки можуть надіслати той самий кидок — сервер повертає вже записаний за ключем ідемпотентності.
export async function flushOutbox(storage: Storage, handlers: FlushHandlers): Promise<number> {
  for (const item of readOutbox(storage)) {
    const outcome = handlers.now() - item.queuedAt > MAX_QUEUED_AGE_MS ? ({ kind: "expired" } as const) : await handlers.send(item);
    if (outcome.kind === "retry") continue;
    removeQueued(storage, item.draft.idempotencyKey);
    if (outcome.kind === "sent") handlers.onSent(item, outcome.event);
    else handlers.onDropped(item, outcome.kind === "expired" ? "expired" : "rejected");
  }
  return readOutbox(storage).length;
}

function removeQueued(storage: Storage, idempotencyKey: string) {
  writeOutbox(storage, readOutbox(storage).filter((queued) => queued.draft.idempotencyKey !== idempotencyKey));
}

export async function sendQueuedGameRoll(item: QueuedGameRoll): Promise<SendOutcome> {
  try {
    const response = await fetch(`/api/game-sessions/${item.sessionId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.draft),
      cache: "no-store",
    });
    if (response.ok) return { kind: "sent", event: ((await response.json()) as { event: GameRollEventView }).event };
    return response.status === 429 || response.status === 401 || response.status >= 500 ? { kind: "retry" } : { kind: "rejected", status: response.status };
  } catch {
    return { kind: "retry" };
  }
}

export function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
