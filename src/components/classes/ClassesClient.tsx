"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Ruleset } from "@prisma/client";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CatalogIllustrationCard } from "@/components/catalogs/CatalogIllustrationCard";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { ClassDetailCard } from "@/components/classes/ClassDetailCard";
import { ClassesFilterDialog } from "@/components/classes/ClassesFilterDialog";
import { scrollToVisibleJumpTarget } from "@/components/catalogs/SectionJumpNav";
import type { ClassData } from "@/lib/classesData";
import { useCatalogDeepLinkFocus } from "@/hooks/useCatalogDeepLinkFocus";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import {
  getParamSet,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
  setParamSet,
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
import { collectHitDice, collectSpellcastingKinds, findSpellcastingKey } from "@/lib/class-filter-facets";

import {
  ILLUSTRATION_DETAIL_CLASSNAME,
  ILLUSTRATION_LIST_CLASSNAME,
} from "@/components/catalogs/illustration-catalog-layout";

type SelectionState = {
  hitDice: Set<string>;
  spellcasting: Set<string>;
  source: SourceSelection;
  q: string;
  class: string;
};

const parseSelection = (params: URLSearchParams): SelectionState => ({
  hitDice: getParamSet(params, "hd"),
  spellcasting: getParamSet(params, "cast"),
  source: parseSourceSelection(params),
  q: params.get("q") || "",
  class: params.get("class") || "",
});

/// Subclass names go into the haystack on purpose: the omni-search sends «Шлях берсерка» here,
/// and typing it into the catalog's own box has to land on the same class.
function findSearchHaystack(characterClass: ClassData): string {
  const features = characterClass.features.map((feature) => feature.name).join(" ");
  const subclasses = characterClass.subclasses
    .map((subclass) => `${subclass.name} ${subclass.engName}`)
    .join(" ");
  return `${characterClass.name} ${characterClass.engName} ${features} ${subclasses}`.toLowerCase();
}

export function ClassesClient({
  classes,
  ruleset = "RULES_2014",
}: {
  classes: ClassData[];
  ruleset?: Ruleset;
}) {
  const is2024 = ruleset === "RULES_2024";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalClass, setSelectedModalClass] = useState<ClassData | null>(null);
  const closingModalRef = useRef(false);

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection,
  );

  const available = useMemo(
    () => ({
      hitDice: collectHitDice(classes),
      spellcasting: collectSpellcastingKinds(classes),
      sources: collectCatalogSources(classes),
    }),
    [classes],
  );

  const filtered = useMemo(() => {
    const query = selection.q.trim().toLowerCase();
    return classes.filter((characterClass) => {
      if (query && !findSearchHaystack(characterClass).includes(query)) return false;
      if (selection.hitDice.size > 0 && !selection.hitDice.has(String(characterClass.hitDie))) return false;
      if (selection.spellcasting.size > 0 && !selection.spellcasting.has(findSpellcastingKey(characterClass))) {
        return false;
      }
      if (!matchesSourceSelection(characterClass.source, selection.source)) return false;
      return true;
    });
  }, [classes, selection]);

  const selectedClass = useMemo(() => {
    if (selection.class) {
      const byParam = classes.find(
        (characterClass) =>
          characterClass.slug === selection.class || String(characterClass.classId) === selection.class,
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [classes, filtered, selection.class]);

  /// Читаємо адресу, а не стан: той самий рядок пошуку можна натиснути вдруге, і тоді ні
  /// `selection`, ні `selectedClass` не зміняться — а модалку все одно треба відкрити.
  const focusClassFromUrl = useCallback((source: "initial" | "search" | "popstate") => {
    if (source === "popstate" && closingModalRef.current) {
      closingModalRef.current = false;
      return;
    }
    const params = getSearchParamsFromLocation();
    const requested = params.get("class");
    if (!requested) return;

    const target = classes.find(
      (characterClass) => characterClass.slug === requested || String(characterClass.classId) === requested,
    );
    if (!target) return;

    if (window.innerWidth < 1024) setSelectedModalClass(target);
    scrollToVisibleJumpTarget(params.get("jump"));
  }, [classes]);

  useCatalogDeepLinkFocus(focusClassFromUrl);

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

  const clearFilters = () =>
    setParams((next) => {
      next.delete("hd");
      next.delete("cast");
      clearSourceParams(next);
    });

  const activeFiltersCount =
    selection.hitDice.size + selection.spellcasting.size + countSourceFilters(selection.source);
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <ContentListPage<ClassData>
      title="Класи"
      listContainerClassName={ILLUSTRATION_LIST_CLASSNAME}
      detailContainerClassName={ILLUSTRATION_DETAIL_CLASSNAME}
      is2024={is2024}
      totalCount={classes.length}
      filteredCount={filtered.length}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук класів і підкласів..."
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      data={filtered}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Shield className="mb-2 h-10 w-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">Класів не знайдено</p>
          <p className="mt-1 text-xs text-slate-500">Спробуйте змінити фільтри або пошуковий запит</p>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          ) : null}
        </div>
      }
      renderItem={(_index, characterClass) => (
        <ClassRow
          key={characterClass.classId}
          characterClass={characterClass}
          is2024={is2024}
          isSelected={selectedClass?.classId === characterClass.classId}
          onSelect={() => {
            setParams((next) => next.set("class", characterClass.slug));
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              closingModalRef.current = false;
              setSelectedModalClass(characterClass);
            }
          }}
        />
      )}
      desktopDetailView={
        selectedClass ? (
          <ClassDetailCard characterClass={selectedClass} is2024={is2024} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть клас для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={selectedModalClass}
      onCloseModal={() => {
        closingModalRef.current = true;
        setSelectedModalClass(null);
      }}
      modalTitle={selectedModalClass?.name || "Клас"}
      renderModalContent={(characterClass) => (
        <ClassDetailCard characterClass={characterClass} is2024={is2024} />
      )}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <ClassesFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          is2024={is2024}
          availableHitDice={available.hitDice}
          selectedHitDice={selection.hitDice}
          toggleHitDie={toggleIn("hd")}
          availableSpellcasting={available.spellcasting}
          selectedSpellcasting={selection.spellcasting}
          toggleSpellcasting={toggleIn("cast")}
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

function ClassRow({
  characterClass,
  is2024,
  isSelected,
  onSelect,
}: {
  characterClass: ClassData;
  is2024: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="pb-1 pt-3">
      <CatalogIllustrationCard
        imageSrc={characterClass.imageSrc}
        title={characterClass.name}
        englishTitle={characterClass.engName}
        fallbackIcon={Shield}
        is2024={is2024}
        isSelected={isSelected}
        onSelect={onSelect}
        meta={
          <>
            <span className="rounded-md border border-white/20 bg-slate-950/70 px-2 py-0.5 font-mono text-[11px] backdrop-blur-md">
              к{characterClass.hitDie}
            </span>
            <span>{characterClass.savingThrows.join(", ")}</span>
            {characterClass.spellcasting ? <span>{characterClass.spellcasting}</span> : null}
            <span>{characterClass.subclasses.length} підкласів</span>
          </>
        }
      />
    </div>
  );
}
