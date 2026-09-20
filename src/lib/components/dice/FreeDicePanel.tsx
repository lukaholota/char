"use client";

import { Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupPool, sumPool, type PoolDie } from "./useDiceRolls";
import { D20Icon } from "@/lib/components/icons/D20Icon";

const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

type Props = {
  isReady: boolean;
  isRolling: boolean;
  pool: PoolDie[];
  onAdd: (sides: number) => void;
  onRemove: (sides: number) => void;
  onReroll: () => void;
  onClear: () => void;
};

export function FreeDicePanel({ isReady, isRolling, pool, onAdd, onRemove, onReroll, onClear }: Props) {
  const groups = groupPool(pool);
  const canRoll = isReady && !isRolling;
  return (
    <div className="space-y-3 px-4">
      <div className="grid grid-cols-7 gap-1.5">
        {DICE_SIDES.map((sides) => (
          <button
            key={sides}
            type="button"
            disabled={!canRoll}
            onClick={() => onAdd(sides)}
            aria-label={`Кинути к${sides}`}
            className={cn(
              "min-h-11 rounded-xl border text-sm font-bold transition active:scale-95 disabled:opacity-50 disabled:active:scale-100",
              groups.some((group) => group.sides === sides)
                ? "border-amber-400/50 bg-amber-500/20 text-amber-50"
                : "border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-800",
            )}
          >
            к{sides}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-center" aria-live="polite">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">Сума</div>
        <div className={cn("mt-1 text-5xl font-black leading-none tabular-nums text-amber-100", isRolling && "animate-pulse text-amber-200/60")}>
          {isRolling ? "…" : pool.length ? sumPool(pool) : "—"}
        </div>
        <div className="mt-2 flex min-h-6 flex-wrap items-center justify-center gap-1.5 text-xs">
          {groups.length ? (
            groups.map((group) => (
              <span key={group.sides} className="inline-flex items-center gap-1 rounded-full border border-amber-300/25 bg-slate-950/40 py-0.5 pl-2 pr-0.5 font-medium text-amber-100">
                {group.values.length}к{group.sides}: {group.values.join(", ")}
                <button
                  type="button"
                  onClick={() => onRemove(group.sides)}
                  aria-label={`Прибрати один к${group.sides}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-amber-200/80 hover:bg-white/10 hover:text-white"
                >
                  <Minus className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-slate-400">Торкніться кубика — він додасться до кидка</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          disabled={!canRoll || !pool.length}
          onClick={onReroll}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 text-sm font-semibold text-amber-50 transition active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          <D20Icon className="h-4 w-4" />
          Кинути ще раз
        </button>
        <button
          type="button"
          disabled={!pool.length}
          onClick={onClear}
          aria-label="Прибрати всі кубики"
          className="flex min-h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900/60 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
