"use client";

import {useStepForm} from "@/hooks/useStepForm";
import {Class, Classes, Race} from "@prisma/client";
import {asiSchema} from "@/zod/schemas/persCreateSchema";
import {useFieldArray} from "react-hook-form";
import React, {useEffect} from "react";
import {classAbilityScores} from "@/refs/classesBaseASI";

interface Props {
  race?: Race
  selectedClass?: Class
}

const attributes = [
  {eng: 'STR', urk: 'Сила'},
  {eng: 'DEX', urk: 'Спритність'},
  {eng: 'CON', urk: 'Статура'},
  {eng: 'INT', urk: 'Інтелект'},
  {eng: 'WIS', urk: 'Мудрість'},
  {eng: 'CHA', urk: 'Харизма'}
];

const asiSystems = {
  POINT_BUY: 'POINT_BUY',
  SIMPLE: 'SIMPLE',
  CUSTOM: 'CUSTOM'
}


export const ASIForm = (
  {race, selectedClass}: Props
) => {
  const {form, onSubmit} = useStepForm(asiSchema)

  const {fields: asiFields, replace: replaceAsi} = useFieldArray({
    control: form.control,
    name: "asi",
  });
  const {fields: simpleAsiFields, replace: replaceSimpleAsi} = useFieldArray({
    control: form.control,
    name: "simpleAsi",
  });

  const isDefaultASI = form.watch('isDefaultASI') || false
  const asiSystem = form.watch('asiSystem') || asiSystems.POINT_BUY
  const points = form.watch('points') || 0

  const sortedSimpleAsi = simpleAsiFields.sort((a, b) => b.value - a.value)

  useEffect(() => {
    if (selectedClass && asiFields.length === 0) {
      const defaultClassASI = classAbilityScores[selectedClass.name as Classes]
      if (defaultClassASI) {
        replaceAsi(defaultClassASI.map(asi => ({
          ability: asi.ability,
          value: asi.value,
        })));
        replaceSimpleAsi(defaultClassASI.map(asi => ({
          ability: asi.ability,
          value: asi.value,
        })));
      }
    }
  }, [selectedClass, asiFields.length, replaceAsi, replaceSimpleAsi, simpleAsiFields.length])

  const incrementValue = (index: number) => {
    const currentValue = (form.getValues(`asi.${index}.value`) || 0) as number;
    form.setValue('points', currentValue >= 13 ? points - 2 : points - 1)
    form.setValue(`asi.${index}.value`, currentValue + 1)
  }
  const decrementValue = (index: number) => {
    const currentValue = (form.getValues(`asi.${index}.value`) || 0) as number;
    if (currentValue > 8) {
      form.setValue('points', currentValue >= 14 ? points + 2 : points + 1)
      form.setValue(`asi.${index}.value`, currentValue - 1)
    }
  }

  const handleChangeAsiSystem = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('asiSystem', e.target.value)
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Оберіть Стати</h2>

      {form.formState.errors.asi && (
        <p className="text-red-500 text-sm">
          {form.formState.errors.asi.message}
        </p>
      )}
      <div className="flex justify-evenly">
        <label>
          <input type="radio" name="ASI_SYSTEM" value={asiSystems.POINT_BUY}
                 checked={asiSystem === asiSystems.POINT_BUY} onChange={handleChangeAsiSystem}/>
          За очками
        </label>
        <label>
          <input type="radio" name="ASI_SYSTEM" value={asiSystems.SIMPLE}
                 checked={asiSystem === asiSystems.SIMPLE} onChange={handleChangeAsiSystem}/>
          Просто
        </label>
        <label>
          <input type="radio" name="ASI_SYSTEM" value={asiSystems.CUSTOM}
                 checked={asiSystem === asiSystems.CUSTOM} onChange={handleChangeAsiSystem}/>
          Вільно
        </label>
      </div>

      <div className="space-y-3 flex flex-col items-center justify-center">
        {
          asiSystem === asiSystems.POINT_BUY && (
            <div className="flex flex-row">
              <div className="">
                {
                  asiFields.map((field, index) => {
                    const attr = attributes.find(a => a.eng === field.ability)
                    const currentValue = form.watch(`asi.${index}.value`) || field.value;

                    return (
                      <div key={field.id} className="flex items-center gap-4 bg-slate-800 p-3 rounded">
                        <span className="w-24 font-semibold">{attr?.urk || field.ability}</span>

                        <button
                          type="button"
                          onClick={() => decrementValue(index)}
                          className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
                          disabled={currentValue as number <= 8}>
                          ➖
                        </button>

                        <span className="w-12 text-center text-xl font-bold">{currentValue as number}</span>

                        <button
                          type="button"
                          onClick={() => incrementValue(index)}
                          className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
                          disabled={currentValue as number > 14}>
                          ➕
                        </button>

                        <input
                          type="hidden"
                          {...form.register(`asi.${index}.ability`)}
                        />
                        <input
                          type="hidden"
                          {...form.register(`asi.${index}.value`, {valueAsNumber: true})}
                        />
                      </div>
                    );
                  })
                }
              </div>
              <div
                className={`text-3xl text-center flex justify-center items-center ml-5 ${points < 0 && 'text-red-600'}`}>{points}</div>
            </div>
          )
        }

        {
          asiSystem === asiSystems.SIMPLE && (
            <div>
              {
                simpleAsiFields.map(field, index)
              }
            </div>
          )
        }
      </div>


      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          {...form.register("isDefaultASI")}
          className="w-4 h-4"
        />
        <span>Не використовувати правила Таші &#34;вільного розподілу&#34;?</span>
      </label>

      <button type="submit" className="mt-4 px-6 py-2 bg-violet-600 rounded">
        Далі →
      </button>
    </form>
  )
};

export default ASIForm;