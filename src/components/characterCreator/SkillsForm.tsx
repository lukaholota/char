import { skillsSchema } from "@/zod/schemas/persCreateSchema";
import { useStepForm } from "@/hooks/useStepForm";
import { BackgroundI, ClassI, RaceI, SkillProficiencies } from "@/types/model-types";
import { useEffect } from "react";
import { engEnumSkills } from "@/refs/translation";
import { Skills } from "@prisma/client";

interface Props {
  race: RaceI
  selectedClass: ClassI
  background: BackgroundI
}

function getSkillProficienciesCount(skillProfs: SkillProficiencies | null): number {
  if (!skillProfs) return 0;

  if (Array.isArray(skillProfs)) return skillProfs.length

  return skillProfs.choiceCount
}

function getTotalSkillProficienciesCount(
  { raceCount, classCount, backgroundCount }: { raceCount: number, classCount: number, backgroundCount: number }
): number {
  return raceCount + classCount + backgroundCount
}

export const SkillsForm = ({ race, selectedClass, background }: Props) => {
  const { form, onSubmit } = useStepForm(skillsSchema);

  useEffect(() => {
    form.register('basicChoices')
    form.register('basicChoices.race')
    form.register('basicChoices.background')
    form.register('basicChoices.selectedClass')
    form.register('tashaChoices')
    form.register('isTasha')
  }, [])

  const isTasha = form.watch('isTasha') ?? true
  const tashaChoices = form.watch('tashaChoices') || [] // просто watch
  const basicChoices = form.watch('basicChoices') ?? {
    background: [],
    selectedClass: [],
    race: []
  }

  const raceCount = getSkillProficienciesCount(race.skillProficiencies)
  const classCount = getSkillProficienciesCount(selectedClass.skillProficiencies)
  const backgroundCount = getSkillProficienciesCount(background.skillProficiencies)

  const tashaChoiceCountTotal = getTotalSkillProficienciesCount({
    raceCount: raceCount,
    classCount: classCount,
    backgroundCount: backgroundCount
  })
  const tashaChoiceCountCurrent = tashaChoiceCountTotal - (tashaChoices?.length ?? 0)

  const basicCounts = {
    background: backgroundCount - (basicChoices?.background?.length ?? 0),
    race: raceCount - (basicChoices?.race?.length ?? 0),
    selectedClass: classCount - (basicChoices?.selectedClass?.length ?? 0)
  }

  const handleToggleTashaSkill = (skill: Skills) => {
    const has = tashaChoices.includes(skill)

    if (!has && tashaChoiceCountCurrent < 1) return;

    const updated = has
      ? tashaChoices.filter(c => c !== skill)
      : [...tashaChoices, skill]

    form.setValue('tashaChoices', updated)
  }
  return (
    <form onSubmit={ onSubmit }>
      <h2 className="my-5">Навички</h2>

      <label>
        <input type="checkbox" onChange={ () => {
          form.setValue('isTasha', !isTasha)
        } }/>
        <span className="ml-2">Не використовувати правила Таші &#34;вільного розподілу&#34;?</span>
      </label>

      { form.formState.errors.basicChoices && (
        <p className="text-red-500 text-sm">
          { form.formState.errors.basicChoices.message }
        </p>
      ) }
      <div className="p-4 bg-slate-800">
        {
          isTasha && (
            <div className="flex flex-row">
              <div>
                {
                  engEnumSkills.map((skill, index) => {
                    const isSelected = tashaChoices.includes(skill.eng)
                    const isReachedLimit = tashaChoiceCountCurrent < 1
                    const isDisabled =  !isSelected && isReachedLimit;
                    // console.log('skill isSelected isDisabled', skill, isSelected, isDisabled)
                    // if (isSelected) console.log(tashaChoices[skill.eng])
                    return (
                      <div key={ index } className="my-2">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            className={`h-6 w-6 ${ isDisabled && 'opacity-40 cursor-not-allowed' }`}
                            onChange={ () => handleToggleTashaSkill(skill.eng) }
                            checked={isSelected}
                            disabled={isDisabled}
                          />
                          <span className="ml-2">{ skill.ukr }</span>
                        </label>
                      </div>
                    )
                  })
                }
              </div>
              <div className="text-2xl ml-2 font-bold flex justify-center items-center">
                {tashaChoiceCountCurrent}
              </div>
            </div>

          )
        }
      </div>


      <button type="submit" className="mt-4 px-6 py-2 bg-violet-600 rounded">
        Далі →
      </button>
    </form>
  )
};

export default SkillsForm
