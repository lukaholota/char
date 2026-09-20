"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { classTranslations, spellSchoolTranslations } from "@/lib/refs/translation";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";
import {
  SPELL_COMPONENT_LABELS,
  SPELL_DURATION_BUCKETS,
  SPELL_RANGE_BUCKETS,
  type SpellComponent,
} from "@/lib/spell-filter-facets";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024?: boolean;
  availableLevels: number[];
  availableClasses: string[];
  availableSubclassesByClass: { className: string; subclasses: string[] }[];
  availableSchools: string[];
  availableTimes: string[];
  availableSources: CatalogSources;
  selectedLevels: Set<string>;
  selectedClasses: Set<string>;
  selectedSubclasses: Set<string>;
  selectedSchools: Set<string>;
  selectedTimes: Set<string>;
  selectedComponents: Set<string>;
  selectedRanges: Set<string>;
  selectedDurations: Set<string>;
  sourceSelection: SourceSelection;
  selectedConc: boolean | null;
  selectedRitual: boolean | null;
  toggleLevel: (lvl: string) => void;
  toggleClass: (cls: string) => void;
  toggleSubclass: (sub: string) => void;
  toggleSchool: (sch: string) => void;
  toggleTime: (time: string) => void;
  toggleComponent: (component: SpellComponent) => void;
  toggleRange: (range: string) => void;
  toggleDuration: (duration: string) => void;
  toggleSource: (src: string) => void;
  toggleHomebrew: () => void;
  toggleConc: () => void;
  toggleRitual: () => void;
  clearFilters: () => void;
};

const SPELL_COMPONENTS = Object.keys(SPELL_COMPONENT_LABELS) as SpellComponent[];

export function SpellsFilterDialog({
  open,
  onOpenChange,
  is2024 = false,
  availableLevels,
  availableClasses,
  availableSubclassesByClass,
  availableSchools,
  availableTimes,
  availableSources,
  selectedLevels,
  selectedClasses,
  selectedSubclasses,
  selectedSchools,
  selectedTimes,
  selectedComponents,
  selectedRanges,
  selectedDurations,
  sourceSelection,
  selectedConc,
  selectedRitual,
  toggleLevel,
  toggleClass,
  toggleSubclass,
  toggleSchool,
  toggleTime,
  toggleComponent,
  toggleRange,
  toggleDuration,
  toggleSource,
  toggleHomebrew,
  toggleConc,
  toggleRitual,
  clearFilters,
}: Props) {
  const [classFilter, setClassFilter] = useState("");
  const [subclassFilter, setSubclassFilter] = useState("");

  const activeBadgeClass = findAccentVariant(is2024, { prism: "bg-prism-500/15 text-prism-300 border-prism-500/30", arcane: "bg-arcane-500/15 text-arcane-300 border-arcane-500/30" });

  const chip = (key: string, label: ReactNode, active: boolean, onClick: () => void) => (
    <Badge
      key={key}
      variant={active ? "default" : "outline"}
      className={cn("cursor-pointer justify-center transition-colors max-md:min-h-10 max-md:min-w-10", active ? activeBadgeClass : "")}
      onClick={onClick}
      role="button"
    >
      {label}
    </Badge>
  );

  const classLabel = (cls: string) => classTranslations[cls as keyof typeof classTranslations] || cls;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto p-0" showClose={false}>
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle
              className={cn(
                "font-rpg-display text-2xl font-semibold tracking-wide",
                findAccentVariant(is2024, { prism: "text-prism-400", arcane: "text-arcane-400" })
              )}
            >
              Фільтри
            </DialogTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="glass-panel inline-flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90 hover:text-slate-100"
              aria-label="Закрити"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <Section title="Рівні">
              {availableLevels.map((lvl) =>
                chip(String(lvl), lvl === 0 ? "0 (Замовляння)" : lvl, selectedLevels.has(String(lvl)), () =>
                  toggleLevel(String(lvl))
                )
              )}
            </Section>

            <Section
              title="Класи"
              search={
                <Input
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  placeholder="Пошук класів…"
                  className="h-10 border-white/10 bg-slate-950/40 text-slate-200 placeholder:text-slate-500 md:h-9"
                />
              }
            >
              {availableClasses
                .filter((cls) => {
                  const q = classFilter.trim().toLowerCase();
                  return !q || `${cls} ${classLabel(cls)}`.toLowerCase().includes(q);
                })
                .map((cls) => chip(cls, classLabel(cls), selectedClasses.has(cls), () => toggleClass(cls)))}
            </Section>

            {availableSubclassesByClass.length > 0 && (
              <Section
                title="Підкласи"
                search={
                  <Input
                    value={subclassFilter}
                    onChange={(e) => setSubclassFilter(e.target.value)}
                    placeholder="Пошук підкласів…"
                    className="h-10 border-white/10 bg-slate-950/40 text-slate-200 placeholder:text-slate-500 md:h-9"
                  />
                }
                stacked
              >
                {availableSubclassesByClass.map(({ className, subclasses }) => {
                  const q = subclassFilter.trim().toLowerCase();
                  const visible = q ? subclasses.filter((sub) => sub.toLowerCase().includes(q)) : subclasses;
                  if (visible.length === 0) return null;

                  return (
                    <div key={className} className="space-y-2">
                      <div className="text-xs font-semibold text-slate-400">{className}:</div>
                      <div className="flex flex-wrap gap-2">
                        {visible.map((sub) => chip(sub, sub, selectedSubclasses.has(sub), () => toggleSubclass(sub)))}
                      </div>
                    </div>
                  );
                })}
              </Section>
            )}

            <Section title="Школи">
              {availableSchools.map((sch) =>
                chip(
                  sch,
                  spellSchoolTranslations[sch as keyof typeof spellSchoolTranslations] || sch,
                  selectedSchools.has(sch),
                  () => toggleSchool(sch)
                )
              )}
            </Section>

            <Section title="Час касту">
              {availableTimes.map((t) => chip(t, t, selectedTimes.has(t), () => toggleTime(t)))}
            </Section>

            <Section title="Компоненти" hint="показує заклинання, яким потрібні всі обрані">
              {SPELL_COMPONENTS.map((component) =>
                chip(component, SPELL_COMPONENT_LABELS[component], selectedComponents.has(component), () =>
                  toggleComponent(component)
                )
              )}
            </Section>

            <Section title="Дистанція">
              {SPELL_RANGE_BUCKETS.map((range) =>
                chip(range, range, selectedRanges.has(range), () => toggleRange(range))
              )}
            </Section>

            <Section title="Тривалість">
              {SPELL_DURATION_BUCKETS.map((duration) =>
                chip(duration, duration, selectedDurations.has(duration), () => toggleDuration(duration))
              )}
            </Section>

            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <SourceFilterSection
                is2024={is2024}
                available={availableSources}
                selection={sourceSelection}
                onToggleSource={toggleSource}
                onToggleHomebrew={toggleHomebrew}
              />
            </div>

            <Section title="Особливості">
              {chip("conc", "Концентрація", selectedConc === true, toggleConc)}
              {chip("ritual", "Ритуал", selectedRitual === true, toggleRitual)}
            </Section>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="border border-white/10 bg-slate-900/40"
                onClick={clearFilters}
              >
                Очистити
              </Button>
              <Button
                type="button"
                className={cn("border font-medium", findAccentVariant(is2024, { prism: "bg-prism-500/20 text-prism-300 border-prism-500/40", arcane: "bg-arcane-500/20 text-arcane-300 border-arcane-500/40" }))}
                onClick={() => onOpenChange(false)}
              >
                Застосувати
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  hint,
  search,
  stacked = false,
  children,
}: {
  title: string;
  hint?: string;
  search?: ReactNode;
  stacked?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="glass-panel rounded-xl border border-white/10 p-3">
      <div className="text-xs font-semibold text-slate-300">
        {title}
        {hint ? <span className="ml-2 font-normal text-slate-500">{hint}</span> : null}
      </div>
      {search ? <div className="mt-2">{search}</div> : null}
      <div className="mt-2 max-h-44 overflow-auto pr-1">
        <div className={stacked ? "space-y-3" : "flex flex-wrap gap-2"}>{children}</div>
      </div>
    </div>
  );
}
