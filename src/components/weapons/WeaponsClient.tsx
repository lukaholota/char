"use client";

import { useCallback, useMemo, useState } from "react";
import { Ruleset } from "@prisma/client";
import { Sword } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeaponData } from "@/lib/weaponsData";
import { WeaponDetailCard } from "@/components/weapons/WeaponDetailCard";
import { WeaponsFilterDialog } from "@/components/weapons/WeaponsFilterDialog";
import {
  weaponTypeTranslations,
  damageTypeTranslations,
  weaponPropertyTranslations,
} from "@/lib/refs/translation";
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
import { findWeaponReach } from "@/lib/weapon-filter-facets";
import {
  getParamSet,
  setParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
} from "@/lib/catalog-url-helpers";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { getWeaponVisual } from "@/components/catalogs/catalog-visuals";
import { cn } from "@/lib/utils";

type SelectionState = {
  types: Set<string>;
  damageTypes: Set<string>;
  properties: Set<string>;
  masteries: Set<string>;
  reaches: Set<string>;
  source: SourceSelection;
  q: string;
  weapon: string;
};

const parseSelection = (params: URLSearchParams): SelectionState => {
  const types = getParamSet(params, "type");
  const damageTypes = getParamSet(params, "dt");
  const properties = getParamSet(params, "prop");
  const masteries = getParamSet(params, "mast");
  const reaches = getParamSet(params, "reach");
  const source = parseSourceSelection(params);
  const q = params.get("q") || "";
  const weapon = params.get("weapon") || "";
  return { types, damageTypes, properties, masteries, reaches, source, q, weapon };
};


const TYPE_TABS = [
  { key: "ALL", label: "Всі" },
  { key: "SIMPLE_WEAPON", label: "Проста" },
  { key: "MARTIAL_WEAPON", label: "Бойова" },
  { key: "FIREARMS", label: "Вогнепальна" },
];

type Props = {
  weapons: WeaponData[];
  ruleset?: Ruleset;
};

export function WeaponsClient({ weapons, ruleset = "RULES_2014" }: Props) {
  const is2024 = ruleset === "RULES_2024";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalWeapon, setSelectedModalWeapon] = useState<WeaponData | null>(null);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection
  );

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return weapons.filter((w) => {
      if (q) {
        const propsStr = w.properties.map((p) => weaponPropertyTranslations[String(p).toUpperCase()] || p).join(" ");
        const hay = `${w.name} ${w.engName} ${w.damage} ${w.weaponType} ${propsStr} ${w.mastery || ""} ${w.masteryNameUa || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selection.types.size > 0 && !selection.types.has(w.weaponType)) {
        return false;
      }

      if (selection.damageTypes.size > 0 && !selection.damageTypes.has(w.damageType)) {
        return false;
      }

      if (selection.properties.size > 0) {
        const hasAllProps = Array.from(selection.properties).some((p) =>
          w.properties.map((wp) => String(wp).toUpperCase()).includes(p.toUpperCase())
        );
        if (!hasAllProps) return false;
      }

      if (selection.masteries.size > 0) {
        if (!w.mastery || !selection.masteries.has(String(w.mastery).toUpperCase())) {
          return false;
        }
      }

      if (selection.reaches.size > 0 && !selection.reaches.has(findWeaponReach(w))) {
        return false;
      }

      if (!matchesSourceSelection(w.source, selection.source)) {
        return false;
      }

      return true;
    });
  }, [weapons, selection]);

  const selectedWeapon = useMemo(() => {
    if (selection.weapon) {
      const byParam = weapons.find(
        (w) =>
          String(w.id) === selection.weapon ||
          w.code.toLowerCase() === selection.weapon.toLowerCase() ||
          w.engName.toLowerCase() === selection.weapon.toLowerCase() ||
          w.nameUa.toLowerCase() === selection.weapon.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, selection.weapon, weapons]);

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

  const toggleDamageType = (dt: string) => {
    setParams((next) => {
      const set = getParamSet(next, "dt");
      if (set.has(dt)) set.delete(dt);
      else set.add(dt);
      setParamSet(next, "dt", set);
    });
  };

  const toggleProperty = (prop: string) => {
    setParams((next) => {
      const set = getParamSet(next, "prop");
      if (set.has(prop)) set.delete(prop);
      else set.add(prop);
      setParamSet(next, "prop", set);
    });
  };

  const toggleMastery = (m: string) => {
    setParams((next) => {
      const set = getParamSet(next, "mast");
      if (set.has(m)) set.delete(m);
      else set.add(m);
      setParamSet(next, "mast", set);
    });
  };

  const toggleReach = (reach: string) => {
    setParams((next) => {
      const set = getParamSet(next, "reach");
      if (set.has(reach)) set.delete(reach);
      else set.add(reach);
      setParamSet(next, "reach", set);
    });
  };

  const clearFilters = () => {
    setParams((next) => {
      next.delete("type");
      next.delete("dt");
      next.delete("prop");
      next.delete("mast");
      next.delete("reach");
      clearSourceParams(next);
    });
  };

  const availableSources = useMemo(() => collectCatalogSources(weapons), [weapons]);

  const activeTab = useMemo(() => {
    if (selection.types.size === 1) {
      return Array.from(selection.types)[0];
    }
    if (selection.types.size === 0) return "ALL";
    return null;
  }, [selection.types]);

  const activeFiltersCount =
    selection.types.size +
    selection.damageTypes.size +
    selection.properties.size +
    selection.masteries.size +
    selection.reaches.size +
    countSourceFilters(selection.source);

  return (
    <ContentListPage<WeaponData>
      title="Зброя"
      is2024={is2024}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук зброї за назвою, шкодою чи властивістю..."
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
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-all shrink-0 border",
                  isSelected
                    ? is2024
                      ? "border-amber-500/50 bg-amber-500/20 text-amber-200 shadow-sm"
                      : "border-arcane-500/50 bg-arcane-500/20 text-arcane-200 shadow-sm"
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
          <Sword className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Зброї не знайдено</p>
          <p className="text-xs text-slate-500 mt-1">Спробуйте змінити фільтри або пошуковий запит</p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, weapon) => {
        const isSelected = selectedWeapon?.id === weapon.id;
        const visual = getWeaponVisual(weapon.weaponType, weapon.isRanged);
        const Icon = visual.icon;
        const damageTypeLabel = damageTypeTranslations[weapon.damageType] || weapon.damageType;

        return (
          <div key={weapon.id} className="pt-2 pb-0.5 px-0.5">
            <div
              onClick={() => {
                setParams((next) => next.set("weapon", weapon.engName));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalWeapon(weapon);
                }
              }}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-xl border p-3 transition-all duration-300 cursor-pointer",
                isSelected
                  ? is2024
                    ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-amber-400/40"
                    : "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-arcane-400/40"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left icon badge */}
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", visual.iconWrap)}>
                  <Icon className={cn("h-5 w-5", visual.iconColor)} />
                </div>

                {/* Center weapon info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "truncate text-[15px] font-semibold transition-colors",
                        isSelected
                          ? is2024 ? "text-amber-300" : "text-arcane-300"
                          : "text-slate-100 group-hover:text-white"
                      )}
                    >
                      {weapon.nameUa} <span className="font-normal text-slate-400 text-sm ml-1">[{weapon.engName}]</span>
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold border", visual.badgeClass)}>
                      {weapon.damage} {damageTypeLabel}
                    </span>

                    {weapon.mastery && (
                      <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                        {weapon.masteryNameUa || weapon.mastery}
                      </span>
                    )}

                    {weapon.normalRange && (
                      <span className="text-[11px] text-slate-400">
                        {weapon.normalRange}/{weapon.longRange} фт
                      </span>
                    )}

                    {weapon.properties.length > 0 && (
                      <span className="truncate text-slate-400 text-[11px]">
                        {weapon.properties.slice(0, 3).map((p) => weaponPropertyTranslations[String(p).toUpperCase()] || p).join(", ")}
                        {weapon.properties.length > 3 ? "…" : ""}
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
        selectedWeapon ? (
          <WeaponDetailCard weapon={selectedWeapon} is2024={is2024} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть зброю для перегляду характеристик</p>
          </div>
        )
      }
      selectedModalItem={selectedModalWeapon}
      onCloseModal={() => setSelectedModalWeapon(null)}
      modalTitle={selectedModalWeapon?.nameUa || "Характеристики зброї"}
      renderModalContent={(weapon) => <WeaponDetailCard weapon={weapon} is2024={is2024} />}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <WeaponsFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          is2024={is2024}
          selectedTypes={selection.types}
          toggleType={toggleType}
          selectedReaches={selection.reaches}
          toggleReach={toggleReach}
          selectedDamageTypes={selection.damageTypes}
          toggleDamageType={toggleDamageType}
          selectedProperties={selection.properties}
          toggleProperty={toggleProperty}
          selectedMasteries={selection.masteries}
          toggleMastery={toggleMastery}
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
