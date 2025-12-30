"use client";

import { RaceI } from "@/lib/types/model-types";
import {
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  formatArmorProficiencies,
  formatASI,
  formatList,
  formatLanguages,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  formatSpeeds,
  formatRaceAC,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { raceTranslations, sourceTranslations } from "@/lib/refs/translation";

import { ReactNode } from "react";

interface Props {
  race: RaceI;
  triggerClassName?: string;
  trigger?: ReactNode;
}

export const RaceInfoModal = ({ race, triggerClassName, trigger }: Props) => {
  const traitList = [...(race.traits || [])].sort((a, b) => {
    return (a.raceTraitId || 0) - (b.raceTraitId || 0);
  });

  const title = raceTranslations[race.name as keyof typeof raceTranslations] || race.name;

  return (
    <InfoDialog
      title={title}
      triggerLabel={`Показати деталі ${title}`}
      triggerClassName={triggerClassName}
      trigger={trigger}
    >
      <InfoGrid>
        <InfoPill label="Джерело" value={sourceTranslations[race.source as keyof typeof sourceTranslations] ?? race.source} />
        <InfoPill label="Розмір" value={formatList(race.size)} />
        <InfoPill label="Швидкості" value={formatSpeeds(race)} />
        <InfoPill label="Базовий КБ" value={formatRaceAC(race.ac)} />
        <InfoPill label="Бонуси характеристик" value={formatASI(race.ASI)} />
        <InfoPill label="Мови" value={formatLanguages(race.languages, race.languagesToChooseCount)} />
        <InfoPill label="Навички" value={formatSkillProficiencies(race.skillProficiencies)} />
        <InfoPill label="Інструменти" value={formatToolProficiencies(race.toolProficiencies, race.toolToChooseCount)} />
        <InfoPill label="Зброя" value={formatWeaponProficiencies(race.weaponProficiencies)} />
        <InfoPill label="Броня" value={formatArmorProficiencies(race.armorProficiencies)} />
      </InfoGrid>
      <div className="space-y-2">
        <InfoSectionTitle>Риси</InfoSectionTitle>
        {traitList.length ? (
          traitList.map((t: any) => (
            <div key={t.raceTraitId} className="space-y-1">
              <p className="font-bold text-slate-200">{t.feature.name}</p>
              <FormattedDescription content={t.feature.description} className="text-sm text-slate-400" />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">Для цієї раси ще немає опису рис.</p>
        )}
      </div>
    </InfoDialog>
  );
};
