"use client";

import { useCallback, useMemo, useState } from "react";
import { Ruleset } from "@prisma/client";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArmorData } from "@/lib/armorData";
import { ArmorDetailCard } from "@/components/armor/ArmorDetailCard";
import { ArmorFilterDialog } from "@/components/armor/ArmorFilterDialog";
import { armorTypeTranslations } from "@/lib/refs/translation";
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
import { getArmorVisual } from "@/components/catalogs/catalog-visuals";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

type SelectionState = {
  types: Set<string>;
  disadvantage: boolean | null;
  strengthReq: boolean | null;
  source: SourceSelection;
  q: string;
  armor: string;
};

const parseSelection = (params: URLSearchParams): SelectionState => {
  const types = getParamSet(params, "type");
  const rawDis = params.get("dis");
  const disadvantage = rawDis === "1" ? true : null;
  const rawStr = params.get("str");
  const strengthReq = rawStr === "1" ? true : null;
  const source = parseSourceSelection(params);
  const q = params.get("q") || "";
  const armor = params.get("armor") || "";
  return { types, disadvantage, strengthReq, source, q, armor };
};

const TYPE_TABS = [
  { key: "ALL", label: "Всі" },
  { key: "LIGHT", label: "Легкі" },
  { key: "MEDIUM", label: "Середні" },
  { key: "HEAVY", label: "Важкі" },
  { key: "SHIELD", label: "Щити" },
];

type Props = {
  armors: ArmorData[];
  ruleset?: Ruleset;
};

export function ArmorClient({ armors, ruleset = "RULES_2014" }: Props) {
  const is2024 = ruleset === "RULES_2024";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalArmor, setSelectedModalArmor] = useState<ArmorData | null>(null);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection
  );

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return armors.filter((a) => {
      // Filter out non-standard items (like homebrew / calculation internal entries) unless requested
      if (!a.isStandardEquipment) return false;

      if (q) {
        const typeStr = armorTypeTranslations[a.armorType] || a.armorType;
        const hay = `${a.name} ${a.engName} ${a.armorType} ${typeStr} ${a.baseAC} ${a.cost} ${a.weight}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selection.types.size > 0 && !selection.types.has(a.armorType)) {
        return false;
      }

      if (selection.disadvantage && !a.stealthDisadvantage) {
        return false;
      }

      if (selection.strengthReq && !a.strengthReq) {
        return false;
      }

      if (!matchesSourceSelection(a.source, selection.source)) {
        return false;
      }

      return true;
    });
  }, [armors, selection]);

  const selectedArmor = useMemo(() => {
    if (selection.armor) {
      const byParam = armors.find(
        (a) =>
          String(a.id) === selection.armor ||
          a.code.toLowerCase() === selection.armor.toLowerCase() ||
          a.engName.toLowerCase() === selection.armor.toLowerCase() ||
          a.nameUa.toLowerCase() === selection.armor.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, selection.armor, armors]);

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const selectSingleTypeTab = (typeKey: string) => {
    setParams((next) => {
      if (typeKey === "ALL") next.delete("type");
      else next.set("type", typeKey);
    });
  };

  const toggleType = (type: string) => {
    setParams((next) => {
      const set = getParamSet(next, "type");
      if (set.has(type)) set.delete(type);
      else set.add(type);
      setParamSet(next, "type", set);
    });
  };

  const toggleDisadvantage = () => {
    setParams((next) => {
      const current = next.get("dis");
      if (current === "1") next.delete("dis");
      else next.set("dis", "1");
    });
  };

  const toggleStrengthReq = () => {
    setParams((next) => {
      const current = next.get("str");
      if (current === "1") next.delete("str");
      else next.set("str", "1");
    });
  };

  const clearFilters = () => {
    setParams((next) => {
      next.delete("type");
      next.delete("dis");
      next.delete("str");
      clearSourceParams(next);
    });
  };

  const availableSources = useMemo(
    () => collectCatalogSources(armors.filter((a) => a.isStandardEquipment)),
    [armors]
  );

  const activeTab = useMemo(() => {
    if (selection.types.size === 1) {
      return Array.from(selection.types)[0];
    }
    if (selection.types.size === 0) return "ALL";
    return null;
  }, [selection.types]);

  const activeFiltersCount =
    selection.types.size +
    (selection.disadvantage ? 1 : 0) +
    (selection.strengthReq ? 1 : 0) +
    countSourceFilters(selection.source);

  return (
    <ContentListPage<ArmorData>
      title="Обладунки"
      is2024={is2024}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук обладунків за назвою або КБ..."
      hasActiveFilters={activeFiltersCount > 0}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      tabs={
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TYPE_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectSingleTypeTab(tab.key)}
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
          <Shield className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Обладунків не знайдено</p>
          <p className="text-xs text-slate-500 mt-1">Спробуйте змінити фільтри або пошуковий запит</p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, armor) => {
        const isSelected = selectedArmor?.id === armor.id;
        const visual = getArmorVisual(armor.armorType);
        const Icon = visual.icon;
        const armorTypeLabel = armorTypeTranslations[armor.armorType] || armor.armorType;

        return (
          <div key={armor.id} className="pt-2 pb-0.5 px-0.5">
            <div
              onClick={() => {
                setParams((next) => next.set("armor", armor.engName));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalArmor(armor);
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

                {/* Center armor info */}
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
                      {armor.nameUa} <span className="font-normal text-slate-400 text-sm ml-1">[{armor.engName}]</span>
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold border", visual.badgeClass)}>
                      {armor.armorType === "SHIELD" ? "+2 КБ" : `КБ ${armor.baseAC}`}
                    </span>

                    <span className="text-[11px] text-slate-300">
                      {armorTypeLabel}
                    </span>

                    {armor.strengthReq && (
                      <span className="text-[11px] text-slate-400">
                        Сил {armor.strengthReq}
                      </span>
                    )}

                    {armor.stealthDisadvantage && (
                      <span className="text-[11px] text-rose-400">
                        Перешкода
                      </span>
                    )}

                    {armor.cost && (
                      <span className="text-[11px] text-slate-400 ml-auto">
                        {armor.cost}
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
        selectedArmor ? (
          <ArmorDetailCard armor={selectedArmor} is2024={is2024} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть обладунок для перегляду характеристик</p>
          </div>
        )
      }
      selectedModalItem={selectedModalArmor}
      onCloseModal={() => setSelectedModalArmor(null)}
      modalTitle={selectedModalArmor?.nameUa || "Характеристики обладунку"}
      renderModalContent={(armor) => <ArmorDetailCard armor={armor} is2024={is2024} />}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <ArmorFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          is2024={is2024}
          selectedTypes={selection.types}
          toggleType={toggleType}
          disadvantageOnly={Boolean(selection.disadvantage)}
          toggleDisadvantage={toggleDisadvantage}
          hasStrengthReqOnly={Boolean(selection.strengthReq)}
          toggleStrengthReq={toggleStrengthReq}
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
