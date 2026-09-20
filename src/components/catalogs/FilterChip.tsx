"use client";

import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { findEditionAccent } from "@/styles/edition-accent";

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
  const accent = findEditionAccent(is2024 ? "2024" : "2014");

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "max-w-full truncate rounded-lg border px-2.5 py-1 text-xs font-medium transition-all max-md:min-h-10",
        selected
          ? cn(accent.solid.border, "bg-white/[0.06]", accent.solid.mutedText)
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
