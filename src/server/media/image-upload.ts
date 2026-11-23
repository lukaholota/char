import { randomUUID } from "node:crypto";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { buildMediaObjectKey } from "@/lib/media-url";
import { buildObjectWebpImages, buildScreenshotWebp, buildSquareWebpImages, detectImageType } from "./image-processing";
import { deleteMediaObject, isMediaStoreConfigured, putMediaObject } from "./media-store";

export type StoredImageResult = { key: string } | { error: string };

export async function storeSquareImage(file: unknown, keyPrefix: string): Promise<StoredImageResult> {
  return storeImageWithThumbnail(file, keyPrefix, buildSquareWebpImages);
}

export async function storeObjectImage(file: unknown, keyPrefix: string): Promise<StoredImageResult> {
  return storeImageWithThumbnail(file, keyPrefix, buildObjectWebpImages);
}

async function storeImageWithThumbnail(file: unknown, keyPrefix: string, encode: typeof buildSquareWebpImages): Promise<StoredImageResult> {
  const input = await readAcceptedImageBytes(file, MAX_IMAGE_UPLOAD_BYTES);
  if ("error" in input) return input;
  const images = await encodeImages(input.bytes, encode);
  if (!images) return { error: "Не вдалося прочитати картинку" };

  const key = `${keyPrefix}/${randomUUID()}`;
  try {
    await putMediaObject(buildMediaObjectKey(key, "full"), images.full, "image/webp");
    await putMediaObject(buildMediaObjectKey(key, "thumbnail"), images.thumbnail, "image/webp");
  } catch (error) {
    await deleteStoredImage(key);
    throw error;
  }
  return { key };
}

export async function storeScreenshotImage(file: unknown, keyPrefix: string, encode = buildScreenshotWebp, maxBytes = MAX_IMAGE_UPLOAD_BYTES): Promise<StoredImageResult> {
  const bytes = await readAcceptedImageBytes(file, maxBytes);
  if ("error" in bytes) return bytes;

  const encoded = await encodeScreenshot(bytes.bytes, encode);
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

async function readAcceptedImageBytes(file: unknown, maxBytes: number): Promise<{ bytes: Uint8Array } | { error: string }> {
  if (!isMediaStoreConfigured()) return { error: "Завантаження картинок тимчасово недоступне" };
  if (!(file instanceof Blob) || file.size === 0) return { error: "Оберіть картинку" };
  if (file.size > maxBytes) return { error: "Картинка завелика" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!detectImageType(bytes)) return { error: "Підходять лише JPEG, PNG або WebP" };
  return { bytes };
}

async function encodeScreenshot(bytes: Uint8Array, encode: (bytes: Uint8Array) => Promise<Uint8Array>) {
  try {
    return await encode(bytes);
  } catch (error) {
    console.warn("sharp не прочитав скріншот", error);
    return null;
  }
}

async function encodeImages(bytes: Uint8Array, encode: typeof buildSquareWebpImages) {
  try {
    return await encode(bytes);
  } catch (error) {
    console.warn("sharp не прочитав картинку", error);
    return null;
  }
}
