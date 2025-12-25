"use client";

import { useEffect, useMemo, useRef } from "react";
import { ClassI } from "@/lib/types/model-types";
import { useStepForm } from "@/hooks/useStepForm";
import { classChoiceOptionsSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
// import { Button } from "@/lib/components/ui/Button";
import { classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import { InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import clsx from "clsx";
import { usePersFormStore } from "@/lib/stores/persFormStore";

interface Props {
  selectedClass?: ClassI | null;
  availableOptions?: ClassI["classChoiceOptions"];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

const formatFeatures = (features?: ClassI["classChoiceOptions"][number]["choiceOption"]["features"]) =>
  (features || []).map((item) => item.feature?.name).filter(Boolean);

const displayName = (cls?: ClassI | null) =>
  cls ? classTranslations[cls.name] || classTranslationsEng[cls.name] || cls.name : "Клас";

const ClassChoiceOptionsForm = ({ selectedClass, availableOptions, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(classChoiceOptionsSchema, (data) => {
    updateFormData({ classChoiceSelections: data.classChoiceSelections });
    nextStep();
  });
  
  const selections = form.watch("classChoiceSelections") || {};
  const prevDisabledRef = useRef<boolean | undefined>(undefined);

  const optionsToUse = useMemo(() => {
      if (availableOptions) return availableOptions;
      return (selectedClass?.classChoiceOptions || []).filter((opt) => (opt.levelsGranted || []).includes(1));
  }, [selectedClass, availableOptions]);

  const groupedOptions = useMemo(() => {
    const groups: Record<string, typeof optionsToUse> = {};
    optionsToUse.forEach((opt) => {
      const key = opt.choiceOption.groupName || "Опції";
      if (!groups[key]) groups[key] = [];
      groups[key].push(opt);
    });
    return Object.entries(groups).map(([groupName, options]) => ({ groupName, options }));
  }, [optionsToUse]);

  useEffect(() => {
    let disabled: boolean;

    if (!selectedClass) {
      disabled = true;
    } else if (!groupedOptions.length) {
      disabled = false;
    } else {
      disabled = groupedOptions.some(({ groupName }) => !selections[groupName]);
    }

    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [selectedClass, groupedOptions, selections, onNextDisabledChange]);

  useEffect(() => {
    updateFormData({ classChoiceSelections: selections });
  }, [selections, updateFormData]);

  const selectOption = (groupName: string, optionId: number) => {
    const next = { ...(selections || {}), [groupName]: optionId };
    form.setValue("classChoiceSelections", next, { shouldDirty: true });
  };

  if (!selectedClass && !availableOptions) {
    return (
      <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
        Спершу оберіть клас.
      </Card>
    );
  }

  if (!groupedOptions.length) {
    return (
      <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
        На 1 рівні {displayName(selectedClass)} не має окремих виборів. Можна рухатися далі.
      </Card>
    );
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-indigo-200">Рівень 1</p>
        <h2 className="text-xl font-semibold text-white">Опції класу</h2>
        <p className="text-sm text-slate-400">
          {displayName(selectedClass)} пропонує вибір. Оберіть те, що підходить вашому персонажу.
        </p>
      </div>

      <div className="space-y-4">
        {groupedOptions.map(({ groupName, options }) => (
          <Card
            key={groupName}
            className="border border-slate-800/80 bg-slate-900/70 shadow-inner shadow-indigo-500/5"
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Група</p>
                  <p className="text-base font-semibold text-white">{groupName}</p>
                </div>
                <Badge variant="outline" className="border-slate-700 bg-slate-800/60 text-slate-200">
                  Оберіть 1
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((opt) => {
                  const optionId = opt.optionId ?? opt.choiceOptionId;
                  const selected = selections[groupName] === optionId;
                  const features = formatFeatures(opt.choiceOption.features);
                  const label = opt.choiceOption.optionName || opt.choiceOption.optionNameEng;

                  return (
                    <Card
                      key={optionId}
                      className={clsx(
                        "cursor-pointer transition hover:-translate-y-0.5",
                        selected
                          ? "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
                          : "border-slate-800/80 bg-slate-900/70 hover:border-indigo-500/60"
                      )}
                      onClick={() => selectOption(groupName, optionId)}
                    >
                      <CardContent className="flex h-full flex-col gap-3 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{label}</p>
                          <Badge
                            variant={selected ? "secondary" : "outline"}
                            className={clsx(
                              "border-slate-700",
                              selected
                                ? "bg-indigo-500/20 text-indigo-50"
                                : "bg-slate-800/60 text-slate-200"
                            )}
                          >
                            {selected ? "Обрано" : "Обрати"}
                          </Badge>
                        </div>

                        {features.length ? (
                          <div className="space-y-1.5 rounded-lg border border-slate-800/70 bg-slate-950/40 p-3">
                            <InfoSectionTitle>Що дає</InfoSectionTitle>
                            <ul className="space-y-1 text-sm text-slate-200/90">
                              {features.map((feat) => (
                                <li key={feat} className="flex items-start gap-2">
                                  <span
                                    className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400"
                                    aria-hidden
                                  />
                                  <span className="leading-snug">{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
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

export default ClassChoiceOptionsForm;
