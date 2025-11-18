import {skillsSchema} from "@/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import {BackgroundI, ClassI, RaceI, SkillProficiencies} from "@/types/model-types";
import {useEffect} from "react";
import {engEnumSkills} from "@/refs/translation";
import {Skills} from "@prisma/client";
import {Skill, SkillsEnum} from "@/types/enums";

interface Props {
  race: RaceI
  selectedClass: ClassI
  background: BackgroundI
}

type GroupName = 'race' | 'selectedClass' | 'background';

function getSkillProficienciesCount(skillProfs: SkillProficiencies | null): number {
  if (!skillProfs) return 0;

  if (Array.isArray(skillProfs)) return skillProfs.length

  return skillProfs.choiceCount
}

function getTotalSkillProficienciesCount(
  {raceCount, classCount, backgroundCount}: { raceCount: number, classCount: number, backgroundCount: number }
): number {
  return raceCount + classCount + backgroundCount
}

interface hasSkills {
  skillProficiencies: SkillProficiencies
}

function populateSkills<T extends hasSkills>(model: T) {
  if (model.skillProficiencies && !Array.isArray(model.skillProficiencies)) {
    model.skillProficiencies.options = [...SkillsEnum]
  }
}

export const SkillsForm = ({race, selectedClass, background}: Props) => {
  const {form, onSubmit} = useStepForm(skillsSchema);

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
    race: [],
    selectedClass: [],
    background: [],
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
  
  const entries = Object.entries(basicChoices) as [GroupName, Skill[]][];
  console.log('entries', entries)
  const h2s = {
    race: <h2 key={0}>Навички за расу</h2>,
    selectedClass: <h2 key={1}>Навички за клас</h2>,
    background: <h2 key={2}>Навички за передісторію</h2>
}

  const skillsByGroup = {
    race: race.skillProficiencies,
    selectedClass: selectedClass.skillProficiencies,
    background: background.skillProficiencies
  }


  const handleToggleTashaSkill = (skill: Skill) => {
    const has = tashaChoices.includes(skill)

    if (!has && tashaChoiceCountCurrent < 1) return;

    const updated = has
      ? tashaChoices.filter(c => c !== skill)
      : [...tashaChoices, skill]

    form.setValue('tashaChoices', updated)
  }

  const handleToggleBasicSkill = ({skill, groupName}: {skill: Skill, groupName: GroupName}) => {
    const current = basicChoices[groupName] ?? []
    const has  = current.includes(skill)

    if (!has && current.length < 1) return;

    const updated = has
      ? current.filter(c => c !== skill)
      : [...current, skill]

    form.setValue(`basicChoices.${groupName}`, updated)
  }

  console.log(isTasha)


  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Навички</h2>

      <label>
        <input type="checkbox" onChange={() => {
          form.setValue('isTasha', !isTasha)
        }} checked={!isTasha}/>
        <span className="ml-2">Не використовувати правила Таші &#34;вільного розподілу&#34;?</span>
      </label>

      {form.formState.errors.basicChoices && (
        <p className="text-red-500 text-sm">
          {form.formState.errors.basicChoices.message}
        </p>
      )}
      <div className="p-4 bg-slate-800">
        {
          isTasha && (
            <div className="flex flex-row">
              <div>
                {
                  engEnumSkills.map((skill, index) => {
                    const isSelected = tashaChoices.includes(skill.eng)
                    const isReachedLimit = tashaChoiceCountCurrent < 1
                    const isDisabled = !isSelected && isReachedLimit;
                    return (
                      <div key={index} className="my-2">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            className={`h-6 w-6 ${isDisabled && 'opacity-40 cursor-not-allowed'}`}
                            onChange={() => handleToggleTashaSkill(skill.eng)}
                            checked={isSelected}
                            disabled={isDisabled}
                          />
                          <span className="ml-2">{skill.ukr}</span>
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
        {
          !isTasha && (
            <div>
              <div>
                {
                  entries.map(([groupName, choices], index) => {
                    if (groupName === 'race' && race.skillProficiencies && Array.isArray(race.skillProficiencies)) {
                      console.log('race')
                      return (
                        <div key={index}>
                          <h2>Расові навички</h2>
                          {
                              race.skillProficiencies.map((skill, index) => {
                                const skillGroup = engEnumSkills.find((s) => s.eng === skill)
                                return (
                                  <span key={index}>
                                    {skillGroup?.ukr}
                                  </span>
                                )}
                            )
                          }
                        </div>
                      )
                    }
                    return (
                      <div key={index}>
                        {(skillsByGroup[groupName].options ?? []).map((skill, skillIndex) => {
                          const skillGroup = engEnumSkills.find((s) => s.eng === skill)
                          console.log('here', skillGroup)
                          if (!skillGroup) return;
                          const isSelected = (basicChoices[groupName] ?? []).includes(skill)
                          const isMaxReached = basicCounts[groupName] < 1
                          const isDisabled = !isSelected && isMaxReached
                          return (
                            <div key={skillIndex}>
                              <div key={index} className="my-2">
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    className={`h-6 w-6 ${isDisabled && 'opacity-40 cursor-not-allowed'}`}
                                    onChange={() => handleToggleBasicSkill({
                                      skill: Skills[skillGroup.eng],
                                      groupName: groupName
                                    })}
                                    checked={isSelected}
                                    disabled={isDisabled}
                                  />
                                  <span className="ml-2">{skillGroup.ukr}</span>
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                }
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
