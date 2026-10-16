"use client";

import { useCallback, useEffect, useRef } from "react";
import { captureCreationFirstChoice } from "@/lib/monitoring/funnel-analytics";

export function useCreationFirstChoice(edition: "2014" | "2024", currentStep: number, isHydrated: boolean): (step: number) => void {
  const observedStepRef = useRef<number | null>(null);
  const automaticStepRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isHydrated) return;
    const previousStep = observedStepRef.current;
    observedStepRef.current = currentStep;
    if (automaticStepRef.current === currentStep) {
      automaticStepRef.current = null;
      return;
    }
    if (previousStep !== null && currentStep > previousStep) captureCreationFirstChoice(edition);
  }, [isHydrated, currentStep, edition]);
  return useCallback((step: number) => { automaticStepRef.current = step; }, []);
}
