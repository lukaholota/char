"use client";

import { useState } from "react";
import type { PersCustomSkill } from "@prisma/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SelectField, TextField, ToggleChip } from "@/components/homebrew/HomebrewFormFields";
import type { PersWithRelations } from "@/lib/actions/pers";
import { deleteCustomSkillAction, saveCustomSkillAction, type CustomSkillSaveResult } from "@/lib/actions/pers-custom-content-actions";
import { calculateCustomSkillTotal } from "@/lib/logic/bonus-calculator";
import { formatModifier } from "@/lib/logic/utils";
import { Ability, SkillProficiencyType } from "@/lib/prisma-enums";
import { bonusTranslations } from "@/lib/refs/translation";
import type { CustomContentErrors, CustomSkillDraft } from "@/rules/pers-custom-content";
import { CustomContentForm, useCustomContentSave } from "./custom-content-form";

export type CustomSkillTarget = PersCustomSkill | "new" | null;
type SkillFields = Pick<PersCustomSkill, "id" | "name" | "ability" | "proficiencyType" | "bonus">;
type SkillSaveResult = { success: true } | { success: false; error?: string; errors?: CustomContentErrors<CustomSkillDraft> };
export type CustomSkillStore<Result extends SkillSaveResult> = {
  save: (skillId: number | null, draft: CustomSkillDraft) => Promise<Result>;
  remove: (skillId: number) => Promise<Result>;
};

const PROFICIENCY_OPTIONS = [
  { value: "NONE", label: "Немає" },
  { value: "HALF", label: "Половина" },
  { value: "PROFICIENT", label: "Майстерність" },
  { value: "EXPERTISE", label: "Експертиза" },
] as const;

const ABILITY_OPTIONS = (Object.values(Ability) as Ability[]).map((ability) => ({ value: ability, label: bonusTranslations.statNames[ability] }));
const SKILL_DESCRIPTION = "Кидається як звичайна навичка: к20, модифікатор характеристики, майстерність і бонус.";

export function CustomSkillDialog({ pers, target, onClose, onSaved }: {
  pers: PersWithRelations;
  target: CustomSkillTarget;
  onClose: () => void;
  onSaved: (skills: PersCustomSkill[]) => void;
}) {
  const store: CustomSkillStore<CustomSkillSaveResult> = {
    save: (skillId, draft) => saveCustomSkillAction(pers.persId, skillId, draft),
    remove: (skillId) => deleteCustomSkillAction(pers.persId, skillId),
  };
  return (
    <CustomSkillEditor
      pers={pers}
      target={target}
      title={target === "new" ? "Нова навичка" : "Власна навичка"}
      description={SKILL_DESCRIPTION}
      store={store}
      onClose={onClose}
      onSaved={(result) => result.success && onSaved(result.skills)}
    />
  );
}

export function CustomSkillEditor<Skill extends SkillFields, Result extends SkillSaveResult>({ pers, target, title, description, store, onClose, onSaved }: {
  pers: PersWithRelations | null;
  target: Skill | "new" | null;
  title: string;
  description: string;
  store: CustomSkillStore<Result>;
  onClose: () => void;
  onSaved: (result: Result) => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(isOpen) => !isOpen && onClose()} enableBackButtonClose>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {target !== null ? <CustomSkillForm key={target === "new" ? "new" : target.id} pers={pers} skill={target === "new" ? null : target} store={store} onSaved={onSaved} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CustomSkillForm<Result extends SkillSaveResult>({ pers, skill, store, onSaved }: { pers: PersWithRelations | null; skill: SkillFields | null; store: CustomSkillStore<Result>; onSaved: (result: Result) => void }) {
  const [draft, setDraft] = useState<CustomSkillDraft>({
    name: skill?.name ?? "",
    ability: skill?.ability ?? "WIS",
    proficiencyType: skill?.proficiencyType ?? "NONE",
    bonus: skill?.bonus ? String(skill.bonus) : "",
  });
  const [errors, setErrors] = useState<CustomContentErrors<CustomSkillDraft>>({});
  const { isSaving, formError, setFormError, runSave } = useCustomContentSave();
  const changeField = (field: keyof CustomSkillDraft) => (value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const finishSave = (result: Result | null) => {
    if (!result) return;
    if (result.success) return onSaved(result);
    setErrors(result.errors ?? {});
    setFormError(result.error ?? null);
  };

  return (
    <CustomContentForm
      formError={formError}
      isSaving={isSaving}
      deleteRequest={skill ? { title: `Видалити навичку «${skill.name}»?`, description: "Її не вийде повернути." } : null}
      onSubmit={async () => finishSave(await runSave(() => store.save(skill?.id ?? null, draft)))}
      onDelete={async () => finishSave(skill && (await runSave(() => store.remove(skill.id))))}
    >
      <TextField name="custom-skill-name" label="Назва" value={draft.name} onChange={changeField("name")} maxLength={60} placeholder="Екстрасенсорика" error={errors.name} />
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <SelectField name="custom-skill-ability" label="Характеристика" value={draft.ability} onChange={changeField("ability")} options={ABILITY_OPTIONS} error={errors.ability} />
        <TextField name="custom-skill-bonus" label="Додатковий бонус" value={draft.bonus} onChange={changeField("bonus")} maxLength={3} placeholder="0" error={errors.bonus} />
      </div>
      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Рівень майстерності</legend>
        <div className="flex flex-wrap gap-2">
          {PROFICIENCY_OPTIONS.map((option) => (
            <ToggleChip key={option.value} label={option.label} isOn={draft.proficiencyType === option.value} onToggle={() => changeField("proficiencyType")(option.value)} />
          ))}
        </div>
      </fieldset>
      {pers ? <p className="text-sm text-slate-300">Разом: <span className="font-semibold text-slate-100">{formatModifier(findPreviewTotal(pers, draft))}</span></p> : null}
    </CustomContentForm>
  );
}

function findPreviewTotal(pers: PersWithRelations, draft: CustomSkillDraft): number {
  const bonus = Number.parseInt(draft.bonus.replace("−", "-"), 10) || 0;
  return calculateCustomSkillTotal(pers, { ability: draft.ability as Ability, proficiencyType: draft.proficiencyType as SkillProficiencyType, bonus });
}
