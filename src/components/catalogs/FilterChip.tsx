"use client";

import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/// Один чип фільтра на всі каталоги: раніше кожен діалог тримав свою копію цієї кнопки, і
/// вони потроху розходилися.
export function FilterChip({
  label,
  selected,
  onClick,
  is2024 = false,
  title,
}: {
  label: ReactNode;
  selected: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  is2024?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "max-w-full truncate rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
        selected
          ? is2024
            ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
            : "border-arcane-500/50 bg-arcane-500/20 text-arcane-200"
          : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
      )}
    >
      {label}
    </button>
  );
}

export function FilterGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
