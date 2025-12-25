"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { raceVariantSchema } from "@/lib/zod/schemas/persCreateSchema";
import { RaceI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/lib/components/ui/card";
import clsx from "clsx";
import { useEffect } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { InfoDialog, InfoGrid, InfoPill, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { sourceTranslations, variantTranslations, variantTranslationsEng } from "@/lib/refs/translation";
import {
  formatASI,
  // formatRaceAC,
  formatSpeeds,
} from "@/lib/components/characterCreator/infoUtils";

interface Props {
  race: RaceI;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const RaceVariantsForm = ({ race, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(raceVariantSchema, (data) => {
    updateFormData({ raceVariantId: data.raceVariantId });
    nextStep();
  });
  
  const chosenVariantId = form.watch("raceVariantId");

  useEffect(() => {
    if (!chosenVariantId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenVariantId]);

  const variants = race.raceVariants || [];

  const VariantInfoModal = ({ variant }: { variant: any }) => {
    const name = variantTranslations[variant.name] ?? variant.name;
    const rawTraits = variant.traits || [];
    const traitList = [...rawTraits].sort(
      (a: any, b: any) => (a.raceTraitId || 0) - (b.raceTraitId || 0)
    );

    return (
      <InfoDialog
        title={name}
        triggerLabel={`Показати деталі ${name}`}
      >
        <InfoGrid>
          <InfoPill label="Джерело" value={sourceTranslations[variant.source] ?? variant.source} />
          <InfoPill label="Швидкості" value={formatSpeeds({
            speed: variant.overridesRaceSpeed,
            flightSpeed: variant.overridesFlightSpeed
          })} />
          <InfoPill label="Бонуси характеристик" value={formatASI(variant.overridesRaceASI)} />
          <div className="col-span-full">
             <p className="text-sm text-slate-300">{variant.description}</p>
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
            <p className="text-sm text-slate-400">Для цього варіанту ще немає опису рис.</p>
          )}
        </div>
      </InfoDialog>
    );
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Оберіть варіант раси</h2>
        <p className="text-sm text-slate-400">Для раси {race.name}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {variants.map((rv) => {
          const name = variantTranslations[rv.name] ?? rv.name;
          const engName = variantTranslationsEng[rv.name] ?? rv.name;
          
          return (
          <Card
            key={rv.raceVariantId}
            className={clsx(
              "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
              rv.raceVariantId === chosenVariantId &&
                "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
            )}
            onClick={() => form.setValue("raceVariantId", rv.raceVariantId)}
          >
            <CardContent className="relative flex items-center justify-between p-4">
              <VariantInfoModal variant={rv} />
              <div>
                <div className="text-lg font-semibold text-white">{name}</div>
                <div className="text-xs text-slate-400">{engName}</div>
              </div>
              <SourceBadge code={rv.source} active={rv.raceVariantId === chosenVariantId} />
            </CardContent>
          </Card>
        )})}
      </div>
      <input type="hidden" {...form.register("raceVariantId", { valueAsNumber: true })} />
    </form>
  );
};

export default RaceVariantsForm;
