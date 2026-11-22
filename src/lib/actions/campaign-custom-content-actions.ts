"use server";

import { revalidatePath } from "next/cache";
import { isId, rejectBadInput, runAsUser } from "@/server/game-sessions/game-action";
import { findActiveGmSession, signalGameSession } from "@/server/db/game-sessions";
import { deleteCampaignFeature, deleteCampaignSkill, saveCampaignFeature, saveCampaignSkill } from "@/server/db/campaign-custom-content";
import type { CustomSaveFailure } from "@/server/db/pers-custom-content";
import { readCustomFeatureDraft, readCustomSkillDraft, type CustomContentErrors } from "@/rules/pers-custom-content";

export type CampaignContentResult<Draft> = { success: true } | { success: false; error?: string; errors?: CustomContentErrors<Draft> };

export async function saveCampaignSkillAction(sessionId: number, skillId: number | null, draft: unknown) {
  const reading = readCustomSkillDraft(draft);
  if (!reading.ok) return { success: false as const, errors: reading.errors };
  return changeAsGm(sessionId, () => saveCampaignSkill(sessionId, skillId, reading.input));
}

export async function deleteCampaignSkillAction(sessionId: number, skillId: number) {
  return changeAsGm(sessionId, async () => (isId(skillId) ? void (await deleteCampaignSkill(sessionId, skillId)) : null));
}

export async function saveCampaignFeatureAction(sessionId: number, featureId: number | null, draft: unknown) {
  const reading = readCustomFeatureDraft(draft);
  if (!reading.ok) return { success: false as const, errors: reading.errors };
  return changeAsGm(sessionId, () => saveCampaignFeature(sessionId, featureId, reading.input));
}

export async function deleteCampaignFeatureAction(sessionId: number, featureId: number) {
  return changeAsGm(sessionId, async () => (isId(featureId) ? void (await deleteCampaignFeature(sessionId, featureId)) : null));
}

async function changeAsGm(sessionId: number, change: () => Promise<CustomSaveFailure | null | void>): Promise<{ success: true } | CustomSaveFailure> {
  const result = await runAsUser(async (userId) => {
    if (!isId(sessionId)) return rejectBadInput;
    const gm = await findActiveGmSession(sessionId, userId);
    if (!gm.ok) return gm;
    return { ok: true as const, value: (await change()) ?? null };
  });
  if (!result.ok) return { success: false, error: result.error };
  if (result.value) return result.value;
  await signalGameSession(sessionId, "members");
  revalidatePath("/char/[id]", "page");
  return { success: true };
}
