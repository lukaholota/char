"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { raceVariantSchema } from "@/lib/zod/schemas/persCreateSchema";
import { RaceI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

interface Props {
  race: RaceI;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const RaceVariantsForm = ({ race, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(raceVariantSchema, (data) => {
    updateFormData({ raceVariantId: data.raceVariantId ?? null });
    nextStep();
  });
  
  const chosenVariantId = form.watch("raceVariantId");

  useEffect(() => {
    // Variant selection is optional — user can continue without choosing.
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange]);

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
          {(variant.overridesRaceSpeed != null || variant.overridesFlightSpeed != null) ? (
            <InfoPill
              label="Швидкості"
              value={formatSpeeds({
                speed: variant.overridesRaceSpeed,
                flightSpeed: variant.overridesFlightSpeed,
              })}
            />
          ) : null}
          <InfoPill label="Бонуси характеристик" value={formatASI(variant.overridesRaceASI)} />
          <div className="col-span-full">
             {variant.description ? (
               <FormattedDescription content={variant.description} className="text-sm text-slate-300" />
             ) : null}
          </div>
        </InfoGrid>

        <div className="space-y-2">
          <InfoSectionTitle>Риси</InfoSectionTitle>
          {traitList.length ? (
            traitList.map((trait: any) => (
              <div
                key={trait.raceTraitId || trait.feature.featureId}
                className="glass-panel border-gradient-rpg rounded-lg px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-white">{trait.feature.name}</p>
                <FormattedDescription
                  content={trait.feature.description}
                  className="text-sm leading-relaxed text-slate-200/90"
                />
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
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Варіант раси (необовʼязково)
        </h2>
        <p className="text-sm text-slate-400">Для раси {translateValue(race.name)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {variants.map((rv) => {
          const name = variantTranslations[rv.name] ?? rv.name;
          const engName = variantTranslationsEng[rv.name] ?? rv.name;
          
          return (
          <Card
            key={rv.raceVariantId}
            className={clsx(
              "glass-card cursor-pointer transition-all duration-200",
              rv.raceVariantId === chosenVariantId && "glass-active"
            )}
            onClick={(e) => {
              if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
              form.setValue("raceVariantId", rv.raceVariantId);
            }}
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

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/7"
          onClick={() => {
            form.setValue("raceVariantId", undefined);
            updateFormData({ raceVariantId: null });
            nextStep();
          }}
        >
          Пропустити
        </Button>
      </div>

      <input
        type="hidden"
        {...form.register("raceVariantId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined || value === null) return null;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : null;
          },
        })}
      />
    </form>
  );
};

export default RaceVariantsForm;
