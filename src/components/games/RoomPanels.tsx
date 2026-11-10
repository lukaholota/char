"use client";

import { findRoomPeople } from "@/rules/game-room-heroes";
import { HeroSheetSwitcher } from "./HeroSheetSwitcher";
import { Suspense, useState, type ReactNode } from "react";
import { Map as MapIcon, PanelRightClose, PanelRightOpen, ScrollText, Users, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BindablePers, GameSessionView } from "@/server/db/game-sessions";
import { GameJournal, GameSoundToggle } from "./GameJournal";
import { GameRoomManagement } from "./GameRoomManagement";
import { GameRoomPersPicker } from "./GameRoomPersPicker";
import { GameRoomInvite, GameRoomMembers } from "./GameRoomSidebar";
import { PopOutJournalButton } from "./GameSessionDock";
import { RollTargetChip } from "./RollTargetControls";
import { JournalRollStrip } from "./RoomRollTarget";
import { foldSidePanel, showRoomTab, type RoomTab } from "./room-tabs";

const TAB_LABELS: Record<RoomTab, { label: string; icon: typeof MapIcon }> = {
  map: { label: "Мапа", icon: MapIcon },
  hero: { label: "Герой", icon: UserRound },
  journal: { label: "Журнал", icon: ScrollText },
  room: { label: "Кімната", icon: Users },
};

export const findPanelId = (tab: RoomTab) => `room-panel-${tab}`;

type RoomTabBarProps = { tabs: RoomTab[]; current: RoomTab; unseen: number; label: string; wideHiddenTab?: RoomTab; isFolded?: boolean; canFold?: boolean; className?: string };

export function RoomTabBar({ tabs, current, unseen, label, wideHiddenTab, isFolded = false, canFold = false, className }: RoomTabBarProps) {
  return (
    <div className={cn("flex shrink-0 gap-1 border-b border-white/10 bg-slate-950/60 p-1", isFolded && "flex-col border-b-0", className)}>
      {canFold ? <FoldSideButton isFolded={isFolded} /> : null}
      <div role="tablist" aria-label={label} aria-orientation={isFolded ? "vertical" : "horizontal"} className={cn("flex min-w-0 flex-1 gap-1", isFolded && "flex-none flex-col")}>
        {tabs.map((tab) => {
          const { label: tabLabel, icon: Icon } = TAB_LABELS[tab];
          const isCurrent = tab === current && !isFolded;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              aria-controls={findPanelId(tab)}
              title={isFolded ? tabLabel : undefined}
              onClick={() => showRoomTab(tab)}
              className={cn(
                "relative flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-arcane-300",
                isCurrent ? "bg-arcane-500/20 text-arcane-50" : "text-slate-300 hover:bg-white/5 hover:text-slate-100",
                tab === wideHiddenTab && "min-[1700px]:hidden",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className={isFolded ? "sr-only" : "truncate"}>{tabLabel}</span>
              {tab === "journal" && unseen > 0 && !isCurrent ? (
                <span className="min-w-5 rounded-full bg-arcane-400 px-1.5 text-xs leading-5 text-slate-950">
                  {unseen > 99 ? "99+" : unseen}
                  <span className="sr-only"> нових</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FoldSideButton({ isFolded }: { isFolded: boolean }) {
  const Icon = isFolded ? PanelRightOpen : PanelRightClose;
  const label = isFolded ? "Розгорнути бічну панель" : "Згорнути бічну панель";
  return (
    <button
      type="button"
      onClick={() => foldSidePanel(!isFolded)}
      aria-expanded={!isFolded}
      aria-label={label}
      title={label}
      className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-arcane-300", !isFolded && "order-last")}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

export function RoomPanel({ tab, className, children }: { tab: RoomTab; className: string; children: ReactNode }) {
  return (
    <section id={findPanelId(tab)} role="tabpanel" aria-label={TAB_LABELS[tab].label} className={cn("min-h-0 min-w-0 flex-col", className)}>
      {children}
    </section>
  );
}

/// Лист монтується, коли його вперше показали: на телефоні з мапою він не важить нічого, а далі тримає прокрутку й вкладку.
export function HeroPanelContent({ view, heroSheet, shownHeroPersId, bindablePers, isShown }: { view: GameSessionView; heroSheet: ReactNode; shownHeroPersId: number | null; bindablePers: Promise<BindablePers[]>; isShown: boolean }) {
  const [wasShown, setWasShown] = useState(isShown);
  if (isShown && !wasShown) setWasShown(true);
  if (!heroSheet) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <Suspense fallback={<div className="h-24 rounded-2xl border border-white/10 bg-slate-900/40" aria-hidden />}>
          <GameRoomPersPicker view={view} bindablePers={bindablePers} />
        </Suspense>
      </div>
    );
  }
  return (
    <>
      <div className="shrink-0 pt-2 empty:hidden [&>*]:mx-2 [&>*]:mb-2">
        <HeroSheetSwitcher view={view} shownPersId={shownHeroPersId} />
        <RollTargetChip />
      </div>
      <div className="relative min-h-0 flex-1">{wasShown ? heroSheet : null}</div>
    </>
  );
}

export function JournalPanelContent({ view }: { view: GameSessionView }) {
  return (
    <>
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 py-1 pl-3 pr-1">
        <h2 className="flex-1 font-rpg-display text-lg text-slate-100">Журнал кидків</h2>
        <GameSoundToggle />
        <PopOutJournalButton />
      </div>
      <JournalRollStrip view={view} />
      <GameJournal myUserId={view.myUserId} className="min-h-0 flex-1" />
    </>
  );
}

export function RoomPanelContent({ view, bindablePers }: { view: GameSessionView; bindablePers: Promise<BindablePers[]> }) {
  const canInvite = view.myRole === "GM" && !view.isArchived;
  const isGmAlone = canInvite && findRoomPeople(view.members).length === 1;
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      {isGmAlone ? <GameRoomInvite view={view} isProminent /> : null}
      <Suspense fallback={<div className="h-24 rounded-2xl border border-white/10 bg-slate-900/40" aria-hidden />}>
        <GameRoomPersPicker view={view} bindablePers={bindablePers} />
      </Suspense>
      <GameRoomMembers view={view} />
      {canInvite && !isGmAlone ? <GameRoomInvite view={view} /> : null}
      <GameRoomManagement view={view} />
    </div>
  );
}
