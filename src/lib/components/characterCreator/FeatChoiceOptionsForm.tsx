"use client";

import { useEffect, useMemo, useRef } from "react";
import { useStepForm } from "@/hooks/useStepForm";
import { featChoiceOptionsSchema } from "@/lib/zod/schemas/persCreateSchema";
import { FeatPrisma } from "@/lib/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useWatch } from "react-hook-form";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Skills } from "@prisma/client";
import { SkillsEnum } from "@/lib/types/enums";
import { engEnumSkills, expertiseTranslations } from "@/lib/refs/translation";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";

interface Props {
  selectedFeat?: FeatPrisma | null;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

type Group = {
  groupName: string;
  options: NonNullable<FeatPrisma["featChoiceOptions"]>;
  pickCount: number;
  isSkill: boolean;
  isExpertise: boolean;
};

/**
 * Extracts skill enum value from optionNameEng
 * Handles formats like "Skill Expert Proficiency (ATHLETICS)" -> "ATHLETICS"
 * @param optionNameEng - The English option name
 * @returns The skill enum value or original string
 */
const extractSkillFromOptionName = (optionNameEng: string): string => {
  // Try to extract skill from parentheses
  const match = optionNameEng.match(/\(([A-Z_]+)\)$/);
  if (match) {
    return match[1];
  }
  return optionNameEng;
};

/**
 * Determines if all options in a group are skills
 * @param options - Array of feat choice options
 * @returns true if all options are from Skills enum
 */
const isSkillGroup = (options: NonNullable<FeatPrisma["featChoiceOptions"]>): boolean => {
  return options.every(opt => {
    // Extract skill name from optionNameEng before checking
    const skillName = extractSkillFromOptionName(opt.choiceOption.optionNameEng);
    return (SkillsEnum as readonly string[]).includes(skillName);
  });
};

/**
 * Determines if a group represents expertise choices based on its name
 * @param groupName - The name of the choice group
 * @returns true if group name contains expertise-related keywords
 */
const isExpertiseGroup = (groupName: string): boolean => {
  const lowerName = groupName.toLowerCase();
  return lowerName.includes('expertise') || 
         lowerName.includes('експертиза') ||
         lowerName.includes('expert');
};

const FeatChoiceOptionsForm = ({ selectedFeat, formId, onNextDisabledChange }: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit: baseOnSubmit } = useStepForm(featChoiceOptionsSchema, (data) => {
    updateFormData({ featChoiceSelections: data.featChoiceSelections });
    nextStep();
  });
  
  const watchedSelections = useWatch({
    control: form.control,
    name: "featChoiceSelections",
  });
  const selections = useMemo(
    () => ((watchedSelections ?? {}) as Record<string, number>),
    [watchedSelections]
  );
  const prevDisabledRef = useRef<boolean | undefined>(undefined);

  /**
   * Gets all skills the character has from SkillsForm
   * Handles both Tasha's mode and basic mode
   */
  const existingSkills = useMemo(() => {
    const skills = new Set<string>();
    
    // Primary source: flat skills array from SkillsForm
    if (formData.skills && Array.isArray(formData.skills)) {
      formData.skills.forEach(skill => {
        if (Object.values(Skills).includes(skill as Skills)) {
          skills.add(skill);
        }
      });
    }
    
    return Array.from(skills);
  }, [formData.skills]);

  /**
   * Gets all expertises the character already has from ExpertiseForm
   */
  const existingExpertises = useMemo(() => {
    const expertises = new Set<string>();
    
    if (formData.expertiseSchema?.expertises) {
      formData.expertiseSchema.expertises.forEach(exp => expertises.add(exp));
    }
    
    return Array.from(expertises);
  }, [formData.expertiseSchema]);

  const optionsToUse = useMemo(() => selectedFeat?.featChoiceOptions || [], [selectedFeat]);

  const groupedChoices = useMemo<Group[]>(() => {
    const groups = new Map<string, NonNullable<FeatPrisma["featChoiceOptions"]>>();

    for (const fco of optionsToUse) {
      const groupName = fco.choiceOption.groupName || "Опції";
      const bucket = groups.get(groupName) ?? [];
      bucket.push(fco);
      groups.set(groupName, bucket);
    }

    return Array.from(groups.entries()).map(([groupName, options]) => ({
      groupName,
      options,
      pickCount: 1,
      isSkill: isSkillGroup(options),
      isExpertise: isExpertiseGroup(groupName),
    }));
  }, [optionsToUse]);

  /**
   * Gets skills selected in THIS form (for live expertise updates)
   * Only includes skill groups that are NOT expertise groups
   */
  const selectedSkillsInForm = useMemo(() => {
    const skills = new Set<string>();
    groupedChoices.forEach(group => {
      // Only look at skill groups that are NOT expertise groups
      if (group.isSkill && !group.isExpertise) {
        const selectedOptionId = selections[group.groupName];
        if (selectedOptionId) {
          const option = group.options.find(opt => opt.choiceOptionId === selectedOptionId);
          if (option) {
            // Extract skill name from optionNameEng (e.g., "Skill Expert Proficiency (ATHLETICS)" -> "ATHLETICS")
            const skillName = extractSkillFromOptionName(option.choiceOption.optionNameEng);
            skills.add(skillName);
          }
        }
      }
    });
    
    return Array.from(skills);
  }, [groupedChoices, selections]);
  
  /**
   * Combined list of ALL skills available for expertise selection
   * Includes both existing skills from SkillsForm AND skills just selected in this form
   */
  const allAvailableSkillsForExpertise = useMemo(() => {
    const combined = new Set<string>([
      ...existingSkills,
      ...selectedSkillsInForm
    ]);
    
    return Array.from(combined);
  }, [existingSkills, selectedSkillsInForm]);

  /**
   * Gets all selected option names across all groups (to prevent duplicates)
   * For expertise groups, only track selections from OTHER expertise groups
   */
  const allSelectedOptions = useMemo(() => {
    const selected = new Set<string>();
    Object.entries(selections).forEach(([groupName, optionId]) => {
      groupedChoices.forEach(group => {
        if (group.groupName === groupName) {
          const option = group.options.find(opt => opt.choiceOptionId === optionId);
          if (option) {
            // For skill groups, extract the actual skill name
            if (group.isSkill || group.isExpertise) {
              const skillName = extractSkillFromOptionName(option.choiceOption.optionNameEng);
              selected.add(skillName);
            } else {
              selected.add(option.choiceOption.optionNameEng);
            }
          }
        }
      });
    });
    return Array.from(selected);
  }, [selections, groupedChoices]);

  /**
   * Gets selected expertises from THIS form (to prevent duplicate expertises)
   */
  const selectedExpertisesInForm = useMemo(() => {
    const expertises = new Set<string>();
    Object.entries(selections).forEach(([groupName, optionId]) => {
      const group = groupedChoices.find(g => g.groupName === groupName);
      if (group?.isExpertise && group?.isSkill) {
        const option = group.options.find(opt => opt.choiceOptionId === optionId);
        if (option) {
          const skillName = extractSkillFromOptionName(option.choiceOption.optionNameEng);
          expertises.add(skillName);
        }
      }
    });
    return Array.from(expertises);
  }, [selections, groupedChoices]);

  useEffect(() => {
    let disabled: boolean;
    if (!selectedFeat) {
      disabled = true;
    } else if (groupedChoices.length === 0) {
      disabled = false;
    } else {
      disabled = groupedChoices.some((g) => !selections[g.groupName]);
    }

    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [selectedFeat, groupedChoices, selections, onNextDisabledChange]);

  const selectOption = (groupName: string, optionId: number) => {
    const next = { ...(selections || {}), [groupName]: optionId };
    form.setValue("featChoiceSelections", next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  /**
   * Determines if an option should be disabled based on skill/expertise rules
   * @param group - The group containing the option
   * @param opt - The specific option to check
   * @returns Object with disabled status and optional reason
   */
  const isOptionDisabled = (group: Group, opt: NonNullable<FeatPrisma["featChoiceOptions"]>[0]): { disabled: boolean; reason?: string } => {
    // Extract the actual skill name from optionNameEng
    const optionName = extractSkillFromOptionName(opt.choiceOption.optionNameEng);
    const isSelected = selections[group.groupName] === opt.choiceOptionId;
    
    // If this is a SKILL group (not expertise)
    if (group.isSkill && !group.isExpertise) {
      // Already have this skill from previous steps?
      if (existingSkills.includes(optionName)) {
        return { disabled: true, reason: 'Вже маєте' };
      }
      // Already selected in another NON-EXPERTISE group in this form?
      if (!isSelected && allSelectedOptions.includes(optionName)) {
        // Check if it's selected in another skill (non-expertise) group
        const isInOtherSkillGroup = groupedChoices.some(g => 
          g.isSkill && !g.isExpertise && 
          g.groupName !== group.groupName &&
          selections[g.groupName] !== undefined &&
          g.options.some(o => 
            o.choiceOptionId === selections[g.groupName] &&
            extractSkillFromOptionName(o.choiceOption.optionNameEng) === optionName
          )
        );
        if (isInOtherSkillGroup) {
          return { disabled: true, reason: 'Вже обрано' };
        }
      }
    }
    
    // If this is an EXPERTISE group
    if (group.isExpertise && group.isSkill) {
      // Can only pick expertise if we have the skill (from existing OR just selected in this form)
      const hasSkill = allAvailableSkillsForExpertise.includes(optionName);
      
      if (!hasSkill) {
        return { disabled: true, reason: 'Потрібна навичка' };
      }
      
      // Already have expertise in this?
      if (existingExpertises.includes(optionName)) {
        return { disabled: true, reason: 'Вже експерт' };
      }
      
      // Already selected as expertise in ANOTHER expertise group in this form?
      if (!isSelected && selectedExpertisesInForm.includes(optionName)) {
        return { disabled: true, reason: 'Вже обрано' };
      }
    }
    
    return { disabled: false };
  };

  if (!selectedFeat) {
    return (
      <Card className="p-4 text-center text-slate-200">
        Спершу оберіть рису.
      </Card>
    );
  }

  if (groupedChoices.length === 0) {
    return (
      <Card className="p-4 text-center text-slate-200">
        Ця риса не має додаткових виборів. Можна рухатися далі.
      </Card>
    );
  }

  return (
    <form id={formId} onSubmit={baseOnSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-slate-300">Риса</p>
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">Опції риси</h2>
        <p className="text-sm text-slate-400">Риса &quot;{translateValue(selectedFeat.name)}&quot; вимагає вибору.</p>
      </div>

      <div className="space-y-4">
        {groupedChoices.map((group) => (
          <Card
            key={group.groupName}
            className=""
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Група</p>
                  <p className="text-base font-semibold text-white">{group.groupName}</p>
                </div>
                <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                  Оберіть {group.pickCount}
                </Badge>
              </div>

              {group.isExpertise && group.isSkill && (
                <p className="text-xs text-amber-400">
                  ⚠️ Експертизу можна обрати ТІЛЬКИ в навичках, які ви вже маєте!
                </p>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {group.options.map((opt) => {
                  const optionId = opt.choiceOptionId;
                  const optionNameEng = opt.choiceOption.optionNameEng;
                  const isSelected = selections[group.groupName] === optionId;
                  const { disabled, reason } = isOptionDisabled(group, opt);
                  
                  // Get Ukrainian translation for skills/expertises
                  let label = opt.choiceOption.optionName;
                  if (group.isSkill || group.isExpertise) {
                    // Extract skill name and translate it
                    const skillName = extractSkillFromOptionName(optionNameEng);
                    const skillTranslation = engEnumSkills.find(s => s.eng === skillName)?.ukr 
                      || expertiseTranslations[skillName as Skills];
                    label = skillTranslation || label || skillName;
                  } else {
                    label = label || optionNameEng;
                  }

                  return (
                    <Button
                      key={optionId}
                      type="button"
                      variant="outline"
                      disabled={disabled && !isSelected}
                      className={`justify-between border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white ${
                        isSelected ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : ""
                      } ${disabled && !isSelected ? "opacity-60 cursor-not-allowed" : ""}`}
                      onClick={() => !disabled && selectOption(group.groupName, optionId)}
                    >
                      <span className="flex items-center gap-2">
                        {label}
                        {disabled && reason && (
                          <span className="text-xs opacity-70">({reason})</span>
                        )}
                      </span>
                      {isSelected && <Check className="h-4 w-4" />}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </form>
  );
};

export default FeatChoiceOptionsForm;
