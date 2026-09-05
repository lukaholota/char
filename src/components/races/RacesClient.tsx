"use client";

import { useCallback, useMemo, useState } from "react";
import type { Ruleset } from "@prisma/client";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CatalogIllustrationCard } from "@/components/catalogs/CatalogIllustrationCard";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import { RaceDetailCard } from "@/components/races/RaceDetailCard";
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
};

const parseSelection = (params: URLSearchParams): SelectionState => ({
  source: parseSourceSelection(params),
  sizes: getParamSet(params, "size"),
  speeds: getParamSet(params, "speed"),
  traits: getParamSet(params, "trait"),
  q: params.get("q") || "",
  race: params.get("race") || "",
});

/// Ознаки, яких у каталозі немає окремим полем, але за якими расу шукають найчастіше.
const RACE_TRAIT_LABELS = {
  DARKVISION: "Темнозір",
  FLIGHT: "Політ",
  SWIM: "Плавання",
  BRANCHES: "З підрасами чи варіантами",
} as const;

type RaceTraitKey = keyof typeof RACE_TRAIT_LABELS;

const RACE_TRAIT_KEYS = Object.keys(RACE_TRAIT_LABELS) as RaceTraitKey[];

function collectTraitNames(race: RaceData): string[] {
  const branches = [...race.subraces, ...race.variants].flatMap((branch) => branch.traits);
  return [...race.traits, ...branches].map((trait) => trait.engName.toLowerCase());
}

function hasExtraSpeed(race: RaceData, label: string): boolean {
  return race.extraSpeeds.some((speed) => speed.label.toLowerCase().includes(label));
}

function hasRaceTrait(race: RaceData, trait: string): boolean {
  const names = collectTraitNames(race);
  const hasTraitNamed = (...needles: string[]) =>
    names.some((name) => needles.some((needle) => name.includes(needle)));

  if (trait === "DARKVISION") return hasTraitNamed("darkvision");
  if (trait === "FLIGHT") return hasExtraSpeed(race, "політ") || hasTraitNamed("flight", "flying");
  if (trait === "SWIM") return hasExtraSpeed(race, "плав") || hasTraitNamed("swim");
  if (trait === "BRANCHES") return race.subraces.length + race.variants.length > 0;
  return false;
}

function findSearchHaystack(race: RaceData): string {
  const traits = race.traits.map((trait) => `${trait.name} ${trait.description}`).join(" ");
  const branches = [...race.subraces, ...race.variants].map((branch) => branch.name).join(" ");
  return `${race.name} ${race.engName} ${race.source} ${traits} ${branches}`.toLowerCase();
}

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

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection,
  );

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
      if (query && !findSearchHaystack(race).includes(query)) return false;
      if (!matchesSourceSelection(race.source, selection.source)) return false;
      if (selection.sizes.size > 0 && !race.sizes.some((size) => selection.sizes.has(size))) return false;
      if (selection.speeds.size > 0 && !selection.speeds.has(String(race.speed))) return false;
      if (selection.traits.size > 0 && !Array.from(selection.traits).every((trait) => hasRaceTrait(race, trait))) {
        return false;
      }
      return true;
    });
  }, [races, selection]);

  const selectedRace = useMemo(() => {
    if (selection.race) {
      const byParam = races.find(
        (race) => race.slug === selection.race || String(race.raceId) === selection.race,
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, races, selection.race]);

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

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
          onSelect={() => {
            setParams((next) => next.set("race", race.slug));
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setSelectedModalRace(race);
            }
          }}
        />
      )}
      desktopDetailView={
        selectedRace ? (
          <RaceDetailCard race={selectedRace} is2024={is2024} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">
              Оберіть {is2024 ? "вид" : "расу"} для перегляду деталей
            </p>
          </div>
        )
      }
      selectedModalItem={selectedModalRace}
      onCloseModal={() => setSelectedModalRace(null)}
      modalTitle={selectedModalRace?.name || RACE_SINGULAR[ruleset]}
      renderModalContent={(race) => <RaceDetailCard race={race} is2024={is2024} />}
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
  onSelect,
}: {
  race: RaceData;
  is2024: boolean;
  isSelected: boolean;
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
    </div>
  );
}
