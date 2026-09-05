"use client";

import { useCallback, useMemo, useState } from "react";
import { Ruleset } from "@prisma/client";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BackgroundData } from "@/lib/backgroundsData";
import { BackgroundDetailCard } from "@/components/backgrounds/BackgroundDetailCard";
import { BackgroundsFilterDialog } from "@/components/backgrounds/BackgroundsFilterDialog";
import { abilityTranslations, skillTranslations, sourceTranslations } from "@/lib/refs/translation";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import {
  getParamSet,
  setParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
} from "@/lib/catalog-url-helpers";
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
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { CatalogIllustrationCard } from "@/components/catalogs/CatalogIllustrationCard";
import {
  ILLUSTRATION_DETAIL_CLASSNAME,
  ILLUSTRATION_LIST_CLASSNAME,
} from "@/components/catalogs/illustration-catalog-layout";

type SelectionState = {
  source: SourceSelection;
  skills: Set<string>;
  abilities: Set<string>;
  q: string;
  background: string;
};

const parseSelection = (params: URLSearchParams): SelectionState => ({
  source: parseSourceSelection(params),
  skills: getParamSet(params, "skill"),
  abilities: getParamSet(params, "abl"),
  q: params.get("q") || "",
  background: params.get("bg") || "",
});

const ABILITY_ORDER = Object.keys(abilityTranslations);

function collectSkills(backgrounds: BackgroundData[]): string[] {
  const skills = new Set(backgrounds.flatMap((b) => b.skills.map((skill) => skill.enum)));
  return Array.from(skills).sort((a, b) =>
    (skillTranslations[a] || a).localeCompare(skillTranslations[b] || b, "uk")
  );
}

function collectAbilities(backgrounds: BackgroundData[]): string[] {
  const abilities = new Set(backgrounds.flatMap((b) => b.abilityOptions));
  return ABILITY_ORDER.filter((ability) => abilities.has(ability));
}

function findSearchHaystack(background: BackgroundData): string {
  const skills = background.skills.map((s) => s.nameUa).join(" ");
  return `${background.name} ${background.engName} ${background.description} ${skills} ${background.tools.join(" ")} ${background.specialAbilityName ?? ""} ${background.originFeat?.nameUa ?? ""}`.toLowerCase();
}

type Props = {
  backgrounds: BackgroundData[];
  ruleset?: Ruleset;
};

export function BackgroundsClient({ backgrounds, ruleset = "RULES_2014" }: Props) {
  const is2024 = ruleset === "RULES_2024";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalBackground, setSelectedModalBackground] = useState<BackgroundData | null>(null);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection
  );

  const availableSources = useMemo(() => collectCatalogSources(backgrounds), [backgrounds]);
  const availableSkills = useMemo(() => collectSkills(backgrounds), [backgrounds]);
  const availableAbilities = useMemo(() => collectAbilities(backgrounds), [backgrounds]);

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return backgrounds.filter((b) => {
      if (q && !findSearchHaystack(b).includes(q)) return false;
      if (!matchesSourceSelection(b.source, selection.source)) return false;
      if (selection.skills.size > 0 && !b.skills.some((skill) => selection.skills.has(skill.enum))) return false;
      if (selection.abilities.size > 0 && !b.abilityOptions.some((ability) => selection.abilities.has(ability))) {
        return false;
      }
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

  const toggleIn = (key: string) => (value: string) =>
    setParams((next) => {
      const set = getParamSet(next, key);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      setParamSet(next, key, set);
    });

  const clearFilters = () => {
    setParams((next) => {
      next.delete("skill");
      next.delete("abl");
      clearSourceParams(next);
    });
  };

  const activeFiltersCount =
    selection.skills.size + selection.abilities.size + countSourceFilters(selection.source);
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <ContentListPage<BackgroundData>
      title="Походження"
      listContainerClassName={ILLUSTRATION_LIST_CLASSNAME}
      detailContainerClassName={ILLUSTRATION_DETAIL_CLASSNAME}
      is2024={is2024}
      totalCount={backgrounds.length}
      filteredCount={filtered.length}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук походжень..."
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={activeFiltersCount}
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
      renderItem={(_index, background) => (
        <BackgroundRow
          key={background.backgroundId}
          background={background}
          is2024={is2024}
          isSelected={selectedBackground?.backgroundId === background.backgroundId}
          onSelect={() => {
            setParams((next) => next.set("bg", background.slug));
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setSelectedModalBackground(background);
            }
          }}
        />
      )}
      desktopDetailView={
        selectedBackground ? (
          <div className="space-y-3">
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
          availableSkills={availableSkills}
          selectedSkills={selection.skills}
          toggleSkill={toggleIn("skill")}
          availableAbilities={availableAbilities}
          selectedAbilities={selection.abilities}
          toggleAbility={toggleIn("abl")}
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

function BackgroundRow({
  background,
  is2024,
  isSelected,
  onSelect,
}: {
  background: BackgroundData;
  is2024: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const sourceLabel =
    sourceTranslations[background.source as keyof typeof sourceTranslations] || background.source;
  const skillsLabel = background.skills.map((s) => s.nameUa).join(", ");
  const abilitiesLabel = background.abilityOptions
    .map((ability) => abilityTranslations[ability] || ability)
    .join(" / ");

  return (
    <div className="pb-1 pt-3">
      <CatalogIllustrationCard
        imageSrc={background.imageSrc}
        title={background.name}
        englishTitle={background.engName}
        fallbackIcon={ScrollText}
        is2024={is2024}
        isSelected={isSelected}
        onSelect={onSelect}
        meta={
          <>
            <span className="rounded-md border border-white/20 bg-slate-950/70 px-2 py-0.5 text-[11px] backdrop-blur-md">
              {sourceLabel}
            </span>
            {abilitiesLabel ? <span>{abilitiesLabel}</span> : null}
            {skillsLabel ? <span className="truncate">{skillsLabel}</span> : null}
            {background.originFeat ? <span>Риса: {background.originFeat.nameUa}</span> : null}
          </>
        }
      />
    </div>
  );
}
