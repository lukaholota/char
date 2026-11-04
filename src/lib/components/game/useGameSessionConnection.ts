"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import type { GameSessionView } from "@/server/db/game-sessions";
import { createSseParser, type SseMessage } from "./sse-parser";
import { addGameEvents, markMemberRolling, resetLiveSession, setConnectionStatus, setHasOlder, setSessionView, useGameSessionLiveStore, type GameConnectionStatus } from "./game-session-live-store";
import { flushGameRollOutbox } from "./game-roll-publisher";
import { isJournalPoppedOut, useJournalPopoutStore } from "./journal-popout";
import { playRollChime, unlockRollChimeOnFirstTap } from "./play-roll-chime";

const SILENCE_LIMIT_MS = 45_000;
const HIDDEN_GRACE_MS = 30_000;
const MAX_BACKOFF_MS = 30_000;

/// Одне зʼєднання на вкладку. Сховану вкладку відпускаємо, якщо журнал не винесено в окреме вікно: iOS однаково вбʼє сокет, а при поверненні курсор дожене пропущене.
export function useGameSessionConnection(sessionId: number | null) {
  useEffect(() => {
    resetLiveSession(sessionId);
    if (sessionId === null) return;
    const connection = startConnection(sessionId);
    return () => connection.stop();
  }, [sessionId]);
}

function startConnection(sessionId: number) {
  let cursor: number | null = null;
  let hasLoadedJournal = false;
  let attempt = 0;
  let isStopped = false;
  let abort: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;

  const setStatus = (status: GameConnectionStatus) => setConnectionStatus(sessionId, status);
  const isAsleep = () => document.visibilityState === "hidden" && !isJournalPoppedOut();

  const finish = (status: GameConnectionStatus) => {
    stopStream();
    isStopped = true;
    setStatus(status);
  };

  const stopStream = () => {
    clearTimeout(retryTimer);
    clearTimeout(silenceTimer);
    abort?.abort();
    abort = null;
  };

  const scheduleRetry = () => {
    stopStream();
    if (isStopped || isAsleep()) return;
    if (!navigator.onLine) return setStatus("offline");
    setStatus("reconnecting");
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt) * (0.5 + Math.random());
    attempt += 1;
    retryTimer = setTimeout(connect, delay);
  };

  const resetSilenceTimer = () => {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(scheduleRetry, SILENCE_LIMIT_MS);
  };

  const handleMessage = (message: SseMessage) => {
    const data = JSON.parse(message.data) as unknown;
    if (message.event === "roll") {
      const event = data as GameRollEventView;
      if (hasLoadedJournal && event.seq > (cursor ?? 0)) chimeForOthersRoll(event);
      addGameEvents(sessionId, [event]);
      cursor = Math.max(cursor ?? 0, event.seq);
    } else if (message.event === "rolling") {
      markMemberRolling(sessionId, (data as { userId: number }).userId);
    } else if (message.event === "session") {
      followSessionView(data as GameSessionView);
    } else if (message.event === "ready") {
      const ready = data as { hasOlder: boolean | null };
      if (ready.hasOlder !== null) setHasOlder(sessionId, ready.hasOlder);
      cursor ??= 0;
      hasLoadedJournal = true;
      attempt = 0;
      setStatus("live");
      void flushGameRollOutbox();
    } else if (message.event === "removed") {
      leaveRoom(sessionId, "Вас більше немає в цій кімнаті");
      finish("lost");
    }
  };

  const connect = async () => {
    stopStream();
    if (isStopped) return;
    const controller = new AbortController();
    abort = controller;
    setStatus(cursor === null ? "connecting" : "reconnecting");
    resetSilenceTimer();
    try {
      const response = await fetch(`/api/game-sessions/${sessionId}/stream${cursor === null ? "" : `?after=${cursor}`}`, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "text/event-stream" },
      });
      if (!response.ok || !response.body) return handleRefusal(response.status);
      await readStream(response.body, controller.signal);
      if (controller.signal.aborted || isStopped) return;
      attempt = 0;
      void connect();
    } catch {
      if (!controller.signal.aborted) scheduleRetry();
    }
  };

  const readStream = async (body: ReadableStream<Uint8Array>, signal: AbortSignal) => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const parse = createSseParser(handleMessage);
    signal.addEventListener("abort", () => void reader.cancel().catch(() => undefined));
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      resetSilenceTimer();
      parse(decoder.decode(value, { stream: true }));
    }
  };

  const handleRefusal = (status: number) => {
    if (status === 401) return finish("signed_out");
    if (status === 403 || status === 404 || status === 400) {
      leaveRoom(sessionId, "Кімната недоступна: вас вилучили або її видалено");
      return finish("lost");
    }
    scheduleRetry();
  };

  const resume = () => {
    clearTimeout(hiddenTimer);
    if (isStopped || isAsleep()) return;
    if (!abort) {
      attempt = 0;
      void connect();
    }
  };

  const onVisibilityChange = () => {
    if (!isAsleep()) return resume();
    clearTimeout(hiddenTimer);
    hiddenTimer = setTimeout(() => {
      stopStream();
      setStatus("paused");
    }, HIDDEN_GRACE_MS);
  };

  const onOffline = () => {
    stopStream();
    setStatus("offline");
  };

  window.addEventListener("online", resume);
  window.addEventListener("offline", onOffline);
  window.addEventListener("pageshow", resume);
  document.addEventListener("visibilitychange", onVisibilityChange);
  const stopPopoutWatch = useJournalPopoutStore.subscribe(onVisibilityChange);
  const stopChimeUnlock = unlockRollChimeOnFirstTap();
  void connect();

  return {
    stop() {
      isStopped = true;
      stopStream();
      clearTimeout(hiddenTimer);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopPopoutWatch();
      stopChimeUnlock();
    },
  };
}

function chimeForOthersRoll(event: GameRollEventView) {
  const myUserId = useGameSessionLiveStore.getState().view?.myUserId;
  if (event.authorUserId !== myUserId && useGameSessionStore.getState().isSoundOn) playRollChime();
}

function followSessionView(view: GameSessionView) {
  setSessionView(view);
  const store = useGameSessionStore.getState();
  if (store.active?.id !== view.id) return;
  if (view.isArchived) {
    store.deactivate(view.id);
    toast("Кімнату заархівовано — кидки знову лише у вас");
  } else store.rename(view.id, view.name);
}

function leaveRoom(sessionId: number, message: string) {
  const store = useGameSessionStore.getState();
  if (store.active?.id !== sessionId) return;
  store.deactivate(sessionId);
  toast.error(message);
}
