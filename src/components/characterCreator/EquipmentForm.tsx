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

  const equipmentOptionIds = form.watch('equipmentOptionIds')

  useEffect(() => {
    form.register('equipmentOptionIds')
  }, [])

  const weaponByTypes = useMemo(() => groupBy(weapons, weapon => weapon.weaponType), [weapons])
  const choiceGroups = selectedClass.startingEquipmentOption
  const choiceGroupsGrouped = groupBy(choiceGroups, group => group.choiceGroup)

  const choooseOption = (optionId: number) => {
    form.setValue()
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Навички</h2>

      {form.formState.errors.equipmentOptionIds && (
        <p className="text-red-500 text-sm">
          {form.formState.errors.equipmentOptionIds.message}
        </p>
      )}

      <div>
        {
          Object.entries(choiceGroupsGrouped).map(([choiceGroup, group], index) => {
            return (
              <div key={index}>
                <div>
                  {
                    group.map((option, index) => {
                      return (
                        <div key={index}>
                          {
                            group.length > 1
                              ? (
                                <>
                                  <input
                                    type="radio"
                                    name={choiceGroup}
                                    value={option.optionId}
                                    onChange={() => chooseOption(optionId)} />
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
