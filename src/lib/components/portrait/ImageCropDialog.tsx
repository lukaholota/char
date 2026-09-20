"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildCenteredCrop, findDisplayScale, findSourceSquare, MAX_CROP_ZOOM, moveCrop, zoomCrop, type CropState } from "./crop-geometry";
import { cropImageForUpload } from "./resize-image";

type Props = { file: File | null; title: string; onCancel: () => void; onCropped: (blob: Blob) => void; onUnreadable: () => void };

export function ImageCropDialog({ file, title, onCancel, onCropped, onUnreadable }: Props) {
  const bitmap = useImageBitmap(file, onUnreadable);
  const [isSaving, setSaving] = useState(false);
  const cropper = useCropper(bitmap);

  const confirm = async () => {
    if (!bitmap || !cropper.crop) return;
    setSaving(true);
    try {
      onCropped(await cropImageForUpload(bitmap.image, findSourceSquare(cropper.crop)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-sm overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg">{title}</DialogTitle>
          <DialogDescription>Потягніть картинку й наблизьте, щоб обрати квадрат.</DialogDescription>
        </DialogHeader>

        <div
          ref={cropper.viewportRef}
          className="relative mx-auto aspect-square w-full touch-none select-none overflow-hidden rounded-2xl border border-amber-400/40 bg-slate-900"
          onPointerDown={cropper.startPointer}
          onPointerMove={cropper.movePointer}
          onPointerUp={cropper.endPointer}
          onPointerCancel={cropper.endPointer}
          onWheel={(event) => cropper.zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1)}
        >
          {bitmap && cropper.crop ? (
            // eslint-disable-next-line @next/next/no-img-element -- локальний blob-URL обраного файлу, оптимізатору Next тут нічого робити
            <img
              src={bitmap.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
              style={{ width: bitmap.image.width, height: bitmap.image.height, transform: `translate(${cropper.crop.offsetX}px, ${cropper.crop.offsetY}px) scale(${findDisplayScale(cropper.crop)})` }}
            />
          ) : (
            <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-slate-500" />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
        </div>

        <label className="flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            type="range"
            min={1}
            max={MAX_CROP_ZOOM}
            step={0.01}
            value={cropper.crop?.zoom ?? 1}
            onChange={(event) => cropper.zoomTo(Number(event.target.value))}
            aria-label="Наближення"
            className="h-11 w-full accent-amber-400"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={onCancel}>
            Скасувати
          </Button>
          <Button type="button" className="h-11 sm:h-9" disabled={!cropper.crop || isSaving} onClick={confirm}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Обрати кадр"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function useImageBitmap(file: File | null, onUnreadable: () => void) {
  const [loaded, setLoaded] = useState<{ file: File; image: ImageBitmap; url: string } | null>(null);
  const reportUnreadable = useRef(onUnreadable);
  reportUnreadable.current = onUnreadable;

  useEffect(() => {
    if (!file) return;
    let isCancelled = false;
    const url = URL.createObjectURL(file);
    createImageBitmap(file)
      .then((image) => (isCancelled ? image.close() : setLoaded({ file, image, url })))
      .catch(() => !isCancelled && reportUnreadable.current());
    return () => {
      isCancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return loaded && loaded.file === file ? loaded : null;
}

function useCropper(bitmap: { image: ImageBitmap } | null) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<CropState | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  useLayoutEffect(() => {
    const viewport = viewportRef.current?.clientWidth;
    if (bitmap && viewport) setCrop(buildCenteredCrop(viewport, bitmap.image.width, bitmap.image.height));
  }, [bitmap]);

  const startPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous || !crop) return;
    const others = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId).map(([, point]) => point);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (others.length === 0) return setCrop(moveCrop(crop, event.clientX - previous.x, event.clientY - previous.y));

    const before = Math.hypot(previous.x - others[0].x, previous.y - others[0].y);
    const after = Math.hypot(event.clientX - others[0].x, event.clientY - others[0].y);
    if (before > 0) setCrop(zoomCrop(crop, crop.zoom * (after / before)));
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
  };

  return {
    viewportRef,
    crop,
    startPointer,
    movePointer,
    endPointer,
    zoomTo: (zoom: number) => crop && setCrop(zoomCrop(crop, zoom)),
    zoomBy: (factor: number) => crop && setCrop(zoomCrop(crop, crop.zoom * factor)),
  };
}
