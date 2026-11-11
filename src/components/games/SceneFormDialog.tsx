"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Library, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createGameSceneAction, deleteGameSceneAction, renameGameSceneAction, replaceGameSceneMapAction } from "@/lib/actions/game-sessions";
import { shrinkScreenshotForUpload } from "@/lib/components/portrait/resize-image";
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { buildMediaImageUrl } from "@/lib/media-url";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import type { LibraryMap } from "@/lib/refs/map-library";
import { LIGHT_LIMITS } from "@/rules/game-lighting";
import { GAME_SCENE_LIMITS, findAutoSceneName, type GameSceneListItem } from "@/rules/game-scenes";
import { countWallSegments, WALL_LIMITS } from "@/rules/game-walls";
import { parseUvttScene, UVTT_FILE_EXTENSIONS, UVTT_FILE_PATTERN, type SceneLayout, type UvttFailure } from "@/rules/uvtt-import";
import { MapLibraryPicker, MapQuickPicks, useMapLibrary, type LibraryState } from "./MapLibraryPicker";
import { askToConfirm } from "@/components/ui/confirm-dialog";

type MapChoice = { kind: "upload"; file: Blob; label: string; previewUrl: string; layout: SceneLayout | null } | { kind: "library"; map: LibraryMap };

const UVTT_ERRORS: Record<UvttFailure | "edit_scene", string> = {
  bad_file: "Файл не схожий на експорт Universal VTT",
  no_image: "У файлі немає картинки мапи",
  too_many_walls: `Забагато стін: понад ${WALL_LIMITS.segmentsPerScene} відрізків навіть після спрощення`,
  too_many_lights: `Забагато світла: понад ${LIGHT_LIMITS.perScene} джерел`,
  edit_scene: "Мапу зі стінами відкрийте як нову сцену",
};

type SceneFormDialogProps = { sessionId: number; scene: GameSceneListItem | null; open: boolean; onOpenChange: (open: boolean) => void };

export function SceneFormDialog({ sessionId, scene, open, onOpenChange }: SceneFormDialogProps) {
  const library = useMapLibrary(open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="flex max-h-[90dvh] flex-col overflow-y-auto bg-slate-950 sm:max-w-2xl">
        <DialogTitle className="pr-10 normal-case leading-10 tracking-normal">{scene ? "Сцена" : "Нова сцена"}</DialogTitle>
        {open ? <SceneForm sessionId={sessionId} scene={scene} library={library} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

type SceneFormProps = { sessionId: number; scene: GameSceneListItem | null; library: LibraryState; onDone: () => void };

function SceneForm({ sessionId, scene, library, onDone }: SceneFormProps) {
  const router = useModeRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(scene?.name ?? "");
  const [autoName, setAutoName] = useState<string | null>(null);
  const [choice, setChoice] = useState<MapChoice | null>(null);
  useRevokedPreview(choice);
  const [isPickingFromLibrary, setIsPickingFromLibrary] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const chooseFile = async (file: File) => {
    try {
      const imported = UVTT_FILE_PATTERN.test(file.name) ? (scene ? ({ ok: false, error: "edit_scene" } as const) : await readUvttFile(file)) : null;
      if (imported && !imported.ok) return void toast.error(UVTT_ERRORS[imported.error]);
      const shrunk = await shrinkScreenshotForUpload(imported ? decodeBase64(imported.value.imageBase64) : file);
      if (shrunk.size > MAX_IMAGE_UPLOAD_BYTES) return void toast.error("Картинка завелика навіть після стискання");
      setChoice({ kind: "upload", file: shrunk, label: file.name, previewUrl: URL.createObjectURL(shrunk), layout: imported ? toLayout(imported.value) : null });
    } catch {
      toast.error("Не вдалося прочитати картинку");
    }
  };

  const pickLibraryMap = (map: LibraryMap) => {
    setChoice({ kind: "library", map });
    setIsPickingFromLibrary(false);
    const suggested = findAutoSceneName(name, autoName, map.name);
    if (suggested === null) return;
    setName(suggested);
    setAutoName(suggested);
  };

  const run = async (work: () => Promise<{ ok: boolean; error?: string }>) => {
    setIsBusy(true);
    const result = await work();
    setIsBusy(false);
    if (!result.ok) return void toast.error(result.error);
    router.refresh();
    onDone();
  };

  const save = async () => {
    if (scene?.hasMap && choice && !(await askToConfirm({ title: "Замінити мапу?", description: "Істоти й герої цієї сцени зійдуть з мапи в ряд під нею.", confirmLabel: "Замінити" }))) return;
    void run(async () => {
      if (!scene) {
        const result = await createGameSceneAction(sessionId, name, buildMapForm(choice));
        if (result.ok) captureGameEvent("game_scene_created", { source: choice?.kind ?? "none" });
        if (result.ok && choice?.kind === "upload" && choice.layout) captureGameEvent("game_uvtt_imported", countLayout(choice.layout));
        return result;
      }
      if (name.trim() !== scene.name) {
        const renamed = await renameGameSceneAction(sessionId, scene.id, name);
        if (!renamed.ok) return renamed;
      }
      if (!choice) return { ok: true };
      const replaced = await replaceGameSceneMapAction(sessionId, scene.id, buildMapForm(choice));
      if (replaced.ok) captureGameEvent("game_map_changed", { has_map: true });
      return replaced;
    });
  };

  const remove = async () => {
    if (!scene) return;
    if (!(await askToConfirm({ title: `Видалити сцену «${scene.name}»?`, description: "Її мапа, істоти й токени героїв зникнуть.", confirmLabel: "Видалити", isDestructive: true }))) return;
    void run(async () => {
      const result = await deleteGameSceneAction(sessionId, scene.id);
      if (result.ok) captureGameEvent("game_scene_deleted", {});
      return result;
    });
  };

  const chosenSlug = choice?.kind === "library" ? choice.map.slug : null;
  if (isPickingFromLibrary) {
    return <MapLibraryPicker library={library} chosenSlug={chosenSlug} onBack={() => setIsPickingFromLibrary(false)} onPick={pickLibraryMap} />;
  }
  return (
    <form onSubmit={(event) => { event.preventDefault(); save(); }} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="game-scene-name" className="text-sm font-semibold text-slate-200">Назва сцени</label>
        <Input id="game-scene-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={GAME_SCENE_LIMITS.name} placeholder="Наприклад, Лісова дорога" className="h-12 text-base" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-200">{scene ? "Нова мапа" : "Мапа"}</p>
        <MapQuickPicks library={library} chosenSlug={chosenSlug} onPick={pickLibraryMap} />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-12 gap-2 text-base">
            <ImagePlus className="h-4 w-4" aria-hidden />
            Завантажити
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsPickingFromLibrary(true)} className="h-12 gap-2 text-base">
            <Library className="h-4 w-4" aria-hidden />
            Усі мапи
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept={scene ? ACCEPTED_IMAGE_MIME_TYPES : `${ACCEPTED_IMAGE_MIME_TYPES},${UVTT_FILE_EXTENSIONS}`} className="hidden" aria-label="Картинка мапи" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void chooseFile(file); }} />
        {choice ? (
          <ChosenMap choice={choice} onClear={() => setChoice(null)} />
        ) : (
          <p className="text-sm text-slate-300">{scene ? (scene.hasMap ? "Лишиться поточна мапа." : "У сцени ще немає мапи.") : "Мапу можна додати й пізніше."}</p>
        )}
        {scene?.hasMap && choice ? <p className="text-sm text-amber-200">Істоти й герої цієї сцени зійдуть з мапи в ряд під нею.</p> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="submit" disabled={isBusy || !name.trim()} className="h-12 text-base">{isBusy ? "Зберігаємо…" : scene ? "Зберегти" : "Створити"}</Button>
        {scene?.isActive ? <p className="self-center text-sm text-slate-300">Гравці бачать цю сцену — щоб видалити, спершу покажіть їм іншу.</p> : null}
        {scene && !scene.isActive ? (
          <Button type="button" variant="ghost" onClick={remove} disabled={isBusy} className="h-12 gap-2 text-base text-rose-200">
            <Trash2 className="h-4 w-4" aria-hidden />
            Видалити сцену
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function ChosenMap({ choice, onClear }: { choice: MapChoice; onClear: () => void }) {
  const isLibrary = choice.kind === "library";
  const src = isLibrary ? buildMediaImageUrl(choice.map.key, "thumbnail") : choice.previewUrl;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-arcane-300/40 bg-arcane-500/10 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- мініатюра з бібліотеки або локальний файл до завантаження */}
      <img src={src} alt="" width={96} height={72} className="aspect-[4/3] w-24 shrink-0 rounded-md bg-white/5 object-cover" />
      <p className="min-w-0 flex-1 text-sm text-slate-100">
        <span className="block text-slate-300">{isLibrary ? "Базова мапа" : "Свій файл"}</span>
        <span className="line-clamp-2 break-words">{isLibrary ? choice.map.name : choice.label}</span>
        {!isLibrary && choice.layout ? <span className="block text-slate-300">{describeLayout(choice.layout)}</span> : null}
      </p>
      <Button type="button" variant="ghost" onClick={onClear} aria-label="Прибрати обрану мапу" title="Прибрати обрану мапу" className="h-11 w-11 shrink-0 p-0 text-slate-300">
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

function useRevokedPreview(choice: MapChoice | null) {
  const previewUrl = choice?.kind === "upload" ? choice.previewUrl : null;
  useEffect(() => (previewUrl ? () => URL.revokeObjectURL(previewUrl) : undefined), [previewUrl]);
}

function buildMapForm(choice: MapChoice | null): FormData {
  const formData = new FormData();
  if (choice?.kind === "library") formData.append("library", choice.map.slug);
  if (choice?.kind === "upload") formData.append("file", choice.file, "map.webp");
  if (choice?.kind === "upload" && choice.layout) formData.append("layout", JSON.stringify(choice.layout));
  return formData;
}

async function readUvttFile(file: File) {
  try {
    return parseUvttScene(JSON.parse(await file.text()));
  } catch {
    return { ok: false as const, error: "bad_file" as const };
  }
}

const decodeBase64 = (base64: string) => new Blob([Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))]);
const toLayout = ({ grid, lighting, walls, lights }: SceneLayout): SceneLayout => ({ grid, lighting, walls, lights });

function countLayout(layout: SceneLayout) {
  const doors = layout.walls.filter((wall) => wall.kind === "door");
  return { walls: countWallSegments(layout.walls) - doors.length, doors: doors.length, lights: layout.lights.length };
}

function describeLayout(layout: SceneLayout) {
  const { walls, doors, lights } = countLayout(layout);
  return `Стін: ${walls}, дверей: ${doors}, світла: ${lights}${layout.lighting === "dark" ? " · сцена буде темною" : ""}`;
}
