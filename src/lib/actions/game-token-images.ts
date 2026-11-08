"use server";

import { findCurrentUserId } from "@/server/db/current-user";
import { addTokenImage, deleteTokenImage, findTokenImageKeys, setMapCreatureImage } from "@/server/db/token-images";
import { FAILURE_MESSAGES, isId, rejectBadInput, runAsUser, type ActionResult } from "@/server/game-sessions/game-action";

export async function listTokenImagesAction() {
  return runAsUser(async (userId) => ({ ok: true as const, value: await findTokenImageKeys(userId) }));
}

export async function uploadTokenImageAction(formData: FormData): Promise<ActionResult<string>> {
  const userId = await findCurrentUserId();
  if (userId === null) return { ok: false, error: FAILURE_MESSAGES.signed_out };
  const stored = await addTokenImage(userId, formData.get("file"));
  return "error" in stored ? { ok: false, error: stored.error } : { ok: true, value: stored.key };
}

export async function setMapCreatureImageAction(sessionId: number, creatureId: number, imageKey: unknown) {
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(creatureId) || (imageKey !== null && typeof imageKey !== "string")) return rejectBadInput;
    return setMapCreatureImage(sessionId, userId, creatureId, imageKey);
  });
}

export async function deleteTokenImageAction(imageKey: unknown) {
  return runAsUser(async (userId) => {
    if (typeof imageKey !== "string") return rejectBadInput;
    return deleteTokenImage(userId, imageKey);
  });
}
