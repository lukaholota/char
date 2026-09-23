"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Ruleset } from "@prisma/client";
import { Eye, Printer, Trash2 } from "lucide-react";
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
  type CreatureIndexEntry,
  collectCreatureCRs,
  collectCreatureSizes,
  collectCreatureTypes,
  findEditionLabel,
  matchesCreatureSelection,
  rankNameMatchesFirst,
} from "@/lib/bestiary-index";
import {
  clearSourceParams,
  collectCatalogSources,
  countSourceFilters,
  parseSourceSelection,
  toggleHomebrewParam,
  toggleSourceParam,
  type SourceSelection,
} from "@/lib/catalog-source-filter";
import type { CreatureStatblockView } from "@/lib/catalog-reads";
import { useCreatureStatblock } from "@/hooks/useCreatureStatblock";
import { CreatureMedallion } from "@/components/bestiary/CreatureMedallion";
import { StatblockPanel } from "@/components/bestiary/BestiaryStatblockPanel";
import { BestiaryFilterDialog } from "@/components/bestiary/BestiaryFilterDialog";
import { WildshapeFilterSection, WildshapeRowNote } from "@/components/bestiary/BestiaryWildshapePicking";
import { isCommunityCreature, useDeepSearchMatches, useIndexWithCommunityHomebrew, useShuffleSeed } from "@/components/bestiary/useCreatureListing";
import { useWildshapePicking } from "@/components/bestiary/useWildshapePicking";
import { BestiarySortMenu } from "@/components/bestiary/BestiarySortMenu";
import {
  DEFAULT_CREATURE_SORT,
  parseCreatureSortMode,
  sortCreatureIndex,
  type CreatureSortMode,
} from "@/lib/bestiary-sort";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import { useCatalogDeepLinkFocus } from "@/hooks/useCatalogDeepLinkFocus";
import {
  getParamSet,
  setParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
} from "@/lib/catalog-url-helpers";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { getCreatureVisual } from "@/components/catalogs/catalog-visuals";
import { toEntitySlug } from "@/lib/slug-utils";
import { cn } from "@/lib/utils";
import { HomebrewCatalogBanner } from "@/components/homebrew/HomebrewCatalogBanner";
import { HomebrewToggleButton } from "@/components/homebrew/HomebrewToggleButton";
import { includeHomebrewSource, type HomebrewOnlyCatalog } from "@/components/homebrew/homebrew-only-catalog";
import { findAccentVariant } from "@/styles/edition-accent";

type SelectionState = {
  types: Set<string>;
  sizes: Set<string>;
  crs: Set<string>;
  source: SourceSelection;
  moves: Set<string>;
  q: string;
  creature: string;
  sort: CreatureSortMode;
};

const parseSelection = (params: URLSearchParams): SelectionState => {
  const types = getParamSet(params, "type");
  const sizes = getParamSet(params, "size");
  const crs = getParamSet(params, "cr");
  const source = parseSourceSelection(params);
  const moves = getParamSet(params, "move");
  const q = params.get("q") || "";
  const creature = params.get("creature") || "";
  const sort = parseCreatureSortMode(params.get("sort"));
  return { types, sizes, crs, source, moves, q, creature, sort };
};

type Props = {
  ruleset?: Ruleset;
  index: CreatureIndexEntry[];
  initialStatblock: CreatureStatblockView | null;
  homebrewOnly?: HomebrewOnlyCatalog;
};

export function BestiaryClient({ ruleset = "RULES_2014", index: catalogIndex, initialStatblock, homebrewOnly }: Props) {
  const is2024 = ruleset === "RULES_2024";
  const editionLabel = findEditionLabel(ruleset);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalCreature, setModalCreature] = useState<CreatureIndexEntry | null>(null);
  const closingModalRef = useRef(false);
  const [printKeys, setPrintKeys] = useState<string[]>([]);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection
  );

  const { index, communityCount, findCommunityEntry } = useIndexWithCommunityHomebrew(catalogIndex, ruleset, selection.source.homebrew, homebrewOnly?.sort ?? null);
  const deepMatchKeys = useDeepSearchMatches(selection.q, ruleset);
  const wildshape = useWildshapePicking(ruleset);

  const filtered = useMemo(
    () =>
      index.filter(
        (entry) => matchesCreatureSelection(entry, homebrewOnly ? includeHomebrewSource(selection) : selection, deepMatchKeys) && wildshape.matches(entry)
      ),
    [index, selection, deepMatchKeys, wildshape, homebrewOnly]
  );

  const shuffleSeed = useShuffleSeed();

  const ordered = useMemo(
    () => rankNameMatchesFirst(homebrewOnly ? filtered : sortCreatureIndex(filtered, selection.sort, shuffleSeed), selection.q),
    [filtered, selection.sort, selection.q, shuffleSeed, homebrewOnly]
  );

  const selectedCreature = useMemo(() => {
    if (selection.creature) {
      const byParam = index.find(
        (entry) =>
          String(entry.creatureId) === selection.creature ||
          entry.key === toEntitySlug(selection.creature) ||
          entry.nameEng.toLowerCase() === selection.creature.toLowerCase() ||
          entry.name.toLowerCase() === selection.creature.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return ordered[0] ?? null;
  }, [ordered, selection.creature, index]);

  const focusCreatureFromUrl = useCallback((source: "initial" | "search" | "popstate") => {
    if (source === "popstate" && closingModalRef.current) {
      closingModalRef.current = false;
      return;
    }
    const requested = getSearchParamsFromLocation().get("creature");
    if (!requested || window.innerWidth >= 1024) return;
    const target = index.find(
      (entry) => String(entry.creatureId) === requested ||
        entry.key === toEntitySlug(requested) ||
        entry.nameEng.toLowerCase() === requested.toLowerCase() ||
        entry.name.toLowerCase() === requested.toLowerCase()
    );
    if (target) setModalCreature(target);
  }, [index]);

  useCatalogDeepLinkFocus(focusCreatureFromUrl);

  const selectedCommunityEntry = findCommunityEntry(selectedCreature);
  const catalogStatblock = useCreatureStatblock(selectedCommunityEntry ? null : selectedCreature?.key ?? null, ruleset, initialStatblock);
  const statblock = selectedCommunityEntry?.creature ?? catalogStatblock.creature;
  const loreGroup = selectedCommunityEntry ? null : catalogStatblock.loreGroup;

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const toggleParamValue = (key: string, value: string) => {
    setParams((next) => {
      const set = getParamSet(next, key);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      setParamSet(next, key, set);
    });
  };

  const changeSort = (mode: CreatureSortMode) => {
    setParams((next) => {
      if (mode === DEFAULT_CREATURE_SORT) next.delete("sort");
      else next.set("sort", mode);
    });
  };

  const clearFilters = () => {
    wildshape.showOnlyEligible(false);
    setParams((next) => {
      next.delete("type");
      next.delete("size");
      next.delete("cr");
      next.delete("move");
      clearSourceParams(next);
    });
  };

  const activeFiltersCount =
    selection.types.size +
    selection.sizes.size +
    selection.crs.size +
    selection.moves.size +
    countSourceFilters(selection.source) +
    (wildshape.filter.onlyEligible ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;

  const availableTypes = useMemo(() => collectCreatureTypes(index), [index]);
  const availableSizes = useMemo(() => collectCreatureSizes(index), [index]);
  const availableCRs = useMemo(() => collectCreatureCRs(index), [index]);
  const availableSources = useMemo(() => ({ ...collectCatalogSources(index), hasHomebrew: !homebrewOnly }), [index, homebrewOnly]);

  const printCreatures = () => {
    if (printKeys.length === 0) return;
    const keys = encodeURIComponent(printKeys.join(","));
    window.open(
      `/api/bestiary/print?ruleset=${ruleset}&keys=${keys}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <ContentListPage<CreatureIndexEntry>
      title={homebrewOnly ? "Хоумбрю: істоти" : "Бестіарій"}
      is2024={is2024}
      topBannerScrollsWithListOnMobile={Boolean(homebrewOnly)}
      topBanner={homebrewOnly ? homebrewOnly.header : selection.source.homebrew ? <HomebrewCatalogBanner kind="CREATURE" edition={is2024 ? "2024" : "2014"} count={communityCount} /> : null}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук істот..."
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      headerActions={
        <div className="flex items-center gap-2">
          {homebrewOnly ? null : <HomebrewToggleButton isOn={selection.source.homebrew} onToggle={() => setParams((next) => toggleHomebrewParam(next))} />}
          {homebrewOnly ? null : <BestiarySortMenu mode={selection.sort} onChange={changeSort} is2024={is2024} />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-white/10 bg-slate-900/60 text-xs"
                disabled={printKeys.length === 0}
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Друк</span>
                <span className="text-xs text-slate-400">({printKeys.length})</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Обрано істот: {printKeys.length}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={printCreatures} className="cursor-pointer gap-2">
                <Printer className="h-4 w-4" />
                <span>Друкувати</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setPrintKeys([])}
                className="cursor-pointer gap-2 text-red-300 focus:bg-red-500/10 focus:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
                <span>Очистити список</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
      data={ordered}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Eye className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Істот не знайдено</p>
          <p className="text-xs text-slate-500 mt-1">Спробуйте змінити пошуковий запит або фільтри</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, creature) => {
        const isSelected = selectedCreature?.creatureId === creature.creatureId;
        const isSelectedForPrint = printKeys.includes(creature.key);
        const visual = getCreatureVisual(creature.type);

        return (
          <div key={creature.creatureId} className="pt-2.5 pb-0.5 px-0.5">
            <div
              onClick={() => {
                setParams((next) => next.set("creature", isCommunityCreature(creature) ? creature.key : toEntitySlug(creature.nameEng)));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  closingModalRef.current = false;
                  setModalCreature(creature);
                }
              }}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 cursor-pointer",
                isSelected
                  ? findAccentVariant(is2024, { prism: "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-prism-400/40", arcane: "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-arcane-400/40" })
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center gap-3.5">
                <CreatureMedallion creature={creature} visual={visual} />

                {/* Center creature info */}
                <div className="min-w-0 flex-1 self-center">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "block truncate text-base sm:text-[17px] font-semibold transition-colors",
                          isSelected
                            ? findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-arcane-300" })
                            : "text-slate-100 group-hover:text-white"
                        )}
                      >
                        {creature.name}
                      </span>
                      {creature.nameEng && (
                        <span className="block truncate text-sm text-slate-400">[{creature.nameEng}]</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-slate-400">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-bold border",
                        findAccentVariant(is2024, { prism: "border-prism-500/40 bg-prism-500/10 text-prism-300", arcane: "border-arcane-500/40 bg-arcane-500/10 text-arcane-300" })
                      )}
                    >
                      {editionLabel}
                    </span>
                    {creature.type && (
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium border", visual.badgeClass)}>
                        {creature.type}
                      </span>
                    )}
                    {creature.size && (
                      <span className="text-slate-300 font-medium text-xs">
                        {creature.size}
                      </span>
                    )}
                    {creature.challenge && creature.challenge !== "-" ? (
                      <span className="font-mono font-semibold px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
                        CR {creature.challenge}
                      </span>
                    ) : (
                      <span className="font-mono font-medium px-2 py-0.5 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs">
                        Саммон
                      </span>
                    )}
                    {creature.ac && <span className="text-slate-300">КБ {creature.ac}</span>}
                    {creature.hp && <span className="text-slate-300">ХП {creature.hp}</span>}
                  </div>

                  <WildshapeRowNote creature={creature} wildshape={wildshape} />
                </div>

                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-arcane-300",
                    isSelectedForPrint && "bg-arcane-500/10 text-arcane-300",
                    isCommunityCreature(creature) && "hidden"
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPrintKeys((current) =>
                      current.includes(creature.key)
                        ? current.filter((key) => key !== creature.key)
                        : [...current, creature.key]
                    );
                  }}
                  aria-label={isSelectedForPrint ? "Прибрати з друку" : "Додати до друку"}
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      }}
      desktopDetailView={
        selectedCreature ? (
          <div className="space-y-3">
            <StatblockPanel
              creature={selectedCreature}
              statblock={statblock}
              loreGroup={loreGroup}
              is2024={is2024}
              wildshape={wildshape}
              homebrewEntry={selectedCommunityEntry}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть істоту для перегляду статблоку</p>
          </div>
        )
      }
      selectedModalItem={modalCreature}
      onCloseModal={() => {
        closingModalRef.current = true;
        setModalCreature(null);
      }}
      modalTitle={modalCreature?.name || "Статблок істоти"}
      renderModalContent={(creature) => (
        <div className="space-y-3">
          <StatblockPanel creature={creature} statblock={statblock} loreGroup={loreGroup} is2024={is2024} wildshape={wildshape} homebrewEntry={findCommunityEntry(creature)} />
        </div>
      )}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <BestiaryFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          is2024={is2024}
          availableTypes={availableTypes}
          selectedTypes={selection.types}
          toggleType={(type) => toggleParamValue("type", type)}
          availableSizes={availableSizes}
          selectedSizes={selection.sizes}
          toggleSize={(size) => toggleParamValue("size", size)}
          availableCRs={availableCRs}
          selectedCRs={selection.crs}
          toggleCR={(cr) => toggleParamValue("cr", cr)}
          availableSources={availableSources}
          sourceSelection={selection.source}
          toggleSource={(source) => setParams((next) => toggleSourceParam(next, source))}
          toggleHomebrew={() => setParams((next) => toggleHomebrewParam(next))}
          selectedMoves={selection.moves}
          toggleMove={(move) => toggleParamValue("move", move)}
          clearFilters={clearFilters}
          extraSection={
            <WildshapeFilterSection
              characters={wildshape.characters}
              standing={wildshape.standing}
              persId={wildshape.filter.persId}
              onlyEligible={wildshape.filter.onlyEligible}
              onSelectPers={wildshape.selectPers}
              onShowOnlyEligible={wildshape.showOnlyEligible}
            />
          }
        />
      }
    />
  );
}
