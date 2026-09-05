"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, UserPlus } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { useParams } from "next/navigation";
import { setSpellPresenceForPersByLink } from "@/lib/actions/spell-actions";
import { getUserPersesSpellIndex } from "@/lib/actions/pers";
import { findSpellForModal } from "@/lib/spell-catalog-chunk";
import type { SpellData } from "@/lib/spellsData";
import { shortenCastingTime } from "@/lib/spell-casting-time";
import type { Ruleset } from "@prisma/client";
import {
  buildSpellLinkForSpell,
  buildSpellSlug,
  closeSpellLink,
  dispatchLocationChange,
  findSpellLinkInSearch,
  isSameSpellLink,
  type SpellLink,
} from "@/lib/spell-link";
import { sourceTranslations, spellSchoolTranslations } from "@/lib/refs/translation";
import { useModalBackButton } from "@/hooks/useModalBackButton";

function findSpellLinkInLocation(): SpellLink | null {
  if (typeof window === "undefined") return null;
  return findSpellLinkInSearch(window.location.search);
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
  return Array.from(new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "uk"));
}

function ritualForSpell(spell: SpellData | null): boolean {
  return spell ? isYesFlag(spell.hasRitual) : false;
}

type SpellOpenDetail = {
  spellId?: unknown;
  ruleset?: unknown;
  spell?: unknown;
};

function isSpellDataLike(value: unknown): value is SpellData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.spellId === "number" && typeof v.name === "string" && typeof v.engName === "string" &&
    typeof v.level === "number" && typeof v.castingTime === "string" && typeof v.duration === "string" &&
    typeof v.range === "string" && typeof v.description === "string" && typeof v.source === "string" &&
    Array.isArray(v.spellClasses) && Array.isArray(v.spellRaces)
  );
}

function findRulesetInDetail(detail: { ruleset?: unknown } | null | undefined): Ruleset {
  return detail?.ruleset === "RULES_2024" ? "RULES_2024" : "RULES_2014";
}

function matchesLoadedSpell(spell: SpellData, link: SpellLink): boolean {
  if ((spell.ruleset ?? "RULES_2014") !== link.ruleset) return false;
  return (
    String(spell.spellId) === link.spellKey ||
    buildSpellSlug(spell.engName) === link.spellKey ||
    spell.engName === link.spellKey ||
    spell.name === link.spellKey
  );
}

type PersIndexItem = {
  persId: number;
  name: string;
  spellIds: number[];
  spellKeys: string[];
};

function hasSpellLink(pers: PersIndexItem, link: SpellLink): boolean {
  return pers.spellKeys.includes(link.spellKey);
}

function notifyEmbeddingSheet(persId: number, spellId: number, spellLevel: number | undefined, added: boolean) {
  if (window.parent === window) return;
  window.parent.postMessage({ type: "SPELL_TOGGLED", persId, spellId, spellLevel, added }, "*");
}

function AddToPersDropdown({ link, spellLevel }: { link: SpellLink; spellLevel?: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [persIndex, setPersIndex] = useState<PersIndexItem[] | null>(null);

  useModalBackButton(open, () => setOpen(false));

  const load = async () => {
    if (persIndex) return;
    setLoading(true);
    try {
      const data = await getUserPersesSpellIndex();
      setPersIndex(data);
    } finally {
      setLoading(false);
    }
  };

  const toggleForPers = async (pers: PersIndexItem) => {
    const present = !hasSpellLink(pers, link);
    const res = await setSpellPresenceForPersByLink({ persId: pers.persId, link, present });
    if (!res.success) return;

    setPersIndex(
      (persIndex || []).map((item) =>
        item.persId !== pers.persId
          ? item
          : {
              ...item,
              spellKeys: res.present
                ? Array.from(new Set([...item.spellKeys, link.spellKey]))
                : item.spellKeys.filter((key) => key !== link.spellKey),
            }
      )
    );
    notifyEmbeddingSheet(pers.persId, res.spellId, spellLevel, res.present);
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:text-arcane-300"
          aria-label="Додати до персонажа"
        >
          <UserPlus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Додати до персонажа</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="px-2 py-2 text-xs text-slate-400 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Завантаження…
          </div>
        ) : persIndex && persIndex.length === 0 ? (
          <div className="px-2 py-2 text-xs text-slate-400">Немає персонажів</div>
        ) : (
          persIndex?.map((p) => {
            const has = hasSpellLink(p, link);
            const label = p.name || `Персонаж #${p.persId}`;
            return (
              <DropdownMenuItem
                key={p.persId}
                className="flex items-center justify-between gap-2"
                onSelect={async (e) => {
                  e.preventDefault();
                  await toggleForPers(p);
                }}
              >
                <span className="truncate">{label}</span>
                {has ? <Check className="h-4 w-4 text-arcane-400" /> : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddToSinglePersButton({ link, persId, spellLevel }: { link: SpellLink; persId: number; spellLevel?: number }) {
  const [loading, setLoading] = useState(false);
  const [has, setHas] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      setLoading(true);
      try {
        const data = await getUserPersesSpellIndex();
        const p = data.find((item) => item.persId === persId);
        setHas(p ? hasSpellLink(p, link) : false);
      } finally {
        setLoading(false);
      }
    }
    void check();
  }, [link, persId]);

  const handleToggle = async () => {
    if (loading) return;
    const nextHas = !has;
    setLoading(true);
    try {
      const res = await setSpellPresenceForPersByLink({ persId, link, present: nextHas });
      if (res.success) {
        setHas(res.present);
        notifyEmbeddingSheet(persId, res.spellId, spellLevel, res.present);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:text-arcane-300 disabled:opacity-50"
      aria-label="Додати до персонажа"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : has ? (
        <Check className="h-4 w-4 text-arcane-400" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
    </button>
  );
}

export function SpellInfoModal() {
  const params = useParams();
  const currentPersId = params?.id ? Number(params.id) : null;
  const isIdValid = currentPersId !== null && !isNaN(currentPersId);

  const [spellLink, setSpellLink] = useState<SpellLink | null>(() => findSpellLinkInLocation());
  const isSpellCatalogPage = typeof window !== "undefined" && (
    window.location.pathname === "/spells" ||
    window.location.pathname === "/2024/spells" ||
    window.location.pathname.endsWith("/spells")
  );
  const open = Boolean(spellLink) && !isSpellCatalogPage;

  const [spell, setSpell] = useState<SpellData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySpellLink = (next: SpellLink | null) =>
    setSpellLink((prev) => (isSameSpellLink(prev, next) ? prev : next));

  useEffect(() => {
    // Patch history methods once so we can react to router pushes too.
    const w = window as Window & { __locationchange_patched__?: boolean };
    if (typeof window !== "undefined" && !w.__locationchange_patched__) {
      w.__locationchange_patched__ = true;

      const wrap = (type: "pushState" | "replaceState") => {
        const original = window.history[type];
        return function (this: History, ...args: unknown[]) {
          const result = (original as unknown as (...a: unknown[]) => unknown).apply(this, args);
          dispatchLocationChange();
          return result;
        };
      };

      window.history.pushState = wrap("pushState");
      window.history.replaceState = wrap("replaceState");
    }

    const syncFromUrl = () => applySpellLink(findSpellLinkInLocation());

    const onSpellOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as SpellOpenDetail | undefined;

      const fromSpellObj = detail?.spell && isSpellDataLike(detail.spell) ? detail.spell : null;
      const rawId = fromSpellObj ? String(fromSpellObj.spellId) : detail?.spellId;
      const spellKey = typeof rawId === "string" ? rawId : String(rawId ?? "");
      const ruleset = findRulesetInDetail(fromSpellObj ?? detail);

      if (fromSpellObj) {
        setSpell(fromSpellObj);
        setLoading(false);
        setError(null);
      }

      if (spellKey && spellKey !== "undefined" && spellKey !== "null") {
        applySpellLink({ spellKey, ruleset });
      }
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
      if (!spellLink) {
        setSpell(null);
        setError(null);
        setLoading(false);
        return;
      }

      // If we already have a full spell object (e.g. received from /spells list), skip the fetch.
      if (spell && matchesLoadedSpell(spell, spellLink)) {
        setLoading(false);
        setError(null);
        return;
      }

      // Open instantly with skeleton while we fetch.
      setSpell(null);
      setLoading(true);
      setError(null);

      try {
        const result = await findSpellForModal(spellLink);
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
  }, [spellLink, spell]);

  const onClose = () => {
    closeSpellLink();
    setSpellLink(null);
  };

  const spellLinkForPers = useMemo(() => (spell ? buildSpellLinkForSpell(spell) : null), [spell]);

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
            <DialogTitle className="min-w-0 font-sans text-lg sm:text-xl font-semibold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-arcane-400 to-violet-400">
              {spell?.name ?? (loading ? "Завантаження…" : "Заклинання")}
            </DialogTitle>
            {spell && spellLinkForPers && (
              isIdValid
                ? <AddToSinglePersButton link={spellLinkForPers} persId={currentPersId as number} spellLevel={spell.level} />
                : <AddToPersDropdown link={spellLinkForPers} spellLevel={spell.level} />
            )}
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
              <div className="mt-0.5 text-xs sm:text-sm text-slate-200 font-medium">{shortenCastingTime(spell?.castingTime) || "—"}</div>
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
