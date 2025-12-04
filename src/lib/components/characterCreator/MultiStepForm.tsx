"use client";

import React, { useEffect, useMemo, useState } from "react";
import type {Background, Weapon} from "@prisma/client"
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

const STEPS = [
  {id: 1, name: 'Раса', component: 'races'},
  {id: 2, name: 'Клас', component: 'class'},
  {id: 3, name: 'Передісторія', component: 'background'},
  {id: 4, name: 'Стати', component: 'asi'},
  {id: 5, name: 'Навички', component: 'skills'},
  {id: 6, name: 'Спорядження', component: 'equipment'},
  {id: 7, name: "Ім'я", component: 'name'},
] as const

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
  const {currentStep, prevStep, resetForm, formData, prevRaceId, setPrevRaceId, setCurrentStep } = usePersFormStore()
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(false);

  const handleFinalSubmit = async () => {

  }

  const race = useMemo(() => races.find(r => r.raceId === formData.raceId) as RaceI, [races, formData.raceId])
  const cls = useMemo(() => classes.find(c => c.classId === formData.classId) as ClassI, [classes, formData.classId])
  const bg = useMemo(() => backgrounds.find(b => b.backgroundId === formData.backgroundId) as BackgroundI, [backgrounds, formData.backgroundId])

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <RacesForm
          races={races}
          formId={activeFormId}
          onNextDisabledChange={setNextDisabled}
        />
      case 2:
        return <ClassesForm
          classes={classes}
          formId={activeFormId}
          onNextDisabledChange={setNextDisabled}
        />
      case 3:
        return <BackgroundsForm
          backgrounds={backgrounds}
          formId={activeFormId}
          onNextDisabledChange={setNextDisabled}
        />
      case 4:
        if (!race || !cls) {
          return (
            <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
              Спершу оберіть расу та клас.
            </Card>
          );
        }
        return <ASIForm
                  race={race}
                  selectedClass={cls}
                  prevRaceId={prevRaceId} setPrevRaceId={setPrevRaceId}
                  formId={activeFormId}
                  onNextDisabledChange={setNextDisabled}
        />
      case 5:
        if (!race || !cls || !bg) {
          return (
            <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
              Спершу завершіть расу, клас та передісторію.
            </Card>
          );
        }
        return <SkillsForm
            race={race}
            selectedClass={cls}
            background={bg}
            formId={activeFormId}
            onNextDisabledChange={setNextDisabled}
          />
      case 6:
        if (!race || !cls) {
          return (
            <Card className="border border-slate-800/70 bg-slate-900/70 p-4 text-center text-slate-200">
              Спершу заповніть попередні кроки.
            </Card>
          );
        }
        return <EquipmentForm
          weapons={weapons}
          selectedClass={cls}
          race={race}
          formId={activeFormId}
          onNextDisabledChange={setNextDisabled}
        />
      case 7:
        return (
          <NameForm
            formId={activeFormId}
            race={race}
            selectedClass={cls}
            background={bg}
          />
        )
      // case 7:
      //   return <NameForm onFinalSubmit={handleFinalSubmit}/>
      default:
        return null
    }
  }

  const progress = Math.round((currentStep / STEPS.length) * 100);
  const activeFormId = `character-step-form-${currentStep}`;

  useEffect(() => {
    setNextDisabled(false);
  }, [currentStep]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 pb-20 md:px-0">
      <CharacterCreateHeader
        onReset={resetForm}
        onOpenAuth={() => setAuthDialogOpen(true)}
      />

      <Card className="border border-slate-800/70 bg-slate-950/70 shadow-2xl">
        <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr,300px] md:p-6">
          <div className="space-y-4 rounded-xl border border-slate-800/70 bg-slate-900/60 p-3 shadow-inner md:p-5">
            {renderStep()}
          </div>

          <aside className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-inner">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span className="font-medium text-slate-200">Ваш прогрес</span>
              <Badge variant="outline" className="border-slate-800/80 text-slate-300">
                {progress}% готово
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              {STEPS.map((step) => {
                const isDone = step.id < currentStep;
                const isActive = step.id === currentStep;

                return (
                  <div
                    key={step.id}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left",
                      isActive
                        ? "border-indigo-400/60 bg-indigo-500/10 text-white"
                        : "border-slate-800/80 bg-slate-900/60 text-slate-300"
                    )}
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        Крок {step.id}
                      </p>
                      <p className="text-sm font-semibold">{step.name}</p>
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

            <div className="mt-5 h-2 rounded-full bg-slate-800/80">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </aside>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 left-0 right-0 z-30 w-full max-w-6xl px-1 pb-2">
        <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/90 px-3 py-3 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Badge variant="secondary" className="bg-white/5 text-white">
              Крок {currentStep} / {STEPS.length}
            </Badge>
            <span className="hidden text-slate-400 sm:inline">Прогрес {progress}%</span>
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="border border-slate-800/70 text-slate-200 hover:bg-slate-800"
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
              className="bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 text-white shadow-lg shadow-indigo-500/20"
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
