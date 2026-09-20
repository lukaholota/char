"use client";

import type { FeatData } from "@/lib/featsData";
import { featCategoryTranslations, sourceTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { cn } from "@/lib/utils";
import { Sparkles, Repeat, Award, ShieldAlert } from "lucide-react";
import { findAccentVariant } from "@/styles/edition-accent";
import { EditionAccentChip } from "@/components/ui/EditionAccent";

export function FeatDetailCard({
  feat,
  is2024 = false,
}: {
  feat: FeatData;
  is2024?: boolean;
}) {
  const categoryKey = feat.category as keyof typeof featCategoryTranslations;
  const categoryLabel = feat.category ? (featCategoryTranslations[categoryKey] || feat.category) : null;
  const sourceLabel = sourceTranslations[feat.source as keyof typeof sourceTranslations] || feat.source;

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
              {feat.name}
            </h1>
            {is2024 && (
              <EditionAccentChip edition="2024">2024</EditionAccentChip>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">[{feat.engName}]</div>
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
        {categoryLabel && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border",
              findAccentVariant(is2024, { prism: "border-prism-500/40 bg-prism-500/15 text-prism-200", arcane: "border-arcane-500/40 bg-arcane-500/15 text-arcane-200" })
            )}
          >
            <Award className="h-3.5 w-3.5" />
            {categoryLabel}
          </span>
        )}

        {feat.isRepeatable && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
            <Repeat className="h-3.5 w-3.5" />
            Повторювана
          </span>
        )}

        {feat.prerequisite ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300">
            <span className="text-slate-400">Вимога:</span> {feat.prerequisite}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-500">
            Без вимог
          </span>
        )}
      </div>

      {/* Benefits breakdown if present */}
      {feat.benefits && feat.benefits.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Переваги риси:
          </div>
          <div className="grid gap-2.5">
            {feat.benefits.map((benefit, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/5 bg-slate-900/40 p-3.5 glass-panel"
              >
                <div
                  className={cn(
                    "text-sm font-semibold mb-1",
                    findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-arcane-300" })
                  )}
                >
                  {benefit.name}
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <FormattedDescription content={benefit.description} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Description */
        <div className="mt-4 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-4 max-w-full overflow-hidden">
          <FormattedDescription
            content={feat.description}
            className="text-slate-300 text-xs sm:text-sm leading-relaxed break-words space-y-2"
          />
        </div>
      )}
    </div>
  );
}
