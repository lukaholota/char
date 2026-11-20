"use server";

import { isOwnSoundKey } from "@/rules/game-atmosphere";
import { findCurrentUserId } from "@/server/db/current-user";
import { addOwnSound, deleteOwnSound, findOwnSounds, type OwnSound } from "@/server/db/user-sounds";
import { FAILURE_MESSAGES, rejectBadInput, runAsUser, type ActionResult } from "@/server/game-sessions/game-action";

export async function listOwnSoundsAction() {
  return runAsUser(async (userId) => ({ ok: true as const, value: await findOwnSounds(userId) }));
}

export async function uploadOwnSoundAction(formData: FormData): Promise<ActionResult<OwnSound>> {
  const userId = await findCurrentUserId();
  if (userId === null) return { ok: false, error: FAILURE_MESSAGES.signed_out };
  const file = formData.get("file");
  const added = await addOwnSound(userId, file, file instanceof File ? file.name : "");
  return "error" in added ? { ok: false, error: added.error } : { ok: true, value: added.sound };
}

export async function deleteOwnSoundAction(key: unknown) {
  return runAsUser(async (userId) => {
    if (!isOwnSoundKey(key)) return rejectBadInput;
    await deleteOwnSound(userId, key);
    return { ok: true as const, value: null };
  });
}
