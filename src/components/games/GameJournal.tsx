"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadOlderGameEvents, useGameSessionLiveStore, type GameConnectionStatus } from "@/lib/components/game/game-session-live-store";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import { GameRollEntry, GameRollingEntry } from "./GameRollEntry";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";

const BOTTOM_SLACK_PX = 48;

const STATUS_TEXT: Partial<Record<GameConnectionStatus, string>> = {
  connecting: "Підключаємося до кімнати…",
  reconnecting: "Звʼязок перервався — підключаємося знову",
  offline: "Немає мережі — кидки надійдуть, щойно вона зʼявиться",
  paused: "Журнал оновиться, щойно ви повернетеся",
  signed_out: "Сесія завершилася — увійдіть знову",
  lost: "Ви більше не в цій кімнаті",
};

export function GameJournal({ myUserId, className }: { myUserId: number | null; className?: string }) {
  const { events, status, hasOlder, isLoadingOlder, sessionId, view, rollingUserIds, pendingRolls, rollKeys } = useGameSessionLiveStore();
  const rollingMembers = view ? view.members.filter((member) => rollingUserIds.includes(member.userId)) : [];
  const { scrollRef, unseenCount, onScroll, scrollToBottom } = useStickToBottom(events, `${pendingRolls.length}-${rollingMembers.length}`);
  const liveSinceSeq = useLiveSinceSeq();
  const entries = [
    ...events.map((event) => ({ key: rollKeys[event.seq] ?? String(event.seq), event, isNew: liveSinceSeq !== null && event.seq > liveSinceSeq })),
    ...pendingRolls.map((pending) => ({ key: pending.key, event: pending.event, isNew: true })),
  ];

  return (
    <section aria-label="Журнал кидків" className={cn("relative flex min-h-0 flex-col", className)}>
      {STATUS_TEXT[status] ? <p className="px-3 py-1.5 text-xs text-slate-400" role="status">{STATUS_TEXT[status]}</p> : null}
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        {hasOlder && sessionId !== null ? (
          <button
            type="button"
            onClick={() => void loadOlderGameEvents(sessionId).catch(() => undefined)}
            disabled={isLoadingOlder}
            className="mx-auto my-2 flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-60"
          >
            {isLoadingOlder ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
            Показати раніші кидки
          </button>
        ) : null}
        {entries.length || rollingMembers.length ? (
          <ol className="space-y-2 pt-2">
            {entries.map(({ key, event, isNew }) => (
              <GameRollEntry key={key} event={event} isMine={event.authorUserId === myUserId} isNew={isNew} />
            ))}
            {rollingMembers.map((member) => (
              <GameRollingEntry key={`rolling-${member.userId}`} member={member} />
            ))}
          </ol>
        ) : status === "live" ? (
          <p className="px-2 py-6 text-center text-sm text-slate-400">Кидків ще немає. Кидайте з листа персонажа або вільними кубиками — їх побачать усі в кімнаті.</p>
        ) : null}
      </div>
      {unseenCount ? (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 flex min-h-10 -translate-x-1/2 items-center gap-1.5 rounded-lg border border-arcane-400/40 bg-slate-950/95 px-3 text-sm font-semibold text-arcane-100 shadow-lg"
        >
          <ArrowDown className="h-4 w-4" aria-hidden />
          Нові кидки: {unseenCount}
        </button>
      ) : null}
      <LatestRollAnnouncer events={events} />
    </section>
  );
}

export function GameSoundToggle() {
  const isSoundOn = useGameSessionStore((state) => state.isSoundOn);
  const toggleSound = () => {
    useGameSessionStore.getState().toggleSound();
    captureGameEvent("game_sound_toggled", { is_on: !isSoundOn });
  };
  const Icon = isSoundOn ? Volume2 : VolumeX;
  return (
    <button type="button" onClick={toggleSound} aria-pressed={!isSoundOn} aria-label="Без звуку нових кидків" title={isSoundOn ? "Вимкнути звук нових кидків" : "Увімкнути звук нових кидків"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

/// Анімуються лише кидки, що прийшли наживо: перша сторінка й старіші кидки зʼявляються одразу.
function useLiveSinceSeq(): number | null {
  const [seqAtMount] = useState(() => {
    const state = useGameSessionLiveStore.getState();
    return state.status === "live" ? (state.events.at(-1)?.seq ?? 0) : null;
  });
  const liveFromSeq = useGameSessionLiveStore((state) => state.liveFromSeq);
  return seqAtMount ?? liveFromSeq;
}

/// Новий кидок не смикає список, коли гравець гортає історію: тоді зʼявляється кнопка з лічильником.
function useStickToBottom(events: GameRollEventView[], tailKey: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const previousRef = useRef({ firstSeq: 0, lastSeq: 0, scrollHeight: 0 });
  const [unseenCount, setUnseenCount] = useState(0);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const previous = previousRef.current;
    const firstSeq = events[0]?.seq ?? 0;
    const lastSeq = events.at(-1)?.seq ?? 0;
    if (previous.firstSeq && firstSeq < previous.firstSeq) node.scrollTop += node.scrollHeight - previous.scrollHeight;
    if (lastSeq > previous.lastSeq) {
      if (isAtBottomRef.current || !previous.lastSeq) node.scrollTop = node.scrollHeight;
      else setUnseenCount((count) => count + events.filter((event) => event.seq > previous.lastSeq).length);
    }
    previousRef.current = { firstSeq, lastSeq, scrollHeight: node.scrollHeight };
  }, [events]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node && isAtBottomRef.current) node.scrollTop = node.scrollHeight;
  }, [tailKey]);

  /// На телефоні журнал — схована вкладка: поки висота нульова, прокрутка вниз не тримається.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (isAtBottomRef.current) node.scrollTop = node.scrollHeight;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    isAtBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < BOTTOM_SLACK_PX;
    if (isAtBottomRef.current) setUnseenCount(0);
  };

  const scrollToBottom = () => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
    isAtBottomRef.current = true;
    setUnseenCount(0);
  };

  return { scrollRef, unseenCount, onScroll, scrollToBottom };
}

function LatestRollAnnouncer({ events }: { events: GameRollEventView[] }) {
  const [text, setText] = useState("");
  const announcedSeqRef = useRef<number | null>(null);
  const latest = events.at(-1);
  useEffect(() => {
    if (!latest) return;
    if (announcedSeqRef.current !== null && latest.seq > announcedSeqRef.current) setText(`${latest.persName ?? latest.authorName}: ${latest.label} — ${latest.total ?? "результат прихований"}`);
    announcedSeqRef.current = Math.max(announcedSeqRef.current ?? 0, latest.seq);
  }, [latest]);
  return (
    <p className="sr-only" aria-live="polite">
      {text}
    </p>
  );
}
