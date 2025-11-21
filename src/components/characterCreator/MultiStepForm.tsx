"use client";

import React from "react";
import type {Armor, Background, EquipmentPack, Weapon} from "@prisma/client"
import RacesForm from "@/components/characterCreator/RacesForm";
import {CharacterCreateHeader} from "@/components/characterCreator/CharacterCreateHeader";
import {Button} from "@/components/ui/Button";
import {usePersFormStore} from "@/stores/persFormStore";
import clsx from "clsx";
import ClassesForm from "@/components/characterCreator/ClassesForm";
import BackgroundsForm from "@/components/characterCreator/BackgroundsForm";
import ASIForm from "@/components/characterCreator/ASIForm";
import SkillsForm from "@/components/characterCreator/SkillsForm";
import { BackgroundI, ClassI, RaceI } from "@/types/model-types";
import EquipmentForm from "@/components/characterCreator/EquipmentForm";

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
  armors: Armor[],
}

export const MultiStepForm = (
  {
    races,
    classes,
    backgrounds,
    weapons,
    armors,
  }: Props
) => {
  const {currentStep, prevStep, resetForm, formData, prevRaceId, setPrevRaceId } = usePersFormStore()



  const handleFinalSubmit = async () => {

  }

  const renderStep = () => {
    const race = races.find(r => r.raceId === formData.raceId) as RaceI
    const cls = classes.find(c => c.classId === formData.classId) as ClassI
    const bg = backgrounds.find(b => b.backgroundId === formData.backgroundId) as BackgroundI

    switch (currentStep) {
      case 1:
        return <RacesForm races={races}/>
      case 2:
        return <ClassesForm classes={classes}/>
      case 3:
        return <BackgroundsForm backgrounds={backgrounds}/>
      case 4:
        return <ASIForm
                  race={race}
                  selectedClass={cls}
                  prevRaceId={prevRaceId} setPrevRaceId={setPrevRaceId}
        />
      case 5:
        return <SkillsForm
            race={race}
            selectedClass={cls}
            background={bg}
          />
      case 6:
        return <EquipmentForm
          weapons={weapons}
          armors={armors}
          selectedClass={cls}
          race={race}
        />
      // case 7:
      //   return <NameForm onFinalSubmit={handleFinalSubmit}/>
      default:
        return null
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <CharacterCreateHeader/>

      <button onClick={() => resetForm()}>Ресет</button>

      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map(step => (
            <div key={step.id} className={clsx(
              "text-sm mr-1",
              step.id === currentStep && "font-bold text-violet-400",
              step.id < currentStep && "text-green-500",
              step.id > currentStep && "text-slate-600"
            )}>
              {`${step.name}`}
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full">
          <div
            className="bg-violet-600 h-2 rounded-full transition-all duration-300"
            style={{width: `${(currentStep / STEPS.length) * 100}`}}
          />
        </div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        {renderStep()}
      </div>

      <div className="flex justify-between mt-8">
        {currentStep > 1 && (
          <Button
            title="← Назад"
            onClick={prevStep}
            variant="secondary"
          />
        )}

        {/* Кнопка "Далі" рендериться всередині кожного степ-компонента
            як submit button, окрім останнього кроку */}
      </div>

    </div>
  )
}

export default MultiStepForm