"use client";

import { useEffect } from "react";
import { z } from "zod";
import { rulesetSchema } from "./schema";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { OptimizationRuleset } from "./types";
import type { CreationStep } from "@/lib/components/characterCreator/creation-step-resolver";

const targetSchema = z.object({ ruleset: rulesetSchema, stepId: z.enum(["race", "raceChoices", "asi"]) });

export function useBuildCreatorStep(ruleset: OptimizationRuleset, steps: CreationStep[], hydrated: boolean, onAutomaticStep?: (step: number) => void) {
  useEffect(() => {
    if (!hydrated) return;
    const saved = sessionStorage.getItem("rpgbot-creator-step");
    if (!saved) return;
    let parsed: unknown;
    try { parsed = JSON.parse(saved); }
    catch (failure) {
      if (!(failure instanceof SyntaxError)) throw failure;
      sessionStorage.removeItem("rpgbot-creator-step");
      return;
    }
    const target = targetSchema.safeParse(parsed);
    if (!target.success || target.data.ruleset !== ruleset) return;
    const index = steps.findIndex((step) => step.id === target.data.stepId);
    if (index < 0) return;
    sessionStorage.removeItem("rpgbot-creator-step");
    const store = usePersFormStore.getState();
    if (store.currentStep === index + 1) return;
    onAutomaticStep?.(index + 1);
    store.setCurrentStep(index + 1);
  }, [ruleset, steps, hydrated, onAutomaticStep]);
}
