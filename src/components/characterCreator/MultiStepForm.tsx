"use client";

import React, { JSX, useState } from "react";
import type { Armor, Background, Class, EquipmentPack, Race, Weapon } from "@prisma/client"
import RacesForm from "@/components/characterCreator/RacesForm";
import { CharacterCreateHeader } from "@/components/characterCreator/CharacterCreateHeader";
import { Button } from "@/components/ui/Button";

const STEPS_TO_COMPONENTS = {
  1: 'races',
  2: 'class',
  3: 'background',
  4: 'asi',
  5: 'skills',
  6: 'equipment',
  7: 'name'
} as const;

type StepKey = keyof typeof STEPS_TO_COMPONENTS;
type ComponentName = typeof STEPS_TO_COMPONENTS[StepKey]

interface Form {
  race?: string,
  class?: string,
  background?: string,
  asi?: [],
  skills?: string[],
  equipment?: [],
  name?: string,
}

interface Props {
  races: Race[]
  classes: Class[],
  backgrounds: Background[],
  weapon: Weapon[],
  armor: Armor[],
  equipmentPacks: EquipmentPack[],
}

export const MultiStepForm = (
  {
    races,
    classes,
    backgrounds,
    weapon,
    armor,
    equipmentPacks
  }: Props
) => {
  const [currentStep, setCurrentStep] = useState<StepKey>(1);
  const [formData, setFormData] = useState<Form>({});

  const nextStep = () => setCurrentStep(prev => {
    const nextStep = (prev as number) + 1;
    return nextStep as StepKey;
  })
  const prevStep = () => setCurrentStep(prev => {
    const nextStep = (prev as number) - 1;
    return nextStep as StepKey;
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const steps: Record<ComponentName, JSX.Element> = {
    races: <RacesForm races={races} />,
    class: <></>,
    background: <></>,
    asi: <></>,
    skills: <></>,
    equipment: <></>,
    name: <></>,
  }

  return (
    <div>
      <CharacterCreateHeader />

      { steps[STEPS_TO_COMPONENTS[currentStep]] }


      <div>
        {
          currentStep as number !== 1 && (
            <Button title="назад" onClick={prevStep} />
          )
        }

        <Button title="далі" onClick={nextStep} />
      </div>

    </div>
  )
}

export default MultiStepForm