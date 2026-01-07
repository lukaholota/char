"use client";

import { useEffect, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { getSpellForModal, type SpellForModal } from "@/lib/actions/spell-actions";
import { sourceTranslations, spellSchoolTranslations } from "@/lib/refs/translation";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

function dispatchLocationChangeAsync() {
  if (typeof window === "undefined") return;
  const fire = () => window.dispatchEvent(new Event("locationchange"));
  if (typeof queueMicrotask === "function") queueMicrotask(fire);
  else window.setTimeout(fire, 0);
}

function getSpellParamFromLocation(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("spell")?.trim() || "";
}

function clearSpellParamInUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("spell");
  window.history.pushState({}, "", url);
  dispatchLocationChangeAsync();
}

function isYesFlag(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return false;
  return v === "так" || v === "yes" || v === "true" || v === "1";
}

function labelForLevel(level: number, isRitual: boolean) {
  const base = level === 0 ? "Замовляння" : `Рівень ${level}`;
  return isRitual ? `${base} (ритуал)` : base;
}

function uniqSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));
}

function ritualForSpell(spell: SpellForModal | null): boolean {
  return spell ? isYesFlag(spell.hasRitual) : false;
}

type SpellOpenDetail = {
  spellId?: unknown;
  spell?: unknown;
};

function isSpellForModalLike(value: unknown): value is SpellForModal {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.spellId === "number" &&
    typeof v.name === "string" &&
    typeof v.engName === "string" &&
    typeof v.level === "number" &&
    typeof v.castingTime === "string" &&
    typeof v.duration === "string" &&
    typeof v.range === "string" &&
    typeof v.description === "string" &&
    typeof v.source === "string" &&
    Array.isArray(v.spellClasses) &&
    Array.isArray(v.spellRaces)
  );
}

export function SpellInfoModal() {
  const isLg = useMediaQuery("(min-width: 1024px)");

  const [spellParam, setSpellParam] = useState<string>(() => getSpellParamFromLocation());
  const open = Boolean(spellParam) && !(isLg && typeof window !== "undefined" && window.location.pathname === "/spells");

  const [spell, setSpell] = useState<SpellForModal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Patch history methods once so we can react to router pushes too.
    const w = window as Window & { __locationchange_patched__?: boolean };
    if (typeof window !== "undefined" && !w.__locationchange_patched__) {
      w.__locationchange_patched__ = true;

      const wrap = (type: "pushState" | "replaceState") => {
        const original = window.history[type];
        return function (this: History, ...args: unknown[]) {
          const result = (original as unknown as (...a: unknown[]) => unknown).apply(this, args);
          dispatchLocationChangeAsync();
          return result;
        };
      };

      window.history.pushState = wrap("pushState");
      window.history.replaceState = wrap("replaceState");
    }

    const syncFromUrl = () => {
      const next = getSpellParamFromLocation();
      setSpellParam(next);
    };

    const onSpellOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as SpellOpenDetail | undefined;

      const fromSpellObj = detail?.spell && isSpellForModalLike(detail.spell) ? detail.spell : null;
      const rawId = fromSpellObj ? String(fromSpellObj.spellId) : detail?.spellId;
      const next = typeof rawId === "string" ? rawId : String(rawId ?? "");

      if (fromSpellObj) {
        setSpell(fromSpellObj);
        setLoading(false);
        setError(null);
      }

      if (next && next !== "undefined" && next !== "null") setSpellParam(next);
    };

    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("locationchange", syncFromUrl);
    window.addEventListener("spell:open", onSpellOpen);

    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("locationchange", syncFromUrl);
      window.removeEventListener("spell:open", onSpellOpen);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!spellParam) {
        setSpell(null);
        setError(null);
        setLoading(false);
        return;
      }

      // If we already have a full spell object (e.g. received from /spells list), skip DB fetch.
      if (
        spell &&
        (String(spell.spellId) === spellParam || spell.engName === spellParam || spell.name === spellParam)
      ) {
        setLoading(false);
        setError(null);
        return;
      }

      // Open instantly with skeleton while we fetch.
      setSpell(null);
      setLoading(true);
      setError(null);

      try {
        const result = await getSpellForModal(spellParam);
        if (cancelled) return;

        if (!result) {
          setSpell(null);
          setError("Заклинання не знайдено");
          return;
        }

        setSpell(result);
      } catch {
        if (cancelled) return;
        setSpell(null);
        setError("Не вдалося завантажити заклинання");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [spellParam, spell]);

  const onClose = () => {
    clearSpellParamInUrl();
    setSpellParam("");
  };

  const schoolLabel = useMemo(() => {
    if (!spell?.school) return null;
    return spellSchoolTranslations[spell.school as keyof typeof spellSchoolTranslations] || spell.school;
  }, [spell?.school]);

  const sourceLabel = useMemo(() => {
    if (!spell?.source) return null;
    return sourceTranslations[spell.source as keyof typeof sourceTranslations] || spell.source;
  }, [spell?.source]);

  const classList = useMemo(() => {
    if (!spell) return [];
    return uniqSorted(spell.spellClasses.map((c) => c.className));
  }, [spell]);

  const raceList = useMemo(() => {
    if (!spell) return [];
    return uniqSorted(spell.spellRaces.map((r) => r.raceName));
  }, [spell]);

  return (
    <Dialog
      enableBackButtonClose={false}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto p-0 bg-gradient-to-b from-slate-950/18 to-slate-950/12"
      >
        <div className="px-4 py-5 sm:p-6 min-w-0">
          <div className="flex items-start justify-between gap-3 pr-6 sm:pr-0">
            <DialogTitle className="min-w-0 font-sans text-lg sm:text-xl font-semibold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-violet-400">
              {spell?.name ?? (loading ? "Завантаження…" : "Заклинання")}
            </DialogTitle>
          </div>

          <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-slate-800/40 p-2 sm:p-3 glass-panel">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px] text-slate-200/90">
                <span className="text-slate-200 font-medium">{spell ? labelForLevel(spell.level, ritualForSpell(spell)) : ""}</span>
                {schoolLabel ? <span className="italic text-slate-300/80">{schoolLabel}</span> : null}
              </div>
              {sourceLabel ? (
                <div className="min-w-0 max-w-[45%] flex-shrink text-right text-xs text-slate-400 truncate">
                  {sourceLabel}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:gap-3">
            <div className="glass-panel rounded-lg bg-slate-900/40 border border-white/5 p-2 sm:p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Час використання</div>
              <div className="mt-0.5 text-xs sm:text-sm text-slate-200 font-medium">{spell?.castingTime ?? "—"}</div>
            </div>
            <div className="glass-panel rounded-lg bg-slate-900/40 border border-white/5 p-2 sm:p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Тривалість</div>
              <div className="mt-0.5 text-xs sm:text-sm text-slate-200 font-medium">{spell?.duration ?? "—"}</div>
            </div>
            <div className="glass-panel rounded-lg bg-slate-900/40 border border-white/5 p-2 sm:p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Дистанція</div>
              <div className="mt-0.5 text-xs sm:text-sm text-slate-200 font-medium">{spell?.range ?? "—"}</div>
            </div>
            <div className="glass-panel rounded-lg bg-slate-900/40 border border-white/5 p-2 sm:p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Компоненти</div>
              <div className="mt-0.5 text-xs sm:text-sm text-slate-200 font-medium">{spell?.components ?? "—"}</div>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="glass-panel rounded-lg border border-slate-700/50 p-3 sm:p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-2/3 rounded bg-slate-700/40" />
                  <div className="h-4 w-full rounded bg-slate-700/30" />
                  <div className="h-4 w-5/6 rounded bg-slate-700/30" />
                </div>
                <div className="mt-3 text-xs text-slate-400">Завантаження…</div>
              </div>
            ) : error ? (
              <div className="glass-panel rounded-lg border border-slate-700/50 p-3 sm:p-4 text-sm text-slate-300">
                {error}
              </div>
            ) : spell ? (
              <div className="glass-panel rounded-lg border border-slate-700/50 p-3 sm:p-4 bg-slate-900/20">
                <FormattedDescription content={spell.description} className="text-slate-300 text-[14px] sm:text-base break-words leading-relaxed" />
              </div>
            ) : null}
          </div>

          {spell ? (
            <div className="mt-4 border-t border-slate-800/70 pt-3 text-[13px] text-slate-400">
              <div>
                <span className="text-slate-500">Класи:</span> <span className="text-slate-300">{classList.length ? classList.join(", ") : "—"}</span>
              </div>
              
              {raceList.length ? (
                <div className="mt-1">
                <span className="text-slate-500">Раси:</span> <span className="text-slate-300">{raceList.length ? raceList.join(", ") : "—"}</span>
              </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
