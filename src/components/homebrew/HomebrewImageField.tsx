"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { ImageCropDialog } from "@/lib/components/portrait/ImageCropDialog";

export type HomebrewImage = { blob: Blob | null; previewUrl: string | null; isRemoved: boolean };

export function buildInitialHomebrewImage(previewUrl: string | null): HomebrewImage {
  return { blob: null, previewUrl, isRemoved: false };
}

export function appendHomebrewImage(formData: FormData, image: HomebrewImage, fileName: string): void {
  if (image.blob) formData.set("image", image.blob, fileName);
  if (image.isRemoved) formData.set("removeImage", "1");
}

type Props = { image: HomebrewImage; onChange: (image: HomebrewImage) => void; alt: string; cropTitle: string };

export function HomebrewImageField({ image, onChange, alt, cropTitle }: Props) {
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptCroppedImage = (blob: Blob) => {
    setCroppingFile(null);
    if (blob.size > MAX_IMAGE_UPLOAD_BYTES) return setError("Картинка завелика навіть після стискання");
    setError(null);
    onChange({ blob, previewUrl: URL.createObjectURL(blob), isRemoved: false });
  };

  const rejectUnreadableImage = () => {
    setCroppingFile(null);
    setError("Не вдалося відкрити картинку. Спробуйте JPEG, PNG або WebP.");
  };

  return (
    <section className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Картинка</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {image.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- попередній перегляд локального файлу або вже стиснутого WebP із R2
          <img src={image.previewUrl} alt={alt} width={128} height={128} className="h-32 w-32 rounded-xl border border-white/10 object-cover" />
        ) : null}
        <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_MIME_TYPES} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) setCroppingFile(file); }} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            {image.previewUrl ? "Замінити" : "Додати картинку"}
          </Button>
          {image.previewUrl ? (
            <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9" onClick={() => onChange({ blob: null, previewUrl: null, isRemoved: true })}>
              <Trash2 className="h-4 w-4" />
              Прибрати
            </Button>
          ) : null}
        </div>
      </div>
      <ImageCropDialog file={croppingFile} title={cropTitle} onCancel={() => setCroppingFile(null)} onCropped={acceptCroppedImage} onUnreadable={rejectUnreadableImage} />
      {error ? <p className="text-xs text-rose-300">{error}</p> : <p className="text-xs text-slate-500">Кадрування й стиснення автоматичні. Лише власні або вільні для використання зображення.</p>}
    </section>
  );
}
