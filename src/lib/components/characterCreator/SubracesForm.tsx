"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { subraceSchema } from "@/lib/zod/schemas/persCreateSchema";
import { RaceI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/lib/components/ui/card";
import clsx from "clsx";
import { useEffect } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { InfoDialog, InfoGrid, InfoPill, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { sourceTranslations, subraceTranslations, subraceTranslationsEng } from "@/lib/refs/translation";
import {
  // formatArmorProficiencies,
  formatASI,
  formatLanguages,
  // formatList,
  // formatSkillProficiencies,
  formatSpeeds,
  formatToolProficiencies,
  // formatWeaponProficiencies,
} from "@/lib/components/characterCreator/infoUtils";

interface Props {
  race: RaceI;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const SubracesForm = ({ race, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(subraceSchema, (data) => {
    updateFormData({ subraceId: data.subraceId });
    nextStep();
  });
  
  const chosenSubraceId = form.watch("subraceId");

  useEffect(() => {
    if (!chosenSubraceId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenSubraceId]);

  const subraces = race.subraces || [];

  const SubraceInfoModal = ({ subrace }: { subrace: any }) => {
    const name = subraceTranslations[subrace.name] ?? subrace.name;
    const rawTraits = subrace.traits || [];
    const traitList = [...rawTraits].sort(
      (a: any, b: any) => (a.raceTraitId || 0) - (b.raceTraitId || 0)
    );

    return (
      <InfoDialog
        title={name}
        triggerLabel={`Показати деталі ${name}`}
      >
        <InfoGrid>
          <InfoPill label="Джерело" value={sourceTranslations[subrace.source] ?? subrace.source} />
          <InfoPill label="Швидкості" value={formatSpeeds(subrace)} />
          <InfoPill label="Бонуси характеристик" value={formatASI(subrace.additionalASI)} />
          <InfoPill
            label="Мови"
            value={formatLanguages(subrace.additionalLanguages, subrace.languagesToChooseCount)}
          />
          <InfoPill
            label="Інструменти"
            value={formatToolProficiencies(subrace.toolProficiencies)}
          />
          <div className="col-span-full">
             <p className="text-sm text-slate-300">{subrace.description}</p>
          </div>
        </InfoGrid>

        <div className="space-y-2">
          <InfoSectionTitle>Риси</InfoSectionTitle>
          {traitList.length ? (
            traitList.map((trait: any) => (
              <div
                key={trait.raceTraitId || trait.feature.featureId}
                className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
              >
                <p className="text-sm font-semibold text-white">{trait.feature.name}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                  {trait.feature.description}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Для цієї підраси ще немає опису рис.</p>
          )}
        </div>
      </InfoDialog>
    );
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Оберіть підрасу</h2>
        <p className="text-sm text-slate-400">Для раси {race.name}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {subraces.map((sr) => {
          const name = subraceTranslations[sr.name] ?? sr.name;
          const engName = subraceTranslationsEng[sr.name] ?? sr.name;
          
          return (
          <Card
            key={sr.subraceId}
            className={clsx(
              "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
              sr.subraceId === chosenSubraceId &&
                "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
            )}
            onClick={() => form.setValue("subraceId", sr.subraceId)}
          >
            <CardContent className="relative flex items-center justify-between p-4">
              <SubraceInfoModal subrace={sr} />
              <div>
                <div className="text-lg font-semibold text-white">{name}</div>
                <div className="text-xs text-slate-400">{engName}</div>
              </div>
              <SourceBadge code={sr.source} active={sr.subraceId === chosenSubraceId} />
            </CardContent>
          </Card>
        )})}
      </div>
      <input type="hidden" {...form.register("subraceId", { valueAsNumber: true })} />
    </form>
  );
};

export default SubracesForm;
