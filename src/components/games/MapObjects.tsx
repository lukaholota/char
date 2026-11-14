"use client";

import { ArrowDownToLine, ArrowUpToLine, Copy, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { OBJECT_LIMITS, toObjectPlacement, toObjectTransform, type SceneObjectView } from "@/rules/game-objects";
import { TokenImageLibrary } from "./CreatureImageSection";
import type { MapHistory } from "./map-history";
import { HistoryButtons, Segmented, Stepper, ToolPanel } from "./MapToolbar";
import { ObjectLibraryPicker } from "./ObjectLibraryPicker";
import { TokenTransformHandles } from "./TokenTransformControls";
import type { MapObjects } from "./use-map-objects";

const SIZE_STEP = 0.25;
const ROTATION_STEP = 15;
const describeCells = (widthCells: number) => `${widthCells.toLocaleString("uk-UA")} кл.`;
const describeObject = (object: SceneObjectView) => object.name ?? "Обʼєкт";
const IMAGE_SOURCES = [{ value: "own", label: "Свої" }, { value: "set", label: "Набір" }] as const;
type ImageSource = (typeof IMAGE_SOURCES)[number]["value"];

/// Обʼєкт — частина мапи: росте разом із нею, без протизуму токенів. Поза інструментом він не ловить дотиків.
export function MapObjectsLayer({ objects, isEditing }: { objects: MapObjects; isEditing: boolean }) {
  return (
    <div className={cn("absolute inset-0", !isEditing && "pointer-events-none")}>
      {objects.shown.map((object) => {
        const at = objects.findShownAt(object);
        const isChosen = objects.chosen?.id === object.id;
        const box = { left: `${at.x * 100}%`, top: `${at.y * 100}%`, width: `${objects.findWidthShare(object) * 100}%` };
        const image = (
          // eslint-disable-next-line @next/next/no-img-element -- зображення з бібліотеки вже стиснуте до webp, а розмір залежить від зуму мапи
          <img src={object.imageUrl} alt={isEditing ? "" : (object.name ?? "")} draggable={false} className="block h-auto w-full select-none" style={object.rotation ? { transform: `rotate(${object.rotation}deg)` } : undefined} />
        );
        return (
          <div key={object.id} className={cn("absolute -translate-x-1/2 -translate-y-1/2", object.isHidden && "opacity-50", objects.ghostId === object.id && "opacity-80")} style={box}>
            {isEditing ? (
              <button type="button" data-map-control aria-label={`${describeObject(object)}${object.isHidden ? ", схований" : ""}`} aria-pressed={isChosen} className="block w-full touch-none rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-arcane-200" {...objects.bindObject(object.id)}>
                {image}
              </button>
            ) : image}
            {isChosen ? <TokenTransformHandles token={{ transform: toObjectTransform(object), onPreview: (transform) => objects.preview(object.id, transform), onChange: (transform) => objects.changeTransform(object.id, transform) }} onDeselect={() => objects.choose(null)} /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function ObjectsPanel({ objects, history, onClose }: { objects: MapObjects; history: MapHistory; onClose: () => void }) {
  const [source, setSource] = useState<ImageSource>("own");
  const chosen = objects.chosen;
  if (chosen) return <ChosenObjectPanel key={chosen.id} object={chosen} objects={objects} history={history} onClose={onClose} />;
  return (
    <ToolPanel title="Обʼєкти" onClose={onClose} aside={<HistoryButtons history={history} />}>
      <p className="text-sm leading-snug text-slate-400">Вибрана картинка стане в центр видимої частини мапи; з набору її можна й перетягнути на місце. Торкніться обʼєкта, щоб вибрати, тягніть — щоб пересунути.</p>
      {objects.isFull ? (
        <p className="text-sm text-amber-100">{`На сцені вже ${OBJECT_LIMITS.perScene} обʼєктів — видаліть зайві, щоб додати новий.`}</p>
      ) : (
        <>
          <Segmented label="Звідки картинка" value={source} options={[...IMAGE_SOURCES]} onChange={setSource} />
          {source === "own" ? (
            <TokenImageLibrary chosenKey={null} cropTitle="Зображення обʼєкта" onPick={(imageKey) => objects.placeFromLibrary(imageKey)} />
          ) : (
            <ObjectLibraryPicker onPick={(imageKey, widthCells, dropPoint) => void objects.placeFromLibrary(imageKey, widthCells, dropPoint)} canDropAt={objects.canDropAt} />
          )}
        </>
      )}
    </ToolPanel>
  );
}

function ChosenObjectPanel({ object, objects, history, onClose }: { object: SceneObjectView; objects: MapObjects; history: MapHistory; onClose: () => void }) {
  const placement = toObjectPlacement(object);
  const changeSize = (direction: number) => objects.change(object.id, { ...placement, widthCells: Math.min(OBJECT_LIMITS.widthCells.max, Math.max(OBJECT_LIMITS.widthCells.min, object.widthCells + direction * SIZE_STEP)) });
  const turn = (direction: number) => objects.change(object.id, { ...placement, rotation: (object.rotation + direction * ROTATION_STEP + 360) % 360 });
  useDeleteKey(objects.remove);
  return (
    <ToolPanel title={describeObject(object)} onClose={onClose} aside={<HistoryButtons history={history} />}>
      <ObjectNameField name={object.name} onSave={(name) => objects.change(object.id, { ...placement, name })} />
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm text-slate-300">
        Сховати від гравців
        <Switch checked={object.isHidden} onCheckedChange={objects.toggleHidden} />
      </label>
      <Stepper label="Розмір" value={describeCells(object.widthCells)} onStep={changeSize} canDecrease={object.widthCells > OBJECT_LIMITS.widthCells.min} canIncrease={object.widthCells < OBJECT_LIMITS.widthCells.max} />
      <Stepper label="Поворот" value={`${object.rotation}°`} onStep={turn} />
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
        <Button type="button" variant="outline" onClick={objects.raise} className="h-11 gap-2"><ArrowUpToLine className="h-4 w-4" aria-hidden />Наперед</Button>
        <Button type="button" variant="outline" onClick={objects.lower} className="h-11 gap-2"><ArrowDownToLine className="h-4 w-4" aria-hidden />Назад</Button>
        <Button type="button" variant="outline" onClick={objects.copy} disabled={objects.isFull} className="h-11 gap-2"><Copy className="h-4 w-4" aria-hidden />Копія</Button>
        <Button type="button" variant="outline" onClick={objects.remove} className="h-11 gap-2 text-rose-200"><Trash2 className="h-4 w-4" aria-hidden />Видалити</Button>
      </div>
      <Button type="button" variant="ghost" onClick={() => objects.choose(null)} className="h-11 w-full text-slate-300">Готово — додати ще</Button>
    </ToolPanel>
  );
}

/// На ноутбуках Mac клавіша «delete» — це Backspace, тож видаляють обидві; у полі введення вони стирають текст, як звично.
function useDeleteKey(remove: () => void) {
  const latestRemove = useRef(remove);
  latestRemove.current = remove;
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      latestRemove.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function ObjectNameField({ name, onSave }: { name: string | null; onSave: (name: string | null) => void }) {
  const [draft, setDraft] = useState(name ?? "");
  const save = () => {
    const trimmed = draft.trim() || null;
    if (trimmed !== name) onSave(trimmed);
  };
  const saveOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
  };
  return (
    <label className="grid gap-1 text-sm text-slate-300">
      Назва
      <input value={draft} maxLength={OBJECT_LIMITS.nameLength} placeholder="Без назви — просто декор" onChange={(event) => setDraft(event.target.value)} onBlur={save} onKeyDown={saveOnEnter} className="h-11 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-base text-slate-100 placeholder:text-slate-500" />
    </label>
  );
}
