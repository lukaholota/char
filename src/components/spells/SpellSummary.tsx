import type { ReactNode } from "react";
import { Clock3, Sparkles } from "lucide-react";

import { getSpellSchoolVisual } from "@/components/catalogs/catalog-visuals";
import { SpellIcon } from "@/components/spells/SpellIcon";
import { spellSchoolTranslations } from "@/lib/refs/translation";
import { shortenCastingTime } from "@/lib/spell-casting-time";
import { cn } from "@/lib/utils";
import { findEditionAccent } from "@/styles/edition-accent";

export type SpellSummaryFacts = {
  name: string;
  engName: string | null;
  level: number;
  school: string | null;
  castingTime: string | null;
  isRitual: boolean;
  isConcentration: boolean;
};

/** Іконка школи, назва з оригіналом і рядок фактів — одна картка заклинання для каталогу й кроку вибору. */
export function SpellSummary(props: { spell: SpellSummaryFacts; is2024: boolean; isSelected: boolean; nameBadges?: ReactNode }) {
  const { spell, is2024, isSelected } = props;
  const accent = findEditionAccent(is2024 ? "2024" : "2014");
  const visual = getSpellSchoolVisual(spell.school);
  const hasOriginalInName = spell.name.includes("[");

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <SpellIcon engName={spell.engName} school={spell.school} className="h-11 w-11 shrink-0 rounded-xl" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "truncate text-[15px] font-semibold transition-colors",
              isSelected ? accent.solid.text : "text-slate-100 group-hover:text-white",
            )}
          >
            {spell.name} {spell.engName && !hasOriginalInName && <span className="ml-1 text-sm font-normal text-slate-400">[{spell.engName}]</span>}
          </span>
          {props.nameBadges}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            {spell.level === 0 ? "Замовляння" : `Рівень ${spell.level}`}
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
            {shortenCastingTime(spell.castingTime) || "—"}
          </span>
          {spell.school && (
            <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium", visual.badgeClass)}>{translateSchool(spell.school)}</span>
          )}
          {spell.isRitual && (
            <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">Ритуал</span>
          )}
          {spell.isConcentration && (
            <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
              Концентрація
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function translateSchool(school: string): string {
  return spellSchoolTranslations[school as keyof typeof spellSchoolTranslations] || school;
}
