import { create } from "zustand";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionView } from "@/server/db/game-sessions";

export type GameConnectionStatus = "idle" | "connecting" | "live" | "reconnecting" | "paused" | "offline" | "signed_out" | "lost";

type LiveState = {
  sessionId: number | null;
  status: GameConnectionStatus;
  view: GameSessionView | null;
  events: GameRollEventView[];
  hasOlder: boolean;
  isLoadingOlder: boolean;
  rollingUserIds: number[];
  liveFromSeq: number | null;
  pendingRolls: PendingGameRoll[];
  rollKeys: Record<number, string>;
};

export type PendingGameRoll = { key: string; event: GameRollEventView };

const ROLLING_TIMEOUT_MS = 8000;
const EMPTY: Omit<LiveState, "sessionId"> = { status: "idle", view: null, events: [], hasOlder: false, isLoadingOlder: false, rollingUserIds: [], liveFromSeq: null, pendingRolls: [], rollKeys: {} };
const rollingTimers = new Map<number, ReturnType<typeof setTimeout>>();

export const useGameSessionLiveStore = create<LiveState>(() => ({ sessionId: null, ...EMPTY }));

export function resetLiveSession(sessionId: number | null) {
  rollingTimers.forEach(clearTimeout);
  rollingTimers.clear();
  useGameSessionLiveStore.setState({ sessionId, ...EMPTY });
}

/// Результат міг загубитися (кубики скинули, вкладку закрили) — тоді «кидає…» саме згасає.
export function markMemberRolling(sessionId: number, userId: number) {
  const state = useGameSessionLiveStore.getState();
  if (state.sessionId !== sessionId) return;
  clearTimeout(rollingTimers.get(userId));
  rollingTimers.set(userId, setTimeout(() => stopMembersRolling([userId]), ROLLING_TIMEOUT_MS));
  if (!state.rollingUserIds.includes(userId)) useGameSessionLiveStore.setState({ rollingUserIds: [...state.rollingUserIds, userId] });
}

export function markMeRolling(sessionId: number) {
  const myUserId = useGameSessionLiveStore.getState().view?.myUserId;
  if (myUserId) markMemberRolling(sessionId, myUserId);
}

export function stopMeRolling(sessionId: number) {
  const state = useGameSessionLiveStore.getState();
  if (state.sessionId === sessionId && state.view) stopMembersRolling([state.view.myUserId]);
}

/// Свій кидок видно в журналі одразу, як осіли кубики; відповідь сервера лише замінює його справжнім.
export function addPendingRoll(sessionId: number, pending: PendingGameRoll) {
  const state = useGameSessionLiveStore.getState();
  if (state.sessionId !== sessionId) return;
  useGameSessionLiveStore.setState({ pendingRolls: [...state.pendingRolls, pending] });
  stopMeRolling(sessionId);
}

export function dropPendingRoll(key: string) {
  const { pendingRolls } = useGameSessionLiveStore.getState();
  if (pendingRolls.some((pending) => pending.key === key)) useGameSessionLiveStore.setState({ pendingRolls: pendingRolls.filter((pending) => pending.key !== key) });
}

function stopMembersRolling(userIds: readonly number[]) {
  for (const userId of userIds) {
    clearTimeout(rollingTimers.get(userId));
    rollingTimers.delete(userId);
  }
  const { rollingUserIds } = useGameSessionLiveStore.getState();
  const left = rollingUserIds.filter((userId) => !userIds.includes(userId));
  if (left.length !== rollingUserIds.length) useGameSessionLiveStore.setState({ rollingUserIds: left });
}

export function setConnectionStatus(sessionId: number, status: GameConnectionStatus) {
  const state = useGameSessionLiveStore.getState();
  if (state.sessionId !== sessionId) return;
  const liveFromSeq = state.liveFromSeq ?? (status === "live" ? (state.events.at(-1)?.seq ?? 0) : null);
  useGameSessionLiveStore.setState({ status, liveFromSeq });
}

export function setSessionView(view: GameSessionView) {
  if (useGameSessionLiveStore.getState().sessionId === view.id) useGameSessionLiveStore.setState({ view });
}

export function setHasOlder(sessionId: number, hasOlder: boolean) {
  if (useGameSessionLiveStore.getState().sessionId === sessionId) useGameSessionLiveStore.setState({ hasOlder });
}

export function addGameEvents(sessionId: number, incoming: readonly GameRollEventView[]) {
  const state = useGameSessionLiveStore.getState();
  if (state.sessionId !== sessionId || !incoming.length) return;
  useGameSessionLiveStore.setState({ events: mergeBySeq(state.events, incoming), ...matchPendingRolls(state, incoming) });
  stopMembersRolling(incoming.flatMap((event) => event.authorUserId ?? []));
}

/// Потік може принести свій кидок раніше за відповідь на POST, тож справжній кидок шукаємо за міткою й сумою, а не за ключем.
function matchPendingRolls(state: LiveState, incoming: readonly GameRollEventView[]): Pick<LiveState, "pendingRolls" | "rollKeys"> {
  let pendingRolls = state.pendingRolls;
  const rollKeys = { ...state.rollKeys };
  for (const event of incoming) {
    if (event.authorUserId !== state.view?.myUserId || rollKeys[event.seq]) continue;
    const match = pendingRolls.find((pending) => pending.event.label === event.label && pending.event.total === event.total);
    if (!match) continue;
    rollKeys[event.seq] = match.key;
    pendingRolls = pendingRolls.filter((pending) => pending !== match);
  }
  return { pendingRolls, rollKeys };
}

/// Події приходять і з потоку, і з відповіді на власний кидок, і зі старших сторінок — порядок тримає лише seq.
export function mergeBySeq(current: readonly GameRollEventView[], incoming: readonly GameRollEventView[]): GameRollEventView[] {
  const bySeq = new Map(current.map((event) => [event.seq, event]));
  for (const event of incoming) bySeq.set(event.seq, event);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

export async function loadOlderGameEvents(sessionId: number) {
  const state = useGameSessionLiveStore.getState();
  if (state.sessionId !== sessionId || state.isLoadingOlder || !state.hasOlder) return;
  useGameSessionLiveStore.setState({ isLoadingOlder: true });
  try {
    const before = state.events[0]?.seq;
    const response = await fetch(`/api/game-sessions/${sessionId}/events${before ? `?before=${before}` : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`older events ${response.status}`);
    const page = (await response.json()) as { events: GameRollEventView[]; hasOlder: boolean };
    addGameEvents(sessionId, page.events);
    setHasOlder(sessionId, page.hasOlder);
  } finally {
    if (useGameSessionLiveStore.getState().sessionId === sessionId) useGameSessionLiveStore.setState({ isLoadingOlder: false });
  }
}
