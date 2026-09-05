"use client";

import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeaponMasteryPicker, type PickableMasteryWeapon } from "@/components/weapons/WeaponMasteryPicker";
import { usePersFormStore } from "@/lib/stores/persFormStore";

interface Props {
  capacity: number;
  options: PickableMasteryWeapon[];
  currentWeaponIds: number[];
  onNextDisabledChange?: (disabled: boolean) => void;
}

/**
 * Новий рівень відкриває ще один вид зброї. Крок показує весь набір, а не лише нову комірку:
  * вибір змінний будь-коли (рішення власника 2026-08-30), тож тут його теж можна переграти.
 */
export function LevelUpWeaponMasteryStep({ capacity, options, currentWeaponIds, onNextDisabledChange }: Props) {
  const { formData, updateFormData } = usePersFormStore();

  const selected = useMemo(() => {
    const stored = formData.weaponMasteryWeaponIds;
    return Array.isArray(stored) ? stored : currentWeaponIds;
  }, [formData.weaponMasteryWeaponIds, currentWeaponIds]);

  useEffect(() => {
    onNextDisabledChange?.(selected.length !== capacity);
  }, [selected.length, capacity, onNextDisabledChange]);

  const toggleWeapon = (weaponId: number) => {
    if (selected.includes(weaponId)) {
      updateFormData({ weaponMasteryWeaponIds: selected.filter((id) => id !== weaponId) });
      return;
    }
    if (selected.length >= capacity) return;
    updateFormData({ weaponMasteryWeaponIds: [...selected, weaponId] });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Майстерність зброї</CardTitle>
        <p className="text-sm text-slate-400">
          Новий рівень дає {capacity} {countWeaponKinds(capacity)} зброї з властивістю майстерності.
          Обрано {selected.length} з {capacity}.
        </p>
      </CardHeader>
      <CardContent>
        <WeaponMasteryPicker
          options={options}
          selectedWeaponIds={selected}
          capacity={capacity}
          onToggle={toggleWeapon}
        />
      </CardContent>
    </Card>
  );
}

function countWeaponKinds(capacity: number): string {
  if (capacity === 1) return "вид";
  return capacity < 5 ? "види" : "видів";
}

export default LevelUpWeaponMasteryStep;
