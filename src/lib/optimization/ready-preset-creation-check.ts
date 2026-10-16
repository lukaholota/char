import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { buildDetailsSchema } from "./schema";
import { countRemainingBuildPoints } from "./build-draft";
import { fillDefaultOpenPicks } from "./ready-preset-default-spells";
import { buildAssemblyStartState } from "./ready-preset-level-context";
import { findAssemblyChoiceProblem, type AssemblyChoiceContext, type ReadyPresetLevels } from "./ready-preset-levels";
import type { ReadyPresetOptions } from "./ready-preset-options";
import { findSavedPresetProblem, isSavedPresetValid, parseSavedPresetDraft } from "./ready-preset-validation";

export const MISSING_NAME_MESSAGE = "Вкажіть імʼя персонажа.";

export type PresetLevelPicks = Pick<AssemblyChoiceContext, "targetLevel" | "choices" | "advancements" | "classOptionChoices" | "preparedSpellKeys">;
export type PresetCreationCheck = { start: PersFormData; blockedBy: null } | { start: null; blockedBy: string };

export function buildPresetChoiceContext(levels: ReadyPresetLevels | null, picks: PresetLevelPicks, draft: Partial<PersFormData>, options: ReadyPresetOptions): AssemblyChoiceContext | null {
  if (!levels || picks.targetLevel === 1 || !draft.classId) return null;
  const playerContext: AssemblyChoiceContext = {
    levels, targetLevel: picks.targetLevel, choices: picks.choices, advancements: picks.advancements,
    classOptionChoices: picks.classOptionChoices, preparedSpellKeys: picks.preparedSpellKeys, start: buildAssemblyStartState(draft, options),
  };
  return { ...playerContext, choices: fillDefaultOpenPicks(playerContext) };
}

export function findPresetChoiceProblem(context: AssemblyChoiceContext | null): string | null {
  return context ? findAssemblyChoiceProblem(context) : null;
}

export function checkPresetCreation(draft: Partial<PersFormData>, expected: PersFormData, options: ReadyPresetOptions, choiceProblem: string | null): PresetCreationCheck {
  const input = parseSavedPresetDraft(draft);
  const scores = buildDetailsSchema.shape.abilityScores.safeParse(draft.asi);
  const isAllowed = input.success && scores.success && countRemainingBuildPoints(scores.data) >= 0
    && input.data.name.trim() !== "" && isSavedPresetValid(input.data, expected, options) && !choiceProblem;
  if (isAllowed) return { start: { ...input.data, name: input.data.name.trim() }, blockedBy: null };
  return { start: null, blockedBy: choiceProblem ?? findSavedPresetProblem(draft, expected, options) ?? MISSING_NAME_MESSAGE };
}
