"use client";

import { useState } from "react";
import { saveHomebrewItem } from "@/lib/actions/homebrew-actions";
import type { HomebrewEdition } from "@/lib/logic/homebrew-input";
import type { HomebrewItemFormValues } from "@/lib/logic/homebrew-form-values";
import { itemRarityTranslations, magicItemTypeTranslations } from "@/lib/refs/translation";
import { RichTextField, RULESET_OPTIONS, SelectField, SubmitBar, TextField, ToggleChip } from "./HomebrewFormFields";
import { useHomebrewSubmit } from "./useHomebrewSubmit";
import { CreatureActionsCheck, ITEM_ACTION_TEMPLATES } from "./CreatureActionsCheck";
import { HomebrewArmorFields, HomebrewWeaponFields } from "./HomebrewGearFields";
import type { HomebrewItemBases } from "@/server/db/homebrew-item-bases";
import { appendHomebrewImage, buildInitialHomebrewImage, HomebrewImageField, type HomebrewImage } from "./HomebrewImageField";

const TYPE_OPTIONS = Object.entries(magicItemTypeTranslations).map(([value, label]) => ({ value, label }));
const RARITY_OPTIONS = Object.entries(itemRarityTranslations).map(([value, label]) => ({ value, label }));

type Props = { entryId?: number; initialValues: HomebrewItemFormValues; initialImageUrl: string | null; bases: HomebrewItemBases };

export function HomebrewItemForm({ entryId, initialValues, initialImageUrl, bases }: Props) {
  const [values, setValues] = useState(initialValues);
  const [image, setImage] = useState(() => buildInitialHomebrewImage(initialImageUrl));
  const { errors, isSaving, submit, markEdited } = useHomebrewSubmit({ kind: "ITEM", ruleset: values.ruleset, entryId });
  const set = <K extends keyof HomebrewItemFormValues>(key: K) => (value: HomebrewItemFormValues[K]) => {
    markEdited();
    setValues((current) => ({ ...current, [key]: value }));
  };
  const changeImage = (next: HomebrewImage) => {
    markEdited();
    setImage(next);
  };
  const activation = values.requiresAttunement ? "екіпіровано й налаштовано" : "екіпіровано";

  const save = () => {
    const formData = new FormData();
    formData.set("values", JSON.stringify(values));
    if (entryId) formData.set("entryId", String(entryId));
    appendHomebrewImage(formData, image, "item.webp");
    return saveHomebrewItem(formData);
  };

  return (
    <form
      className="space-y-4"
      onChangeCapture={markEdited}
      onSubmit={(event) => {
        event.preventDefault();
        submit(save);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField name="name" label="Назва" value={values.name} onChange={set("name")} maxLength={100} error={errors.name} className="sm:col-span-2" />
        <SelectField name="ruleset" label="Редакція" value={values.ruleset} onChange={(value) => set("ruleset")(value as HomebrewEdition)} options={RULESET_OPTIONS} />
        <SelectField name="itemType" label="Тип" value={values.itemType} onChange={(value) => set("itemType")(value as HomebrewItemFormValues["itemType"])} options={TYPE_OPTIONS} error={errors.itemType} />
        {values.isMundane ? null : <SelectField name="rarity" label="Рідкісність" value={values.rarity} onChange={(value) => set("rarity")(value as HomebrewItemFormValues["rarity"])} options={RARITY_OPTIONS} error={errors.rarity} />}
      </div>

      <div className="flex flex-wrap gap-2">
        <ToggleChip label="Звичайний, не магічний" isOn={values.isMundane} onToggle={() => set("isMundane")(!values.isMundane)} />
        {values.isMundane ? null : <ToggleChip label="Потребує налаштування" isOn={values.requiresAttunement} onToggle={() => set("requiresAttunement")(!values.requiresAttunement)} />}
      </div>

      <RichTextField
        name="description"
        label="Опис"
        value={values.description}
        onChange={set("description")}
        isTall
        error={errors.description}
        hint="«Має N зарядів» дає лічильник на листі, відновлення «щодня на світанку» спрацює на довгому відпочинку. Кожну дію пишіть окремим абзацом: кубики в ній стануть кнопками кидка на листі, а «(витрачає 1 заряд)» зніме заряд перед кидком."
        snippets={ITEM_ACTION_TEMPLATES}
      />
      <CreatureActionsCheck markdown={values.description} isItem />

      {values.itemType === "WEAPON" ? <HomebrewWeaponFields values={values} set={set} errors={errors} bases={bases} /> : null}
      {values.itemType === "ARMOR" ? <HomebrewArmorFields values={values} set={set} errors={errors} bases={bases} /> : null}

      {values.isMundane ? null : <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-200">Бонуси, які рахує лист персонажа</legend>
        <p className="text-xs text-slate-400">Необовʼязково. Діють, поки предмет {activation}.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField name="acBonus" label="До КБ" value={values.acBonus} onChange={set("acBonus")} maxLength={2} inputMode="numeric" placeholder="+1" error={errors.acBonus} />
          <TextField name="saveBonus" label="До всіх ряткидків" value={values.saveBonus} onChange={set("saveBonus")} maxLength={2} inputMode="numeric" placeholder="+1" error={errors.saveBonus} />
          {values.itemType === "WEAPON" ? (
            <TextField name="weaponBonus" label="До влучання й шкоди" value={values.weaponBonus} onChange={set("weaponBonus")} maxLength={2} inputMode="numeric" placeholder="+1" error={errors.weaponBonus} />
          ) : null}
        </div>
      </fieldset>}

      <HomebrewImageField image={image} onChange={changeImage} alt="Картинка предмета" cropTitle="Кадр картинки предмета" />

      <SubmitBar isSaving={isSaving} isEditing={Boolean(entryId)} />
    </form>
  );
}
