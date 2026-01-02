"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Weapon } from "@prisma/client";
import RacesForm from "@/lib/components/characterCreator/RacesForm";
import {CharacterCreateHeader} from "@/lib/components/characterCreator/CharacterCreateHeader";
import {usePersFormStore} from "@/lib/stores/persFormStore";
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
import ClassOptionalFeaturesForm from "@/lib/components/characterCreator/ClassOptionalFeaturesForm";
import RaceSubraceVariantForm from "@/lib/components/characterCreator/RaceSubraceVariantForm";
import RaceChoiceOptionsForm from "@/lib/components/characterCreator/RaceChoiceOptionsForm";
import SubclassForm from "@/lib/components/characterCreator/SubclassForm";
import SubclassChoiceOptionsForm from "@/lib/components/characterCreator/SubclassChoiceOptionsForm";
import FeatsForm from "@/lib/components/characterCreator/FeatsForm";
import { ExpertiseForm } from "@/lib/components/characterCreator/ExpertiseForm";

import { createCharacter } from "@/lib/actions/character";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { useSession } from "next-auth/react";

interface Props {
  races: RaceI[]
  classes: ClassI[],
  backgrounds: BackgroundI[],
  weapons: Weapon[],
  feats: FeatPrisma[],
}

export const MultiStepForm = (
  {
    races,
    classes,
    backgrounds,
    weapons,
    feats,
  }: Props
) => {
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
  } = usePersFormStore()
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDataForStep, setInitialDataForStep] = useState<string>("");
  const [highestStepCompleted, setHighestStepCompleted] = useState<number>(0);
  const router = useRouter();
  const didMountRef = useRef(false);

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
  }, [currentStep, isHydrated]);

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
      
      const currentData = usePersFormStore.getState().formData as PersFormData;
      
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
        resetForm();
        // Clear persisted draft so future creations start clean
        usePersFormStore.persist.clearStorage();
        router.push(`/char/${result.persId}`);
      }
    } catch (e) {
      toast.error("Щось пішло не так...");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

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
  const feat = useMemo(() => feats.find(f => f.featId === formData.featId), [feats, formData.featId]);
  const hasFeatChoices = useMemo(() => (feat?.featChoiceOptions?.length ?? 0) > 0, [feat]);

  const hasSubclasses = useMemo(() => {
    if (!cls) return false;
    const allowedClasses = ["CLERIC_2014", "WARLOCK_2014", "SORCERER_2014"];
    return allowedClasses.includes(cls.name) && (cls.subclasses?.length ?? 0) > 0;
  }, [cls]);

  const hasLevelOneSubclassChoices = useMemo(
    () => Boolean(subclass?.subclassChoiceOptions?.some((opt) => (opt.levelsGranted || []).includes(1))),
    [subclass]
  );

  const hasExpertiseChoice = useMemo(() => {
    if (!cls) return false;
    return cls.features.some(f => 
      f.levelGranted === 1 && 
      (f.feature.skillExpertises as any)?.count > 0
    );
  }, [cls]);

  const steps = useMemo(() => {
    const dynamicSteps: { id: string; name: string; component: string }[] = [
      { id: "race", name: "Раса", component: "races" },
    ];

    if (hasSubraces || hasRaceVariants) {
      const name = hasSubraces && hasRaceVariants
        ? "Підраса чи Варіант"
        : hasSubraces
          ? "Підраса"
          : "Варіант раси";

      dynamicSteps.push({ id: "raceDetails", name, component: "raceDetails" });
    }

    if (hasRaceChoiceOptions) {
      dynamicSteps.push({ id: "raceChoices", name: "Опції раси", component: "raceChoices" });
    }

    dynamicSteps.push({ id: "class", name: "Клас", component: "class" });

    if (hasSubclasses) {
      dynamicSteps.push({ id: "subclass", name: "Підклас", component: "subclass" });
    }

    if (hasLevelOneSubclassChoices) {
      dynamicSteps.push({ id: "subclassChoices", name: "Опції підкласу", component: "subclassChoices" });
    }

    if (hasLevelOneChoices) {
      dynamicSteps.push({ id: "classChoices", name: "Опції класу", component: "classChoices" });
    }

    if (hasLevelOneOptionalFeatures) {
      dynamicSteps.push({ id: "classOptional", name: "Додаткові риси", component: "classOptional" });
    }

    dynamicSteps.push(
      { id: "background", name: "Передісторія", component: "background" },
      { id: "asi", name: "Характеристики", component: "asi" },
      { id: "skills", name: "Навички", component: "skills" },
    );

    if (hasExpertiseChoice) {
      dynamicSteps.push({ id: "expertise", name: "Експертиза", component: "expertise" });
    }

    // MOVED: Feat selection AFTER skills and expertise
    if (hasFeatChoice) {
      dynamicSteps.push({ id: "feat", name: "Риса", component: "feat" });
    }
    if (hasFeatChoices) {
      dynamicSteps.push({ id: "featChoices", name: "Опції риси", component: "featChoices" });
    }

    dynamicSteps.push(
      { id: "equipment", name: "Спорядження", component: "equipment" },
      { id: "name", name: "Імʼя", component: "name" },
    );

    return dynamicSteps;
  }, [hasLevelOneChoices, hasLevelOneOptionalFeatures, hasSubraces, hasRaceVariants, hasRaceChoiceOptions, hasSubclasses, hasLevelOneSubclassChoices, hasFeatChoice, hasFeatChoices, hasExpertiseChoice]);

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

  const isStepCompleted = useCallback((stepId: string, data: any) => {
    if (!data) return false;
    switch (stepId) {
      case "race": return !!data.raceId;
      case "raceDetails": return !!(data.subraceId || data.raceVariantId);
      case "raceChoices": return Object.keys(data.raceChoiceSelections || {}).length > 0;
      case "class": return !!data.classId;
      case "subclass": return !!data.subclassId;
      case "subclassChoices": return Object.keys(data.subclassChoiceSelections || {}).length > 0;
      case "classChoices": return Object.keys(data.classChoiceSelections || {}).length > 0;
      case "classOptional": return Object.keys(data.classOptionalFeatureSelections || {}).length > 0;
      case "background": return !!data.backgroundId;
      case "asi": return !!data.asiSystem;
      case "skills": return (data.skills || []).length > 0;
      case "expertise": return !!(data.expertiseSchema?.expertises?.length);
      case "feat": return !!data.featId;
      case "featChoices": return Object.keys(data.featChoiceSelections || {}).length > 0;
      case "equipment": return !!(data.equipmentSchema?.choiceGroupToId);
      case "name": return !!data.name;
      default: return false;
    }
  }, []);

  const jumpToStep = useCallback((stepOrder: number) => {
    const targetStep = steps[stepOrder - 1];
    if (!targetStep) return;
    
    // Allow jumping back to any step
    if (stepOrder < currentStep) {
      setCurrentStep(stepOrder);
      return;
    }
    
    // Allow jumping forward only to the next step OR any already completed step
    const canJumpForward = stepOrder === currentStep + 1 || isStepCompleted(targetStep.id, formData);
    if (canJumpForward) {
      setCurrentStep(stepOrder);
    }
  }, [steps, currentStep, setCurrentStep, isStepCompleted, formData]);

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
          />
        );
      case "featChoices":
        return (
          <FeatChoiceOptionsForm
            selectedFeat={feat}
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
      case "background":
        return (
          <BackgroundsForm
            backgrounds={backgrounds}
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
          />
        );
      case "expertise":
        return (
          <ExpertiseForm
            selectedClass={cls}
            race={race}
            background={bg}
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
            feat={feat}
            weapons={weapons}
            onSuccess={handleFinalSubmit}
          />
        );
      default:
        return null;
    }
  }

  const progress = Math.round((currentStep / steps.length) * 100);
  const activeFormId = `character-step-form-${currentStep}`;

  useEffect(() => {
    setNextDisabled(false);
  }, [currentStep]);

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

      <Card className="shadow-2xl">
        <CardContent className="grid gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-[1fr,300px] md:p-6">
          <div className="glass-panel border-gradient-rpg space-y-3 rounded-xl p-3 sm:space-y-4 sm:p-4 md:p-5">
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
                  const isDone = stepOrder <= highestStepCompleted && isStepCompleted(step.id, formData);
                  const isActive = stepOrder === currentStep;
                  const canJump = stepOrder <= highestStepCompleted + 1 || isStepCompleted(step.id, formData);

                  return (
                    <button
                      key={step.id}
                      type="button"
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
                  className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all sm:h-2"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </aside>
        </CardContent>
      </Card>

      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] inset-x-0 z-[60] w-full px-2 pb-3 sm:px-3 md:sticky md:bottom-0 md:px-0">
        <div className="border-gradient-rpg mx-auto flex w-full max-w-6xl items-center justify-between rounded-xl border-t border-white/10 bg-slate-900/95 px-2.5 py-2.5 backdrop-blur-xl shadow-xl shadow-black/30 sm:rounded-2xl sm:px-3 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 sm:gap-3 sm:text-sm">
            <Badge variant="secondary" className="bg-white/5 text-white text-[11px] sm:text-xs">
              Крок {currentStep} / {steps.length}
            </Badge>
            <span className="hidden text-slate-400 sm:inline">Прогрес {progress}%</span>
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="border border-white/10 bg-white/5 text-sm text-slate-200 hover:bg-white/7 sm:text-base"
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
              className="bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 text-sm text-white shadow-lg shadow-indigo-500/20 sm:text-base"
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
