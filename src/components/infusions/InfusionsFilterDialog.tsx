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
  selectedLevels: Set<number>;
  toggleLevel: (lvl: number) => void;
  selectedTargets: Set<string>;
  toggleTarget: (target: string) => void;
  attunementOnly: boolean;
  toggleAttunement: () => void;
  clearFilters: () => void;
};

const ARTIFICER_LEVELS = [2, 6, 10, 14];

const TARGET_TYPES: { key: string; label: string }[] = [
  { key: "WEAPON", label: "Зброя" },
  { key: "ARMOR", label: "Обладунок" },
  { key: "SHIELD", label: "Щит" },
  { key: "RING", label: "Перстень" },
  { key: "BOOTS", label: "Чоботи" },
  { key: "HELMET", label: "Шолом" },
  { key: "WAND_ROD_STAFF", label: "Фокуси" },
  { key: "ANY", label: "Репліка предмета / Будь-який" },
];

export function InfusionsFilterDialog({
  open,
  onOpenChange,
  selectedLevels,
  toggleLevel,
  selectedTargets,
  toggleTarget,
  attunementOnly,
  toggleAttunement,
  clearFilters,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto border-white/10 bg-slate-950/95 p-5 backdrop-blur-2xl text-slate-100">
        <DialogHeader>
          <DialogTitle className="font-rpg-display text-xl uppercase tracking-wider text-slate-100">
            Фільтри вливань винахідника
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Min Artificer Level */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Мінімальний рівень винахідника
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ARTIFICER_LEVELS.map((lvl) => {
                const isSelected = selectedLevels.has(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => toggleLevel(lvl)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                      isSelected
                        ? "border-teal-500/50 bg-teal-500/20 text-teal-200"
                        : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    Рівень {lvl}+
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Type */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Тип цільового предмета
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TARGET_TYPES.map((tt) => {
                const isSelected = selectedTargets.has(tt.key);
                return (
                  <button
                    key={tt.key}
                    type="button"
                    onClick={() => toggleTarget(tt.key)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                      isSelected
                        ? "border-teal-500/50 bg-teal-500/20 text-teal-200"
                        : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    {tt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attunement */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Налаштування
            </div>
            <button
              type="button"
              onClick={toggleAttunement}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                attunementOnly
                  ? "border-teal-500/50 bg-teal-500/20 text-teal-200"
                  : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              Лише ті, що потребують налаштування
            </button>
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
            className="text-xs rounded-xl font-medium bg-teal-500 text-slate-950 hover:bg-teal-400"
          >
            Застосувати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
