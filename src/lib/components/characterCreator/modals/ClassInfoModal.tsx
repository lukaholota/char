"use client";

import { ClassI } from "@/lib/types/model-types";
import {
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  formatAbilityList,
  formatArmorProficiencies,
  formatLanguages,
  formatMulticlassReqs,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { classTranslations, attributesUkrShort } from "@/lib/refs/translation";

import { ReactNode } from "react";

interface Props {
  cls: ClassI;
  triggerClassName?: string;
  trigger?: ReactNode;
}

export const ClassInfoModal = ({ cls, triggerClassName, trigger }: Props) => {
  const features = [...(cls.features || [])].sort((a, b) => {
    const lvlA = a.levelGranted ?? 0;
    const lvlB = b.levelGranted ?? 0;
    if (lvlA !== lvlB) return lvlA - lvlB;
    return (a.classFeatureId || 0) - (b.classFeatureId || 0);
  });

  const title = classTranslations[cls.name as keyof typeof classTranslations] || cls.name;

  return (
    <InfoDialog
      title={title}
      triggerLabel={`Показати деталі ${title}`}
      triggerClassName={triggerClassName}
      trigger={trigger}
    >
      <InfoGrid>
        <InfoPill label="Кістка хітів" value={`d${cls.hitDie}`} />
        <InfoPill label="Чаклунство" value={translateValue(cls.spellcastingType)} />
        <InfoPill label="Підклас з рівня" value={`Рівень ${cls.subclassLevel}`} />
        <InfoPill label="Рятунки" value={formatAbilityList(cls.savingThrows)} />
        <InfoPill label="Навички" value={formatSkillProficiencies(cls.skillProficiencies)} />
        <InfoPill label="Інструменти" value={formatToolProficiencies(cls.toolProficiencies, cls.toolToChooseCount)} />
        <InfoPill label="Зброя" value={formatWeaponProficiencies(cls.weaponProficiencies)} />
        <InfoPill label="Броня" value={formatArmorProficiencies(cls.armorProficiencies)} />
        <InfoPill label="Мови" value={formatLanguages(cls.languages, cls.languagesToChooseCount)} />
        <InfoPill label="Мультиклас" value={formatMulticlassReqs(cls.multiclassReqs)} />
        {cls.primaryCastingStat && (
          <InfoPill label="Ключова характеристика" value={attributesUkrShort[cls.primaryCastingStat as keyof typeof attributesUkrShort]} />
        )}
      </InfoGrid>

      <div className="space-y-4">
        {Array.from(new Set(features.map(f => f.levelGranted))).sort((a, b) => (a || 0) - (b || 0)).map(lvl => (
          <div key={lvl} className="space-y-2">
            <InfoSectionTitle>Вміння {lvl}-го рівня</InfoSectionTitle>
            <div className="space-y-2">
              {features.filter(f => f.levelGranted === lvl).map((f: any) => (
                <div key={f.classFeatureId} className="glass-panel border-gradient-rpg rounded-lg px-3 py-2.5">
                  <p className="font-bold text-slate-200">{f.feature.name}</p>
                  <FormattedDescription content={f.feature.description} className="text-sm text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </InfoDialog>
  );
};
