"use server";

import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import { findUserIdByEmail } from "@/server/db/users";
import { acquirePersFeat } from "@/server/db/feat-acquisition";
import {
  isFeatOfPersRuleset,
  removePersFeatById,
  getPersFeats,
  PersFeatWithDetails,
} from "@/server/db/feat-actions";
import { revalidatePath } from "next/cache";
import type { FeatPrisma } from "@/lib/types/model-types";
import { hasFeatSpellChoice } from "@/rules/feat-spell-choices";
import type { FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";
import type { RulesetId } from "@/rules/strategies/types";
import { loadSheetFeatAcquisitionContent } from "@/server/db/feat-acquisition";
import { loadFeatRemovalPreview, removePersFeatWithGrants, type FeatRemovalPreview } from "@/server/db/feat-removal";
import { loadSheetFeatSpellOffer } from "@/server/db/levelup-persistence";

async function assertOwnsPers(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { ok: false as const, error: "Не авторизовано" };

  const userId = await findUserIdByEmail(session.user.email);
  if (!userId) return { ok: false as const, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) return { ok: false as const, error: "Немає доступу до персонажа" };

  return { ok: true as const, userId };
}

export async function addFeatToPers({
  persId,
  featId,
  choiceOptionIds = [],
  featSpellIds = [],
}: {
  persId: number;
  featId: number;
  choiceOptionIds?: number[];
  featSpellIds?: number[];
}): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };
  if (!(await isFeatOfPersRuleset(persId, featId))) {
    return { success: false, error: "Ця риса належить іншій редакції правил" };
  }

  try {
    const acquired = await acquirePersFeat(persId, { featId, choiceOptionIds, featSpellIds });
    if ("error" in acquired) return { success: false, error: acquired.error };

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/char/home`);
    revalidatePath(`/character/${persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding feat to pers:", error);
    return { success: false, error: "Помилка при додаванні риси" };
  }
}

export type SheetFeatAcquisitionContent = { feat: FeatPrisma; hasSpellChoice: boolean };

export async function getSheetFeatAcquisitionContent(persId: number, featEngName: string): Promise<SheetFeatAcquisitionContent | null> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return null;

  const content = await loadSheetFeatAcquisitionContent(persId, String(featEngName));
  if (!content) return null;
  return { feat: content.feat, hasSpellChoice: hasFeatSpellChoice(content.ruleset as RulesetId, content.feat.name) };
}

export async function getSheetFeatSpellOffer(persId: number, featId: number, choiceOptionIds: number[]): Promise<FeatSpellChoiceOffer | null> {
  return loadSheetFeatSpellOffer(Number(persId), { featId: Number(featId), featChoiceOptionIds: choiceOptionIds.map(Number).filter((id) => Number.isInteger(id) && id > 0) });
}

export async function removeFeatFromPers({
  persId,
  featId,
}: {
  persId: number;
  featId: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    const removed = await removePersFeatWithGrants(persId, featId);
    if ("error" in removed) return { success: false, error: removed.error };

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/char/home`);
    revalidatePath(`/character/${persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing feat from pers:", error);
    return { success: false, error: "Помилка при видаленні риси" };
  }
}

export async function getFeatRemovalPreview(persId: number, featId: number): Promise<FeatRemovalPreview | null> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return null;
  return loadFeatRemovalPreview(Number(persId), Number(featId));
}

export async function removePersFeatAction({
  persId,
  persFeatId,
}: {
  persId: number;
  persFeatId: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    await removePersFeatById(persFeatId, persId);

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/char/home`);
    revalidatePath(`/character/${persId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing pers feat:", error);
    return { success: false, error: "Помилка при видаленні риси" };
  }
}

export async function fetchPersFeats(persId: number): Promise<PersFeatWithDetails[]> {
  return getPersFeats(persId);
}
