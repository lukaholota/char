"use client";

import { Archive, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { cn } from "@/lib/utils";
import type { GameSessionView } from "@/server/db/game-sessions";
import { useRollVisibilityChoice, VisibilityPicker } from "./GameRollTargetBar";

function useIsRollTarget(view: GameSessionView) {
  return useGameSessionStore((state) => state.active?.id === view.id);
}

function changeRollTarget(view: GameSessionView, isOn: boolean) {
  const { activate, deactivate } = useGameSessionStore.getState();
  if (isOn) activate({ id: view.id, name: view.name });
  else deactivate(view.id);
  captureGameEvent("game_roll_target_changed", { is_on: isOn });
}

/// Куди підуть кидки — головне рішення в кімнаті, тому перемикач у шапці видно з будь-якої вкладки.
export function RollTargetSwitch({ view }: { view: GameSessionView }) {
  const isTarget = useIsRollTarget(view);
  const otherRoom = useGameSessionStore((state) => (state.active && state.active.id !== view.id ? state.active.name : null));
  if (view.isArchived) return null;
  return (
    <Button
      type="button"
      variant={isTarget ? "outline" : "default"}
      aria-pressed={isTarget}
      title={isTarget ? "Натисніть, щоб кидки знову бачили лише ви" : otherRoom ? `Зараз кидки йдуть у «${otherRoom}»` : "Зараз ваші кидки бачите лише ви"}
      onClick={() => changeRollTarget(view, !isTarget)}
      className={cn("h-11 shrink-0 gap-2 px-3", isTarget && "border-arcane-400/50 bg-arcane-500/10 text-arcane-50")}
    >
      {isTarget ? <span className="h-2 w-2 shrink-0 rounded-full bg-arcane-300" aria-hidden /> : <Dices className="h-4 w-4" aria-hidden />}
      {isTarget ? "Кидки йдуть сюди" : "Кидати сюди"}
    </Button>
  );
}

/// Над журналом: хто побачить наступний кидок і вільні кубики, або чому кидки сюди не йдуть.
export function JournalRollStrip({ view }: { view: GameSessionView }) {
  const isTarget = useIsRollTarget(view);
  const otherRoom = useGameSessionStore((state) => (state.active && state.active.id !== view.id ? state.active.name : null));
  const choice = useRollVisibilityChoice(view.id, view.myRole);
  const openFreeDice = useDiceUIStore((state) => state.open);

  if (view.isArchived) {
    return (
      <p className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-sm text-slate-300">
        <Archive className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        Кімната в архіві: журнал можна читати, нові кидки сюди не йдуть.
      </p>
    );
  }
  if (!isTarget) {
    return (
      <p className="border-b border-white/10 px-3 py-2 text-sm text-slate-300">
        {otherRoom ? `Ваші кидки зараз ідуть у «${otherRoom}».` : "Ваші кидки зараз бачите лише ви."} Щоб їх бачила кімната, натисніть «Кидати сюди» вгорі.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
      <VisibilityPicker
        value={choice.value}
        options={choice.options}
        onChange={(next) => {
          useGameSessionStore.getState().setVisibility(view.id, next);
          captureGameEvent("game_roll_visibility_changed", { visibility: next, surface: "room" });
        }}
      />
      <Button type="button" variant="outline" onClick={openFreeDice} className="ml-auto h-11 gap-2 px-3">
        <Dices className="h-4 w-4" aria-hidden />
        Кубики
      </Button>
    </div>
  );
}
