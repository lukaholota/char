"use client";

import { DoorClosed, DoorOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TokenPosition } from "@/rules/game-map";
import { buildStrokePath } from "@/rules/map-strokes";
import type { SceneWallView } from "@/rules/game-walls";
import type { MapHistory } from "./map-history";
import { MapHandle, MapSvg } from "./MapOverlay";
import { HistoryButtons, Segmented, ToolPanel } from "./MapToolbar";
import { COUNTER_ZOOM } from "./MapTokenSlot";
import type { MapWalls, WallMode } from "./use-map-walls";

const MODES: Array<{ value: WallMode; label: string }> = [
  { value: "wall", label: "Стіна" },
  { value: "room", label: "Кімната" },
  { value: "door", label: "Двері" },
  { value: "edit", label: "Правка" },
];
const HINTS: Record<WallMode, string> = {
  wall: "Протягніть пальцем — і стіна готова. Або ставте кути дотиками: стіна зберігається сама, дотик у перший кут замикає кімнату, повторний в останній — завершує стіну.",
  room: "Протягніть рамку — це чотири стіни кімнати.",
  door: "Протягніть від одного кінця дверей до іншого або торкніться обох кінців. На стіні двері вріжуться між її частинами.",
  edit: "Торкніться стіни, щоб вибрати; тягніть кути, щоб посунути.",
};

const findMiddle = ([from, to]: TokenPosition[]) => ({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
const toPercent = (at: TokenPosition) => ({ left: `${at.x * 100}%`, top: `${at.y * 100}%` });
const describeDoor = (door: SceneWallView) => (door.isOpen ? "Зачинити двері" : "Відчинити двері");

export function MapWallsLayer({ walls, aspect }: { walls: MapWalls; aspect: number }) {
  const draft = walls.pointer && walls.draft.length ? [...walls.draft, walls.pointer] : walls.draft;
  return (
    <>
      <MapSvg aspect={aspect}>
        {walls.shown.map((wall) => (
          <path
            key={wall.id}
            d={buildStrokePath(wall.points, aspect)}
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeWidth={walls.chosen?.id === wall.id ? 6 : 4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={wall.isOpen ? "6 6" : undefined}
            className={wall.kind === "door" ? "stroke-sky-300" : "stroke-amber-300"}
          />
        ))}
        {draft.length > 1 ? <path d={buildStrokePath(draft, aspect)} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={3} strokeDasharray="6 4" className="stroke-amber-100" /> : null}
      </MapSvg>
      {[...walls.draft, ...(walls.pointer ? [walls.pointer] : [])].map((at, index) => (
        <span key={index} aria-hidden className="pointer-events-none absolute z-40 h-3 w-3 rounded-full border-2 border-slate-950 bg-amber-100" style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, transform: `translate(-50%, -50%) ${COUNTER_ZOOM}` }} />
      ))}
      {walls.chosen?.points.map((at, index) => (
        <MapHandle key={index} at={at} label={`Кут ${index + 1}`} onMove={(point) => walls.moveVertex(index, point)} onEnd={walls.endVertexMove} />
      ))}
    </>
  );
}

/// Двері — значок на середині: майстер перемикає їх дотиком, поки не відкрито інструмент.
export function MapDoorButtons({ walls, isActive }: { walls: MapWalls; isActive: boolean }) {
  return walls.shown
    .filter((wall) => wall.kind === "door")
    .map((door) => {
      const Icon = door.isOpen ? DoorOpen : DoorClosed;
      return (
        <button
          key={door.id}
          type="button"
          data-map-control
          aria-label={describeDoor(door)}
          aria-pressed={door.isOpen}
          disabled={!isActive}
          onClick={() => walls.toggleDoor(door)}
          className={cn("absolute z-10 grid h-11 w-11 touch-none place-items-center rounded-full disabled:pointer-events-none", !isActive && "opacity-60")}
          style={{ ...toPercent(findMiddle(door.points)), transform: `translate(-50%, -50%) ${COUNTER_ZOOM}` }}
        >
          <span aria-hidden className={cn("grid h-7 w-7 place-items-center rounded-full border shadow-lg shadow-black/60", door.isOpen ? "border-sky-200/60 bg-slate-950/80 text-sky-200" : "border-sky-300 bg-sky-950/90 text-sky-100")}>
            <Icon className="h-4 w-4" />
          </span>
        </button>
      );
    });
}

export function WallsPanel({ walls, history, onClose }: { walls: MapWalls; history: MapHistory; onClose: () => void }) {
  const chosen = walls.chosen;
  return (
    <ToolPanel title="Стіни" onClose={onClose} aside={<HistoryButtons history={history} />}>
      <Segmented label="Що малювати" value={walls.mode} options={MODES} onChange={walls.setMode} />
      {walls.shown.length ? null : <p className="text-sm leading-snug text-slate-300">Позначте стіни — гравці бачитимуть лише те, що бачать герої.</p>}
      <p className="text-sm leading-snug text-slate-400">{HINTS[walls.mode]}</p>
      {walls.isFull && walls.mode !== "edit" ? <p role="status" className="text-sm text-amber-100">Забагато стін на сцені — приберіть зайві в «Правці».</p> : null}
      {walls.mode === "wall" && walls.draft.length ? (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={walls.finishWall} disabled={walls.draft.length < 2} className="h-11">Нова стіна</Button>
          <Button type="button" variant="outline" onClick={walls.dropDraft} className="h-11">Скасувати стіну</Button>
        </div>
      ) : null}
      {walls.mode === "edit" ? (
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
          {chosen?.kind === "door" ? <Button type="button" variant="outline" onClick={() => walls.toggleDoor(chosen)} className="h-11">{describeDoor(chosen)}</Button> : null}
          <Button type="button" variant="outline" onClick={walls.removeChosen} disabled={!chosen} className="h-11 gap-2 text-rose-200"><Trash2 className="h-4 w-4" aria-hidden />Видалити</Button>
          <Button type="button" variant="ghost" onClick={walls.clearAll} disabled={!walls.shown.length} className="col-span-2 h-11 text-rose-200">Стерти всі стіни</Button>
        </div>
      ) : null}
    </ToolPanel>
  );
}
