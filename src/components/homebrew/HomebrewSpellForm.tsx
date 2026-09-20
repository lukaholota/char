"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveHomebrewSpell } from "@/lib/actions/homebrew-actions";
import { SPELL_SCHOOLS, listEditionClasses, type HomebrewEdition } from "@/lib/logic/homebrew-input";
import type { HomebrewSpellFormValues } from "@/lib/logic/homebrew-form-values";
import { RichTextField, RULESET_OPTIONS, SelectField, TextField, ToggleChip } from "./HomebrewFormFields";
import { useHomebrewSubmit } from "./useHomebrewSubmit";

const LEVEL_OPTIONS = Array.from({ length: 10 }, (_, level) => ({ value: String(level), label: level === 0 ? "Замовляння" : `${level} рівень` }));
const SCHOOL_OPTIONS = SPELL_SCHOOLS.map((school) => ({ value: school, label: school }));

export function HomebrewSpellForm({ entryId, initialValues }: { entryId?: number; initialValues: HomebrewSpellFormValues }) {
  const [values, setValues] = useState(initialValues);
  const { errors, isSaving, submit } = useHomebrewSubmit();
  const set = <K extends keyof HomebrewSpellFormValues>(key: K) => (value: HomebrewSpellFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const toggleClass = (value: string) => set("classes")(values.classes.includes(value) ? values.classes.filter((entry) => entry !== value) : [...values.classes, value]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit(() => saveHomebrewSpell({ entryId, values }));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField name="name" label="Назва" value={values.name} onChange={set("name")} maxLength={120} error={errors.name} />
        <TextField name="engName" label="Назва англійською" value={values.engName} onChange={set("engName")} maxLength={120} error={errors.engName} hint="Необовʼязково" />
        <SelectField name="ruleset" label="Редакція" value={values.ruleset} onChange={(value) => setValues((current) => ({ ...current, ruleset: value as HomebrewEdition, classes: [] }))} options={RULESET_OPTIONS} />
        <SelectField name="level" label="Рівень" value={values.level} onChange={set("level")} options={LEVEL_OPTIONS} error={errors.level} />
        <SelectField name="school" label="Школа" value={values.school} onChange={(value) => set("school")(value as HomebrewSpellFormValues["school"])} options={SCHOOL_OPTIONS} error={errors.school} />
        <TextField name="castingTime" label="Час накладання" value={values.castingTime} onChange={set("castingTime")} maxLength={80} error={errors.castingTime} />
        <TextField name="range" label="Дистанція" value={values.range} onChange={set("range")} maxLength={80} placeholder="60 футів" error={errors.range} />
        <TextField name="duration" label="Тривалість" value={values.duration} onChange={set("duration")} maxLength={80} placeholder="Миттєва" error={errors.duration} />
        <TextField name="components" label="Компоненти" value={values.components} onChange={set("components")} maxLength={300} placeholder="В, С, М (пірʼїна)" error={errors.components} className="sm:col-span-2" />
      </div>

      <div className="flex flex-wrap gap-2">
        <ToggleChip label="Ритуал" isOn={values.isRitual} onToggle={() => set("isRitual")(!values.isRitual)} />
        <ToggleChip label="Концентрація" isOn={values.isConcentration} onToggle={() => set("isConcentration")(!values.isConcentration)} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Класи</legend>
        <div className="flex flex-wrap gap-2">
          {listEditionClasses(values.ruleset).map((option) => (
            <ToggleChip key={option.value} label={option.label} isOn={values.classes.includes(option.value)} onToggle={() => toggleClass(option.value)} />
          ))}
        </div>
      </fieldset>

      <RichTextField name="description" label="Опис" value={values.description} onChange={set("description")} isTall error={errors.description} />

      <Button type="submit" className="h-12 w-full sm:h-10 sm:w-auto" disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : entryId ? "Зберегти зміни" : "Опублікувати"}
      </Button>
    </form>
  );
}
