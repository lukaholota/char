"use client";

import { SpellcastingType } from "@prisma/client";
import { classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import clsx from "clsx";
import { useStepForm } from "@/hooks/useStepForm";
import { classSchema } from "@/lib/zod/schemas/persCreateSchema";
import { ClassI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { useEffect, useMemo } from "react";
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
  NONE: "No spellcasting",
  FULL: "Full caster",
  HALF: "Half caster",
  THIRD: "Third caster",
  PACT: "Pact magic",
};

export const ClassesForm = (
  {classes, formId, onNextDisabledChange}: Props
) => {
  const {form, onSubmit} = useStepForm(classSchema)

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
        subtitle={classTranslationsEng[cls.name]}
        triggerLabel={`Show details for ${classTranslationsEng[cls.name] ?? cls.name}`}
      >
        <InfoGrid>
          <InfoPill label="Hit die" value={`d${cls.hitDie}`} />
          <InfoPill
            label="Spellcasting"
            value={SPELLCASTING_LABELS[cls.spellcastingType] ?? "No data"}
          />
          <InfoPill label="Subclass at" value={`Level ${cls.subclassLevel}`} />
          <InfoPill label="Saving throws" value={formatAbilityList(cls.savingThrows)} />
          <InfoPill
            label="Skills"
            value={formatSkillProficiencies(cls.skillProficiencies)}
          />
          <InfoPill
            label="Tools"
            value={formatToolProficiencies(cls.toolProficiencies, cls.toolToChooseCount)}
          />
          <InfoPill
            label="Weapons"
            value={formatWeaponProficiencies(cls.weaponProficiencies)}
          />
          <InfoPill
            label="Armor"
            value={formatArmorProficiencies(cls.armorProficiencies)}
          />
          <InfoPill
            label="Languages"
            value={formatLanguages(cls.languages, cls.languagesToChooseCount)}
          />
          <InfoPill
            label="Multiclass"
            value={formatMulticlassReqs(cls.multiclassReqs)}
          />
          {cls.primaryCastingStat ? (
            <InfoPill
              label="Primary casting stat"
              value={prettifyEnum(cls.primaryCastingStat)}
            />
          ) : null}
        </InfoGrid>

        <div className="space-y-2">
          <InfoSectionTitle>Features</InfoSectionTitle>
          {features.length ? (
            features.map((feature) => (
              <div
                key={feature.classFeatureId || feature.feature.featureId}
                className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{feature.feature.name}</p>
                  <Badge
                    variant="outline"
                    className="border-slate-700 bg-slate-800/70 text-[11px] text-slate-200"
                  >
                    Lvl {feature.levelGranted}
                  </Badge>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                  {feature.feature.description}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No features found for this class.</p>
          )}
        </div>
      </InfoDialog>
    );
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Choose a class</h2>
        <p className="text-sm text-slate-400">Tap a card to select a class or open the ? to read its kit.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {
          sortedClasses.map(c =>  (
            <Card
              key={c.classId}
              className={clsx(
                "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                c.classId === chosenClassId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
              )}
              onClick={() => form.setValue('classId', c.classId)}
            >
              <CardContent className="relative flex items-center justify-between p-4">
                <ClassInfoModal cls={c} />
                <div>
                  <div className="text-lg font-semibold text-white">{classTranslations[c.name]}</div>
                  <div className="text-xs text-slate-400">
                    {classTranslationsEng[c.name]}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <input type="hidden" {...form.register('classId', { valueAsNumber: true })} />
    </form>
  )
};

export default ClassesForm;
