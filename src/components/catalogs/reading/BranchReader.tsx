"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

import { CatalogProse } from "@/components/catalogs/CatalogProse";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

export type BranchReaderLabels = {
  parentName: string;
  backLabel: string;
  kindLabel: string;
};

export function BranchReader({
  name,
  engName,
  sourceLabel,
  description,
  labels,
  is2024,
  focusOnOpen,
  onBack,
  onClose,
  children,
}: {
  name: string;
  engName: string;
  sourceLabel: string | null;
  description: string | null;
  labels: BranchReaderLabels;
  is2024: boolean;
  focusOnOpen: boolean;
  onBack: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (focusOnOpen) headingRef.current?.focus({ preventScroll: true });
  }, [focusOnOpen, name]);

  return (
    <div data-branch-reader>
      <div className="sticky -top-3 z-10 -mx-4 -mt-3 border-b border-white/10 bg-slate-950 px-4 pb-2 pt-3 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <ReaderButton onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            {labels.backLabel}
          </ReaderButton>
          <ReaderButton onClick={onClose} ariaLabel="Закрити">
            <X className="h-4 w-4" />
          </ReaderButton>
        </div>
        <p
          className={cn(
            "mt-1 truncate text-xs",
            findAccentVariant(is2024, { prism: "text-prism-200", arcane: "text-arcane-200" }),
          )}
        >
          {labels.parentName} › {name}
        </p>
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 font-rpg-display text-xl uppercase tracking-wide text-slate-100 focus:outline-none sm:text-2xl"
      >
        {name}
      </h2>
      <p className="mt-0.5 font-mono text-xs text-slate-500">[{engName}]</p>
      <p className="mt-1 text-xs text-slate-400">
        {[labels.kindLabel, sourceLabel].filter(Boolean).join(" · ")}
      </p>
      <CatalogProse content={description} className="mt-4" />
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ReaderButton({ onClick, ariaLabel, children }: { onClick: () => void; ariaLabel?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-200 hover:bg-white/5"
    >
      {children}
    </button>
  );
}
