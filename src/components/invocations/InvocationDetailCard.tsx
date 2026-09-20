"use client";

import type { InvocationData } from "@/lib/invocationsData";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { sourceTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";
import { Eye, BookOpen, Crown, Sparkles, Sword, PawPrint } from "lucide-react";
import { getInvocationVisual } from "@/components/catalogs/catalog-visuals";
import { findAccentVariant } from "@/styles/edition-accent";
import { EditionAccentChip } from "@/components/ui/EditionAccent";

export function InvocationDetailCard({
  invocation,
  is2024 = false,
}: {
  invocation: InvocationData;
  is2024?: boolean;
}) {
  const visual = getInvocationVisual(invocation.pactRequirement, invocation.minLevel);
  const Icon = visual.icon;
  const sourceLabel = sourceTranslations[invocation.source as keyof typeof sourceTranslations] || invocation.source;

  return (
    <div
      className={cn(
        "glass-card border border-white/10 bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xl break-words max-w-full overflow-hidden rounded-2xl",
        findAccentVariant(is2024, { prism: "shadow-[0_0_30px_rgba(192,74,224,0.08)] ring-1 ring-prism-500/20", arcane: "shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10" })
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={cn(
                "font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-transparent bg-clip-text",
                findAccentVariant(is2024, { prism: "bg-gradient-to-r from-prism-300 via-prism-200 to-prism-500", arcane: "bg-gradient-to-r from-arcane-300 via-arcane-100 to-violet-300" })
              )}
            >
              {invocation.nameUa}
            </h1>
            {is2024 && (
              <EditionAccentChip edition="2024">2024</EditionAccentChip>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">[{invocation.engName}]</div>
        </div>

        {/* Source */}
        <div
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium border",
            findAccentVariant(is2024, { prism: "border-prism-500/30 bg-prism-500/10 text-prism-300", arcane: "border-arcane-500/30 bg-arcane-500/10 text-arcane-300" })
          )}
        >
          {sourceLabel}
        </div>
      </div>

      {/* Meta tags bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-white/10 py-2.5">
        {invocation.minLevel ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border",
              findAccentVariant(is2024, { prism: "border-prism-500/40 bg-prism-500/15 text-prism-200", arcane: "border-arcane-500/40 bg-arcane-500/15 text-arcane-200" })
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Рівень {invocation.minLevel}+
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-400">
            Без вимоги до рівня
          </span>
        )}

        {invocation.pactRequirement && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
            <Icon className="h-3.5 w-3.5" />
            {invocation.pactRequirement}
          </span>
        )}

        {invocation.prerequisite && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300">
            <span className="text-slate-400">Вимога:</span> {invocation.prerequisite}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="mt-4 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-4 max-w-full overflow-hidden">
        <FormattedDescription
          content={invocation.description}
          className="text-slate-300 text-xs sm:text-sm leading-relaxed break-words space-y-2"
        />
      </div>
    </div>
  );
}
