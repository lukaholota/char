"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { subclassSchema } from "@/lib/zod/schemas/persCreateSchema";
import { ClassI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import clsx from "clsx";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { InfoDialog, InfoGrid, InfoPill, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
// import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { sourceTranslations, subclassTranslations, subclassTranslationsEng } from "@/lib/refs/translation";
import {
  formatLanguages,
  formatToolProficiencies,
  prettifyEnum,
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

  const SubclassInfoModal = ({ subclass }: { subclass: any }) => {
    const name = subclassTranslations[subclass.name] ?? subclass.name;
    const rawFeatures = subclass.features || [];
    const featureList = [...rawFeatures].sort(
      (a: any, b: any) => (a.levelUnlock || 0) - (b.levelUnlock || 0)
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
             {subclass.description ? (
               <FormattedDescription content={subclass.description} className="text-sm text-slate-300" />
             ) : null}
          </div>
        </InfoGrid>

        <div className="space-y-2">
          <InfoSectionTitle>Риси підкласу</InfoSectionTitle>
          {featureList.length ? (
            featureList.map((f: any) => (
              <div
                key={f.feature.featureId}
                className="glass-panel border-gradient-rpg rounded-lg px-3 py-2.5"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-white">{f.feature.name}</p>
                  <Badge variant="outline" className="border-white/15 bg-white/5 text-[10px] text-slate-300">
                    {(() => {
                      const lvl = f.levelUnlock ?? f.levelGranted;
                      return `Рів. ${lvl ?? "—"}`;
                    })()}
                  </Badge>
                </div>
                <FormattedDescription
                  content={f.feature.description}
                  className="text-sm leading-relaxed text-slate-200/90"
                />
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
