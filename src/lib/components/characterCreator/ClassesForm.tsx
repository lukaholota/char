"use client";

import { SpellcastingType } from "@prisma/client";
import { attributesUkrShort, classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import clsx from "clsx";
import { useStepForm } from "@/hooks/useStepForm";
import { classSchema } from "@/lib/zod/schemas/persCreateSchema";
import { ClassI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { ClassInfoModal } from "@/lib/components/characterCreator/modals/ClassInfoModal";
import {
  formatAbilityList,
  formatArmorProficiencies,
  formatLanguages,
  formatMulticlassReqs,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

interface Props {
  classes: ClassI[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
  mode?: "flow" | "wizard"
  onClassSelected?: (classId: number) => void
}

export const ClassesForm = (
  {classes, formId, onNextDisabledChange, mode = "flow", onClassSelected}: Props
) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const {form, onSubmit} = useStepForm(classSchema, (data) => {
    if (mode === "wizard") {
      if (typeof data.classId === "number") onClassSelected?.(data.classId);
      return;
    }

    const prev = usePersFormStore.getState().formData.classId;
    const prevId = typeof prev === "number" ? prev : typeof prev === "string" ? Number(prev) : NaN;
    const changed = !Number.isFinite(prevId) || prevId !== data.classId;

    updateFormData(
      changed
        ? ({
            classId: data.classId,
            subclassId: undefined,
            subclassChoiceSelections: {},
            classChoiceSelections: {},
            classOptionalFeatureSelections: {},
          } as any)
        : ({ classId: data.classId } as any)
    );
    nextStep();
  });

  const chosenClassId = form.watch('classId') || 0
  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => (a.sortOrder - b.sortOrder) || (a.classId - b.classId)),
    [classes]
  );

  useEffect(() => {
    if (!chosenClassId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenClassId]);

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть клас
        </h2>
        <p className="text-sm text-slate-400">Натисніть картку, або відкрийте ? для деталей.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {
          sortedClasses.map(c =>  (
            <Card
              key={c.classId}
              className={clsx(
                "glass-card cursor-pointer transition-all duration-200",
                c.classId === chosenClassId && "glass-active"
              )}
              onClick={(e) => {
                if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                form.setValue('classId', c.classId);

                const prev = usePersFormStore.getState().formData.classId;
                const prevId = typeof prev === "number" ? prev : typeof prev === "string" ? Number(prev) : NaN;
                const changed = !Number.isFinite(prevId) || prevId !== c.classId;

                if (changed) {
                  updateFormData({
                    classId: c.classId,
                    subclassId: undefined,
                    subclassChoiceSelections: {},
                    classChoiceSelections: {},
                    classOptionalFeatureSelections: {},
                  } as any);
                } else {
                  updateFormData({ classId: c.classId } as any);
                }

                if (mode === "wizard") onClassSelected?.(c.classId);
              }}
            >
                <CardContent className="relative flex items-center justify-between p-4">
                  <ClassInfoModal cls={c} />
                  <div>
                  <div className="text-lg font-semibold text-white">{classTranslations[c.name]}</div>
                  <div className="text-xs text-slate-400">{classTranslationsEng[c.name]}</div>
                  </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <input
        type="hidden"
        {...form.register("classId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined || value === null) return undefined;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : undefined;
          },
        })}
      />
    </form>
  )
};

export default ClassesForm;
