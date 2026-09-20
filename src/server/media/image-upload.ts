import { randomUUID } from "node:crypto";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { buildMediaObjectKey } from "@/lib/media-url";
import { buildScreenshotWebp, buildSquareWebpImages, detectImageType } from "./image-processing";
import { deleteMediaObject, isMediaStoreConfigured, putMediaObject } from "./media-store";

export type StoredImageResult = { key: string } | { error: string };

export async function storeSquareImage(file: unknown, keyPrefix: string): Promise<StoredImageResult> {
  if (!isMediaStoreConfigured()) return { error: "Завантаження картинок тимчасово недоступне" };
  if (!(file instanceof Blob) || file.size === 0) return { error: "Оберіть картинку" };
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return { error: "Картинка завелика" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!detectImageType(bytes)) return { error: "Підходять лише JPEG, PNG або WebP" };

  const images = await encodeImages(bytes);
  if (!images) return { error: "Не вдалося прочитати картинку" };

  const key = `${keyPrefix}/${randomUUID()}`;
  await putMediaObject(buildMediaObjectKey(key, "full"), images.full, "image/webp");
  await putMediaObject(buildMediaObjectKey(key, "thumbnail"), images.thumbnail, "image/webp");
  return { key };
}

export async function storeScreenshotImage(file: unknown, keyPrefix: string): Promise<StoredImageResult> {
  const bytes = await readAcceptedImageBytes(file);
  if ("error" in bytes) return bytes;

  const encoded = await encodeScreenshot(bytes.bytes);
  if (!encoded) return { error: "Не вдалося прочитати картинку" };

  const key = `${keyPrefix}/${randomUUID()}`;
  await putMediaObject(buildMediaObjectKey(key, "full"), encoded, "image/webp");
  return { key };
}

export async function deleteStoredImage(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await Promise.all([deleteMediaObject(buildMediaObjectKey(key, "full")), deleteMediaObject(buildMediaObjectKey(key, "thumbnail"))]);
  } catch (error) {
    console.error("Не вдалося прибрати стару картинку з R2", key, error);
  }
}

async function readAcceptedImageBytes(file: unknown): Promise<{ bytes: Uint8Array } | { error: string }> {
  if (!isMediaStoreConfigured()) return { error: "Завантаження картинок тимчасово недоступне" };
  if (!(file instanceof Blob) || file.size === 0) return { error: "Оберіть картинку" };
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return { error: "Картинка завелика" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!detectImageType(bytes)) return { error: "Підходять лише JPEG, PNG або WebP" };
  return { bytes };
}

async function encodeScreenshot(bytes: Uint8Array) {
  try {
    return await buildScreenshotWebp(bytes);
  } catch (error) {
    console.warn("sharp не прочитав скріншот", error);
    return null;
  }
}

async function encodeImages(bytes: Uint8Array) {
  try {
    return await buildSquareWebpImages(bytes);
  } catch (error) {
    console.warn("sharp не прочитав картинку", error);
    return null;
  }
}
