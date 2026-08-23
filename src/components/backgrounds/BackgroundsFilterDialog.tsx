"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sourceTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024: boolean;
  availableSources: string[];
  selectedSources: Set<string>;
  toggleSource: (source: string) => void;
  clearFilters: () => void;
};

export function BackgroundsFilterDialog({
  open,
  onOpenChange,
  is2024,
  availableSources,
  selectedSources,
  toggleSource,
  clearFilters,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85dvh] max-w-md overflow-y-auto border-white/10 bg-slate-950/95 p-6 text-slate-100 backdrop-blur-2xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="font-rpg-display text-lg uppercase tracking-wider text-slate-200">
          Фільтри походжень
        </DialogTitle>

        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Джерело
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableSources.map((source) => {
              const label = sourceTranslations[source as keyof typeof sourceTranslations] || source;
              const isSelected = selectedSources.has(source);

              return (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={cn(
                    "flex items-center justify-between truncate rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all",
                    isSelected
                      ? is2024
                        ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                        : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                      : "border-white/5 bg-slate-900/60 text-slate-300 hover:bg-white/5"
                  )}
                >
                  <span className="truncate">{label}</span>
                  {isSelected && <span className="ml-1 shrink-0 text-xs">✓</span>}
                </button>
              );
            })}
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
