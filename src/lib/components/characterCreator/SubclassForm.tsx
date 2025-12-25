"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { subclassSchema } from "@/lib/zod/schemas/persCreateSchema";
import { ClassI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/lib/components/ui/card";
import clsx from "clsx";
import { useEffect } from "react";
import { Badge } from "@/lib/components/ui/badge";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { InfoDialog, InfoGrid, InfoPill, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
// import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { sourceTranslations, subclassTranslations, subclassTranslationsEng } from "@/lib/refs/translation";
import {
  formatLanguages,
  formatToolProficiencies,
  prettifyEnum,
} from "@/lib/components/characterCreator/infoUtils";

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

  const SubclassInfoModal = ({ subclass }: { subclass: any }) => {
    const name = subclassTranslations[subclass.name] ?? subclass.name;
    const rawFeatures = subclass.features || [];
    const featureList = [...rawFeatures].sort(
      (a: any, b: any) => (a.level || 0) - (b.level || 0)
    );

    return (
      <InfoDialog
        title={name}
        triggerLabel={`Показати деталі ${name}`}
      >
        <InfoGrid>
          <InfoPill label="Джерело" value={sourceTranslations[subclass.source] ?? subclass.source} />
          <InfoPill label="Основна характеристика" value={prettifyEnum(subclass.primaryCastingStat)} />
          <InfoPill label="Тип заклинань" value={prettifyEnum(subclass.spellcastingType)} />
          <InfoPill
            label="Мови"
            value={formatLanguages(subclass.languages, subclass.languagesToChooseCount)}
          />
          <InfoPill
            label="Інструменти"
            value={formatToolProficiencies(subclass.toolProficiencies, subclass.toolToChooseCount)}
          />
          <div className="col-span-full">
             <p className="text-sm text-slate-300">{subclass.description}</p>
          </div>
        </InfoGrid>

        <div className="space-y-2">
          <InfoSectionTitle>Риси підкласу</InfoSectionTitle>
          {featureList.length ? (
            featureList.map((f: any) => (
              <div
                key={f.feature.featureId}
                className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-white">{f.feature.name}</p>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                    Рівень {f.level}
                  </Badge>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                  {f.feature.description}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Для цього підкласу ще немає опису рис.</p>
          )}
        </div>
      </InfoDialog>
    );
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Оберіть підклас</h2>
        <p className="text-sm text-slate-400">Для класу {cls.name}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {subclasses.map((sc) => {
          const name = subclassTranslations[sc.name] ?? sc.name;
          const engName = subclassTranslationsEng[sc.name] ?? sc.name;
          
          return (
          <Card
            key={sc.subclassId}
            className={clsx(
              "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
              sc.subclassId === chosenSubclassId &&
                "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
            )}
            onClick={() => form.setValue("subclassId", sc.subclassId)}
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
      <input type="hidden" {...form.register("subclassId", { valueAsNumber: true })} />
    </form>
  );
};

export default SubclassForm;
