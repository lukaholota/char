"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Ruleset } from "@prisma/client";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CatalogIllustrationCard } from "@/components/catalogs/CatalogIllustrationCard";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { ClassDetailCard } from "@/components/classes/ClassDetailCard";
import { ClassesFilterDialog } from "@/components/classes/ClassesFilterDialog";
import { CatalogReadingDialog } from "@/components/catalogs/reading/CatalogReadingDialog";
import { SubclassReader } from "@/components/classes/SubclassReader";
import { useReadingNavigation } from "@/components/catalogs/reading/useReadingNavigation";
import type { ReadingActions, ReadingView } from "@/components/catalogs/reading/reading-view";
import { CatalogMatchList } from "@/components/catalogs/reading/CatalogMatchList";
import { findClassMatches } from "@/lib/catalogs/reading-matches";
import type { ClassData } from "@/lib/classesData";
import type { ClassTable } from "@/rules/class-table";
import {
  findClassReading,
  parseClassReadingTarget,
  writeClassReadingTarget,
  type ClassReadingTarget,
  type ClassSection,
} from "@/lib/catalogs/reading-target";
import { splitCatalogSubclasses } from "@/lib/logic/legacy-subclass-visibility";
import { useCatalogDeepLinkFocus } from "@/hooks/useCatalogDeepLinkFocus";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
  reading: ClassReadingTarget | null;
};

const parseSelection = (params: URLSearchParams): SelectionState => ({
  hitDice: getParamSet(params, "hd"),
  spellcasting: getParamSet(params, "cast"),
  source: parseSourceSelection(params),
  q: params.get("q") || "",
  class: params.get("class") || "",
  reading: parseClassReadingTarget(params),
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
  tables,
}: {
  classes: ClassData[];
  ruleset?: Ruleset;
  tables: Record<string, ClassTable>;
}) {
  const is2024 = ruleset === "RULES_2024";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedModalClass, setSelectedModalClass] = useState<ClassData | null>(null);
  const closingModalRef = useRef(false);

  const { qInput, setQInput, selection, setSelection } = useCatalogUrlSync<SelectionState>(
    parseSelection,
  );
  const isWide = useMediaQuery("lg");

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
      if (query && !findSearchHaystack(characterClass).includes(query) && findClassMatches(characterClass, query).length === 0) {
        return false;
      }
      if (selection.hitDice.size > 0 && !selection.hitDice.has(String(characterClass.hitDie))) return false;
      if (selection.spellcasting.size > 0 && !selection.spellcasting.has(findSpellcastingKey(characterClass))) {
        return false;
      }
      if (!matchesSourceSelection(characterClass.source, selection.source)) return false;
      return true;
    });
  }, [classes, selection]);

  const reading = useMemo(
    () => (selection.reading ? findClassReading(classes, selection.reading) : null),
    [classes, selection.reading],
  );
  const selectedClass = reading?.characterClass ?? filtered[0] ?? null;
  const openSubclass = reading?.subclass ?? null;

  const syncSelectionFromUrl = useCallback(
    () => setSelection(parseSelection(getSearchParamsFromLocation())),
    [setSelection],
  );
  const navigation = useReadingNavigation({ isBranchOpen: Boolean(openSubclass), onUrlChanged: syncSelectionFromUrl });

  /// Читаємо адресу, а не стан: той самий рядок пошуку можна натиснути вдруге, і тоді ні
  /// `selection`, ні `selectedClass` не зміняться — а модалку все одно треба відкрити.
  const focusClassFromUrl = useCallback((source: "initial" | "search" | "popstate") => {
    if (source === "popstate" && closingModalRef.current) {
      closingModalRef.current = false;
      return;
    }
    const target = parseClassReadingTarget(getSearchParamsFromLocation());
    const resolved = target ? findClassReading(classes, target) : null;
    if (!resolved) return;

    if (window.innerWidth < 1024) setSelectedModalClass(resolved.characterClass);
    if (source !== "popstate") navigation.requestFocus();
  }, [classes, navigation]);

  useCatalogDeepLinkFocus(focusClassFromUrl);

  const setParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  }, []);

  const writeTarget = (target: Omit<ClassReadingTarget, "classKey">) => (params: URLSearchParams) =>
    writeClassReadingTarget(params, { classKey: selectedClass?.slug ?? "", ...target });
  const toClassSection = (section: ClassSection) => writeTarget({ section, subclassKey: null, featureKey: null });
  const backToClass = () => navigation.leaveBranchTo(toClassSection("subclasses"));

  const view: ReadingView<ClassSection> = {
    section: reading?.section ?? "overview",
    featureKey: openSubclass ? null : reading?.featureKey ?? null,
    focusRequest: navigation.focusRequest,
    missing: reading?.missing === "subclass" ? "branch" : reading?.missing ?? null,
  };
  const actions: ReadingActions<ClassSection> = {
    onSectionChange: (section) => navigation.replaceTarget(toClassSection(section)),
    onOpenBranch: (key, opener) =>
      navigation.openBranch(writeTarget({ section: "subclasses", subclassKey: key, featureKey: null }), key, opener),
    onDismissMissing: () => navigation.replaceTarget(toClassSection("overview")),
    onOpenFeature: (featureKey) => {
      navigation.replaceTarget(writeTarget({ section: "features", subclassKey: null, featureKey }));
      navigation.requestFocus();
    },
  };

  const closeModal = () => {
    closingModalRef.current = true;
    setSelectedModalClass(null);
  };

  const openMatch = (target: ClassReadingTarget) => {
    navigation.replaceTarget((params) => writeClassReadingTarget(params, target));
    navigation.requestFocus();
    const characterClass = classes.find((candidate) => candidate.slug === target.classKey);
    if (characterClass && window.innerWidth < 1024) {
      closingModalRef.current = false;
      setSelectedModalClass(characterClass);
    }
  };

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
          matches={
            <CatalogMatchList matches={findClassMatches(characterClass, selection.q)} onOpen={openMatch} />
          }
          onSelect={() => {
            setParams((next) =>
              writeClassReadingTarget(next, { classKey: characterClass.slug, section: "overview", subclassKey: null, featureKey: null }),
            );
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              closingModalRef.current = false;
              setSelectedModalClass(characterClass);
            }
          }}
        />
      )}
      desktopDetailView={
        selectedClass ? (
          <>
            <ClassDetailCard characterClass={selectedClass} table={tables[selectedClass.key]} is2024={is2024} view={view} actions={actions} />
            <CatalogReadingDialog
              open={isWide && Boolean(openSubclass)}
              title={openSubclass?.name ?? "Підклас"}
              onClose={backToClass}
            >
              {openSubclass ? (
                <SubclassReader
                  characterClass={selectedClass}
                  subclass={openSubclass}
                  featureKey={reading?.featureKey ?? null}
                  focusRequest={navigation.focusRequest}
                  is2024={is2024}
                  onBack={backToClass}
                  onClose={backToClass}
                />
              ) : null}
            </CatalogReadingDialog>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть клас для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={selectedModalClass}
      onCloseModal={() => navigation.closeModalWithBranch(closeModal, toClassSection("overview"))}
      isModalChromeHidden={Boolean(openSubclass)}
      modalTitle={openSubclass?.name ?? selectedModalClass?.name ?? "Клас"}
      renderModalContent={(characterClass) =>
        openSubclass && characterClass === selectedClass ? (
          <SubclassReader
            characterClass={characterClass}
            subclass={openSubclass}
            featureKey={reading?.featureKey ?? null}
            focusRequest={navigation.focusRequest}
            is2024={is2024}
            onBack={backToClass}
            onClose={() => navigation.closeModalWithBranch(closeModal, toClassSection("overview"))}
          />
        ) : (
          <ClassDetailCard characterClass={characterClass} table={tables[characterClass.key]} is2024={is2024} view={view} actions={actions} />
        )
      }
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
  matches,
  onSelect,
}: {
  characterClass: ClassData;
  is2024: boolean;
  isSelected: boolean;
  matches: React.ReactNode;
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
            <span>{splitCatalogSubclasses(characterClass.subclasses).current.length} підкласів</span>
          </>
        }
      />
      {matches}
    </div>
  );
}
