"use client";

import { useEffect, useMemo } from "react";
import type { Weapon } from "@prisma/client";
import { useStepForm } from "@/hooks/useStepForm";
import { weaponMasterySchema } from "@/lib/zod/schemas/persCreateSchema";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { ClassI } from "@/lib/types/model-types";
import { WeaponMasteryPicker } from "@/components/weapons/WeaponMasteryPicker";
import { findWeaponMasteryCapacity, findWeaponMasteryOptionsForClasses } from "@/rules/weapon-mastery";

interface Props {
  selectedClass?: ClassI | null;
  weapons: Weapon[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const WeaponMasteryForm = ({ selectedClass, weapons, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  const { form, onSubmit } = useStepForm(weaponMasterySchema, (data) => {
    updateFormData({ weaponMasteryWeaponIds: data.weaponMasteryWeaponIds });
    nextStep();
  });

  const classOffers = useMemo(() => toCreationClassOffer(selectedClass), [selectedClass]);
  const capacity = useMemo(() => findWeaponMasteryCapacity(classOffers), [classOffers]);
  const options = useMemo(
    () => findWeaponMasteryOptionsForClasses(classOffers, weapons),
    [classOffers, weapons],
  );

  const watched = form.watch("weaponMasteryWeaponIds");
  const selected = useMemo(() => watched ?? [], [watched]);
  const isComplete = selected.length === capacity;

  useEffect(() => {
    onNextDisabledChange?.(!isComplete);
  }, [isComplete, onNextDisabledChange]);

  /// Зміна класу може лишити в наборі зброю, якої новий клас не знає, — прибираємо мовчки.
  useEffect(() => {
    const offeredIds = new Set(options.map((weapon) => weapon.weaponId));
    const stillOffered = selected.filter((weaponId) => offeredIds.has(weaponId)).slice(0, capacity);
    if (stillOffered.length === selected.length) return;
    form.setValue("weaponMasteryWeaponIds", stillOffered);
    updateFormData({ weaponMasteryWeaponIds: stillOffered });
  }, [options, capacity, selected, form, updateFormData]);

  const toggleWeapon = (weaponId: number) => {
    const current = form.getValues("weaponMasteryWeaponIds") || [];
    const next = current.includes(weaponId)
      ? current.filter((id) => id !== weaponId)
      : current.length < capacity
        ? [...current, weaponId]
        : current;
    if (next === current) return;
    form.setValue("weaponMasteryWeaponIds", next);
    updateFormData({ weaponMasteryWeaponIds: next });
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Майстерність зброї
        </h2>
        <p className="text-sm text-slate-400">
          Оберіть {capacity} {countWeaponKinds(capacity)} зброї, чиєю властивістю майстерності
          персонаж уміє користуватися. Обрано {selected.length} з {capacity}.
        </p>
        <p className="text-xs text-slate-500">Набір можна змінити будь-коли на листі персонажа.</p>
      </div>

      <WeaponMasteryPicker
        options={options}
        selectedWeaponIds={selected}
        capacity={capacity}
        onToggle={toggleWeapon}
      />
    </form>
  );
};

function countWeaponKinds(capacity: number): string {
  if (capacity === 1) return "вид";
  return capacity < 5 ? "види" : "видів";
}

/** Конструктор завжди робить персонажа першого рівня — інших класів у нього ще немає. */
function toCreationClassOffer(selectedClass?: ClassI | null) {
  if (!selectedClass) return [];
  return [
    {
      className: selectedClass.name,
      classLevel: 1,
      masteryProgression: selectedClass.weapon_mastery_progression ?? [],
      weaponProficiencies: selectedClass.weaponProficiencies,
      weaponProficienciesSpecial: selectedClass.weaponProficienciesSpecial,
    },
  ];
}

export default WeaponMasteryForm;
