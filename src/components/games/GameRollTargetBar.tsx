"use client";

import { Crosshair } from "lucide-react";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { findTargetName } from "@/lib/components/game/map-targeting";
import { selectRollVisibility, useGameSessionStore, type PickableRollVisibility } from "@/lib/stores/gameSessionStore";
import { useSheetPersStore } from "@/lib/stores/sheetPersStore";
import { cn } from "@/lib/utils";
import type { GameRollVisibility } from "@/rules/game-roll";
import type { RollTargetRef } from "@/rules/map-target-picks";
import type { GameSessionView } from "@/server/db/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { HeroTargetPicker } from "./HeroTargetPicker";
import { RollTargetChip } from "./RollTargetControls";

type VisibilityOption<Value extends GameRollVisibility> = { value: Value; label: string; hint: string };

const PLAYER_OPTIONS: Array<VisibilityOption<PickableRollVisibility>> = [
  { value: "PUBLIC", label: "Усім", hint: "Кидок побачать усі в кімнаті" },
  { value: "GM", label: "Мені й майстру", hint: "Кидок побачите ви й майстер" },
  { value: "SECRET", label: "Лише майстру", hint: "Результат побачить лише майстер, ви — тільки що кидали" },
];

const GM_OPTIONS: Array<VisibilityOption<PickableRollVisibility>> = [
  { value: "PUBLIC", label: "Усім", hint: "Кидок побачать усі в кімнаті" },
  { value: "GM", label: "Лише мені", hint: "Кидок бачите тільки ви" },
];

export function useRollVisibilityChoice(sessionId: number | undefined, knownRole?: GameSessionView["myRole"]) {
  const stored = useGameSessionStore((state) => selectRollVisibility(state, sessionId));
  const isGm = useGameSessionLiveStore((state) => (knownRole ?? state.view?.myRole) === "GM");
  return isGm ? { options: GM_OPTIONS, value: stored === "SECRET" ? ("GM" as const) : stored } : { options: PLAYER_OPTIONS, value: stored };
}

/// Ціль показана до кидка: гравець бачить, у яку кімнату й кому піде результат, ще до натискання.
/// pickedTarget — ціль, обрана на мапі для цього кидка: її вже не міняють тут, лише бачать (і героя, якого лікують).
export function GameRollTargetBar({ isSheetRoll, isCreatureRoll = false, canTarget = true, pickedTarget }: { isSheetRoll: boolean; isCreatureRoll?: boolean; canTarget?: boolean; pickedTarget?: RollTargetRef | null }) {
  const active = useGameSessionStore((state) => state.active);
  const choice = useRollVisibilityChoice(active?.id);
  const hasSheetPers = useSheetPersStore((state) => state.pers !== null);

  if (!active || (isSheetRoll && !isCreatureRoll && !hasSheetPers)) return null;

  return (
    <>
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-1.5 pl-3">
        <div className="min-w-0 flex-1 truncate text-xs text-slate-300" title={active.name}>
          У кімнату <span className="font-semibold text-slate-100">{active.name}</span>
        </div>
        <VisibilityPicker
          value={choice.value}
          options={choice.options}
          onChange={(next) => {
            useGameSessionStore.getState().setVisibility(active.id, next);
            captureGameEvent("game_roll_visibility_changed", { visibility: next, surface: "tray" });
          }}
        />
      </div>
      {pickedTarget !== undefined ? <PickedTargetLine target={pickedTarget} /> : !canTarget ? null : isCreatureRoll ? <HeroTargetPicker sessionId={active.id} /> : isSheetRoll ? <RollTargetChip /> : null}
    </>
  );
}

function PickedTargetLine({ target }: { target: RollTargetRef | null }) {
  const name = useGameSessionLiveStore((state) => (target && state.view ? findTargetName(state.view, target) : null));
  return (
    <div className="mx-4 mb-3 flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3">
      <Crosshair className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
      <div className="min-w-0 flex-1 truncate text-sm text-slate-200">
        {name ? <>Ціль: <span className="font-semibold text-slate-50">{name}</span></> : "Без цілі — кидок лише в журнал"}
      </div>
    </div>
  );
}

export function VisibilityPicker<Value extends GameRollVisibility>({ value, options, onChange }: { value: Value; options: Array<VisibilityOption<Value>>; onChange: (value: Value) => void }) {
  return (
    <div role="radiogroup" aria-label="Хто побачить кидок" className="flex shrink-0 gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          title={option.hint}
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-10 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-arcane-300",
            option.value === value ? "bg-arcane-500/20 text-arcane-50 outline outline-1 -outline-offset-1 outline-arcane-400/50" : "text-slate-300 hover:bg-white/5",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
