"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { askToConfirm } from "@/components/ui/confirm-dialog";
import { deleteTokenImageAction, listTokenImagesAction, setMapCreatureImageAction, uploadTokenImageAction } from "@/lib/actions/game-token-images";
import { ImageCropDialog } from "@/lib/components/portrait/ImageCropDialog";
import { buildMediaImageUrl } from "@/lib/media-url";
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { cn } from "@/lib/utils";
import { MAP_CREATURE_LIMITS, buildCreatureInitials, type MapCreatureView } from "@/rules/game-map-creatures";
import { useCutoutImage } from "./token-cutout";

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
          <p className="text-sm text-slate-400">Для всіх таких істот у кімнаті. Статблок лишається.</p>
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

function useTokenImageKeys() {
  const [keys, setKeys] = useState<string[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const load = async () => {
    setHasFailed(false);
    const result = await listTokenImagesAction().catch(() => null);
    if (result?.ok) setKeys(result.value);
    else setHasFailed(true);
  };
  useEffect(() => {
    void load();
  }, []);
  return { keys, hasFailed, load, setKeys };
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

type LibraryProps = { chosenKey: string | null; cropTitle: string; onPick: (imageKey: string) => Promise<void> };

/// Бібліотека зображень майстра: спільна для вигляду істот і обʼєктів на мапі.
export function TokenImageLibrary({ chosenKey, cropTitle, onPick }: LibraryProps) {
  const router = useModeRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { keys, hasFailed, load, setKeys } = useTokenImageKeys();
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [wantsToDelete, setWantsToDelete] = useState(false);
  const [isBusy, startBusy] = useTransition();
  const isFull = (keys?.length ?? 0) >= MAP_CREATURE_LIMITS.imagesPerUser;
  const isDeleting = wantsToDelete && Boolean(keys?.length);

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    setCroppingFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const uploadCropped = (blob: Blob) => {
    setCroppingFile(null);
    if (blob.size > MAX_IMAGE_UPLOAD_BYTES) return void toast.error("Картинка завелика навіть після стискання");
    startBusy(async () => {
      const formData = new FormData();
      formData.set("file", blob, "token.webp");
      const uploaded = await uploadTokenImageAction(formData).catch(() => null);
      if (!uploaded?.ok) return void toast.error(uploaded?.error ?? CONNECTION_ERROR);
      setKeys((current) => [uploaded.value, ...(current ?? [])]);
      await onPick(uploaded.value);
    });
  };

  const deleteImage = async (imageKey: string) => {
    const isConfirmed = await askToConfirm({ title: "Видалити зображення з бібліотеки?", description: "Істоти з цим зображенням повернуться до стандартного вигляду, а обʼєкти з ним зникнуть з мап.", confirmLabel: "Видалити", isDestructive: true });
    if (!isConfirmed) return;
    startBusy(async () => {
      const result = await deleteTokenImageAction(imageKey).catch(() => null);
      if (!result?.ok) return void toast.error(result?.error ?? CONNECTION_ERROR);
      setKeys((current) => (current ?? []).filter((key) => key !== imageKey));
      router.refresh();
    });
  };

  return (
    <div className="grid gap-2" aria-busy={isBusy || keys === null}>
      <div className="flex min-h-11 items-center justify-between gap-2">
        <span className="text-sm text-slate-400">{isDeleting ? "Торкніться зображення, щоб видалити" : "Ваші зображення"}</span>
        {keys?.length ? <Button type="button" variant="ghost" onClick={() => setWantsToDelete(!isDeleting)} className="h-11 shrink-0 px-3 text-slate-300">{isDeleting ? "Готово" : "Видалити зайві"}</Button> : null}
      </div>
      {hasFailed ? (
        <LibraryLoadError onRetry={load} />
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <button type="button" disabled={isBusy || isFull || isDeleting} onClick={() => inputRef.current?.click()} className={cn(TILE_CLASS, "grid place-items-center gap-1 border-dashed border-white/30 p-1 text-xs text-slate-200 disabled:opacity-50")}>
            <Upload className="h-5 w-5" aria-hidden />
            <span>{isBusy ? "Зачекайте" : "Нове"}</span>
          </button>
          {keys === null ? <div className={cn(TILE_CLASS, "border-white/10 bg-white/5")} aria-hidden /> : null}
          {keys?.map((key, index) => (
            <LibraryTile key={key} imageKey={key} index={index + 1} isChosen={key === chosenKey} isDeleting={isDeleting} disabled={isBusy} onPick={() => (isDeleting ? void deleteImage(key) : startBusy(() => onPick(key)))} />
          ))}
        </div>
      )}
      {keys?.length === 0 ? <p className="text-sm text-slate-400">Завантажте зображення один раз — і ставте його на мапу істотам чи обʼєктам.</p> : null}
      {isFull ? <p className="text-sm text-slate-400">{`У бібліотеці вже ${MAP_CREATURE_LIMITS.imagesPerUser} зображень — видаліть непотрібне, щоб додати нове.`}</p> : null}
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_MIME_TYPES} aria-label="Завантажити нове зображення" className="sr-only" tabIndex={-1} onChange={pickFile} />
      <ImageCropDialog file={croppingFile} title={cropTitle} onCancel={() => setCroppingFile(null)} onCropped={uploadCropped} onUnreadable={() => { setCroppingFile(null); toast.error("Не вдалося відкрити картинку. Спробуйте JPEG, PNG або WebP."); }} />
    </div>
  );
}

const TILE_CLASS = "relative aspect-square min-h-11 overflow-hidden rounded-xl border";

type TileProps = { imageKey: string; index: number; isChosen: boolean; isDeleting: boolean; disabled: boolean; onPick: () => void };

function LibraryTile({ imageKey, index, isChosen, isDeleting, disabled, onPick }: TileProps) {
  return (
    <button type="button" disabled={disabled} aria-pressed={isDeleting ? undefined : isChosen} aria-label={`${isDeleting ? "Видалити" : "Поставити"} зображення ${index}`} onClick={onPick} className={cn(TILE_CLASS, "bg-slate-900 disabled:opacity-50", isChosen ? "border-amber-300 ring-1 ring-amber-300" : "border-white/10 hover:border-white/30")}>
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
