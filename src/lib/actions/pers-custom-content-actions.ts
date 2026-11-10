"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import { findUserIdByEmail } from "@/server/db/users";
import { applyChangeOnce, isOperationId } from "@/server/db/offline-operations";
import {
  deleteCustomFeature,
  deleteCustomSkill,
  listCustomFeatures,
  listCustomSkills,
  saveCustomFeature,
  saveCustomSkill,
  stepCustomFeatureUses,
} from "@/server/db/pers-custom-content";
import type { FeatureUseDirection } from "@/lib/offline/operations";
import {
  readCustomFeatureDraft,
  readCustomSkillDraft,
  type CustomContentErrors,
  type CustomFeatureDraft,
  type CustomSkillDraft,
} from "@/rules/pers-custom-content";

type SkillRows = Awaited<ReturnType<typeof listCustomSkills>>;
type FeatureRows = Awaited<ReturnType<typeof listCustomFeatures>>;
export type CustomSkillSaveResult = { success: true; skills: SkillRows } | { success: false; error?: string; errors?: CustomContentErrors<CustomSkillDraft> };
export type CustomFeatureSaveResult = { success: true; features: FeatureRows } | { success: false; error?: string; errors?: CustomContentErrors<CustomFeatureDraft> };
export type CustomFeatureUseResult = { success: true } | { success: false; error: string };

export async function saveCustomSkillAction(persId: number, skillId: number | null, draft: unknown): Promise<CustomSkillSaveResult> {
  const access = await findEditAccess(persId);
  if (!access.ok) return { success: false, error: access.error };
  const reading = readCustomSkillDraft(draft);
  if (!reading.ok) return { success: false, errors: reading.errors };
  const failure = await saveCustomSkill(persId, skillId, reading.input);
  if (failure) return failure;
  revalidateSheet(persId);
  return { success: true, skills: await listCustomSkills(persId) };
}

export async function deleteCustomSkillAction(persId: number, skillId: number): Promise<CustomSkillSaveResult> {
  const access = await findEditAccess(persId);
  if (!access.ok) return { success: false, error: access.error };
  await deleteCustomSkill(persId, skillId);
  revalidateSheet(persId);
  return { success: true, skills: await listCustomSkills(persId) };
}

export async function saveCustomFeatureAction(persId: number, featureId: number | null, draft: unknown): Promise<CustomFeatureSaveResult> {
  const access = await findEditAccess(persId);
  if (!access.ok) return { success: false, error: access.error };
  const reading = readCustomFeatureDraft(draft);
  if (!reading.ok) return { success: false, errors: reading.errors };
  const failure = await saveCustomFeature(persId, featureId, reading.input);
  if (failure) return failure;
  revalidateSheet(persId);
  return { success: true, features: await listCustomFeatures(persId) };
}

export async function deleteCustomFeatureAction(persId: number, featureId: number): Promise<CustomFeatureSaveResult> {
  const access = await findEditAccess(persId);
  if (!access.ok) return { success: false, error: access.error };
  await deleteCustomFeature(persId, featureId);
  revalidateSheet(persId);
  return { success: true, features: await listCustomFeatures(persId) };
}

export async function stepCustomFeatureUseAction(persId: number, featureId: number, direction: FeatureUseDirection, operationId?: string): Promise<CustomFeatureUseResult> {
  const access = await findEditAccess(persId);
  if (!access.ok) return { success: false, error: access.error };
  if (direction !== "spend" && direction !== "restore") return { success: false, error: "Невідома дія" };
  return applyChangeOnce<CustomFeatureUseResult>(
    access.userId,
    { operationId: isOperationId(operationId) ? operationId : undefined, persId, kind: "custom-feature-use" },
    async () => {
      await stepCustomFeatureUses(persId, featureId, direction);
      return { success: true };
    },
    { isApplied: (result) => result.success, onDuplicate: () => ({ success: true }) },
  );
}

async function findEditAccess(persId: number): Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Не авторизовано" };
  const userId = await findUserIdByEmail(session.user.email);
  if (!userId) return { ok: false, error: "Користувача не знайдено" };
  return (await canEditPers(persId, userId)) ? { ok: true, userId } : { ok: false, error: "Немає доступу до персонажа" };
}

function revalidateSheet(persId: number) {
  revalidatePath(`/char/${persId}`);
}
