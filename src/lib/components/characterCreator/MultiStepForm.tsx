"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Weapon } from "@prisma/client";
import { SpellcastingType } from "@prisma/client";
import RacesForm from "@/lib/components/characterCreator/RacesForm";
import {CharacterCreateHeader} from "@/lib/components/characterCreator/CharacterCreateHeader";
import {activateCreatorDraftStorage, usePersFormStore} from "@/lib/stores/persFormStore";
import ClassesForm from "@/lib/components/characterCreator/ClassesForm";
import BackgroundsForm from "@/lib/components/characterCreator/BackgroundsForm";
import ASIForm from "@/lib/components/characterCreator/ASIForm";
import SkillsForm from "@/lib/components/characterCreator/SkillsForm";
import { BackgroundI, ClassI, RaceI, FeatPrisma } from "@/lib/types/model-types";
import EquipmentForm from "@/lib/components/characterCreator/EquipmentForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, Circle } from "lucide-react";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import clsx from "clsx";
import NameForm from "@/lib/components/characterCreator/NameForm";
import ClassChoiceOptionsForm from "@/lib/components/characterCreator/ClassChoiceOptionsForm";
import FeatChoiceOptionsForm from "@/lib/components/characterCreator/FeatChoiceOptionsForm";
import CreationSpellsForm from "@/lib/components/characterCreator/CreationSpellsForm";
import CreationFeatSpellsForm, { type CreationSpellFeat } from "@/lib/components/characterCreator/CreationFeatSpellsForm";
import { hasFeatSpellChoice } from "@/rules/feat-spell-choices";
import { findCreationSpellQuota } from "@/rules/class-spell-choices-2024";
import { hasCreationSpellChoice2014 } from "@/rules/class-spell-choices-2014";
import ClassOptionalFeaturesForm from "@/lib/components/characterCreator/ClassOptionalFeaturesForm";
import RaceSubraceVariantForm from "@/lib/components/characterCreator/RaceSubraceVariantForm";
import RaceChoiceOptionsForm from "@/lib/components/characterCreator/RaceChoiceOptionsForm";
import SubclassForm from "@/lib/components/characterCreator/SubclassForm";
import SubclassChoiceOptionsForm from "@/lib/components/characterCreator/SubclassChoiceOptionsForm";
import FeatsForm from "@/lib/components/characterCreator/FeatsForm";
import { BackgroundFeatsForm } from "@/lib/components/characterCreator/BackgroundFeatsForm";
import { ExpertiseForm } from "@/lib/components/characterCreator/ExpertiseForm";
import { LanguagesForm } from "@/lib/components/characterCreator/LanguagesForm";
import { resolveCreationSteps } from "@/lib/components/characterCreator/creation-step-resolver";
import { buildCreationAbilityScores } from "@/rules/character-creation";
import WeaponMasteryForm from "@/lib/components/characterCreator/WeaponMasteryForm";
import { CreationStepRuleLink } from "@/lib/components/characterCreator/CreationStepRuleLink";
import type { CreationStepRuleExcerpts } from "@/lib/content/creation-step-rule-excerpts";

import { createCharacter } from "@/lib/actions/character";
import { extractSkillsFromChoiceOption, extractExpertisesFromChoiceOption, extractSkillFromOptionName } from "@/lib/logic/characterUtils";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { getRulesStrategy } from "@/rules/strategies";
import { countOriginLanguageChoices } from "@/rules/languages";
import { isCreationStepCompleted } from "./creation-step-completion";
import { hasWeaponMastery } from "@/rules/weapon-mastery";
import { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

interface Props {
  races: RaceI[];
  classes: ClassI[];
  backgrounds: BackgroundI[];
  weapons: Weapon[];
  feats: FeatPrisma[];
  initialRuleset?: "RULES_2014" | "RULES_2024";
  ruleExcerpts?: CreationStepRuleExcerpts;
}

export const MultiStepForm = (
  {
    races,
    classes,
    backgrounds,
    weapons,
    feats,
    initialRuleset = "RULES_2014",
    ruleExcerpts,
  }: Props
) => {
  activateCreatorDraftStorage(initialRuleset);

  const { data: session, status: sessionStatus } = useSession();
  const {
    currentStep,
    prevStep,
    resetForm,
    formData,
    prevRaceId,
    setPrevRaceId,
    setCurrentStep,
    setTotalSteps,
    isHydrated,
    updateFormData,
  } = usePersFormStore();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDataForStep, setInitialDataForStep] = useState<string>("");
  const [highestStepCompleted, setHighestStepCompleted] = useState<number>(0);
  const router = useModeRouter();
  const didMountRef = useRef(false);

  const currentRuleset = (formData.ruleset ?? initialRuleset ?? "RULES_2014") as "RULES_2014" | "RULES_2024";

  useEffect(() => {
    if (!isHydrated) return;

    // If the persisted store contains keys that only exist in Level Up flow,
    // wipe it to avoid leaking invocations/choices into character creation.
    const fd: any = formData as any;
    const hasLevelUpOnlyKeys =
      fd &&
      (fd.levelUpPath !== undefined ||
        fd.infusionSelections !== undefined ||
        fd.levelUpHpIncrease !== undefined ||
        fd.classOptionalFeatureReplacementSelections !== undefined);
    if (hasLevelUpOnlyKeys) {
      resetForm();
      usePersFormStore.persist.clearStorage();
      return;
    }

    setInitialDataForStep(JSON.stringify(formData));
    // When moving forward, update the highest reached step
    if (currentStep - 1 > highestStepCompleted) {
      setHighestStepCompleted(currentStep - 1);
    }
  }, [currentStep, isHydrated, formData, highestStepCompleted, resetForm]);

  useEffect(() => {
    if (!isHydrated || !initialDataForStep) return;
    
    // If data changed on the current step, reset highestStepCompleted to current - 1
    // because future steps might depend on these changes.
    const currentData = JSON.stringify(formData);
    if (currentData !== initialDataForStep) {
      if (highestStepCompleted >= currentStep) {
        setHighestStepCompleted(currentStep - 1);
      }
    }
  }, [formData, currentStep, initialDataForStep, isHydrated, highestStepCompleted]);

  const handleNextDisabledChange = useCallback((disabled: boolean) => {
    setNextDisabled(disabled);
  }, []);

  const handleFinalSubmit = async () => {
    if (sessionStatus !== "authenticated") {
      setAuthDialogOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // We need to ensure formData has the latest name update, which happens in NameForm's onSubmit
      // But handleFinalSubmit is called AS the success callback of NameForm, so formData might not be updated yet in the store?
      // Actually, useStepForm calls updateFormData BEFORE calling onSuccess.
      // So formData in store should be up to date?
      // Wait, zustand updates are synchronous usually, but React state updates are batched.
      // However, we are reading from `formData` which is a const from `usePersFormStore()`.
      // This might be stale in the closure.
      // Better to use `usePersFormStore.getState().formData`.
      
      // Редакцію задає адреса конструктора (`/char/create` проти `/2024/char`), а не крок форми:
      // без цього рядка персонаж 2024 їхав у сервер без редакції й зберігався як RULES_2014.
      const currentData = {
        ...usePersFormStore.getState().formData,
        ruleset: currentRuleset,
      } as PersFormData;

      const result = await createCharacter(currentData);

      if (result.error) {
        toast.error("Помилка створення", {
          description: result.error
        });
        if (result.details) {
            console.error(result.details);
        }
      } else if (result.success) {
        toast.success("Персонажа створено!");
        // ID-и, не назви — жодного вільного тексту з форми (currentData.name лишається поза подією).
        posthog.capture("character_created", {
          classId: currentData.classId,
          subclassId: currentData.subclassId,
          raceId: currentData.raceId,
          subraceId: currentData.subraceId,
          raceVariantId: currentData.raceVariantId,
          backgroundId: currentData.backgroundId,
        });
        router.push(`/char/${result.persId}`);
        // Clear draft after navigation starts to avoid a visible "form reset" flash.
        requestAnimationFrame(() => {
          resetForm();
          usePersFormStore.persist.clearStorage();
        });
      }
    } catch (e) {
      toast.error("Щось пішло не так...");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  const prevClassIdRef = useRef<number | null>(formData.classId || null);
  const prevRaceIdRef = useRef<number | null>(formData.raceId || null);

  useEffect(() => {
    if (formData.classId && prevClassIdRef.current && formData.classId !== prevClassIdRef.current) {
       updateFormData({
         subclassId: undefined,
         classChoiceSelections: {},
         subclassChoiceSelections: {},
         classOptionalFeatureSelections: {},
         skillsSchema: undefined,
         skills: [],
         expertiseSchema: undefined,
         languagesSchema: undefined,
         equipmentSchema: undefined,
         equipment: [],
         choiceGroupToId: {},
         anyWeaponSelection: {},
        } as any);
    }
    prevClassIdRef.current = formData.classId || null;
  }, [formData.classId, updateFormData]);

  useEffect(() => {
    if (formData.raceId && prevRaceIdRef.current && formData.raceId !== prevRaceIdRef.current) {
       updateFormData({
         subraceId: undefined,
         raceVariantId: undefined,
         raceChoiceSelections: {},
         skillsSchema: undefined,
         skills: [],
       });
    }
    prevRaceIdRef.current = formData.raceId || null;
  }, [formData.raceId, updateFormData]);

  const race = useMemo(() => races.find(r => r.raceId === formData.raceId) as RaceI, [races, formData.raceId])
  const subrace = useMemo(
    () => (race?.subraces || []).find((sr) => sr.subraceId === formData.subraceId),
    [race, formData.subraceId]
  );
  const cls = useMemo(() => classes.find(c => c.classId === formData.classId) as ClassI, [classes, formData.classId])
  const subclass = useMemo(
    () => (cls?.subclasses || []).find((sc) => sc.subclassId === formData.subclassId),
    [cls, formData.subclassId]
  );

  const hasSpellcasting = useMemo(() => {
    const classType = (cls as any)?.spellcastingType as SpellcastingType | undefined;
    const subclassType = (subclass as any)?.spellcastingType as SpellcastingType | undefined;
    return Boolean(
      (classType && classType !== SpellcastingType.NONE) ||
        (subclassType && subclassType !== SpellcastingType.NONE)
    );
  }, [cls, subclass]);
  const bg = useMemo(() => backgrounds.find(b => b.backgroundId === formData.backgroundId) as BackgroundI, [backgrounds, formData.backgroundId])
  const hasLevelOneChoices = useMemo(
    () => Boolean(cls?.classChoiceOptions?.some((opt) => (opt.levelsGranted || []).includes(1))),
    [cls]
  );
  const hasLevelOneOptionalFeatures = useMemo(
    () => Boolean(cls?.classOptionalFeatures?.some((opt) => (opt.grantedOnLevels || []).includes(1))),
    [cls]
  );
  const hasSubraces = useMemo(() => (race?.subraces?.length ?? 0) > 0, [race]);
  const hasRaceVariants = useMemo(() => (race?.raceVariants?.length ?? 0) > 0, [race]);
  const hasRaceChoiceOptions = useMemo(() => (race as any)?.raceChoiceOptions?.length > 0, [race]);

  const raceVariant = useMemo(() => 
    race?.raceVariants?.find(v => v.raceVariantId === formData.raceVariantId), 
    [race, formData.raceVariantId]
  );
  const hasFeatChoice = useMemo(() => {
    return raceVariant?.name === 'HUMAN_VARIANT';
  }, [raceVariant]);
  // Друга риса Людини 2024 приходить з опції виду: опція дає фічу, фіча висить на рисі.
  const speciesFeat = useMemo(() => {
    const chosenTraitFeatureIds = new Set<number>(
      Object.values(formData.raceChoiceSelections ?? {}).flatMap((id) => {
        const option = (race as any)?.raceChoiceOptions?.find((candidate: any) => candidate.optionId === id);
        return (option?.traits ?? []).map((trait: any) => Number(trait.featureId ?? trait.feature?.featureId));
      }),
    );
    return feats.find((candidate: any) => (candidate.grantsFeature ?? []).some((feature: any) => chosenTraitFeatureIds.has(feature.featureId)));
  }, [feats, race, formData.raceChoiceSelections]);
  const hasSpeciesFeatChoices = useMemo(() => (speciesFeat?.featChoiceOptions?.length ?? 0) > 0, [speciesFeat]);
  const feat = useMemo(() => feats.find(f => f.featId === formData.featId), [feats, formData.featId]);

  /// Превʼю зміни характеристики на кроці «Опції риси» рахувало base 10 + ASI, ігноруючи расу
  /// (BUG-012): раса з +2 СПР показувала «14 → 15» замість «16 → 17». Ті самі доданки, що й у
  /// сервера, дає `buildCreationAbilityScores` — тут вона кличеться без рис, бо превʼю показує
  /// саме приріст від риси, яку гравець зараз обирає.
  const creationAbilityScores = useMemo(
    () =>
      buildCreationAbilityScores({
        ruleset: currentRuleset,
        asiSystem: formData.asiSystem ?? "POINT_BUY",
        pointBuy: formData.asi ?? [],
        simple: formData.simpleAsi ?? [],
        custom: formData.customAsi,
        isDefaultASI: formData.isDefaultASI ?? true,
        raceASI: race?.ASI,
        variantASI: (raceVariant as any)?.overridesRaceASI,
        subraceASI: (subrace as any)?.additionalASI,
        subraceReplacesASI: Boolean((subrace as any)?.replacesASI),
        racialChoices: formData.racialBonusChoiceSchema,
        raceChoiceAbilityBonuses: Object.values(formData.raceChoiceSelections ?? {})
          .map((id: any) => race?.raceChoiceOptions?.find((option) => option.optionId === id))
          .filter(Boolean)
          .map((option: any) => ({ ASI: option.ASI })),
        feats: [],
      }).scores,
    [currentRuleset, formData, race, subrace, raceVariant],
  );
  const hasFeatChoices = useMemo(() => (feat?.featChoiceOptions?.length ?? 0) > 0, [feat]);
  const hasBackgroundFeatChoice = useMemo(() => (bg?.gainsFeats?.length ?? 0) > 0, [bg]);
  const backgroundFeat = useMemo(() => {
    const originFeatId = getRulesStrategy(currentRuleset).getOriginFeatRequirement(bg ?? {}).originFeatId;
    return feats.find(f => f.featId === (formData.backgroundFeatId ?? originFeatId));
  }, [feats, formData.backgroundFeatId, bg, currentRuleset]);
  const hasBackgroundFeatChoices = useMemo(() => (backgroundFeat?.featChoiceOptions?.length ?? 0) > 0, [backgroundFeat]);

  const featSelectedSkills = useMemo(() => {
    if (!feat || !formData.featChoiceSelections) return [];
    const skills: string[] = [];
    Object.values(formData.featChoiceSelections).forEach((val: any) => {
      const ids = Array.isArray(val) ? val : [val];
      ids.forEach((id) => {
        const opt = feat.featChoiceOptions?.find((o: any) => o.choiceOptionId === id);
        if (!opt) return;
        extractSkillsFromChoiceOption(opt.choiceOption).forEach((s) => {
          if (s && s !== "UNKNOWN") skills.push(s);
        });
      });
    });
    return skills;
  }, [feat, formData.featChoiceSelections]);

  const backgroundFeatSelectedSkills = useMemo(() => {
    if (!backgroundFeat || !formData.backgroundFeatChoiceSelections) return [];
    const skills: string[] = [];
    Object.values(formData.backgroundFeatChoiceSelections).forEach((val: any) => {
      const ids = Array.isArray(val) ? val : [val];
      ids.forEach((id) => {
        const opt = backgroundFeat.featChoiceOptions?.find((o: any) => o.choiceOptionId === id);
        if (!opt) return;
        extractSkillsFromChoiceOption(opt.choiceOption).forEach((s) => {
          if (s && s !== "UNKNOWN") skills.push(s);
        });
      });
    });
    return skills;
  }, [backgroundFeat, formData.backgroundFeatChoiceSelections]);

  const featSelectedExpertises = useMemo(() => {
    if (!feat || !formData.featChoiceSelections) return [];
    const expertises: string[] = [];
    Object.values(formData.featChoiceSelections).forEach((val: any) => {
      const ids = Array.isArray(val) ? val : [val];
      ids.forEach((id) => {
        const opt = feat.featChoiceOptions?.find((o: any) => o.choiceOptionId === id);
        if (!opt) return;
        extractExpertisesFromChoiceOption(opt.choiceOption).forEach((s) => expertises.push(s));
      });
    });
    return expertises;
  }, [feat, formData.featChoiceSelections]);

  const backgroundFeatSelectedExpertises = useMemo(() => {
    if (!backgroundFeat || !formData.backgroundFeatChoiceSelections) return [];
    const expertises: string[] = [];
    Object.values(formData.backgroundFeatChoiceSelections).forEach((val: any) => {
      const ids = Array.isArray(val) ? val : [val];
      ids.forEach((id) => {
        const opt = backgroundFeat.featChoiceOptions?.find((o: any) => o.choiceOptionId === id);
        if (!opt) return;
        extractExpertisesFromChoiceOption(opt.choiceOption).forEach((s) => expertises.push(s));
      });
    });
    return expertises;
  }, [backgroundFeat, formData.backgroundFeatChoiceSelections]);

  const featSelectedIds = useMemo(() => {
    if (!formData.featChoiceSelections) return [];
    const ids: number[] = [];
    Object.values(formData.featChoiceSelections).forEach((val: any) => {
        if (Array.isArray(val)) ids.push(...val);
        else ids.push(val);
    });
    return ids;
  }, [formData.featChoiceSelections]);

  const backgroundFeatSelectedIds = useMemo(() => {
    if (!formData.backgroundFeatChoiceSelections) return [];
    const ids: number[] = [];
    Object.values(formData.backgroundFeatChoiceSelections).forEach((val: any) => {
        if (Array.isArray(val)) ids.push(...val);
        else ids.push(val);
    });
    return ids;
  }, [formData.backgroundFeatChoiceSelections]);

  const allSelectionsSkills = useMemo(() => {
    const skills = new Set<string>();
    
    // Race
    if (race && (formData as any).raceChoiceSelections) {
      Object.values((formData as any).raceChoiceSelections).forEach((id: any) => {
        const opt = (race as any).raceChoiceOptions?.find((o: any) => o.optionId === id);
        if (opt) {
          const rawName = (opt as any).optionNameEng ?? opt.optionName ?? "";
          const s = extractSkillFromOptionName(String(rawName));
          if (s && s !== "UNKNOWN") skills.add(s);
        }
      });
    }

    // Class
    if (cls && formData.classChoiceSelections) {
        Object.values(formData.classChoiceSelections).forEach((val: any) => {
            const ids = Array.isArray(val) ? val : [val];
            ids.forEach(id => {
                const opt = cls.classChoiceOptions?.find((o: any) => o.choiceOptionId === id);
                if (opt) {
                    extractSkillsFromChoiceOption(opt.choiceOption).forEach((s) => skills.add(s));
                }
            });
        });
    }

    // Subclass
    if (subclass && formData.subclassChoiceSelections) {
        Object.values(formData.subclassChoiceSelections).forEach((val: any) => {
            const ids = Array.isArray(val) ? val : [val];
            ids.forEach(id => {
                const opt = subclass.subclassChoiceOptions?.find((o: any) => o.choiceOptionId === id);
                if (opt) {
                    extractSkillsFromChoiceOption(opt.choiceOption).forEach((s) => skills.add(s));
                }
            });
        });
    }

    return Array.from(skills);
  }, [race, cls, subclass, formData]);

  const allSelectionsExpertises = useMemo(() => {
    const expertises = new Set<string>();
    
    // Class
    if (cls && formData.classChoiceSelections) {
        Object.values(formData.classChoiceSelections).forEach((val: any) => {
            const ids = Array.isArray(val) ? val : [val];
            ids.forEach(id => {
                const opt = cls.classChoiceOptions?.find((o: any) => o.choiceOptionId === id);
                if (opt) {
                  extractExpertisesFromChoiceOption(opt.choiceOption).forEach((s) => expertises.add(s));
                }
            });
        });
    }

    // Subclass
    if (subclass && formData.subclassChoiceSelections) {
        Object.values(formData.subclassChoiceSelections).forEach((val: any) => {
            const ids = Array.isArray(val) ? val : [val];
            ids.forEach(id => {
                const opt = subclass.subclassChoiceOptions?.find((o: any) => o.choiceOptionId === id);
                if (opt) {
                  extractExpertisesFromChoiceOption(opt.choiceOption).forEach((s) => expertises.add(s));
                }
            });
        });
    }

    return Array.from(expertises);
  }, [cls, subclass, formData.classChoiceSelections, formData.subclassChoiceSelections]);

  const hasSubclasses = useMemo(() => {
    if (!cls) return false;
    const strategy = getRulesStrategy((cls.ruleset as "RULES_2014" | "RULES_2024") ?? currentRuleset);
    return strategy.needsSubclassSelection({ subclassLevel: cls.subclassLevel }, false, 1) && (cls.subclasses?.length ?? 0) > 0;
  }, [cls, currentRuleset]);

  const hasLevelOneSubclassChoices = useMemo(
    () => Boolean(subclass?.subclassChoiceOptions?.some((opt) => (opt.levelsGranted || []).includes(1))),
    [subclass]
  );

  const activeFeatures = useMemo(() => {
    if (!cls) return [];
    let features = [...cls.features.filter(f => f.levelGranted === 1).map(f => f.feature)];

    // Class Choices
    if (formData.classChoiceSelections) {
      Object.values(formData.classChoiceSelections).forEach((val: any) => {
        const ids = Array.isArray(val) ? val : [val];
        ids.forEach(id => {
          const opt = cls.classChoiceOptions?.find(o => o.choiceOptionId === id);
          if (opt && opt.levelsGranted?.includes(1)) {
            opt.choiceOption.features.forEach(f => features.push(f.feature));
          }
        });
      });
    }
    
    // Remove if replaced by optional features
    if (formData.classOptionalFeatureSelections) {
      const replacedIds = new Set<number>();
      cls.classOptionalFeatures.forEach(cof => {
        if (formData.classOptionalFeatureSelections![cof.optionalFeatureId]) {
          cof.replacesFeatures.forEach(rf => replacedIds.add(rf.replacedFeatureId));
        }
      });
      features = features.filter(f => !replacedIds.has(f.featureId));
      
      // Add optional features themselves
      cls.classOptionalFeatures.forEach(cof => {
        if (formData.classOptionalFeatureSelections![cof.optionalFeatureId] && cof.feature) {
          features.push(cof.feature);
        }
      });
    }

    if (subclass) {
      features.push(...subclass.features.filter(f => f.levelGranted === 1).map(f => f.feature));

      // Subclass Choices
      if (formData.subclassChoiceSelections) {
        Object.values(formData.subclassChoiceSelections).forEach((val: any) => {
          const ids = Array.isArray(val) ? val : [val];
          ids.forEach(id => {
            const opt = subclass.subclassChoiceOptions?.find(o => o.choiceOptionId === id);
            if (opt && opt.levelsGranted?.includes(1)) {
              opt.choiceOption.features.forEach(f => features.push(f.feature));
            }
          });
        });
      }
    }
    
    // Race features and choices
    if (race) {
      features.push(...race.traits.map(t => t.feature));
      if (subrace) {
        features.push(...subrace.traits.map(t => t.feature));
      }
      if (raceVariant) {
        features.push(...raceVariant.traits.map(t => t.feature));
      }

      if (formData.raceChoiceSelections) {
        Object.values(formData.raceChoiceSelections).forEach((id: any) => {
          const opt = (race as any).raceChoiceOptions?.find((o: any) => o.optionId === id);
          if (opt?.traits?.length) {
            opt.traits.forEach((t: any) => features.push(t.feature));
          }
        });
      }
    }
    
    return features;
  }, [cls, subclass, race, subrace, raceVariant, formData]);

  const hasExpertiseChoice = useMemo(() => {
    const hasKnowledgeChoicesAtLevelOne = (subclass?.subclassChoiceOptions || []).some((opt: any) => {
      if (!(opt?.levelsGranted || []).includes(1)) return false;
      const groupName = String(opt?.choiceOption?.groupName || "").toLowerCase();
      const effectKind = String(opt?.choiceOption?.effectKind || "").toUpperCase();
      return (
        groupName.includes("благословення знань") ||
        groupName.includes("blessings of knowledge") ||
        effectKind === "SKILL_EXPERTISE"
      );
    });

    return activeFeatures.some(f => {
      if (String((f as any)?.engName || "") === "Blessings of Knowledge" && hasKnowledgeChoicesAtLevelOne) {
        return false;
      }
      const se = f.skillExpertises as any;
      return (se?.count || 0) > 0 || se?.chooseFromCurrentProficiencies || (se?.options?.length > 0);
    });
  }, [activeFeatures, subclass]);

  const hasLanguageChoice = useMemo(() => {
    if (!race || !cls) return false;

    const raceChoiceCounts = Object.values(formData.raceChoiceSelections ?? {}).map((id: any) => {
      const opt = race.raceChoiceOptions?.find((o) => o.optionId === id);
      return (opt as any)?.languagesToChooseCount;
    });

    return countOriginLanguageChoices(currentRuleset, [
      race.languagesToChooseCount,
      cls.languagesToChooseCount,
      subclass?.languagesToChooseCount,
      subrace?.languagesToChooseCount,
      bg?.languagesToChooseCount,
      feat?.grantedLanguageCount,
      backgroundFeat?.grantedLanguageCount,
      ...raceChoiceCounts,
    ], activeFeatures.map((f) => f.languagesToChooseCount)) > 0;
  }, [race, cls, subclass, subrace, bg, feat, backgroundFeat, activeFeatures, formData.raceChoiceSelections, currentRuleset]);

  /// Майстерність зброї має лише той клас, чия прогресія дає ємність на першому рівні —
  /// правило читає дані класу, а не список назв.
  const hasClassWeaponMastery = useMemo(
    () => hasWeaponMastery([{ className: cls?.name ?? "", classLevel: 1, masteryProgression: cls?.weapon_mastery_progression ?? [] }]),
    [cls],
  );

  const hasSpellChoice = useMemo(
    () => Boolean(cls && (currentRuleset === "RULES_2024" ? findCreationSpellQuota(cls.name, []) : hasCreationSpellChoice2014(cls.name))),
    [cls, currentRuleset],
  );

  const spellChoiceFeats = useMemo((): CreationSpellFeat[] => {
    if (currentRuleset !== "RULES_2024") return [];
    return [
      ...(backgroundFeat && hasFeatSpellChoice(currentRuleset, backgroundFeat.name)
        ? [{ source: "BACKGROUND_ORIGIN" as const, featId: backgroundFeat.featId, featName: backgroundFeat.name, selections: formData.backgroundFeatChoiceSelections }]
        : []),
      ...(speciesFeat && hasFeatSpellChoice(currentRuleset, speciesFeat.name)
        ? [{ source: "SPECIES_VERSATILITY" as const, featId: speciesFeat.featId, featName: speciesFeat.name, selections: formData.speciesFeatChoiceSelections }]
        : []),
    ];
  }, [backgroundFeat, speciesFeat, currentRuleset, formData.backgroundFeatChoiceSelections, formData.speciesFeatChoiceSelections]);
  const hasFeatSpellStep = spellChoiceFeats.length > 0;

  const steps = useMemo(() => {
    return resolveCreationSteps({
      is2024: currentRuleset === "RULES_2024", hasSubraces,
      hasRaceVariants,
      hasRaceChoiceOptions,
      hasSpeciesFeatChoices,
      hasSubclasses,
      hasLevelOneSubclassChoices,
      hasLevelOneChoices,
      hasLevelOneOptionalFeatures,
      hasWeaponMastery: hasClassWeaponMastery,
      hasSpellChoice,
      hasFeatChoice,
      hasFeatChoices,
      hasBackgroundFeatChoice,
      hasBackgroundFeatChoices,
      hasFeatSpellChoice: hasFeatSpellStep,
      hasExpertiseChoice,
      hasLanguageChoice,
    });
  }, [
    hasClassWeaponMastery,
    hasSpellChoice,
    hasLevelOneChoices,
    hasLevelOneOptionalFeatures,
    hasSubraces,
    hasRaceVariants,
    hasRaceChoiceOptions,
    hasSpeciesFeatChoices,
    hasSubclasses,
    hasLevelOneSubclassChoices,
    hasFeatChoice,
    hasFeatChoices,
    hasBackgroundFeatChoice,
    hasBackgroundFeatChoices,
    hasFeatSpellStep,
    hasExpertiseChoice,
    hasLanguageChoice, currentRuleset
  ]);

  useEffect(() => {
    const total = steps.length;
    setTotalSteps(total);
    
    // DON'T reset currentStep if:
    // 1. Store hasn't hydrated yet (data still loading from localStorage)
    // 2. formData suggests user has progressed beyond what steps currently show
    //    (e.g. user has featId but steps don't include feat step yet)
    
    if (!isHydrated) {
      // Wait for hydration to complete before adjusting steps
      return;
    }
    
    // Check if formData has critical fields that suggest more steps should exist
    const hasProgressedData = 
      formData.raceId || 
      formData.classId || 
      formData.backgroundId ||
      formData.featId ||
      formData.backgroundFeatId ||
      formData.skills?.length ||
      formData.name;
    
    // Only reduce currentStep if we're confident steps calculation is accurate
    // If user has data but steps is short, it means dependencies (race/class) aren't loaded yet
    if (currentStep > total) {
      // If user has formData but steps seem incomplete, DON'T reset yet
      if (hasProgressedData && total < 8) {
        // Likely still initializing - wait for races/classes to load
        console.log('[MultiStepForm] Waiting for data to load before adjusting currentStep');
        return;
      }
      
      // Safe to reset - either no data, or steps calculation is complete
      setCurrentStep(total);
    }
  }, [steps, currentStep, isHydrated, formData, setCurrentStep, setTotalSteps]);

  const jumpToStep = useCallback((stepOrder: number) => {
    const targetStep = steps[stepOrder - 1];
    if (!targetStep) return;
    
    // Allow jumping back to any step
    if (stepOrder < currentStep) {
      setCurrentStep(stepOrder);
      return;
    }
    
    // Allow jumping forward only to the next step OR any already completed step
    const canJumpForward = stepOrder === currentStep + 1 || isCreationStepCompleted(targetStep.id, formData);
    if (canJumpForward) {
      setCurrentStep(stepOrder);
    }
  }, [steps, currentStep, setCurrentStep, formData]);

  const renderStep = () => {
    const activeComponent = steps[currentStep - 1]?.component;

    switch (activeComponent) {
      case "races":
        return (
          <RacesForm
            races={races}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "raceDetails":
        return (
          <RaceSubraceVariantForm
            race={race}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "raceChoices":
        return (
          <RaceChoiceOptionsForm
            race={race}
            subraceId={formData.subraceId ?? null}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "feat":
        return (
          <FeatsForm
            feats={feats}
            race={race}
            subrace={subrace}
            raceVariant={raceVariant}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
            prereqContext={{
              hasSpellcasting,
              race: race?.name as any,
              subrace: (subrace as any)?.name,
            }}
          />
        );
      case "featChoices":
        return (
          <FeatChoiceOptionsForm
            selectedFeat={feat}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
            baseAbilityScores={creationAbilityScores}
            mode="race"
            extraExistingSkills={[...backgroundFeatSelectedSkills, ...allSelectionsSkills]}
            extraExistingChoiceOptionIds={backgroundFeatSelectedIds}
            extraExistingExpertises={[...backgroundFeatSelectedExpertises, ...allSelectionsExpertises]}
          />
        );
      case "backgroundFeat":
        return (
          <BackgroundFeatsForm
            feats={bg?.gainsFeats || []}
            race={race}
            subrace={subrace as any}
            raceVariant={raceVariant}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
            prereqContext={{
              hasSpellcasting,
              race: race?.name as any,
              subrace: (subrace as any)?.name,
            }}
          />
        );
      case "speciesFeatChoices":
        return (
          <FeatChoiceOptionsForm
            selectedFeat={speciesFeat as any}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
            baseAbilityScores={creationAbilityScores}
            mode="species"
            extraExistingSkills={[...featSelectedSkills, ...backgroundFeatSelectedSkills, ...allSelectionsSkills]}
            extraExistingChoiceOptionIds={[...featSelectedIds, ...backgroundFeatSelectedIds]}
            extraExistingExpertises={[...featSelectedExpertises, ...backgroundFeatSelectedExpertises, ...allSelectionsExpertises]}
          />
        );
      case "backgroundFeatChoices":
        return (
          <FeatChoiceOptionsForm
            selectedFeat={backgroundFeat as any}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
            baseAbilityScores={creationAbilityScores}
            mode="background"
            extraExistingSkills={[...featSelectedSkills, ...allSelectionsSkills]}
            extraExistingChoiceOptionIds={featSelectedIds}
            extraExistingExpertises={[...featSelectedExpertises, ...allSelectionsExpertises]}
          />
        );
      case "featSpells":
        return (
          <CreationFeatSpellsForm
            feats={spellChoiceFeats}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "class":
        return (
          <ClassesForm
            classes={classes}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "subclass":
        return (
          <SubclassForm
            cls={cls}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "subclassChoices":
        return (
          <SubclassChoiceOptionsForm
            selectedSubclass={subclass}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "classChoices":
        return (
          <ClassChoiceOptionsForm
            selectedClass={cls}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "classOptional":
        return (
          <ClassOptionalFeaturesForm
            selectedClass={cls}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "weaponMastery":
        return (
          <WeaponMasteryForm
            selectedClass={cls}
            weapons={weapons}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "spells":
        return (
          <CreationSpellsForm
            selectedClass={cls}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "background":
        return (
          <BackgroundsForm
            backgrounds={backgrounds} feats={feats}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "asi":
        if (!race || !cls) {
          return (
            <Card className="p-4 text-center text-slate-200">
              Спершу оберіть расу та клас.
            </Card>
          );
        }
        return (
          <ASIForm
            race={race}
            raceVariant={raceVariant}
            selectedClass={cls}
            background={bg}
            ruleset={currentRuleset}
            prevRaceId={prevRaceId}
            setPrevRaceId={setPrevRaceId}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "skills":
        if (!race || !cls || !bg) {
          return (
            <Card className="p-4 text-center text-slate-200">
              Спершу завершіть расу, клас та передісторію.
            </Card>
          );
        }
        return (
          <SkillsForm
            race={race}
            raceVariant={raceVariant}
            selectedClass={cls}
            background={bg}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
            activeFeatures={activeFeatures}
            extraExistingSkills={[...featSelectedSkills, ...backgroundFeatSelectedSkills, ...allSelectionsSkills, ...allSelectionsExpertises]}
            extraExistingExpertises={[...featSelectedExpertises, ...backgroundFeatSelectedExpertises, ...allSelectionsExpertises]}
          />
        );
      case "expertise":
        return (
          <ExpertiseForm
            selectedClass={cls}
            subclass={subclass}
            activeFeatures={activeFeatures}
            race={race}
            background={bg}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
            extraSkills={[...featSelectedSkills, ...backgroundFeatSelectedSkills, ...allSelectionsSkills]}
            extraExpertises={[...featSelectedExpertises, ...backgroundFeatSelectedExpertises, ...allSelectionsExpertises]}
          />
        );
      case "languages":
        return (
          <LanguagesForm
            race={race}
            selectedClass={cls}
            subclass={subclass}
            background={bg}
            selectedSubrace={subrace as any}
            activeFeatures={activeFeatures}
            feat={feat}
            backgroundFeat={backgroundFeat}
            originRuleset={currentRuleset}
            isOptional={currentRuleset !== "RULES_2024"}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "equipment":
        if (!race || !cls) {
          return (
            <Card className="p-4 text-center text-slate-200">
              Спершу заповніть попередні кроки.
            </Card>
          );
        }
        return (
          <EquipmentForm
            weapons={weapons}
            selectedClass={cls}
            background={bg}
            race={race}
            formId={activeFormId}
            onNextDisabledChange={handleNextDisabledChange}
          />
        );
      case "name":
        return (
          <NameForm
            formId={activeFormId}
            race={race}
            raceVariant={raceVariant}
            selectedClass={cls}
            background={bg}
            backgroundFeat={backgroundFeat as any}
            feat={feat}
            weapons={weapons}
            onSuccess={handleFinalSubmit}
          />
        );
      default:
        return null;
    }
  }

  const completedStepCount = steps.filter((step) => isCreationStepCompleted(step.id, formData)).length;
  const progress = Math.round((completedStepCount / steps.length) * 100);
  const activeFormId = `character-step-form-${currentStep}`;

  useEffect(() => {
    if (!isHydrated) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [currentStep, isHydrated]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-4 md:gap-6 md:px-0 md:py-6">
      <CharacterCreateHeader
        onReset={resetForm}
        onOpenAuth={() => setAuthDialogOpen(true)}
        isAuthenticated={sessionStatus === "authenticated" && !!session?.user}
      />

      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="grid gap-3 p-0 sm:gap-4 md:grid-cols-[1fr,300px]">
          <div className="glass-panel border-gradient-rpg space-y-3 rounded-xl p-3 sm:space-y-4 sm:p-4 md:p-5">
            <CreationStepRuleLink
              stepId={steps[currentStep - 1]?.id}
              ruleset={currentRuleset}
              excerpts={ruleExcerpts}
            />
            {renderStep()}
          </div>

          <aside className="glass-panel border-gradient-rpg rounded-xl p-3 sm:p-4">
          <div className="sticky top-14 sm:top-16">
            <div className="flex items-center justify-between text-xs text-slate-400 sm:text-sm">
                <span className="font-medium text-slate-200">Ваш прогрес</span>
                <Badge variant="outline" className="border-white/15 bg-white/5 text-[11px] text-slate-200 sm:text-xs">
                  {progress}% готово
                </Badge>
              </div>

              <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
                {steps.map((step, index) => {
                  const stepOrder = index + 1;
                  const isDone = stepOrder <= highestStepCompleted && isCreationStepCompleted(step.id, formData);
                  const isActive = stepOrder === currentStep;
                  const canJump = stepOrder <= highestStepCompleted + 1 || isCreationStepCompleted(step.id, formData);

                  return (
                    <button
                      key={step.id}
                      type="button"
                      data-testid={`creation-step-${step.id}`}
                      data-step-id={step.id}
                      data-active={isActive ? "true" : "false"}
                      disabled={!canJump && !isActive}
                      onClick={() => jumpToStep(stepOrder)}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-all duration-200 sm:px-3",
                        isActive
                          ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white"
                          : canJump 
                            ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20"
                            : "border-white/5 bg-transparent text-slate-500 cursor-not-allowed opacity-50"
                      )}
                    >
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">
                          Крок {stepOrder}
                        </p>
                        <p className="text-xs font-semibold sm:text-sm">{step.name}</p>
                      </div>
                      {isDone ? (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
                          <Check className="h-4 w-4" />
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={clsx(
                            "border-white/15 bg-white/5 text-slate-300",
                            isActive && "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100"
                          )}
                        >
                          <Circle className="h-3 w-3" />
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 h-1.5 rounded-full bg-white/10 sm:mt-5 sm:h-2">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-arcane-500 to-arcane-300 transition-all sm:h-2"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </aside>
        </CardContent>
      </Card>

      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] inset-x-0 z-[60] w-full px-2 pb-3 sm:px-3 md:sticky md:bottom-0 md:px-0">
        <div className="glass-panel border-gradient-rpg mx-auto flex w-full max-w-6xl items-center justify-between rounded-xl px-2.5 py-2.5 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/40 sm:rounded-2xl sm:px-3 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 sm:gap-3 sm:text-sm">
            <Badge variant="secondary" className="bg-white/5 text-white text-[11px] sm:text-xs">
              Крок {currentStep} / {steps.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 border border-white/10 bg-white/5 px-4 text-sm text-slate-200 hover:bg-white/7 sm:text-base md:h-9 md:px-3"
                onClick={prevStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
            )}
            <Button
              type="submit"
              form={activeFormId}
              disabled={nextDisabled || isSubmitting}
              size="sm"
              className="h-11 bg-arcane-600/90 px-5 text-sm text-white shadow-lg shadow-arcane-900/40 hover:bg-arcane-500 sm:text-base md:h-9 md:px-3"
            >
              {currentStep === steps.length ? (isSubmitting ? "Створення..." : "Створити") : "Далі →"}
            </Button>
          </div>
        </div>
      </div>

      <GoogleAuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  )
}

export default MultiStepForm
