import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { CreatorContent } from "@/server/db/creator-content-query";
import { buildReadyPresetDraft } from "@/lib/optimization/ready-preset";
import { EMPTY_ASSEMBLY_DRAFT, ensureRequestId, type AssemblyDraft } from "@/lib/optimization/ready-preset-assembly-draft";
import { buildPresetChoiceContext, checkPresetCreation, findPresetChoiceProblem } from "@/lib/optimization/ready-preset-creation-check";
import { buildAssemblyCreationRequest, excludeLaterPlanPicks, isSelectableTargetLevel, type AssemblyChoiceContext, type ReadyPresetLevels } from "@/lib/optimization/ready-preset-levels";
import { buildReadyPresetLevels } from "@/lib/optimization/ready-preset-levels.server";
import { buildReadyPresetOptions, type ReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import { buildRequestId } from "@/lib/optimization/ready-preset-request-id";
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

function buildChoiceContext(session: PresetSession): AssemblyChoiceContext | null {
  return buildPresetChoiceContext(session.page.levels, session.assembly, session.form, session.page.options);
}

function checkSessionCreation(session: PresetSession) {
  return checkPresetCreation(session.form, session.page.draft, session.page.options, findPresetChoiceProblem(buildChoiceContext(session)));
}

export function listCreationBlockers(session: PresetSession): string[] {
  const { blockedBy } = checkSessionCreation(session);
  return blockedBy ? [blockedBy] : [];
}

export function buildCreationRequest(session: PresetSession): CreationRequest {
  const { page: { preset, recipe }, assembly } = session;
  const checked = checkSessionCreation(session).start;
  if (!checked) throw new Error("сторінка не дозволила б створення");
  const start: PersFormData = { ...checked, ruleset: recipe.ruleset };
  const context = buildChoiceContext(session);
  const requestId = assembly.requestIds[assembly.targetLevel];
  if (!context || !requestId) return { kind: "level-one", body: { ...start, readyPresetBuildId: preset.buildId } };
  return { kind: "assembly", body: buildAssemblyCreationRequest({ preset: { buildId: preset.buildId, revisionId: preset.revisionId }, requestId, start, context }) };
}
