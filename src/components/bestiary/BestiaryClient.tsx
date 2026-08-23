"use client";

import { useCallback, useMemo, useState } from "react";
import { Ruleset } from "@prisma/client";
import { Eye, ExternalLink } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { Button } from "@/components/ui/button";
import {
  CreatureData,
  findEditionLabel,
  getAllCreatures,
  getAllCreatureTypes,
  getAllCreatureSizes,
  getAllCreatureCRs,
} from "@/lib/bestiaryData";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import { BestiaryFilterDialog } from "@/components/bestiary/BestiaryFilterDialog";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
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

type InitialSearchParams = Record<string, string | string[] | undefined>;

type SelectionState = {
  types: Set<string>;
  sizes: Set<string>;
  crs: Set<string>;
  sources: Set<string>;
  q: string;
  creature: string;
};

const parseSelection = (params: URLSearchParams): SelectionState => {
  const types = getParamSet(params, "type");
  const sizes = getParamSet(params, "size");
  const crs = getParamSet(params, "cr");
  const sources = getParamSet(params, "src");
  const q = params.get("q") || "";
  const creature = params.get("creature") || "";
  return { types, sizes, crs, sources, q, creature };
};

type Props = {
  ruleset?: Ruleset;
  initialSearchParams?: InitialSearchParams;
};

export function BestiaryClient({ ruleset = "RULES_2014", initialSearchParams = {} }: Props) {
  const is2024 = ruleset === "RULES_2024";
  const editionLabel = findEditionLabel(ruleset);
  const creatures = useMemo(() => getAllCreatures(ruleset), [ruleset]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalCreature, setSelectedModalCreature] = useState<CreatureData | null>(null);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    initialSearchParams,
    parseSelection
  );

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return creatures.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.nameEng} ${c.type} ${c.size} ${c.description} ${c.specialAbilities} ${c.actions}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selection.types.size > 0 && (!c.type || !selection.types.has(c.type.split("(")[0].trim()))) {
        return false;
      }

      if (selection.sizes.size > 0 && (!c.size || !selection.sizes.has(c.size))) {
        return false;
      }

      if (selection.crs.size > 0 && (!c.challenge || !selection.crs.has(c.challenge))) {
        return false;
      }

      if (selection.sources.size > 0 && !selection.sources.has(c.source)) {
        return false;
      }

      return true;
    });
  }, [creatures, selection]);

  const selectedCreature = useMemo(() => {
    if (selection.creature) {
      const byParam = creatures.find(
        (c) =>
          String(c.creatureId) === selection.creature ||
          toEntitySlug(c.nameEng) === toEntitySlug(selection.creature) ||
          c.nameEng.toLowerCase() === selection.creature.toLowerCase() ||
          c.name.toLowerCase() === selection.creature.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, selection.creature, creatures]);

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const toggleType = (type: string) => {
    setParams((next) => {
      const set = getParamSet(next, "type");
      if (set.has(type)) set.delete(type);
      else set.add(type);
      setParamSet(next, "type", set);
    });
  };

  const toggleSize = (size: string) => {
    setParams((next) => {
      const set = getParamSet(next, "size");
      if (set.has(size)) set.delete(size);
      else set.add(size);
      setParamSet(next, "size", set);
    });
  };

  const toggleCR = (cr: string) => {
    setParams((next) => {
      const set = getParamSet(next, "cr");
      if (set.has(cr)) set.delete(cr);
      else set.add(cr);
      setParamSet(next, "cr", set);
    });
  };

  const clearFilters = () => {
    setParams((next) => {
      next.delete("type");
      next.delete("size");
      next.delete("cr");
      next.delete("src");
    });
  };

  const hasActiveFilters =
    selection.types.size > 0 ||
    selection.sizes.size > 0 ||
    selection.crs.size > 0 ||
    selection.sources.size > 0;

  const availableTypes = useMemo(() => getAllCreatureTypes(ruleset), [ruleset]);
  const availableSizes = useMemo(() => getAllCreatureSizes(ruleset), [ruleset]);
  const availableCRs = useMemo(() => getAllCreatureCRs(ruleset), [ruleset]);

  const prefix = is2024 ? "/2024" : "";

  return (
    <ContentListPage<CreatureData>
      title="Бестіарій"
      is2024={is2024}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук істот..."
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={selection.types.size + selection.sizes.size + selection.crs.size}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      data={filtered}
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
        const visual = getCreatureVisual(creature.type);
        const Icon = visual.icon;

        return (
          <div key={creature.creatureId} className="pt-2.5 pb-0.5 px-0.5">
            <div
              onClick={() => {
                setParams((next) => next.set("creature", toEntitySlug(creature.nameEng)));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalCreature(creature);
                }
              }}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 cursor-pointer",
                isSelected
                  ? is2024
                    ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-amber-400/40"
                    : "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-teal-400/40"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center gap-3.5">
                {/* Left creature token / icon box */}
                <div
                  className={cn(
                    "flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/70 overflow-hidden shadow-inner",
                    visual.iconWrap
                  )}
                >
                  <Icon className={cn("h-7 w-7 sm:h-8 sm:w-8", visual.iconColor)} />
                </div>

                {/* Center creature info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-base sm:text-[17px] font-semibold transition-colors",
                        isSelected
                          ? is2024 ? "text-amber-300" : "text-teal-300"
                          : "text-slate-100 group-hover:text-white"
                      )}
                    >
                      {creature.name} {creature.nameEng && <span className="font-normal text-slate-400 text-sm ml-1">[{creature.nameEng}]</span>}
                    </span>
                    <Link
                      href={`${prefix}/bestiary/${toEntitySlug(creature.nameEng)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden sm:inline-flex p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition"
                      title="Відкрити окрему сторінку"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-slate-400">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-bold border",
                        is2024
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border-teal-500/40 bg-teal-500/10 text-teal-300"
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
                </div>
              </div>
            </div>
          </div>
        );
      }}
      desktopDetailView={
        selectedCreature ? (
          <div className="space-y-3">
            <div className="flex justify-end px-1">
              <Link
                href={`${prefix}/bestiary/${toEntitySlug(selectedCreature.nameEng)}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
              >
                <span>Окрема сторінка</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <CreatureStatblockCard creature={selectedCreature} is2024={is2024} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть істоту для перегляду статблоку</p>
          </div>
        )
      }
      selectedModalItem={selectedModalCreature}
      onCloseModal={() => setSelectedModalCreature(null)}
      modalTitle={selectedModalCreature?.name || "Статблок істоти"}
      renderModalContent={(creature) => (
        <div className="space-y-3">
          <div className="flex justify-end px-1">
            <Link
              href={`${prefix}/bestiary/${toEntitySlug(creature.nameEng)}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              <span>Повна сторінка істоти</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <CreatureStatblockCard creature={creature} is2024={is2024} />
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
          toggleType={toggleType}
          availableSizes={availableSizes}
          selectedSizes={selection.sizes}
          toggleSize={toggleSize}
          availableCRs={availableCRs}
          selectedCRs={selection.crs}
          toggleCR={toggleCR}
          clearFilters={clearFilters}
        />
      }
    />
  );
}

