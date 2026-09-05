"use client";

import { Home, Layers, Users } from "lucide-react";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { getBastionFacilityVisual } from "@/components/catalogs/catalog-visuals";
import {
  type BastionFacilityData,
  describeHirelings,
  translateOrder,
  translateSpace,
} from "@/lib/bastion-facility";
import { findSourceLabel } from "@/lib/refs/source-label";
import { bastionFacilityTypeTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";

export function BastionFacilityDetailCard({ facility }: { facility: BastionFacilityData }) {
  const visual = getBastionFacilityVisual(facility.orders[0]);
  const sourceLabel = findSourceLabel(facility.source);
  const typeLabel =
    bastionFacilityTypeTranslations[
      facility.facilityType.toUpperCase() as keyof typeof bastionFacilityTypeTranslations
    ];

  return (
    <div className="glass-card break-words max-w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20 backdrop-blur-xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-rpg-display bg-gradient-to-r from-amber-300 via-amber-200 to-amber-500 bg-clip-text text-xl font-bold uppercase tracking-wider text-transparent sm:text-2xl">
              {facility.name}
            </h1>
            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              2024
            </span>
          </div>
          <div className="mt-0.5 font-mono text-xs text-slate-400">[{facility.engName}]</div>
        </div>

        <div className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
          {sourceLabel}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-white/10 py-2.5">
        <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold", visual.badgeClass)}>
          <Home className="h-3.5 w-3.5" />
          {typeLabel}
        </span>

        {facility.level !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200">
            Рівень {facility.level}+
          </span>
        )}

        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          {facility.space.map(translateSpace).join(" / ")}
        </span>

        {facility.hirelings.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            Найманці: {describeHirelings(facility.hirelings)}
          </span>
        )}

        {facility.orders.map((order) => (
          <span
            key={order}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300"
          >
            {translateOrder(order)}
          </span>
        ))}
      </div>

      {facility.prerequisiteText && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
          <span className="text-slate-400">Передумова: </span>
          <FormattedDescription content={facility.prerequisiteText} className="inline" />
        </div>
      )}

      <div className="glass-panel mt-4 max-w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <FormattedDescription
          content={facility.description}
          className="space-y-2 break-words text-xs leading-relaxed text-slate-300 sm:text-sm"
        />
      </div>
    </div>
  );
}
