"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { removePersPortrait, uploadPersPortrait } from "@/lib/actions/pers-portraits";
import { buildMediaImageUrl } from "@/lib/media-url";
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { ImageCropDialog } from "./ImageCropDialog";

type Props = {
  persId: number;
  name: string;
  portraitKey: string | null;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPortraitChange: (portraitKey: string | null) => void;
};

export function PortraitDialog({ persId, name, portraitKey, canEdit, open, onOpenChange, onPortraitChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [croppingFile, setCroppingFile] = useState<File | null>(null);

  const upload = (blob: Blob) => {
    setCroppingFile(null);
    startTransition(async () => {
      if (blob.size > MAX_IMAGE_UPLOAD_BYTES) return void toast.error("Картинка завелика навіть після стискання");

      const formData = new FormData();
      formData.set("persId", String(persId));
      formData.set("file", blob, "portrait.webp");
      applyResult(await uploadPersPortrait(formData), "Портрет оновлено");
    });
  };

  const remove = () => {
    startTransition(async () => applyResult(await removePersPortrait(persId), "Портрет прибрано"));
  };

  const applyResult = (result: Awaited<ReturnType<typeof removePersPortrait>>, successMessage: string) => {
    if (!result.success) return void toast.error(result.error);
    onPortraitChange(result.portraitKey);
    toast.success(successMessage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-sm overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg">{name}</DialogTitle>
          <DialogDescription>{canEdit ? "Виберіть фото — квадрат обріжете тут, розмір зменшимо автоматично." : "Портрет персонажа"}</DialogDescription>
        </DialogHeader>

        <div className="mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl border border-amber-400/30 bg-slate-800/60">
          {portraitKey ? (
            // eslint-disable-next-line @next/next/no-img-element -- WebP уже стиснутий у R2, оптимізатор Next лише повторив би роботу
            <img src={buildMediaImageUrl(portraitKey, "full")} alt={`Портрет: ${name}`} width={512} height={512} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserRound className="h-1/3 w-1/3 text-slate-600" aria-hidden />
            </div>
          )}
        </div>

        {canEdit ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMAGE_MIME_TYPES}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) setCroppingFile(file);
              }}
            />
            {portraitKey ? (
              <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9" onClick={remove} disabled={isPending}>
                <Trash2 className="h-4 w-4" />
                Прибрати
              </Button>
            ) : null}
            <Button type="button" className="h-11 gap-2 sm:h-9" onClick={() => inputRef.current?.click()} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {portraitKey ? "Замінити" : "Завантажити"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
      <ImageCropDialog
        file={croppingFile}
        title="Кадр портрета"
        onCancel={() => setCroppingFile(null)}
        onCropped={upload}
        onUnreadable={() => {
          setCroppingFile(null);
          toast.error("Не вдалося відкрити картинку. Спробуйте JPEG, PNG або WebP.");
        }}
      />
    </Dialog>
  );
}
