const DEFAULT_MEDIA_URL = "https://media.char.holota.family";
const THUMBNAIL_SUFFIX = "-96";

export type MediaImageSize = "full" | "thumbnail";

export function buildMediaImageUrl(key: string, size: MediaImageSize): string {
  return `${readMediaBaseUrl()}/${buildMediaObjectKey(key, size)}`;
}

export function readMediaBaseUrl(): string {
  return process.env.NEXT_PUBLIC_MEDIA_URL ?? DEFAULT_MEDIA_URL;
}

export function buildMediaObjectKey(key: string, size: MediaImageSize): string {
  return size === "thumbnail" ? `${key}${THUMBNAIL_SUFFIX}.webp` : `${key}.webp`;
}
