"use client";

import { listSheetPersIds } from "@/rules/game-room-heroes";
import { cn } from "@/lib/utils";
import type { GameSessionView } from "@/server/db/game-sessions";
import { GameAvatar } from "./GameAvatar";
import { useRoomHeroSheetOpener } from "./use-room-hero-sheet";

export function HeroSheetSwitcher({ view, shownPersId }: { view: GameSessionView; shownPersId: number | null }) {
  const openHeroSheet = useRoomHeroSheetOpener(view);
  const heroes = listSheetPersIds(view).flatMap((persId) => view.members.filter((member) => member.persId === persId));
  if (heroes.length < 2) return null;
  return (
    <div role="group" aria-label="Чий лист показати" className="flex gap-1.5 overflow-x-auto">
      {heroes.map((hero) => {
        const name = hero.persName ?? hero.name;
        const isShown = hero.persId === shownPersId;
        const playerName = hero.userId === view.myUserId ? null : hero.name;
        return (
          <button key={hero.heroId} type="button" aria-pressed={isShown} onClick={() => void openHeroSheet(hero.persId as number)} className={cn("flex h-11 max-w-48 shrink-0 items-center gap-2 rounded-xl border pl-1.5 pr-3 text-left text-sm", isShown ? "border-white/30 bg-white/10 text-slate-100" : "border-white/10 text-slate-400 hover:text-slate-200")}>
            <GameAvatar src={hero.avatarUrl} name={name} className="h-8 w-8 text-sm" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate">{name}</span>
              {playerName ? <span className="block truncate text-xs text-slate-400">{playerName}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
