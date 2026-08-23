"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  weaponTypeTranslations,
  damageTypeTranslations,
  weaponPropertyTranslations,
} from "@/lib/refs/translation";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024?: boolean;
  selectedTypes: Set<string>;
  toggleType: (type: string) => void;
  selectedDamageTypes: Set<string>;
  toggleDamageType: (dt: string) => void;
  selectedProperties: Set<string>;
  toggleProperty: (prop: string) => void;
  selectedMasteries?: Set<string>;
  toggleMastery?: (mastery: string) => void;
  clearFilters: () => void;
};

const WEAPON_TYPES = ["SIMPLE_WEAPON", "MARTIAL_WEAPON", "FIREARMS"];
const DAMAGE_TYPES = ["SLASHING", "PIERCING", "BLUDGEONING", "RADIANT", "NECROTIC"];
const WEAPON_PROPERTIES = [
  "FINESSE",
  "LIGHT",
  "VERSATILE",
  "TWO_HANDED",
  "THROWN",
  "HEAVY",
  "REACH",
  "AMMUNITION",
  "LOADING",
];
const MASTERY_PROPERTIES = ["CLEAVE", "GRAZE", "NICK", "PUSH", "SAP", "SLOW", "TOPPLE", "VEX"];

const MASTERY_LABELS: Record<string, string> = {
  CLEAVE: "Розмах (Cleave)",
  GRAZE: "Черкання (Graze)",
  NICK: "Кидок (Nick)",
  PUSH: "Поштовх (Push)",
  SAP: "Виснаження (Sap)",
  SLOW: "Уповільнення (Slow)",
  TOPPLE: "Повалення (Topple)",
  VEX: "Знервування (Vex)",
};

export function WeaponsFilterDialog({
  open,
  onOpenChange,
  is2024 = false,
  selectedTypes,
  toggleType,
  selectedDamageTypes,
  toggleDamageType,
  selectedProperties,
  toggleProperty,
  selectedMasteries,
  toggleMastery,
  clearFilters,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto border-white/10 bg-slate-950/95 p-5 backdrop-blur-2xl text-slate-100">
        <DialogHeader>
          <DialogTitle className="font-rpg-display text-xl uppercase tracking-wider text-slate-100">
            Фільтри зброї
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Weapon Type */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Категорія зброї
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WEAPON_TYPES.map((type) => {
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
                    {weaponTypeTranslations[type] || type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Damage Type */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Тип шкоди
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DAMAGE_TYPES.map((dt) => {
                const isSelected = selectedDamageTypes.has(dt);
                return (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => toggleDamageType(dt)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                      isSelected
                        ? is2024
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                          : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                        : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    {damageTypeTranslations[dt] || dt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2024 Weapon Mastery */}
          {is2024 && selectedMasteries && toggleMastery && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">
                Майстерність зброї (Weapon Mastery 2024)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MASTERY_PROPERTIES.map((m) => {
                  const isSelected = selectedMasteries.has(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMastery(m)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                        isSelected
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                          : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      )}
                    >
                      {MASTERY_LABELS[m] || m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Properties */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Властивості
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WEAPON_PROPERTIES.map((prop) => {
                const isSelected = selectedProperties.has(prop);
                return (
                  <button
                    key={prop}
                    type="button"
                    onClick={() => toggleProperty(prop)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
                      isSelected
                        ? is2024
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                          : "border-teal-500/50 bg-teal-500/20 text-teal-200"
                        : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    {weaponPropertyTranslations[prop] || prop}
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
