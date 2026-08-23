"use client";

import { useMemo, useState } from "react";
import {
  Printer,
  UserPlus,
  Check,
  Loader2,
  Trash2,
  Wand2,
  Sparkles,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  classTranslations,
  classTranslationsEng,
  sourceTranslations,
  spellSchoolTranslations,
  subclassTranslations,
} from "@/lib/refs/translation";
import { subclassParentClass } from "@/lib/refs/subclassMapping";
import { getUserPersesSpellIndex } from "@/lib/actions/pers";
import { setSpellPresenceForPers } from "@/lib/actions/spell-actions";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import {
  getParamSet,
  setParamSet,
  getBoolParam,
  setBoolParam,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
} from "@/lib/catalog-url-helpers";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { getSpellSchoolVisual } from "@/components/catalogs/catalog-visuals";
import { SpellDetailCard } from "@/components/spells/SpellDetailCard";
import { SpellModalCard } from "@/components/spells/SpellModalCard";
import { SpellsFilterDialog } from "@/components/spells/SpellsFilterDialog";
import { SpellData } from "@/lib/spellsData";
import { Ruleset } from "@prisma/client";
import { cn } from "@/lib/utils";

const BASE_CLASS_NAMES_UA: Set<string> = new Set<string>(Object.values(classTranslations));
const CLASS_KEY_TO_UA: Record<string, string> = classTranslations as unknown as Record<string, string>;

const CLASS_ENG_TO_UA: Record<string, string> = Object.fromEntries(
  Object.entries(classTranslationsEng as unknown as Record<string, string>).map(([key, eng]) => [
    eng,
    CLASS_KEY_TO_UA[key] || eng,
  ])
);

const SUBCLASS_FILTER_FALLBACK_CLASS: Record<string, string> = {
  [subclassTranslations.ELDRITCH_KNIGHT]: classTranslations.WIZARD_2014,
  [subclassTranslations.ARCANE_TRICKSTER]: classTranslations.WIZARD_2014,
};

function normalizeBaseClassValue(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  if (BASE_CLASS_NAMES_UA.has(v)) return v;
  if (v in CLASS_KEY_TO_UA) return CLASS_KEY_TO_UA[v];
  if (v in CLASS_ENG_TO_UA) return CLASS_ENG_TO_UA[v];
  return v;
}

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
  kind?: "new" | "changed" | "same";
  differsFrom2014?: boolean;
  note?: string | null;
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

type EmbedParams = {
  origin: string | null;
  persId: number | null;
  persName: string | null;
  maxSpellLevel: number | null;
  knownTarget: number | null;
  cantripTarget: number | null;
  knownExcluded: Set<number>;
};

function parseEmbedParams(params: URLSearchParams): EmbedParams {
  const origin = params.get("origin");
  const persIdRaw = params.get("persId");
  const persId = persIdRaw ? parseInt(persIdRaw, 10) : null;
  const persName = params.get("persName");
  const maxSpellLevel = params.get("maxSpellLevel") ? parseInt(params.get("maxSpellLevel")!, 10) : null;
  const knownTarget = params.get("knownTarget") ? parseInt(params.get("knownTarget")!, 10) : null;
  const cantripTarget = params.get("cantripTarget") ? parseInt(params.get("cantripTarget")!, 10) : null;
  const knownExcludedRaw = params.get("knownExcluded") || "";
  const knownExcluded = new Set(
    knownExcludedRaw
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v) && v > 0)
  );
  return {
    origin,
    persId: Number.isFinite(persId) ? persId : null,
    persName,
    maxSpellLevel: Number.isFinite(maxSpellLevel) ? maxSpellLevel : null,
    knownTarget: Number.isFinite(knownTarget) ? knownTarget : null,
    cantripTarget: Number.isFinite(cantripTarget) ? cantripTarget : null,
    knownExcluded,
  };
}

const parseSelection = (params: URLSearchParams): SelectionState => {
  return {
    levels: getParamSet(params, "lvl"),
    classes: getParamSet(params, "cls"),
    subclasses: getParamSet(params, "sub"),
    schools: getParamSet(params, "sch"),
    times: getParamSet(params, "time"),
    sources: getParamSet(params, "src"),
    ritual: getBoolParam(params, "rit"),
    conc: getBoolParam(params, "conc"),
    q: params.get("q") ?? "",
    spell: params.get("spell")?.trim() || "",
  };
};

function isYesFlag(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return false;
  return v === "так" || v === "yes" || v === "true" || v === "1";
}

function levelHeaderLabel(level: number) {
  return level === 0 ? "Замовляння" : `Рівень ${level}`;
}

function schoolLabel(school: string | null) {
  if (!school) return "";
  return spellSchoolTranslations[school as keyof typeof spellSchoolTranslations] || school;
}

type PersIndexItem = {
  persId: number;
  name: string;
  spellIds: number[];
};

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
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:text-teal-300"
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
                className="flex items-center justify-between gap-2 cursor-pointer"
                onSelect={async (e) => {
                  e.preventDefault();
                  const nextPresence = !has;
                  const res = await setSpellPresenceForPers({
                    persId: p.persId,
                    spellId,
                    present: nextPresence,
                  });
                  if (!res.success) return;

                  setPersIndex(
                    (persIndex || []).map((item) =>
                      item.persId !== p.persId
                        ? item
                        : {
                            ...item,
                            spellIds: nextPresence
                              ? [...item.spellIds, spellId]
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

type RowItem =
  | { kind: "header"; level: number; count: number }
  | { kind: "spell"; spell: SpellListItem };

export function SpellsClient({
  spells,
  initialSearchParams = {},
  ruleset = "RULES_2014",
}: {
  spells: SpellListItem[];
  initialSearchParams?: InitialSearchParams;
  ruleset?: Ruleset | string;
}) {
  const is2024 = ruleset === "RULES_2024";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [persIndex, setPersIndex] = useState<PersIndexItem[] | null>(null);
  const [selectedModalSpell, setSelectedModalSpell] = useState<SpellListItem | null>(null);
  const [printIds, setPrintIds] = useState<number[]>([]);

  // Embed mode state
  const [embedParams] = useState<EmbedParams>(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(initialSearchParams)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (typeof v === "string") params.set(key, v);
    }
    return parseEmbedParams(params);
  });
  const isEmbedMode = embedParams.origin === "character" && embedParams.persId !== null;

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    initialSearchParams,
    parseSelection
  );

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return spells.filter((spell) => {
      if (q) {
        const hay = `${spell.name} ${spell.engName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selection.levels.size > 0 && !selection.levels.has(String(spell.level))) {
        return false;
      }

      if (selection.schools.size > 0 && (!spell.school || !selection.schools.has(spell.school))) {
        return false;
      }

      if (selection.times.size > 0 && !selection.times.has(spell.castingTime)) {
        return false;
      }

      if (selection.sources.size > 0 && !selection.sources.has(spell.source)) {
        return false;
      }

      if (selection.ritual !== null && isYesFlag(spell.hasRitual) !== selection.ritual) {
        return false;
      }

      if (selection.conc !== null && isYesFlag(spell.hasConcentration) !== selection.conc) {
        return false;
      }

      if (selection.classes.size > 0) {
        const hasClass = spell.spellClasses.some((c) =>
          selection.classes.has(normalizeBaseClassValue(c.className))
        );
        if (!hasClass) return false;
      }

      if (selection.subclasses.size > 0) {
        const hasSubclass = spell.spellClasses.some((c) => selection.subclasses.has(c.className));
        if (!hasSubclass) return false;
      }

      return true;
    });
  }, [spells, selection]);

  const selectedSpell = useMemo(() => {
    if (selection.spell) {
      const byParam = spells.find(
        (s) =>
          String(s.spellId) === selection.spell ||
          s.engName.toLowerCase() === selection.spell.toLowerCase() ||
          s.name.toLowerCase() === selection.spell.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, selection.spell, spells]);

  const setParams = (mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
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
    const levels = new Set<number>();
    const classes = new Set<string>();
    const subclasses = new Set<string>();
    const schools = new Set<string>();
    const times = new Set<string>();
    const sources = new Set<string>();

    for (const s of spells) {
      levels.add(s.level);
      if (s.school) schools.add(s.school);
      if (s.castingTime) times.add(s.castingTime);
      if (s.source) sources.add(s.source);

      for (const c of s.spellClasses) {
        const norm = normalizeBaseClassValue(c.className);
        if (norm) classes.add(norm);
        if (!BASE_CLASS_NAMES_UA.has(c.className)) subclasses.add(c.className);
      }
    }

    const subclassesByClass: { className: string; subclasses: string[] }[] = [];
    const groupedSubs = new Map<string, string[]>();
    for (const sub of subclasses) {
      const parent = subclassParentClass[sub] || SUBCLASS_FILTER_FALLBACK_CLASS[sub] || "Інші";
      const arr = groupedSubs.get(parent) ?? [];
      arr.push(sub);
      groupedSubs.set(parent, arr);
    }
    for (const [clsName, subs] of groupedSubs.entries()) {
      subclassesByClass.push({
        className: clsName,
        subclasses: subs.sort((a, b) => a.localeCompare(b, "uk")),
      });
    }

    return {
      levels: Array.from(levels).sort((a, b) => a - b),
      classes: Array.from(classes).sort((a, b) => a.localeCompare(b, "uk")),
      subclassesByClass,
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

  const doPrint = () => {
    if (printIds.length === 0) return;
    const ids = encodeURIComponent(printIds.join(","));
    window.open(`/api/spells/print?ids=${ids}`, "_blank", "noopener,noreferrer");
  };

  const flatRows = useMemo<RowItem[]>(() => {
    const grouped = new Map<number, SpellListItem[]>();
    for (const spell of filtered) {
      const arr = grouped.get(spell.level) ?? [];
      arr.push(spell);
      grouped.set(spell.level, arr);
    }

    const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b);
    return sortedLevels.flatMap((lvl) => {
      const list = grouped.get(lvl) || [];
      list.sort((a, b) => a.name.localeCompare(b.name, "uk"));
      return [
        { kind: "header" as const, level: lvl, count: list.length },
        ...list.map((spell) => ({ kind: "spell" as const, spell })),
      ];
    });
  }, [filtered]);

  return (
    <ContentListPage<SpellListItem, RowItem>
      title={is2024 ? "Заклинання 2024" : "Заклинання"}
      is2024={is2024}
      topBanner={
        isEmbedMode && (
          <div className="mb-4 rounded-xl border border-teal-500/30 bg-teal-500/10 p-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm text-teal-200">
              <UserPlus className="h-4 w-4" />
              <span>
                Додавання заклинань для <strong>{embedParams.persName || `персонажа #${embedParams.persId}`}</strong>
              </span>
            </div>
          </div>
        )
      }
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук заклинань..."
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={
        selection.levels.size +
        selection.classes.size +
        selection.subclasses.size +
        selection.schools.size +
        selection.times.size +
        selection.sources.size +
        (selection.ritual !== null ? 1 : 0) +
        (selection.conc !== null ? 1 : 0)
      }
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      headerActions={
        !isEmbedMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-white/10 bg-slate-900/60 text-xs"
                disabled={printIds.length === 0}
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Друк</span>
                <span className="text-xs text-slate-400">({printIds.length})</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Обрано заклинань: {printIds.length}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doPrint} className="gap-2 cursor-pointer">
                <Printer className="h-4 w-4" />
                <span>Друкувати</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setPrintIds([])}
                className="gap-2 text-red-300 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Очистити список</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
      data={flatRows}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Wand2 className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Заклинань не знайдено</p>
          <p className="text-xs text-slate-500 mt-1">Спробуйте змінити фільтри або пошуковий запит</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, row) => {
        if (row.kind === "header") {
          return (
            <div className="pt-3 pb-1 px-1">
              <div
                className={cn(
                  "rounded-xl border bg-slate-900/70 px-3.5 py-2 text-slate-200 backdrop-blur-xl flex items-center justify-between shadow-sm",
                  is2024 ? "border-amber-500/20" : "border-teal-500/20"
                )}
              >
                <span
                  className={cn(
                    "font-sans text-sm sm:text-base font-semibold tracking-wide text-transparent bg-clip-text",
                    is2024
                      ? "bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400"
                      : "bg-gradient-to-r from-teal-300 via-teal-100 to-teal-400"
                  )}
                >
                  {levelHeaderLabel(row.level)}
                </span>
                <span className="text-xs font-mono font-medium text-slate-400">({row.count})</span>
              </div>
            </div>
          );
        }

        const spell = row.spell;
        const isSelected = selectedSpell?.spellId === spell.spellId;
        const inPrint = printIds.includes(spell.spellId);
        const visual = getSpellSchoolVisual(spell.school);
        const Icon = visual.icon;

        return (
          <div key={spell.spellId} className="pt-2 pb-0.5 px-0.5">
            <div
              onClick={() => {
                setParams((next) => next.set("spell", String(spell.spellId)));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalSpell(spell);
                }
              }}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-xl border p-3 transition-all duration-300 cursor-pointer",
                isSelected
                  ? is2024
                    ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-amber-400/40"
                    : "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-teal-400/40"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left school icon badge */}
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", visual.iconWrap)}>
                  <Icon className={cn("h-5 w-5", visual.iconColor)} />
                </div>

                {/* Center spell info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "truncate text-[15px] font-semibold transition-colors",
                        isSelected
                          ? is2024 ? "text-amber-300" : "text-teal-300"
                          : "text-slate-100 group-hover:text-white"
                      )}
                    >
                      {spell.name} {spell.engName && <span className="font-normal text-slate-400 text-sm ml-1">[{spell.engName}]</span>}
                    </span>
                    {is2024 && spell.kind === "new" && (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shrink-0">
                        Нове
                      </span>
                    )}
                    {is2024 && spell.differsFrom2014 && (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-300 shrink-0">
                        Змінено
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                      {spell.level === 0 ? "Замовляння" : `Рівень ${spell.level}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                      {spell.castingTime || "—"}
                    </span>
                    {spell.school && (
                      <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium border", visual.badgeClass)}>
                        {schoolLabel(spell.school)}
                      </span>
                    )}
                    {isYesFlag(spell.hasRitual) && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                        Ритуал
                      </span>
                    )}
                    {isYesFlag(spell.hasConcentration) && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                        Концентрація
                      </span>
                    )}
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex flex-shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {!isEmbedMode && (
                    <>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:text-teal-300 hover:bg-white/5",
                          inPrint && "text-teal-300 bg-teal-500/10"
                        )}
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
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }}
      desktopDetailView={
        selectedSpell ? (
          <SpellDetailCard spell={selectedSpell as unknown as SpellData} is2024={is2024} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть заклинання для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={selectedModalSpell}
      onCloseModal={() => setSelectedModalSpell(null)}
      modalTitle={selectedModalSpell?.name || "Деталі заклинання"}
      renderModalContent={(spell) => (
        <SpellModalCard
          spell={spell as unknown as SpellData}
          onClose={() => setSelectedModalSpell(null)}
          is2024={is2024}
        />
      )}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <SpellsFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          is2024={is2024}
          availableLevels={available.levels}
          availableClasses={available.classes}
          availableSubclassesByClass={available.subclassesByClass}
          availableSchools={available.schools}
          availableTimes={available.times}
          availableSources={available.sources}
          selectedLevels={selection.levels}
          selectedClasses={selection.classes}
          selectedSubclasses={selection.subclasses}
          selectedSchools={selection.schools}
          selectedTimes={selection.times}
          selectedSources={selection.sources}
          selectedConc={selection.conc}
          selectedRitual={selection.ritual}
          toggleLevel={(lvl) => toggleSetValue("lvl", lvl)}
          toggleClass={(cls) => toggleSetValue("cls", cls)}
          toggleSubclass={(sub) => toggleSetValue("sub", sub)}
          toggleSchool={(sch) => toggleSetValue("sch", sch)}
          toggleTime={(t) => toggleSetValue("time", t)}
          toggleSource={(src) => toggleSetValue("src", src)}
          toggleConc={() => setParams((next) => setBoolParam(next, "conc", selection.conc === true ? null : true))}
          toggleRitual={() => setParams((next) => setBoolParam(next, "rit", selection.ritual === true ? null : true))}
          clearFilters={clearFilters}
        />
      }
    />
  );
}
