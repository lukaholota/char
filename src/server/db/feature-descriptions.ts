"use server";

import { prisma } from "@/lib/prisma";
import { canEditPers } from "@/lib/actions/pers";
import { findCurrentUserId } from "@/server/db/current-user";
import { isFeatureDescriptionKind, readCustomDescriptionInput, type FeatureDescriptionTarget } from "@/lib/logic/feature-descriptions";

type SaveFeatureDescriptionResult = { success: true; description: string | null } | { success: false; error: string };

export async function saveFeatureDescription(input: { persId: number; target: FeatureDescriptionTarget; description: string }): Promise<SaveFeatureDescriptionResult> {
  const accessError = await findEditAccessError(input.persId);
  if (accessError) return { success: false, error: accessError };
  if (!isFeatureDescriptionKind(input.target.kind) || !Number.isInteger(input.target.refId)) {
    return { success: false, error: "Невідома фіча" };
  }

  const parsed = readCustomDescriptionInput(String(input.description ?? ""));
  if (parsed.action === "INVALID") return { success: false, error: parsed.error };
  if (parsed.action === "RESET") {
    await deleteFeatureDescription(input.persId, input.target);
    return { success: true, description: null };
  }

  await upsertFeatureDescription(input.persId, input.target, parsed.description);
  return { success: true, description: parsed.description };
}

async function findEditAccessError(persId: number): Promise<string | null> {
  const userId = await findCurrentUserId();
  if (!userId) return "Не авторизовано";
  return (await canEditPers(persId, userId)) ? null : "Немає доступу до персонажа";
}

async function deleteFeatureDescription(persId: number, target: FeatureDescriptionTarget) {
  await prisma.persFeatureDescription.deleteMany({ where: { persId, kind: target.kind, refId: target.refId } });
}

async function upsertFeatureDescription(persId: number, target: FeatureDescriptionTarget, description: string) {
  await prisma.persFeatureDescription.upsert({
    where: { persId_kind_refId: { persId, kind: target.kind, refId: target.refId } },
    create: { persId, kind: target.kind, refId: target.refId, description },
    update: { description, updatedAt: new Date() },
  });
}
