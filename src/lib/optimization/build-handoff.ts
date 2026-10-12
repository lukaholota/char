"use client";

import { activateCreatorDraftStorage, usePersFormStore } from "@/lib/stores/persFormStore";
import { fullCharacterSchema, type PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { z } from "zod";
import type { OptimizationRuleset } from "./types";

const backupSchema = z.object({
  formData: z.object(fullCharacterSchema.shape).partial().passthrough(),
  currentStep: z.number().int().positive(), totalSteps: z.number().int().positive(),
});

export function findBuildBackupKey(ruleset: OptimizationRuleset) {
  return `rpgbot-creator-backup-${ruleset}`;
}

export function hasManualCreatorDraft(ruleset: OptimizationRuleset): boolean {
  activateCreatorDraftStorage(ruleset);
  return Object.keys(usePersFormStore.getState().formData).some((key) => key !== "ruleset");
}

export function applyBuildDraft(data: Partial<PersFormData>, stepId: string, ruleset: OptimizationRuleset) {
  activateCreatorDraftStorage(ruleset);
  const state = usePersFormStore.getState();
  const backup = { formData: state.formData, currentStep: state.currentStep, totalSteps: state.totalSteps };
  const previousBackup = localStorage.getItem(findBuildBackupKey(ruleset));
  if (Object.keys(state.formData).length || !previousBackup) localStorage.setItem(findBuildBackupKey(ruleset), JSON.stringify(backup));
  state.resetForm();
  state.updateFormData(data);
  sessionStorage.setItem("rpgbot-creator-step", JSON.stringify({ ruleset, stepId }));
}

export function restoreCreatorBackup(ruleset: OptimizationRuleset): boolean {
  const saved = localStorage.getItem(findBuildBackupKey(ruleset));
  if (!saved) return false;
  const original: unknown = JSON.parse(saved);
  backupSchema.parse(original);
  const backup = original as { formData: Partial<PersFormData>; currentStep: number; totalSteps: number };
  activateCreatorDraftStorage(ruleset);
  const state = usePersFormStore.getState();
  state.resetForm();
  state.updateFormData(backup.formData);
  state.setCurrentStep(backup.currentStep);
  state.setTotalSteps(backup.totalSteps);
  sessionStorage.removeItem("rpgbot-creator-step");
  return true;
}
