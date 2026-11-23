"use client";

import type { HomebrewItemFormValues } from "@/lib/logic/homebrew-form-values";
import type { HomebrewItemBase, HomebrewItemBases } from "@/server/db/homebrew-item-bases";
import { abilityTranslations, damageTypeTranslations } from "@/lib/refs/translation";
import { ExtraDamageFields } from "@/lib/components/characterSheet/ExtraDamageFields";
import { SelectField, TextField } from "./HomebrewFormFields";

type Setter = <K extends keyof HomebrewItemFormValues>(key: K) => (value: HomebrewItemFormValues[K]) => void;
type Props = { values: HomebrewItemFormValues; set: Setter; errors: Record<string, string | undefined>; bases: HomebrewItemBases };

const ABILITY_OPTIONS = [{ value: "", label: "Як у основи" }, ...Object.entries(abilityTranslations).map(([value, label]) => ({ value, label }))];
const DAMAGE_TYPE_OPTIONS = [{ value: "", label: "Як у основи" }, ...Object.entries(damageTypeTranslations).map(([value, label]) => ({ value, label }))];

function buildBaseOptions(bases: HomebrewItemBase[], ruleset: HomebrewItemFormValues["ruleset"]) {
  const edition = ruleset === "RULES_2024" ? "RULES_2024" : "RULES_2014";
  return [{ value: "", label: "Без основи" }, ...bases.filter((base) => base.ruleset === edition).sort((a, b) => a.label.localeCompare(b.label, "uk")).map((base) => ({ value: String(base.id), label: base.label }))];
}

export function HomebrewWeaponFields({ values, set, errors, bases }: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-200">Зброя на листі персонажа</legend>
      <SelectField name="baseWeaponId" label="Основа" value={values.baseWeaponId} onChange={set("baseWeaponId")} options={buildBaseOptions(bases.weapons, values.ruleset)} error={errors.baseWeaponId} hint="З основою предмет одразу зʼявиться у зброї персонажа. Без неї гравець привʼяже його до своєї зброї сам." />
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField name="attackAbility" label="Атака від" value={values.attackAbility} onChange={(value) => set("attackAbility")(value as HomebrewItemFormValues["attackAbility"])} options={ABILITY_OPTIONS} error={errors.attackAbility} />
        <TextField name="damageFormula" label="Шкода" value={values.damageFormula} onChange={set("damageFormula")} maxLength={60} placeholder="1к8+СПР" error={errors.damageFormula} hint="Напр. 1к8+СПР або 1к6+СИЛ*2" />
        <SelectField name="damageType" label="Тип шкоди" value={values.damageType} onChange={(value) => set("damageType")(value as HomebrewItemFormValues["damageType"])} options={DAMAGE_TYPE_OPTIONS} error={errors.damageType} />
      </div>
      <ExtraDamageFields value={values.extraDamage} onChange={set("extraDamage")} error={errors.extraDamage} />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="normalRange" label="Дальність, фт" value={values.normalRange} onChange={set("normalRange")} maxLength={4} inputMode="numeric" placeholder="150" error={errors.normalRange} />
        <TextField name="longRange" label="Макс. дальність, фт" value={values.longRange} onChange={set("longRange")} maxLength={4} inputMode="numeric" placeholder="600" error={errors.longRange} />
      </div>
    </fieldset>
  );
}

export function HomebrewArmorFields({ values, set, errors, bases }: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-200">Обладунок на листі персонажа</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField name="baseArmorId" label="Основа" value={values.baseArmorId} onChange={set("baseArmorId")} options={buildBaseOptions(bases.armors, values.ruleset)} error={errors.baseArmorId} hint="Від основи беруться тип обладунку, Спритність і перешкода скритності." />
        <TextField name="armorBaseAC" label="Базовий КБ" value={values.armorBaseAC} onChange={set("armorBaseAC")} maxLength={2} inputMode="numeric" placeholder="Як у основи" error={errors.armorBaseAC} />
      </div>
    </fieldset>
  );
}
