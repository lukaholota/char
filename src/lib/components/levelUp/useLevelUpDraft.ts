"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useLevelUpDraftStorage, usePersFormStore } from "@/lib/stores/persFormStore";
import { buildLevelUpDraftBase, findRestorableLevelUpDraft, startLevelUpDraft, type LevelUpDraftPers, type RestorableLevelUpDraft } from "@/lib/stores/levelUpDraft";

export type LevelUpDraftOwner = LevelUpDraftPers & { persId: number; ruleset: string };
export type LevelUpDraftGate = { isReady: boolean; isRestored: boolean; sessionKey: number; startOver: () => void };

type CheckedDraft = { base: string; isRestored: boolean; sessionKey: number };

export function useLevelUpDraft(pers: LevelUpDraftOwner | null, guideSignature: string | null): LevelUpDraftGate {
  const draftPersId = pers?.ruleset === "RULES_2014" ? pers.persId : null;
  const isStorageReady = useLevelUpDraftStorage(draftPersId);
  const base = pers ? buildLevelUpDraftBase(pers) : "";
  const [checked, setChecked] = useState<CheckedDraft | null>(null);

  useLayoutEffect(() => {
    if (!isStorageReady) return;
    const restored = draftPersId === null ? null : findRestorableLevelUpDraft(usePersFormStore.getState().levelUpDraft, base, guideSignature);
    openLevelUpDraft(restored, base);
    setChecked((previous) => ({ base, isRestored: restored?.draft.stepId != null, sessionKey: (previous?.sessionKey ?? 0) + 1 }));
  }, [isStorageReady, draftPersId, base, guideSignature]);

  const startOver = useCallback(() => {
    openLevelUpDraft(null, base);
    setChecked((previous) => ({ base, isRestored: false, sessionKey: (previous?.sessionKey ?? 0) + 1 }));
  }, [base]);

  return { isReady: isStorageReady && checked?.base === base, isRestored: checked?.isRestored ?? false, sessionKey: checked?.sessionKey ?? 0, startOver };
}

function openLevelUpDraft(restored: RestorableLevelUpDraft | null, base: string): void {
  const store = usePersFormStore.getState();
  if (!restored) store.resetForm();
  if (restored?.manualFormData) usePersFormStore.setState({ formData: restored.manualFormData });
  store.setLevelUpDraft(restored?.draft ?? startLevelUpDraft(base));
}

export function useRestoredLevelUpStep(stepIds: readonly string[], currentStep: number, setCurrentStep: (index: number) => void): (index: number) => void {
  const [pendingStepId, setPendingStepId] = useState(() => usePersFormStore.getState().levelUpDraft?.stepId ?? null);
  const pendingIndex = pendingStepId === null ? -1 : stepIds.indexOf(pendingStepId);
  const currentStepId = stepIds[Math.min(currentStep, stepIds.length - 1)];

  useLayoutEffect(() => {
    if (pendingIndex < 0) return;
    setCurrentStep(pendingIndex);
    setPendingStepId(null);
  }, [pendingIndex, setCurrentStep]);

  useEffect(() => {
    if (pendingStepId === null) rememberLevelUpStep(currentStep === 0 ? null : currentStepId ?? null);
  }, [pendingStepId, currentStep, currentStepId]);

  return useCallback((index: number) => {
    setPendingStepId(null);
    setCurrentStep(index);
  }, [setCurrentStep]);
}

function rememberLevelUpStep(stepId: string | null): void {
  usePersFormStore.setState((state) => state.levelUpDraft && state.levelUpDraft.stepId !== stepId ? { levelUpDraft: { ...state.levelUpDraft, stepId } } : state);
}
