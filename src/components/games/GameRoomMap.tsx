"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GameSessionView } from "@/server/db/game-sessions";
import { CombatTracker, PartyPortraits } from "./CombatTracker";
import { ScenesButton } from "./GameScenesCard";
import { useTokenMoves } from "./HeroTokens";
import { MapBoard } from "./MapBoard";
import { useMapUndoShortcut } from "./map-history";
import { SharedBoardProvider } from "./shared-board";
import { showRoomTab, useRoomTabStore } from "./room-tabs";
import { useCutoutOutline, useHeroNameMode, usePartyPortraits, usePortraitsOverMap, useTokenScale } from "./use-token-scale";

const FULLSCREEN_MAP =
  "inset-0 left-0 top-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-slate-950 bg-none p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-none sm:p-0";

/// Кнопки лежать поверх мапи, тож мають непрозоре тло.
const OVER_MAP = "[&_button]:bg-slate-950/90 [&_button:hover]:bg-slate-900";

const TURNED_MAP = "portrait:left-[100vw] portrait:h-[100vw] portrait:w-[100dvh] portrait:origin-top-left portrait:rotate-90";

export function GameRoomMap({ view }: { view: GameSessionView }) {
  const canEditMap = view.myRole === "GM" && !view.isArchived;
  const moves = useTokenMoves(view);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tokenScale, changeTokenScale] = useTokenScale(view.id);
  const [heroNameMode, changeHeroNameMode] = useHeroNameMode(view.id);
  const heroNames = { mode: heroNameMode, onChange: changeHeroNameMode };
  const [isCutoutOutlined, changeCutoutOutline] = useCutoutOutline(view.id);
  const [arePartyPortraitsShown, changePartyPortraits] = usePartyPortraits(view.id);
  const [arePortraitsOverMap, changePortraitsOverMap] = usePortraitsOverMap(view.id);
  const placement = view.mapImageUrl ? { isOverMap: arePortraitsOverMap, onChange: changePortraitsOverMap } : undefined;
  const [isTurned, setIsTurned] = useState(false);
  useMapUndoShortcut(view.viewedSceneId);
  const changeFullscreen = (isOpen: boolean) => {
    setIsFullscreen(isOpen);
    if (!isOpen) setIsTurned(false);
  };
  useEffect(() => useRoomTabStore.subscribe((state, previous) => state.tab !== previous.tab && state.tab !== "map" && changeFullscreen(false)), []);
  const boardKey = `${view.viewedSceneId}:${view.mapImageUrl}`;
  const combat = view.combat ? <CombatTracker view={view} placement={placement} /> : arePartyPortraitsShown ? <PartyPortraits view={view} placement={placement} /> : null;
  const startCombat = canEditMap && !view.combat ? <CombatTracker view={view} /> : null;
  const shared = view.mapImageUrl ? { view, moves, tokenScale, onTokenScaleChange: changeTokenScale, heroNames, cutoutOutline: { isOn: isCutoutOutlined, onChange: changeCutoutOutline }, partyPortraits: { isOn: arePartyPortraitsShown, onChange: changePartyPortraits }, combat, isCombatOverMap: arePortraitsOverMap, mapImageUrl: view.mapImageUrl } : null;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PickHeroHint view={view} />
      {shared ? (
        <SharedBoardProvider key={boardKey}>
          <MapBoard
            {...shared}
            onFullscreen={() => setIsFullscreen(true)}
            stageTop={
              <div className={cn("contents lg:hidden", OVER_MAP)}>
                <SceneSwitch view={view} />
                {startCombat ? <span className="ml-auto">{startCombat}</span> : null}
              </div>
            }
          />
          <Dialog open={isFullscreen} onOpenChange={changeFullscreen}>
            <DialogContent data-safe-dialog={undefined} aria-describedby={undefined} closeLabel="Згорнути мапу" className={cn(FULLSCREEN_MAP, isTurned && TURNED_MAP)}>
              <DialogTitle className="sr-only">{view.name}</DialogTitle>
              {isFullscreen ? <MapBoard {...shared} isFullscreen stageTop={startCombat ? <span className={cn("ml-auto mr-12", OVER_MAP)}>{startCombat}</span> : null} turn={{ isTurned, toggle: () => setIsTurned(!isTurned) }} /> : null}
            </DialogContent>
          </Dialog>
        </SharedBoardProvider>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
          <div className="flex shrink-0 flex-wrap items-center gap-2 empty:hidden lg:hidden">
            <SceneSwitch view={view} />
            {startCombat ? <span className="ml-auto">{startCombat}</span> : null}
          </div>
          {combat}
          <EmptyMap view={view} canEditMap={canEditMap} />
        </div>
      )}
    </div>
  );
}

/// Майстер перемикає сцену; «Лише для вас» — коли він дивиться не ту сцену, що гравці.
export function SceneSwitch({ view }: { view: GameSessionView }) {
  if (view.myRole !== "GM" || view.isArchived) return null;
  return (
    <>
      <ScenesButton view={view} />
      {view.viewedSceneId !== view.activeSceneId ? <span className="shrink-0 rounded-lg bg-slate-950/85 px-2 py-1 text-xs text-slate-300">Лише для вас</span> : null}
    </>
  );
}

function PickHeroHint({ view }: { view: GameSessionView }) {
  if (view.myRole !== "PLAYER" || view.myPersId !== null || view.isArchived) return null;
  return (
    <div className="m-2 mb-0 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 py-1 pl-3 pr-1">
      <p className="min-w-0 flex-1 basis-40 text-sm text-slate-300">Оберіть персонажа — і на мапі зʼявиться ваш токен.</p>
      <Button type="button" variant="outline" onClick={() => showRoomTab("hero")} className="h-11 gap-2 px-3">
        <UserRound className="h-4 w-4" aria-hidden />
        Обрати
      </Button>
    </div>
  );
}

function EmptyMap({ view, canEditMap }: { view: GameSessionView; canEditMap: boolean }) {
  const text = canEditMap
    ? view.viewedSceneId === null ? "Відкрийте або додайте сцену, щоб побачити мапу." : "У цій сцені ще немає мапи. Додайте її в налаштуваннях сцени."
    : view.myRole === "GM" ? "Мапи в цій кімнаті немає." : "Майстер ще не показав мапу";
  return (
    <div className="grid min-h-40 flex-1 place-items-center rounded-2xl border border-dashed border-white/20 p-4">
      <p className="max-w-sm text-center text-sm text-slate-300">{text}</p>
    </div>
  );
}
