"use client";

import { useCallback, useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfusionData } from "@/lib/infusionsData";
import { InfusionDetailCard } from "@/components/infusions/InfusionDetailCard";
import { InfusionsFilterDialog } from "@/components/infusions/InfusionsFilterDialog";
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
import { collectInfusionEffects, hasInfusionEffect } from "@/lib/infusion-filter-facets";
import {
  getParamSet,
  setParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
} from "@/lib/catalog-url-helpers";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { getInfusionVisual } from "@/components/catalogs/catalog-visuals";
import { cn } from "@/lib/utils";

type SelectionState = {
  levels: Set<number>;
  targets: Set<string>;
  attunement: boolean | null;
  effects: Set<string>;
  source: SourceSelection;
  q: string;
  infusion: string;
};

const parseSelection = (params: URLSearchParams): SelectionState => {
  const rawLevels = getParamSet(params, "lvl");
  const levels = new Set<number>();
  for (const l of rawLevels) {
    const num = parseInt(l, 10);
    if (!isNaN(num)) levels.add(num);
  }
  const targets = getParamSet(params, "target");
  const rawAtt = params.get("att");
  const attunement = rawAtt === "1" ? true : null;
  const effects = getParamSet(params, "fx");
  const source = parseSourceSelection(params);
  const q = params.get("q") || "";
  const infusion = params.get("infusion") || "";
  return { levels, targets, attunement, effects, source, q, infusion };
};

const LEVEL_TABS = [
  { key: "ALL", label: "Всі рівні" },
  { key: "2", label: "2+ рівень" },
  { key: "6", label: "6+ рівень" },
  { key: "10", label: "10+ рівень" },
  { key: "14", label: "14+ рівень" },
];

const TARGET_TYPE_SHORT_LABELS: Record<string, string> = {
  WEAPON: "Зброя",
  ARMOR: "Обладунок",
  SHIELD: "Щит",
  RING: "Перстень",
  BOOTS: "Чоботи",
  HELMET: "Шолом",
  WAND_ROD_STAFF: "Фокус",
  GEM_CRYSTAL: "Кристал",
  ANY: "Репліка",
};

type Props = {
  infusions: InfusionData[];
};

export function InfusionsClient({ infusions }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalInfusion, setSelectedModalInfusion] = useState<InfusionData | null>(null);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection
  );

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return infusions.filter((inf) => {
      if (q) {
        const targetLabel = TARGET_TYPE_SHORT_LABELS[inf.targetType] || inf.targetType;
        const hay = `${inf.name} ${inf.engName} ${inf.targetType} ${targetLabel} ${inf.description} ${inf.shortDescription}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selection.levels.size > 0 && !selection.levels.has(inf.minArtificerLevel)) {
        return false;
      }

      if (selection.targets.size > 0 && !selection.targets.has(inf.targetType)) {
        return false;
      }

      if (selection.attunement && !inf.requiresAttunement) {
        return false;
      }

      if (selection.effects.size > 0 && !Array.from(selection.effects).some((effect) => hasInfusionEffect(inf, effect))) {
        return false;
      }

      if (!matchesSourceSelection(inf.source, selection.source)) {
        return false;
      }

      return true;
    });
  }, [infusions, selection]);

  const selectedInfusion = useMemo(() => {
    if (selection.infusion) {
      const byParam = infusions.find(
        (inf) =>
          String(inf.id) === selection.infusion ||
          inf.engName.toLowerCase() === selection.infusion.toLowerCase() ||
          inf.nameUa.toLowerCase() === selection.infusion.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, selection.infusion, infusions]);

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const selectSingleLevelTab = (lvlKey: string) => {
    setParams((next) => {
      if (lvlKey === "ALL") next.delete("lvl");
      else next.set("lvl", lvlKey);
    });
  };

  const toggleLevel = (lvl: number) => {
    setParams((next) => {
      const set = getParamSet(next, "lvl");
      const strLvl = String(lvl);
      if (set.has(strLvl)) set.delete(strLvl);
      else set.add(strLvl);
      setParamSet(next, "lvl", set);
    });
  };

  const toggleTarget = (target: string) => {
    setParams((next) => {
      const set = getParamSet(next, "target");
      if (set.has(target)) set.delete(target);
      else set.add(target);
      setParamSet(next, "target", set);
    });
  };

  const toggleAttunement = () => {
    setParams((next) => {
      const current = next.get("att");
      if (current === "1") next.delete("att");
      else next.set("att", "1");
    });
  };

  const toggleEffect = (effect: string) => {
    setParams((next) => {
      const set = getParamSet(next, "fx");
      if (set.has(effect)) set.delete(effect);
      else set.add(effect);
      setParamSet(next, "fx", set);
    });
  };

  const clearFilters = () => {
    setParams((next) => {
      next.delete("lvl");
      next.delete("target");
      next.delete("att");
      next.delete("fx");
      clearSourceParams(next);
    });
  };

  const available = useMemo(
    () => ({ effects: collectInfusionEffects(infusions), sources: collectCatalogSources(infusions) }),
    [infusions]
  );

  const activeTab = useMemo(() => {
    if (selection.levels.size === 1) {
      return String(Array.from(selection.levels)[0]);
    }
    if (selection.levels.size === 0) return "ALL";
    return null;
  }, [selection.levels]);

  const activeFiltersCount =
    selection.levels.size +
    selection.targets.size +
    selection.effects.size +
    countSourceFilters(selection.source) +
    (selection.attunement ? 1 : 0);

  return (
    <ContentListPage<InfusionData>
      title="Вливання Винахідника"
      is2024={false}
      subtitle="Artificer Infusions (Tasha's Cauldron of Everything)"
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук вливань за назвою, типом чи описом..."
      hasActiveFilters={activeFiltersCount > 0}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      tabs={
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {LEVEL_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectSingleLevelTab(tab.key)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-all shrink-0 border max-md:min-h-10",
                  isSelected
                    ? "border-arcane-500/50 bg-arcane-500/20 text-arcane-200 shadow-sm"
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
          <Wrench className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Вливань не знайдено</p>
          <p className="text-xs text-slate-500 mt-1">Спробуйте змінити фільтри або пошуковий запит</p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, infusion) => {
        const isSelected = selectedInfusion?.id === infusion.id;
        const visual = getInfusionVisual(infusion.targetType);
        const Icon = visual.icon;
        const targetLabel = TARGET_TYPE_SHORT_LABELS[infusion.targetType] || infusion.targetType;

        return (
          <div key={infusion.id} className="pt-2 pb-0.5 px-0.5">
            <div
              onClick={() => {
                setParams((next) => next.set("infusion", infusion.engName));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalInfusion(infusion);
                }
              }}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-xl border p-3 transition-all duration-300 cursor-pointer",
                isSelected
                  ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-arcane-400/40"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left icon badge */}
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", visual.iconWrap)}>
                  <Icon className={cn("h-5 w-5", visual.iconColor)} />
                </div>

                {/* Center infusion info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "truncate text-[15px] font-semibold transition-colors",
                        isSelected ? "text-arcane-300" : "text-slate-100 group-hover:text-white"
                      )}
                    >
                      {infusion.nameUa} <span className="font-normal text-slate-400 text-sm ml-1">[{infusion.engName}]</span>
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold border", visual.badgeClass)}>
                      Рівень {infusion.minArtificerLevel}+
                    </span>

                    <span className="text-[11px] text-slate-300">
                      {targetLabel}
                    </span>

                    {infusion.requiresAttunement && (
                      <span className="text-[11px] text-purple-300">
                        Налаштування
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
        selectedInfusion ? (
          <InfusionDetailCard infusion={selectedInfusion} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть вливання для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={selectedModalInfusion}
      onCloseModal={() => setSelectedModalInfusion(null)}
      modalTitle={selectedModalInfusion?.nameUa || "Деталі вливання"}
      renderModalContent={(infusion) => <InfusionDetailCard infusion={infusion} />}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <InfusionsFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          selectedLevels={selection.levels}
          toggleLevel={toggleLevel}
          selectedTargets={selection.targets}
          toggleTarget={toggleTarget}
          attunementOnly={Boolean(selection.attunement)}
          toggleAttunement={toggleAttunement}
          availableEffects={available.effects}
          selectedEffects={selection.effects}
          toggleEffect={toggleEffect}
          availableSources={available.sources}
          sourceSelection={selection.source}
          toggleSource={(source) => setParams((next) => toggleSourceParam(next, source))}
          toggleHomebrew={() => setParams((next) => toggleHomebrewParam(next))}
          clearFilters={clearFilters}
        />
      }
    />
  );
}
