import { uploadImageToLibraryAction } from "@/lib/actions/game-image-library";
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { shrinkObjectImageForUpload } from "@/lib/components/portrait/resize-image";

export async function uploadLibraryImage(file: Blob, folderId: number | null, isCropped: boolean) {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return { ok: false as const, error: "Картинка завелика навіть після стискання" };
  const formData = new FormData();
  formData.set("file", file, "object.webp");
  if (folderId !== null) formData.set("folderId", String(folderId));
  if (isCropped) formData.set("cropped", "1");
  return uploadImageToLibraryAction(formData);
}

export function isLibraryImage(file: File): boolean {
  return ACCEPTED_IMAGE_MIME_TYPES.split(",").includes(file.type) || (!file.type && /\.(?:jpe?g|png|webp)$/i.test(file.name));
}

export async function uploadLibraryImages(files: File[], folderId: number | null, capacity: number, onProgress: (done: number) => void) {
  const keys: string[] = [];
  const failures: Array<{ name: string; error: string }> = [];
  for (const [index, file] of files.entries()) {
    if (!isLibraryImage(file)) failures.push({ name: file.name, error: "Підходять лише JPEG, PNG або WebP" });
    else if (keys.length >= capacity) failures.push({ name: file.name, error: "Бібліотека заповнена" });
    else {
      try {
        const result = await uploadLibraryImage(await shrinkObjectImageForUpload(file), folderId, false);
        if (result.ok) keys.push(result.value);
        else failures.push({ name: file.name, error: result.error });
      } catch {
        failures.push({ name: file.name, error: "Не вдалося підготувати або завантажити картинку" });
      }
    }
    onProgress(index + 1);
  }
  return { keys, failures };
}
