"use client";

import { useCallback, useMemo, useState } from "react";
import { Ruleset } from "@prisma/client";
import { ExternalLink, ScrollText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { BackgroundData } from "@/lib/backgroundsData";
import { BackgroundDetailCard } from "@/components/backgrounds/BackgroundDetailCard";
import { BackgroundsFilterDialog } from "@/components/backgrounds/BackgroundsFilterDialog";
import { abilityTranslations, sourceTranslations } from "@/lib/refs/translation";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import {
  getParamSet,
  setParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
} from "@/lib/catalog-url-helpers";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { getBackgroundVisual } from "@/components/catalogs/catalog-visuals";
import { cn } from "@/lib/utils";

type InitialSearchParams = Record<string, string | string[] | undefined>;

type SelectionState = {
  sources: Set<string>;
  q: string;
  background: string;
};

const parseSelection = (params: URLSearchParams): SelectionState => ({
  sources: getParamSet(params, "src"),
  q: params.get("q") || "",
  background: params.get("bg") || "",
});

function collectSources(backgrounds: BackgroundData[]): string[] {
  return Array.from(new Set(backgrounds.map((b) => b.source))).sort();
}

function findSearchHaystack(background: BackgroundData): string {
  const skills = background.skills.map((s) => s.nameUa).join(" ");
  return `${background.name} ${background.engName} ${background.description} ${skills} ${background.tools.join(" ")} ${background.specialAbilityName ?? ""} ${background.originFeat?.nameUa ?? ""}`.toLowerCase();
}

type Props = {
  backgrounds: BackgroundData[];
  ruleset?: Ruleset;
  initialSearchParams?: InitialSearchParams;
};

export function BackgroundsClient({ backgrounds, ruleset = "RULES_2014", initialSearchParams = {} }: Props) {
  const is2024 = ruleset === "RULES_2024";
  const prefix = is2024 ? "/2024" : "";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalBackground, setSelectedModalBackground] = useState<BackgroundData | null>(null);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    initialSearchParams,
    parseSelection
  );

  const availableSources = useMemo(() => collectSources(backgrounds), [backgrounds]);

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return backgrounds.filter((b) => {
      if (q && !findSearchHaystack(b).includes(q)) return false;
      if (selection.sources.size > 0 && !selection.sources.has(b.source)) return false;
      return true;
    });
  }, [backgrounds, selection]);

  const selectedBackground = useMemo(() => {
    if (selection.background) {
      const byParam = backgrounds.find(
        (b) =>
          b.slug === selection.background ||
          String(b.backgroundId) === selection.background ||
          b.name.toLowerCase() === selection.background.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, selection.background, backgrounds]);

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const toggleSource = (source: string) => {
    setParams((next) => {
      const set = getParamSet(next, "src");
      if (set.has(source)) set.delete(source);
      else set.add(source);
      setParamSet(next, "src", set);
    });
  };

  const clearFilters = () => {
    setParams((next) => next.delete("src"));
  };

  const hasActiveFilters = selection.sources.size > 0;

  return (
    <ContentListPage<BackgroundData>
      title="Походження"
      is2024={is2024}
      totalCount={backgrounds.length}
      filteredCount={filtered.length}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук походжень..."
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={selection.sources.size}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      data={filtered}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <ScrollText className="mb-2 h-10 w-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">Походжень не знайдено</p>
          <p className="mt-1 text-xs text-slate-500">Спробуйте змінити фільтри або пошуковий запит</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, background) => {
        const isSelected = selectedBackground?.backgroundId === background.backgroundId;
        const visual = getBackgroundVisual(background.source);
        const Icon = visual.icon;
        const sourceLabel =
          sourceTranslations[background.source as keyof typeof sourceTranslations] || background.source;
        const skillsLabel = background.skills.map((s) => s.nameUa).join(", ");

        return (
          <div key={background.backgroundId} className="px-0.5 pb-0.5 pt-2">
            <div
              onClick={() => {
                setParams((next) => next.set("bg", background.slug));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalBackground(background);
                }
              }}
              className={cn(
                "glass-panel group relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all duration-300",
                isSelected
                  ? is2024
                    ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-amber-400/40"
                    : "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-teal-400/40"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", visual.iconWrap)}>
                  <Icon className={cn("h-5 w-5", visual.iconColor)} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-[15px] font-semibold transition-colors",
                        isSelected
                          ? is2024 ? "text-amber-300" : "text-teal-300"
                          : "text-slate-100 group-hover:text-white"
                      )}
                    >
                      {background.name}{" "}
                      <span className="ml-1 text-sm font-normal text-slate-400">[{background.engName}]</span>
                    </span>
                    <Link
                      href={`${prefix}/backgrounds/${background.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-200 sm:inline-flex"
                      title="Відкрити окрему сторінку"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium", visual.badgeClass)}>
                      {sourceLabel}
                    </span>
                    {background.abilityOptions.length > 0 && (
                      <span className="text-[11px] text-amber-300/90">
                        {background.abilityOptions.map((a) => abilityTranslations[a] || a).join(" / ")}
                      </span>
                    )}
                    {skillsLabel && <span className="truncate text-xs text-slate-400">{skillsLabel}</span>}
                    {background.originFeat && (
                      <span className="truncate text-xs text-slate-400">
                        <strong className="font-medium text-slate-300">Риса:</strong> {background.originFeat.nameUa}
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
        selectedBackground ? (
          <div className="space-y-3">
            <div className="flex justify-end px-1">
              <Link
                href={`${prefix}/backgrounds/${selectedBackground.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-200"
              >
                <span>Окрема сторінка</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <BackgroundDetailCard background={selectedBackground} is2024={is2024} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть походження для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={selectedModalBackground}
      onCloseModal={() => setSelectedModalBackground(null)}
      modalTitle={selectedModalBackground?.name || "Деталі походження"}
      renderModalContent={(background) => (
        <BackgroundDetailCard background={background} is2024={is2024} />
      )}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <BackgroundsFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          is2024={is2024}
          availableSources={availableSources}
          selectedSources={selection.sources}
          toggleSource={toggleSource}
          clearFilters={clearFilters}
        />
      }
    />
  );
}
