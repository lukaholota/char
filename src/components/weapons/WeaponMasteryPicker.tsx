"use client";

import clsx from "clsx";
import { Check, Swords } from "lucide-react";
import { weaponTranslations } from "@/lib/refs/translation";
import { findWeaponMasteryDescription, formatWeaponMasteryLabel } from "@/lib/refs/weapon-mastery";

export type PickableMasteryWeapon = {
  weaponId: number;
  name: string;
  mastery: string | null;
};

type Props = {
  options: readonly PickableMasteryWeapon[];
  selectedWeaponIds: readonly number[];
  capacity: number;
  onToggle: (weaponId: number) => void;
};

/**
 * Один список вибору майстерності на три місця: крок конструктора, крок підвищення рівня й
 * редактор на листі персонажа. Розійшлися б копії — розійшлися б і правила показу.
 */
export function WeaponMasteryPicker({ options, selectedWeaponIds, capacity, onToggle }: Props) {
  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-yellow-500/40 p-4 text-center text-sm text-slate-300">
        Для цього класу немає зброї з властивістю майстерності.
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((weapon) => {
        const isSelected = selectedWeaponIds.includes(weapon.weaponId);
        const isDisabled = !isSelected && selectedWeaponIds.length >= capacity;
        return (
          <button
            type="button"
            key={weapon.weaponId}
            onClick={() => onToggle(weapon.weaponId)}
            disabled={isDisabled}
            className={clsx(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition",
              isSelected ? "border-amber-500/50 bg-amber-500/10" : "border-white/10 bg-white/5 hover:bg-white/10",
              isDisabled && "cursor-not-allowed opacity-40",
            )}
          >
            <Swords className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-semibold text-slate-100">
                <span className="truncate">
                  {weaponTranslations[weapon.name as keyof typeof weaponTranslations] || weapon.name}
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-amber-300" />}
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-amber-300">
                {formatWeaponMasteryLabel(weapon.mastery)}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                {findWeaponMasteryDescription(weapon.mastery)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default WeaponMasteryPicker;
