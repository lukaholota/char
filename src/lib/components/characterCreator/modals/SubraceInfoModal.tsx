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
  formatLanguages,
  formatToolProficiencies,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { sourceTranslations, subraceTranslations } from "@/lib/refs/translation";

import { ReactNode } from "react";

interface Props {
  subrace: any;
  triggerClassName?: string;
  trigger?: ReactNode;
}

export const SubraceInfoModal = ({ subrace, triggerClassName, trigger }: Props) => {
  const name = subraceTranslations[subrace.name as keyof typeof subraceTranslations] ?? subrace.name;
  const rawTraits = (subrace.traits || []) as any[];
  const traitList = [...rawTraits].sort((a, b) => {
    return (a.subraceTraitId || 0) - (b.subraceTraitId || 0);
  });

  return (
    <InfoDialog
      title={name}
      triggerLabel={`Показати деталі ${name}`}
      triggerClassName={triggerClassName}
      trigger={trigger}
    >
      <InfoGrid>
        <InfoPill label="Джерело" value={sourceTranslations[subrace.source as keyof typeof sourceTranslations] ?? subrace.source} />
        <InfoPill label="Швидкості" value={formatSpeeds(subrace)} />
        <InfoPill label="Бонуси характеристик" value={formatASI(subrace.additionalASI)} />
        <InfoPill label="Мови" value={formatLanguages(subrace.additionalLanguages, subrace.languagesToChooseCount)} />
        <InfoPill label="Інструменти" value={formatToolProficiencies(subrace.toolProficiencies)} />
      </InfoGrid>

      <div className="space-y-2">
        <InfoSectionTitle>Риси підраси</InfoSectionTitle>
        {traitList.length ? (
          traitList.map((trait, idx) => (
            <div
              key={trait.subraceTraitId ?? `feature:${trait.feature?.featureId ?? "unknown"}:${idx}`}
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
          <p className="text-sm text-slate-400">Для цієї підраси ще немає опису рис.</p>
        )}
      </div>
    </InfoDialog>
  );
};
