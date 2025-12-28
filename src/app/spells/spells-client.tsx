"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Filter,
  Printer,
  Search,
  UserPlus,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { Virtuoso } from "react-virtuoso";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

import { classTranslations, sourceTranslations, spellSchoolTranslations } from "@/lib/refs/translation";
import { getUserPersesSpellIndex } from "@/lib/actions/pers";
import { toggleSpellForPers } from "@/lib/actions/spell-actions";
import { useModalBackButton } from "@/hooks/useModalBackButton";

export type SpellListItem = {
  spellId: number;
  name: string;
  engName: string;
  level: number;
  school: string | null;
  castingTime: string;
  duration: string;
  range: string;
  components: string | null;
  description: string;
  source: string;
  hasRitual: string | null;
  hasConcentration: string | null;
  spellClasses: { className: string }[];
  spellRaces: { raceName: string | null }[];
};

type InitialSearchParams = Record<string, string | string[] | undefined>;

type SelectionState = {
  levels: Set<string>;
  classes: Set<string>;
  subclasses: Set<string>;
  schools: Set<string>;
  times: Set<string>;
  sources: Set<string>;
  ritual: boolean | null;
  conc: boolean | null;
  q: string;
  spell: string;
};

function getParamSet(params: URLSearchParams, key: string): Set<string> {
  const raw = params.get(key);
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );
}

function setParamSet(params: URLSearchParams, key: string, values: Set<string>) {
  const nextValues = Array.from(values).filter(Boolean);
  if (nextValues.length === 0) params.delete(key);
  else params.set(key, nextValues.join(","));
}

function setBoolParam(params: URLSearchParams, key: string, value: boolean | null) {
  if (value === null) params.delete(key);
  else params.set(key, value ? "1" : "0");
}

function getBoolParam(params: URLSearchParams, key: string): boolean | null {
  const raw = params.get(key);
  if (raw === null) return null;
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

function getSearchParamsFromLocation(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function parseSelectionFromParams(params: URLSearchParams): SelectionState {
  return {
    levels: getParamSet(params, "lvl"),
    classes: getParamSet(params, "cls"),
    subclasses: getParamSet(params, "sub"),
    schools: getParamSet(params, "sch"),
    times: getParamSet(params, "time"),
    sources: getParamSet(params, "src"),
    ritual: getBoolParam(params, "rit"),
    conc: getBoolParam(params, "conc"),
    q: params.get("q")?.trim().toLowerCase() || "",
    spell: params.get("spell")?.trim() || "",
  };
}

function initSelectionFromInitialSearchParams(initialSearchParams: InitialSearchParams): SelectionState {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(initialSearchParams)) {
    if (Array.isArray(value)) {
      const v = value[0];
      if (typeof v === "string") params.set(key, v);
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }
  return parseSelectionFromParams(params);
}

function replaceUrlSearchParams(next: URLSearchParams) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = next.toString();
  window.history.replaceState({}, "", url);
  const w = window as Window & { __locationchange_patched__?: boolean };
  if (w.__locationchange_patched__) return;
  const fire = () => window.dispatchEvent(new Event("locationchange"));
  if (typeof queueMicrotask === "function") queueMicrotask(fire);
  else window.setTimeout(fire, 0);
}

function pushUrlSearchParams(next: URLSearchParams) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = next.toString();
  window.history.pushState({}, "", url);
  const w = window as Window & { __locationchange_patched__?: boolean };
  if (w.__locationchange_patched__) return;
  const fire = () => window.dispatchEvent(new Event("locationchange"));
  if (typeof queueMicrotask === "function") queueMicrotask(fire);
  else window.setTimeout(fire, 0);
}

function selectionKey(sel: SelectionState): string {
  const key = (set: Set<string>) => Array.from(set).sort().join(",");
  return [
    `lvl=${key(sel.levels)}`,
    `cls=${key(sel.classes)}`,
    `sub=${key(sel.subclasses)}`,
    `sch=${key(sel.schools)}`,
    `time=${key(sel.times)}`,
    `src=${key(sel.sources)}`,
    `rit=${String(sel.ritual)}`,
    `conc=${String(sel.conc)}`,
    `q=${sel.q}`,
    `spell=${sel.spell}`,
  ].join("|");
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

function normalizeFlag(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return false;
  return v === "так" || v === "yes" || v === "true" || v === "1";
}

function flagsLabel(spell: Pick<SpellListItem, "hasRitual" | "hasConcentration">): string {
  const flags: string[] = [];
  if (normalizeFlag(spell.hasRitual)) flags.push("Ритуал");
  if (normalizeFlag(spell.hasConcentration)) flags.push("Концентрація");
  return flags.length ? flags.join(" • ") : "";
}

function splitClasses(values: string[]): { classes: string[]; subclasses: string[] } {
  const isSubclass = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v) return false;
    if (v.includes(":")) return true;
    if (v.includes("(")) return true;
    if (v.includes("-")) return true;
    // Most base classes are single words; multi-word entries are typically subclass lines.
    if (v.split(/\s+/).length > 1) return true;
    return false;
  };

  const classes: string[] = [];
  const subclasses: string[] = [];
  for (const v of values) {
    if (isSubclass(v)) subclasses.push(v);
    else classes.push(v);
  }
  return { classes, subclasses };
}

type PersIndexItem = {
  persId: number;
  name: string;
  spellIds: number[];
};

function SpellDetailPane({ spell }: { spell: SpellListItem }) {
  const classList = useMemo(() => {
    const uniq = new Set(spell.spellClasses.map((c) => c.className).filter(Boolean));
    return Array.from(uniq).sort((a, b) => a.localeCompare(b, "uk"));
  }, [spell.spellClasses]);

  const raceList = useMemo(() => {
    const uniq = new Set(spell.spellRaces.map((r) => r.raceName || "").filter(Boolean));
    return Array.from(uniq).sort((a, b) => a.localeCompare(b, "uk"));
  }, [spell.spellRaces]);

  return (
    <div className="glass-card border border-white/10 bg-slate-950/60 p-4 shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10 backdrop-blur-xl sm:p-6">
      <div className="min-w-0">
        <h2 className="font-sans text-xl font-semibold uppercase tracking-[0.16em] text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-violet-400 truncate">
          {spell.name}
        </h2>
      </div>

      <div className="mt-4 rounded-2xl bg-white/5 p-3 glass-panel border border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-slate-300">{levelLabel(spell.level, normalizeFlag(spell.hasRitual))}</span>
            <span className="italic text-slate-300">{schoolLabel(spell.school)}</span>
          </div>

          <div className="min-w-0 max-w-[45%] flex-shrink text-right text-xs text-slate-400 truncate">
            {sourceLabel(spell.source)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-3 glass-panel">
          <div className="text-xs text-slate-400">Час використання</div>
          <div className="mt-1 text-sm text-slate-200">{spell.castingTime || "—"}</div>
        </div>
        <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-3 glass-panel">
          <div className="text-xs text-slate-400">Тривалість</div>
          <div className="mt-1 text-sm text-slate-200">{spell.duration || "—"}</div>
        </div>
        <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-3 glass-panel">
          <div className="text-xs text-slate-400">Дистанція</div>
          <div className="mt-1 text-sm text-slate-200">{spell.range || "—"}</div>
        </div>
        <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-3 glass-panel">
          <div className="text-xs text-slate-400">Компоненти</div>
          <div className="mt-1 text-sm text-slate-200">{spell.components || "—"}</div>
        </div>
      </div>

      <div className="mt-5 glass-panel rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <FormattedDescription content={spell.description} className="text-slate-300" />
      </div>

      <div className="mt-5 border-t border-slate-800/70 pt-4 text-sm text-slate-300">
        <div>
          <span className="text-slate-400">Класи:</span> {classList.length ? classList.join(", ") : "—"}
        </div>
        <div className="mt-1">
          <span className="text-slate-400">Раси:</span> {raceList.length ? raceList.join(", ") : "—"}
        </div>
      </div>
    </div>
  );
}

function SpellbookDropdown({
  spellId,
  persIndex,
  setPersIndex,
}: {
  spellId: number;
  persIndex: PersIndexItem[] | null;
  setPersIndex: (value: PersIndexItem[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:text-teal-300"
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
            const has = p.spellIds.includes(spellId);
            const label = p.name || `Персонаж #${p.persId}`;
            return (
              <DropdownMenuItem
                key={p.persId}
                className="flex items-center justify-between gap-2"
                onSelect={async (e) => {
                  e.preventDefault();
                  const res = await toggleSpellForPers({ persId: p.persId, spellId });
                  if (!res.success) return;

                  setPersIndex(
                    (persIndex || []).map((item) =>
                      item.persId !== p.persId
                        ? item
                        : {
                            ...item,
                            spellIds: res.added
                              ? Array.from(new Set([...item.spellIds, spellId]))
                              : item.spellIds.filter((id) => id !== spellId),
                          }
                    )
                  );
                }}
              >
                <span className="truncate">{label}</span>
                {has ? <Check className="h-4 w-4 text-teal-400" /> : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SpellsClient({
  spells,
  initialSearchParams,
}: {
  spells: SpellListItem[];
  initialSearchParams: InitialSearchParams;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [persIndex, setPersIndex] = useState<PersIndexItem[] | null>(null);
  const [classFilter, setClassFilter] = useState("");
  const [subclassFilter, setSubclassFilter] = useState("");

  useModalBackButton(filtersOpen, () => setFiltersOpen(false));

  const [printIds, setPrintIds] = useState<number[]>([]);

  const initialQ = useMemo(() => {
    const raw = initialSearchParams.q;
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  }, [initialSearchParams.q]);

  const [qInput, setQInput] = useState(initialQ);
  const debounceRef = useRef<number | null>(null);

  const [selection, setSelection] = useState<SelectionState>(() =>
    initSelectionFromInitialSearchParams(initialSearchParams)
  );
  const selectionKeyRef = useRef<string>(selectionKey(initSelectionFromInitialSearchParams(initialSearchParams)));

  useEffect(() => {
    // Patch history methods once so we can react to other code using pushState/replaceState.
    const w = window as Window & { __locationchange_patched__?: boolean };
    if (typeof window !== "undefined" && !w.__locationchange_patched__) {
      w.__locationchange_patched__ = true;

      const dispatchLocationChangeAsync = () => {
        const fire = () => window.dispatchEvent(new Event("locationchange"));
        if (typeof queueMicrotask === "function") queueMicrotask(fire);
        else window.setTimeout(fire, 0);
      };

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

    const sync = () => {
      const next = parseSelectionFromParams(getSearchParamsFromLocation());
      const nextKey = selectionKey(next);
      if (nextKey !== selectionKeyRef.current) {
        selectionKeyRef.current = nextKey;
        setSelection(next);
      }

      // Keep input box in sync with URL too.
      const nextQ = next.q || "";
      setQInput((prev) => (prev === nextQ ? prev : nextQ));
    };

    window.addEventListener("popstate", sync);
    window.addEventListener("locationchange", sync);
    sync();

    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("locationchange", sync);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const next = getSearchParamsFromLocation();
      const trimmed = qInput.trim();
      if (!trimmed) next.delete("q");
      else next.set("q", trimmed);

      // Zero-latency: only update URL (no Next navigation).
      replaceUrlSearchParams(next);
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [qInput]);

  const filtered = useMemo(() => {
    return spells.filter((s) => {
      if (selection.q) {
        const hay = `${s.name} ${s.engName}`.toLowerCase();
        if (!hay.includes(selection.q)) return false;
      }

      if (selection.levels.size > 0) {
        if (!selection.levels.has(String(s.level))) return false;
      }

      if (selection.schools.size > 0) {
        if (!s.school || !selection.schools.has(s.school)) return false;
      }

      if (selection.sources.size > 0) {
        if (!selection.sources.has(s.source)) return false;
      }

      if (selection.times.size > 0) {
        if (!selection.times.has(s.castingTime)) return false;
      }

      if (selection.classes.size > 0) {
        const spellClasses = new Set(s.spellClasses.map((c) => c.className));
        let ok = false;
        for (const cls of selection.classes) {
          if (spellClasses.has(cls)) {
            ok = true;
            break;
          }
        }
        if (!ok) return false;
      }

      if (selection.subclasses.size > 0) {
        const spellClasses = new Set(s.spellClasses.map((c) => c.className));
        let ok = false;
        for (const sub of selection.subclasses) {
          if (spellClasses.has(sub)) {
            ok = true;
            break;
          }
        }
        if (!ok) return false;
      }

      if (selection.ritual !== null) {
        if (normalizeFlag(s.hasRitual) !== selection.ritual) return false;
      }

      if (selection.conc !== null) {
        if (normalizeFlag(s.hasConcentration) !== selection.conc) return false;
      }

      return true;
    });
  }, [spells, selection]);

  const grouped = useMemo(() => {
    const map = new Map<number, SpellListItem[]>();
    for (const s of filtered) {
      const arr = map.get(s.level) ?? [];
      arr.push(s);
      map.set(s.level, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [filtered]);

  const selectedSpell = useMemo(() => {
    const byParam = selection.spell
      ? spells.find((s) => String(s.spellId) === selection.spell || s.engName === selection.spell || s.name === selection.spell)
      : null;

    if (byParam) return byParam;
    return filtered[0] ?? null;
  }, [filtered, selection.spell, spells]);

  const setParams = (mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  };

  const pushParams = (mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    pushUrlSearchParams(next);
  };

  const toggleSetValue = (key: string, value: string) => {
    setParams((next) => {
      const set = getParamSet(next, key);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      setParamSet(next, key, set);
    });
  };

  const available = useMemo(() => {
    const classes = new Set<string>();
    const schools = new Set<string>();
    const times = new Set<string>();
    const sources = new Set<string>();
    const levels = new Set<number>();

    for (const s of spells) {
      levels.add(s.level);
      if (s.school) schools.add(s.school);
      times.add(s.castingTime);
      sources.add(s.source);
      for (const c of s.spellClasses) classes.add(c.className);
    }

    const split = splitClasses(Array.from(classes));

    return {
      levels: Array.from(levels).sort((a, b) => a - b),
      classes: split.classes.sort((a, b) => a.localeCompare(b, "uk")),
      subclasses: split.subclasses.sort((a, b) => a.localeCompare(b, "uk")),
      schools: Array.from(schools).sort((a, b) => a.localeCompare(b, "uk")),
      times: Array.from(times).sort((a, b) => a.localeCompare(b, "uk")),
      sources: Array.from(sources).sort((a, b) => a.localeCompare(b, "uk")),
    };
  }, [spells]);

  const clearFilters = () => {
    setParams((next) => {
      next.delete("lvl");
      next.delete("cls");
      next.delete("sub");
      next.delete("sch");
      next.delete("time");
      next.delete("src");
      next.delete("rit");
      next.delete("conc");
    });
  };

  const hasActiveFilters =
    selection.levels.size > 0 ||
    selection.classes.size > 0 ||
    selection.subclasses.size > 0 ||
    selection.schools.size > 0 ||
    selection.times.size > 0 ||
    selection.sources.size > 0 ||
    selection.ritual !== null ||
    selection.conc !== null;

  const onSelectSpell = (spell: SpellListItem) => {
    pushParams((next) => {
      next.set("spell", String(spell.spellId));
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("spell:open", {
          detail: { spellId: String(spell.spellId), spell },
        })
      );
    }
  };

  const baseTitleRef = useRef<string>("");
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!baseTitleRef.current) baseTitleRef.current = document.title;

    if (!selection.spell) {
      document.title = baseTitleRef.current;
      return;
    }

    const s = spells.find(
      (it) => String(it.spellId) === selection.spell || it.engName === selection.spell || it.name === selection.spell
    );
    if (s?.name) document.title = s.name;
  }, [selection.spell, spells]);

  const flatRows = useMemo(() => {
    return grouped.flatMap(([lvl, items]) => {
      return [
        { kind: "header" as const, lvl, count: items.length },
        ...items.map((spell) => ({ kind: "spell" as const, lvl, spell })),
      ];
    });
  }, [grouped]);

  const doPrint = () => {
    if (printIds.length === 0) return;
    const ids = encodeURIComponent(printIds.join(","));
    window.open(`/api/spells/print?ids=${ids}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="h-full w-full bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)]">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
            <div className="flex items-center gap-2 px-2 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Пошук заклинань…"
              className="border-0 bg-transparent text-slate-200 placeholder:text-slate-500 focus-visible:ring-0"
            />

            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              <Button
                type="button"
                variant="secondary"
                className={
                  "h-9 gap-2 border-0 bg-transparent hover:bg-white/5 " +
                  (hasActiveFilters ? "text-teal-200 bg-teal-500/10" : "")
                }
                onClick={() => setFiltersOpen(true)}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Фільтри</span>
              </Button>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 gap-2 border-0 bg-transparent hover:bg-white/5 text-slate-200"
                  onClick={clearFilters}
                  aria-label="Очистити фільтри"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Очистити</span>
                </Button>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                className="h-9 gap-2 border-0 bg-transparent hover:bg-white/5"
                onClick={doPrint}
                disabled={printIds.length === 0}
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Друк</span>
                <span className="text-xs text-slate-300">({printIds.length})</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid h-[calc(100vh-140px)] w-full max-w-6xl grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-5">
        <div className="lg:col-span-2 h-full">
          <div className="custom-scrollbar h-full">
            {grouped.length === 0 ? (
              <div className="glass-panel rounded-2xl border border-white/10 p-4 text-sm text-slate-400">
                Нічого не знайдено
              </div>
            ) : (
              <Virtuoso
                style={{ height: "100%" }}
                data={flatRows}
                itemContent={(index, row) => {
                  if (row.kind === "header") {
                    return (
                      <div className="pt-4 px-1">
                        <div className="glass-panel rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-base text-slate-200 backdrop-blur-xl">
                          <span className="font-semibold">{levelLabel(row.lvl, false)}</span>
                          <span className="ml-2 text-sm text-slate-400">({row.count})</span>
                        </div>
                      </div>
                    );
                  }

                  const spell = row.spell;
                  const active = selectedSpell?.spellId === spell.spellId;
                  const inPrint = printIds.includes(spell.spellId);

                  return (
                    <div className="pt-1.5 px-1">
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: active ? 1.005 : 1 }}
                        whileHover={{ scale: active ? 1.005 : 1.003 }}
                        transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
                        className={
                          "glass-panel group relative overflow-hidden rounded-xl border p-2 transition-all duration-300 " +
                          (active
                            ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7")
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => onSelectSpell(spell)}
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold tabular-nums text-violet-300">{spell.level}</span>
                              <span className="truncate text-sm font-semibold font-sans text-slate-100">
                                {spell.name}
                              </span>
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-400">
                              {schoolLabel(spell.school)} • {spell.castingTime} {flagsLabel(spell) ? "• " : ""}{flagsLabel(spell)}
                            </div>
                          </button>

                          <div className="flex flex-shrink-0 items-center gap-1">
                            <button
                              type="button"
                              className={
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition " +
                                (inPrint ? "text-teal-300" : "hover:text-teal-300")
                              }
                              onClick={() => {
                                setPrintIds((prev) =>
                                  prev.includes(spell.spellId)
                                    ? prev.filter((id) => id !== spell.spellId)
                                    : [...prev, spell.spellId]
                                );
                              }}
                              aria-label={inPrint ? "Прибрати з друку" : "Додати до друку"}
                            >
                              <Printer className="h-4 w-4" />
                            </button>

                            <SpellbookDropdown
                              spellId={spell.spellId}
                              persIndex={persIndex}
                              setPersIndex={setPersIndex}
                            />
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                }}
              />
            )}
          </div>
        </div>

        <div className="hidden lg:col-span-3 lg:block h-full overflow-hidden">
          <div className="custom-scrollbar h-full overflow-auto pr-1">
            {selectedSpell ? (
              <SpellDetailPane spell={selectedSpell} />
            ) : (
              <div className="glass-panel rounded-2xl border border-white/10 p-6 text-sm text-slate-400">
                Обери заклинання зі списку
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-3xl overflow-y-auto p-0" showClose={false}>
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="font-rpg-display text-2xl font-semibold tracking-wide text-teal-400">Фільтри</DialogTitle>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="glass-panel inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90 hover:text-teal-300"
                aria-label="Закрити"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">Рівні</div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {available.levels.map((lvl) => {
                      const active = selection.levels.has(String(lvl));
                      return (
                        <Badge
                          key={lvl}
                          variant={active ? "default" : "outline"}
                          className={active ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                          onClick={() => toggleSetValue("lvl", String(lvl))}
                          role="button"
                        >
                          {lvl}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">Класи</div>
                <div className="mt-2">
                  <Input
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    placeholder="Пошук класів…"
                    className="h-9 border-white/10 bg-slate-950/40 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {available.classes
                      .filter((cls) => {
                        const q = classFilter.trim().toLowerCase();
                        if (!q) return true;
                        const label = classTranslations[cls as keyof typeof classTranslations] || cls;
                        return `${cls} ${label}`.toLowerCase().includes(q);
                      })
                      .map((cls) => {
                    const active = selection.classes.has(cls);
                    const label = classTranslations[cls as keyof typeof classTranslations] || cls;
                    return (
                      <Badge
                        key={cls}
                        variant={active ? "default" : "outline"}
                        className={active ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                        onClick={() => toggleSetValue("cls", cls)}
                        role="button"
                      >
                        {label}
                      </Badge>
                    );
                  })}
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">Підкласи</div>
                <div className="mt-2">
                  <Input
                    value={subclassFilter}
                    onChange={(e) => setSubclassFilter(e.target.value)}
                    placeholder="Пошук підкласів…"
                    className="h-9 border-white/10 bg-slate-950/40 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {available.subclasses
                      .filter((sub) => {
                        const q = subclassFilter.trim().toLowerCase();
                        if (!q) return true;
                        const label = classTranslations[sub as keyof typeof classTranslations] || sub;
                        return `${sub} ${label}`.toLowerCase().includes(q);
                      })
                      .map((sub) => {
                        const active = selection.subclasses.has(sub);
                        const label = classTranslations[sub as keyof typeof classTranslations] || sub;
                        return (
                          <Badge
                            key={sub}
                            variant={active ? "default" : "outline"}
                            className={active ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                            onClick={() => toggleSetValue("sub", sub)}
                            role="button"
                          >
                            {label}
                          </Badge>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">Школи</div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {available.schools.map((sch) => {
                      const active = selection.schools.has(sch);
                      return (
                        <Badge
                          key={sch}
                          variant={active ? "default" : "outline"}
                          className={active ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                          onClick={() => toggleSetValue("sch", sch)}
                          role="button"
                        >
                          {spellSchoolTranslations[sch as keyof typeof spellSchoolTranslations] || sch}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">Час касту</div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {available.times.map((t) => {
                      const active = selection.times.has(t);
                      return (
                        <Badge
                          key={t}
                          variant={active ? "default" : "outline"}
                          className={active ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                          onClick={() => toggleSetValue("time", t)}
                          role="button"
                        >
                          {t}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">Джерела</div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {available.sources.map((src) => {
                      const active = selection.sources.has(src);
                      return (
                        <Badge
                          key={src}
                          variant={active ? "default" : "outline"}
                          className={active ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                          onClick={() => toggleSetValue("src", src)}
                          role="button"
                        >
                          {sourceLabel(src)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">Особливості</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    variant={selection.conc === true ? "default" : "outline"}
                    className={selection.conc === true ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                    onClick={() =>
                      setParams((next) =>
                        setBoolParam(next, "conc", selection.conc === true ? null : true)
                      )
                    }
                    role="button"
                  >
                    Концентрація
                  </Badge>
                  <Badge
                    variant={selection.ritual === true ? "default" : "outline"}
                    className={selection.ritual === true ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                    onClick={() =>
                      setParams((next) =>
                        setBoolParam(next, "rit", selection.ritual === true ? null : true)
                      )
                    }
                    role="button"
                  >
                    Ритуал
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="border border-white/10 bg-slate-900/40"
                  onClick={clearFilters}
                >
                  Очистити
                </Button>
                <Button
                  type="button"
                  className="bg-teal-500/15 text-teal-300 border border-teal-500/30"
                  onClick={() => setFiltersOpen(false)}
                >
                  Застосувати
                </Button>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Порада: відкрий заклинання з URL параметром <span className="text-slate-300">?spell=ID</span>.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
