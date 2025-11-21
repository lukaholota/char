import {equipmentSchema, skillsSchema} from "@/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import {BackgroundI, ClassI, RaceI} from "@/types/model-types";
import {useEffect, useMemo} from "react";
import {Armor, Weapon} from "@prisma/client";
import {getWeaponsByType} from "@/server/formatters/weaponFormatter";
import {groupBy} from "@/server/formatters/generalFormatters";

interface Props {
  race: RaceI
  selectedClass: ClassI
  weapons: Weapon[]
  armors: Armor[]
}

export const EquipmentForm = ({race, selectedClass, weapons, armors}: Props) => {
  const {form, onSubmit} = useStepForm(equipmentSchema);

  const optionToId = form.watch('optionToId')

  const weaponByTypes = useMemo(() => groupBy(weapons, weapon => weapon.weaponType), [weapons])
  const choiceGroups = selectedClass.startingEquipmentOption
  const choiceGroupsGrouped = groupBy(choiceGroups, group => group.choiceGroup)
  console.log('choiceGroupsGrouped', choiceGroupsGrouped)

  const chooseFromOption = (option: string, optionId: number) => {
    form.setValue(`optionToId.${option}`, optionId)
  }

  useEffect(() => {
    form.register('optionToId')
  }, [])

  useEffect(() => {
    if (Object.keys(optionToId).length === 0) {
      const initValues = Object.entries(choiceGroupsGrouped).reduce(
        (acc, [option, group]) => {
          acc[option] = group[0].optionId;
          return acc
        }, {} as Record<string, number>
      )
      form.setValue('optionToId', initValues)
    }
  }, [])

  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Навички</h2>

      <div>
        {
          Object.entries(choiceGroupsGrouped).map(([option, group], index) => {
            return (
              <div key={index} className="flex flex-row">
                <span>{option}: </span>
                <div>
                  {
                    group.map((entry, index) => {
                      return (
                        <div key={index}>
                          {
                            group.length > 1
                              ? (
                                <>
                                  <label>
                                    <input
                                      type="radio"
                                      name={ option }
                                      value={ entry.optionId }
                                      onChange={ () => chooseFromOption(option, entry.optionId) }
                                      checked={ optionToId[option] === entry.optionId }
                                    />
                                    <span className="px-2">{}</span>
                                  </label>

                                </>
                              ) : (
                                <>
                                </>
                              )
                          }
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            )
          })
        }
      </div>

      <button type="submit" className="mt-4 px-6 py-2 bg-violet-600 rounded">
        Далі →
      </button>
    </form>
  )
};

export default EquipmentForm
