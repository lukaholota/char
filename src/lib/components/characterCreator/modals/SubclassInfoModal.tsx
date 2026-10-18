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
import type { EntityRef } from "@/lib/optimization/types";
import type { RpgbotPlacement } from "@/lib/monitoring/rpgbot-analytics-model";
import { FeatureAnalysis } from "@/components/optimization/FeatureAnalysis";
import { SubclassAnalysisProvider } from "@/components/optimization/SubclassAnalysisContext";
import { SubclassAnalysis } from "@/components/optimization/SubclassAnalysis";
import { BranchCover } from "@/components/catalogs/reading/BranchCover";
import { getSubclassImagePath } from "@/lib/assets/image-manifest";
import { translateSubclassName } from "@/lib/refs/subclass-name";
import { buildClassCardHref, findFeatureKey } from "@/lib/catalogs/reading-target";
import { CatalogCardContent } from "@/components/optimization/CatalogCardContent";

interface Props {
  analysisEntity?: EntityRef;
  analysisPlacement?: RpgbotPlacement;
  subclass: any;
  triggerClassName?: string;
  trigger?: ReactNode;
}

export const SubclassInfoModal = ({
  subclass,
  triggerClassName,
  trigger,
  analysisEntity,
  analysisPlacement = "creator",
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

  const cardHref = buildClassCardHref(subclass.ruleset, subclass.classId, subclass.subclassId);
  const body = (
      <SubclassAnalysisProvider entity={analysisEntity} placement={analysisPlacement}>
      <BranchCover src={getSubclassImagePath(subclass.name)} alt={name} sizes="(min-width: 640px) 560px, 100vw" />
      {analysisEntity ? <SubclassAnalysis entity={analysisEntity} placement={analysisPlacement} /> : null}
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
                <div className="flex shrink-0 items-center gap-2">
                  <FeatureAnalysis featureKey={findFeatureKey({ engName: f.feature.engName, level: f.levelGranted ?? 0 })} name={f.feature.name} level={f.levelGranted ?? 0} />
                  <Badge
                    variant="outline"
                    className="border-white/15 bg-white/5 text-[10px] text-slate-300"
                  >
                    Рів. {f.levelGranted ?? "—"}
                  </Badge>
                </div>
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
      </SubclassAnalysisProvider>
  );

  return (
    <InfoDialog
      title={name}
      triggerLabel={`Показати деталі ${name}`}
      triggerClassName={triggerClassName}
      trigger={trigger}
      renderContent={cardHref ? (close) => <CatalogCardContent href={cardHref} title={name} onClose={close} fallback={body} /> : undefined}
    >
      {body}
    </InfoDialog>
  );
};
