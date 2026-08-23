"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { featCategoryTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";

const CATEGORIES = ["ORIGIN", "GENERAL", "EPIC_BOON", "FIGHTING_STYLE"] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024: boolean;
  selectedCategories: Set<string>;
  toggleCategory: (cat: string) => void;
  repeatableOnly: boolean;
  toggleRepeatable: () => void;
  clearFilters: () => void;
};

export function FeatsFilterDialog({
  open,
  onOpenChange,
  is2024,
  selectedCategories,
  toggleCategory,
  repeatableOnly,
  toggleRepeatable,
  clearFilters,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border-white/10 bg-slate-950/95 p-6 backdrop-blur-2xl text-slate-100"
        aria-describedby={undefined}
      >
        <DialogTitle className="font-rpg-display text-lg uppercase tracking-wider text-slate-200">
          Фільтри рис
        </DialogTitle>

        <div className="mt-4 space-y-4">
          {/* Category Filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Категорія
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const label = featCategoryTranslations[cat];
                const isSelected = selectedCategories.has(cat);

                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium border transition-all text-left truncate",
                      isSelected
                        ? is2024
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                          : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                        : "border-white/5 bg-slate-900/60 text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <span className="truncate">{label}</span>
                    {isSelected && <span className="text-xs shrink-0 ml-1">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Repeatable Filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Особливості
            </label>
            <button
              onClick={toggleRepeatable}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium border transition-all",
                repeatableOnly
                  ? is2024
                    ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                    : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                  : "border-white/5 bg-slate-900/60 text-slate-300 hover:bg-white/5"
              )}
            >
              <span>Тільки багаторазові риси (Repeatable)</span>
              {repeatableOnly && <span className="text-xs shrink-0 ml-1">✓</span>}
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-slate-400">
            Скинути все
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className={cn(
              "rounded-xl text-xs font-semibold",
              is2024 ? "bg-amber-500 text-slate-950 hover:bg-amber-400" : "bg-teal-500 text-slate-950 hover:bg-teal-400"
            )}
          >
            Застосувати
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
