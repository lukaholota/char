"use client";

import { Loader2 } from "lucide-react";
import type { OmniSearchItem } from "@/lib/omniSearchData";
import { findOmniSearchVisual } from "@/lib/search/searchVisuals";
import { cn } from "@/lib/utils";

type Props = {
  item: OmniSearchItem;
  isSelected: boolean;
  isPending?: boolean;
  onSelect: () => void;
};

export function OmniSearchItemRow({ item, isSelected, isPending, onSelect }: Props) {
  const visual = findOmniSearchVisual(item);
  const Icon = visual.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isPending}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
        isPending
          ? "bg-amber-500/15 text-slate-100 ring-1 ring-amber-500/40 shadow-sm opacity-80 cursor-wait"
          : isSelected
          ? "bg-amber-500/15 text-slate-100 ring-1 ring-amber-500/40 shadow-sm"
          : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            visual.iconWrap
          )}
        >
          {isPending ? (
            <Loader2 className={cn("h-4 w-4 animate-spin", visual.iconColor)} />
          ) : (
            <Icon className={cn("h-4 w-4", visual.iconColor)} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{item.title}</span>
            {item.subtitle && (
              <span className="text-xs text-slate-400 truncate italic">
                {item.subtitle}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.edition && (
          <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-slate-400">
            {item.edition}
          </span>
        )}
        {item.badge && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10">
            {item.badge}
          </span>
        )}
        <span
          className={cn(
            "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border",
            visual.badgeClass
          )}
        >
          {item.categoryLabel}
        </span>
      </div>
    </button>
  );
}
