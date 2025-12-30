"use client";

import {
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  formatASI,
  formatSpeeds,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { sourceTranslations, variantTranslations } from "@/lib/refs/translation";

import { ReactNode } from "react";

interface Props {
  variant: any;
  triggerClassName?: string;
  trigger?: ReactNode;
}

export const RaceVariantInfoModal = ({ variant, triggerClassName, trigger }: Props) => {
  const name = variantTranslations[variant.name as keyof typeof variantTranslations] ?? String(variant.name);
  const rawTraits = (variant.traits || []) as any[];
  const traitList = [...rawTraits].sort((a, b) => {
    return (a.raceVariantTraitId || 0) - (b.raceVariantTraitId || 0);
  });

  return (
    <InfoDialog
      title={name}
      triggerLabel={`Показати деталі ${name}`}
      triggerClassName={triggerClassName}
      trigger={trigger}
    >
      <InfoGrid>
        <InfoPill label="Джерело" value={sourceTranslations[variant.source as keyof typeof sourceTranslations] ?? variant.source} />
        <InfoPill
          label="Швидкості"
          value={
            formatSpeeds({
              speed: variant.overridesRaceSpeed,
              flightSpeed: variant.overridesFlightSpeed,
            })
          }
        />
        <InfoPill label="Бонуси характеристик" value={formatASI(variant.overridesRaceASI)} />
        <div className="col-span-full">
          {variant.description ? <FormattedDescription content={variant.description} className="text-slate-200/90" /> : null}
        </div>
      </InfoGrid>

      <div className="space-y-2">
        <InfoSectionTitle>Риси</InfoSectionTitle>
        {traitList.length ? (
          traitList.map((trait, idx) => (
            <div
              key={trait.raceVariantTraitId ?? `feature:${trait.feature?.featureId ?? "unknown"}:${idx}`}
              className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
            >
              <p className="text-sm font-semibold text-white">{trait.feature?.name}</p>
              {trait.feature?.description ? (
                <div className="mt-1">
                  <FormattedDescription content={trait.feature.description} className="text-slate-200/90" />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">Для цього варіанту ще немає опису рис.</p>
        )}
      </div>
    </InfoDialog>
  );
};
