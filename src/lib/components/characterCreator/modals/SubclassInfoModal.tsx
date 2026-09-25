"use client";

import {
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  formatLanguages,
  formatToolProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import {
  sourceTranslations,
} from "@/lib/refs/translation";
import { Badge } from "@/components/ui/badge";

import { ReactNode } from "react";
import { translateSubclassName } from "@/lib/refs/subclass-name";

interface Props {
  subclass: any;
  triggerClassName?: string;
  trigger?: ReactNode;
}

export const SubclassInfoModal = ({
  subclass,
  triggerClassName,
  trigger,
}: Props) => {
  const name = translateSubclassName(subclass.name);
  const source = subclass.legacySource ?? subclass.source;
  const rawFeatures = subclass.features || [];
  const featureList = [...rawFeatures].sort((a: any, b: any) => {
    const lvlA = a.levelGranted ?? 0;
    const lvlB = b.levelGranted ?? 0;
    if (lvlA !== lvlB) return lvlA - lvlB;

    const idA = a.subclassFeatureId ?? a.feature?.featureId ?? 0;
    const idB = b.subclassFeatureId ?? b.feature?.featureId ?? 0;
    return idA - idB;
  });

  return (
    <InfoDialog
      title={name}
      triggerLabel={`Показати деталі ${name}`}
      triggerClassName={triggerClassName}
      trigger={trigger}
    >
      <InfoGrid>
        <InfoPill
          label="Джерело"
          value={
            sourceTranslations[source as keyof typeof sourceTranslations] ??
            source
          }
        />
        {subclass.legacySource && (
          <p className="col-span-full text-xs text-slate-400">
            Підклас зі старої книги. Текст рис — з книги 2014: риси, що там на 1-му чи 2-му рівні, ви
            отримуєте на 3-му, як показано нижче.
          </p>
        )}
        <InfoPill
          label="Основна характеристика"
          value={translateValue(subclass.primaryCastingStat)}
        />
        {subclass.spellcastingType && subclass.spellcastingType !== "NONE" && (
          <InfoPill
            label="Тип заклинань"
            value={translateValue(subclass.spellcastingType)}
          />
        )}
        <InfoPill
          label="Мови"
          value={formatLanguages(
            subclass.languages,
            subclass.languagesToChooseCount,
          )}
        />
        <InfoPill
          label="Інструменти"
          value={formatToolProficiencies(
            subclass.toolProficiencies,
            subclass.toolToChooseCount,
          )}
        />
        <div className="col-span-full">
          {subclass.description ? (
            <FormattedDescription
              content={subclass.description}
              className="text-sm text-slate-300"
            />
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
                <p className="text-sm font-semibold text-white">
                  {f.feature.name}
                </p>
                <Badge
                  variant="outline"
                  className="border-white/15 bg-white/5 text-[10px] text-slate-300"
                >
                  Рів. {f.levelGranted ?? "—"}
                </Badge>
              </div>
              <FormattedDescription
                content={f.feature.description}
                className="text-sm leading-relaxed text-slate-200/90"
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">
            Для цього підкласу ще немає опису рис.
          </p>
        )}
      </div>
    </InfoDialog>
  );
};
