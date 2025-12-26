"use client";

import { useEffect, useMemo, useRef } from "react";
import { useStepForm } from "@/hooks/useStepForm";
import { raceChoiceOptionsSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { RaceI } from "@/lib/types/model-types";

interface Props {
  race?: RaceI | null;
  subraceId?: number | null;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

type RaceWithChoices = RaceI & { raceChoiceOptions?: RaceChoiceOptionLike[] };

type RaceChoiceOptionLike = {
  optionId: number;
  subraceId?: number | null;
  choiceGroupName: string;
  optionName: string;
  description?: string | null;
  selectMultiple?: boolean;
  maxSelection?: number;
};

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

      <div className="space-y-4">
        {groupedOptions.map(({ groupName, options }) => (
          <Card key={groupName}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Група</p>
                  <p className="text-base font-semibold text-white">{groupName}</p>
                </div>
                <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                  Оберіть 1
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((opt) => {
                  const selected = selections[groupName] === opt.optionId;

                  return (
                    <Card
                      key={opt.optionId}
                      className={clsx(
                        "glass-card cursor-pointer transition-all duration-200",
                        selected ? "glass-active" : ""
                      )}
                      onClick={() => selectOption(groupName, opt.optionId)}
                    >
                      <CardContent className="flex h-full flex-col gap-2 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">{opt.optionName}</p>
                          <Badge
                            variant={selected ? "secondary" : "outline"}
                            className={clsx(
                              "border-white/15 bg-white/5 text-slate-200",
                              selected && "text-slate-100"
                            )}
                          >
                            {selected ? "Обрано" : "Обрати"}
                          </Badge>
                        </div>

                        {opt.description ? (
                          <p className="text-sm text-slate-200/90 whitespace-pre-line">{opt.description}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </form>
  );
};

export default RaceChoiceOptionsForm;
