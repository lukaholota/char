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
import clsx from "clsx";

interface Props {
  race: RaceI
  raceVariant?: RaceVariant | null
  selectedClass: ClassI
  background: BackgroundI
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
  activeFeatures?: any[]
  extraExistingSkills?: string[]
  extraExistingExpertises?: string[]
}

type GroupName = 'race' | 'selectedClass' | 'background';

function isSkill(value: unknown): value is Skill {
  return typeof value === "string" && (SkillsEnum as readonly string[]).includes(value)
}

function normalizeSkillProficiencies(value: unknown): SkillProficiencies | null {
  if (!value) return null

  if (Array.isArray(value)) {
    return value.filter(isSkill) as unknown as SkillProficiencies
  }

  if (typeof value === "object") {
    const maybe = value as { options?: unknown; choices?: unknown; choiceCount?: unknown; chooseAny?: unknown }
    
    // Support both 'options' and 'choices' (legacy/seed format)
    const optionsSource = Array.isArray(maybe.options) ? maybe.options : Array.isArray(maybe.choices) ? maybe.choices : undefined;
    
    if (typeof maybe.choiceCount === "number" && optionsSource) {
      // Allow 'ANY' (used in Custom Lineage) or valid skills
      const options = optionsSource.filter(s => isSkill(s) || s === 'ANY') as Skill[] // Cast to satisfy type (ANY treated as valid)
      const chooseAny = typeof maybe.chooseAny === "boolean" ? maybe.chooseAny : undefined
      // Always return normalized object with 'options' key for internal consistency
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

interface hasSkills {
  skillProficiencies: SkillProficiencies | null
}

function populateSkills<T extends hasSkills>(model: T) {
  if (model.skillProficiencies && !Array.isArray(model.skillProficiencies)) {
    model.skillProficiencies.options = [...SkillsEnum]
  }
}

export const SkillsForm = ({
  race,
  raceVariant,
  selectedClass,
  background,
  formId,
  onNextDisabledChange,
  activeFeatures: _activeFeatures = [],
  extraExistingSkills = [],
  extraExistingExpertises = [],
}: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();

  const existingSkillsSet = useMemo(() => {
    const out = new Set<Skill>();
    extraExistingSkills.forEach((s) => {
      if (isSkill(s)) out.add(s);
    });
    return out;
  }, [extraExistingSkills]);

  const existingExpertisesSet = useMemo(() => {
    const out = new Set<Skill>();
    extraExistingExpertises.forEach((s) => {
      if (isSkill(s)) out.add(s);
    });
    return out;
  }, [extraExistingExpertises]);
  
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
      data.basicChoices.race.forEach(s => allSkills.add(s));
      data.basicChoices.background.forEach(s => allSkills.add(s));

      // Add race option choices
      Object.values(data.choiceOptions).flat().forEach(s => allSkills.add(s));
    }
    
    // Save both skillsSchema AND flat skills array
    const skillsArray = Array.from(allSkills);
    
    updateFormData({
      skillsSchema: data,
      skills: skillsArray
    });
    
    nextStep();
  });

  const watchedChoiceOptions = form.watch('choiceOptions');
  const choiceOptions = useMemo(() => watchedChoiceOptions ?? {}, [watchedChoiceOptions]);

  // Calculate choices from RaceChoiceOptions (e.g. Custom Lineage "Skill" option)
  const raceOptionChoices = useMemo(() => {
    if (!race.raceChoiceOptions || !formData.raceChoiceSelections) return [];

    const selections = formData.raceChoiceSelections;
    const selectedOptionIds = Object.values(selections);

    return race.raceChoiceOptions
      .filter(opt => selectedOptionIds.includes(opt.optionId) && opt.skillProficiencies)
      .map(opt => ({
        option: opt,
        proficiencies: normalizeSkillProficiencies(opt.skillProficiencies)
      }))
      .filter((item): item is { option: typeof item.option, proficiencies: NonNullable<typeof item.proficiencies> } => item.proficiencies !== null);
  }, [race.raceChoiceOptions, formData.raceChoiceSelections]);

  const raceOptionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    raceOptionChoices.forEach(item => {
        // Safe access to choiceCount
        const prof = item.proficiencies;
        if (prof && !Array.isArray(prof)) {
            counts[item.option.optionId] = prof.choiceCount || 0;
        }
    });
    return counts;
  }, [raceOptionChoices]);
  
  const raceOptionSkills = useMemo(() => {
    const byOption: Record<string, Skill[]> = {};

    raceOptionChoices.forEach(({ option, proficiencies }) => {
      if (Array.isArray(proficiencies)) return;
      byOption[option.optionId] = proficiencies.options?.includes("ANY" as unknown as Skill)
        ? [...SkillsEnum]
        : proficiencies.options ?? [];
    });

    return byOption;
  }, [raceOptionChoices]);

  // Опція раси, де запропонованих навичок рівно стільки, скільки треба обрати, вибору не лишає:
  // її обрали ще на кроці опцій раси, тож навичка проставляється сама.
  useEffect(() => {
    Object.entries(raceOptionSkills).forEach(([optionId, skills]) => {
      if (choiceOptions[optionId] !== undefined) return;
      if (skills.length === 0 || skills.length > (raceOptionCounts[optionId] ?? 0)) return;

      form.setValue(`choiceOptions.${optionId}`, skills);
    });
  }, [raceOptionSkills, raceOptionCounts, choiceOptions, form]);

  // Calculate total choice count from race options
  const raceOptionsTotalCount = raceOptionChoices.reduce((acc, curr) => {
    // Narrow type safely
    const prof = curr.proficiencies;
    if (prof && !Array.isArray(prof)) {
        return acc + (prof.choiceCount || 0);
    }
    return acc;
  }, 0);

  populateSkills<typeof race>(race)

  useEffect(() => {
    form.register('basicChoices')
    form.register('basicChoices.race')
    form.register('basicChoices.selectedClass')
    form.register('basicChoices.background' as any)
    form.register('choiceOptions')
    form.register('tashaChoices')
    form.register('isTasha')
    form.register('_requiredCount')
    form.register('_raceCount')
    form.register('_classCount')
  }, [form])

  const isTasha = form.watch('isTasha') ?? false
  const tashaChoices = form.watch('tashaChoices') || []
  
  const watchedBasicChoices = form.watch('basicChoices');
  
  const basicChoices = useMemo(() => watchedBasicChoices ?? {
    race: [],
    selectedClass: [],
    background: [],
  }, [watchedBasicChoices]);

  // Skills shown as "locked" in UI - only in non-Tasha mode
  const lockedSkillsInUI = useMemo(() => {
    if (isTasha) return []; // In Tasha mode, NO skills are locked in UI (they become free choices)
    return fixedSkillsFromRaceAndBackground; // In non-Tasha mode, these are locked
  }, [isTasha, fixedSkillsFromRaceAndBackground]);

  // Skills that are always locked (granted from other sources / other steps)
  const alwaysLockedGrantedSkills = useMemo(() => Array.from(existingSkillsSet), [existingSkillsSet]);

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

  const backgroundSkillProficiencies = useMemo(() => {
    if (Array.isArray(background.skillProficiencies)) return null;
    return normalizeSkillProficiencies(background.skillProficiencies) as SkillProficienciesChoice;
  }, [background.skillProficiencies]);

  const raceCount = getSkillProficienciesCount(raceSkillProficiencies)
  const classCount = getSkillProficienciesCount(selectedClass.skillProficiencies)
  const backgroundCount = getSkillProficienciesCount(backgroundSkillProficiencies)
  const subraceCount = getSkillProficienciesCount(normalizeSkillProficiencies(selectedSubrace?.skillProficiencies))
  const variantCount = 0

  // In Tasha mode, race/background/subrace fixed proficiencies become a unified choice pool.
  // The amount of choices should match the effective non‑Tasha total coming from these origins,
  // i.e. fixed skills count is treated as distinct (no duplicate inflation).
  const tashaFixedConvertibleCount = fixedSkillsFromRaceAndBackground.length;

  const raceChoiceOnlyCount = Array.isArray(raceSkillProficiencies) ? 0 : raceCount;
  const backgroundChoiceOnlyCount = backgroundSkillProficiencies ? backgroundCount : 0;
  const normalizedSubraceProfs = normalizeSkillProficiencies(selectedSubrace?.skillProficiencies);
  const subraceChoiceOnlyCount = normalizedSubraceProfs && !Array.isArray(normalizedSubraceProfs) ? subraceCount : 0;

  const tashaChoiceCountTotal = isTasha
    ? (
        tashaFixedConvertibleCount +
        raceChoiceOnlyCount +
        classCount +
        backgroundChoiceOnlyCount +
        subraceChoiceOnlyCount +
        variantCount +
        raceOptionsTotalCount
      )
    : 0;
    
  const tashaChoiceCountCurrent = tashaChoiceCountTotal - (tashaChoices?.length ?? 0)

  const basicCounts = {
    race: raceCount - (basicChoices?.race?.length ?? 0),
    selectedClass: classCount - (basicChoices?.selectedClass?.length ?? 0),
    background: backgroundCount - (basicChoices?.background?.length ?? 0)
  }

  const entries = Object.entries(basicChoices) as [GroupName, Skill[]][];

  const skillsByGroup = useMemo(() => {
    const groups = {
      race: raceSkillProficiencies as SkillProficienciesChoice,
      selectedClass: selectedClass.skillProficiencies as SkillProficienciesChoice,
      background: backgroundSkillProficiencies as SkillProficienciesChoice,
    };

    // Expand ANY for all groups
    Object.values(groups).forEach(g => {
      if (g?.options?.includes("ANY" as any)) {
        g.options = [...SkillsEnum] as any;
      }
    });

    return groups;
  }, [raceSkillProficiencies, selectedClass.skillProficiencies, backgroundSkillProficiencies]);

  const groupsWithOptions = entries.filter(
    ([groupName]) => (skillsByGroup[groupName]?.options?.length ?? 0) > 0
  );

  const checkIfSelectedByOthers = (groupName: GroupName | string, skill: Skill) => {
    // Skills granted by other steps/sources are always treated as already selected
    if (existingSkillsSet.has(skill)) return true;

    // In non‑Tasha mode, fixed proficiencies (race/background/subrace) are always already selected
    if (!isTasha && fixedSkillsFromRaceAndBackground.includes(skill)) return true;

    // Check main groups
    const mainGroups: Record<string, string[]> = {
      race: Array.isArray(race.skillProficiencies)
        ? (race.skillProficiencies as string[])
        : (basicChoices.race as string[]),
      selectedClass: basicChoices.selectedClass as string[],
      background: Array.isArray(background.skillProficiencies)
        ? (background.skillProficiencies as string[])
        : (basicChoices.background as string[]),
    };

    // Check race option groups - use copy to avoid mutation
    const raceOptionGroups: Record<string, string[]> = { ...choiceOptions };

    // Remove the current group from checking to avoid self-reference
    // For main groups:
    if (groupName in mainGroups) {
       delete mainGroups[groupName as keyof typeof mainGroups];
    }
    // For race options:
    if (groupName in raceOptionGroups) {
       delete raceOptionGroups[groupName];
    }

    // Check main groups
    const inMain = Object.values(mainGroups).some(value => value?.includes(skill));
    if (inMain) return true;

    // Race Option Skills (e.g. Custom Lineage Skill)
    const inRaceOptions = Object.values(raceOptionGroups).some(value => value.includes(skill));
    if (inRaceOptions) return true;
    
    return false;
  }

  const lockedSkillsInUICombined = useMemo(() => {
    if (isTasha) {
      // In Tasha mode, show only always-locked granted skills here (fixed race/bg skills are convertible)
      return [...alwaysLockedGrantedSkills];
    }
    // In non‑Tasha, show all locked skills (race/bg/subrace fixed + always-locked granted)
    const out = new Set<Skill>();
    lockedSkillsInUI.forEach((s) => out.add(s));
    alwaysLockedGrantedSkills.forEach((s) => out.add(s));
    return Array.from(out);
  }, [isTasha, lockedSkillsInUI, alwaysLockedGrantedSkills]);

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
      form.setValue('_backgroundCount' as any, backgroundCount);
    }
  }, [isTasha, tashaChoiceCountTotal, raceCount, classCount, backgroundCount, form]);

  /// Крок пускав далі з невитраченими виборами, і чарівник виходив без двох володінь навичками —
  /// а полагодити це на листі вже не можна (P4-regression-2014-07). Рішення власника 2026-09-06:
  /// «Далі» неактивна, доки вибори не витрачені.
  useEffect(() => {
    const isRaceOptionUnspent = Object.entries(raceOptionCounts).some(
      ([optId, max]) => (choiceOptions[optId] ?? []).length !== (max || 0)
    );

    const isUnspent = isTasha
      ? tashaChoices.length !== tashaChoiceCountTotal
      : (basicChoices.selectedClass ?? []).length !== classCount ||
        (basicChoices.race ?? []).length !== raceCount ||
        isRaceOptionUnspent;

    onNextDisabledChange?.(isUnspent);
  }, [isTasha, tashaChoices.length, tashaChoiceCountTotal, basicChoices, classCount, choiceOptions, raceOptionCounts, onNextDisabledChange, raceCount]);

  const handleToggleTashaSkill = (skill: Skill) => {
    if (existingSkillsSet.has(skill)) return;
    const has = tashaChoices.includes(skill)

    // Can't select if already at limit and not currently selected
    if (!has && tashaChoiceCountCurrent < 1) return;

    const updated = has
      ? tashaChoices.filter(c => c !== skill)
      : [...tashaChoices, skill]

    form.setValue('tashaChoices', updated)
  }

  const handleToggleBasicSkill = ({skill, groupName}: { skill: Skill, groupName: GroupName }) => {
    if (existingSkillsSet.has(skill)) return;
    const current = basicChoices[groupName] ?? []
    const has = current.includes(skill)

    if (!has && basicCounts[groupName] < 1) return;

    const updated = has
      ? current.filter(c => c !== skill)
      : [...current, skill]

    form.setValue(`basicChoices.${groupName}` as any, updated)
  }

  const handleToggleOptionSkill = ({skill, optionId}: { skill: Skill, optionId: string }) => {
    if (existingSkillsSet.has(skill)) return;
    const current = choiceOptions[optionId] ?? [];
    const has = current.includes(skill);
    const max = raceOptionCounts[optionId] || 0;
    const currentCount = current.length;

    if (!has && currentCount >= max) return;

    const updated = has
      ? current.filter(c => c !== skill)
      : [...current, skill];
    
    form.setValue(`choiceOptions.${optionId}`, updated);
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
                  const isExisting = existingSkillsSet.has(skill.eng as any);
                  const isExistingExpertise = existingExpertisesSet.has(skill.eng as any);
                  const isSelected = tashaChoices.includes(skill.eng);
                  const isReachedLimit = tashaChoiceCountCurrent < 1;
                  const isDisabled = isExisting || (!isSelected && isReachedLimit);
                  const active = isSelected || isExisting;
                  
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      disabled={isDisabled}
                      className={`justify-between border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white ${
                        active ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : ""
                      } ${isDisabled ? "opacity-60" : ""}`}
                      onClick={() => !isExisting && handleToggleTashaSkill(skill.eng)}
                    >
                      <span className="flex items-center gap-2">
                        {isExisting && <Lock className="h-3 w-3" />}
                        {skill.ukr}
                        {isExistingExpertise && <span className="text-xs opacity-80">(Експертиза)</span>}
                      </span>
                      {active && <Check className="h-4 w-4" />}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Show fixed skills from background/race/subrace in NON-Tasha mode */}
              {lockedSkillsInUICombined.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-amber-200">Фіксовані навички</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lockedSkillsInUICombined.map((skill) => {
                      const skillGroup = engEnumSkills.find((s) => s.eng === skill);
                      const isExpertise = existingExpertisesSet.has(skill as any);
                      return (
                        <Badge key={skill} className={clsx(
                          "border",
                          isExpertise 
                            ? "bg-blue-900/30 text-blue-100 border-blue-700/50"
                            : "bg-amber-900/30 text-amber-100 border-amber-700/50"
                        )}>
                          {skillGroup?.ukr} {isExpertise && "(Експертиза)"}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="text-xs text-amber-300/70 mt-2">
                    Ці навички вже отримані з інших джерел і не змінюються на цьому кроці
                  </p>
                </div>
              )}

              {/* Race Options Skills (e.g. Custom Lineage Skill) */}
              {raceOptionChoices.map((rc) => {
                const optId = rc.option.optionId.toString();
                // Safe access to proficiencies
                const prof = rc.proficiencies;
                if (!prof || Array.isArray(prof)) return null;

                const max = prof.choiceCount || 0;
                const currentSelections = choiceOptions[optId] ?? [];
                const remaining = max - currentSelections.length;

                const availableOptions = raceOptionSkills[optId] ?? [];

                return (
                  <div key={`race-opt-${optId}`} className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                     <div className="flex items-center justify-between text-sm text-slate-300">
                      <div className="font-semibold text-white">
                        {rc.option.choiceGroupName} - {rc.option.optionName}
                      </div>
                      <span className="text-xs uppercase tracking-wide">Залишок: <span className="text-indigo-300">{remaining}</span></span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableOptions.map((skill: Skill, sIdx: number) => {
                         const skillGroup = engEnumSkills.find((s) => s.eng === skill);
                         if (!skillGroup) return null;
                         
                         const isSelected = currentSelections.includes(skill);
                         const isSelectedByOthers = checkIfSelectedByOthers(optId, skill);
                         const isExisting = existingSkillsSet.has(skill);
                         const isExistingExpertise = existingExpertisesSet.has(skill);
                         const isMaxReached = remaining < 1;
                         const isDisabled = (!isSelected && isMaxReached) || isSelectedByOthers;
                         const active = isSelected || isSelectedByOthers;

                         return (
                           <Button
                            key={sIdx}
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
                            onClick={() => !isSelectedByOthers && !isExisting && handleToggleOptionSkill({
                              skill: skillGroup.eng as Skill, // ensure type
                              optionId: optId
                            })}
                           >
                            <span className="flex items-center gap-2">
                              {isSelectedByOthers && <Lock className="h-3 w-3" />}
                              {skillGroup.ukr}
                              {isExistingExpertise && <span className="text-xs opacity-80">(Експертиза)</span>}
                            </span>
                             {active && <Check className="h-4 w-4" />}
                             {isSelectedByOthers && !isExistingExpertise && <span className="text-xs opacity-70">(вже обрано)</span>}
                           </Button>
                         )
                      })}
                    </div>
                  </div>
                )
              })}

              {groupsWithOptions.map(([groupName, choices], index) => (
                <div key={index} className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <div className="font-semibold text-white">
                      {groupName === 'race' ? 'Навички за расу' : groupName === 'selectedClass' ? 'Навички за клас' : 'Навички за передісторію'}
                    </div>
                    <span className="text-xs uppercase tracking-wide">Залишок: <span className="text-indigo-300">{basicCounts[groupName]}</span></span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(skillsByGroup[groupName]?.options ?? []).map((skill, skillIndex) => {
                      const skillGroup = engEnumSkills.find((s) => s.eng === skill)
                      if (!skillGroup) return null;
                      const isSelected = (choices ?? []).includes(skill)
                      const isSelectedByOthers = checkIfSelectedByOthers(groupName, skill)
                      const isExisting = existingSkillsSet.has(skill as any)
                      const isExistingExpertise = existingExpertisesSet.has(skill as any)
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
                          onClick={() => !isSelectedByOthers && !isExisting && handleToggleBasicSkill({
                            skill: Skills[skillGroup.eng],
                            groupName: groupName
                          })}
                        >
                          <span className="flex items-center gap-2">
                            {isSelectedByOthers && <Lock className="h-3 w-3" />}
                            {skillGroup.ukr}
                            {isExistingExpertise && <span className="text-xs opacity-80">(Експертиза)</span>}
                          </span>
                          {active && <Check className="h-4 w-4" />}
                          {isSelectedByOthers && !isExistingExpertise && <span className="text-xs opacity-70">(вже обрано)</span>}
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
