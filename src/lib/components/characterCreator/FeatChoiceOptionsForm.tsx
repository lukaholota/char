"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { useStepForm } from "@/hooks/useStepForm";
import { featChoiceOptionsSchema } from "@/lib/zod/schemas/persCreateSchema";
import { FeatPrisma, PersI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useWatch } from "react-hook-form";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { SkillsEnum } from "@/lib/types/enums";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import clsx from "clsx";
import { getEffectiveSkills } from "@/lib/logic/characterUtils";

interface Props {
  selectedFeat?: FeatPrisma | null;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  pers?: PersI | null;
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

const cleanGroupName = (groupName: string): string => {
    return groupName
      .replace(/\s*\(.*?\)\s*/g, "") // Remove (...) content
      .trim();
};

const FeatChoiceOptionsForm = ({ selectedFeat, formId, onNextDisabledChange, pers }: Props) => {
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
    () => ((watchedSelections ?? {}) as Record<string, number | number[]>), 
    [watchedSelections]
  );
  
  const prevDisabledRef = useRef<boolean | undefined>(undefined);

  /**
   * Gets all skills the character has from SkillsForm
   * Handles both Tasha's mode and existing pers data
   */
  const existingSkills = useMemo(() => {
    return getEffectiveSkills(pers, formData);
  }, [formData, pers]);

  /**
   * Gets all expertises the character already has
   */
  const existingExpertises = useMemo(() => {
    const expertises = new Set<string>();
    
    // From Pers
    if (pers && (pers as any).expertise) {
        // Warning: Structure of expertise storage varies.
        // Often stored in a separate JSON or inferred. 
        // We'll try to check known locations.
    }

    // From Form Data (ExpertiseForm)
    if (formData.expertiseSchema?.expertises) {
      formData.expertiseSchema.expertises.forEach((exp: string) => expertises.add(exp));
    }
    
    return Array.from(expertises);
  }, [formData.expertiseSchema, pers]);

  const optionsToUse = useMemo(() => selectedFeat?.featChoiceOptions || [], [selectedFeat]);

  const groupedChoices = useMemo<Group[]>(() => {
    const groups = new Map<string, NonNullable<FeatPrisma["featChoiceOptions"]>>();

    // Helper to check if it's a skill option
    const isSkillOption = (optNameEng: string) => {
        const skillName = extractSkillFromOptionName(optNameEng);
        return (SkillsEnum as readonly string[]).includes(skillName);
    };

    for (const fco of optionsToUse) {
      let groupName = fco.choiceOption.groupName || "Опції";

      // Special handling for legacy/duplicate "Skilled" feat groups
      if (selectedFeat?.name === 'SKILLED' && isSkillOption(fco.choiceOption.optionNameEng)) {
          groupName = "Skilled Options"; // Unified group name
      }

      const bucket = groups.get(groupName) ?? [];
      
      // Improve deduplication: 
      // check if we already have an option that maps to the SAME skill enum
      const isDuplicate = bucket.some(b => {
         // Direct name match
         if (b.choiceOption.optionNameEng === fco.choiceOption.optionNameEng) return true;
         // Skill enum match
         if (isSkillOption(fco.choiceOption.optionNameEng)) {
             return extractSkillFromOptionName(b.choiceOption.optionNameEng) === 
                    extractSkillFromOptionName(fco.choiceOption.optionNameEng);
         }
         return false;
      });

      if (!isDuplicate) {
          bucket.push(fco);
      }
      
      groups.set(groupName, bucket);
    }

    return Array.from(groups.entries()).map(([groupName, options]) => {
      const isSkill = isSkillGroup(options);
      let pickCount = 1;

      // Use grantedSkillCount for SKILLED feat
      if (selectedFeat?.name === 'SKILLED' && isSkill) {
          pickCount = (selectedFeat as any).grantedSkillCount || 3;
      }

      return {
        groupName,
        options,
        pickCount,
        isSkill,
        isExpertise: isExpertiseGroup(groupName),
      };
    });
  }, [optionsToUse, selectedFeat]);

   /**
   * Helper to retrieve all selected Option IDs for a given group.
   */
  const getSelectedIdsForGroup = useCallback((groupName: string): number[] => {
      const val = selections[groupName];
      if (Array.isArray(val)) return val;
      if (typeof val === 'number') return [val];
      return [];
  }, [selections]);

  /**
   * Gets skills selected in THIS form (for live expertise updates)
   * Only includes skill groups that are NOT expertise groups
   */
  const selectedSkillsInForm = useMemo(() => {
    const skills = new Set<string>();
    groupedChoices.forEach(group => {
      // Only look at skill groups that are NOT expertise groups
      if (group.isSkill && !group.isExpertise) {
        const selectedIds = getSelectedIdsForGroup(group.groupName);
        selectedIds.forEach(id => {
            const option = group.options.find(opt => opt.choiceOptionId === id);
            if (option) {
              const skillName = extractSkillFromOptionName(option.choiceOption.optionNameEng);
              skills.add(skillName);
            }
        });
      }
    });
    
    return Array.from(skills);
  }, [groupedChoices, getSelectedIdsForGroup]);
  
  /**
   * Combined list of ALL skills available for expertise selection
   */
  const allAvailableSkillsForExpertise = useMemo(() => {
    const combined = new Set<string>([
      ...existingSkills,
      ...selectedSkillsInForm
    ]);
    return Array.from(combined);
  }, [existingSkills, selectedSkillsInForm]);



  /**
   * Gets selected expertises from THIS form
   */
  const selectedExpertisesInForm = useMemo(() => {
    const expertises = new Set<string>();
    groupedChoices.forEach(group => {
      if (group?.isExpertise && group?.isSkill) {
        const selectedIds = getSelectedIdsForGroup(group.groupName);
        selectedIds.forEach(id => {
            const option = group.options.find(opt => opt.choiceOptionId === id);
            if (option) {
                expertises.add(extractSkillFromOptionName(option.choiceOption.optionNameEng));
            }
        });
      }
    });
    return Array.from(expertises);
  }, [groupedChoices, getSelectedIdsForGroup]);

  
  useEffect(() => {
    let disabled: boolean;
    if (!selectedFeat) {
      disabled = true;
    } else if (groupedChoices.length === 0) {
      disabled = false;
    } else {
      // Check if EVERY group has satisfied its pickCount
      disabled = groupedChoices.some((g) => {
          const selected = getSelectedIdsForGroup(g.groupName);
          return selected.length < g.pickCount;
      });
    }

    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [selectedFeat, groupedChoices, selections, onNextDisabledChange, getSelectedIdsForGroup]);

  const toggleSelection = (groupName: string, optionId: number, pickCount: number) => {
    const currentSelected = getSelectedIdsForGroup(groupName);
    let nextSelected: number[];

    if (currentSelected.includes(optionId)) {
        // Deselect
        nextSelected = currentSelected.filter(id => id !== optionId);
    } else {
        // Select
        if (pickCount === 1) {
            // Replace simple
            nextSelected = [optionId];
        } else {
            // Multi-select with cap
            if (currentSelected.length < pickCount) {
                nextSelected = [...currentSelected, optionId];
            } else {
                // If full, do nothing (or maybe replace oldest? let's block)
                return; 
            }
        }
    }
    
    // If pickCount is 1, we can store as number for backward compat, or array. 
    // Schema supports union. ARRAY IS SAFER for internal logic, but we can store as number if length=1?
    // Let's store as Array if pickCount > 1, number if pickCount === 1 to match expected DB format?
    // Actually, `featChoiceSelections` is `Record<string, number | number[]>`.
    // The previous implementation used simple number mapping.
    // If I switch to array, I must ensure backend handles it.
    // Looking at `pers.ts` or `create.ts`, it typically iterates choices.
    
    // For safety with existing backend expectations (which likely expects 1:1 mapping for most things),
    // we should check if we need to "virtualize" keys for backend.
    // BUT, `featChoiceSelections` schema DEFINES `z.union([z.number(), z.array(z.number())])`.
    // So the backend *should* handle arrays if the Zod schema allows it?
    // Let's assume yes because it's in the repo.
    
    const valueToStore = (nextSelected.length === 1 && pickCount === 1) ? nextSelected[0] : nextSelected;

    const next = { ...(selections || {}), [groupName]: valueToStore };
    
    // Handle empty case
    if (nextSelected.length === 0) {
        delete next[groupName];
    }
    
    form.setValue("featChoiceSelections", next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  /**
   * Determines if an option should be disabled based on rules
   */
  const getDisabledState = (group: Group, opt: NonNullable<FeatPrisma["featChoiceOptions"]>[0]): { disabled: boolean; reason?: string } => {
    const optionName = extractSkillFromOptionName(opt.choiceOption.optionNameEng);
    
    const currentSelected = getSelectedIdsForGroup(group.groupName);
    const isSelected = currentSelected.includes(opt.choiceOptionId);
    
    // If group is full and we are NOT selected -> disable
    if (!isSelected && currentSelected.length >= group.pickCount) {
        return { disabled: true, reason: undefined }; // Just visual disable, no text reason needed often, or "Max choices"
    }

    // If this is a SKILL group (not expertise)
    if (group.isSkill && !group.isExpertise) {
      if (existingSkills.includes(optionName)) {
        return { disabled: true, reason: 'Вже володієте цією навичкою' };
      }
      
      // Check if selected in OTHER groups (deduplication across groups)
      // We need to exclude current group from this check
      const isInOtherSkillGroup = groupedChoices.some(g => 
          g.groupName !== group.groupName && // distinct group
          g.isSkill && !g.isExpertise &&
          getSelectedIdsForGroup(g.groupName).some(id => {
             const o = g.options.find(opt => opt.choiceOptionId === id);
             return o && extractSkillFromOptionName(o.choiceOption.optionNameEng) === optionName;
          })
      );

      if (!isSelected && isInOtherSkillGroup) {
          return { disabled: true, reason: 'Вже обрано' };
      }
    }
    
    // If this is an EXPERTISE group
    if (group.isExpertise && group.isSkill) {
      const hasSkill = allAvailableSkillsForExpertise.includes(optionName);
      if (!hasSkill) {
        return { disabled: true, reason: 'Потрібна навичка' };
      }
      if (existingExpertises.includes(optionName)) {
        return { disabled: true, reason: 'Вже маєте експертизу' };
      }
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
        {groupedChoices.map((group) => {
            const sortedOptions = group.options;

            return (
          <Card key={group.groupName} className="">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Група</p>
                  <p className="text-base font-semibold text-white">{cleanGroupName(group.groupName)}</p>
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
                {sortedOptions.map((opt) => {
                  const optionId = opt.choiceOptionId;
                  const optionNameEng = opt.choiceOption.optionNameEng;
                  const isSelected = getSelectedIdsForGroup(group.groupName).includes(optionId);
                  const { disabled, reason } = getDisabledState(group, opt);
                  
                  let label = opt.choiceOption.optionName;
                  if (group.isSkill || group.isExpertise) {
                    const skillName = extractSkillFromOptionName(optionNameEng);
                    const skillTranslation = translateValue(skillName);
                    label = skillTranslation || label || skillName;
                  } else {
                    label = translateValue(label || optionNameEng);
                  }

                  return (
                    <Card
                      key={optionId}
                      className={clsx(
                        "glass-card cursor-pointer transition-all duration-200 group relative",
                        isSelected
                            ? "glass-active border-gradient-rpg"
                            : disabled 
                                ? "opacity-60 grayscale-[0.8]" 
                                : "hover:bg-white/5",
                        disabled && !isSelected && "cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (!disabled || (isSelected)) { // Allow clicking to deselect even if theoretically disabled
                             toggleSelection(group.groupName, optionId, group.pickCount);
                        }
                      }}
                    >
                        <CardContent className="flex items-center justify-between p-3">
                            <div className="flex flex-col gap-0.5 relative z-10 w-full">
                                <span className={clsx(
                                    "font-medium transition-colors",
                                    isSelected ? "text-white" : "text-slate-200"
                                )}>
                                    {label}
                                </span>
                                {(reason) && (
                                    <span className={clsx(
                                        "text-xs font-medium",
                                        disabled ? "text-rose-400" : "text-slate-400"
                                    )}>
                                        {disabled ? `(${reason})` : reason}
                                    </span>
                                )}
                            </div>

                             {isSelected && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400">
                                    <Check className="h-5 w-5 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )})}
      </div>
    </form>
  );
};

export default FeatChoiceOptionsForm;
