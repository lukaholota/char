"use client";

import type { SpellData } from "@/lib/spellsData";
import { shortenCastingTime } from "@/lib/spell-casting-time";
import { spellSchoolTranslations, sourceTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";
import { EditionAccentChip } from "@/components/ui/EditionAccent";

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

export function SpellModalCard({
  spell,
  onClose,
  is2024 = false,
}: {
  spell: SpellData;
  onClose: () => void;
  is2024?: boolean;
}) {
  const classList = Array.from(
    new Set(spell.spellClasses.map((c) => c.className).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  const raceList = Array.from(
    new Set(spell.spellRaces.map((r) => r.raceName || "").filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  return (
    <div
      className={cn(
        "glass-card border border-white/10 bg-slate-950/60 p-3 backdrop-blur-xl sm:p-5 max-w-full overflow-x-hidden",
        findAccentVariant(is2024, { prism: "shadow-[0_0_30px_rgba(192,74,224,0.08)] ring-1 ring-prism-500/20", arcane: "shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10" })
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              className={cn(
                "font-sans text-base sm:text-lg font-semibold uppercase tracking-wider text-transparent bg-clip-text truncate",
                findAccentVariant(is2024, { prism: "bg-gradient-to-r from-prism-300 to-prism-500", arcane: "bg-gradient-to-r from-arcane-400 to-violet-400" })
              )}
            >
              {spell.name}
            </h2>
            {is2024 && (
              <EditionAccentChip edition="2024">2024</EditionAccentChip>
            )}
            {is2024 && spell.kind === "new" && (
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                Нове 2024
              </span>
            )}
            {is2024 && spell.differsFrom2014 && (
              <EditionAccentChip edition="2024">Змінено у 2024</EditionAccentChip>
            )}
          </div>
          <div className="text-xs font-mono text-slate-500 mt-0.5">[{spell.engName}]</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={cn(
            "glass-panel inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90",
            findAccentVariant(is2024, { prism: "hover:text-prism-300", arcane: "hover:text-arcane-300" })
          )}
          aria-label="Закрити"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Note / mechanical changes */}
      {is2024 && spell.note && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-prism-500/30 bg-prism-500/10 p-2 text-xs text-prism-200">
          <Info className="h-3.5 w-3.5 shrink-0 text-prism-400 mt-0.5" />
          <span>{spell.note}</span>
        </div>
      )}

      <div className="mt-2 rounded-xl bg-white/5 p-2 glass-panel border border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
            <span className="text-slate-300">{levelLabel(spell.level, normalizeFlag(spell.hasRitual))}</span>
            <span className="italic text-slate-300">{schoolLabel(spell.school)}</span>
          </div>

          <div
            className={cn(
              "min-w-0 max-w-[40%] flex-shrink text-right text-[10px] sm:text-xs truncate",
              findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-slate-400" })
            )}
          >
            {sourceLabel(spell.source)}
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2">
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Час використання</div>
          <div className="mt-0.5 text-[11px] sm:text-xs text-slate-200">{shortenCastingTime(spell.castingTime) || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Тривалість</div>
          <div className="mt-0.5 text-[11px] sm:text-xs text-slate-200">{spell.duration || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Дистанція</div>
          <div className="mt-0.5 text-[11px] sm:text-xs text-slate-200">{spell.range || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Компоненти</div>
          <div className="mt-0.5 text-[11px] sm:text-xs text-slate-200">{spell.components || "—"}</div>
        </div>
      </div>

      <div className="mt-3 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-2 sm:p-3 max-h-[35vh] overflow-y-auto max-w-full overflow-x-hidden">
        <FormattedDescription content={spell.description} className="text-slate-300 text-xs sm:text-[13px] break-words" />
      </div>

      <div className="mt-3 border-t border-slate-800/70 pt-2 text-[11px] sm:text-xs text-slate-300">
        <div>
          <span className="text-slate-400">Класи:</span> {classList.length ? classList.join(", ") : "—"}
        </div>
        {raceList.length > 0 && (
          <div className="mt-0.5">
            <span className="text-slate-400">Раси:</span> {raceList.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
