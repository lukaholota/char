import { toast } from "sonner";
import { readRollVisibility, useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { useSheetPersStore } from "@/lib/stores/sheetPersStore";
import type { GameRollVisibility } from "@/rules/game-roll";
import type { GameRollPublication } from "./build-game-roll";
import { addGameEvents, addPendingRoll, dropPendingRoll, markMeRolling, stopMeRolling, useGameSessionLiveStore } from "./game-session-live-store";
import { playRollChime } from "./play-roll-chime";
import { createIdempotencyKey, enqueueGameRoll, flushOutbox, readOutbox, sendQueuedGameRoll, type QueuedGameRoll } from "./game-roll-outbox";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionMemberView } from "@/server/db/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";

export type GameRollTarget = { sessionId: number; visibility: GameRollVisibility; persId: number | null };

const RETRY_MS = 15_000;
let runningFlush: Promise<void> | null = null;

/// Ціль фіксується в момент натискання: поки кубики котяться, кімнату можуть змінити в іншій вкладці.
export function captureGameRollTarget(kind: "sheet" | "free"): GameRollTarget | null {
  const active = useGameSessionStore.getState().active;
  if (!active) return null;
  const persId = useSheetPersStore.getState().pers?.persId ?? null;
  if (kind === "sheet" && persId === null) return null;
  return { sessionId: active.id, visibility: readRollVisibility(active.id), persId: kind === "sheet" ? persId : null };
}

/// Кімната бачить «кидає…», поки кубики ще котяться; загублений сигнал нічого не ламає, тож без черги й повторів.
export function announceGameRollStart(target: GameRollTarget) {
  markMeRolling(target.sessionId);
  if (target.visibility === "SELF" || (typeof navigator !== "undefined" && !navigator.onLine)) return;
  void fetch(`/api/game-sessions/${target.sessionId}/rolling`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility: target.visibility }),
    keepalive: true,
  }).catch(() => undefined);
}

export function settleGameRollStart(target: GameRollTarget) {
  stopMeRolling(target.sessionId);
}

export function publishGameRoll(target: GameRollTarget, publication: GameRollPublication) {
  const storage = findStorage();
  if (!storage) return settleGameRollStart(target);
  const item: QueuedGameRoll = {
    sessionId: target.sessionId,
    queuedAt: Date.now(),
    draft: {
      idempotencyKey: createIdempotencyKey(),
      visibility: target.visibility,
      source: publication.isFromSheet ? "CHARACTER" : "FREE",
      persId: publication.isFromSheet ? target.persId : null,
      label: publication.label,
      roll: publication.roll,
      rolledAt: new Date().toISOString(),
    },
  };
  enqueueGameRoll(storage, item);
  showPendingRoll(item);
  void flushGameRollOutbox();
}

function showPendingRoll(item: QueuedGameRoll) {
  const view = useGameSessionLiveStore.getState().view;
  const me = view?.members.find((member) => member.userId === view.myUserId);
  if (!view || view.id !== item.sessionId || !me) return;
  addPendingRoll(item.sessionId, { key: item.draft.idempotencyKey, event: buildPendingEvent(item, me) });
  if (useGameSessionStore.getState().isSoundOn) playRollChime();
}

/// Підпис той самий, що поставить сервер: персонаж з листа, інакше привʼязаний до кімнати.
function buildPendingEvent({ draft }: QueuedGameRoll, me: GameSessionMemberView): GameRollEventView {
  const sheetPers = useSheetPersStore.getState().pers;
  const persName = draft.persId !== null && sheetPers?.persId === draft.persId ? sheetPers.name : me.persName;
  return { seq: 0, authorUserId: me.userId, authorName: me.name, persName, avatarUrl: me.avatarUrl, source: draft.source, visibility: draft.visibility, label: draft.label, roll: draft.roll, total: draft.roll.total, rolledAt: draft.rolledAt, createdAt: draft.rolledAt };
}

export function flushGameRollOutbox(): Promise<void> {
  const storage = findStorage();
  if (!storage) return Promise.resolve();
  runningFlush ??= flushOutbox(storage, { send: sendQueuedGameRoll, onSent: showSentRoll, onDropped: reportDroppedRoll, now: Date.now })
    .then(() => undefined)
    .finally(() => {
      runningFlush = null;
    });
  return runningFlush;
}

export function retryGameRollOutbox(): () => void {
  const retry = () => {
    const storage = findStorage();
    if (storage && readOutbox(storage).length) void flushGameRollOutbox();
  };
  retry();
  const timer = setInterval(retry, RETRY_MS);
  window.addEventListener("online", retry);
  return () => {
    clearInterval(timer);
    window.removeEventListener("online", retry);
  };
}

function showSentRoll(item: QueuedGameRoll, event: Parameters<typeof addGameEvents>[1][number]) {
  addGameEvents(item.sessionId, [event]);
}

function reportDroppedRoll(item: QueuedGameRoll, reason: "rejected" | "expired") {
  dropPendingRoll(item.draft.idempotencyKey);
  captureGameEvent("game_roll_dropped", { reason });
  toast.error(reason === "expired" ? `Кидок «${item.draft.label}» не дійшов до кімнати — звʼязку не було 10 хвилин` : `Кімната не прийняла кидок «${item.draft.label}»`);
}

function findStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
