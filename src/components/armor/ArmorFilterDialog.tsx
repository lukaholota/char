"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { armorTypeTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024?: boolean;
  selectedTypes: Set<string>;
  toggleType: (type: string) => void;
  disadvantageOnly: boolean;
  toggleDisadvantage: () => void;
  hasStrengthReqOnly: boolean;
  toggleStrengthReq: () => void;
  clearFilters: () => void;
};

const ARMOR_TYPES = ["LIGHT", "MEDIUM", "HEAVY", "SHIELD"];

export function ArmorFilterDialog({
  open,
  onOpenChange,
  is2024 = false,
  selectedTypes,
  toggleType,
  disadvantageOnly,
  toggleDisadvantage,
  hasStrengthReqOnly,
  toggleStrengthReq,
  clearFilters,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto border-white/10 bg-slate-950/95 p-5 backdrop-blur-2xl text-slate-100">
        <DialogHeader>
          <DialogTitle className="font-rpg-display text-xl uppercase tracking-wider text-slate-100">
            Фільтри обладунків
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Armor Type */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Тип обладунку
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ARMOR_TYPES.map((type) => {
                const isSelected = selectedTypes.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                      isSelected
                        ? is2024
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                          : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                        : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    {armorTypeTranslations[type] || type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Properties & Flags */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Особливості
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={toggleDisadvantage}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                  disadvantageOnly
                    ? is2024
                      ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                      : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                    : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                Лише з перешкодою на Непомітність
              </button>

              <button
                type="button"
                onClick={toggleStrengthReq}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                  hasStrengthReqOnly
                    ? is2024
                      ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                      : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                    : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                З вимогою до Сили
              </button>
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
