"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Weapon } from "@prisma/client";
import RacesForm from "@/lib/components/characterCreator/RacesForm";
import {CharacterCreateHeader} from "@/lib/components/characterCreator/CharacterCreateHeader";
import {usePersFormStore} from "@/lib/stores/persFormStore";
import ClassesForm from "@/lib/components/characterCreator/ClassesForm";
import BackgroundsForm from "@/lib/components/characterCreator/BackgroundsForm";
import ASIForm from "@/lib/components/characterCreator/ASIForm";
import SkillsForm from "@/lib/components/characterCreator/SkillsForm";
import { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";
import EquipmentForm from "@/lib/components/characterCreator/EquipmentForm";
import { Badge } from "@/lib/components/ui/badge";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Button } from "@/lib/components/ui/Button";
import { Check, ChevronLeft, Circle } from "lucide-react";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import clsx from "clsx";
import NameForm from "@/lib/components/characterCreator/NameForm";
import ClassChoiceOptionsForm from "@/lib/components/characterCreator/ClassChoiceOptionsForm";
import ClassOptionalFeaturesForm from "@/lib/components/characterCreator/ClassOptionalFeaturesForm";

interface Props {
  races: RaceI[]
  classes: ClassI[],
  backgrounds: BackgroundI[],
  weapons: Weapon[],
}

export const MultiStepForm = (
  {
    races,
    classes,
    backgrounds,
    weapons,
  }: Props
) => {
  const {
    currentStep,
    prevStep,
    resetForm,
    formData,
    prevRaceId,
    setPrevRaceId,
    setCurrentStep,
    setTotalSteps,
  } = usePersFormStore()
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(false);

  const handleFinalSubmit = async () => {

  }

  const race = useMemo(() => races.find(r => r.raceId === formData.raceId) as RaceI, [races, formData.raceId])
  const cls = useMemo(() => classes.find(c => c.classId === formData.classId) as ClassI, [classes, formData.classId])
  const bg = useMemo(() => backgrounds.find(b => b.backgroundId === formData.backgroundId) as BackgroundI, [backgrounds, formData.backgroundId])
  const hasLevelOneChoices = useMemo(
    () => Boolean(cls?.classChoiceOptions?.some((opt) => (opt.levelsGranted || []).includes(1))),
    [cls]
  );
  const hasLevelOneOptionalFeatures = useMemo(
    () => Boolean(cls?.classOptionalFeatures?.some((opt) => (opt.grantedOnLevels || []).includes(1))),
    [cls]
  );

  const steps = useMemo(() => {
    const dynamicSteps: { id: string; name: string; component: string }[] = [
      { id: "race", name: "Раса", component: "races" },
      { id: "class", name: "Клас", component: "class" },
    ];

    if (hasLevelOneChoices) {
      dynamicSteps.push({ id: "classChoices", name: "Опції класу", component: "classChoices" });
    }

    if (hasLevelOneOptionalFeatures) {
      dynamicSteps.push({ id: "classOptional", name: "Додаткові риси", component: "classOptional" });
    }

    dynamicSteps.push(
      { id: "background", name: "Передісторія", component: "background" },
      { id: "asi", name: "Характеристики", component: "asi" },
      { id: "skills", name: "Навички", component: "skills" },
      { id: "equipment", name: "Спорядження", component: "equipment" },
      { id: "name", name: "Імʼя", component: "name" },
    );

    return dynamicSteps;
  }, [hasLevelOneChoices, hasLevelOneOptionalFeatures]);

  useEffect(() => {
    const total = steps.length;
    setTotalSteps(total);
    if (currentStep > total) {
      setCurrentStep(total);
    }
  }, [steps, currentStep, setCurrentStep, setTotalSteps]);

  const renderStep = () => {
    const activeComponent = steps[currentStep - 1]?.component;

    switch (activeComponent) {
      case "races":
        return (
          <RacesForm
            races={races}
            formId={activeFormId}
            onNextDisabledChange={setNextDisabled}
          />
        );
      case "class":
        return (
          <ClassesForm
            classes={classes}
            formId={activeFormId}
            onNextDisabledChange={setNextDisabled}
          />
        );
      case "classChoices":
        return (
          <ClassChoiceOptionsForm
            selectedClass={cls}
            formId={activeFormId}
            onNextDisabledChange={setNextDisabled}
          />
        );
      case "classOptional":
        return (
          <ClassOptionalFeaturesForm
            selectedClass={cls}
            formId={activeFormId}
            onNextDisabledChange={setNextDisabled}
          />
        );
      case "background":
        return (
          <BackgroundsForm
            backgrounds={backgrounds}
            formId={activeFormId}
            onNextDisabledChange={setNextDisabled}
          />
        );
      case "asi":
        if (!race || !cls) {
          return (
            <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
              Спершу оберіть расу та клас.
            </Card>
          );
        }
        return (
          <ASIForm
            race={race}
            selectedClass={cls}
            prevRaceId={prevRaceId}
            setPrevRaceId={setPrevRaceId}
            formId={activeFormId}
            onNextDisabledChange={setNextDisabled}
          />
        );
      case "skills":
        if (!race || !cls || !bg) {
          return (
            <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
              Спершу завершіть расу, клас та передісторію.
            </Card>
          );
        }
        return (
          <SkillsForm
            race={race}
            selectedClass={cls}
            background={bg}
            formId={activeFormId}
            onNextDisabledChange={setNextDisabled}
          />
        );
      case "equipment":
        if (!race || !cls) {
          return (
            <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
              Спершу заповніть попередні кроки.
            </Card>
          );
        }
        return (
          <EquipmentForm
            weapons={weapons}
            selectedClass={cls}
            race={race}
            formId={activeFormId}
            onNextDisabledChange={setNextDisabled}
          />
        );
      case "name":
        return (
          <NameForm
            formId={activeFormId}
            race={race}
            selectedClass={cls}
            background={bg}
          />
        );
      default:
        return null;
    }
  }

  const progress = Math.round((currentStep / steps.length) * 100);
  const activeFormId = `character-step-form-${currentStep}`;

  useEffect(() => {
    setNextDisabled(false);
  }, [currentStep]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 pb-24 sm:px-4 md:gap-6 md:px-0 md:py-6">
      <CharacterCreateHeader
        onReset={resetForm}
        onOpenAuth={() => setAuthDialogOpen(true)}
      />

      <Card className="border border-slate-800/70 bg-slate-950/70 shadow-2xl">
        <CardContent className="grid gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-[1fr,300px] md:p-6">
          <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-3 shadow-inner sm:space-y-4 sm:p-4 md:p-5">
            {renderStep()}
          </div>

          <aside className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-3 shadow-inner sm:p-4">
          <div className="sticky top-14 sm:top-16">
            <div className="flex items-center justify-between text-xs text-slate-400 sm:text-sm">
                <span className="font-medium text-slate-200">Ваш прогрес</span>
                <Badge variant="outline" className="border-slate-800/80 text-slate-300 text-[11px] sm:text-xs">
                  {progress}% готово
                </Badge>
              </div>

              <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
                {steps.map((step, index) => {
                  const stepOrder = index + 1;
                  const isDone = stepOrder < currentStep;
                  const isActive = stepOrder === currentStep;

                  return (
                    <div
                      key={step.id}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left sm:px-3",
                        isActive
                          ? "border-indigo-400/60 bg-indigo-500/10 text-white"
                          : "border-slate-800/80 bg-slate-900/60 text-slate-300"
                      )}
                    >
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">
                          Крок {stepOrder}
                        </p>
                        <p className="text-xs font-semibold sm:text-sm">{step.name}</p>
                      </div>
                      {isDone ? (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
                          <Check className="h-4 w-4" />
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`border-slate-800/80 ${
                            isActive ? "text-indigo-200" : "text-slate-400"
                          }`}
                        >
                          <Circle className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 h-1.5 sm:mt-5 sm:h-2 rounded-full bg-slate-800/80">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all sm:h-2"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </aside>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 left-0 right-0 z-30 w-full px-2 pb-3 sm:px-3 md:px-0">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/90 px-2.5 py-2.5 shadow-xl backdrop-blur sm:rounded-2xl sm:px-3 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 sm:gap-3 sm:text-sm">
            <Badge variant="secondary" className="bg-white/5 text-white text-[11px] sm:text-xs">
              Крок {currentStep} / {steps.length}
            </Badge>
            <span className="hidden text-slate-400 sm:inline">Прогрес {progress}%</span>
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="border border-slate-800/70 text-sm text-slate-200 hover:bg-slate-800 sm:text-base"
                onClick={prevStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
            )}
            <Button
              type="submit"
              form={activeFormId}
              disabled={nextDisabled}
              size="sm"
              className="bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 text-sm text-white shadow-lg shadow-indigo-500/20 sm:text-base"
            >
              Далі →
            </Button>
          </div>
        </div>
      </div>

      <GoogleAuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  )
}

export default MultiStepForm
