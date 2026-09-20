"use client";

import { classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import { useStepForm } from "@/hooks/useStepForm";
import { classSchema } from "@/lib/zod/schemas/persCreateSchema";
import { ClassI } from "@/lib/types/model-types";
import { useEffect, useMemo, useState } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { ClassInfoModal } from "@/lib/components/characterCreator/modals/ClassInfoModal";
import { CreationCard } from "@/components/characterCreator/CreationCard";
import { getClassVisual } from "@/components/characterCreator/creation-visuals";
import { PrerequisiteConfirmationDialog } from "@/lib/components/ui/PrerequisiteConfirmationDialog";

export type ClassRulesLock = { note: string; reason: string };

interface Props {
  classes: ClassI[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  mode?: "flow" | "wizard";
  onClassSelected?: (classId: number) => void;
  findRulesLock?: (cls: ClassI) => ClassRulesLock | null;
}

export const ClassesForm = (
  {classes, formId, onNextDisabledChange, mode = "flow", onClassSelected, findRulesLock}: Props
) => {
  const { updateFormData, nextStep } = usePersFormStore();
  const [lockedClassPending, setLockedClassPending] = useState<{ cls: ClassI; lock: ClassRulesLock } | null>(null);
  
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

  const chosenClassId = form.watch('classId') || 0;
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

  const handleClassSelect = (c: ClassI) => {
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
  };

  const handleCardClick = (c: ClassI) => {
    const lock = c.classId === chosenClassId ? null : findRulesLock?.(c);
    if (lock) {
      setLockedClassPending({ cls: c, lock });
      return;
    }
    handleClassSelect(c);
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть клас
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {sortedClasses.map((c) => (
          <CreationCard
            key={c.classId}
            testId={`class-${c.name}`}
            title={classTranslations[c.name] ?? c.name}
            englishTitle={classTranslationsEng[c.name]}
            visual={getClassVisual(c.name)}
            isSelected={c.classId === chosenClassId}
            is2024={c.ruleset === "RULES_2024"}
            lockNote={findRulesLock?.(c)?.note}
            infoModal={<ClassInfoModal cls={c} asyncFetchSubclasses={false} />}
            onClick={(e) => {
              if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
              handleCardClick(c);
            }}
          />
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

      <PrerequisiteConfirmationDialog
        open={lockedClassPending !== null}
        onOpenChange={(open) => {
          if (!open) setLockedClassPending(null);
        }}
        title="Цей клас проти правил"
        description="За правилами мультикласу персонаж не може взяти цей клас. Якщо дуже треба — узгодь зі своїм майстром."
        reason={lockedClassPending?.lock.reason}
        onConfirm={() => {
          if (lockedClassPending) handleClassSelect(lockedClassPending.cls);
        }}
      />
    </form>
  );
};

export default ClassesForm;
