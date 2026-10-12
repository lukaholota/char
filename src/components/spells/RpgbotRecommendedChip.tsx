"use client";

import { cn } from "@/lib/utils";

type Props = { isActive: boolean; onToggle: () => void };

export function RpgbotRecommendedChip({ isActive, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors md:min-h-9",
        isActive ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100" : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10",
      )}
    >
      <span aria-hidden className={cn("h-2 w-2 rounded-full", isActive ? "bg-emerald-300" : "bg-slate-400")} />
      Лише рекомендовані RPGbot (3–4)
    </button>
  );
}
