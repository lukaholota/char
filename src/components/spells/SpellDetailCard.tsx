import { SpellData } from "@/lib/spellsData";
import { shortenCastingTime } from "@/lib/spell-casting-time";
import { spellSchoolTranslations, sourceTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { cn } from "@/lib/utils";
import { Sparkles, Info } from "lucide-react";
import {
  EditionAccentChip,
  EditionAccentFrame,
  EditionAccentTitle,
} from "@/components/ui/EditionAccent";
import { findEditionAccent } from "@/styles/edition-accent";

function normalizeFlag(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return false;
  return v === "так" || v === "yes" || v === "true" || v === "1";
}

function levelLabel(level: number, isRitual: boolean) {
  const base = level === 0 ? "Замовляння" : `Рівень ${level}`;
  return isRitual ? `${base} (ритуал)` : base;
}

function schoolLabel(school: string | null) {
  if (!school) return "";
  return spellSchoolTranslations[school as keyof typeof spellSchoolTranslations] || school;
}

function sourceLabel(source: string) {
  return sourceTranslations[source as keyof typeof sourceTranslations] || source;
}

export function SpellDetailCard({
  spell,
  is2024 = false,
}: {
  spell: SpellData;
  is2024?: boolean;
}) {
  const classList = Array.from(
    new Set(spell.spellClasses.map((c) => c.className).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  const raceList = Array.from(
    new Set(spell.spellRaces.map((r) => r.raceName || "").filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  const edition = is2024 ? "2024" : "2014";
  const accent = findEditionAccent(edition);

  return (
    <EditionAccentFrame edition={edition}>
    <div className="glass-card border border-white/10 bg-slate-950/60 p-3 backdrop-blur-xl sm:p-6 break-words max-w-full overflow-hidden rounded-2xl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-sans text-base sm:text-xl font-semibold uppercase tracking-wider truncate">
              <EditionAccentTitle edition={edition}>{spell.name}</EditionAccentTitle>
            </h1>
            {is2024 && <EditionAccentChip edition={edition}>2024</EditionAccentChip>}
            {is2024 && spell.kind === "new" && (
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                Нове 2024
              </span>
            )}
            {is2024 && spell.differsFrom2014 && (
              <EditionAccentChip edition={edition}>Змінено у 2024</EditionAccentChip>
            )}
          </div>
          <div className="text-xs font-mono text-slate-500 mt-0.5">[{spell.engName}]</div>
        </div>

        <div
          className={cn(
            "min-w-0 max-w-[40%] shrink-0 text-right text-[10px] sm:text-xs truncate rounded-lg px-2.5 py-1 border",
            accent.solid.border,
            accent.solid.fill,
            accent.solid.text
          )}
        >
          {sourceLabel(spell.source)}
        </div>
      </div>

      {/* Note / mechanical changes */}
      {is2024 && spell.note && (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-prism-500/30 bg-prism-500/10 p-2.5 text-xs text-prism-200">
          <Info className="h-4 w-4 shrink-0 text-prism-400 mt-0.5" />
          <span>{spell.note}</span>
        </div>
      )}

      <div className="mt-2 rounded-xl bg-white/5 p-2 glass-panel border border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
            <span className="text-slate-300">{levelLabel(spell.level, normalizeFlag(spell.hasRitual))}</span>
            <span className="italic text-slate-300">{schoolLabel(spell.school)}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-3">
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Час використання</div>
          <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">{shortenCastingTime(spell.castingTime) || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Тривалість</div>
          <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">{spell.duration || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Дистанція</div>
          <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">{spell.range || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Компоненти</div>
          <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">{spell.components || "—"}</div>
        </div>
      </div>

      <div className="mt-3 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 max-w-full overflow-hidden">
        <FormattedDescription content={spell.description} className="text-slate-300 text-xs sm:text-base break-words" />
      </div>

      <div className="mt-3 border-t border-slate-800/70 pt-3 text-[11px] sm:text-sm text-slate-300">
        <div>
          <span className="text-slate-400">Класи:</span> {classList.length ? classList.join(", ") : "—"}
        </div>
        {raceList.length > 0 && (
          <div className="mt-1">
            <span className="text-slate-400">Раси:</span> {raceList.join(", ")}
          </div>
        )}
      </div>
    </div>
    </EditionAccentFrame>
  );
}
