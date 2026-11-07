'use server';

import { isFeatureUseAmount, type FeatureUseDirection } from "@/lib/offline/operations";
import { changeFeatureUses, findFeatureUses, type FeatureUseResult } from "@/server/db/feature-use-change";
import { changeFeatureState, type FeatureStateResult } from "@/server/db/feature-state-change";
import { applyChangeOnce } from "@/server/db/offline-operations";
import { findEditDenial, findEditingUser, revalidatePers } from "@/server/db/pers-edit-access";

/// amount — скільки очок пулу зняти за раз («Цілющі руки»); без нього — ціна риси.
type FeatureUseInput = { persId: number; featureId: number; operationId?: string; amount?: number };

export async function spendFeatureUse(input: FeatureUseInput): Promise<FeatureUseResult> {
  return changeFeatureUsesAsEditor(input, "spend");
}

export async function restoreFeatureUse(input: FeatureUseInput): Promise<FeatureUseResult> {
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
  { persId, featureId, operationId, amount }: FeatureUseInput,
  direction: FeatureUseDirection,
): Promise<FeatureUseResult> {
  if (amount !== undefined && !isFeatureUseAmount(amount)) return { success: false, error: "Неправильна кількість" };
  const editor = await findEditingUser(persId);
  if ("denial" in editor) return { success: false, error: editor.denial };

  const result = await applyChangeOnce(
    editor.userId,
    { operationId, persId, kind: "feature-use" },
    () => changeFeatureUses({ persId, featureId }, direction, amount),
    { isApplied: (outcome) => outcome.success, onDuplicate: () => findFeatureUses({ persId, featureId }) },
  );
  if (!result.success) return result;
  if (result.usesRemaining !== null) revalidatePers(persId);
  return { success: true, usesRemaining: result.usesRemaining };
}
