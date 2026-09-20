"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  categoryLabel: string;
  hiddenCount: number;
  isSelected: boolean;
  onSelect: () => void;
};

/// «Ще K у каталозі X» (KR36.4): не перехід на сторінку, а перемикання фільтра панелі на цей
/// каталог — той самий стан, що й таб угорі.
export function OmniSearchMoreRow({ categoryLabel, hiddenCount, isSelected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left text-xs transition-all",
        isSelected
          ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      )}
    >
      <span>
        Ще {hiddenCount} у каталозі «{categoryLabel}»
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </button>
  );
}
