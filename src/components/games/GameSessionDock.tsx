"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, PictureInPicture2, ScrollText, X } from "lucide-react";
import { toast } from "sonner";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { retryGameRollOutbox } from "@/lib/components/game/game-roll-publisher";
import { canPopOutJournal, closeJournalPopout, popOutJournal, useJournalPopoutStore } from "@/lib/components/game/journal-popout";
import { useGameSessionLiveStore, type GameConnectionStatus } from "@/lib/components/game/game-session-live-store";
import { useGameSessionConnection } from "@/lib/components/game/useGameSessionConnection";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { cn } from "@/lib/utils";
import { GameJournal, GameSoundToggle } from "./GameJournal";
import { VisibilityPicker } from "./GameRollTargetBar";
import { useGamesHref } from "./use-games-href";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";

const PHONE_SHEET =
  "top-auto bottom-0 left-0 flex h-[70dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-b-none border-x-0 border-b-0 bg-slate-950 bg-none p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-none";

/// Кімнату слухає лише ця вкладка й лише одна: сторінка кімнати має перевагу над активною, щоб архів читався без кидків туди.
export function GameSessionDock() {
  const active = useGameSessionStore((state) => state.active);
  const viewedRoomId = useGameSessionStore((state) => state.viewedRoomId);
  const isTrayOpen = useDiceUIStore((state) => state.isOpen);
  const isDesktop = useMediaQuery("md");
  const [isOpen, setIsOpen] = useState(false);
  const myUserId = useGameSessionLiveStore((state) => state.view?.myUserId ?? null);
  const popout = useJournalPopoutStore((state) => state.popout);
  const roomId = viewedRoomId ?? active?.id ?? null;
  useGameSessionConnection(roomId);
  useEffect(() => retryGameRollOutbox(), []);
  useEffect(() => {
    if (roomId === null) closeJournalPopout();
  }, [roomId]);

  if (popout) return createPortal(<PopoutJournal myUserId={myUserId} />, popout.document.body);
  if (!active || viewedRoomId !== null) return null;
  if (isDesktop) return <DesktopDock isOpen={isOpen} onOpenChange={setIsOpen} />;
  return (
    <>
      {isTrayOpen ? null : <DockButton isOpen={isOpen} onOpen={() => {
        setIsOpen(true);
        captureGameEvent("game_journal_opened", { surface: "phone" });
      }} />}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={PHONE_SHEET} data-safe-dialog={undefined} showClose={false}>
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20" aria-hidden />
          <DockHeader onClose={() => setIsOpen(false)} />
          <GameJournal myUserId={myUserId} className="flex-1" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DockButton({ isOpen, onOpen }: { isOpen: boolean; onOpen: () => void }) {
  const status = useGameSessionLiveStore((state) => state.status);
  const unseen = useUnseenSinceClosed(isOpen);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Журнал кімнати${unseen ? `, нових кидків: ${unseen}` : ""}`}
      className={cn(
        "fixed right-3 z-[65] flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-slate-100 shadow-xl shadow-black/50",
        "bottom-[calc(72px+env(safe-area-inset-bottom))] [body:has([data-safe-sheet-tabs])_&]:bottom-[calc(136px+env(safe-area-inset-bottom))]",
      )}
    >
      <StatusDot status={status} />
      <ScrollText className="h-4 w-4 text-arcane-300" aria-hidden />
      Журнал
      {unseen ? <span className="rounded-md bg-arcane-500/25 px-1.5 text-xs tabular-nums text-arcane-100">{unseen}</span> : null}
    </button>
  );
}

function DesktopDock({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  const status = useGameSessionLiveStore((state) => state.status);
  const myUserId = useGameSessionLiveStore((state) => state.view?.myUserId ?? null);
  const unseen = useUnseenSinceClosed(isOpen);
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          onOpenChange(true);
          captureGameEvent("game_journal_opened", { surface: "desktop" });
        }}
        className="fixed bottom-6 left-[104px] z-[65] flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-slate-100 shadow-xl shadow-black/50 hover:bg-slate-900"
      >
        <StatusDot status={status} />
        <ScrollText className="h-4 w-4 text-arcane-300" aria-hidden />
        Журнал кімнати
        {unseen ? <span className="rounded-md bg-arcane-500/25 px-1.5 text-xs tabular-nums text-arcane-100">{unseen}</span> : null}
      </button>
    );
  }
  return (
    <aside aria-label="Журнал кімнати" className="fixed bottom-6 left-[104px] z-[65] flex h-[min(36rem,70dvh)] w-[24rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50">
      <DockHeader onClose={() => onOpenChange(false)} isCollapse />
      <GameJournal myUserId={myUserId} className="flex-1" />
    </aside>
  );
}

/// Журнал у вікні поверх гри: без кнопок закриття, бо в такого вікна є власне.
function PopoutJournal({ myUserId }: { myUserId: number | null }) {
  const name = useGameSessionLiveStore((state) => state.view?.name ?? "");
  const status = useGameSessionLiveStore((state) => state.status);
  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <div className="shrink-0 space-y-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <h1 className="min-w-0 flex-1 truncate font-rpg-display text-lg text-slate-50">{name}</h1>
          <GameSoundToggle />
        </div>
        <RollVisibilityRow surface="popout" />
      </div>
      <GameJournal myUserId={myUserId} className="min-h-0 flex-1" />
    </div>
  );
}

const subscribeToNothing = () => () => undefined;

export function PopOutJournalButton({ onPopOut }: { onPopOut?: () => void }) {
  const canPopOut = useSyncExternalStore(subscribeToNothing, canPopOutJournal, () => false);
  if (!canPopOut) return null;
  const popOut = () =>
    popOutJournal().then(
      () => {
        onPopOut?.();
        captureGameEvent("game_journal_opened", { surface: "popout" });
      },
      () => toast.error("Не вдалося відкрити окреме вікно"),
    );
  return (
    <button type="button" onClick={() => void popOut()} aria-label="Винести журнал в окреме вікно" title="Журнал в окремому вікні поверх гри — його можна зробити вузьким" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white">
      <PictureInPicture2 className="h-5 w-5" aria-hidden />
    </button>
  );
}

function RollVisibilityRow({ surface }: { surface: "dock" | "popout" }) {
  const active = useGameSessionStore((state) => state.active);
  const visibility = useGameSessionStore((state) => (state.active ? state.visibilityBySession[state.active.id] ?? "PUBLIC" : "PUBLIC"));
  const setVisibility = useGameSessionStore((state) => state.setVisibility);
  if (!active) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-400">Мої кидки бачать:</span>
      <VisibilityPicker value={visibility} onChange={(next) => {
        setVisibility(active.id, next);
        captureGameEvent("game_roll_visibility_changed", { visibility: next, surface });
      }} />
    </div>
  );
}

function DockHeader({ onClose, isCollapse = false }: { onClose: () => void; isCollapse?: boolean }) {
  const active = useGameSessionStore((state) => state.active);
  const gamesHref = useGamesHref();
  if (!active) return null;
  const Icon = isCollapse ? ChevronDown : X;
  return (
    <div className="shrink-0 space-y-2 border-b border-white/10 px-3 py-2">
      <div className="flex items-center gap-2">
        {isCollapse ? (
          <h2 className="min-w-0 flex-1 truncate font-rpg-display text-lg text-slate-50">{active.name}</h2>
        ) : (
          <DialogTitle className="min-w-0 flex-1 truncate font-rpg-display text-lg text-slate-50">{active.name}</DialogTitle>
        )}
        {isCollapse ? null : <DialogDescription className="sr-only">Спільний журнал кидків кімнати</DialogDescription>}
        <GameSoundToggle />
        <PopOutJournalButton onPopOut={onClose} />
        <Link href={gamesHref(`/games/${active.id}`)} onClick={onClose} className="flex min-h-10 items-center rounded-lg px-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
          Кімната
        </Link>
        <button type="button" onClick={onClose} aria-label={isCollapse ? "Згорнути журнал" : "Закрити журнал"} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white">
          <Icon className="h-5 w-5" />
        </button>
      </div>
      <RollVisibilityRow surface="dock" />
    </div>
  );
}

function StatusDot({ status }: { status: GameConnectionStatus }) {
  const isLive = status === "live";
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", isLive ? "bg-emerald-400" : "bg-slate-500")} title={isLive ? "Наживо" : "Немає звʼязку з кімнатою"} aria-hidden />;
}

/// Лічильник на згорнутій кнопці: скільки чужих кидків прийшло, поки журнал був закритий.
function useUnseenSinceClosed(isOpen: boolean): number {
  const status = useGameSessionLiveStore((state) => state.status);
  const lastSeq = useGameSessionLiveStore((state) => state.events.at(-1)?.seq ?? 0);
  const [seenSeq, setSeenSeq] = useState<number | null>(null);
  useEffect(() => {
    if (isOpen || (seenSeq === null && status === "live")) setSeenSeq(lastSeq);
  }, [isOpen, lastSeq, seenSeq, status]);
  return useGameSessionLiveStore((state) => (seenSeq === null ? 0 : state.events.filter((event) => event.seq > seenSeq && event.authorUserId !== state.view?.myUserId).length));
}
