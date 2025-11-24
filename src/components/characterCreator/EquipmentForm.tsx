import {equipmentSchema} from "@/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import {ClassI, RaceI} from "@/types/model-types";
import {useEffect, useMemo} from "react";
import { Armor, ClassStartingEquipmentOption, Weapon } from "@prisma/client";
import {groupBy} from "@/server/formatters/generalFormatters";

interface Props {
  race: RaceI
  selectedClass: ClassI
  weapons: Weapon[]
  armors: Armor[]
}

export const EquipmentForm = ({race, selectedClass, weapons, armors}: Props) => {
  const {form, onSubmit} = useStepForm(equipmentSchema);

  const choiceGroupToId = form.watch('choiceGroupToId') as Record<string, number[]>

  const weaponByTypes = useMemo(() => groupBy(weapons, weapon => weapon.weaponType), [weapons])
  const choiceGroups = selectedClass.startingEquipmentOption
  const choiceGroupsGroupedRaw = groupBy(choiceGroups, group => group.choiceGroup)
  const choiceGroupsGrouped: Record<string, Record<string, ClassStartingEquipmentOption[]>> = {};

  for (const [choiceGroup, group] of Object.entries(choiceGroupsGroupedRaw)) {
      choiceGroupsGrouped[choiceGroup] = groupBy(group, g => g.option)
  }

  console.log(choiceGroupToId)

  const chooseOption = (optionGroup) => {
    const choiceGroup = optionGroup[0].choiceGroup
    const newOptions = optionGroup.map(g => g.optionId)

    form.setValue(`choiceGroupToId.${choiceGroup}`, newOptions)
  }

  useEffect(() => {
    form.register("choiceGroupToId");
  }, []);

  useEffect(() => {
    const current = form.getValues('choiceGroupToId')

    if (!current) return

    if (Object.keys(current).length > 0) return

    const initValues = Object.entries(choiceGroupsGrouped).reduce(
      (acc, [choiceGroup, choiceGroupToOptionGroup]) => {
        const optionA = choiceGroupToOptionGroup['a']
        acc[choiceGroup] = [optionA[0].optionId]
        return acc
      }, {} as Record<string, number[]>
    )

    form.setValue('choiceGroupToId', initValues)
  }, [choiceGroupsGrouped])


  return (
    <form onSubmit={onSubmit} className="bg-slate-800 rounded-xl p-4">
      <h2 className="my-5">Спорядження</h2>

      <div>
        {
          Object.entries(choiceGroupsGrouped).map(([choiceGroup, choiceGroupToOptionGroup], index) => {
            return (
              <ul key={index} className="flex flex-row mb-8">
                <span className="mr-2">{choiceGroup}: </span>
                <ul className="space-y-3">
                  {
                    Object.values(choiceGroupToOptionGroup).map((optionGroup, index) => {
                      const entry = optionGroup[0]
                      const output = optionGroup.map(g => g.description).join(', ')
                      return (
                        <li key={index}>
                          {
                            Object.keys(choiceGroupToOptionGroup).length > 1
                              ? (
                                <>
                                  <label className="cursor-pointer">
                                    <input
                                      type="radio"
                                      name={ choiceGroup }
                                      onChange={ () => chooseOption(optionGroup) }
                                      checked={!!choiceGroupToId[choiceGroup]?.includes(entry.optionId) }
                                    />
                                    <span className="px-2">
                                      {output}
                                    </span>
                                  </label>
                                  {
                                    optionGroup.some(g => g.chooseAnyWeapon) && (
                                      <>
                                        
                                      </>
                                    )
                                  }
                                </>
                              ) : (
                                  <div className="text-blue-300 ml-1">{output}</div>
                              )
                          }
                        </li>
                      )
                    })
                  }
                </ul>
              </ul>
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
