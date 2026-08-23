"use client";

import { InvocationData } from "@/lib/invocationsData";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { sourceTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";
import { Eye, BookOpen, Crown, Sparkles, Sword, PawPrint } from "lucide-react";
import { getInvocationVisual } from "@/components/catalogs/catalog-visuals";

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
        is2024
          ? "shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20"
          : "shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={cn(
                "font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-transparent bg-clip-text",
                is2024
                  ? "bg-gradient-to-r from-amber-300 via-amber-200 to-amber-500"
                  : "bg-gradient-to-r from-teal-300 via-teal-100 to-violet-300"
              )}
            >
              {invocation.nameUa}
            </h1>
            {is2024 && (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                2024
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">[{invocation.engName}]</div>
        </div>

        {/* Source */}
        <div
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium border",
            is2024
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-teal-500/30 bg-teal-500/10 text-teal-300"
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
              is2024
                ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                : "border-teal-500/40 bg-teal-500/15 text-teal-200"
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
