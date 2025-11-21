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

  const choiceGroupToId = form.watch('choiceGroupToId') ?? {} as Record<string, number>

  const weaponByTypes = useMemo(() => groupBy(weapons, weapon => weapon.weaponType), [weapons])
  const choiceGroups = selectedClass.startingEquipmentOption
  const choiceGroupsGrouped = groupBy(choiceGroups, group => group.choiceGroup)

  const chooseOption = (choiceGroup: string, optionId: number) => {
    form.setValue(`choiceGroupToId.${choiceGroup}`, optionId)
  }

  useEffect(() => {
    if (Object.keys(choiceGroupToId).length === 0) {
      const initValues = Object.entries(choiceGroupsGrouped).reduce(
        (acc, [choiceGroup, group]) => {
          acc[choiceGroup] = group[0].optionId;
          return acc
        }, {} as Record<string, number>
      )
      form.setValue('choiceGroupToId', initValues)
    }
  }, [choiceGroupsGrouped])

  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Навички</h2>

      <div>
        {
          Object.entries(choiceGroupsGrouped).map(([choiceGroup, group], index) => {
            return (
              <div key={index} className="flex flex-row">
                <span>{choiceGroup}: </span>
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
                                      name={ choiceGroup }
                                      value={ entry.optionId }
                                      onChange={ () => chooseOption(choiceGroup, entry.optionId) }
                                      checked={ choiceGroupToId[choiceGroup] === entry.optionId }
                                    />
                                    <span className="px-2">{entry.description};</span>
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
