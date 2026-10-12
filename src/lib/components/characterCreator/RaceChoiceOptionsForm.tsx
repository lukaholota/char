"use client";

import { useEffect, useMemo, useRef } from "react";
import { useStepForm } from "@/hooks/useStepForm";
import { raceChoiceOptionsSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Card } from "@/components/ui/card";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { RaceI } from "@/lib/types/model-types";
import { RaceChoiceOptionGroups, type RaceChoiceOptionLike } from "@/lib/components/characterCreator/RaceChoiceOptionGroups";
import { useNextStepHint } from "@/lib/components/wizard/next-step-hint";
import { buildGroupPickHint, findFirstHint } from "@/lib/components/wizard/pick-hint";

interface Props {
  race?: RaceI | null;
  subraceId?: number | null;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

type RaceWithChoices = RaceI & { raceChoiceOptions?: RaceChoiceOptionLike[] };

const RaceChoiceOptionsForm = ({ race, subraceId, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();

  const { form, onSubmit } = useStepForm(raceChoiceOptionsSchema, (data) => {
    updateFormData({ raceChoiceSelections: data.raceChoiceSelections });
    nextStep();
  });

  const watchedSelections = form.watch("raceChoiceSelections");
  const selections = useMemo(() => watchedSelections || {}, [watchedSelections]);
  const prevDisabledRef = useRef<boolean | undefined>(undefined);

  const optionsToUse = useMemo(() => {
    const raw = ((race as RaceWithChoices | null | undefined)?.raceChoiceOptions || []) as RaceChoiceOptionLike[];

    return raw.filter((opt) => {
      const optSubraceId = opt.subraceId ?? null;
      if (!optSubraceId) return true;
      if (!subraceId) return false;
      return optSubraceId === subraceId;
    });
  }, [race, subraceId]);

  const groupedOptions = useMemo(() => {
    const groups: Record<string, RaceChoiceOptionLike[]> = {};
    optionsToUse.forEach((opt) => {
      const key = opt.choiceGroupName || "Опції раси";
      if (!groups[key]) groups[key] = [];
      groups[key].push(opt);
    });

    return Object.entries(groups).map(([groupName, options]) => ({
      groupName,
      options: options.sort((a, b) => a.optionId - b.optionId),
    }));
  }, [optionsToUse]);

  useNextStepHint(findFirstHint(groupedOptions.map(({ groupName }) =>
    buildGroupPickHint(groupName, selections[groupName] === undefined ? 0 : 1, 1)
  )));

  useEffect(() => {
    let disabled: boolean;

    if (!race) {
      disabled = true;
    } else if (groupedOptions.length === 0) {
      disabled = false;
    } else {
      disabled = groupedOptions.some(({ groupName }) => selections[groupName] === undefined);
    }

    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [race, groupedOptions, selections, onNextDisabledChange]);

  useEffect(() => {
    updateFormData({ raceChoiceSelections: selections });
  }, [selections, updateFormData]);

  const selectOption = (groupName: string, optionId: number) => {
    const next = { ...(selections || {}), [groupName]: optionId };
    form.setValue("raceChoiceSelections", next, { shouldDirty: true });
  };

  if (!race) {
    return (
      <Card className="p-4 text-center text-slate-200">
        Спершу оберіть расу.
      </Card>
    );
  }

  if (!groupedOptions.length) {
    return (
      <Card className="p-4 text-center text-slate-200">
        Для цієї раси немає додаткових виборів. Можна рухатися далі.
      </Card>
    );
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Опції раси
        </h2>
        <p className="text-sm text-slate-400">
          Оберіть 1 варіант у кожній групі.
        </p>
      </div>

      <RaceChoiceOptionGroups groupedOptions={groupedOptions} selections={selections} onSelectOption={selectOption} />
    </form>
  );
};

export default RaceChoiceOptionsForm;
