import {skillsSchema} from "@/lib/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import {BackgroundI, ClassI, RaceI, SkillProficiencies, SkillProficienciesChoice} from "@/lib/types/model-types";
import {useEffect, useMemo} from "react";
import {engEnumSkills} from "@/lib/refs/translation";
import {RaceVariant, Skills} from "@prisma/client";
import {Skill, SkillsEnum} from "@/lib/types/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Lock } from "lucide-react";
import { usePersFormStore } from "@/lib/stores/persFormStore";

interface Props {
  race: RaceI
  raceVariant?: RaceVariant | null
  selectedClass: ClassI
  background: BackgroundI
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

type GroupName = 'race' | 'selectedClass';

function isSkill(value: unknown): value is Skill {
  return typeof value === "string" && (SkillsEnum as readonly string[]).includes(value)
}

function normalizeSkillProficiencies(value: unknown): SkillProficiencies | null {
  if (!value) return null

  if (Array.isArray(value)) {
    return value.filter(isSkill) as unknown as SkillProficiencies
  }

  if (typeof value === "object") {
    const maybe = value as { options?: unknown; choiceCount?: unknown; chooseAny?: unknown }
    if (typeof maybe.choiceCount === "number" && Array.isArray(maybe.options)) {
      const options = maybe.options.filter(isSkill)
      const chooseAny = typeof maybe.chooseAny === "boolean" ? maybe.chooseAny : undefined
      return { options, choiceCount: maybe.choiceCount, chooseAny }
    }
  }

  return null
}

function getSkillProficienciesCount(skillProfs: SkillProficiencies | null): number {
  if (!skillProfs) return 0;

  if (Array.isArray(skillProfs)) return skillProfs.length

  return skillProfs.choiceCount
}

function getTotalSkillProficienciesCount(
  {raceCount, classCount, backgroundCount, subraceCount, variantCount}: { 
    raceCount: number, 
    classCount: number, 
    backgroundCount: number,
    subraceCount: number,
    variantCount: number
  }
): number {
  return raceCount + classCount + backgroundCount + subraceCount + variantCount
}

interface hasSkills {
  skillProficiencies: SkillProficiencies | null
}

function populateSkills<T extends hasSkills>(model: T) {
  if (model.skillProficiencies && !Array.isArray(model.skillProficiencies)) {
    model.skillProficiencies.options = [...SkillsEnum]
  }
}

export const SkillsForm = ({race, raceVariant, selectedClass, background, formId, onNextDisabledChange}: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();
  
  // Get selected subrace from formData
  const selectedSubrace = useMemo(() => {
    if (!formData.subraceId) return null;
    return race.subraces?.find(sr => sr.subraceId === formData.subraceId);
  }, [formData.subraceId, race.subraces]);
  
  // Calculate fixed skills from race/background/subrace
  const fixedSkillsFromRaceAndBackground = useMemo(() => {
    const skills = new Set<Skill>();
    
    // Background fixed skills
    if (Array.isArray(background.skillProficiencies)) {
      background.skillProficiencies.forEach(s => skills.add(s));
    }
    
    // Race fixed skills
    if (Array.isArray(race.skillProficiencies)) {
      race.skillProficiencies.forEach(s => skills.add(s));
    }
    
    // Subrace fixed skills
    if (selectedSubrace && Array.isArray(selectedSubrace.skillProficiencies)) {
      selectedSubrace.skillProficiencies.forEach((s) => {
        if (isSkill(s)) skills.add(s)
      });
    }
    
    return Array.from(skills);
  }, [background, race, selectedSubrace]);
  
  // Custom submit handler to build skills array
  const {form, onSubmit: baseOnSubmit} = useStepForm(skillsSchema, (data) => {
    // Build flat skills array from schema data
    const allSkills = new Set<string>();
    
    if (data.isTasha) {
      // In Tasha mode, tashaChoices already contains ALL selected skills (no fixed skills - they become choices)
      data.tashaChoices.forEach(s => allSkills.add(s));
    } else {
      // In basic mode, combine fixed race/background skills + class choices
      
      // Add fixed background skills
      if (Array.isArray(background.skillProficiencies)) {
        background.skillProficiencies.forEach(s => allSkills.add(s));
      }
      
      // Add fixed race skills
      if (Array.isArray(race.skillProficiencies)) {
        race.skillProficiencies.forEach(s => allSkills.add(s));
      }
      
      // Add subrace fixed skills
      const selectedSubrace = race.subraces?.find(sr => sr.subraceId === formData.subraceId);
      if (selectedSubrace && Array.isArray(selectedSubrace.skillProficiencies)) {
        selectedSubrace.skillProficiencies.forEach((s) => {
          if (isSkill(s)) allSkills.add(s)
        });
      }
      
      // Add class choices (user-selected)
      data.basicChoices.selectedClass.forEach(s => allSkills.add(s));
    }
    
    // Save both skillsSchema AND flat skills array
    const skillsArray = Array.from(allSkills);
    
    updateFormData({
      skillsSchema: data,
      skills: skillsArray
    });
    
    nextStep();
  });

  populateSkills<typeof race>(race)

  useEffect(() => {
    form.register('basicChoices')
    form.register('basicChoices.race')
    form.register('basicChoices.selectedClass')
    form.register('tashaChoices')
    form.register('isTasha')
    form.register('_requiredCount')
    form.register('_raceCount')
    form.register('_classCount')
  }, [form])

  const isTasha = form.watch('isTasha') ?? true
  const tashaChoices = form.watch('tashaChoices') || []
  const basicChoices = form.watch('basicChoices') ?? {
    race: [],
    selectedClass: [],
  }

  // Skills shown as "locked" in UI - only in non-Tasha mode
  const lockedSkillsInUI = useMemo(() => {
    if (isTasha) return []; // In Tasha mode, NO skills are locked in UI (they become free choices)
    return fixedSkillsFromRaceAndBackground; // In non-Tasha mode, these are locked
  }, [isTasha, fixedSkillsFromRaceAndBackground]);

  const raceSkillProficiencies = useMemo(() => {
    if (raceVariant?.name === 'HUMAN_VARIANT') {
      // Variant Human gets 1 skill of choice
      return {
        choiceCount: 1,
        options: [...SkillsEnum]
      } as SkillProficienciesChoice;
    }
    return race.skillProficiencies;
  }, [race, raceVariant]);

  const raceCount = getSkillProficienciesCount(raceSkillProficiencies)
  const classCount = getSkillProficienciesCount(selectedClass.skillProficiencies)
  const backgroundCount = getSkillProficienciesCount(background.skillProficiencies)
  const subraceCount = getSkillProficienciesCount(normalizeSkillProficiencies(selectedSubrace?.skillProficiencies))
  const variantCount = 0

  // In Tasha mode, ALL skills (including fixed ones) become free choices in ONE pool
  const tashaChoiceCountTotal = isTasha 
    ? getTotalSkillProficienciesCount({
        raceCount,
        classCount,
        backgroundCount,
        subraceCount,
        variantCount
      })
    : 0;
    
  const tashaChoiceCountCurrent = tashaChoiceCountTotal - (tashaChoices?.length ?? 0)

  const basicCounts = {
    race: raceCount - (basicChoices?.race?.length ?? 0),
    selectedClass: classCount - (basicChoices?.selectedClass?.length ?? 0)
  }

  const entries = Object.entries(basicChoices) as [GroupName, Skill[]][];

  const skillsByGroup = {
    race: raceSkillProficiencies as SkillProficienciesChoice,
    selectedClass: selectedClass.skillProficiencies as SkillProficienciesChoice,
  }

  const checkIfSelectedByOthers = (groupName: GroupName, skill: Skill) => {
    // Check if skill is in fixed granted skills
    if (fixedSkillsFromRaceAndBackground.includes(skill)) return true;
    
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

  // Set validation metadata fields
  useEffect(() => {
    if (isTasha) {
      form.setValue('_requiredCount', tashaChoiceCountTotal);
      form.setValue('_raceCount', undefined);
      form.setValue('_classCount', undefined);
    } else {
      form.setValue('_requiredCount', undefined);
      form.setValue('_raceCount', raceCount);
      form.setValue('_classCount', classCount);
    }
  }, [isTasha, tashaChoiceCountTotal, raceCount, classCount, form]);

  // Update button state based on form validity
  useEffect(() => {
    // Skills selection is optional: allow continuing even if not all picks are filled.
    // We only guard against impossible states (over the computed limit), but UI already prevents that.
    const isOverLimit = isTasha
      ? tashaChoices.length > tashaChoiceCountTotal
      : (basicChoices.selectedClass ?? []).length > classCount;

    onNextDisabledChange?.(isOverLimit);
  }, [isTasha, tashaChoices.length, tashaChoiceCountTotal, basicChoices, classCount, onNextDisabledChange]);

  const handleToggleTashaSkill = (skill: Skill) => {
    const has = tashaChoices.includes(skill)

    // Can't select if already at limit and not currently selected
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
    <form id={formId} onSubmit={baseOnSubmit} className="w-full space-y-4">
      <Card className="shadow-xl">
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
            <Badge className="border border-white/15 bg-white/5 text-slate-200">Гнучкий режим</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isTasha ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                <span>Можна обрати ще</span>
                <Badge variant="outline" className="border-white/15 bg-white/5 text-white">
                  {tashaChoiceCountCurrent}
                </Badge>
              </div>
              
              {/* In Tasha mode, NO fixed skills section - all become choices */}
              <p className="text-xs text-slate-400 px-2">
                🌟 Режим Таші: всі навички від раси, підраси та передісторії тепер доступні для вільного вибору
              </p>
              
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {engEnumSkills.map((skill, index) => {
                  const isSelected = tashaChoices.includes(skill.eng);
                  const isReachedLimit = tashaChoiceCountCurrent < 1;
                  const isDisabled = !isSelected && isReachedLimit;
                  const active = isSelected;
                  
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      disabled={isDisabled}
                      className={`justify-between border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white ${
                        active ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : ""
                      } ${isDisabled ? "opacity-60" : ""}`}
                      onClick={() => handleToggleTashaSkill(skill.eng)}
                    >
                      <span>{skill.ukr}</span>
                      {active && <Check className="h-4 w-4" />}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Show fixed skills from background/race/subrace in NON-Tasha mode */}
              {lockedSkillsInUI.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-amber-200">Фіксовані навички</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lockedSkillsInUI.map((skill) => {
                      const skillGroup = engEnumSkills.find((s) => s.eng === skill);
                      return (
                        <Badge key={skill} className="bg-amber-900/30 text-amber-100 border border-amber-700/50">
                          {skillGroup?.ukr}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="text-xs text-amber-300/70 mt-2">
                    Ці навички автоматично отримані від раси та передісторії
                  </p>
                </div>
              )}

              {entries.map(([groupName, choices], index) => (
                <div key={index} className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
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
                          variant="outline"
                          disabled={isDisabled}
                          className={`justify-between ${
                            isSelectedByOthers 
                              ? "bg-white/3 text-slate-400 border-white/10 cursor-not-allowed" 
                              : active 
                                ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-slate-100" 
                                : "border-white/15 bg-white/5 text-slate-200"
                          } ${isDisabled && !isSelectedByOthers ? "opacity-60" : ""}`}
                          onClick={() => !isSelectedByOthers && handleToggleBasicSkill({
                            skill: Skills[skillGroup.eng],
                            groupName: groupName
                          })}
                        >
                          <span className="flex items-center gap-2">
                            {isSelectedByOthers && <Lock className="h-3 w-3" />}
                            {skillGroup.ukr}
                          </span>
                          {active && !isSelectedByOthers && <Check className="h-4 w-4" />}
                          {isSelectedByOthers && <span className="text-xs opacity-70">(вже обрано)</span>}
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
