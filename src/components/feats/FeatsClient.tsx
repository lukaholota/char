"use client";

import { useCallback, useMemo, useState } from "react";
import { Ruleset } from "@/lib/prisma-enums";
import { Award, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatData, FeatCategory } from "@/lib/featsData";
import { FeatDetailCard } from "@/components/feats/FeatDetailCard";
import { FeatsFilterDialog } from "@/components/feats/FeatsFilterDialog";
import { featCategoryTranslations } from "@/lib/refs/translation";
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
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import {
  getParamSet,
  setParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
} from "@/lib/catalog-url-helpers";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { getFeatVisual } from "@/components/catalogs/catalog-visuals";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

type SelectionState = {
  categories: Set<string>;
  repeatable: boolean | null;
  noPrerequisite: boolean;
  source: SourceSelection;
  q: string;
  feat: string;
};

const parseSelection = (params: URLSearchParams): SelectionState => {
  const categories = getParamSet(params, "cat");
  const rawRep = params.get("rep");
  const repeatable = rawRep === "1" ? true : rawRep === "0" ? false : null;
  const noPrerequisite = params.get("noreq") === "1";
  const source = parseSourceSelection(params);
  const q = params.get("q") || "";
  const feat = params.get("feat") || "";
  return { categories, repeatable, noPrerequisite, source, q, feat };
};

const CATEGORY_TABS: { key: FeatCategory | "ALL"; label: string }[] = [
  { key: "ALL", label: "Всі" },
  { key: "ORIGIN", label: "Походження" },
  { key: "GENERAL", label: "Загальні" },
  { key: "EPIC_BOON", label: "Епічні" },
  { key: "FIGHTING_STYLE", label: "Бойові стилі" },
];

type Props = {
  feats: FeatData[];
  ruleset?: Ruleset;
};

export function FeatsClient({ feats, ruleset = "RULES_2014" }: Props) {
  const is2024 = ruleset === "RULES_2024";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalFeat, setSelectedModalFeat] = useState<FeatData | null>(null);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection
  );

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return feats.filter((f) => {
      if (q) {
        const hay = `${f.name} ${f.engName} ${f.description} ${f.prerequisite || ""} ${f.benefits?.map((b) => `${b.name} ${b.description}`).join(" ") || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selection.categories.size > 0 && !selection.categories.has(f.category || "")) {
        return false;
      }

      if (selection.repeatable !== null && Boolean(f.isRepeatable) !== selection.repeatable) {
        return false;
      }

      if (selection.noPrerequisite && f.prerequisite) {
        return false;
      }

      if (!matchesSourceSelection(f.source, selection.source)) {
        return false;
      }

      return true;
    });
  }, [feats, selection]);

  const selectedFeat = useMemo(() => {
    if (selection.feat) {
      const byParam = feats.find(
        (f) =>
          String(f.featId) === selection.feat ||
          f.engName.toLowerCase() === selection.feat.toLowerCase() ||
          f.name.toLowerCase() === selection.feat.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, selection.feat, feats]);

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const selectSingleCategoryTab = (catKey: FeatCategory | "ALL") => {
    setParams((next) => {
      if (catKey === "ALL") next.delete("cat");
      else next.set("cat", catKey);
    });
  };

  const toggleCategory = (cat: string) => {
    setParams((next) => {
      const set = getParamSet(next, "cat");
      if (set.has(cat)) set.delete(cat);
      else set.add(cat);
      setParamSet(next, "cat", set);
    });
  };

  const toggleRepeatable = () => {
    setParams((next) => {
      const current = next.get("rep");
      if (current === "1") next.delete("rep");
      else next.set("rep", "1");
    });
  };

  const toggleNoPrerequisite = () => {
    setParams((next) => {
      if (next.get("noreq") === "1") next.delete("noreq");
      else next.set("noreq", "1");
    });
  };

  const clearFilters = () => {
    setParams((next) => {
      next.delete("cat");
      next.delete("rep");
      next.delete("noreq");
      clearSourceParams(next);
    });
  };

  const availableSources = useMemo(() => collectCatalogSources(feats), [feats]);

  const activeTab = useMemo(() => {
    if (selection.categories.size === 1) {
      return Array.from(selection.categories)[0] as FeatCategory;
    }
    if (selection.categories.size === 0) return "ALL";
    return null;
  }, [selection.categories]);

  const activeFiltersCount =
    selection.categories.size +
    (selection.repeatable !== null ? 1 : 0) +
    (selection.noPrerequisite ? 1 : 0) +
    countSourceFilters(selection.source);
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <ContentListPage<FeatData>
      title="Риси"
      is2024={is2024}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук рис..."
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      tabs={
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectSingleCategoryTab(tab.key)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-all shrink-0 border max-md:min-h-10",
                  isSelected
                    ? findAccentVariant(is2024, { prism: "border-prism-500/50 bg-prism-500/20 text-prism-200 shadow-sm", arcane: "border-arcane-500/50 bg-arcane-500/20 text-arcane-200 shadow-sm" })
                    : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      }
      data={filtered}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Award className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Рис не знайдено</p>
          <p className="text-xs text-slate-500 mt-1">Спробуйте змінити фільтри або пошуковий запит</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, feat) => {
        const isSelected = selectedFeat?.featId === feat.featId;
        const categoryLabel = (feat.category && featCategoryTranslations[feat.category as keyof typeof featCategoryTranslations]) || feat.category;
        const visual = getFeatVisual(feat.category);
        const Icon = visual.icon;

        return (
          <div key={feat.featId} className="pt-2 pb-0.5 px-0.5">
            <div
              onClick={() => {
                setParams((next) => next.set("feat", feat.engName));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalFeat(feat);
                }
              }}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-xl border p-3 transition-all duration-300 cursor-pointer",
                isSelected
                  ? findAccentVariant(is2024, { prism: "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-prism-400/40", arcane: "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-arcane-400/40" })
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left feat category icon badge */}
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", visual.iconWrap)}>
                  <Icon className={cn("h-5 w-5", visual.iconColor)} />
                </div>

                {/* Center feat info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "truncate text-[15px] font-semibold transition-colors",
                        isSelected
                          ? findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-arcane-300" })
                          : "text-slate-100 group-hover:text-white"
                      )}
                    >
                      {feat.name} {feat.engName && <span className="font-normal text-slate-400 text-sm ml-1">[{feat.engName}]</span>}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium border", visual.badgeClass)}>
                      {categoryLabel}
                    </span>
                    {feat.isRepeatable && (
                      <span className="flex items-center gap-1 text-cyan-400 text-[11px]" title="Можна обирати кілька разів">
                        <Repeat className="h-3 w-3" />
                        <span>Повтор</span>
                      </span>
                    )}
                    {feat.prerequisite && (
                      <span className="truncate text-slate-400 text-xs">
                        <strong className="font-medium text-slate-300">Вимога:</strong> {feat.prerequisite}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }}
      desktopDetailView={
        selectedFeat ? (
          <FeatDetailCard feat={selectedFeat} is2024={is2024} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть рису для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={selectedModalFeat}
      onCloseModal={() => setSelectedModalFeat(null)}
      modalTitle={selectedModalFeat?.name || "Деталі риси"}
      renderModalContent={(feat) => <FeatDetailCard feat={feat} is2024={is2024} />}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <FeatsFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          is2024={is2024}
          selectedCategories={selection.categories}
          toggleCategory={toggleCategory}
          repeatableOnly={Boolean(selection.repeatable)}
          toggleRepeatable={toggleRepeatable}
          noPrerequisiteOnly={selection.noPrerequisite}
          toggleNoPrerequisite={toggleNoPrerequisite}
          availableSources={availableSources}
          sourceSelection={selection.source}
          toggleSource={(source) => setParams((next) => toggleSourceParam(next, source))}
          toggleHomebrew={() => setParams((next) => toggleHomebrewParam(next))}
          clearFilters={clearFilters}
        />
      }
    />
  );
}
