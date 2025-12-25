"use client";

import { useEffect, useMemo } from "react";
import { ClassI } from "@/lib/types/model-types";
import { useStepForm } from "@/hooks/useStepForm";
import { classOptionalFeaturesSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/Button";
import { classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import { InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import clsx from "clsx";

interface Props {
  selectedClass?: ClassI | null;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

const displayName = (cls?: ClassI | null) =>
  cls ? classTranslations[cls.name] || classTranslationsEng[cls.name] || cls.name : "Клас";

const ClassOptionalFeaturesForm = ({ selectedClass, formId, onNextDisabledChange }: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(classOptionalFeaturesSchema, (data) => {
    updateFormData({ classOptionalFeatureSelections: data.classOptionalFeatureSelections });
    nextStep();
  });

  const decisions = form.watch("classOptionalFeatureSelections") || {};
  const selectedChoiceIds = useMemo(() => {
    const selections = (formData.classChoiceSelections as Record<string, number>) || {};
    return Object.values(selections)
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));
  }, [formData.classChoiceSelections]);

  const levelOneOptional = useMemo(
    () => (selectedClass?.classOptionalFeatures || []).filter((item) => (item.grantedOnLevels || []).includes(1)),
    [selectedClass]
  );

  const visibleOptional = useMemo(
    () =>
      levelOneOptional
        .filter((item) => {
          const deps = (item as any).appearsOnlyIfChoicesTaken || [];
          if (!deps.length) return true;
          return deps.some((choice: any) => selectedChoiceIds.includes(choice.choiceOptionId));
        })
        .filter((item) => Boolean(item.optionalFeatureId)),
    [levelOneOptional, selectedChoiceIds]
  );

  useEffect(() => {
    if (!selectedClass) {
      onNextDisabledChange?.(true);
      return;
    }
    if (!visibleOptional.length) {
      onNextDisabledChange?.(false);
      return;
    }
    const incomplete = visibleOptional.some(
      (item) => decisions[item.optionalFeatureId?.toString() || ""] === undefined
    );
    onNextDisabledChange?.(incomplete);
  }, [selectedClass, visibleOptional, decisions, onNextDisabledChange]);

  const setDecision = (id: number, take: boolean) => {
    const next = { ...(decisions || {}), [id]: take };
    form.setValue("classOptionalFeatureSelections", next, { shouldDirty: true });
  };

  if (!selectedClass) {
    return (
      <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
        Спершу оберіть клас.
      </Card>
    );
  }

  if (!visibleOptional.length) {
    return (
      <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
        На 1 рівні {displayName(selectedClass)} не пропонує додаткових рис. Можна продовжувати.
      </Card>
    );
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-indigo-200">Рівень 1</p>
        <h2 className="text-xl font-semibold text-white">Додаткові риси класу</h2>
        <p className="text-sm text-slate-400">
          Оберіть, чи берете запропоновані Optional Class Features. Можна відмовитися, якщо вони не пасують.
        </p>
      </div>

      <div className="space-y-3">
        {visibleOptional.map((item) => {
          if (!item.optionalFeatureId) return null;

          const key = item.optionalFeatureId?.toString() || "";
          const accepted = decisions[key];
          const title = item.title || item.feature?.name || "Додаткова риса";
          const description = item.feature?.description || "Деталі відсутні.";
          const replaces =
            item.replacesFeatures?.map((rep) => rep.replacedFeature?.name).filter(Boolean).join(", ") || "";

          return (
            <Card
              key={key}
              className={clsx(
                "border border-slate-800/80 bg-slate-900/70 shadow-inner shadow-indigo-500/5",
                accepted === true && "border-emerald-400/70 bg-emerald-500/5",
                accepted === false && "opacity-90"
              )}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    {replaces ? (
                      <p className="text-xs text-slate-400">Замінює: {replaces}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="border-slate-700 bg-slate-800/60 text-slate-200">
                    Рівень 1
                  </Badge>
                </div>

                <div className="space-y-1.5 rounded-lg border border-slate-800/70 bg-slate-950/40 p-3">
                  <InfoSectionTitle>Опис</InfoSectionTitle>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">{description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={accepted === true ? "secondary" : "outline"}
                    className={clsx(
                      "border-slate-700",
                      accepted === true
                        ? "bg-indigo-500/20 text-indigo-50"
                        : "bg-slate-900/60 text-slate-200 hover:text-white"
                    )}
                    onClick={() => setDecision(item.optionalFeatureId!, true)}
                  >
                    Взяти
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={accepted === false ? "secondary" : "outline"}
                    className={clsx(
                      "border-slate-700",
                      accepted === false
                        ? "bg-rose-500/20 text-rose-50"
                        : "bg-slate-900/60 text-slate-200 hover:text-white"
                    )}
                    onClick={() => setDecision(item.optionalFeatureId!, false)}
                  >
                    Пропустити
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </form>
  );
};

export default ClassOptionalFeaturesForm;
