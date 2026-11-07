"use client";

import { Crosshair } from "lucide-react";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { cn } from "@/lib/utils";

/// Лише майстер у кидку зі статблоку: атака й шкода йдуть по обраному герою, а шкода сама знімає хіти з його листа.
export function HeroTargetPicker({ sessionId }: { sessionId: number }) {
  const view = useGameSessionLiveStore((state) => (state.view?.id === sessionId ? state.view : null));
  const targetPersId = useGameSessionStore((state) => state.targetHeroBySession[sessionId] ?? null);
  if (view?.myRole !== "GM") return null;
  const heroes = view.members.flatMap((member) => (member.persId !== null && member.userId !== view.myUserId ? [{ persId: member.persId, name: member.persName ?? member.name }] : []));
  if (!heroes.length) return null;
  const target = heroes.find((hero) => hero.persId === targetPersId) ?? null;
  const pick = (persId: number) => {
    const next = persId === targetPersId ? null : persId;
    useGameSessionStore.getState().setHeroTarget(sessionId, next);
    if (next !== null) captureGameEvent("game_roll_target_set", { surface: "hero_tray" });
  };
  return (
    <div className="mx-4 mb-3 grid gap-1.5">
      <div role="group" aria-label="Ціль атаки — герой" className="flex items-center gap-1.5 overflow-x-auto">
        <Crosshair className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
        {heroes.map((hero) => (
          <button
            key={hero.persId}
            type="button"
            aria-pressed={hero.persId === targetPersId}
            onClick={() => pick(hero.persId)}
            className={cn(
              "min-h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-arcane-300",
              hero.persId === targetPersId ? "border-amber-400/50 bg-amber-500/15 text-amber-50" : "border-white/10 text-slate-300 hover:bg-white/5",
            )}
          >
            {hero.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400">{target ? `Атака й шкода підуть по «${target.name}»: шкода сама зніме хіти з листа героя.` : "Оберіть героя, якого б'є істота, — інакше кидок іде в журнал без цілі."}</p>
    </div>
  );
}
