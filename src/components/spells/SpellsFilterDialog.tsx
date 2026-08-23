"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import {
  classTranslations,
  sourceTranslations,
  spellSchoolTranslations,
} from "@/lib/refs/translation";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024?: boolean;
  availableLevels: number[];
  availableClasses: string[];
  availableSubclassesByClass: { className: string; subclasses: string[] }[];
  availableSchools: string[];
  availableTimes: string[];
  availableSources: string[];
  selectedLevels: Set<string>;
  selectedClasses: Set<string>;
  selectedSubclasses: Set<string>;
  selectedSchools: Set<string>;
  selectedTimes: Set<string>;
  selectedSources: Set<string>;
  selectedConc: boolean | null;
  selectedRitual: boolean | null;
  toggleLevel: (lvl: string) => void;
  toggleClass: (cls: string) => void;
  toggleSubclass: (sub: string) => void;
  toggleSchool: (sch: string) => void;
  toggleTime: (time: string) => void;
  toggleSource: (src: string) => void;
  toggleConc: () => void;
  toggleRitual: () => void;
  clearFilters: () => void;
};

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
  selectedSources,
  selectedConc,
  selectedRitual,
  toggleLevel,
  toggleClass,
  toggleSubclass,
  toggleSchool,
  toggleTime,
  toggleSource,
  toggleConc,
  toggleRitual,
  clearFilters,
}: Props) {
  const [classFilter, setClassFilter] = useState("");
  const [subclassFilter, setSubclassFilter] = useState("");

  const activeBadgeClass = is2024
    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
    : "bg-teal-500/15 text-teal-300 border-teal-500/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto p-0" showClose={false}>
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle
              className={cn(
                "font-rpg-display text-2xl font-semibold tracking-wide",
                is2024 ? "text-amber-400" : "text-teal-400"
              )}
            >
              Фільтри
            </DialogTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="glass-panel inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90 hover:text-slate-100"
              aria-label="Закрити"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Levels */}
            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Рівні</div>
              <div className="mt-2 max-h-44 overflow-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {availableLevels.map((lvl) => {
                    const active = selectedLevels.has(String(lvl));
                    return (
                      <Badge
                        key={lvl}
                        variant={active ? "default" : "outline"}
                        className={cn("cursor-pointer transition-colors", active ? activeBadgeClass : "")}
                        onClick={() => toggleLevel(String(lvl))}
                        role="button"
                      >
                        {lvl === 0 ? "0 (Замовляння)" : lvl}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Classes */}
            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Класи</div>
              <div className="mt-2">
                <Input
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  placeholder="Пошук класів…"
                  className="h-9 border-white/10 bg-slate-950/40 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div className="mt-2 max-h-44 overflow-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {availableClasses
                    .filter((cls) => {
                      const q = classFilter.trim().toLowerCase();
                      if (!q) return true;
                      const label = classTranslations[cls as keyof typeof classTranslations] || cls;
                      return `${cls} ${label}`.toLowerCase().includes(q);
                    })
                    .map((cls) => {
                      const active = selectedClasses.has(cls);
                      const label = classTranslations[cls as keyof typeof classTranslations] || cls;
                      return (
                        <Badge
                          key={cls}
                          variant={active ? "default" : "outline"}
                          className={cn("cursor-pointer transition-colors", active ? activeBadgeClass : "")}
                          onClick={() => toggleClass(cls)}
                          role="button"
                        >
                          {label}
                        </Badge>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Subclasses */}
            {availableSubclassesByClass.length > 0 && (
              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">Підкласи</div>
                <div className="mt-2">
                  <Input
                    value={subclassFilter}
                    onChange={(e) => setSubclassFilter(e.target.value)}
                    placeholder="Пошук підкласів…"
                    className="h-9 border-white/10 bg-slate-950/40 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div className="mt-2 max-h-44 overflow-auto pr-1">
                  <div className="space-y-3">
                    {availableSubclassesByClass
                      .map(({ className, subclasses }) => {
                        const q = subclassFilter.trim().toLowerCase();
                        const visible = !q
                          ? subclasses
                          : subclasses.filter((sub) => sub.toLowerCase().includes(q));
                        if (visible.length === 0) return null;

                        return (
                          <div key={className} className="space-y-2">
                            <div className="text-xs font-semibold text-slate-400">{className}:</div>
                            <div className="flex flex-wrap gap-2">
                              {visible.map((sub) => {
                                const active = selectedSubclasses.has(sub);
                                return (
                                  <Badge
                                    key={sub}
                                    variant={active ? "default" : "outline"}
                                    className={cn("cursor-pointer transition-colors", active ? activeBadgeClass : "")}
                                    onClick={() => toggleSubclass(sub)}
                                    role="button"
                                  >
                                    {sub}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                      .filter(Boolean)}
                  </div>
                </div>
              </div>
            )}

            {/* Schools */}
            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Школи</div>
              <div className="mt-2 max-h-44 overflow-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {availableSchools.map((sch) => {
                    const active = selectedSchools.has(sch);
                    return (
                      <Badge
                        key={sch}
                        variant={active ? "default" : "outline"}
                        className={cn("cursor-pointer transition-colors", active ? activeBadgeClass : "")}
                        onClick={() => toggleSchool(sch)}
                        role="button"
                      >
                        {spellSchoolTranslations[sch as keyof typeof spellSchoolTranslations] || sch}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Casting Times */}
            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Час касту</div>
              <div className="mt-2 max-h-44 overflow-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {availableTimes.map((t) => {
                    const active = selectedTimes.has(t);
                    return (
                      <Badge
                        key={t}
                        variant={active ? "default" : "outline"}
                        className={cn("cursor-pointer transition-colors", active ? activeBadgeClass : "")}
                        onClick={() => toggleTime(t)}
                        role="button"
                      >
                        {t}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sources */}
            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Джерела</div>
              <div className="mt-2 max-h-44 overflow-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {availableSources.map((src) => {
                    const active = selectedSources.has(src);
                    return (
                      <Badge
                        key={src}
                        variant={active ? "default" : "outline"}
                        className={cn("cursor-pointer transition-colors", active ? activeBadgeClass : "")}
                        onClick={() => toggleSource(src)}
                        role="button"
                      >
                        {sourceTranslations[src as keyof typeof sourceTranslations] || src}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Features (Ritual, Concentration) */}
            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Особливості</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant={selectedConc === true ? "default" : "outline"}
                  className={cn("cursor-pointer transition-colors", selectedConc === true ? activeBadgeClass : "")}
                  onClick={toggleConc}
                  role="button"
                >
                  Концентрація
                </Badge>
                <Badge
                  variant={selectedRitual === true ? "default" : "outline"}
                  className={cn("cursor-pointer transition-colors", selectedRitual === true ? activeBadgeClass : "")}
                  onClick={toggleRitual}
                  role="button"
                >
                  Ритуал
                </Badge>
              </div>
            </div>

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
                className={cn("border font-medium", is2024 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-teal-500/20 text-teal-300 border-teal-500/40")}
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
