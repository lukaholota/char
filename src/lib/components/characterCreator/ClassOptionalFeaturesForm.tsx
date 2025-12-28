"use client";

import { useEffect, useMemo } from "react";
import { ClassI } from "@/lib/types/model-types";
import { useStepForm } from "@/hooks/useStepForm";
import { classOptionalFeaturesSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import { InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import clsx from "clsx";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

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
      <Card className="p-4 text-center text-slate-200">
        Спершу оберіть клас.
      </Card>
    );
  }

  if (!visibleOptional.length) {
    return (
      <Card className="p-4 text-center text-slate-200">
        На 1 рівні {displayName(selectedClass)} не пропонує додаткових рис. Можна продовжувати.
      </Card>
    );
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-slate-300">Рівень 1</p>
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">Додаткові риси класу</h2>
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
                accepted === true && "border-gradient-rpg border-gradient-rpg-active glass-active",
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
                  <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                    Рівень 1
                  </Badge>
                </div>

                <div className="glass-panel border-gradient-rpg space-y-1.5 rounded-lg p-3">
                  <InfoSectionTitle>Опис</InfoSectionTitle>
                  <FormattedDescription
                    content={description}
                    className="text-sm leading-relaxed text-slate-200/90"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={clsx(
                      "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white",
                      accepted === true && "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100"
                    )}
                    onClick={() => setDecision(item.optionalFeatureId!, true)}
                  >
                    Взяти
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={clsx(
                      "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white",
                      accepted === false && "border-rose-400/40 bg-rose-500/10 text-rose-50"
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
