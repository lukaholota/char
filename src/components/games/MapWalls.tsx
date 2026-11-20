"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildStrokePath } from "@/rules/map-strokes";
import { DOOR_LOCKS } from "@/rules/game-walls";
import type { MapHistory } from "./map-history";
import { MapHandle, MapSvg } from "./MapOverlay";
import { HistoryButtons, Segmented, ToolPanel } from "./MapToolbar";
import { DOOR_LOCK_LABELS, findOpeningLook } from "./MapOpenings";
import { SwitchRow } from "./MapToolPanels";
import { COUNTER_ZOOM } from "./MapTokenSlot";
import type { MapWalls, WallMode } from "./use-map-walls";

const MODES: Array<{ value: WallMode; label: string }> = [
  { value: "wall", label: "Стіна" },
  { value: "room", label: "Кімната" },
  { value: "door", label: "Двері" },
  { value: "window", label: "Вікно" },
  { value: "edit", label: "Правка" },
];
const HINTS: Record<WallMode, string> = {
  wall: "Протягніть — і стіна готова. Або ставте кути по черзі; перший кут замикає кімнату, «Завершити стіну» — лишає її відкритою.",
  room: "Протягніть рамку — це чотири стіни кімнати.",
  door: "Протягніть від одного кінця дверей до іншого або торкніться обох кінців. На стіні двері вріжуться між її частинами.",
  window: "Як двері: протягніть по стіні чи торкніться обох кінців. Крізь вікно видно, але не пройти; штора закриває огляд.",
  edit: "Торкніться стіни, дверей чи вікна, щоб вибрати; тягніть кути, щоб посунути.",
};
const LOCK_OPTIONS = DOOR_LOCKS.map((value) => ({ value, label: DOOR_LOCK_LABELS[value] }));
const LOCK_HINTS = { none: null, locked: "Гравці не відчинять, доки ви не зробите двері звичайними.", secret: "Гравці бачать тут стіну, доки ви не зробите двері звичайними." } as const;

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
            className={findOpeningLook(wall).stroke}
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

export function WallsPanel({ walls, history, onClose }: { walls: MapWalls; history: MapHistory; onClose: () => void }) {
  const chosen = walls.chosen;
  return (
    <ToolPanel title="Стіни" onClose={onClose} aside={<HistoryButtons history={history} />}>
      {walls.mode === "wall" && walls.draft.length ? (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={walls.finishWall} disabled={walls.draft.length < 2} className="h-11">Завершити стіну</Button>
          <Button type="button" variant="outline" onClick={walls.dropDraft} className="h-11">Скасувати</Button>
        </div>
      ) : null}
      <Segmented label="Що малювати" value={walls.mode} options={MODES} onChange={walls.setMode} />
      {walls.shown.length ? null : <p className="text-sm leading-snug text-slate-300">Позначте стіни — гравці бачитимуть лише те, що бачать герої.</p>}
      <p className="text-sm leading-snug text-slate-400">{HINTS[walls.mode]}</p>
      {walls.isFull && walls.mode !== "edit" ? <p role="status" className="text-sm text-amber-100">Забагато стін на сцені — приберіть зайві в «Правці».</p> : null}
      {walls.mode === "door" ? (
        <>
          <Segmented label="Які двері" value={walls.doorLock} options={LOCK_OPTIONS} onChange={walls.setDoorLock} />
          {LOCK_HINTS[walls.doorLock] ? <p className="text-sm leading-snug text-slate-400">{LOCK_HINTS[walls.doorLock]}</p> : null}
        </>
      ) : null}
      {walls.hasGrid && (walls.mode === "wall" || walls.mode === "room" || walls.mode === "edit") ? <SwitchRow label="Без привʼязки до сітки" isChecked={walls.isSnapOff} onChange={walls.setIsSnapOff} /> : null}
      {walls.mode === "edit" ? (
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
          {chosen?.kind === "door" ? <div className="col-span-2"><Segmented label="Які двері" value={chosen.lock} options={LOCK_OPTIONS} onChange={(lock) => walls.changeOpening(chosen, { lock })} /></div> : null}
          {chosen && chosen.kind !== "wall" ? <Button type="button" variant="outline" onClick={() => walls.changeOpening(chosen, { isOpen: !chosen.isOpen })} className="h-11">{chosen.isOpen ? "Зачинити" : "Відчинити"}</Button> : null}
          {chosen?.kind === "window" ? <Button type="button" variant="outline" onClick={() => walls.changeOpening(chosen, { isCurtained: !chosen.isCurtained })} className="h-11">{chosen.isCurtained ? "Відсунути штору" : "Засунути штору"}</Button> : null}
          <Button type="button" variant="outline" onClick={walls.removeChosen} disabled={!chosen} className="h-11 gap-2 text-rose-200"><Trash2 className="h-4 w-4" aria-hidden />Видалити</Button>
          <Button type="button" variant="ghost" onClick={walls.clearAll} disabled={!walls.shown.length} className="col-span-2 h-11 text-rose-200">Стерти всі стіни</Button>
        </div>
      ) : null}
    </ToolPanel>
  );
}
