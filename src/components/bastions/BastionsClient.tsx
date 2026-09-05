"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { getBastionFacilityVisual } from "@/components/catalogs/catalog-visuals";
import { BastionFacilityDetailCard } from "@/components/bastions/BastionFacilityDetailCard";
import { BastionsFilterDialog } from "@/components/bastions/BastionsFilterDialog";
import {
  BastionAddFacility,
  BastionMatchBadge,
  BastionPickerBanner,
} from "@/components/bastions/BastionPicking";
import { addFacility, loadBastionPicker } from "@/lib/actions/bastion-actions";
import type { BastionPicker } from "@/server/db/bastions";
import { findFacilityMatch, findSpecialFacilityUsage } from "@/rules/bastions";
import { toast } from "sonner";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
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
import {
  type CatalogEmbed,
  findCatalogEmbed,
  getParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
  setParamSet,
} from "@/lib/catalog-url-helpers";
import {
  BASTION_LEVELS,
  type BastionFacilityData,
  type BastionSpace,
  describeHirelings,
  translateOrder,
  translateSpace,
} from "@/lib/bastion-facility";
import { cn } from "@/lib/utils";

type SelectionState = {
  levels: Set<string>;
  orders: Set<string>;
  spaces: Set<string>;
  noPrerequisite: boolean;
  source: SourceSelection;
  q: string;
  facility: string;
};

const LEVEL_TABS = [
  { key: "ALL", label: "Усі" },
  { key: "BASIC", label: "Базові" },
  ...BASTION_LEVELS.map((level) => ({ key: String(level), label: `${level} рівень` })),
];

const parseSelection = (params: URLSearchParams): SelectionState => ({
  levels: getParamSet(params, "lvl"),
  orders: getParamSet(params, "order"),
  spaces: getParamSet(params, "space"),
  noPrerequisite: params.get("noreq") === "1",
  source: parseSourceSelection(params),
  q: params.get("q") || "",
  facility: params.get("facility") || "",
});

export function BastionsClient({
  facilities,
}: {
  facilities: BastionFacilityData[];
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalFacility, setModalFacility] = useState<BastionFacilityData | null>(null);
  const { embed, picker, isAdding, addToBastion } = useBastionPicking();

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection
  );

  const sources = useMemo(() => collectCatalogSources(facilities), [facilities]);

  const filtered = useMemo(
    () => facilities.filter((facility) => matchesSelection(facility, selection)),
    [facilities, selection]
  );

  const selectedFacility = useMemo(() => {
    if (selection.facility) {
      const byParam = facilities.find(
        (facility) =>
          facility.slug === selection.facility ||
          facility.engName.toLowerCase() === selection.facility.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [facilities, filtered, selection.facility]);

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

  const selectLevelTab = (tabKey: string) =>
    setParams((next) => {
      if (tabKey === "ALL") next.delete("lvl");
      else next.set("lvl", tabKey);
    });

  const toggleNoPrerequisite = () =>
    setParams((next) => {
      if (next.get("noreq") === "1") next.delete("noreq");
      else next.set("noreq", "1");
    });

  const clearFilters = () =>
    setParams((next) => {
      next.delete("lvl");
      next.delete("order");
      next.delete("space");
      next.delete("noreq");
      clearSourceParams(next);
    });

  const activeTab = selection.levels.size === 0 ? "ALL" : [...selection.levels][0];
  const activeFiltersCount =
    selection.orders.size +
    selection.spaces.size +
    (selection.noPrerequisite ? 1 : 0) +
    countSourceFilters(selection.source);

  return (
    <ContentListPage<BastionFacilityData>
      title="Приміщення бастіону"
      is2024
      subtitle="Bastion Facilities"
      totalCount={facilities.length}
      filteredCount={filtered.length}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук приміщень за назвою або описом..."
      hasActiveFilters={activeFiltersCount > 0}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      tabs={
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          {LEVEL_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectLevelTab(tab.key)}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-200 shadow-sm"
                  : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
      topBanner={
        picker ? (
          <BastionPickerBanner
            persName={embed?.persName ?? null}
            characterLevel={picker.characterLevel}
            usage={findSpecialFacilityUsage({
              characterLevel: picker.characterLevel,
              used: picker.specialCount,
            })}
          />
        ) : undefined
      }
      data={filtered}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Home className="mb-2 h-10 w-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">Приміщень не знайдено</p>
          <p className="mt-1 text-xs text-slate-500">Спробуйте змінити фільтри або пошуковий запит</p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, facility) => {
        const isSelected = selectedFacility?.slug === facility.slug;
        const visual = getBastionFacilityVisual(facility.orders[0]);
        const Icon = visual.icon;

        return (
          <div key={facility.slug} className="px-0.5 pb-0.5 pt-2">
            <div
              onClick={() => {
                setParams((next) => next.set("facility", facility.slug));
                if (typeof window !== "undefined" && window.innerWidth < 1024) setModalFacility(facility);
              }}
              className={cn(
                "glass-panel group relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all duration-300",
                isSelected
                  ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-amber-400/40"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", visual.iconWrap)}>
                  <Icon className={cn("h-5 w-5", visual.iconColor)} />
                </div>

                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "truncate text-[15px] font-semibold transition-colors",
                      isSelected ? "text-amber-300" : "text-slate-100 group-hover:text-white"
                    )}
                  >
                    {facility.name}
                    <span className="ml-1 text-sm font-normal text-slate-400">[{facility.engName}]</span>
                  </span>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold", visual.badgeClass)}>
                      {facility.level === null ? "Базове" : `Рівень ${facility.level}+`}
                    </span>
                    <span className="text-[11px] text-slate-400">{facility.space.map(translateSpace).join(" / ")}</span>
                    {facility.orders.length > 0 && (
                      <span className="text-[11px] text-indigo-300">{facility.orders.map(translateOrder).join(", ")}</span>
                    )}
                    {facility.hirelings.length > 0 && (
                      <span className="text-[11px] text-slate-500">Найманців: {describeHirelings(facility.hirelings)}</span>
                    )}
                  </div>
                </div>
              </div>

              {picker ? (
                <>
                  <BastionMatchBadge
                    level={facility.level}
                    prerequisiteText={facility.prerequisiteText}
                    match={findFacilityMatch(facility, picker.profile)}
                  />
                  <BastionAddFacility
                    facility={facility}
                    isPending={isAdding}
                    onAdd={(space) => addToBastion(facility.slug, space)}
                  />
                </>
              ) : null}
            </div>
          </div>
        );
      }}
      desktopDetailView={
        selectedFacility ? (
          <BastionFacilityDetailCard facility={selectedFacility} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть приміщення для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={modalFacility}
      onCloseModal={() => setModalFacility(null)}
      modalTitle={modalFacility?.name || "Деталі приміщення"}
      renderModalContent={(facility) => <BastionFacilityDetailCard facility={facility} />}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <BastionsFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          selectedOrders={selection.orders}
          toggleOrder={toggleIn("order")}
          selectedSpaces={selection.spaces}
          toggleSpace={toggleIn("space")}
          noPrerequisiteOnly={selection.noPrerequisite}
          toggleNoPrerequisite={toggleNoPrerequisite}
          availableSources={sources}
          sourceSelection={selection.source}
          toggleSource={(source) => setParams((next) => toggleSourceParam(next, source))}
          toggleHomebrew={() => setParams((next) => toggleHomebrewParam(next))}
          clearFilters={clearFilters}
        />
      }
    />
  );
}

/// Пікер — це той самий каталог, відкритий із листа персонажа в iframe: сторінка лишається
/// статичною, а режим вбудовування читається з адреси вже після монтування.
function useBastionPicking() {
  const [embed, setEmbed] = useState<CatalogEmbed | null>(null);
  const [picker, setPicker] = useState<BastionPicker | null>(null);
  const [isAdding, startAdding] = useTransition();

  useEffect(() => {
    const found = findCatalogEmbed(getSearchParamsFromLocation());
    if (!found) return;
    setEmbed(found);

    let isStale = false;
    loadBastionPicker(found.persId)
      .then((result) => {
        if (!isStale && result.ok) setPicker(result.picker);
      })
      .catch(() => {});

    return () => {
      isStale = true;
    };
  }, []);

  const addToBastion = (slug: string, space: BastionSpace | undefined) => {
    if (!embed) return;

    startAdding(async () => {
      const added = await addFacility({ persId: embed.persId, slug, space });
      if (!added.ok) {
        toast.error(added.error);
        return;
      }

      const refreshed = await loadBastionPicker(embed.persId);
      if (refreshed.ok) setPicker(refreshed.picker);
      window.parent?.postMessage({ type: "BASTION_FACILITY_ADDED" }, window.location.origin);
      toast.success("Приміщення додано");
    });
  };

  return { embed, picker, isAdding, addToBastion };
}

function matchesSelection(facility: BastionFacilityData, selection: SelectionState): boolean {
  const query = selection.q.trim().toLowerCase();
  if (query) {
    const haystack = `${facility.name} ${facility.engName} ${facility.shortDescription} ${facility.description} ${facility.prerequisiteText}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (selection.levels.size > 0 && !selection.levels.has(findLevelKey(facility))) return false;
  if (selection.orders.size > 0 && !facility.orders.some((order) => selection.orders.has(order))) return false;
  if (selection.spaces.size > 0 && !facility.space.some((space) => selection.spaces.has(space))) return false;
  if (selection.noPrerequisite && facility.prerequisite) return false;
  if (!matchesSourceSelection(facility.source, selection.source)) return false;

  return true;
}

function findLevelKey(facility: BastionFacilityData): string {
  return facility.level === null ? "BASIC" : String(facility.level);
}
