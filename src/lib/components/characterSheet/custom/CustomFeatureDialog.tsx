"use client";

import { useState } from "react";
import type { PersCustomFeature } from "@prisma/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormField, TextField, ToggleChip, describedBy } from "@/components/homebrew/HomebrewFormFields";
import type { PersWithRelations } from "@/lib/actions/pers";
import { deleteCustomFeatureAction, saveCustomFeatureAction, type CustomFeatureSaveResult } from "@/lib/actions/pers-custom-content-actions";
import { findCustomRollStats } from "@/lib/logic/bonus-calculator";
import { formatModifier } from "@/lib/logic/utils";
import { cn } from "@/lib/utils";
import { calculateCustomRollBonus, parseCustomRollFormulas, type CustomRollStats } from "@/rules/custom-roll-formula";
import type { CustomContentErrors, CustomFeatureDraft } from "@/rules/pers-custom-content";
import { formatCustomRoll } from "./custom-roll-view";
import { CustomContentForm, useCustomContentSave } from "./custom-content-form";

export type CustomFeatureTarget = PersCustomFeature | "new" | null;

const REST_OPTIONS = [
  { value: "SHORT_REST", label: "Короткий або довгий відпочинок" },
  { value: "LONG_REST", label: "Лише довгий відпочинок" },
  { value: "", label: "Лише вручну" },
] as const;

export function CustomFeatureDialog({ pers, target, onClose, onSaved }: {
  pers: PersWithRelations;
  target: CustomFeatureTarget;
  onClose: () => void;
  onSaved: (features: PersCustomFeature[]) => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(isOpen) => !isOpen && onClose()} enableBackButtonClose>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle>{target === "new" ? "Нова здібність або ресурс" : "Власна здібність"}</DialogTitle>
        <DialogDescription>Обовʼязкова лише назва. Формула додасть на картку кнопку кидка, кількість — лічильник використань.</DialogDescription>
        {target !== null ? <CustomFeatureForm key={target === "new" ? "new" : target.id} pers={pers} feature={target === "new" ? null : target} onSaved={onSaved} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CustomFeatureForm({ pers, feature, onSaved }: { pers: PersWithRelations; feature: PersCustomFeature | null; onSaved: (features: PersCustomFeature[]) => void }) {
  const [draft, setDraft] = useState<CustomFeatureDraft>({
    name: feature?.name ?? "",
    description: feature?.description ?? "",
    rollFormula: feature?.rollFormula ?? "",
    usesMax: feature?.usesMax?.toString() ?? "",
    restoredOn: feature?.usesMax ? feature.restoredOn ?? "" : "LONG_REST",
  });
  const [errors, setErrors] = useState<CustomContentErrors<CustomFeatureDraft>>({});
  const { isSaving, formError, setFormError, runSave } = useCustomContentSave();
  const changeField = (field: keyof CustomFeatureDraft) => (value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const hasUses = draft.usesMax.trim() !== "";
  const stats = findCustomRollStats(pers);

  const finishSave = (result: CustomFeatureSaveResult | null) => {
    if (!result) return;
    if (result.success) return onSaved(result.features);
    setErrors(result.errors ?? {});
    setFormError(result.error ?? null);
  };

  return (
    <CustomContentForm
      formError={formError}
      isSaving={isSaving}
      deleteRequest={feature ? { title: `Видалити «${feature.name}»?`, description: "Її не вийде повернути." } : null}
      onSubmit={async () => finishSave(await runSave(() => saveCustomFeatureAction(pers.persId, feature?.id ?? null, draft)))}
      onDelete={async () => finishSave(feature && (await runSave(() => deleteCustomFeatureAction(pers.persId, feature.id))))}
    >
      <TextField name="custom-feature-name" label="Назва" value={draft.name} onChange={changeField("name")} maxLength={100} placeholder="Подих предків" error={errors.name} />
      <FormField name="custom-feature-description" label="Опис" error={errors.description}>
        <textarea id="homebrew-custom-feature-description" aria-describedby={describedBy("custom-feature-description")} value={draft.description} maxLength={4000} rows={3} onChange={(event) => changeField("description")(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-base text-slate-100 focus-visible:ring-1 focus-visible:ring-amber-400/40 sm:text-sm" />
      </FormField>
      <div className="space-y-1">
        <TextField name="custom-feature-formula" label="Формула кидка" value={draft.rollFormula} onChange={changeField("rollFormula")} maxLength={200} placeholder="1к20+МУД+БМ, 2к6+МУД" error={errors.rollFormula} hint={describeFormulaWords(stats)} />
        <FormulaPreview stats={stats} text={draft.rollFormula} />
      </div>
      <TextField name="custom-feature-uses" label="Кількість використань" inputMode="numeric" value={draft.usesMax} onChange={changeField("usesMax")} maxLength={3} placeholder="Без ліку" error={errors.usesMax} hint="Порожньо — без ліку. З числом на картці зʼявиться лічильник і кнопка «Витратити»." />
      <fieldset aria-describedby="custom-feature-rest-hint" className="space-y-1">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Коли відновлюється</legend>
        <div className={cn("flex flex-wrap gap-2", !hasUses && "opacity-60")}>
          {REST_OPTIONS.map((option) => (
            <ToggleChip key={option.value} label={option.label} isOn={draft.restoredOn === option.value} onToggle={() => changeField("restoredOn")(option.value)} />
          ))}
        </div>
        {errors.restoredOn ? (
          <p id="custom-feature-rest-hint" className="text-xs text-rose-300">{errors.restoredOn}</p>
        ) : (
          <p id="custom-feature-rest-hint" className="text-xs text-slate-500">{hasUses ? `Після цього відпочинку лічильник знову стане ${draft.usesMax.trim()}.` : "Спрацює, коли вкажете кількість використань."}</p>
        )}
      </fieldset>
    </CustomContentForm>
  );
}

function describeFormulaWords(stats: CustomRollStats): string {
  return `Необовʼязково. БМ — бонус майстерності (зараз ${formatModifier(stats.proficiencyBonus)}), рівень — рівень персонажа (${stats.level}), СИЛ, СПР, СТА, ІНТ, МУД, ХАР — модифікатори характеристик. Кілька кидків, як-от атаку й шкоду, пишіть через кому.`;
}

function FormulaPreview({ stats, text }: { stats: CustomRollStats; text: string }) {
  const { formulas } = parseCustomRollFormulas(text);
  if (!formulas.length) return null;
  return <p aria-live="polite" className="text-sm text-slate-300">Кнопки на картці: {formulas.map((formula) => formatCustomRoll(formula, calculateCustomRollBonus(formula, stats))).join(", ")}</p>;
}
