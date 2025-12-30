"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { subclassSchema } from "@/lib/zod/schemas/persCreateSchema";
import { ClassI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import clsx from "clsx";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";
import { sourceTranslations, subclassTranslations, subclassTranslationsEng } from "@/lib/refs/translation";
import {
  formatLanguages,
  formatToolProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

interface Props {
  cls: ClassI;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const SubclassForm = ({ cls, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(subclassSchema, (data) => {
    updateFormData({ 
      subclassId: data.subclassId,
      subclassChoiceSelections: data.subclassChoiceSelections 
    });
    nextStep();
  });
  
  const chosenSubclassId = form.watch("subclassId");

  useEffect(() => {
    if (!chosenSubclassId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenSubclassId]);

  const subclasses = cls.subclasses || [];

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть підклас
        </h2>
        <p className="text-sm text-slate-400">Для класу {translateValue(cls.name)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {subclasses.map((sc) => {
          const name = subclassTranslations[sc.name] ?? sc.name;
          const engName = subclassTranslationsEng[sc.name] ?? sc.name;
          
          return (
          <Card
            key={sc.subclassId}
            className={clsx(
              "glass-card cursor-pointer transition-all duration-200",
              sc.subclassId === chosenSubclassId && "glass-active"
            )}
            onClick={(e) => {
              if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
              if (sc.subclassId === chosenSubclassId) return;
              form.setValue("subclassId", sc.subclassId, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
              form.setValue("subclassChoiceSelections", {}, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
              updateFormData({ subclassId: sc.subclassId, subclassChoiceSelections: {} });
            }}
          >
            <CardContent className="relative flex items-center justify-between p-4">
              <SubclassInfoModal subclass={sc} />
              <div>
                <div className="text-lg font-semibold text-white">{name}</div>
                <div className="text-xs text-slate-400">{engName}</div>
              </div>
              {/* <SourceBadge code={sc.source} active={sc.subclassId === chosenSubclassId} /> */}
            </CardContent>
          </Card>
        )})}
      </div>
      <input
        type="hidden"
        {...form.register("subclassId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined || value === null) return undefined;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : undefined;
          },
        })}
      />
    </form>
  );
};

export default SubclassForm;
