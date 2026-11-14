"use client";

import { findRoomPeople } from "@/rules/game-room-heroes";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Crown } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { cn } from "@/lib/utils";
import type { BindablePers, GameSessionView } from "@/server/db/game-sessions";
import { CombatTracker, useShownCombat } from "./CombatTracker";
import { CombatTurnProvider } from "./combat-turn";
import { GameRoomMap, SceneSwitch } from "./GameRoomMap";
import { useUnseenSinceClosed } from "./GameSessionDock";
import { HeroPanelContent, JournalPanelContent, RoomPanel, RoomPanelContent, RoomTabBar } from "./RoomPanels";
import { RollTargetSwitch } from "./RoomRollTarget";
import { findSideTab, findWideSideTab, resetRoomTabs, showRoomTab, ToolPanelSlotContext, useRoomTabStore, type RoomSideTab, type RoomTab } from "./room-tabs";
import { useGamesHref } from "./use-games-href";

type GameRoomPageProps = { initialView: GameSessionView; bindablePers: Promise<BindablePers[]>; heroSheet: ReactNode; shownHeroPersId: number | null };

export function GameRoomPage({ initialView, bindablePers, heroSheet, shownHeroPersId }: GameRoomPageProps) {
  const view = useRoomView(initialView);
  const combat = useShownCombat(view);
  const hasHeroTab = view.myRole === "PLAYER" || view.myPersId !== null || shownHeroPersId !== null;
  const shown = useShownTabs(hasHeroTab);
  const unseen = useUnseenSinceClosed(shown.isJournalShown);
  const [toolPanelSlot, setToolPanelSlot] = useState<HTMLElement | null>(null);
  useViewedRoom(view.id);
  useRoomViewedEvent(view);
  useRoomTabsReset(view);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <GameRoomHeader view={view} />
      <LostRoomAlert sessionId={view.id} />
      <RoomTabBar tabs={hasHeroTab ? ["map", "hero", "journal", "room"] : ["map", "journal", "room"]} current={shown.tab} unseen={unseen} label="Розділи кімнати" className="lg:hidden" />
      <div className={cn("min-h-0 flex-1 lg:grid lg:grid-rows-[auto_minmax(0,1fr)]", shown.isSideFolded ? "lg:grid-cols-[minmax(0,1fr)_3.75rem]" : "lg:grid-cols-[minmax(0,1fr)_26rem] min-[1700px]:grid-cols-[minmax(0,1fr)_24rem_26rem]")}>
        <RoomPanel tab="map" className={cn(shown.tab === "map" ? "flex" : "hidden", "h-full lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex")}>
          <CombatTurnProvider combat={combat}>
            <ToolPanelSlotContext.Provider value={shown.isLarge && !shown.isSideFolded ? toolPanelSlot : null}>
              <GameRoomMap view={view} />
            </ToolPanelSlotContext.Provider>
          </CombatTurnProvider>
        </RoomPanel>
        <RoomTabBar
          tabs={hasHeroTab ? ["hero", "journal", "room"] : ["journal", "room"]}
          current={shown.sideBarTab}
          unseen={unseen}
          label="Бічна панель"
          wideHiddenTab={shown.isSideFolded ? undefined : "journal"}
          isFolded={shown.isSideFolded}
          canFold
          className={cn("hidden border-l lg:col-start-2 lg:row-start-1 lg:flex", shown.isSideFolded ? "lg:row-span-2" : "min-[1700px]:col-start-3")}
        />
        <RoomPanel tab="journal" className={cn(SIDE_PANEL, findSideClasses("journal", shown), "min-[1700px]:col-start-2 min-[1700px]:row-span-2 min-[1700px]:row-start-1")}>
          <JournalPanelContent view={view} />
        </RoomPanel>
        {hasHeroTab ? (
          <RoomPanel tab="hero" className={cn(SIDE_PANEL, findSideClasses("hero", shown), "min-[1700px]:col-start-3")}>
            <HeroPanelContent view={view} heroSheet={heroSheet} shownHeroPersId={shownHeroPersId} bindablePers={bindablePers} isShown={shown.isHeroShown} />
          </RoomPanel>
        ) : null}
        <RoomPanel tab="room" className={cn(SIDE_PANEL, findSideClasses("room", shown), "min-[1700px]:col-start-3")}>
          <RoomPanelContent view={view} bindablePers={bindablePers} />
        </RoomPanel>
        <div ref={setToolPanelSlot} className="relative z-20 hidden h-full min-h-0 overflow-y-auto overscroll-contain border-l border-white/10 bg-slate-950 p-2 lg:col-start-2 lg:row-start-2 lg:[&:not(:empty)]:block min-[1700px]:col-start-3" />
      </div>
    </div>
  );
}

const SIDE_PANEL = "h-full lg:col-start-2 lg:row-start-2 lg:border-l lg:border-white/10";

type ShownTabs = { isLarge: boolean; tab: RoomTab; sideTab: RoomSideTab; wideSideTab: Exclude<RoomSideTab, "journal">; sideBarTab: RoomSideTab; isSideFolded: boolean; isJournalShown: boolean; isHeroShown: boolean };

function useShownTabs(hasHeroTab: boolean): ShownTabs {
  const { tab: storedTab, sideTab: storedSideTab, isSideFolded } = useRoomTabStore();
  const isLarge = useMediaQuery("lg");
  const isWide = useMediaQuery("wide");
  const tab = storedTab === "hero" && !hasHeroTab ? "map" : storedTab;
  const sideTab = findSideTab(storedSideTab, hasHeroTab);
  const wideSideTab = findWideSideTab(sideTab, hasHeroTab);
  const isShown = (panel: RoomSideTab) => (isLarge && isSideFolded ? false : isWide ? panel === "journal" || wideSideTab === panel : isLarge ? sideTab === panel : tab === panel);
  return { isLarge, tab, sideTab, wideSideTab, sideBarTab: isWide && !isSideFolded ? wideSideTab : sideTab, isSideFolded, isJournalShown: isShown("journal"), isHeroShown: isShown("hero") };
}

/// Класи пишуться повністю: Tailwind бачить лише цілі рядки в коді.
function findSideClasses(panel: RoomSideTab, shown: ShownTabs): string {
  const isWideShown = panel === "journal" || shown.wideSideTab === panel;
  if (shown.isSideFolded) return cn(shown.tab === panel ? "flex" : "hidden", "lg:hidden");
  return cn(shown.tab === panel ? "flex" : "hidden", shown.sideTab === panel ? "lg:flex" : "lg:hidden", isWideShown ? "min-[1700px]:flex" : "min-[1700px]:hidden");
}

function useRoomView(initialView: GameSessionView): GameSessionView {
  const liveView = useGameSessionLiveStore((state) => (state.view?.id === initialView.id ? state.view : null));
  return liveView ?? initialView;
}

/// Майстер сам у кімнаті насамперед кличе гравців, тож бачить запрошення одразу.
function useRoomTabsReset(view: GameSessionView) {
  const isGmAlone = view.myRole === "GM" && !view.isArchived && findRoomPeople(view.members).length === 1;
  useEffect(() => {
    if (isGmAlone) showRoomTab("room");
    return resetRoomTabs;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- вкладка за замовчуванням обирається раз на відкриття кімнати
  }, [view.id]);
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
    captureGameEvent("game_room_viewed", { role: myRole, member_count: findRoomPeople(members).length, is_archived: isArchived, has_pers: myPersId !== null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- одна подія на відкриття кімнати, а не на кожне оновлення складу
  }, [id]);
}

function LostRoomAlert({ sessionId }: { sessionId: number }) {
  const isLost = useGameSessionLiveStore((state) => state.sessionId === sessionId && state.status === "lost");
  const gamesHref = useGamesHref();
  if (!isLost) return null;
  return (
    <p role="alert" className="shrink-0 border-b border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      Вас більше немає в цій кімнаті. <Link href={gamesHref("/games")} className="underline">До списку кімнат</Link>
    </p>
  );
}

function GameRoomHeader({ view }: { view: GameSessionView }) {
  const gamesHref = useGamesHref();
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/60 px-2 py-1.5 sm:gap-3 sm:px-3">
      <Link href={gamesHref("/games")} aria-label="До списку кімнат" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm text-slate-300 hover:bg-white/10">
        <ChevronLeft className="h-5 w-5" aria-hidden />
        <span className="hidden sm:inline">Кімнати</span>
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-rpg-display text-lg leading-tight text-slate-50 sm:text-xl">{view.name}</h1>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {view.myRole === "GM" ? <Crown className="h-3.5 w-3.5 text-arcane-300" aria-hidden /> : null}
          {view.myRole === "GM" ? "Ви майстер" : "Ви гравець"}
          {view.isArchived ? " · в архіві" : ""}
        </div>
      </div>
      <div className="hidden min-w-0 items-center gap-2 lg:flex">
        <SceneSwitch view={view} />
        {view.combat ? null : <CombatTracker view={view} />}
      </div>
      <RollTargetSwitch view={view} />
    </header>
  );
}
