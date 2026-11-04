"use client";

import { Suspense, useEffect } from "react";
import { Archive, ChevronLeft, Crown, Dices, ScrollText } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { Button, buttonVariants } from "@/components/ui/button";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import type { BindablePers, GameSessionView } from "@/server/db/game-sessions";
import { cn } from "@/lib/utils";
import { GameJournal, GameSoundToggle } from "./GameJournal";
import { VisibilitySegments } from "./GameRollTargetBar";
import { GameRoomManagement } from "./GameRoomManagement";
import { GameRoomPersPicker } from "./GameRoomPersPicker";
import { GameRoomInvite, GameRoomMembers, ROOM_CARD } from "./GameRoomSidebar";
import { PopOutJournalButton } from "./GameSessionDock";
import { useGamesHref } from "./use-games-href";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";

export function GameRoomPage({ initialView, bindablePers }: { initialView: GameSessionView; bindablePers: Promise<BindablePers[]> }) {
  const view = useRoomView(initialView);
  const isLost = useGameSessionLiveStore((state) => state.sessionId === view.id && state.status === "lost");
  useViewedRoom(view.id);
  useRoomViewedEvent(view);
  const canInvite = view.myRole === "GM" && !view.isArchived;
  const isGmAlone = canInvite && view.members.length === 1;
  const gamesHref = useGamesHref();

  return (
    <div className="min-h-dvh w-full overflow-x-clip pb-28">
      <GameRoomHeader view={view} />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_20rem]">
        {isLost ? (
          <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100 md:col-span-2">
            Вас більше немає в цій кімнаті. <Link href={gamesHref("/games")} className="underline">До списку кімнат</Link>
          </p>
        ) : null}
        <div className="min-w-0 space-y-4">
          {isGmAlone ? <GameRoomInvite view={view} isProminent /> : null}
          <RollTargetCard view={view} />
          <section aria-label="Журнал кімнати" className="flex min-h-48 max-h-[min(36rem,65dvh)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
            <div className="flex items-center gap-2 border-b border-white/10 py-2 pl-4 pr-2">
              <h2 className="flex-1 font-rpg-display text-lg text-slate-100">Журнал кидків</h2>
              <GameSoundToggle />
              <PopOutJournalButton />
            </div>
            <GameJournal myUserId={view.myUserId} className="flex-1" />
          </section>
        </div>
        <aside className="min-w-0 space-y-4">
          <Suspense fallback={<div className="h-24 rounded-2xl border border-white/10 bg-slate-900/40" aria-hidden />}>
            <GameRoomPersPicker view={view} bindablePers={bindablePers} />
          </Suspense>
          <GameRoomMembers view={view} />
          {canInvite && !isGmAlone ? <GameRoomInvite view={view} /> : null}
          <GameRoomManagement view={view} />
        </aside>
      </main>
    </div>
  );
}

function useRoomView(initialView: GameSessionView): GameSessionView {
  const liveView = useGameSessionLiveStore((state) => (state.view?.id === initialView.id ? state.view : null));
  return liveView ?? initialView;
}

/// Поки сторінка відкрита, вкладка слухає саме цю кімнату — навіть архівну, куди кидки вже не йдуть.
function useViewedRoom(sessionId: number) {
  const viewRoom = useGameSessionStore((state) => state.viewRoom);
  useEffect(() => {
    viewRoom(sessionId);
    return () => viewRoom(null);
  }, [sessionId, viewRoom]);
}

function useRoomViewedEvent(view: GameSessionView) {
  const { id, myRole, members, isArchived, myPersId } = view;
  useEffect(() => {
    captureGameEvent("game_room_viewed", { role: myRole, member_count: members.length, is_archived: isArchived, has_pers: myPersId !== null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- одна подія на відкриття кімнати, а не на кожне оновлення складу
  }, [id]);
}

function GameRoomHeader({ view }: { view: GameSessionView }) {
  const gamesHref = useGamesHref();
  return (
    <div className="sticky top-safe z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href={gamesHref("/games")} aria-label="До списку кімнат" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-300 hover:bg-white/10">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Кімнати</span>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-rpg-display text-xl text-slate-50 sm:text-2xl">{view.name}</h1>
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            {view.myRole === "GM" ? <Crown className="h-3.5 w-3.5 text-arcane-300" aria-hidden /> : null}
            {view.myRole === "GM" ? "Ви майстер" : "Ви гравець"}
            {view.isArchived ? " · в архіві" : ""}
          </div>
        </div>
        {view.myPersId ? (
          <Link href={`/char/${view.myPersId}`} onClick={() => captureGameEvent("game_sheet_opened", { surface: "header" })} className={cn(buttonVariants({ variant: "outline" }), "h-11 shrink-0 gap-2 px-3")}>
            <ScrollText className="h-4 w-4" aria-hidden />
            <span className="sm:hidden">Лист</span>
            <span className="hidden sm:inline">Лист персонажа</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/// Куди підуть кидки — головне рішення на цій сторінці, тому воно зверху й завжди видиме.
function RollTargetCard({ view }: { view: GameSessionView }) {
  const active = useGameSessionStore((state) => state.active);
  const visibility = useGameSessionStore((state) => state.visibilityBySession[view.id] ?? "PUBLIC");
  const { activate, deactivate, setVisibility } = useGameSessionStore.getState();
  const openFreeDice = useDiceUIStore((state) => state.open);

  if (view.isArchived) {
    return (
      <div className={`${ROOM_CARD} flex items-center gap-3`}>
        <Archive className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
        <p className="text-sm text-slate-300">Кімната в архіві: журнал можна читати, але нові кидки сюди не надсилаються.</p>
      </div>
    );
  }
  if (active?.id !== view.id) {
    return (
      <section aria-labelledby="game-room-target" className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="space-y-1">
          <h2 id="game-room-target" className="font-rpg-display text-xl text-slate-50">Кидати в цю кімнату?</h2>
          <p className="text-sm text-slate-300">
            {active ? <>Зараз ваші кидки йдуть у кімнату «{active.name}».</> : "Зараз ваші кидки бачите лише ви."} Увімкніть, і кидки з листа персонажа й вільних кубиків зʼявлятимуться в журналі нижче.
          </p>
        </div>
        <Button type="button" size="lg" onClick={() => {
          activate({ id: view.id, name: view.name });
          captureGameEvent("game_roll_target_changed", { is_on: true });
        }} className="h-12 w-full gap-2 px-6 text-base sm:w-auto">
          <Dices className="h-5 w-5" aria-hidden />
          Кидати в цю кімнату
        </Button>
      </section>
    );
  }
  return (
    <section aria-labelledby="game-room-target" className="space-y-4 rounded-2xl border border-arcane-400/30 bg-arcane-500/5 p-5">
      <div className="space-y-1">
        <h2 id="game-room-target" className="flex items-center gap-2 text-base font-semibold text-arcane-50">
          <span className="h-2 w-2 shrink-0 rounded-full bg-arcane-300" aria-hidden />
          Ваші кидки йдуть у цю кімнату
        </h2>
        <p className="text-sm text-slate-400">З листа персонажа й вільних кубиків.</p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-200">Хто побачить кидок</p>
        <VisibilitySegments value={visibility} onChange={(next) => {
          setVisibility(view.id, next);
          captureGameEvent("game_roll_visibility_changed", { visibility: next, surface: "room" });
        }} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="lg" variant="outline" onClick={openFreeDice} className="h-12 gap-2 text-base sm:flex-1">
          <Dices className="h-5 w-5" aria-hidden />
          Кинути вільні кубики
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={() => {
          deactivate(view.id);
          captureGameEvent("game_roll_target_changed", { is_on: false });
        }} className="h-12 text-base text-slate-300">
          Не кидати сюди
        </Button>
      </div>
    </section>
  );
}
