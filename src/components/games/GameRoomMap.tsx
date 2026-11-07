"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GameSessionView } from "@/server/db/game-sessions";
import { CombatTracker } from "./CombatTracker";
import { ScenesButton } from "./GameScenesCard";
import { useTokenMoves } from "./HeroTokens";
import { MapBoard } from "./MapBoard";
import { MapTaskHint } from "./MapTargeting";
import { showRoomTab, useRoomTabStore } from "./room-tabs";
import { useHeroNameMode, useTokenScale } from "./use-token-scale";

const FULLSCREEN_MAP =
  "inset-0 left-0 top-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none border-0 bg-slate-950 bg-none p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-none sm:p-6";

const TURNED_MAP = "portrait:left-[100vw] portrait:h-[100vw] portrait:w-[100dvh] portrait:origin-top-left portrait:rotate-90";

export function GameRoomMap({ view }: { view: GameSessionView }) {
  const canEditMap = view.myRole === "GM" && !view.isArchived;
  const moves = useTokenMoves(view);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tokenScale, changeTokenScale] = useTokenScale(view.id);
  const [heroNameMode, changeHeroNameMode] = useHeroNameMode(view.id);
  const heroNames = { mode: heroNameMode, onChange: changeHeroNameMode };
  const [isTurned, setIsTurned] = useState(false);
  const changeFullscreen = (isOpen: boolean) => {
    setIsFullscreen(isOpen);
    if (!isOpen) setIsTurned(false);
  };
  useEffect(() => useRoomTabStore.subscribe((state, previous) => state.tab !== previous.tab && state.tab !== "map" && changeFullscreen(false)), []);
  const boardKey = `${view.viewedSceneId}:${view.mapImageUrl}`;
  const combat = view.combat ? <CombatTracker view={view} /> : null;
  const shared = view.mapImageUrl ? { view, moves, tokenScale, onTokenScaleChange: changeTokenScale, heroNames, combat, mapImageUrl: view.mapImageUrl } : null;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 sm:p-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canEditMap ? <ScenesButton view={view} /> : <h2 className="min-w-0 flex-1 truncate font-rpg-display text-lg text-slate-100">Мапа</h2>}
        {canEditMap && view.viewedSceneId !== view.activeSceneId ? <span className="shrink-0 text-xs text-slate-300">Лише для вас</span> : null}
        {shared ? <MapTaskHint view={view} className="order-last basis-full sm:order-none sm:basis-0 sm:flex-1" /> : null}
        <div className="ml-auto flex shrink-0 items-center gap-1">{view.combat ? null : <CombatTracker view={view} />}</div>
      </div>
      <PickHeroHint view={view} />
      {shared ? <MapBoard key={boardKey} {...shared} onFullscreen={() => setIsFullscreen(true)} /> : <>{combat}<EmptyMap view={view} canEditMap={canEditMap} /></>}
      {shared ? (
        <Dialog open={isFullscreen} onOpenChange={changeFullscreen}>
          <DialogContent data-safe-dialog={undefined} aria-describedby={undefined} closeLabel="Згорнути мапу" className={cn(FULLSCREEN_MAP, isTurned && TURNED_MAP)}>
            {isFullscreen ? (
              <MapBoard
                key={boardKey}
                {...shared}
                heading={
                  <div className="flex shrink-0 flex-col gap-2">
                    <div className="flex min-h-11 items-center gap-2 pr-12">
                      <DialogTitle className="min-w-0 flex-1 truncate normal-case leading-10 tracking-normal">{view.name}</DialogTitle>
                      {view.combat ? null : <CombatTracker view={view} />}
                    </div>
                    <MapTaskHint view={view} />
                  </div>
                }
                turn={{ isTurned, toggle: () => setIsTurned(!isTurned) }}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function PickHeroHint({ view }: { view: GameSessionView }) {
  if (view.myRole !== "PLAYER" || view.myPersId !== null || view.isArchived) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 py-1 pl-3 pr-1">
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
