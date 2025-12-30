"use client";

import { Feat } from "@prisma/client";
import { InfoDialog, InfoGrid, InfoPill } from "@/lib/components/characterCreator/EntityInfoDialog";
import { sourceTranslations, featTranslations } from "@/lib/refs/translation";
import {
  formatASI,
  formatLanguages,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  formatArmorProficiencies,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

import { ReactNode } from "react";

interface Props {
  feat: Feat;
  triggerClassName?: string;
  trigger?: ReactNode;
}

export const FeatInfoModal = ({ feat, triggerClassName, trigger }: Props) => {
  const name = featTranslations[feat.name] ?? feat.name;
  return (
    <InfoDialog
      title={name}
      triggerLabel={`Показати деталі ${name}`}
      triggerClassName={triggerClassName}
      trigger={trigger}
    >
      <InfoGrid>
        <InfoPill label="Джерело" value={sourceTranslations[feat.source] ?? feat.source} />
        <InfoPill label="Бонуси характеристик" value={formatASI(feat.grantedASI)} />
        <InfoPill
          label="Навички"
          value={formatSkillProficiencies(feat.grantedSkills as any)}
        />
         <InfoPill
          label="Мови"
          value={formatLanguages(feat.grantedLanguages, feat.grantedLanguageCount)}
        />
        <InfoPill
          label="Інструменти"
          value={formatToolProficiencies(feat.grantedToolProficiencies as any)}
        />
         <InfoPill
          label="Зброя"
          value={formatWeaponProficiencies(feat.grantedWeaponProficiencies as any)}
        />
         <InfoPill
          label="Обладунки"
          value={formatArmorProficiencies(feat.grantedArmorProficiencies)}
        />
        <div className="col-span-full border-t border-white/10 pt-4 mt-2">
           <FormattedDescription content={feat.description} className="text-sm text-slate-300 leading-relaxed" />
        </div>
      </InfoGrid>
    </InfoDialog>
  );
};
