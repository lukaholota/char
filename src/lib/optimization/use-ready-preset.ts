"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePresetDraftStorage, usePersFormStore, findActiveDraftStorageKey } from "@/lib/stores/persFormStore";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { createCharacter, createCharacterFromBuild, type CreateCharacterResult } from "@/lib/actions/character";
import { findCreationAnalytics } from "@/lib/monitoring/funnel-analytics";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { findCustomizedPresetSections, findPresetAbandonStage } from "@/lib/monitoring/rpgbot-analytics-model";
import { findSavedPresetProblem, isSavedPresetCompatible } from "./ready-preset-validation";
import { buildPresetChoiceContext, checkPresetCreation, findPresetChoiceProblem } from "./ready-preset-creation-check";
import type { ReadyPresetOptions } from "./ready-preset-options";
import { removeAssemblyDraft } from "./ready-preset-assembly-draft";
import { forgetUnfinishedPreset } from "./unfinished-preset";
import { buildAssemblyCreationRequest, type ReadyPresetLevels } from "./ready-preset-levels";
import { buildRequestId } from "./ready-preset-request-id";
import { SIGN_IN_REQUIRED_MESSAGE, describeServerError, findServerErrorReason, findThrownErrorReason } from "./ready-preset-server-error";
import { useReadyPresetAssembly } from "./use-ready-preset-assembly";

export type ReadyPresetLevelsPlan = { levels: ReadyPresetLevels; revisionId: string };

export function useReadyPreset(startingDraft: PersFormData, buildId: string, options: ReadyPresetOptions, plan: ReadyPresetLevelsPlan | null = null) {
  const levels = plan?.levels ?? null;
  const active = usePresetDraftStorage(buildId);
  const assembly = useReadyPresetAssembly(buildId, levels);
  const { formData, currentStep, updateFormData, setCurrentStep, isHydrated, resetForm } = usePersFormStore();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [invalidSaved, setInvalidSaved] = useState(false);
  const [createdSnapshot, setCreatedSnapshot] = useState<{ draft: Partial<PersFormData>; step: number } | null>(null);
  const pending = useRef(false);
  const created = useRef(false);
  const router = useModeRouter();
  const openedAt = useRef(0);
  const isFinished = useRef(false);
  const isSignInOpen = useRef(false);
  const customizationStep = useRef<string | null>(null);
  const isGuideCreationRequested = useRef(false);
  const latest = useRef({ formData, currentStep, initialized, buildId, startingDraft, assembly, options });
  latest.current = { formData, currentStep, initialized, buildId, startingDraft, assembly, options };
  useEffect(() => { openedAt.current = performance.now(); }, []);
  useEffect(() => {
    const reportAbandoned = () => {
      const { formData: current, currentStep: step, initialized: wasReady, buildId: preset_id, startingDraft: start, assembly: levels, options: presetOptions } = latest.current;
      if (isFinished.current || !wasReady || isSignInOpen.current) return;
      isFinished.current = true;
      const stage = findPresetAbandonStage(step, pending.current, customizationStep.current);
      captureRpgbotEvent("rpgbot_preset_abandoned", { preset_id, stage, blocked_by: findSavedPresetProblem(current, start, presetOptions), ...describePresetProgress(start, current, levels, openedAt.current) });
    };
    window.addEventListener("pagehide", reportAbandoned);
    return () => { window.removeEventListener("pagehide", reportAbandoned); reportAbandoned(); };
  }, []);
  useEffect(() => {
    if (!active || !isHydrated || initialized || invalidSaved) return;
    if (!formData.classId) { updateFormData({ ...startingDraft, readyPresetRequestId: buildRequestId() }); setCurrentStep(2); }
    else if (!(isSavedPresetCompatible(formData, startingDraft))) {
      setInvalidSaved(true); return;
    }
    else if (!formData.readyPresetRequestId) updateFormData({ readyPresetRequestId: buildRequestId() });
    setInitialized(true);
  }, [active, isHydrated, initialized, invalidSaved, formData, currentStep, startingDraft, options, updateFormData, setCurrentStep]);

  const choiceContext = buildPresetChoiceContext(levels, assembly, formData, options);
  const choiceProblem = findPresetChoiceProblem(choiceContext);

  function restartSavedPreset() {
    assembly.reset();
    resetForm(); updateFormData({ ...startingDraft, readyPresetRequestId: buildRequestId() }); setCurrentStep(2);
    setInvalidSaved(false); setInitialized(true); setError("");
  }

  function createByGuide() {
    if (!isCustomized()) { void confirmCreation(); return; }
    restoreStartingChoices();
    isGuideCreationRequested.current = true;
  }

  useEffect(() => {
    if (!isGuideCreationRequested.current) return;
    isGuideCreationRequested.current = false;
    void confirmCreation();
  });

  function isCustomized(): boolean {
    const withoutNameAndRequest = (draft: Partial<PersFormData>) => JSON.stringify({ ...draft, name: "", readyPresetRequestId: undefined });
    return withoutNameAndRequest(formData) !== withoutNameAndRequest(startingDraft) || hasLevelChoices(assembly);
  }

  function requireSignIn() {
    captureRpgbotEvent("rpgbot_preset_create_failed", { preset_id: buildId, reason: "sign_in_required" });
    setError(SIGN_IN_REQUIRED_MESSAGE);
  }

  function resetCustomization() {
    restoreStartingChoices();
    goToStep(4);
  }

  function restoreStartingChoices() {
    const level = assembly.targetLevel;
    const name = formData.name ?? "";
    restartSavedPreset();
    assembly.selectLevel(level);
    updateFormData({ name });
  }

  function goToStep(step: number) { setError(""); setCurrentStep(step); }
  async function confirmCreation() {
    if (pending.current || created.current) return;
    const { start, blockedBy } = checkPresetCreation(formData, startingDraft, options, choiceProblem);
    if (!start) {
      captureRpgbotEvent("rpgbot_preset_create_failed", { preset_id: buildId, reason: "validation", blocked_by: blockedBy });
      setError(blockedBy); return;
    }
    pending.current = true;
    const storageKey = findActiveDraftStorageKey()!;
    setSubmitting(true); setError("");
    const progress = { ...describePresetProgress(startingDraft, start, assembly, openedAt.current), ...(levels ? { target_level: assembly.targetLevel } : {}) };
    captureRpgbotEvent("rpgbot_preset_submitted", { preset_id: buildId, ...progress });
    try {
      const result = await sendCreation({ ...start, ruleset: "RULES_2014" });
      if (result.error) { captureRpgbotEvent("rpgbot_preset_create_failed", { preset_id: buildId, reason: findServerErrorReason(result.error) }); setError(describeServerError(result.error)); return; }
      created.current = true;
      isFinished.current = true;
      setCreatedSnapshot({ draft: formData, step: currentStep });
      captureRpgbotEvent("rpgbot_preset_created", { preset_id: buildId, pers_id: result.persId, ...progress });
      router.push(`/char/${result.persId}`);
      requestAnimationFrame(() => {
        if (findActiveDraftStorageKey() === storageKey) resetForm();
        localStorage.removeItem(storageKey);
        removeAssemblyDraft(buildId);
        forgetUnfinishedPreset(buildId);
      });
    } catch (failure) {
      if (!(failure instanceof Error)) throw failure;
      captureRpgbotEvent("rpgbot_preset_create_failed", { preset_id: buildId, reason: findThrownErrorReason(failure) });
      setError("Не вдалося зберегти персонажа. Ваші вибори збережені — спробуйте ще раз.");
    } finally { pending.current = false; setSubmitting(false); }
  }
  function sendCreation(start: PersFormData): Promise<CreateCharacterResult> {
    if (!choiceContext || !assembly.requestId) return createCharacter({ ...start, readyPresetBuildId: buildId }, { ...findCreationAnalytics(), creationAttemptId: null });
    return createCharacterFromBuild(buildAssemblyCreationRequest({ preset: { buildId, revisionId: plan?.revisionId ?? "" }, requestId: assembly.requestId, start, context: choiceContext }));
  }
  const rememberSignInOpen = useCallback((open: boolean) => { isSignInOpen.current = open; }, []);
  const rememberCustomizationStep = useCallback((kind: string) => { customizationStep.current = kind; }, []);
  return { ready: active && isHydrated && initialized && assembly.isLoaded, assembly, choiceContext, choiceProblem, invalidSaved, restartSavedPreset, createByGuide, requireSignIn, resetCustomization, isCreated: createdSnapshot !== null, draft: createdSnapshot?.draft ?? formData, step: Math.max(2, createdSnapshot?.step ?? currentStep), update: updateFormData, goToStep, confirmCreation, submitting, error, rememberSignInOpen, rememberCustomizationStep };
}

function hasLevelChoices(assembly: ReturnType<typeof useReadyPresetAssembly>): boolean {
  return Object.keys(assembly.choices).length > 0 || Object.keys(assembly.advancements).length > 0 || Object.keys(assembly.classOptionChoices).length > 0 || assembly.preparedSpellKeys !== null;
}

function describePresetProgress(startingDraft: PersFormData, current: Partial<PersFormData>, assembly: ReturnType<typeof useReadyPresetAssembly>, openedAt: number) {
  return { customized_sections: findCustomizedPresetSections(startingDraft, current, hasLevelChoices(assembly)), seconds_since_open: Math.round((performance.now() - openedAt) / 1000) };
}
