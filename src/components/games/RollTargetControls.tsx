"use client";

import { Crosshair, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { showRoomTab } from "./room-tabs";

export type TargetControl = { isTarget: boolean; heroName: string; onToggle: () => void };

export const useRollTargetCreatureId = (sessionId: number) => useGameSessionStore((state) => state.targetCreatureBySession[sessionId] ?? null);

export function buildCreatureTargetControl(sessionId: number, creatureId: number, targetId: number | null, heroName: string): TargetControl {
  const isTarget = targetId === creatureId;
  return {
    isTarget,
    heroName,
    onToggle: () => {
      useGameSessionStore.getState().setRollTarget(sessionId, isTarget ? null : creatureId);
      if (!isTarget) captureGameEvent("game_roll_target_set", { surface: "statblock" });
    },
  };
}

export function RollTargetButton({ control }: { control: TargetControl }) {
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={control.isTarget ? "secondary" : "outline"} aria-pressed={control.isTarget} aria-describedby="roll-target-hint" onClick={control.onToggle} className="h-11 gap-2">
          <Crosshair className="h-4 w-4" aria-hidden />
          {control.isTarget ? "Зняти ціль" : "Обрати ціллю"}
        </Button>
        {control.isTarget ? (
          <DialogClose asChild>
            <Button type="button" onClick={() => showRoomTab("hero")} className="h-11 gap-2">
              <ScrollText className="h-4 w-4" aria-hidden />
              До листа героя
            </Button>
          </DialogClose>
        ) : null}
      </div>
      <p id="roll-target-hint" className="text-sm text-slate-400">
        {control.isTarget ? `Атаки й шкода з аркуша «${control.heroName}» зараз ідуть по цій істоті.` : `Атаки й шкода з аркуша «${control.heroName}» підуть по цій істоті: журнал покаже, чи влучили і скільки шкоди.`}
      </p>
    </div>
  );
}

export function RollTargetChip() {
  const sessionId = useGameSessionStore((state) => state.active?.id ?? null);
  const targetId = useGameSessionStore((state) => (state.active ? (state.targetCreatureBySession[state.active.id] ?? null) : null));
  const label = useGameSessionLiveStore((state) => (targetId === null ? null : (state.view?.creatures.find((creature) => creature.id === targetId)?.label ?? null)));
  if (sessionId === null || label === null) return null;
  return (
    <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-1.5 pl-3">
      <Crosshair className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
      <div className="min-w-0 flex-1 truncate text-sm text-slate-200" title={label}>
        Ціль: <span className="font-semibold text-slate-50">{label}</span>
      </div>
      <Button type="button" variant="ghost" aria-label="Зняти ціль" onClick={() => useGameSessionStore.getState().setRollTarget(sessionId, null)} className="h-11 w-11 shrink-0 p-0 text-slate-300">
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
