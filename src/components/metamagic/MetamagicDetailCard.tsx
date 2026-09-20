"use client";

import type { MetamagicData } from "@/lib/metamagicData";
import { describeMetamagicCost } from "@/lib/metamagic-cost";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { getMetamagicVisual } from "@/components/catalogs/catalog-visuals";
import { sourceTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";
import { EditionAccentChip } from "@/components/ui/EditionAccent";

export function MetamagicDetailCard({
  metamagic,
  is2024 = false,
}: {
  metamagic: MetamagicData;
  is2024?: boolean;
}) {
  const visual = getMetamagicVisual(metamagic.cost, metamagic.isCostSpellLevel);
  const Icon = visual.icon;
  const sourceLabel = sourceTranslations[metamagic.source as keyof typeof sourceTranslations] || metamagic.source;

  return (
    <div
      className={cn(
        "glass-card border border-white/10 bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xl break-words max-w-full overflow-hidden rounded-2xl",
        findAccentVariant(is2024, { prism: "shadow-[0_0_30px_rgba(192,74,224,0.08)] ring-1 ring-prism-500/20", arcane: "shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10" })
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={cn(
                "font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-transparent bg-clip-text",
                findAccentVariant(is2024, { prism: "bg-gradient-to-r from-prism-300 via-prism-200 to-prism-500", arcane: "bg-gradient-to-r from-arcane-300 via-arcane-100 to-violet-300" })
              )}
            >
              {metamagic.nameUa}
            </h1>
            {is2024 && (
              <EditionAccentChip edition="2024">2024</EditionAccentChip>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">[{metamagic.engName}]</div>
        </div>

        <div
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium border",
            findAccentVariant(is2024, { prism: "border-prism-500/30 bg-prism-500/10 text-prism-300", arcane: "border-arcane-500/30 bg-arcane-500/10 text-arcane-300" })
          )}
        >
          {sourceLabel}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-white/10 py-2.5">
        <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border", visual.badgeClass)}>
          <Icon className="h-3.5 w-3.5" />
          {describeMetamagicCost(metamagic)}
        </span>
      </div>

      <div className="mt-4 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-4 max-w-full overflow-hidden">
        <FormattedDescription
          content={metamagic.description}
          className="text-slate-300 text-xs sm:text-sm leading-relaxed break-words space-y-2"
        />
      </div>
    </div>
  );
}
