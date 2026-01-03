"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getSpellById, type SpellData } from "@/lib/spellsData";
import { spellSchoolTranslations, sourceTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

// Helper functions (shared logic)
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

// Modal content component
function SpellModalCard({ spell, onClose }: { spell: SpellData; onClose: () => void }) {
  const classList = Array.from(
    new Set(spell.spellClasses.map((c) => c.className).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  const raceList = Array.from(
    new Set(spell.spellRaces.map((r) => r.raceName || "").filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  return (
    <div className="glass-card border border-white/10 bg-slate-950/60 p-3 shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10 backdrop-blur-xl sm:p-5 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex-1 min-w-0 font-sans text-base sm:text-lg font-semibold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-violet-400 truncate">
          {spell.name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="glass-panel inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90 hover:text-teal-300"
          aria-label="Закрити"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 rounded-xl bg-white/5 p-2 glass-panel border border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
            <span className="text-slate-300">{levelLabel(spell.level, normalizeFlag(spell.hasRitual))}</span>
            <span className="italic text-slate-300">{schoolLabel(spell.school)}</span>
          </div>

          <div className="min-w-0 max-w-[40%] flex-shrink text-right text-[10px] sm:text-xs text-slate-400 truncate">
            {sourceLabel(spell.source)}
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2">
        <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 glass-panel">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Час використання</div>
          <div className="mt-0.5 text-[11px] sm:text-xs text-slate-200">{spell.castingTime || "—"}</div>
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

// Render the modal with spell
function SpellModalRenderer({ spellId }: { spellId: string }) {
  const router = useRouter();
  const spell = getSpellById(Number(spellId));

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  if (!spell) {
    // If spell not found, close modal and go back
    router.back();
    return null;
  }

  return (
    <Dialog enableBackButtonClose={false} open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-h-[90vh] w-[92vw] max-w-xl overflow-y-auto overflow-x-hidden p-0 border-0 bg-transparent" 
        showClose={false}
      >
        <DialogTitle className="sr-only">{spell.name}</DialogTitle>
        <SpellModalCard spell={spell} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}

// Page component with async params (Next.js 15)
export default function SpellModalPage({
  params,
}: {
  params: Promise<{ spellId: string }>;
}) {
  const resolvedParams = use(params);
  return <SpellModalRenderer spellId={resolvedParams.spellId} />;
}

