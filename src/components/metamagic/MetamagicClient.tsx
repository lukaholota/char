"use client";

import { useCallback, useMemo, useState } from "react";
import type { Ruleset } from "@prisma/client";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MetamagicData } from "@/lib/metamagicData";
import { describeMetamagicCost } from "@/lib/metamagic-cost";
import { MetamagicDetailCard } from "@/components/metamagic/MetamagicDetailCard";
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
import { getSearchParamsFromLocation, replaceUrlSearchParams } from "@/lib/catalog-url-helpers";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import { getMetamagicVisual } from "@/components/catalogs/catalog-visuals";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

const ALL_COSTS = "ALL";
const SPELL_LEVEL_COST = "level";

type SelectionState = {
  cost: string;
  source: SourceSelection;
  q: string;
  metamagic: string;
};

type CostTab = {
  key: string;
  label: string;
};

type Props = {
  metamagic: MetamagicData[];
  ruleset?: Ruleset;
};

function parseSelection(params: URLSearchParams): SelectionState {
  return {
    cost: params.get("cost") || ALL_COSTS,
    source: parseSourceSelection(params),
    q: params.get("q") || "",
    metamagic: params.get("metamagic") || "",
  };
}

function findCostKey(option: MetamagicData): string {
  return option.isCostSpellLevel ? SPELL_LEVEL_COST : String(option.cost);
}

function collectCostTabs(options: MetamagicData[]): CostTab[] {
  const byKey = new Map<string, MetamagicData>();
  for (const option of [...options].sort((a, b) => Number(a.isCostSpellLevel) - Number(b.isCostSpellLevel) || a.cost - b.cost)) {
    if (!byKey.has(findCostKey(option))) byKey.set(findCostKey(option), option);
  }

  return [
    { key: ALL_COSTS, label: "Будь-яка ціна" },
    ...[...byKey.entries()].map(([key, option]) => ({ key, label: describeMetamagicCost(option) })),
  ];
}

function matchesQuery(option: MetamagicData, query: string): boolean {
  if (!query) return true;
  return `${option.nameUa} ${option.engName} ${option.description}`.toLowerCase().includes(query);
}

function findSelectedMetamagic(options: MetamagicData[], filtered: MetamagicData[], key: string): MetamagicData | null {
  const lowered = key.toLowerCase();
  const byParam = key
    ? options.find((option) => option.engName.toLowerCase() === lowered || option.nameUa.toLowerCase() === lowered)
    : undefined;
  return byParam ?? filtered[0] ?? null;
}

export function MetamagicClient({ metamagic, ruleset = "RULES_2014" }: Props) {
  const is2024 = ruleset === "RULES_2024";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalMetamagic, setSelectedModalMetamagic] = useState<MetamagicData | null>(null);
  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(parseSelection);

  const costTabs = useMemo(() => collectCostTabs(metamagic), [metamagic]);
  const availableSources = useMemo(() => collectCatalogSources(metamagic), [metamagic]);

  const filtered = useMemo(() => {
    const query = selection.q.trim().toLowerCase();
    return metamagic.filter(
      (option) =>
        matchesQuery(option, query) &&
        (selection.cost === ALL_COSTS || findCostKey(option) === selection.cost) &&
        matchesSourceSelection(option.source, selection.source)
    );
  }, [metamagic, selection]);

  const selectedMetamagic = useMemo(
    () => findSelectedMetamagic(metamagic, filtered, selection.metamagic),
    [metamagic, filtered, selection.metamagic]
  );

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const selectCost = (key: string) =>
    setParams((next) => (key === ALL_COSTS ? next.delete("cost") : next.set("cost", key)));

  const clearFilters = () =>
    setParams((next) => {
      next.delete("cost");
      clearSourceParams(next);
    });

  const selectMetamagic = (option: MetamagicData) => {
    setParams((next) => next.set("metamagic", option.engName));
    if (typeof window !== "undefined" && window.innerWidth < 1024) setSelectedModalMetamagic(option);
  };

  const activeFiltersCount = (selection.cost === ALL_COSTS ? 0 : 1) + countSourceFilters(selection.source);

  return (
    <ContentListPage<MetamagicData>
      title="Метамагія"
      is2024={is2024}
      subtitle="Metamagic"
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук метамагії за назвою або описом..."
      hasActiveFilters={activeFiltersCount > 0}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      tabs={
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {costTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectCost(tab.key)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition-all shrink-0 border max-md:min-h-10",
                selection.cost === tab.key
                  ? findAccentVariant(is2024, { prism: "border-prism-500/50 bg-prism-500/20 text-prism-200 shadow-sm", arcane: "border-arcane-500/50 bg-arcane-500/20 text-arcane-200 shadow-sm" })
                  : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
      data={filtered}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Wand2 className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Метамагії не знайдено</p>
          <p className="text-xs text-slate-500 mt-1">Спробуйте змінити фільтри або пошуковий запит</p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, option) => {
        const isSelected = selectedMetamagic?.engName === option.engName;
        const visual = getMetamagicVisual(option.cost, option.isCostSpellLevel);
        const Icon = visual.icon;

        return (
          <div key={option.engName} className="pt-2 pb-0.5 px-0.5">
            <div
              onClick={() => selectMetamagic(option)}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-xl border p-3 transition-all duration-300 cursor-pointer",
                isSelected
                  ? findAccentVariant(is2024, { prism: "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-prism-400/40", arcane: "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-arcane-400/40" })
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
                      "block truncate text-[15px] font-semibold transition-colors",
                      isSelected ? (findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-arcane-300" })) : "text-slate-100 group-hover:text-white"
                    )}
                  >
                    {option.nameUa} <span className="font-normal text-slate-400 text-sm ml-1">[{option.engName}]</span>
                  </span>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold border", visual.badgeClass)}>
                      {describeMetamagicCost(option)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }}
      desktopDetailView={
        selectedMetamagic ? (
          <MetamagicDetailCard metamagic={selectedMetamagic} is2024={is2024} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть варіант метамагії для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={selectedModalMetamagic}
      onCloseModal={() => setSelectedModalMetamagic(null)}
      modalTitle={selectedModalMetamagic?.nameUa || "Деталі метамагії"}
      renderModalContent={(option) => <MetamagicDetailCard metamagic={option} is2024={is2024} />}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <CatalogFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          title="Фільтри метамагії"
          is2024={is2024}
          onClear={clearFilters}
        >
          <SourceFilterSection
            is2024={is2024}
            available={availableSources}
            selection={selection.source}
            onToggleSource={(source) => setParams((next) => toggleSourceParam(next, source))}
            onToggleHomebrew={() => setParams((next) => toggleHomebrewParam(next))}
          />
        </CatalogFilterDialog>
      }
    />
  );
}
