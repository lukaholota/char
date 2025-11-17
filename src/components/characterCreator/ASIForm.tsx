"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { Ability, Classes,  } from "@prisma/client";
import { asiSchema } from "@/zod/schemas/persCreateSchema";
import { useFieldArray, useWatch } from "react-hook-form";
import React, { useEffect, useMemo, useRef } from "react";
import { classAbilityScores } from "@/refs/classesBaseASI";
import { ClassI, RaceI } from "@/types/model-types";


interface Props {
  race: RaceI
  selectedClass: ClassI
  prevRaceId: number | null
  setPrevRaceId: (id: number) => void;
}

const attributes = [
  { eng: Ability.STR, ukr: 'Сила' },
  { eng: Ability.DEX, ukr: 'Спритність' },
  { eng: Ability.CON, ukr: 'Статура' },
  { eng: Ability.INT, ukr: 'Інтелект' },
  { eng: Ability.WIS, ukr: 'Мудрість' },
  { eng: Ability.CHA, ukr: 'Харизма' }
];

const attributesUrkShort = [
  { eng: Ability.STR, ukr: 'СИЛ' }, // Strength — Сила
  { eng: Ability.DEX, ukr: 'СПР' }, // Dexterity — Спритність
  { eng: Ability.CON, ukr: 'СТА' }, // Constitution — Статура
  { eng: Ability.INT, ukr: 'ІНТ' }, // Intelligence — Інтелект
  { eng: Ability.WIS, ukr: 'МУД' }, // Wisdom — Мудрість
  { eng: Ability.CHA, ukr: 'ХАР' }, // Charisma — Харизма
];

const asiSystems = {
  POINT_BUY: 'POINT_BUY',
  SIMPLE: 'SIMPLE',
  CUSTOM: 'CUSTOM'
}


export const ASIForm = (
  { race, selectedClass, prevRaceId, setPrevRaceId }: Props
) => {
  const raceAsi = race.ASI

  const { form, onSubmit } = useStepForm(asiSchema)

  console.log(form.getValues('racialBonusChoiceSchema'))

  const { fields: asiFields, replace: replaceAsi } = useFieldArray({
    control: form.control,
    name: "asi",
  });
  const { fields: simpleAsiFields, replace: replaceSimpleAsi } = useFieldArray({
    control: form.control,
    name: "simpleAsi",
  });
  const { fields: customAsiFields, replace: replaceCustomAsi } = useFieldArray({
    control: form.control,
    name: "customAsi",
  });
  const watchedSimpleAsi = useWatch({
    control: form.control,
    name: 'simpleAsi'
  })

  const isDefaultASI = form.watch('isDefaultASI') || false
  const asiSystem = form.watch('asiSystem') || asiSystems.POINT_BUY
  const points = form.watch('points') || 0

  const racialBonusSchemaPath = `racialBonusChoiceSchema.${ isDefaultASI ? 'basicChoices' : 'tashaChoices' }` as const;

  const sortedSimpleAsi = useMemo(() => {
    if (!watchedSimpleAsi || watchedSimpleAsi.length === 0) {
      return [...simpleAsiFields].sort((a, b) => b.value - a.value);
    }

    const enrichedFields = simpleAsiFields.map((field, index) => ({
      ...field,
      ability: field.ability,
      value: watchedSimpleAsi[index]?.value ?? field.value
    }));

    return enrichedFields.sort((a, b) => b.value - a.value);
  }, [watchedSimpleAsi, simpleAsiFields])

  const incrementValue = (index: number) => {
    const currentValue = form.getValues(`asi.${ index }.value`) || 0;
    form.setValue('points', currentValue >= 13 ? points - 2 : points - 1)
    form.setValue(`asi.${ index }.value`, currentValue + 1)
  }
  const decrementValue = (index: number) => {
    const currentValue = form.getValues(`asi.${ index }.value`) || 0;
    if (currentValue > 8) {
      form.setValue('points', currentValue >= 14 ? points + 2 : points + 1)
      form.setValue(`asi.${ index }.value`, currentValue - 1)
    }
  }

  const swapValues = ({ sortedIndexA, isDirectionUp }: { sortedIndexA: number, isDirectionUp: boolean }) => { // index == 0-5
    if (isDirectionUp ? sortedIndexA > 0 : sortedIndexA < 5) {
      const sortedIndexB = isDirectionUp ? sortedIndexA - 1 : sortedIndexA + 1

      const itemA = sortedSimpleAsi[sortedIndexA]
      const itemB = sortedSimpleAsi[sortedIndexB]

      const originalIndexA = simpleAsiFields.findIndex(field => field.id === itemA.id);
      const originalIndexB = simpleAsiFields.findIndex(field => field.id === itemB.id);

      if (originalIndexA === -1 || originalIndexB === -1) return;

      form.setValue(`simpleAsi.${ originalIndexA }.value`, itemB.value, {
        shouldTouch: true,
        shouldDirty: true,
        shouldValidate: true
      });

      form.setValue(`simpleAsi.${ originalIndexB }.value`, itemA.value, {
        shouldTouch: true,
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  const handleChangeAsiSystem = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('asiSystem', e.target.value)
  }

  const handleToggleRacialBonus = ({ groupIndex, choiceCount, ability }: {
    groupIndex: number,
    choiceCount: number,
    ability: Ability
  }) => {
    const schemaPath = racialBonusSchemaPath;

    const groups = form.getValues(schemaPath) || []

    const arrayIndex = groups.findIndex(g => g.groupIndex === groupIndex);

    if (arrayIndex !== -1) {
      const currentAbilities = groups[arrayIndex].selectedAbilities;
      const hasAbility = currentAbilities.includes(ability);

      if (!hasAbility && currentAbilities.length === groups[arrayIndex].choiceCount) return null;

      const newAbilities = hasAbility
        ? currentAbilities.filter(a => a !== ability)
        : [...currentAbilities, ability]

      form.setValue(
        `${ schemaPath }.${ arrayIndex }.selectedAbilities`,
        newAbilities
      )
    } else {
      const newGroup = {
        groupIndex: groupIndex,
        choiceCount: choiceCount,
        selectedAbilities: [ability]
      }
      const newGroups = [...groups, newGroup]

      form.setValue(`${ schemaPath }`, newGroups)
    }
  }

  const isRacialBonusSelected = (index: number, attr: Ability) => {
    const abilities = form.getValues(`${ racialBonusSchemaPath }.${ index }.selectedAbilities`) || [];

    return abilities.includes(attr)
  }

  const getCurrentSelectedCount = (index: number) => {
    const abilities = form.getValues(`${ racialBonusSchemaPath }.${ index }.selectedAbilities`) || [];

    return abilities.length;
  }

  useEffect(() => {
    if (selectedClass) {
      const defaultClassASI = classAbilityScores[selectedClass.name as Classes]
      if (defaultClassASI) {
        const currentAsi = form.getValues('asi')
        const currentSimpleAsi = form.getValues('simpleAsi')
        const currentCustomAsi = form.getValues('customAsi')

        if (!currentAsi || currentAsi.length === 0) {
          replaceAsi(defaultClassASI.map(asi => ({
            ability: asi.ability,
            value: asi.value,
          })));
        }
        if (!currentSimpleAsi || currentSimpleAsi.length === 0) {
          replaceSimpleAsi(defaultClassASI.map(asi => ({
            ability: asi.ability,
            value: asi.value,
          })));
        }
        if (!currentCustomAsi || currentCustomAsi.length === 0) {
          replaceCustomAsi(defaultClassASI.map(asi => ({
            ability: asi.ability,
            value: String(asi.value),
          })));
        }
      }
    }
  }, [selectedClass, replaceAsi, replaceSimpleAsi])

  useEffect(() => {
    form.register('points')

    const p = form.getValues('points');
    if (typeof p !== 'number') {
      form.setValue('points', 0, { shouldDirty: false, shouldTouch: false })
    }
  }, [form])

  useEffect(() => {
    if (prevRaceId !== null && prevRaceId !== race.raceId) {
      console.log('resetting racialBonusChoiceSchema', form.getValues());
      form.setValue(`racialBonusChoiceSchema.tashaChoices`, [])
      form.setValue(`racialBonusChoiceSchema.basicChoices`, [])
      // form.reset({
      //   ...form.getValues(),
      //   racialBonusChoiceSchema: {
      //     basicChoices: [],
      //     tashaChoices: [],
      //   }
      // })
    }

    setPrevRaceId(race.raceId)
  }, [race.raceId])

  const racialBonusGroups = useMemo(() => {
    return isDefaultASI
      ? raceAsi.basic?.flexible?.groups
      : raceAsi.tasha?.flexible.groups
  }, [isDefaultASI, raceAsi])

  return (
    <form onSubmit={ onSubmit } className="w-full max-w-2xl mx-auto">
      <h2 className="my-5 text-center text-2xl">Оберіть Стати</h2>

      {/* ✅ Показуємо помилки з refine */ }
      { form.formState.errors.root && (
        <p className="text-red-500 text-sm mb-3">
          ❌ root { form.formState.errors.root.message }
        </p>
      ) }

      {/* Або якщо помилка на полі asi */ }
      { form.formState.errors.asi && (
        <p className="text-red-500 text-sm mb-3">
          ❌ asi { form.formState.errors.asi.message }
        </p>
      ) }

      {/* Або якщо на simpleAsi */ }
      { form.formState.errors.simpleAsi && (
        <p className="text-red-500 text-sm mb-3">
          ❌ simpleAsi { form.formState.errors.simpleAsi.message }
        </p>
      ) }

      { form.formState.errors.points && (
        <p className="text-red-500 text-sm mb-3">
          ❌ point { form.formState.errors.points.message }
        </p>
      ) }

      { form.formState.errors.customAsi && (
        <p className="text-red-500 text-sm mb-3">
          { `❌ customAsi: ${ form.formState.errors.customAsi?.root?.message }` }
        </p>
      ) }

      <div className="flex justify-evenly">
        <input type="hidden" { ...form.register('asiSystem') } />
        <input type="hidden" { ...form.register('racialBonusChoiceSchema') } />

        {/* Реєструємо всі asi поля */ }
        { asiFields.map((field, index) => (
          <React.Fragment key={ field.id }>
            <input type="hidden" { ...form.register(`asi.${ index }.ability`) } />
            <input type="hidden" { ...form.register(`asi.${ index }.value`, { valueAsNumber: true }) } />
          </React.Fragment>
        )) }

        {/* Реєструємо всі simpleAsi поля */ }
        { simpleAsiFields.map((field, index) => (
          <React.Fragment key={ field.id }>
            <input type="hidden" { ...form.register(`simpleAsi.${ index }.ability`) } />
            <input type="hidden" { ...form.register(`simpleAsi.${ index }.value`, { valueAsNumber: true }) } />
          </React.Fragment>
        )) }

        { customAsiFields.map((field, index) => (
          <React.Fragment key={ field.id }>
            <input type="hidden" { ...form.register(`customAsi.${ index }.ability`) } />
            <input type="hidden" { ...form.register(`customAsi.${ index }.value`) } />
          </React.Fragment>
        )) }

        <label>
          <input type="radio" name="ASI_SYSTEM" value={ asiSystems.POINT_BUY }
                 checked={ asiSystem === asiSystems.POINT_BUY } onChange={ handleChangeAsiSystem }/>
          За очками
        </label>
        <label>
          <input type="radio" name="ASI_SYSTEM" value={ asiSystems.SIMPLE }
                 checked={ asiSystem === asiSystems.SIMPLE } onChange={ handleChangeAsiSystem }/>
          Просто
        </label>
        <label>
          <input type="radio" name="ASI_SYSTEM" value={ asiSystems.CUSTOM }
                 checked={ asiSystem === asiSystems.CUSTOM } onChange={ handleChangeAsiSystem }/>
          Вільно
        </label>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 my-6">
        {
          asiSystem === asiSystems.POINT_BUY && (
            <div className="flex flex-row">
              <div className="">
                {
                  asiFields.map((field, index) => {
                    const attr = attributes.find(a => a.eng === field.ability)
                    const currentValue = form.watch(`asi.${ index }.value`) || field.value;

                    return (
                      <div key={ field.id } className="flex items-center gap-4 bg-slate-800 p-3 rounded">
                        <span className="w-24 font-semibold">{ attr?.ukr || field.ability }</span>

                        <button
                          type="button"
                          onClick={ () => decrementValue(index) }
                          className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
                          disabled={ currentValue as number <= 8 }>
                          ➖
                        </button>

                        <span className="w-12 text-center text-xl font-bold">{ currentValue as number }</span>

                        <button
                          type="button"
                          onClick={ () => incrementValue(index) }
                          className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
                          disabled={ currentValue as number > 14 }>
                          ➕
                        </button>

                      </div>
                    );
                  })
                }
              </div>
              <div
                className={ `text-3xl text-center flex justify-center items-center ml-5 ${ points < 0 && 'text-red-600' }` }>{ points }</div>
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
                    const currentValue = field.value

                    return (
                      <div key={ field.id } className="flex items-center gap-4 bg-slate-800 p-3 rounded">
                        <span className="w-12 text-center text-xl font-bold">{ currentValue }</span>

                        <button
                          type="button"
                          onClick={ () => swapValues({ sortedIndexA: sortedIndex, isDirectionUp: true }) }
                          className="px-3 py-1 bg-cyan-600 rounded hover:bg-cyan-500"
                          disabled={ currentValue >= 15 }>
                          ↑
                        </button>

                        <span className="w-24 font-semibold">{ attr?.ukr || field.ability }</span>

                        <button
                          type="button"
                          onClick={ () => swapValues({ sortedIndexA: sortedIndex, isDirectionUp: false }) }
                          className="px-3 py-1 bg-green-600 rounded hover:bg-green-500"
                          disabled={ currentValue <= 8 }>
                          ↓
                        </button>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )
        }
        {
          asiSystem === asiSystems.CUSTOM && (
            <div className="flex flex-row">
              <div className="">
                {
                  customAsiFields.map((field, index) => {
                    const attr = attributes.find(a => a.eng === field.ability);
                    const currentValue = form.watch(`customAsi.${ index }.value`)

                    return (
                      <div key={ field.id } className="flex items-center gap-4 bg-slate-800 p-3 rounded">
                        <span className="w-24 font-semibold">{ attr?.ukr || field.ability }</span>

                        <input
                          type="text"
                          placeholder="Введіть число"
                          value={ currentValue ?? '' }
                          onChange={ (e) => {
                            form.setValue(`customAsi.${ index }.value`, e.target.value)
                          } }
                          className="px-3 py-1 bg-slate-600 rounded hover:bg-slate-500 h-6"
                        />
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )
        }
      </div>

      <h2 className="my-3 text-center text-xl">Расові бонуси</h2>

      { form.formState.errors.racialBonusChoiceSchema && (
        <p className="text-red-500 text-sm my-3">
          ❌ { form.formState.errors.racialBonusChoiceSchema.message }
        </p>
      ) }

      {
        racialBonusGroups?.map((group, index) => (
          <div key={ index } className="mb-6">
            <h2 className="my-3 text-center text-blue-300">{ group.groupName }</h2>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              {
                attributesUrkShort.map((attr, i) => {
                  const isSelected = isRacialBonusSelected(index, attr.eng)
                  const currentCount = getCurrentSelectedCount(index);
                  const isMaxReached = currentCount >= group.choiceCount
                  const formGroups: {
                    groupIndex: number;
                    choiceCount: number;
                    selectedAbilities: Ability[];
                  }[]  = form.getValues(racialBonusSchemaPath) || []

                  const currentGroupIndex = formGroups.findIndex(g => g.groupIndex === index);

                  const uniqueDisabled = isDefaultASI
                    ? (
                      raceAsi.basic?.simple
                      && (raceAsi.basic?.flexible?.groups?.length ?? 0) > 0
                      && (raceAsi.basic?.flexible?.groups?.every((group) => group.unique))
                      && (Object.keys(raceAsi.basic?.simple ?? {}).includes(attr.eng))
                    )
                    : (
                      (raceAsi.tasha?.flexible.groups.length ?? 0) > 1
                      && (raceAsi.tasha?.flexible?.groups?.every((group) => group.unique))
                      && (formGroups?.some((group) =>
                          (group.groupIndex !== currentGroupIndex) &&
                          (group.selectedAbilities.includes(attr.eng))
                      ))
                    )
                  const isDisabled = (!isSelected && isMaxReached) || uniqueDisabled;

                  return (
                    <label key={ i }
                           className={ `flex justify-center items-center cursor-pointer ${ isDisabled && 'opacity-50 cursor-not-allowed' }` }>
                      <input type="checkbox" className="mr-2 w-4 h-4" onChange={
                        () => handleToggleRacialBonus({
                          groupIndex: index,
                          choiceCount: group.choiceCount,
                          ability: attr.eng
                        })
                      } checked={ isSelected }
                             disabled={ isDisabled }/>
                      <span>{ attr.ukr }</span>
                    </label>
                  )
                })
              }
            </div>
          </div>
        ))
      }
      {
        isDefaultASI && (
          <>
            { Object.entries(raceAsi.basic?.simple || {}).length > 0
              ? Object.entries(raceAsi.basic?.simple || {}).map(([attrEng, value], index) => {
                const attr = attributes.find(a => a.eng === attrEng)

                return (
                  <div
                    key={ index }
                    className="bg-slate-700 px-4 py-2 rounded-lg"
                  >
                    <span className="font-semibold">{ attr?.ukr }</span>
                    <span className="ml-2 text-blue-300">{ value }</span>

                  </div>
                )
              })
              : <>Порожньо!</>
            }
          </>
        )
      }


      <div className="flex justify-center my-6">
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4"
            { ...form.register('isDefaultASI') }
          />
          <span>Не використовувати правила Таші &#34;вільного розподілу&#34;?</span>
        </label>
      </div>

      <button type="submit" className="mt-4 px-6 py-2 bg-violet-600 rounded"
              disabled={ asiSystem === asiSystems.POINT_BUY && points < 0 }>
        Далі →
      </button>
    </form>
  )
};

export default ASIForm;