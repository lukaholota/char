"use client";

import { Loader2 } from "lucide-react";
import type { OmniSearchItem } from "@/lib/omniSearchData";
import { OmniSearchItemArt } from "@/components/search/OmniSearchItemArt";
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
        {isPending ? (
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
              visual.iconWrap
            )}
          >
            <Loader2 className={cn("h-4 w-4 animate-spin", visual.iconColor)} />
          </div>
        ) : (
          <OmniSearchItemArt item={item} visual={visual} />
        )}
        <div className="min-w-0 flex-1">
          {/* Українська назва забирає ширину першою; англійська — лише те, що лишилось,
              і на телефоні не показується взагалі. */}
          <div className="flex items-center gap-2">
            <span className="max-w-full shrink-0 truncate text-sm font-semibold">{item.title}</span>
            {item.subtitle && (
              <span className="hidden min-w-0 truncate text-xs italic text-slate-400 sm:inline">
                {item.subtitle}
              </span>
            )}
          </div>

          {/* Телефон: категорія й дрібниці — другим рядком. В один рядок із назвою вони
              лишали від неї одну літеру, а без категорії пошук видає забагато схожого. */}
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider sm:hidden">
            <span className={cn("shrink-0 font-bold", visual.iconColor)}>{item.categoryLabel}</span>
            {item.edition && <span className="shrink-0 text-slate-500">· {item.edition}</span>}
            {item.badge && (
              <span className="max-w-full shrink-0 truncate normal-case tracking-normal text-slate-400">
                · {item.badge}
              </span>
            )}
            {item.subtitle && (
              <span className="min-w-0 truncate normal-case italic tracking-normal text-slate-500">
                · {item.subtitle}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        {item.edition && (
          <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-slate-400">
            {item.edition}
          </span>
        )}
        {item.badge && (
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
            {item.badge}
          </span>
        )}
        <span
          className={cn(
            "rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            visual.badgeClass
          )}
        >
          {item.categoryLabel}
        </span>
      </div>
    </button>
  );
}
