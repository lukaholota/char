"use client";

import {useStepForm} from "@/hooks/useStepForm";
import {Class, Classes, Race} from "@prisma/client";
import {asiSchema} from "@/zod/schemas/persCreateSchema";
import {useFieldArray} from "react-hook-form";
import React, {useEffect, useMemo} from "react";
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
  const {fields: simpleAsiFields, replace: replaceSimpleAsi, swap: simpleAsiSwap} = useFieldArray({
    control: form.control,
    name: "simpleAsi",
  });
  const watchedSimpleAsi = form.watch('simpleAsi');

  const isDefaultASI = form.watch('isDefaultASI') || false
  const asiSystem = form.watch('asiSystem') || asiSystems.POINT_BUY
  const points = form.watch('points') || 0

  const simpleAsiIndexMap = new Map(
    simpleAsiFields.map((field, index) => [field.id, index])
  )

  const sortedSimpleAsi = useMemo(() => {
    if (!watchedSimpleAsi || watchedSimpleAsi.length === 0) {
      return [...simpleAsiFields].sort((a, b) => b.value - a.value);
    }

    const enrichedFields = simpleAsiFields.map((field, index) => ({
      ...field,
      value: watchedSimpleAsi[index]?.value
    }));

    return enrichedFields.sort((a, b) => b.value - a.value);
  }, [watchedSimpleAsi, simpleAsiFields])

  console.log(sortedSimpleAsi)

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

  const swapUp = ({sortedIndexA}: {sortedIndexA: number}) => { // index == 0-5
    if (sortedIndexA < 5) {
      const sortedIndexB = sortedIndexA + 1

      const itemA = sortedSimpleAsi[sortedIndexA]
      const itemB = sortedSimpleAsi[sortedIndexB]

      const originalIndexA = simpleAsiFields.findIndex(field => field.id === itemA.id);
      const originalIndexB = simpleAsiFields.findIndex(field => field.id === itemB.id);

      if (originalIndexA === -1 || originalIndexB === -1) return;

      simpleAsiSwap(originalIndexA, originalIndexB)

      // form.setValue(`simpleAsi.${originalIndex}.value`, searchedObject.value, {
      //   shouldTouch: true,
      //   shouldDirty: true,
      //   shouldValidate: true
      // });
      // form.setValue(`simpleAsi.${searchedOriginalIndex}.value`, originalObject.value, {
      //   shouldTouch: true,
      //   shouldDirty: true,
      //   shouldValidate: true
      // });
      //
      // form.trigger('simpleAsi')
    }
  }
  const swapDown = (index: number) => { // index == 0-5
    if (index > 0) {
      simpleAsiSwap(index, index - 1)
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
        <input
          type="hidden"
          {...form.register(`asiSystem`)}
        />
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
            <div className="flex flex-row">
              <div className="">
                {
                    sortedSimpleAsi.map((field, sortedIndex) => {
                    const attr = attributes.find(a => a.eng === field.ability);
                    const originalIndex = simpleAsiFields.findIndex(f => f.id === field.id);
                    const currentValue = field.value

                    return (
                      <div key={field.id} className="flex items-center gap-4 bg-slate-800 p-3 rounded">
                        <span className="w-12 text-center text-xl font-bold">{currentValue}</span>

                        <button
                          type="button"
                          onClick={() => swapUp({sortedIndexA: sortedIndex})}
                          className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
                          disabled={currentValue >= 15}>
                          ↑
                        </button>

                        <span className="w-24 font-semibold">{attr?.urk || field.ability}</span>

                        <button
                          type="button"
                          onClick={() => swapDown(originalIndex)}
                          className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
                          disabled={currentValue <= 8}>
                          ↓
                        </button>
                      </div>
                    );
                  })
                }
              </div>
              {
                asiSystem === asiSystems.POINT_BUY && (
                  <div
                    className={`text-3xl text-center flex justify-center items-center ml-5 ${points < 0 && 'text-red-600'}`}>
                    {points}
                  </div>
                )
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