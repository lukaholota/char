"use client";

import { SpellcastingType } from "@prisma/client";
import { classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import clsx from "clsx";
import { useStepForm } from "@/hooks/useStepForm";
import { classSchema } from "@/lib/zod/schemas/persCreateSchema";
import { ClassI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
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
  prettifyEnum,
} from "@/lib/components/characterCreator/infoUtils";

interface Props {
  classes: ClassI[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

const SPELLCASTING_LABELS: Record<SpellcastingType, string> = {
  NONE: "Без чаклунства",
  FULL: "Повний кастер",
  HALF: "Половинний кастер",
  THIRD: "Третинний кастер",
  PACT: "Магія пакту",
};

export const ClassesForm = (
  {classes, formId, onNextDisabledChange}: Props
) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const {form, onSubmit} = useStepForm(classSchema, (data) => {
    updateFormData({ classId: data.classId });
    nextStep();
  });

  const chosenClassId = form.watch('classId') || 0
  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => (a.sortOrder - b.sortOrder) || (a.classId - b.classId)),
    [classes]
  );

  useEffect(() => {
    if (!chosenClassId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenClassId]);

  const ClassInfoModal = ({ cls }: { cls: ClassI }) => {
    const features = [...(cls.features || [])].sort(
      (a, b) => (a.levelGranted || 0) - (b.levelGranted || 0)
    );

    return (
      <InfoDialog
        title={classTranslations[cls.name] || cls.name}
        triggerLabel={`Показати деталі ${classTranslations[cls.name] ?? cls.name}`}
      >
        <InfoGrid>
          <InfoPill label="Кістка хітів" value={`d${cls.hitDie}`} />
          <InfoPill
            label="Чаклунство"
            value={SPELLCASTING_LABELS[cls.spellcastingType] ?? "—"}
          />
          <InfoPill label="Підклас з рівня" value={`Рівень ${cls.subclassLevel}`} />
          <InfoPill label="Рятунки" value={formatAbilityList(cls.savingThrows)} />
          <InfoPill
            label="Навички"
            value={formatSkillProficiencies(cls.skillProficiencies)}
          />
          <InfoPill
            label="Інструменти"
            value={formatToolProficiencies(cls.toolProficiencies, cls.toolToChooseCount)}
          />
          <InfoPill
            label="Зброя"
            value={formatWeaponProficiencies(cls.weaponProficiencies)}
          />
          <InfoPill
            label="Броня"
            value={formatArmorProficiencies(cls.armorProficiencies)}
          />
          <InfoPill
            label="Мови"
            value={formatLanguages(cls.languages, cls.languagesToChooseCount)}
          />
          <InfoPill
            label="Мультіклас"
            value={formatMulticlassReqs(cls.multiclassReqs)}
          />
          {cls.primaryCastingStat ? (
            <InfoPill
              label="Ключова характеристика"
              value={prettifyEnum(cls.primaryCastingStat)}
            />
          ) : null}
        </InfoGrid>

        <div className="space-y-2">
          <InfoSectionTitle>Особливості</InfoSectionTitle>
          {features.length ? (
            features.map((feature) => (
              <div
                key={feature.classFeatureId || feature.feature.featureId}
                className="glass-panel border-gradient-rpg rounded-lg px-3 py-2.5"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{feature.feature.name}</p>
                  <Badge
                              variant="outline"
                              className="border-white/15 bg-white/5 text-[11px] text-slate-200"
                  >
                    Рів. {feature.levelGranted}
                  </Badge>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                  {feature.feature.description}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Наразі немає описаних умінь.</p>
          )}
        </div>
      </InfoDialog>
    );
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть клас
        </h2>
        <p className="text-sm text-slate-400">Натисніть картку, або відкрийте ? для деталей.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {
          sortedClasses.map(c =>  (
            <Card
              key={c.classId}
              className={clsx(
                "glass-card cursor-pointer transition-all duration-200",
                c.classId === chosenClassId && "glass-active"
              )}
              onClick={() => form.setValue('classId', c.classId)}
            >
                <CardContent className="relative flex items-center justify-between p-4">
                  <ClassInfoModal cls={c} />
                  <div>
                  <div className="text-lg font-semibold text-white">{classTranslations[c.name]}</div>
                  <div className="text-xs text-slate-400">{classTranslationsEng[c.name]}</div>
                  </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <input
        type="hidden"
        {...form.register("classId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined || value === null) return undefined;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : undefined;
          },
        })}
      />
    </form>
  )
};

export default ClassesForm;
