import { toast } from "sonner";
import { readHeroTargetPersId, readRollTargetCreatureId, readRollVisibility, useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { useSheetPersStore } from "@/lib/stores/sheetPersStore";
import type { DiceRollContext, TargetSaveRequest } from "@/lib/stores/diceUIStore";
import { buildSecretRollLabel, canSeeGameRollValues, type GameRollVisibility } from "@/rules/game-roll";
import type { RollTargetRef, RollTargets } from "@/rules/map-target-picks";
import { buildTargetSaveGameRoll, type GameRollPublication } from "./build-game-roll";
import { addGameEvents, addPendingRoll, dropPendingRoll, markMeRolling, stopMeRolling, useGameSessionLiveStore } from "./game-session-live-store";
import { playRollChime } from "./play-roll-chime";
import { clearRollVerdict, settleRollVerdict, watchRollVerdict } from "./roll-verdict";
import { createIdempotencyKey, enqueueGameRoll, flushOutbox, readOutbox, sendQueuedGameRoll, type QueuedGameRoll } from "./game-roll-outbox";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionMemberView } from "@/server/db/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";

export type GameRollTarget = { sessionId: number; visibility: GameRollVisibility; persId: number | null; creatureId: number | null; heroPersId?: number | null };

const RETRY_MS = 15_000;
let runningFlush: Promise<void> | null = null;

/// Ціль фіксується в момент натискання: поки кубики котяться, кімнату можуть змінити в іншій вкладці.
/// picked — ціль, обрана на мапі для цього кидка, — важить більше за закріплену; null — свідомо без цілі.
/// З листа бʼє гравець (будь-яку істоту чи героя), зі статблоку — лише майстер.
export function captureGameRollTarget(kind: "sheet" | "free" | "pool", picked?: RollTargetRef | null): GameRollTarget | null {
  const active = useGameSessionStore.getState().active;
  if (!active) return null;
  const persId = useSheetPersStore.getState().pers?.persId ?? null;
  if (kind === "sheet" && persId === null) return null;
  const canTarget = kind === "sheet" || (kind === "free" && useGameSessionLiveStore.getState().view?.myRole === "GM");
  const sticky = kind === "sheet" ? readStickyCreature(active.id) : readStickyHero(active.id);
  const aim = canTarget ? (picked === undefined ? sticky : picked) : null;
  return {
    sessionId: active.id,
    visibility: findMyRollVisibility(active.id),
    persId: kind === "sheet" ? persId : null,
    creatureId: aim && "creatureId" in aim ? aim.creatureId : null,
    heroPersId: aim && "persId" in aim ? aim.persId : null,
  };
}

function readStickyCreature(sessionId: number): RollTargetRef | null {
  const creatureId = readRollTargetCreatureId(sessionId);
  return creatureId === null ? null : { creatureId };
}

function readStickyHero(sessionId: number): RollTargetRef | null {
  const persId = readHeroTargetPersId(sessionId);
  return persId === null ? null : { persId };
}

/// «Лише майстру» для самого майстра — те саме, що «Лише мені»: результат він бачить.
function findMyRollVisibility(sessionId: number): GameRollVisibility {
  const visibility = readRollVisibility(sessionId);
  return visibility === "SECRET" && useGameSessionLiveStore.getState().view?.myRole === "GM" ? "GM" : visibility;
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

/// Без цілі ряткидка немає: сервер такий запис не прийме, тож кидок навіть не стає в чергу.
export function publishTargetSave(context: DiceRollContext, targetSave: TargetSaveRequest) {
  const target = captureGameRollTarget("free", context.rollTarget);
  const targets = target && (context.areaTargets ?? listSingleTarget(target));
  if (!target || !targets || targets.creatureIds.length + targets.persIds.length === 0) return void toast.info("Оберіть ціль ряткидка на мапі або в лотку");
  publishGameRoll(target, buildTargetSaveGameRoll(context, targetSave));
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
      ...buildRollTargets(target, publication),
    },
  };
  enqueueGameRoll(storage, item);
  showPendingRoll(item);
  if (item.draft.target || item.draft.heroTarget || item.draft.saves) watchRollVerdict(item.draft.idempotencyKey);
  else clearRollVerdict();
  void flushGameRollOutbox();
}

/// Лікування йде лише героєві: закріплена ціль-ворог його не отримує.
/// Шкода з ряткидком не знімається повністю: цілі (зона або обрана ціль) кидають ряткидок на сервері.
function buildRollTargets(target: GameRollTarget, publication: GameRollPublication): Pick<QueuedGameRoll["draft"], "target" | "saves" | "heroTarget"> {
  const { kind, save, areaTargets } = publication;
  if (save) {
    const targets = areaTargets ?? listSingleTarget(target);
    return targets.creatureIds.length + targets.persIds.length ? { target: null, saves: { ...targets, ...save } } : { target: null };
  }
  if (!kind) return { target: null };
  if (target.heroPersId) return { target: null, heroTarget: { persId: target.heroPersId, kind } };
  if (kind === "heal") return { target: null };
  return { target: target.creatureId !== null ? { creatureId: target.creatureId, kind } : null };
}

function listSingleTarget(target: GameRollTarget): RollTargets {
  return { creatureIds: target.creatureId !== null ? [target.creatureId] : [], persIds: target.heroPersId ? [target.heroPersId] : [] };
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
  const hasValues = canSeeGameRollValues(draft.visibility, { isGm: me.role === "GM" });
  const sheetPers = useSheetPersStore.getState().pers;
  const persName = draft.persId !== null && sheetPers?.persId === draft.persId ? sheetPers.name : me.persName;
  return { seq: 0, authorUserId: me.userId, authorName: me.name, persName, avatarUrl: me.avatarUrl, source: draft.source, visibility: draft.visibility, label: hasValues ? draft.label : buildSecretRollLabel(draft.roll), roll: hasValues ? draft.roll : null, total: hasValues ? draft.roll.total : null, rolledAt: draft.rolledAt, createdAt: draft.rolledAt, target: null, saves: null, heroTarget: null };
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
  settleRollVerdict(item.draft.idempotencyKey, event);
}

function reportDroppedRoll(item: QueuedGameRoll, reason: "rejected" | "expired") {
  dropPendingRoll(item.draft.idempotencyKey);
  clearRollVerdict(item.draft.idempotencyKey);
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
