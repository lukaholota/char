"use client";

import { InfusionData } from "@/lib/infusionsData";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { sourceTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";
import { Wrench, Sparkles, Shield, Sword, Eye, Repeat, CheckCircle } from "lucide-react";
import { getInfusionVisual } from "@/components/catalogs/catalog-visuals";

const TARGET_TYPE_LABELS: Record<string, string> = {
  WEAPON: "Зброя (проста або бойова)",
  ARMOR: "Обладунок",
  SHIELD: "Щит",
  RING: "Кільце / Перстень",
  BOOTS: "Чоботи / Взуття",
  HELMET: "Шолом / Головний убір",
  WAND_ROD_STAFF: "Паличка, жезл або посох",
  GEM_CRYSTAL: "Самоцвіт або кристал",
  ANY: "Будь-який відповідний предмет",
};

export function InfusionDetailCard({
  infusion,
}: {
  infusion: InfusionData;
}) {
  const visual = getInfusionVisual(infusion.targetType);
  const Icon = visual.icon;
  const targetLabel = TARGET_TYPE_LABELS[infusion.targetType] || infusion.targetType;
  const sourceLabel = sourceTranslations[infusion.source as keyof typeof sourceTranslations] || infusion.source;

  return (
    <div className="glass-card border border-white/10 bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xl break-words max-w-full overflow-hidden rounded-2xl shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-100 to-violet-300">
              {infusion.nameUa}
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">[{infusion.engName}]</div>
        </div>

        {/* Source */}
        <div className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium border border-teal-500/30 bg-teal-500/10 text-teal-300">
          {sourceLabel}
        </div>
      </div>

      {/* Meta tags bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-white/10 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border border-teal-500/40 bg-teal-500/15 text-teal-200">
          <Wrench className="h-3.5 w-3.5" />
          Рівень винахідника {infusion.minArtificerLevel}+
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border border-slate-700 bg-slate-800/60 text-slate-300">
          <Icon className="h-3.5 w-3.5 text-slate-400" />
          {targetLabel}
        </span>

        {infusion.requiresAttunement ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300">
            <Sparkles className="h-3.5 w-3.5" />
            Потребує налаштування
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-500">
            Без налаштування
          </span>
        )}
      </div>

      {/* Description */}
      <div className="mt-4 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-4 max-w-full overflow-hidden">
        <FormattedDescription
          content={infusion.description}
          className="text-slate-300 text-xs sm:text-sm leading-relaxed break-words space-y-2"
        />
      </div>
    </div>
  );
}
