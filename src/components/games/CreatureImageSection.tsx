"use client";

import { useRef, useState, useTransition, type ButtonHTMLAttributes, type ChangeEvent } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { askToConfirm } from "@/components/ui/confirm-dialog";
import { deleteTokenImageAction, setMapCreatureImageAction, uploadTokenImageAction } from "@/lib/actions/game-token-images";
import { createImageFolderAction, moveLibraryImageAction } from "@/lib/actions/game-image-library";
import { ImageCropDialog } from "@/lib/components/portrait/ImageCropDialog";
import { buildMediaImageUrl } from "@/lib/media-url";
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { cn } from "@/lib/utils";
import { MAP_CREATURE_LIMITS, buildCreatureInitials, type MapCreatureView } from "@/rules/game-map-creatures";
import { useCutoutImage } from "./token-cutout";
import { useFileDrop } from "./use-file-drop";
import { LIST_TOUCH_HOLD_MS, useTokenDrag } from "./use-token-drag";
import { useImageLibrary } from "./use-image-library";
import { ObjectLibraryFolders } from "./ObjectLibraryFolders";
import { isLibraryImage, uploadLibraryImage, uploadLibraryImages } from "./upload-library-images";

export type CutoutControl = { value: boolean; onChange: (isCutout: boolean) => void };
type Props = { sessionId: number; creature: MapCreatureView; cutout: CutoutControl };

const CONNECTION_ERROR = "Не вдалося звʼязатися із сервером — спробуйте ще раз";

export function CreatureImageSection({ sessionId, creature, cutout }: Props) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { isCutout: hasTransparentArt, inspectImage } = useCutoutImage(creature.imageUrl);
  const canChooseLook = hasTransparentArt && !creature.isRoundImage;
  return (
    <section aria-label="Вигляд на мапі" className="grid gap-3 rounded-xl border border-white/10 p-3">
      <div className="flex items-center gap-3">
        <TokenPreview creature={creature} isCutout={canChooseLook && cutout.value} onLoad={inspectImage} />
        <div className="min-w-0">
          <p className="text-sm text-slate-200">Вигляд на мапі</p>
          <p className="text-sm text-slate-400">{creature.customName ? "Для всіх істот з цим імʼям" : "Для всіх таких істот без власного імені"}. Статблок лишається.</p>
        </div>
      </div>
      <Button type="button" variant="outline" aria-expanded={isPickerOpen} onClick={() => setIsPickerOpen(!isPickerOpen)} className="h-11 gap-2">
        <ImagePlus className="h-4 w-4" aria-hidden />
        {isPickerOpen ? "Згорнути" : "Замінити зображення"}
      </Button>
      {isPickerOpen ? <CreatureImagePicker sessionId={sessionId} creature={creature} onApplied={() => setIsPickerOpen(false)} /> : null}
      {canChooseLook ? <TokenLookPicker cutout={cutout} /> : null}
    </section>
  );
}

function TokenPreview({ creature, isCutout, onLoad }: { creature: MapCreatureView; isCutout: boolean; onLoad: (image: HTMLImageElement) => void }) {
  const isArtHidden = useIsArtHidden(creature.imageUrl, "manual");
  const src = isArtHidden ? null : creature.imageUrl;
  return (
    <div className={cn("relative h-14 w-14 shrink-0", !isCutout && "overflow-hidden rounded-full border-2 border-white/20 bg-slate-900")}>
      {src ? (
        <ContentImage src={src} alt="" provenance="manual" fill sizes="56px" onLoad={(event) => onLoad(event.currentTarget)} className={creature.isRoundImage || isCutout ? "object-contain" : "object-cover object-top"} />
      ) : (
        <span aria-hidden className="grid h-full w-full place-items-center font-rpg-display text-slate-100">{buildCreatureInitials(creature.label)}</span>
      )}
    </div>
  );
}

function CreatureImagePicker({ sessionId, creature, onApplied }: { sessionId: number; creature: MapCreatureView; onApplied: () => void }) {
  const router = useModeRouter();
  const [isBusy, startBusy] = useTransition();
  const applyImage = async (imageKey: string | null) => {
    const result = await setMapCreatureImageAction(sessionId, creature.id, imageKey).catch(() => null);
    if (!result?.ok) return void toast.error(result?.error ?? CONNECTION_ERROR);
    router.refresh();
    onApplied();
  };
  return (
    <div className="grid gap-2">
      <TokenImageLibrary chosenKey={creature.customImageKey} cropTitle="Зображення істоти" onPick={applyImage} />
      {creature.customImageKey ? <Button type="button" variant="ghost" disabled={isBusy} onClick={() => startBusy(() => applyImage(null))} className="h-11 justify-self-start px-3 text-slate-300">Повернути стандартне</Button> : null}
    </div>
  );
}

type Point = { clientX: number; clientY: number };
type MapDrop = { onDrop: (imageKey: string, point: Point) => Promise<void>; canDropAt: (point: Point) => boolean; folderId: number | null; onFolderChange: (id: number | null) => void };
type LibraryProps = { chosenKey: string | null; cropTitle: string; onPick: (imageKey: string) => Promise<void>; mapDrop?: MapDrop };

/// Бібліотека зображень майстра: спільна для вигляду істот і обʼєктів на мапі.
export function TokenImageLibrary({ chosenKey, cropTitle, onPick, mapDrop }: LibraryProps) {
  const router = useModeRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { library, hasFailed, load, setLibrary } = useImageLibrary(Boolean(mapDrop));
  const folderId = mapDrop?.folderId ?? null;
  const [moveTo, setMoveTo] = useState<number | null | undefined>(undefined);
  const [progress, setProgress] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<Awaited<ReturnType<typeof uploadLibraryImages>> | null>(null);
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [wantsToDelete, setWantsToDelete] = useState(false);
  const [isBusy, startBusy] = useTransition();
  const keys = library?.images.filter((image) => image.folderId === folderId).map((image) => image.imageKey) ?? null;
  const capacity = MAP_CREATURE_LIMITS.imagesPerUser - (library?.images.length ?? 0);
  const isFull = capacity <= 0;
  const isDeleting = wantsToDelete && Boolean(keys?.length);
  const changeFolder = (id: number | null) => {
    mapDrop?.onFolderChange(id);
    setMoveTo(undefined);
    setWantsToDelete(false);
  };
  const createFolder = async (name: string) => {
    const result = await createImageFolderAction(name).catch(() => null);
    if (!result?.ok) {
      toast.error(result?.error ?? CONNECTION_ERROR);
      return undefined;
    }
    setLibrary((current) => current && ({ ...current, folders: [...current.folders.filter(({ id }) => id !== result.value.id), result.value].toSorted((a, b) => a.name.localeCompare(b.name, "uk")) }));
    changeFolder(result.value.id);
    return result.value.id;
  };
  const appendImages = (added: string[], destination: number | null) => {
    setLibrary((current) => ({ folders: current?.folders ?? [], images: [...added.toReversed().map((imageKey) => ({ imageKey, folderId: destination })), ...(current?.images ?? [])] }));
  };
  const importFiles = (files: File[], directory?: string) => startBusy(async () => {
    if (!files.some(isLibraryImage)) return void toast.error("У виборі немає зображень JPEG, PNG або WebP");
    const destination = directory ? await createFolder(directory) : folderId;
    if (destination === undefined) return;
    setImportResult(null);
    setProgress(`0 / ${files.length}`);
    const result = await uploadLibraryImages(files, destination, capacity, (done) => setProgress(`${done} / ${files.length}`));
    setProgress(null);
    setImportResult(result);
    appendImages(result.keys, destination);
    if (!directory && files.length === 1 && result.keys.length === 1) await onPick(result.keys[0]);
  });
  const moveImage = (imageKey: string, destination: number | null) => startBusy(async () => {
    const result = await moveLibraryImageAction(imageKey, destination).catch(() => null);
    if (!result?.ok) return void toast.error(result?.error ?? CONNECTION_ERROR);
    setLibrary((current) => current && ({ ...current, images: current.images.map((image) => image.imageKey === imageKey ? { ...image, folderId: destination } : image) }));
    toast.success("Зображення переміщено");
  });
  const isMoving = moveTo !== undefined;
  const cannotUpload = isBusy || isFull || isDeleting || isMoving || library === null;
  const drop = useFileDrop(mapDrop ? (file) => importFiles([file]) : setCroppingFile, cannotUpload, mapDrop ? importFiles : undefined);
  const canDropAt = (point: Point) => mapDrop?.canDropAt(point) ?? false;
  const drag = useTokenDrag<string>((key, point) => mapDrop && canDropAt(point) && startBusy(() => mapDrop.onDrop(key, point)), canDropAt, (key) => startBusy(() => onPick(key)), LIST_TOUCH_HOLD_MS);

  /// Обʼєкт лишає свої пропорції й прозорість, тож квадратна обрізка — лише для токенів істот.
  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!mapDrop) setCroppingFile(files[0] ?? null);
    else if (files.length > 0) importFiles(files);
  };

  const uploadCropped = (blob: Blob) => {
    setCroppingFile(null);
    if (blob.size > MAX_IMAGE_UPLOAD_BYTES) return void toast.error("Картинка завелика навіть після стискання");
    startBusy(async () => {
      const formData = new FormData();
      formData.set("file", blob, "token.webp");
      const uploaded = await (mapDrop ? uploadLibraryImage(blob, folderId, true) : uploadTokenImageAction(formData)).catch(() => null);
      if (!uploaded?.ok) return void toast.error(uploaded?.error ?? CONNECTION_ERROR);
      appendImages([uploaded.value], folderId);
      await onPick(uploaded.value);
    });
  };

  const deleteImage = async (imageKey: string) => {
    const isConfirmed = await askToConfirm({ title: "Видалити зображення з бібліотеки?", description: "Істоти з цим зображенням повернуться до стандартного вигляду, а обʼєкти з ним зникнуть з мап.", confirmLabel: "Видалити", isDestructive: true });
    if (!isConfirmed) return;
    startBusy(async () => {
      const result = await deleteTokenImageAction(imageKey).catch(() => null);
      if (!result?.ok) return void toast.error(result?.error ?? CONNECTION_ERROR);
      setLibrary((current) => current && ({ ...current, images: current.images.filter((image) => image.imageKey !== imageKey) }));
      router.refresh();
    });
  };

  return (
    <div className="grid gap-2" aria-busy={isBusy || keys === null}>
      <div className="flex min-h-11 items-center justify-between gap-2">
        <span className="text-sm text-slate-400">{isDeleting ? "Торкніться зображення, щоб видалити" : isMoving ? "Виберіть зображення для переміщення" : "Ваші зображення"}</span>
        {keys?.length && !isMoving ? <Button type="button" variant="ghost" onClick={() => setWantsToDelete(!isDeleting)} className="h-11 shrink-0 px-3 text-slate-300">{isDeleting ? "Готово" : "Видалити зайві"}</Button> : null}
      </div>
      {mapDrop && library && !isDeleting ? <ObjectLibraryFolders folders={library.folders} folderId={folderId} isBusy={isBusy} canUpload={!cannotUpload} moveTo={moveTo} onSelect={changeFolder} onCreate={async (name) => (await createFolder(name)) !== undefined} onUpload={importFiles} onMoveTo={setMoveTo} /> : null}
      {progress ? <p role="status" className="text-sm tabular-nums text-slate-300">Завантаження {progress}</p> : null}
      {importResult ? <p role="status" className="text-sm text-slate-300">Завантажено {importResult.keys.length} із {importResult.keys.length + importResult.failures.length}.</p> : null}
      {importResult?.failures.length ? <details className="break-words text-sm text-rose-200"><summary className="cursor-pointer">Пропущено файлів: {importResult.failures.length}</summary><ul className="mt-1 space-y-1">{importResult.failures.map(({ name, error }, index) => <li key={`${name}-${index}`}>{name} · {error}</li>)}</ul></details> : null}
      {hasFailed ? (
        <LibraryLoadError onRetry={load} />
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <button type="button" disabled={cannotUpload} onClick={() => inputRef.current?.click()} {...drop.bindDrop} title="Натисніть або перетягніть файл сюди" className={cn(TILE_CLASS, "grid place-items-center gap-1 border-dashed p-1 text-xs text-slate-200 disabled:opacity-50", drop.isOver ? "border-amber-300 bg-amber-300/10" : "border-white/30")}>
            <Upload className="h-5 w-5" aria-hidden />
            <span>{isBusy ? "Зачекайте" : drop.isOver ? "Сюди" : "Нове"}</span>
          </button>
          {keys === null ? <div className={cn(TILE_CLASS, "border-white/10 bg-white/5")} aria-hidden /> : null}
          {keys?.map((key, index) => (
            <LibraryTile key={key} imageKey={key} index={index + 1} isChosen={key === chosenKey} isDeleting={isDeleting} isMoving={isMoving} disabled={isBusy} onPick={() => isDeleting ? void deleteImage(key) : moveTo !== undefined ? moveImage(key, moveTo) : startBusy(() => onPick(key))} dragBinding={mapDrop && !isDeleting && !isMoving ? drag.bindToken(key) : undefined} />
          ))}
        </div>
      )}
      {keys?.length === 0 ? <p className="text-sm text-slate-400">{folderId === null ? "Завантажте зображення один раз — і ставте його на мапу істотам чи обʼєктам." : "У папці ще немає зображень."}</p> : null}
      {isFull ? <p className="text-sm text-slate-400">{`У бібліотеці вже ${MAP_CREATURE_LIMITS.imagesPerUser} зображень — видаліть непотрібне, щоб додати нове.`}</p> : null}
      {drag.ghost ? (
        // eslint-disable-next-line @next/next/no-img-element -- та сама мініатюра, що й у бібліотеці
        <img src={buildMediaImageUrl(drag.ghost.id, "thumbnail")} alt="" aria-hidden width={64} height={64} className={cn("pointer-events-none fixed z-[10000] h-16 w-16 -translate-x-1/2 -translate-y-1/2 object-contain", !drag.ghost.isOverTarget && "opacity-60")} style={{ left: drag.ghost.clientX, top: drag.ghost.clientY }} />
      ) : null}
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_MIME_TYPES} multiple={Boolean(mapDrop)} aria-label="Завантажити нове зображення" className="sr-only" tabIndex={-1} onChange={pickFile} />
      <ImageCropDialog file={croppingFile} title={cropTitle} onCancel={() => setCroppingFile(null)} onCropped={uploadCropped} onUnreadable={() => { setCroppingFile(null); toast.error("Не вдалося відкрити картинку. Спробуйте JPEG, PNG або WebP."); }} />
    </div>
  );
}

const TILE_CLASS = "relative aspect-square min-h-11 overflow-hidden rounded-xl border";

type TileProps = { imageKey: string; index: number; isChosen: boolean; isDeleting: boolean; isMoving: boolean; disabled: boolean; onPick: () => void; dragBinding?: Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onPointerDown"> };

function LibraryTile({ imageKey, index, isChosen, isDeleting, isMoving, disabled, onPick, dragBinding }: TileProps) {
  return (
    <button type="button" disabled={disabled} aria-pressed={isDeleting || isMoving ? undefined : isChosen} aria-label={`${isDeleting ? "Видалити" : isMoving ? "Перемістити" : "Поставити"} зображення ${index}`} onClick={(event) => (!dragBinding || event.detail === 0) && onPick()} {...dragBinding} className={cn(TILE_CLASS, "bg-slate-900 select-none [-webkit-touch-callout:none] disabled:opacity-50", isChosen ? "border-amber-300 ring-1 ring-amber-300" : "border-white/10 hover:border-white/30")}>
      <ContentImage src={buildMediaImageUrl(imageKey, "thumbnail")} alt="" provenance="manual" fill sizes="96px" className="object-contain" />
      {isDeleting ? <span className="absolute inset-0 grid place-items-center bg-slate-950/60 text-rose-200"><Trash2 className="h-5 w-5" aria-hidden /></span> : null}
    </button>
  );
}

function LibraryLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-rose-200">Не вдалося відкрити бібліотеку.</p>
      <Button type="button" variant="outline" onClick={onRetry} className="h-11">Спробувати ще раз</Button>
    </div>
  );
}

const LOOK_CHOICES = [{ isCutout: false, label: "Токен" }, { isCutout: true, label: "Прозорий" }];

function TokenLookPicker({ cutout }: { cutout: CutoutControl }) {
  return (
    <div role="group" aria-label="Форма токена" className="grid grid-cols-2 gap-1.5">
      {LOOK_CHOICES.map(({ isCutout, label }) => (
        <button key={label} type="button" aria-pressed={cutout.value === isCutout} onClick={() => cutout.onChange(isCutout)} className={cn("h-11 rounded-xl border text-sm", cutout.value === isCutout ? "border-white/30 bg-white/10 text-slate-100" : "border-white/10 text-slate-400 hover:text-slate-200")}>
          {label}
        </button>
      ))}
    </div>
  );
}
