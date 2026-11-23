"use server";

import { findCurrentUserId } from "@/server/db/current-user";
import { addImageToLibrary, createImageFolder, listImageLibrary, moveLibraryImage } from "@/server/db/token-images";
import { FAILURE_MESSAGES, isId, rejectBadInput, runAsUser, type ActionResult } from "@/server/game-sessions/game-action";

export async function listImageLibraryAction() {
  return runAsUser(async (userId) => ({ ok: true, value: await listImageLibrary(userId) }));
}

export async function createImageFolderAction(rawName: unknown) {
  const name = typeof rawName === "string" ? rawName.trim().normalize("NFC") : "";
  if (!name || name.length > 60) return { ok: false as const, error: "Назва папки має містити від 1 до 60 символів" };
  return runAsUser(async (userId) => ({ ok: true, value: await createImageFolder(userId, name) }));
}

export async function moveLibraryImageAction(imageKey: unknown, folderId: unknown) {
  return runAsUser(async (userId) => {
    if (typeof imageKey !== "string" || (folderId !== null && !isId(folderId))) return rejectBadInput;
    return moveLibraryImage(userId, imageKey, folderId);
  });
}

export async function uploadImageToLibraryAction(formData: FormData): Promise<ActionResult<string>> {
  const userId = await findCurrentUserId();
  if (userId === null) return { ok: false, error: FAILURE_MESSAGES.signed_out };
  const rawFolderId = formData.get("folderId");
  const folderId = rawFolderId === null ? null : Number(rawFolderId);
  if (folderId !== null && !isId(folderId)) return { ok: false, error: "Папку не знайдено" };
  const stored = await addImageToLibrary(userId, formData.get("file"), folderId, formData.get("cropped") === "1");
  return "error" in stored ? { ok: false, error: stored.error } : { ok: true, value: stored.key };
}
