"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Ruleset } from "@prisma/client";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CatalogIllustrationCard } from "@/components/catalogs/CatalogIllustrationCard";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import { RaceDetailCard } from "@/components/races/RaceDetailCard";
import { RaceBranchReader } from "@/components/races/RaceBranchReader";
import { CatalogReadingDialog } from "@/components/catalogs/reading/CatalogReadingDialog";
import { useReadingNavigation } from "@/components/catalogs/reading/useReadingNavigation";
import type { ReadingActions, ReadingView } from "@/components/catalogs/reading/reading-view";
import { CatalogMatchList } from "@/components/catalogs/reading/CatalogMatchList";
import { findRaceMatches } from "@/lib/catalogs/reading-matches";
import {
  findRaceReading,
  parseRaceReadingTarget,
  writeRaceReadingTarget,
  type RaceBranchKind,
  type RaceReadingTarget,
  type RaceSection,
} from "@/lib/catalogs/reading-target";
import { useCatalogDeepLinkFocus } from "@/hooks/useCatalogDeepLinkFocus";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
import type { RaceData } from "@/lib/racesData";
import { RACE_TRAIT_KEYS, RACE_TRAIT_LABELS, findSearchHaystack, hasRaceTrait } from "@/components/races/race-catalog-filters";
import { RACE_CATALOG_TITLE, RACE_SINGULAR } from "@/lib/refs/race-labels";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import {
  getParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
  setParamSet,
} from "@/lib/catalog-url-helpers";

import {
  ILLUSTRATION_DETAIL_CLASSNAME,
  ILLUSTRATION_LIST_CLASSNAME,
} from "@/components/catalogs/illustration-catalog-layout";

type SelectionState = {
  source: SourceSelection;
  sizes: Set<string>;
  speeds: Set<string>;
  traits: Set<string>;
  q: string;
  race: string;
  reading: RaceReadingTarget | null;
};

const parseSelection = (params: URLSearchParams): SelectionState => ({
  source: parseSourceSelection(params),
  sizes: getParamSet(params, "size"),
  speeds: getParamSet(params, "speed"),
  traits: getParamSet(params, "trait"),
  q: params.get("q") || "",
  race: params.get("race") || "",
  reading: parseRaceReadingTarget(params),
});

export function RacesClient({
  races,
  ruleset = "RULES_2014",
}: {
  races: RaceData[];
  ruleset?: Ruleset;
}) {
  const is2024 = ruleset === "RULES_2024";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalRace, setSelectedModalRace] = useState<RaceData | null>(null);
  const closingModalRef = useRef(false);

  const { qInput, setQInput, selection, setSelection } = useCatalogUrlSync<SelectionState>(
    parseSelection,
  );
  const isWide = useMediaQuery("lg");

  const available = useMemo(
    () => ({
      sources: collectCatalogSources(races),
      sizes: Array.from(new Set(races.flatMap((race) => race.sizes))).sort((a, b) => a.localeCompare(b, "uk")),
      speeds: Array.from(new Set(races.map((race) => String(race.speed)))).sort((a, b) => Number(a) - Number(b)),
      traits: RACE_TRAIT_KEYS.filter((trait) => races.some((race) => hasRaceTrait(race, trait))),
    }),
    [races],
  );

  const filtered = useMemo(() => {
    const query = selection.q.trim().toLowerCase();
    return races.filter((race) => {
      if (query && !findSearchHaystack(race).includes(query) && findRaceMatches(race, query).length === 0) return false;
      if (!matchesSourceSelection(race.source, selection.source)) return false;
      if (selection.sizes.size > 0 && !race.sizes.some((size) => selection.sizes.has(size))) return false;
      if (selection.speeds.size > 0 && !selection.speeds.has(String(race.speed))) return false;
      if (selection.traits.size > 0 && !Array.from(selection.traits).every((trait) => hasRaceTrait(race, trait))) {
        return false;
      }
      return true;
    });
  }, [races, selection]);

  const reading = useMemo(
    () => (selection.reading ? findRaceReading(races, selection.reading) : null),
    [races, selection.reading],
  );
  const selectedRace = reading?.race ?? filtered[0] ?? null;
  const openBranch = reading?.branch ?? null;

  const syncSelectionFromUrl = useCallback(
    () => setSelection(parseSelection(getSearchParamsFromLocation())),
    [setSelection],
  );
  const navigation = useReadingNavigation({ isBranchOpen: Boolean(openBranch), onUrlChanged: syncSelectionFromUrl });

  const focusRaceFromUrl = useCallback((source: "initial" | "search" | "popstate") => {
    if (source === "popstate" && closingModalRef.current) {
      closingModalRef.current = false;
      return;
    }
    const target = parseRaceReadingTarget(getSearchParamsFromLocation());
    const resolved = target ? findRaceReading(races, target) : null;
    if (!resolved) return;

    if (window.innerWidth < 1024) setSelectedModalRace(resolved.race);
    if (source !== "popstate") navigation.requestFocus();
  }, [races, navigation]);

  useCatalogDeepLinkFocus(focusRaceFromUrl);

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const writeTarget = (target: Omit<RaceReadingTarget, "raceKey">) => (params: URLSearchParams) =>
    writeRaceReadingTarget(params, { raceKey: selectedRace?.slug ?? "", ...target });
  const toRaceSection = (section: RaceSection) => writeTarget({ section, branch: null, featureKey: null });
  const backToRace = () => navigation.leaveBranchTo(toRaceSection("branches"));
  const closeModal = () => {
    closingModalRef.current = true;
    setSelectedModalRace(null);
  };
  const closeModalWithBranch = () => navigation.closeModalWithBranch(closeModal, toRaceSection("overview"));

  const openMatch = (target: RaceReadingTarget) => {
    navigation.replaceTarget((params) => writeRaceReadingTarget(params, target));
    navigation.requestFocus();
    const race = races.find((candidate) => candidate.slug === target.raceKey);
    if (race && window.innerWidth < 1024) {
      closingModalRef.current = false;
      setSelectedModalRace(race);
    }
  };

  const view: ReadingView<RaceSection> = {
    section: reading?.section ?? "overview",
    featureKey: openBranch ? null : reading?.featureKey ?? null,
    focusRequest: navigation.focusRequest,
    missing: reading?.missing ?? null,
  };
  const actions: ReadingActions<RaceSection> = {
    onSectionChange: (section) => navigation.replaceTarget(toRaceSection(section)),
    onOpenBranch: (cardKey, opener) => {
      const [kind, key] = cardKey.split(":") as [RaceBranchKind, string];
      navigation.openBranch(writeTarget({ section: "branches", branch: { kind, key }, featureKey: null }), cardKey, opener);
    },
    onDismissMissing: () => navigation.replaceTarget(toRaceSection("overview")),
  };

  const renderBranchReader = (race: RaceData, onClose: () => void) =>
    openBranch ? (
      <RaceBranchReader
        race={race}
        kind={openBranch.kind}
        branch={openBranch.entry}
        featureKey={reading?.featureKey ?? null}
        focusRequest={navigation.focusRequest}
        is2024={is2024}
        onBack={backToRace}
        onClose={onClose}
      />
    ) : null;

  const toggleIn = (key: string) => (value: string) =>
    setParams((next) => {
      const set = getParamSet(next, key);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      setParamSet(next, key, set);
    });

  const clearFilters = () =>
    setParams((next) => {
      next.delete("size");
      next.delete("speed");
      next.delete("trait");
      clearSourceParams(next);
    });

  const activeFiltersCount =
    selection.sizes.size + selection.speeds.size + selection.traits.size + countSourceFilters(selection.source);
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <ContentListPage<RaceData>
      title={RACE_CATALOG_TITLE[ruleset]}
      listContainerClassName={ILLUSTRATION_LIST_CLASSNAME}
      detailContainerClassName={ILLUSTRATION_DETAIL_CLASSNAME}
      is2024={is2024}
      totalCount={races.length}
      filteredCount={filtered.length}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder={`Пошук ${is2024 ? "видів" : "рас"}...`}
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      data={filtered}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Users className="mb-2 h-10 w-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">Нічого не знайдено</p>
          <p className="mt-1 text-xs text-slate-500">Спробуйте змінити фільтри або пошуковий запит</p>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          ) : null}
        </div>
      }
      renderItem={(_index, race) => (
        <RaceRow
          key={race.raceId}
          race={race}
          is2024={is2024}
          isSelected={selectedRace?.raceId === race.raceId}
          matches={<CatalogMatchList matches={findRaceMatches(race, selection.q)} onOpen={openMatch} />}
          onSelect={() => {
            setParams((next) =>
              writeRaceReadingTarget(next, { raceKey: race.slug, section: "overview", branch: null, featureKey: null }),
            );
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              closingModalRef.current = false;
              setSelectedModalRace(race);
            }
          }}
        />
      )}
      desktopDetailView={
        selectedRace ? (
          <>
            <RaceDetailCard race={selectedRace} is2024={is2024} view={view} actions={actions} />
            <CatalogReadingDialog
              open={isWide && Boolean(openBranch)}
              title={openBranch?.entry.name ?? RACE_SINGULAR[ruleset]}
              onClose={backToRace}
            >
              {renderBranchReader(selectedRace, backToRace)}
            </CatalogReadingDialog>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">
              Оберіть {is2024 ? "вид" : "расу"} для перегляду деталей
            </p>
          </div>
        )
      }
      selectedModalItem={selectedModalRace}
      onCloseModal={closeModalWithBranch}
      isModalChromeHidden={Boolean(openBranch)}
      modalTitle={openBranch?.entry.name ?? selectedModalRace?.name ?? RACE_SINGULAR[ruleset]}
      renderModalContent={(race) =>
        openBranch && race === selectedRace ? (
          renderBranchReader(race, closeModalWithBranch)
        ) : (
          <RaceDetailCard race={race} is2024={is2024} view={view} actions={actions} />
        )
      }
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <CatalogFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          title={`Фільтри ${is2024 ? "видів" : "рас"}`}
          is2024={is2024}
          onClear={clearFilters}
        >
          <FilterGroup title="Розмір">
            {available.sizes.map((size) => (
              <FilterChip
                key={size}
                is2024={is2024}
                selected={selection.sizes.has(size)}
                onClick={() => toggleIn("size")(size)}
                label={size}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Швидкість">
            {available.speeds.map((speed) => (
              <FilterChip
                key={speed}
                is2024={is2024}
                selected={selection.speeds.has(speed)}
                onClick={() => toggleIn("speed")(speed)}
                label={`${speed} футів`}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Особливості">
            {available.traits.map((trait) => (
              <FilterChip
                key={trait}
                is2024={is2024}
                selected={selection.traits.has(trait)}
                onClick={() => toggleIn("trait")(trait)}
                label={RACE_TRAIT_LABELS[trait]}
              />
            ))}
          </FilterGroup>

          <SourceFilterSection
            is2024={is2024}
            available={available.sources}
            selection={selection.source}
            onToggleSource={(source) => setParams((next) => toggleSourceParam(next, source))}
            onToggleHomebrew={() => setParams((next) => toggleHomebrewParam(next))}
          />
        </CatalogFilterDialog>
      }
    />
  );
}

function RaceRow({
  race,
  is2024,
  isSelected,
  matches,
  onSelect,
}: {
  race: RaceData;
  is2024: boolean;
  isSelected: boolean;
  matches: React.ReactNode;
  onSelect: () => void;
}) {
  const branches = race.subraces.length + race.variants.length;

  return (
    <div className="pb-1 pt-3">
      <CatalogIllustrationCard
        imageSrc={race.imageSrc}
        title={race.name}
        englishTitle={race.engName}
        fallbackIcon={Users}
        is2024={is2024}
        isSelected={isSelected}
        onSelect={onSelect}
        meta={
          <>
            <span className="rounded-md border border-white/20 bg-slate-950/70 px-2 py-0.5 text-[11px] backdrop-blur-md">
              {race.source}
            </span>
            <span>{race.sizes.join(" / ")}</span>
            <span>{race.speed} футів</span>
            {branches > 0 ? <span>{branches} варіантів</span> : null}
          </>
        }
      />
      {matches}
    </div>
  );
}
