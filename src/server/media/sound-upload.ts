import { randomUUID } from "node:crypto";
import { buildOwnSoundKey, findOwnSoundFile, OWN_SOUND_LIMITS, type OwnSoundKey } from "@/rules/game-atmosphere";
import { deleteMediaObject, isMediaStoreConfigured, putMediaObject } from "./media-store";

export type StoredSoundResult = { key: OwnSoundKey } | { error: string };

/// Лише формати, які декодує Web Audio і в Safari: OGG там грає не скрізь.
export function detectAudioType(bytes: Uint8Array): string | null {
  const text = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (text(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (text(0, 4) === "RIFF" && text(8, 12) === "WAVE") return "audio/wav";
  if (text(4, 8) === "ftyp") return "audio/mp4";
  return null;
}

export async function storeSceneSound(file: unknown): Promise<StoredSoundResult> {
  if (!isMediaStoreConfigured()) return { error: "Завантаження звуків тимчасово недоступне" };
  if (!(file instanceof Blob) || file.size === 0) return { error: "Оберіть звуковий файл" };
  if (file.size > OWN_SOUND_LIMITS.bytes) return { error: `Файл завеликий — до ${OWN_SOUND_LIMITS.bytes / 1024 / 1024} МБ` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectAudioType(bytes);
  if (!contentType) return { error: "Підходять лише MP3, M4A або WAV" };
  const key = buildOwnSoundKey(randomUUID());
  await putMediaObject(findOwnSoundFile(key), bytes, contentType);
  return { key };
}

export async function deleteSceneSound(key: OwnSoundKey): Promise<void> {
  try {
    await deleteMediaObject(findOwnSoundFile(key));
  } catch (error) {
    console.error("Не вдалося прибрати звук з R2", key, error);
  }
}
