"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Printer,
  UserPlus,
  Check,
  Trash2,
  Wand2,
  Loader2,
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
  clearSourceParams,
  collectCatalogSources,
  countSourceFilters,
  matchesSourceSelection,
  parseSourceSelection,
  toggleHomebrewParam,
  toggleSourceParam,
  type SourceSelection,
} from "@/lib/catalog-source-filter";
import { shortenCastingTime } from "@/lib/spell-casting-time";
import {
  SUBCLASS_FILTER_FALLBACK_CLASS,
  collectSpellClassFacets,
  normalizeBaseClassValue,
} from "@/lib/spell-class-facets";
import {
  findSpellComponents,
  findSpellDurationBucket,
  findSpellRangeBucket,
  type SpellComponent,
} from "@/lib/spell-filter-facets";
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
import { SpellDetailCard } from "@/components/spells/SpellDetailCard";
import { SpellIconAttribution } from "@/components/spells/SpellIconAttribution";
import { SpellSummary } from "@/components/spells/SpellSummary";
import { SpellModalCard } from "@/components/spells/SpellModalCard";
import { SpellsFilterDialog } from "@/components/spells/SpellsFilterDialog";
import { SpellData } from "@/lib/spellsData";
import { buildSpellLinkForSpell, buildSpellSlug } from "@/lib/spell-link";
import { isWithinCharacterSpellLevel } from "@/lib/logic/character-spell-level-filter";
import { Ruleset } from "@/lib/prisma-enums";
import { cn } from "@/lib/utils";
import { EditionAccentChip, EditionAccentTitle } from "@/components/ui/EditionAccent";
import { findEditionAccent } from "@/styles/edition-accent";
import { HomebrewCatalogBanner } from "@/components/homebrew/HomebrewCatalogBanner";
import { HomebrewToggleButton } from "@/components/homebrew/HomebrewToggleButton";
import { HomebrewByline, HomebrewEntryButtons } from "@/components/homebrew/HomebrewEntryDetails";
import { includeHomebrewSource, type HomebrewOnlyCatalog } from "@/components/homebrew/homebrew-only-catalog";
import { useCatalogHomebrew } from "@/hooks/useCommunityHomebrew";
import { buildHomebrewSpellKey, type HomebrewSpellEntry } from "@/lib/logic/homebrew-view";
import { SpellDiscussion } from "@/components/spells/SpellDiscussion";
import { SpellbookDropdown, setSpellbookPresence, type PersIndexItem, type SpellbookTarget } from "@/components/spells/SpellbookDropdown";
import { RpgbotRecommendedChip } from "@/components/spells/RpgbotRecommendedChip";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { SpellRatingBadge } from "@/components/spells/SpellRatingBadge";
import { SpellRatingSection } from "@/components/spells/SpellRatingSection";
import { useCatalogSpellRatings } from "@/hooks/useCatalogSpellRatings";
import { parseRatedCastersParam, type RatedCaster } from "@/lib/optimization/spell-rating-casters";
import {
  RATING_FILTER_PARAM,
  isRecommendedSelection,
  listRatingFilterFacets,
  matchesRatingSelection,
  toggleRecommendedParam,
} from "@/lib/optimization/spell-rating-filter";
import { findBestSpellRating, sortByBestRating } from "@/lib/optimization/spell-rating-lookup";

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
  ratings: Set<string>;
  schools: Set<string>;
  times: Set<string>;
  components: Set<string>;
  ranges: Set<string>;
  durations: Set<string>;
  source: SourceSelection;
  ritual: boolean | null;
  conc: boolean | null;
  q: string;
  spell: string;
};

const NO_RATING_SELECTION: ReadonlySet<string> = new Set();

const FILTER_PARAM_KEYS = ["lvl", "cls", "sub", "sch", "time", "comp", "rng", "dur", "rit", "conc", RATING_FILTER_PARAM];

type EmbedParams = {
  origin: string | null;
  persId: number | null;
  persName: string | null;
  maxSpellLevel: number | null;
  maxSpellLevelByClass: Map<string, number> | null;
  knownTarget: number | null;
  cantripTarget: number | null;
  knownExcluded: Set<number>;
  ratedCasters: RatedCaster[];
};

// KR27.7: `WIZARD_2024:2,CLERIC_2024:2` → ключ у назві класу з каталогу («Чарівник»), щоб звірятись зі spellClasses.
function parseMaxSpellLevelByClass(raw: string | null): Map<string, number> | null {
  if (!raw) return null;
  const entries = raw.split(",").flatMap((pair): [string, number][] => {
    const [className, level] = pair.split(":");
    const parsedLevel = Number(level);
    return className && Number.isFinite(parsedLevel) ? [[normalizeBaseClassValue(className), parsedLevel]] : [];
  });
  return entries.length > 0 ? new Map(entries) : null;
}

function parseEmbedParams(params: URLSearchParams): EmbedParams {
  const origin = params.get("origin");
  const persIdRaw = params.get("persId");
  const persId = persIdRaw ? parseInt(persIdRaw, 10) : null;
  const persName = params.get("persName");
  const maxSpellLevel = params.get("maxSpellLevel") ? parseInt(params.get("maxSpellLevel")!, 10) : null;
  const maxSpellLevelByClass = parseMaxSpellLevelByClass(params.get("maxSpellLevelByClass"));
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
    maxSpellLevelByClass,
    knownTarget: Number.isFinite(knownTarget) ? knownTarget : null,
    cantripTarget: Number.isFinite(cantripTarget) ? cantripTarget : null,
    knownExcluded,
    ratedCasters: parseRatedCastersParam(params.get("rpgbotFor")),
  };
}

const parseSelection = (params: URLSearchParams): SelectionState => {
  return {
    levels: getParamSet(params, "lvl"),
    classes: getParamSet(params, "cls"),
    subclasses: getParamSet(params, "sub"),
    ratings: getParamSet(params, RATING_FILTER_PARAM),
    schools: getParamSet(params, "sch"),
    times: getParamSet(params, "time"),
    components: getParamSet(params, "comp"),
    ranges: getParamSet(params, "rng"),
    durations: getParamSet(params, "dur"),
    source: parseSourceSelection(params),
    ritual: getBoolParam(params, "rit"),
    conc: getBoolParam(params, "conc"),
    q: params.get("q") ?? "",
    spell: params.get("spell")?.trim() || "",
  };
};

function isHomebrewRow(spell: SpellListItem): boolean {
  return spell.source === "HOMEBREW" && spell.spellId < 0;
}

function isYesFlag(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return false;
  return v === "так" || v === "yes" || v === "true" || v === "1";
}

function levelHeaderLabel(level: number) {
  return level === 0 ? "Замовляння" : `Рівень ${level}`;
}

type RowItem =
  | { kind: "header"; level: number; count: number }
  | { kind: "spell"; spell: SpellListItem }
  | { kind: "attribution" };

export function SpellsClient({
  spells: catalogSpells,
  initialSearchParams = {},
  ruleset = "RULES_2014",
  homebrewOnly,
}: {
  spells: SpellListItem[];
  initialSearchParams?: InitialSearchParams;
  ruleset?: Ruleset | string;
  homebrewOnly?: HomebrewOnlyCatalog;
}) {
  const is2024 = ruleset === "RULES_2024";
  const listEdition = is2024 ? "2024" : "2014";
  const listAccent = findEditionAccent(listEdition);
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

  const ratings = useCatalogSpellRatings({ casters: embedParams.ratedCasters, isEmbedMode, is2024 });
  const { isReady: areRatingsReady, findMatches: findRatingMatches } = ratings;
  useRpgbotSurfaceView(isEmbedMode && ratings.canRate ? { surface: "spell_catalog" } : null);
  const [isAddingSpell, setIsAddingSpell] = useState(false);
  const [addedSpellIds, setAddedSpellIds] = useState<Set<number>>(new Set());

  const buildRowTarget = (spell: SpellListItem): SpellbookTarget => {
    const ruleset = is2024 ? "RULES_2024" : "RULES_2014";
    if (isHomebrewRow(spell)) return { kind: "HOMEBREW", ruleset, spellKey: buildHomebrewSpellKey(-spell.spellId), entryId: -spell.spellId };
    const link = buildSpellLinkForSpell({ spellId: spell.spellId, engName: spell.engName, ruleset });
    return { kind: "CATALOG", ruleset, spellKey: link.spellKey, link };
  };

  const handleAddSpell = async (spell: SpellListItem) => {
    if (!embedParams.persId) return;
    setIsAddingSpell(true);
    try {
      const res = await setSpellbookPresence(buildRowTarget(spell), embedParams.persId, true);
      if (res.success) {
        setAddedSpellIds((prev) => new Set(prev).add(spell.spellId));
        if (ratings.canRate) captureRpgbotEvent("rpgbot_catalog_spell_added", { rating_score: findBestSpellRating(findRatingMatches(spell))?.score, recommended_filter_on: isRecommendedSelection(ratingSelection) });
        window.parent.postMessage(
          { type: "SPELL_TOGGLED", persId: embedParams.persId, spellId: res.spellId, spellLevel: spell.level, added: true },
          "*"
        );
      }
    } finally {
      setIsAddingSpell(false);
    }
  };

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection,
    initialSearchParams
  );
  const ratingSelection = ratings.canRate ? selection.ratings : NO_RATING_SELECTION;
  const isWaitingForRatings = ratingSelection.size > 0 && !areRatingsReady;

  const catalogRuleset = is2024 ? "RULES_2024" : "RULES_2014";
  const communityHomebrew = useCatalogHomebrew({ kind: "SPELL", ruleset: catalogRuleset, isOn: selection.source.homebrew, onlyHomebrewSort: homebrewOnly?.sort ?? null });
  const findCommunityEntry = (spell: SpellListItem) =>
    communityHomebrew.find((entry): entry is HomebrewSpellEntry => entry.kind === "SPELL" && -entry.entryId === spell.spellId) ?? null;
  const spells = useMemo(
    () => [...catalogSpells, ...communityHomebrew.flatMap((entry) => (entry.kind === "SPELL" ? [entry.spell as SpellListItem] : []))],
    [catalogSpells, communityHomebrew],
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

      if (!isWithinCharacterSpellLevel(spell, embedParams)) {
        return false;
      }

      if (selection.schools.size > 0 && (!spell.school || !selection.schools.has(spell.school))) {
        return false;
      }

      if (selection.times.size > 0 && !selection.times.has(shortenCastingTime(spell.castingTime))) {
        return false;
      }

      if (selection.components.size > 0) {
        const present = findSpellComponents(spell.components);
        const requiresAll = Array.from(selection.components).every((component) =>
          present.has(component as SpellComponent)
        );
        if (!requiresAll) return false;
      }

      if (selection.ranges.size > 0 && !selection.ranges.has(findSpellRangeBucket(spell.range))) {
        return false;
      }

      if (selection.durations.size > 0 && !selection.durations.has(findSpellDurationBucket(spell.duration))) {
        return false;
      }

      if (!matchesSourceSelection(spell.source, homebrewOnly ? includeHomebrewSource(selection).source : selection.source)) {
        return false;
      }

      if (areRatingsReady && !matchesRatingSelection(ratingSelection, findBestSpellRating(findRatingMatches(spell))?.score ?? null)) {
        return false;
      }

      if (selection.ritual !== null && isYesFlag(spell.hasRitual) !== selection.ritual) {
        return false;
      }

      if (selection.conc !== null && isYesFlag(spell.hasConcentration) !== selection.conc) {
        return false;
      }

      // Class and subclass filters act as a union (OR), not an intersection: a spell should
      // show up if it matches ANY selected class or subclass, since most spells only carry a
      // base-class tag and would never match a subclass tag at the same time.
      if (selection.classes.size > 0 || selection.subclasses.size > 0) {
        const spellClassNames = new Set(spell.spellClasses.map((c) => c.className));

        const matchesClass = spell.spellClasses.some((c) =>
          selection.classes.has(normalizeBaseClassValue(c.className))
        );

        const matchesSubclass = Array.from(selection.subclasses).some((sub) => {
          if (spellClassNames.has(sub)) return true;
          const fallback = SUBCLASS_FILTER_FALLBACK_CLASS[sub];
          return Boolean(fallback) && spellClassNames.has(fallback);
        });

        if (!matchesClass && !matchesSubclass) return false;
      }

      return true;
    });
  }, [spells, selection, embedParams, homebrewOnly, areRatingsReady, findRatingMatches, ratingSelection]);

  const selectedSpell = useMemo(() => {
    if (selection.spell) {
      const byParam = spells.find(
        (s) =>
          String(s.spellId) === selection.spell ||
          buildSpellSlug(s.engName) === selection.spell ||
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
    const schools = new Set<string>();
    const times = new Set<string>();

    for (const s of spells) {
      levels.add(s.level);
      if (s.school) schools.add(s.school);
      const time = shortenCastingTime(s.castingTime);
      if (time) times.add(time);
    }

    const { classes, subclassesByClass } = collectSpellClassFacets(spells);

    return {
      levels: Array.from(levels).sort((a, b) => a - b),
      classes,
      subclassesByClass,
      schools: Array.from(schools).sort((a, b) => a.localeCompare(b, "uk")),
      times: Array.from(times).sort((a, b) => a.localeCompare(b, "uk")),
      sources: { ...collectCatalogSources(spells), hasHomebrew: !homebrewOnly },
    };
  }, [spells, homebrewOnly]);

  const clearFilters = () => {
    setParams((next) => {
      for (const key of FILTER_PARAM_KEYS) next.delete(key);
      clearSourceParams(next);
    });
  };

  const activeFiltersCount =
    selection.levels.size +
    selection.classes.size +
    selection.subclasses.size +
    ratingSelection.size +
    selection.schools.size +
    selection.times.size +
    selection.components.size +
    selection.ranges.size +
    selection.durations.size +
    countSourceFilters(selection.source) +
    (selection.ritual !== null ? 1 : 0) +
    (selection.conc !== null ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;

  const collectPrintKeys = () =>
    printIds.flatMap((spellId) => {
      const spell = spells.find((row) => row.spellId === spellId);
      return spell ? [buildRowTarget(spell).spellKey] : [];
    });

  const doPrint = () => {
    const keys = collectPrintKeys();
    if (keys.length === 0) return;
    const query = new URLSearchParams({ ruleset: catalogRuleset, keys: keys.join(",") });
    window.open(`/api/spells/print?${query}`, "_blank", "noopener,noreferrer");
  };

  const flatRows = useMemo<RowItem[]>(() => {
    const rankByRating = (list: SpellListItem[]) =>
      areRatingsReady && ratings.canRate
        ? sortByBestRating(list, (spell) => findBestSpellRating(findRatingMatches(spell))?.score ?? null)
        : list;
    const grouped = new Map<number, SpellListItem[]>();
    for (const spell of filtered) {
      const arr = grouped.get(spell.level) ?? [];
      arr.push(spell);
      grouped.set(spell.level, arr);
    }

    const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b);
    const rows = sortedLevels.flatMap((lvl) => {
      const list = grouped.get(lvl) || [];
      if (!homebrewOnly) list.sort((a, b) => a.name.localeCompare(b.name, "uk"));
      const rankedList = rankByRating(list);
      return [
        { kind: "header" as const, level: lvl, count: list.length },
        ...rankedList.map((spell) => ({ kind: "spell" as const, spell })),
      ];
    });
    return rows.length ? [...rows, { kind: "attribution" as const }] : rows;
  }, [filtered, homebrewOnly, areRatingsReady, findRatingMatches, ratings.canRate]);

  return (
    <ContentListPage<SpellListItem, RowItem>
      title={homebrewOnly ? "Хоумбрю: заклинання" : is2024 ? "Заклинання 2024" : "Заклинання"}
      is2024={is2024}
      topBannerScrollsWithListOnMobile={Boolean(homebrewOnly)}
      topBanner={
        homebrewOnly ? homebrewOnly.header : !isEmbedMode && selection.source.homebrew ? (
          <HomebrewCatalogBanner kind="SPELL" edition={is2024 ? "2024" : "2014"} count={communityHomebrew.length} />
        ) : isEmbedMode && (
          <div className="mb-4 rounded-xl border border-arcane-500/30 bg-arcane-500/10 p-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm text-arcane-200">
              <UserPlus className="h-4 w-4" />
              <span>
                Додавання заклинань для <strong>{embedParams.persName || `персонажа #${embedParams.persId}`}</strong>
              </span>
            </div>
            {ratings.canRate && (
              <div className="mt-2">
                <RpgbotRecommendedChip
                  isActive={isRecommendedSelection(ratingSelection)}
                  onToggle={() => {
                    captureRpgbotEvent("rpgbot_spell_chip_toggled", { enabled: !isRecommendedSelection(ratingSelection) });
                    setParams((next) => toggleRecommendedParam(next, ratingSelection));
                  }}
                />
              </div>
            )}
          </div>
        )
      }
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук заклинань..."
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      headerActions={
        !isEmbedMode && (
          <div className="flex items-center gap-2">
          {homebrewOnly ? null : <HomebrewToggleButton isOn={selection.source.homebrew} onToggle={() => setParams((next) => toggleHomebrewParam(next))} />}
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
          </div>
        )
      }
      data={isWaitingForRatings ? [] : flatRows}
      emptyState={isWaitingForRatings ? (
        <div role="status" className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Завантаження…
        </div>
      ) : (
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
      )}
      renderItem={(_index, row) => {
        if (row.kind === "attribution") return <SpellIconAttribution />;

        if (row.kind === "header") {
          return (
            <div className="pt-3 pb-1 px-1">
              <div
                style={listAccent.vars}
                className="sheen-ring rounded-xl border border-transparent bg-slate-900/70 px-3.5 py-2 text-slate-200 backdrop-blur-xl flex items-center justify-between shadow-sm"
              >
                <span className="font-sans text-sm sm:text-base font-semibold tracking-wide">
                  <EditionAccentTitle edition={listEdition}>
                    {levelHeaderLabel(row.level)}
                  </EditionAccentTitle>
                </span>
                <span className="text-xs font-mono font-medium text-slate-400">({row.count})</span>
              </div>
            </div>
          );
        }

        const spell = row.spell;
        const isSelected = selectedSpell?.spellId === spell.spellId;
        const inPrint = printIds.includes(spell.spellId);

        return (
          <div key={spell.spellId} className="pt-2 pb-0.5 px-0.5">
            <div
              style={isSelected ? listAccent.vars : undefined}
              onClick={() => {
                setParams((next) => next.set("spell", String(spell.spellId)));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalSpell(spell);
                }
              }}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-xl border p-3 transition-all duration-300 cursor-pointer",
                isSelected
                  ? "sheen-ring sheen-glow border-transparent bg-white/5 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <SpellSummary
                  spell={{
                    name: spell.name,
                    engName: spell.engName,
                    level: spell.level,
                    school: spell.school,
                    castingTime: spell.castingTime,
                    isRitual: isYesFlag(spell.hasRitual),
                    isConcentration: isYesFlag(spell.hasConcentration),
                  }}
                  is2024={is2024}
                  isSelected={isSelected}
                  factBadges={ratings.canRate ? <SpellRatingBadge matches={ratings.findMatches(spell)} spellName={spell.name} spellEngName={spell.engName} /> : null}
                  nameBadges={
                    <>
                      {is2024 && spell.kind === "new" && (
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shrink-0">
                          Нове
                        </span>
                      )}
                      {is2024 && spell.differsFrom2014 && (
                        <EditionAccentChip edition={listEdition} className="text-[9px] shrink-0">
                          Змінено
                        </EditionAccentChip>
                      )}
                    </>
                  }
                />

                {/* Right actions */}
                <div className="flex flex-shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {!isEmbedMode && (
                    <>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:text-arcane-300 hover:bg-white/5 md:h-9 md:w-9",
                          inPrint && "text-arcane-300 bg-arcane-500/10"
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
                        target={buildRowTarget(spell)}
                        persIndex={persIndex}
                        setPersIndex={setPersIndex}
                      />
                    </>
                  )}

                  {isEmbedMode && embedParams.persId && (
                    <button
                      type="button"
                      onClick={() => handleAddSpell(spell)}
                      disabled={isAddingSpell}
                      className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:text-arcane-300 hover:bg-white/5 md:h-9 md:w-9",
                        isAddingSpell && "opacity-50"
                      )}
                      aria-label="Додати до персонажа"
                    >
                      {addedSpellIds.has(spell.spellId) ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }}
      desktopDetailView={
        selectedSpell ? (
          <div className="space-y-6">
            <HomebrewEntryFrame entry={findCommunityEntry(selectedSpell)} is2024={is2024}>
              <SpellDetailCard spell={selectedSpell as unknown as SpellData} is2024={is2024} />
            </HomebrewEntryFrame>
            <SpellRatingSection matches={ratings.findMatches(selectedSpell)} spellEngName={selectedSpell.engName} />
            <SpellDiscussion spell={selectedSpell} is2024={is2024} />
          </div>
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
        <div className="space-y-6">
          <HomebrewEntryFrame entry={findCommunityEntry(spell)} is2024={is2024}>
            <SpellModalCard
              spell={spell as unknown as SpellData}
              is2024={is2024}
            />
          </HomebrewEntryFrame>
          <SpellRatingSection matches={ratings.findMatches(spell)} spellEngName={spell.engName} />
          <SpellDiscussion spell={spell} is2024={is2024} />
        </div>
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
          selectedComponents={selection.components}
          selectedRanges={selection.ranges}
          selectedDurations={selection.durations}
          sourceSelection={selection.source}
          selectedConc={selection.conc}
          selectedRitual={selection.ritual}
          toggleLevel={(lvl) => toggleSetValue("lvl", lvl)}
          toggleClass={(cls) => toggleSetValue("cls", cls)}
          toggleSubclass={(sub) => toggleSetValue("sub", sub)}
          toggleSchool={(sch) => toggleSetValue("sch", sch)}
          toggleTime={(t) => toggleSetValue("time", t)}
          toggleComponent={(component) => toggleSetValue("comp", component)}
          toggleRange={(range) => toggleSetValue("rng", range)}
          toggleDuration={(duration) => toggleSetValue("dur", duration)}
          toggleSource={(src) => setParams((next) => toggleSourceParam(next, src))}
          toggleHomebrew={() => setParams((next) => toggleHomebrewParam(next))}
          toggleConc={() => setParams((next) => setBoolParam(next, "conc", selection.conc === true ? null : true))}
          toggleRitual={() => setParams((next) => setBoolParam(next, "rit", selection.ritual === true ? null : true))}
          clearFilters={clearFilters}
          ratingFilter={
            ratings.canRate
              ? { facets: listRatingFilterFacets(), selected: selection.ratings, toggle: (score) => toggleSetValue(RATING_FILTER_PARAM, score) }
              : undefined
          }
        />
      }
    />
  );
}

function HomebrewEntryFrame({ entry, is2024, children }: { entry: HomebrewSpellEntry | null; is2024: boolean; children: ReactNode }) {
  if (!entry) return <>{children}</>;
  return (
    <div className="space-y-3">
      <HomebrewByline entry={entry} />
      {children}
      <HomebrewEntryButtons entry={entry} pageHref={`/homebrew/${entry.entryId}${is2024 ? "?edition=2024" : ""}`} />
    </div>
  );
}
