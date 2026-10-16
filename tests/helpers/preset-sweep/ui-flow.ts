import { fullCharacterSchema, type PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { CreatorContent } from "@/server/db/creator-content-query";
import { countRemainingBuildPoints } from "@/lib/optimization/build-draft";
import { buildReadyPresetDraft } from "@/lib/optimization/ready-preset";
import { EMPTY_ASSEMBLY_DRAFT, ensureRequestId, type AssemblyDraft } from "@/lib/optimization/ready-preset-assembly-draft";
import { fillDefaultOpenPicks } from "@/lib/optimization/ready-preset-default-spells";
import { buildAssemblyStartState } from "@/lib/optimization/ready-preset-level-context";
import {
  buildAssemblyCreationRequest, excludeLaterPlanPicks, findAssemblyChoiceProblem, isSelectableTargetLevel, type AssemblyChoiceContext, type ReadyPresetLevels,
} from "@/lib/optimization/ready-preset-levels";
import { buildReadyPresetLevels } from "@/lib/optimization/ready-preset-levels.server";
import { buildReadyPresetOptions, type ReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import { buildRequestId } from "@/lib/optimization/ready-preset-request-id";
import { listSavedPresetIssues } from "@/lib/optimization/ready-preset-validation";
import { buildDetailsSchema } from "@/lib/optimization/schema";
import type { StoredPreset } from "./cases";

export type PresetPage = StoredPreset & { draft: PersFormData; options: ReadyPresetOptions; levels: ReadyPresetLevels | null };
export type CreationPath = "guide" | "customize";
export type PresetSession = { page: PresetPage; form: Partial<PersFormData>; assembly: AssemblyDraft; path: CreationPath };
export type AssemblyCreationRequest = ReturnType<typeof buildAssemblyCreationRequest>;
export type CreationRequest = { kind: "level-one"; body: PersFormData } | { kind: "assembly"; body: AssemblyCreationRequest };

export function openPresetPage(stored: StoredPreset, content: CreatorContent): PresetPage {
  const draft = buildReadyPresetDraft(stored.recipe, stored.preset, content);
  const levels = buildReadyPresetLevels(stored.recipe, content, stored.preset.subraceKey);
  return { ...stored, draft, levels, options: excludeLaterPlanPicks(buildReadyPresetOptions(draft, content), levels) };
}

export function startPresetSession(page: PresetPage, name: string): PresetSession {
  return { page, form: { ...page.draft, readyPresetRequestId: buildRequestId(), name }, assembly: EMPTY_ASSEMBLY_DRAFT, path: "guide" };
}

export function selectTargetLevel(session: PresetSession, level: number): PresetSession {
  const { levels } = session.page;
  if (!levels || !isSelectableTargetLevel(levels, level)) return session;
  return { ...session, assembly: ensureRequestId({ ...session.assembly, targetLevel: level }) };
}

export function buildChoiceContext(session: PresetSession): AssemblyChoiceContext | null {
  const { page: { levels, options }, assembly, form } = session;
  if (!levels || assembly.targetLevel === 1 || !form.classId) return null;
  const playerContext: AssemblyChoiceContext = {
    levels, targetLevel: assembly.targetLevel, choices: assembly.choices, advancements: assembly.advancements,
    classOptionChoices: assembly.classOptionChoices, preparedSpellKeys: assembly.preparedSpellKeys, start: buildAssemblyStartState(form, options),
  };
  return { ...playerContext, choices: fillDefaultOpenPicks(playerContext) };
}

export function listCreationBlockers(session: PresetSession): string[] {
  const { form, page } = session;
  const input = fullCharacterSchema.safeParse(form);
  const scores = buildDetailsSchema.shape.abilityScores.safeParse(form.asi);
  const context = buildChoiceContext(session);
  const choiceProblem = context ? findAssemblyChoiceProblem(context) : null;
  return [
    ...(input.success ? [] : [`форма не проходить схему: ${input.error.issues.map((issue) => issue.path.join(".")).join(", ")}`]),
    ...(scores.success && countRemainingBuildPoints(scores.data) >= 0 ? [] : ["характеристики: забагато очок"]),
    ...(input.success && input.data.name.trim() ? [] : ["немає імені"]),
    ...listSavedPresetIssues(form, page.draft, page.options).map((issue) => `${issue.step ?? "чернетка"}: ${issue.message}`),
    ...(choiceProblem ? [`рівні: ${choiceProblem}`] : []),
  ];
}

export function buildCreationRequest(session: PresetSession): CreationRequest {
  const { page: { preset, recipe }, assembly } = session;
  const parsed = fullCharacterSchema.parse(session.form);
  const start: PersFormData = { ...parsed, name: parsed.name.trim(), ruleset: recipe.ruleset };
  const context = buildChoiceContext(session);
  const requestId = assembly.requestIds[assembly.targetLevel];
  if (!context || !requestId) return { kind: "level-one", body: { ...start, readyPresetBuildId: preset.buildId } };
  return { kind: "assembly", body: buildAssemblyCreationRequest({ preset: { buildId: preset.buildId, revisionId: preset.revisionId }, requestId, start, context }) };
}
