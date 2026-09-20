'use server';

import type { FeatureUseDirection } from "@/lib/offline/operations";
import { changeFeatureUses, type FeatureUseResult } from "@/server/db/feature-use-change";
import { changeFeatureState, type FeatureStateResult } from "@/server/db/feature-state-change";
import { findEditDenial, revalidatePers } from "@/server/db/pers-edit-access";

export async function spendFeatureUse(input: { persId: number; featureId: number }): Promise<FeatureUseResult> {
  return changeFeatureUsesAsEditor(input, "spend");
}

export async function restoreFeatureUse(input: { persId: number; featureId: number }): Promise<FeatureUseResult> {
  return changeFeatureUsesAsEditor(input, "restore");
}

export async function setFeatureActive(input: { persId: number; featureId: number; isActive: boolean }): Promise<FeatureStateResult> {
  const denied = await findEditDenial(input.persId);
  if (denied) return { success: false, error: denied };

  const result = await changeFeatureState(input, input.isActive);
  if (result.success) revalidatePers(input.persId);
  return result;
}

async function changeFeatureUsesAsEditor(
  { persId, featureId }: { persId: number; featureId: number },
  direction: FeatureUseDirection,
): Promise<FeatureUseResult> {
  const denied = await findEditDenial(persId);
  if (denied) return { success: false, error: denied };

  const result = await changeFeatureUses({ persId, featureId }, direction);
  if (!result.success) return result;
  if (result.usesRemaining !== null) revalidatePers(persId);
  return { success: true, usesRemaining: result.usesRemaining };
}
