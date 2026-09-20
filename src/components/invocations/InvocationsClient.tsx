"use client";

import { useCallback, useMemo, useState } from "react";
import { Ruleset } from "@prisma/client";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvocationData } from "@/lib/invocationsData";
import { InvocationDetailCard } from "@/components/invocations/InvocationDetailCard";
import { InvocationsFilterDialog } from "@/components/invocations/InvocationsFilterDialog";
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
  getParamSet,
  setParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
} from "@/lib/catalog-url-helpers";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { getInvocationVisual } from "@/components/catalogs/catalog-visuals";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

type SelectionState = {
  levels: Set<number>;
  pacts: Set<string>;
  noRequirements: boolean;
  source: SourceSelection;
  q: string;
  invocation: string;
};

function hasAnyRequirement(invocation: InvocationData): boolean {
  return Boolean(invocation.minLevel || invocation.pactRequirement || invocation.prerequisite);
}

const parseSelection = (params: URLSearchParams): SelectionState => {
  const rawLevels = getParamSet(params, "lvl");
  const levels = new Set<number>();
  for (const l of rawLevels) {
    const num = parseInt(l, 10);
    if (!isNaN(num)) levels.add(num);
  }
  const pacts = getParamSet(params, "pact");
  const noRequirements = params.get("noreq") === "1";
  const source = parseSourceSelection(params);
  const q = params.get("q") || "";
  const invocation = params.get("invocation") || "";
  return { levels, pacts, noRequirements, source, q, invocation };
};

const LEVEL_TABS = [
  { key: "ALL", label: "Всі рівні" },
  { key: "NO_REQ", label: "Без вимог" },
  { key: "2", label: "2+ рівень" },
  { key: "5", label: "5+ рівень" },
  { key: "7", label: "7+ рівень" },
  { key: "9", label: "9+ рівень" },
  { key: "12", label: "12+ рівень" },
  { key: "15", label: "15+ рівень" },
];

type Props = {
  invocations: InvocationData[];
  ruleset?: Ruleset;
};

export function InvocationsClient({ invocations, ruleset = "RULES_2014" }: Props) {
  const is2024 = ruleset === "RULES_2024";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalInvocation, setSelectedModalInvocation] = useState<InvocationData | null>(null);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection
  );

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return invocations.filter((inv) => {
      if (q) {
        const hay = `${inv.name} ${inv.engName} ${inv.pactRequirement || ""} ${inv.prerequisite || ""} ${inv.description} ${inv.shortDescription}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selection.levels.size > 0) {
        if (inv.minLevel === null) {
          if (!selection.levels.has(0)) return false;
        } else {
          if (!selection.levels.has(inv.minLevel)) return false;
        }
      }

      if (selection.pacts.size > 0) {
        if (!inv.pactRequirement || !selection.pacts.has(inv.pactRequirement)) {
          return false;
        }
      }

      if (selection.noRequirements && hasAnyRequirement(inv)) {
        return false;
      }

      if (!matchesSourceSelection(inv.source, selection.source)) {
        return false;
      }

      return true;
    });
  }, [invocations, selection]);

  const selectedInvocation = useMemo(() => {
    if (selection.invocation) {
      const byParam = invocations.find(
        (inv) =>
          String(inv.id) === selection.invocation ||
          inv.engName.toLowerCase() === selection.invocation.toLowerCase() ||
          inv.nameUa.toLowerCase() === selection.invocation.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, selection.invocation, invocations]);

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const selectSingleLevelTab = (lvlKey: string) => {
    setParams((next) => {
      if (lvlKey === "ALL") {
        next.delete("lvl");
      } else if (lvlKey === "NO_REQ") {
        next.set("lvl", "0");
      } else {
        next.set("lvl", lvlKey);
      }
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

  const togglePact = (pact: string) => {
    setParams((next) => {
      const set = getParamSet(next, "pact");
      if (set.has(pact)) set.delete(pact);
      else set.add(pact);
      setParamSet(next, "pact", set);
    });
  };

  const toggleNoRequirements = () => {
    setParams((next) => {
      if (next.get("noreq") === "1") next.delete("noreq");
      else next.set("noreq", "1");
    });
  };

  const clearFilters = () => {
    setParams((next) => {
      next.delete("lvl");
      next.delete("pact");
      next.delete("noreq");
      clearSourceParams(next);
    });
  };

  const availableSources = useMemo(() => collectCatalogSources(invocations), [invocations]);

  const activeTab = useMemo(() => {
    if (selection.levels.size === 1) {
      const val = Array.from(selection.levels)[0];
      return val === 0 ? "NO_REQ" : String(val);
    }
    if (selection.levels.size === 0) return "ALL";
    return null;
  }, [selection.levels]);

  const activeFiltersCount =
    selection.levels.size +
    selection.pacts.size +
    (selection.noRequirements ? 1 : 0) +
    countSourceFilters(selection.source);

  return (
    <ContentListPage<InvocationData>
      title="Потойбічні виклики"
      is2024={is2024}
      subtitle="Eldritch Invocations"
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук викликів за назвою або вимогами..."
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
          <Eye className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Відозв не знайдено</p>
          <p className="text-xs text-slate-500 mt-1">Спробуйте змінити фільтри або пошуковий запит</p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, invocation) => {
        const isSelected = selectedInvocation?.id === invocation.id;
        const visual = getInvocationVisual(invocation.pactRequirement, invocation.minLevel);
        const Icon = visual.icon;

        return (
          <div key={invocation.id} className="pt-2 pb-0.5 px-0.5">
            <div
              onClick={() => {
                setParams((next) => next.set("invocation", invocation.engName));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalInvocation(invocation);
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
                {/* Left icon badge */}
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", visual.iconWrap)}>
                  <Icon className={cn("h-5 w-5", visual.iconColor)} />
                </div>

                {/* Center invocation info */}
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
                      {invocation.nameUa} <span className="font-normal text-slate-400 text-sm ml-1">[{invocation.engName}]</span>
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold border", visual.badgeClass)}>
                      {invocation.minLevel ? `Рівень ${invocation.minLevel}+` : "Без рівня"}
                    </span>

                    {invocation.pactRequirement && (
                      <span className="text-[11px] text-indigo-300">
                        {invocation.pactRequirement}
                      </span>
                    )}

                    {invocation.prerequisite && (
                      <span className="truncate text-slate-400 text-[11px]">
                        {invocation.prerequisite}
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
        selectedInvocation ? (
          <InvocationDetailCard invocation={selectedInvocation} is2024={is2024} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть відозву для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={selectedModalInvocation}
      onCloseModal={() => setSelectedModalInvocation(null)}
      modalTitle={selectedModalInvocation?.nameUa || "Деталі відозви"}
      renderModalContent={(inv) => <InvocationDetailCard invocation={inv} is2024={is2024} />}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <InvocationsFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          is2024={is2024}
          selectedLevels={selection.levels}
          toggleLevel={toggleLevel}
          selectedPacts={selection.pacts}
          togglePact={togglePact}
          noRequirementsOnly={selection.noRequirements}
          toggleNoRequirements={toggleNoRequirements}
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
