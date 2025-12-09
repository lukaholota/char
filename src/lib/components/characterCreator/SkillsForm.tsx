import {skillsSchema} from "@/lib/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import {BackgroundI, ClassI, RaceI, SkillProficiencies, SkillProficienciesChoice} from "@/lib/types/model-types";
import {useEffect} from "react";
import {engEnumSkills} from "@/lib/refs/translation";
import {Skills} from "@prisma/client";
import {Skill, SkillsEnum} from "@/lib/types/enums";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/Button";
import { Switch } from "@/lib/components/ui/switch";
import { Label } from "@/lib/components/ui/label";
import { Check } from "lucide-react";

interface Props {
  race: RaceI
  selectedClass: ClassI
  background: BackgroundI
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

type GroupName = 'race' | 'selectedClass';

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
  skillProficiencies: SkillProficiencies | null
}

function populateSkills<T extends hasSkills>(model: T) {
  if (model.skillProficiencies && !Array.isArray(model.skillProficiencies)) {
    model.skillProficiencies.options = [...SkillsEnum]
  }
}

export const SkillsForm = ({race, selectedClass, background, formId, onNextDisabledChange}: Props) => {
  const {form, onSubmit} = useStepForm(skillsSchema);

  populateSkills<typeof race>(race)

  useEffect(() => {
    form.register('basicChoices')
    form.register('basicChoices.race')
    form.register('basicChoices.selectedClass')
    form.register('tashaChoices')
    form.register('isTasha')
  }, [])

  useEffect(() => {
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange])

  const isTasha = form.watch('isTasha') ?? true
  const tashaChoices = form.watch('tashaChoices') || [] // просто watch
  const basicChoices = form.watch('basicChoices') ?? {
    race: [],
    selectedClass: [],
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
    race: raceCount - (basicChoices?.race?.length ?? 0),
    selectedClass: classCount - (basicChoices?.selectedClass?.length ?? 0)
  }

  const entries = Object.entries(basicChoices) as [GroupName, Skill[]][];
  const staticSkillGroups = [race, background].filter(e => Array.isArray(e.skillProficiencies))

  const skillsByGroup = {
    race: race.skillProficiencies as SkillProficienciesChoice,
    selectedClass: selectedClass.skillProficiencies as SkillProficienciesChoice,
  }

  const checkIfSelectedByOthers = (groupName: GroupName, skill: Skill) => {
    const allSkillGroups = {
      background: background.skillProficiencies,
      race: Array.isArray(race.skillProficiencies)
        ? race.skillProficiencies
        : basicChoices.race,
      selectedClass: basicChoices.selectedClass
    }
    delete allSkillGroups[groupName]

    return Object.values(allSkillGroups).some(value =>
      Array.isArray(value)
        ? value.includes(skill)
        : value?.options?.includes(skill)
    )
  }

  const handleToggleTashaSkill = (skill: Skill) => {
    const has = tashaChoices.includes(skill)

    if (!has && tashaChoiceCountCurrent < 1) return;

    const updated = has
      ? tashaChoices.filter(c => c !== skill)
      : [...tashaChoices, skill]

    form.setValue('tashaChoices', updated)
  }

  const handleToggleBasicSkill = ({skill, groupName}: { skill: Skill, groupName: GroupName }) => {
    const current = basicChoices[groupName] ?? []
    const has = current.includes(skill)

    if (!has && basicCounts[groupName] < 1) return;

    const updated = has
      ? current.filter(c => c !== skill)
      : [...current, skill]

    form.setValue(`basicChoices.${groupName}`, updated)
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <Card className="border border-slate-800/70 bg-slate-950/70 shadow-xl">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-white">Навички</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="isTasha"
              checked={isTasha}
              onCheckedChange={(checked) => form.setValue('isTasha', checked)}
            />
            <Label htmlFor="isTasha" className="text-slate-200">Правила Таші</Label>
            <Badge className="bg-slate-800/70 text-slate-200 border border-slate-700">Гнучкий режим</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isTasha ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
                <span>Залишилось обрати</span>
                <Badge variant="outline" className="border-slate-700 bg-slate-800/80 text-white">
                  {tashaChoiceCountCurrent}
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {engEnumSkills.map((skill, index) => {
                  const isSelected = tashaChoices.includes(skill.eng)
                  const isReachedLimit = tashaChoiceCountCurrent < 1
                  const isDisabled = !isSelected && isReachedLimit;
                  const active = isSelected;
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant={active ? "secondary" : "outline"}
                      disabled={isDisabled}
                      className={`justify-between ${active ? "bg-indigo-500/20 text-indigo-50 border-indigo-400/60" : "bg-slate-900/60 border-slate-800/80 text-slate-200"} ${isDisabled ? "opacity-60" : ""}`}
                      onClick={() => handleToggleTashaSkill(skill.eng)}
                    >
                      <span>{skill.ukr}</span>
                      {active && <Check className="h-4 w-4" />}
                    </Button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {staticSkillGroups.map((group, index) => (
                <div key={index} className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                  <h3 className="text-sm font-semibold text-white">
                    {group === race ? 'Навички за расу' : 'Навички за передісторію'}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(group.skillProficiencies as Skill[]).map((skill, idx) => {
                      const skillGroup = engEnumSkills.find((s) => s.eng === skill)
                      return (
                        <Badge key={idx} className="bg-slate-800/80 text-slate-200 border border-slate-700">
                          {skillGroup?.ukr}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              ))}

              {entries.map(([groupName, choices], index) => (
                <div key={index} className="space-y-2 rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                  {skillsByGroup[groupName]?.options && (
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <div className="font-semibold text-white">
                        {groupName === 'race' ? 'Навички за расу' : 'Навички за клас'}
                      </div>
                      <span className="text-xs uppercase tracking-wide">Залишок: <span className="text-indigo-300">{basicCounts[groupName]}</span></span>
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(skillsByGroup[groupName]?.options ?? []).map((skill, skillIndex) => {
                      const skillGroup = engEnumSkills.find((s) => s.eng === skill)
                      if (!skillGroup) return null;
                      const isSelected = (choices ?? []).includes(skill)
                      const isSelectedByOthers = checkIfSelectedByOthers(groupName, skill)
                      const isMaxReached = basicCounts[groupName] < 1;
                      const isDisabled = (!isSelected && isMaxReached) || isSelectedByOthers
                      const active = isSelected || isSelectedByOthers;
                      return (
                        <Button
                          key={skillIndex}
                          type="button"
                          variant={active ? "secondary" : "outline"}
                          disabled={isDisabled}
                          className={`justify-between ${active ? "bg-indigo-500/20 text-indigo-50 border-indigo-400/60" : "bg-slate-900/60 border-slate-800/80 text-slate-200"} ${isDisabled ? "opacity-60" : ""}`}
                          onClick={() => handleToggleBasicSkill({
                            skill: Skills[skillGroup.eng],
                            groupName: groupName
                          })}
                        >
                          <span>{skillGroup.ukr}</span>
                          {active && <Check className="h-4 w-4" />}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  )
};

export default SkillsForm
