"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024?: boolean;
  selectedLevels: Set<number>;
  toggleLevel: (lvl: number) => void;
  selectedPacts: Set<string>;
  togglePact: (pact: string) => void;
  clearFilters: () => void;
};

const WARLOCK_LEVELS = [2, 5, 7, 9, 12, 15];

const PACT_BOONS = [
  { key: "Pact of the Blade", label: "Пакт клинка (Blade)" },
  { key: "Pact of the Tome", label: "Пакт гримуара (Tome)" },
  { key: "Pact of the Chain", label: "Пакт ланцюга (Chain)" },
  { key: "Pact of the Talisman", label: "Пакт талісмана (Talisman)" },
];

export function InvocationsFilterDialog({
  open,
  onOpenChange,
  is2024 = false,
  selectedLevels,
  toggleLevel,
  selectedPacts,
  togglePact,
  clearFilters,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto border-white/10 bg-slate-950/95 p-5 backdrop-blur-2xl text-slate-100">
        <DialogHeader>
          <DialogTitle className="font-rpg-display text-xl uppercase tracking-wider text-slate-100">
            Фільтри відозв чаклуна
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Min Warlock Level */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Вимога до рівня чаклуна
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WARLOCK_LEVELS.map((lvl) => {
                const isSelected = selectedLevels.has(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => toggleLevel(lvl)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                      isSelected
                        ? is2024
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                          : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                        : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    Рівень {lvl}+
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pact Boon */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Вимога до дару пакту
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PACT_BOONS.map((pact) => {
                const isSelected = selectedPacts.has(pact.key);
                return (
                  <button
                    key={pact.key}
                    type="button"
                    onClick={() => togglePact(pact.key)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                      isSelected
                        ? is2024
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                          : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                        : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    {pact.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-row items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Скинути всі
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className={cn(
              "text-xs rounded-xl font-medium",
              is2024 ? "bg-amber-500 text-slate-950 hover:bg-amber-400" : "bg-teal-500 text-slate-950 hover:bg-teal-400"
            )}
          >
            Застосувати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
