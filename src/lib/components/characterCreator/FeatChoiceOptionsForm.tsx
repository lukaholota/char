"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useStepForm } from "@/hooks/useStepForm";
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
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { ControlledInfoDialog, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { checkPrerequisite } from "@/lib/logic/prerequisiteUtils";
import { PrerequisiteConfirmationDialog } from "@/lib/components/ui/PrerequisiteConfirmationDialog";
import { backgroundFeatChoiceOptionsSchema, featChoiceOptionsSchema } from "@/lib/zod/schemas/persCreateSchema";

interface Props {
  selectedFeat?: FeatPrisma | null;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  pers?: PersI | null;
  mode?: 'race' | 'background';
}

type Group = {
  groupName: string;
  options: NonNullable<FeatPrisma["featChoiceOptions"]>;
  pickCount: number;
  isSkill: boolean;
  isExpertise: boolean;
  isAbility: boolean;
  isManeuver: boolean;
  isInvocation: boolean;
  isFightingStyle: boolean;
};

const ABILITY_NAME_ENG = new Set([
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA",
]);

const SIMPLE_ABILITY_MAP = {
  STR: true,
  DEX: true,
  CON: true,
  INT: true,
  WIS: true,
  CHA: true,
} as const;

const toAbilityKey = (value: string): keyof typeof SIMPLE_ABILITY_MAP | null => {
  const v = (value || "").trim();
  if (v in SIMPLE_ABILITY_MAP) return v as keyof typeof SIMPLE_ABILITY_MAP;
  switch (v) {
    case "Strength":
      return "STR";
    case "Dexterity":
      return "DEX";
    case "Constitution":
      return "CON";
    case "Intelligence":
      return "INT";
    case "Wisdom":
      return "WIS";
    case "Charisma":
      return "CHA";
    default:
      return null;
  }
};

const getChoiceOptionEffect = (
  opt: NonNullable<FeatPrisma["featChoiceOptions"]>[number]
):
  | { kind: "ASI"; ability: keyof typeof SIMPLE_ABILITY_MAP; amount: number }
  | { kind: "SKILL_PROFICIENCY" | "SKILL_EXPERTISE"; skill: string; amount: number }
  | null => {
  const co: any = opt?.choiceOption;
  const kind = String(co?.effectKind ?? "").trim();

  if (kind === "ASI") {
    const ability = String(co?.effectAbility ?? "").trim();
    const abilityKey = toAbilityKey(ability);
    if (!abilityKey) return null;
    const amount = Number(co?.effectAmount ?? 1);
    return { kind: "ASI", ability: abilityKey, amount: Number.isFinite(amount) ? amount : 1 };
  }

  if (kind === "SKILL_PROFICIENCY" || kind === "SKILL_EXPERTISE") {
    const skill = String(co?.effectSkill ?? "").trim();
    if (!skill) return null;
    const amount = Number(co?.effectAmount ?? 1);
    return {
      kind: kind as "SKILL_PROFICIENCY" | "SKILL_EXPERTISE",
      skill,
      amount: Number.isFinite(amount) ? amount : 1,
    };
  }

  return null;
};

const isAbilityOptionGroup = (options: NonNullable<FeatPrisma["featChoiceOptions"]>): boolean => {
  // Prefer explicit effect metadata if present.
  const allHaveAsiEffect = options.every((opt) => {
    const eff = getChoiceOptionEffect(opt);
    return eff?.kind === "ASI";
  });
  if (allHaveAsiEffect) return true;

  // Fallback to legacy string heuristics.
  return options.every((opt) => {
    const name = (opt.choiceOption?.optionNameEng || opt.choiceOption?.optionName || "").trim();
    const extracted = extractSkillFromOptionName(name);
    return ABILITY_NAME_ENG.has(extracted);
  });
};

/**
 * Extracts skill enum value from optionNameEng
 * Handles formats like "Skill Expert Proficiency (ATHLETICS)" -> "ATHLETICS"
 * @param optionNameEng - The English option name
 * @returns The skill enum value or original string
 */
const extractSkillFromOptionName = (optionNameEng: string): string => {
  // Try to extract skill from parentheses
  const match = optionNameEng.match(/\(([^)]+)\)\s*$/);
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
  // Prefer explicit effect metadata if present.
  const allHaveSkillEffect = options.every((opt) => {
    const eff = getChoiceOptionEffect(opt);
    return eff?.kind === "SKILL_PROFICIENCY";
  });
  if (allHaveSkillEffect) return true;

  // Fallback to legacy string heuristics.
  return options.every((opt) => {
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

const localizeGroupName = (groupName: string, featKey?: string | null): string => {
  const cleaned = cleanGroupName(groupName);
  if (!featKey) return cleaned;

  const localizedFeat = translateValue(featKey);
  if (!localizedFeat || localizedFeat === featKey) return cleaned;

  // Replace occurrences like "... OBSERVANT" with localized feat name.
  // Keep the surrounding text (often already Ukrainian).
  return cleaned.split(featKey).join(localizedFeat);
};

const FeatChoiceOptionsForm = ({ selectedFeat, formId, onNextDisabledChange, pers, mode = 'race' }: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState<string>("");
  const [infoFeatures, setInfoFeatures] = useState<Array<{ name: string; description: string; shortDescription?: string | null }>>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPick, setPendingPick] = useState<{ groupName: string; optionId: number; pickCount: number } | null>(null);
  const [prereqReason, setPrereqReason] = useState<string | undefined>(undefined);

  const schema = mode === 'race' ? featChoiceOptionsSchema : backgroundFeatChoiceOptionsSchema;
  const storageKey = mode === 'race' ? 'featChoiceSelections' : 'backgroundFeatChoiceSelections';
  
  const { form, onSubmit: baseOnSubmit } = useStepForm(schema, (data) => {
    updateFormData({ [storageKey]: (data as any)[storageKey] });
    nextStep();
  });
  
  const watchedSelections = useWatch({
    control: form.control,
    name: storageKey as any,
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

    // From Pers skills (preferred)
    const persSkills = (pers as any)?.skills as any[] | undefined;
    if (Array.isArray(persSkills)) {
      for (const s of persSkills) {
        const name = String(s?.name ?? "").trim();
        const prof = String(s?.proficiencyType ?? "").trim();
        if (!name) continue;
        if (prof === "EXPERTISE") expertises.add(name);
      }
    }

    // From Form Data (ExpertiseForm)
    if (formData.expertiseSchema?.expertises) {
      formData.expertiseSchema.expertises.forEach((exp: string) => expertises.add(exp));
    }

    return Array.from(expertises);
  }, [formData.expertiseSchema, pers]);

  const currentAbilityScores = useMemo(() => {
    // Level-up / edit flows: use actual persisted scores.
    if (pers) {
      const p: any = pers;
      return {
        STR: Number(p.str) || 0,
        DEX: Number(p.dex) || 0,
        CON: Number(p.con) || 0,
        INT: Number(p.int) || 0,
        WIS: Number(p.wis) || 0,
        CHA: Number(p.cha) || 0,
      } as Record<keyof typeof SIMPLE_ABILITY_MAP, number>;
    }

    // Character creation flow: best-effort preview from current ASI step inputs.
    const base: Record<keyof typeof SIMPLE_ABILITY_MAP, number> = {
      STR: 10,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10,
    };

    const asiSystem = (formData as any)?.asiSystem;
    if (asiSystem === "POINT_BUY") {
      const arr = (formData as any)?.asi as Array<{ ability: keyof typeof SIMPLE_ABILITY_MAP; value: number }> | undefined;
      if (Array.isArray(arr)) {
        for (const s of arr) {
          const k = s?.ability;
          if (k && k in base) base[k] = Number(s.value) || base[k];
        }
      }
    } else if (asiSystem === "SIMPLE") {
      const arr = (formData as any)?.simpleAsi as Array<{ ability: keyof typeof SIMPLE_ABILITY_MAP; value: number }> | undefined;
      if (Array.isArray(arr)) {
        for (const s of arr) {
          const k = s?.ability;
          if (k && k in base) base[k] = Number(s.value) || base[k];
        }
      }
    } else if (asiSystem === "CUSTOM") {
      const arr = (formData as any)?.customAsi as Array<{ ability: keyof typeof SIMPLE_ABILITY_MAP; value: number }> | undefined;
      if (Array.isArray(arr)) {
        for (const s of arr) {
          const k = s?.ability;
          if (k && k in base) base[k] = Number(s.value) || base[k];
        }
      }
    }

    return base;
  }, [pers, formData]);

  const optionsToUse = useMemo(() => selectedFeat?.featChoiceOptions || [], [selectedFeat]);

  const existingChoiceOptionIds = useMemo(() => {
    const ids = new Set<number>();

    // From existing character (level-up / edit flows)
    const persChoiceOptions = (pers as any)?.choiceOptions as any[] | undefined;
    if (Array.isArray(persChoiceOptions)) {
      for (const co of persChoiceOptions) {
        const id = Number(co?.choiceOptionId);
        if (Number.isFinite(id)) ids.add(id);
      }
    }

    // From current form selections (class/subclass choices selected earlier in creation flow)
    const addFromRecord = (rec: unknown) => {
      if (!rec || typeof rec !== "object") return;
      for (const v of Object.values(rec as Record<string, unknown>)) {
        if (Array.isArray(v)) {
          for (const x of v) {
            const id = Number(x);
            if (Number.isFinite(id)) ids.add(id);
          }
        } else {
          const id = Number(v);
          if (Number.isFinite(id)) ids.add(id);
        }
      }
    };

    addFromRecord((formData as any)?.classChoiceSelections);
    addFromRecord((formData as any)?.subclassChoiceSelections);

    return ids;
  }, [formData, pers]);

  const isManeuverOption = useCallback((optNameEng: string, groupName?: string) => {
    if ((groupName || "").toLowerCase().includes("манев")) return true;
    return /\(Maneuver\)\s*$/.test((optNameEng || "").trim());
  }, []);

  const isInvocationGroupName = useCallback((groupName: string) => {
    const name = (groupName || "").trim();
    return (
      name === "Потойбічні виклики" ||
      name.startsWith("Потойбічні виклики #") ||
      name === "Eldritch Invocations" ||
      name.startsWith("Eldritch Invocations #")
    );
  }, []);

  const isFightingStyleGroupName = useCallback((groupName: string) => {
    const name = (groupName || "").trim();
    return (
      name === "Бойовий стиль" ||
      name.startsWith("Бойовий стиль #") ||
      name === "Fighting Style" ||
      name.startsWith("Fighting Style #") ||
      name === "Fighting Styles" ||
      name.startsWith("Fighting Styles #")
    );
  }, []);

  const stripMarkdownPreview = useCallback((value: string) => {
    return value
      .replace(/\r\n/g, "\n")
      .replace(/<a\s+[^>]*>(.*?)<\/a>/gi, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const previewTextFromChoiceOption = useCallback(
    (features?: any[]) => {
      const list = (features || []).map((x) => x?.feature).filter(Boolean) as any[];
      const first = list.find((f) => (f.shortDescription || f.description) && String(f.shortDescription || f.description).trim());
      if (!first) return "";
      return stripMarkdownPreview(String(first.shortDescription || first.description));
    },
    [stripMarkdownPreview]
  );

  const openFeaturesInfo = useCallback((title: string, features?: any[]) => {
    const normalized = (features || [])
      .map((item: any) => item?.feature)
      .filter(Boolean)
      .map((feat: any) => ({
        name: String(feat?.name ?? ""),
        description: String(feat?.description ?? ""),
        shortDescription: feat?.shortDescription ?? null,
      }))
      .filter((f: any) => f.name.trim() || f.description.trim() || (f.shortDescription ?? "").toString().trim());

    setInfoTitle(title);
    setInfoFeatures(normalized);
    setInfoOpen(true);
  }, []);

  const { groupedChoices, groupAliases } = useMemo(() => {
    const groups = new Map<string, NonNullable<FeatPrisma["featChoiceOptions"]>>();

    // Helper to check if it's a skill option
    const isSkillOption = (optNameEng: string) => {
        const skillName = extractSkillFromOptionName(optNameEng);
        return (SkillsEnum as readonly string[]).includes(skillName);
    };

    for (const fco of optionsToUse) {
      let groupName = fco.choiceOption.groupName || "Опції";

      // Martial Adept: hide legacy/incorrect maneuver options that caused duplicate groups.
      // Canonical Battle Master maneuvers are the ones with "...(Maneuver)" suffix.
      if (selectedFeat?.name === "MARTIAL_ADEPT") {
        const isManeuverish = isManeuverOption(fco.choiceOption.optionNameEng, groupName);
        if (isManeuverish && !/\(Maneuver\)\s*$/.test((fco.choiceOption.optionNameEng || "").trim())) {
          continue;
        }
      }

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

    const prelim = Array.from(groups.entries()).map(([groupName, options]) => {
      const isSkill = isSkillGroup(options);
      const isAbility = isAbilityOptionGroup(options);
      const isExpertiseByEffect = options.every((opt) => getChoiceOptionEffect(opt)?.kind === "SKILL_EXPERTISE");
      let pickCount = 1;

      // Use grantedSkillCount for SKILLED feat
      if (selectedFeat?.name === "SKILLED" && isSkill) {
        pickCount = (selectedFeat as any).grantedSkillCount || 3;
      }

      const isManeuver = options.every((opt) => isManeuverOption(opt.choiceOption.optionNameEng, groupName));
      const isInvocation = isInvocationGroupName(groupName);
      const isFightingStyle = isFightingStyleGroupName(groupName);

      // Feat-specific pick count overrides.
      if (selectedFeat?.name === "MARTIAL_ADEPT" && isManeuver) {
        pickCount = 2;
      }

      return {
        groupName,
        options,
        pickCount,
        isSkill,
        isExpertise: isExpertiseByEffect || isExpertiseGroup(groupName),
        isAbility,
        isManeuver,
        isInvocation,
        isFightingStyle,
      } as Group;
    });

    // Ability choice groups are explicitly seeded via featChoiceOptions.
    const filtered = prelim;

    // Deduplicate groups that are the same options under different group names.
    // Keep a canonical groupName and remember aliases so stored selections still work.
    const aliases: Record<string, string[]> = {};
    const bySig = new Map<string, Group[]>();
    const normalizeForSig = (g: Group, opt: NonNullable<FeatPrisma["featChoiceOptions"]>[number]) => {
      const eff = getChoiceOptionEffect(opt);
      if ((g.isSkill || g.isExpertise) && eff && (eff.kind === "SKILL_PROFICIENCY" || eff.kind === "SKILL_EXPERTISE")) {
        return `SKILL:${eff.skill}`;
      }
      if (g.isAbility && eff && eff.kind === "ASI") {
        return `ABILITY:${eff.ability}`;
      }

      const raw = (opt.choiceOption?.optionNameEng || opt.choiceOption?.optionName || "").trim();
      const extracted = extractSkillFromOptionName(raw);
      if (g.isSkill || g.isExpertise) return `SKILL:${extracted}`;
      if (g.isAbility) return `ABILITY:${toAbilityKey(extracted) ?? extracted}`;
      return `RAW:${raw}`;
    };

    const makeSig = (g: Group) => {
      const names = g.options.map((o) => normalizeForSig(g, o)).sort();
      return `${g.pickCount}|${g.isSkill ? "S" : "_"}${g.isExpertise ? "E" : "_"}${g.isAbility ? "A" : "_"}|${names.join("|")}`;
    };

    for (const g of filtered) {
      const sig = makeSig(g);
      bySig.set(sig, [...(bySig.get(sig) ?? []), g]);
    }

    const nameScore = (name: string) => {
      let score = 0;
      if (/[А-Яа-яІіЇїЄєҐґ]/.test(name)) score += 10;
      if (selectedFeat?.name && name !== selectedFeat.name) score += 2;
      if (!/^[A-Z_]+$/.test(name)) score += 1;
      return score;
    };

    const deduped: Group[] = [];
    for (const groupList of bySig.values()) {
      if (groupList.length === 1) {
        const only = groupList[0];
        aliases[only.groupName] = [only.groupName];
        deduped.push(only);
        continue;
      }

      const canonical = [...groupList].sort((a, b) => nameScore(b.groupName) - nameScore(a.groupName))[0];
      const mergedOptions = groupList.flatMap((g) => g.options);

      // keep options unique by semantic meaning (ability/skill), not by choiceOptionId
      const seen = new Set<string>();
      const uniqueOptions = mergedOptions.filter((o) => {
        let key = `ID:${o.choiceOptionId}`;
        const eff = getChoiceOptionEffect(o);
        if ((canonical.isSkill || canonical.isExpertise) && eff && (eff.kind === "SKILL_PROFICIENCY" || eff.kind === "SKILL_EXPERTISE")) {
          key = `SKILL:${eff.skill}`;
        } else if (canonical.isAbility && eff && eff.kind === "ASI") {
          key = `ABILITY:${eff.ability}`;
        } else {
          const raw = (o.choiceOption?.optionNameEng || o.choiceOption?.optionName || "").trim();
          const extracted = extractSkillFromOptionName(raw);
          if (canonical.isSkill || canonical.isExpertise) key = `SKILL:${extracted}`;
          else if (canonical.isAbility) key = `ABILITY:${toAbilityKey(extracted) ?? extracted}`;
        }

        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const canonicalGroup: Group = {
        ...canonical,
        options: uniqueOptions,
      };

      aliases[canonical.groupName] = groupList.map((g) => g.groupName);
      deduped.push(canonicalGroup);
    }

    return {
      groupedChoices: deduped,
      groupAliases: aliases,
    };
  }, [optionsToUse, selectedFeat, isInvocationGroupName, isManeuverOption, isFightingStyleGroupName]);

  // Keep group option ordering stable (non-reactive sorting).
  // We only compute the order once per selected feat and group.
  const frozenOrderRef = useRef<Record<string, number[]>>({});
  const frozenForFeatRef = useRef<number | null>(null);

  useEffect(() => {
    const featId = selectedFeat?.featId ?? null;
    if (frozenForFeatRef.current !== featId) {
      frozenForFeatRef.current = featId;
      frozenOrderRef.current = {};
    }
  }, [selectedFeat?.featId]);

   /**
   * Helper to retrieve all selected Option IDs for a given group.
   */
  const getSelectedIdsForGroup = useCallback((groupName: string): number[] => {
      const aliasNames = groupAliases[groupName] ?? [groupName];
      const ids = new Set<number>();

      for (const alias of aliasNames) {
        const val = selections[alias];
        if (Array.isArray(val)) {
          val.forEach((v) => typeof v === "number" && ids.add(v));
        } else if (typeof val === "number") {
          ids.add(val);
        }
      }

      return Array.from(ids);
  }, [selections, groupAliases]);

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

    // Remove any legacy alias keys for this group so validation doesn't get confused.
    const aliasNames = groupAliases[groupName] ?? [];
    for (const alias of aliasNames) {
      if (alias !== groupName) delete next[alias];
    }
    
    // Handle empty case
    if (nextSelected.length === 0) {
        delete next[groupName];
    }
    
    form.setValue(storageKey as any, next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  /**
   * Determines if an option should be disabled based on rules
   */
  const getDisabledState = (
    group: Group,
    opt: NonNullable<FeatPrisma["featChoiceOptions"]>[0]
  ): { disabled: boolean; prereqUnmet?: boolean; reason?: string } => {
    const optionName = extractSkillFromOptionName(opt.choiceOption.optionNameEng);
    
    const currentSelected = getSelectedIdsForGroup(group.groupName);
    const isSelected = currentSelected.includes(opt.choiceOptionId);

    // Prevent duplicates for maneuver/invocation-like groups.
    if ((group.isManeuver || group.isInvocation || group.isFightingStyle) && !isSelected && existingChoiceOptionIds.has(opt.choiceOptionId)) {
      return { disabled: true, reason: "Вже маєте" };
    }

    // Invocation prerequisites: mark as unavailable if unmet.
    if (group.isInvocation && !isSelected) {
      // For Eldritch Adept specifically, prerequisites are special in 5e rules.
      // We implement a safe baseline: if a prerequisite exists, require meeting it.
      // (Warlock level/pact is unknown during character creation; in level-up flows `pers` can provide it.)
      const warlockLevel = (() => {
        const p = pers as any;
        const mainIsWarlock = p?.class?.name === "WARLOCK_2014";
        if (mainIsWarlock) return Number(p?.level) || 0;
        const multi = (p?.multiclasses || []).find((m: any) => m?.class?.name === "WARLOCK_2014");
        if (multi) return Number(multi?.classLevel) || 0;
        return 0;
      })();

      const pact = (() => {
        // Pact boon is stored as a ChoiceOption with optionNameEng starting with "Pact of"
        const p = pers as any;
        const co = (p?.choiceOptions || []).find((x: any) => typeof x?.optionNameEng === "string" && x.optionNameEng.startsWith("Pact of"));
        return co?.optionNameEng ? String(co.optionNameEng) : undefined;
      })();

      const prereqResult = checkPrerequisite(opt.choiceOption.prerequisites, {
        classLevel: warlockLevel,
        pact,
        existingChoiceOptionIds: Array.from(existingChoiceOptionIds),
      });

      if (!prereqResult.met) {
        return { disabled: false, prereqUnmet: true, reason: prereqResult.reason || "Не виконані вимоги" };
      }
    }
    
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
            const groupKey = group.groupName;
            const existingFrozen = frozenOrderRef.current[groupKey];

            if (!existingFrozen) {
              const weight = (s: { disabled: boolean; prereqUnmet?: boolean }) => {
                if (s.disabled) return 2;
                if (s.prereqUnmet) return 1;
                return 0;
              };

              const initial = [...group.options].sort((a, b) => {
                const aState = getDisabledState(group, a);
                const bState = getDisabledState(group, b);
                const aw = weight(aState);
                const bw = weight(bState);
                if (aw !== bw) return aw - bw;

                const aLabel = String(a.choiceOption?.optionName || a.choiceOption?.optionNameEng || "");
                const bLabel = String(b.choiceOption?.optionName || b.choiceOption?.optionNameEng || "");
                return aLabel.localeCompare(bLabel, "uk");
              });

              frozenOrderRef.current[groupKey] = initial.map((o) => o.choiceOptionId);
            }

            const frozenIds = frozenOrderRef.current[groupKey] ?? [];
            const byId = new Map(group.options.map((o) => [o.choiceOptionId, o] as const));
            const sortedOptions = [
              ...frozenIds.map((id) => byId.get(id)).filter(Boolean),
              ...group.options
                .filter((o) => !frozenIds.includes(o.choiceOptionId))
                .sort((a, b) => {
                  const aLabel = String(a.choiceOption?.optionName || a.choiceOption?.optionNameEng || "");
                  const bLabel = String(b.choiceOption?.optionName || b.choiceOption?.optionNameEng || "");
                  return aLabel.localeCompare(bLabel, "uk");
                }),
            ] as typeof group.options;

            const hasFeatureDetails = sortedOptions.some((o) => {
              const features = (o as any)?.choiceOption?.features;
              if (!Array.isArray(features) || features.length === 0) return false;
              const first = features.map((x: any) => x?.feature).find((f: any) => (f?.shortDescription || f?.description) && String(f.shortDescription || f.description).trim());
              return Boolean(first);
            });

            const useDetailedCards = hasFeatureDetails && !group.isSkill;

            return (
          <Card key={group.groupName} className="">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Група</p>
                  <p className="text-base font-semibold text-white">{localizeGroupName(group.groupName, selectedFeat?.name)}</p>
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

              {useDetailedCards ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <InfoSectionTitle>{localizeGroupName(group.groupName, selectedFeat?.name)}</InfoSectionTitle>
                    {group.pickCount > 1 ? (
                      <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                        Обрано: {getSelectedIdsForGroup(group.groupName).length}/{group.pickCount}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {sortedOptions.map((opt) => {
                      const optionId = opt.choiceOptionId;
                      const optionNameEng = opt.choiceOption.optionNameEng;
                      const isSelected = getSelectedIdsForGroup(group.groupName).includes(optionId);
                      const isOwned = (group.isManeuver || group.isInvocation || group.isFightingStyle) && existingChoiceOptionIds.has(optionId);
                      const { disabled, prereqUnmet, reason } = getDisabledState(group, opt);

                      let label = opt.choiceOption.optionName || translateValue(optionNameEng);
                      if (group.isSkill || group.isExpertise) {
                        const eff = getChoiceOptionEffect(opt);
                        const skillName =
                          eff && (eff.kind === "SKILL_PROFICIENCY" || eff.kind === "SKILL_EXPERTISE")
                            ? eff.skill
                            : extractSkillFromOptionName(optionNameEng);
                        const skillTranslation = translateValue(skillName);
                        label = skillTranslation || label || skillName;
                      } else {
                        const eff = getChoiceOptionEffect(opt);
                        const raw = extractSkillFromOptionName(optionNameEng || label || "");
                        const abilityKey = group.isAbility
                          ? (eff && eff.kind === "ASI" ? eff.ability : toAbilityKey(raw))
                          : null;

                        const translated = translateValue(label || optionNameEng);
                        if (abilityKey && currentAbilityScores) {
                          const score = currentAbilityScores[abilityKey];
                          const amount = eff && eff.kind === "ASI" ? eff.amount : 1;
                          const next = Math.min(20, score + amount);
                          const title = translateValue(abilityKey) || translated;
                          label = `${title}: ${score} → ${next}`;
                        } else {
                          label = translated;
                        }
                      }

                      const preview = previewTextFromChoiceOption((opt as any)?.choiceOption?.features);

                      return (
                        <Card
                          key={optionId}
                          className={clsx(
                            "glass-card cursor-pointer transition-all duration-200",
                            isSelected ? "glass-active" : "",
                            disabled && !isSelected && "opacity-60 grayscale-[0.8] cursor-not-allowed",
                            prereqUnmet && !isSelected && "border-rose-500/30 opacity-80"
                          )}
                          onClick={(e) => {
                            if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;

                            if (disabled) return;
                            if (isSelected) {
                              toggleSelection(group.groupName, optionId, group.pickCount);
                              return;
                            }
                            if (prereqUnmet) {
                              setPrereqReason(reason);
                              setPendingPick({ groupName: group.groupName, optionId, pickCount: group.pickCount });
                              setConfirmOpen(true);
                              return;
                            }

                            toggleSelection(group.groupName, optionId, group.pickCount);
                          }}
                        >
                          <CardContent className="relative flex items-start justify-between gap-4 p-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-lg font-semibold text-white">
                                    {label}
                                  </div>
                                  {preview ? (
                                    <div className="mt-1 line-clamp-2 text-sm text-slate-300">{preview}</div>
                                  ) : null}
                                  {reason ? (
                                    <div className={clsx("mt-1 text-xs font-medium", disabled || prereqUnmet ? "text-rose-400" : "text-slate-400")}>
                                      {disabled || prereqUnmet ? `(${reason})` : reason}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="flex items-center gap-2">
                                  {isSelected || isOwned ? (
                                    <div className={clsx(isSelected ? "text-cyan-400" : "text-slate-400")}> 
                                      <Check className={clsx("h-5 w-5", isSelected && "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]")} />
                                    </div>
                                  ) : null}

                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    className="glass-panel border-gradient-rpg h-8 w-8 rounded-full text-slate-100 transition-all duration-200 hover:text-white focus-visible:ring-cyan-400/30"
                                    data-stop-card-click
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openFeaturesInfo(label, (opt as any)?.choiceOption?.features);
                                    }}
                                    aria-label={`Деталі: ${label}`}
                                  >
                                    <HelpCircle className="h-5 w-5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {sortedOptions.map((opt) => {
                    const optionId = opt.choiceOptionId;
                    const optionNameEng = opt.choiceOption.optionNameEng;
                    const isSelected = getSelectedIdsForGroup(group.groupName).includes(optionId);
                    const isOwned = (group.isManeuver || group.isInvocation || group.isFightingStyle) && existingChoiceOptionIds.has(optionId);
                    const { disabled, prereqUnmet, reason } = getDisabledState(group, opt);

                    let label = opt.choiceOption.optionName;
                    if (group.isSkill || group.isExpertise) {
                      const eff = getChoiceOptionEffect(opt);
                      const skillName =
                        eff && (eff.kind === "SKILL_PROFICIENCY" || eff.kind === "SKILL_EXPERTISE")
                          ? eff.skill
                          : extractSkillFromOptionName(optionNameEng);
                      const skillTranslation = translateValue(skillName);
                      label = skillTranslation || label || skillName;
                    } else {
                      const eff = getChoiceOptionEffect(opt);
                      const raw = extractSkillFromOptionName(optionNameEng || label || "");
                      const abilityKey = group.isAbility
                        ? (eff && eff.kind === "ASI" ? eff.ability : toAbilityKey(raw))
                        : null;
                      const translated = translateValue(label || optionNameEng);
                      if (abilityKey && currentAbilityScores) {
                        const score = currentAbilityScores[abilityKey];
                        const amount = eff && eff.kind === "ASI" ? eff.amount : 1;
                        const next = Math.min(20, score + amount);
                        const title = translateValue(abilityKey) || translated;
                        label = `${title}: ${score} → ${next}`;
                      } else {
                        label = translated;
                      }
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
                          disabled && !isSelected && "cursor-not-allowed",
                          prereqUnmet && !isSelected && "border-rose-500/30 opacity-80"
                        )}
                        onClick={() => {
                          if (disabled) return;
                          if (isSelected) {
                            toggleSelection(group.groupName, optionId, group.pickCount);
                            return;
                          }
                          if (prereqUnmet) {
                            setPrereqReason(reason);
                            setPendingPick({ groupName: group.groupName, optionId, pickCount: group.pickCount });
                            setConfirmOpen(true);
                            return;
                          }
                          toggleSelection(group.groupName, optionId, group.pickCount);
                        }}
                      >
                        <CardContent className="flex items-center justify-between p-3">
                          <div className="flex flex-col gap-0.5 relative z-10 w-full">
                            <span
                              className={clsx(
                                "font-medium transition-colors",
                                isSelected ? "text-white" : "text-slate-200"
                              )}
                            >
                              {label}
                            </span>
                            {reason ? (
                              <span
                                className={clsx(
                                  "text-xs font-medium",
                                  disabled || prereqUnmet ? "text-rose-400" : "text-slate-400"
                                )}
                              >
                                {disabled || prereqUnmet ? `(${reason})` : reason}
                              </span>
                            ) : null}
                          </div>

                          {isSelected || isOwned ? (
                            <div className={clsx(
                              "absolute right-3 top-1/2 -translate-y-1/2",
                              isSelected ? "text-cyan-400" : "text-slate-400"
                            )}>
                              <Check className={clsx("h-5 w-5", isSelected && "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]")} />
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )})}
      </div>

      <ControlledInfoDialog open={infoOpen} onOpenChange={setInfoOpen} title={infoTitle}>
        <div className="space-y-4">
          {infoFeatures.length === 0 ? (
            <p className="text-sm text-slate-300">Немає деталей для показу.</p>
          ) : (
            infoFeatures.map((f) => (
              <div key={f.name} className="glass-panel rounded-xl border border-slate-800/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{f.name}</p>
                </div>
                {f.description ? (
                  <FormattedDescription content={f.description} className="mt-2 text-slate-200/90" />
                ) : null}
              </div>
            ))
          )}
        </div>
      </ControlledInfoDialog>

      <PrerequisiteConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        reason={prereqReason}
        onConfirm={() => {
          if (!pendingPick) return;
          toggleSelection(pendingPick.groupName, pendingPick.optionId, pendingPick.pickCount);
          setPendingPick(null);
          setPrereqReason(undefined);
        }}
      />
    </form>
  );
};

export default FeatChoiceOptionsForm;
