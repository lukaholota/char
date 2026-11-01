"use client";

import { Eye, EyeOff, Lock, type LucideIcon } from "lucide-react";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { useSheetPersStore } from "@/lib/stores/sheetPersStore";
import { cn } from "@/lib/utils";
import type { GameRollVisibility } from "@/rules/game-roll";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";

export const VISIBILITY_OPTIONS: Array<{ value: GameRollVisibility; label: string; hint: string; icon: LucideIcon }> = [
  { value: "PUBLIC", label: "Усім", hint: "Кидок побачать усі в кімнаті", icon: Eye },
  { value: "GM", label: "Майстру", hint: "Кидок побачите ви й майстер", icon: EyeOff },
  { value: "SELF", label: "Лише мені", hint: "Кидок побачите лише ви", icon: Lock },
];

/// Ціль показана до кидка: гравець бачить, у яку кімнату й кому піде результат, ще до натискання.
export function GameRollTargetBar({ isSheetRoll }: { isSheetRoll: boolean }) {
  const active = useGameSessionStore((state) => state.active);
  const visibility = useGameSessionStore((state) => (state.active ? state.visibilityBySession[state.active.id] ?? "PUBLIC" : "PUBLIC"));
  const setVisibility = useGameSessionStore((state) => state.setVisibility);
  const hasSheetPers = useSheetPersStore((state) => state.pers !== null);
  if (!active || (isSheetRoll && !hasSheetPers)) return null;

  return (
    <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-1.5 pl-3">
      <div className="min-w-0 flex-1 truncate text-xs text-slate-300" title={active.name}>
        У кімнату <span className="font-semibold text-slate-100">{active.name}</span>
      </div>
      <VisibilityPicker value={visibility} onChange={(next) => {
        setVisibility(active.id, next);
        captureGameEvent("game_roll_visibility_changed", { visibility: next, surface: "tray" });
      }} />
    </div>
  );
}

export function VisibilityPicker({ value, onChange }: { value: GameRollVisibility; onChange: (value: GameRollVisibility) => void }) {
  return (
    <div role="radiogroup" aria-label="Хто побачить кидок" className="flex shrink-0 gap-1">
      {VISIBILITY_OPTIONS.map((option) => (
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

/// Повнорозмірний вибір для сторінки кімнати: наслідок вибору підписано одразу під ним.
export function VisibilitySegments({ value, onChange }: { value: GameRollVisibility; onChange: (value: GameRollVisibility) => void }) {
  const selected = VISIBILITY_OPTIONS.find((option) => option.value === value) ?? VISIBILITY_OPTIONS[0];
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Хто побачить кидок" className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-1">
        {VISIBILITY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 text-sm font-semibold sm:min-h-12 sm:flex-row sm:gap-2 sm:px-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-arcane-300",
                isSelected ? "bg-arcane-500/20 text-arcane-50 outline outline-1 -outline-offset-1 outline-arcane-400/50" : "text-slate-300 hover:bg-white/5 hover:text-slate-100",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-slate-400" aria-live="polite">{selected.hint}.</p>
    </div>
  );
}
