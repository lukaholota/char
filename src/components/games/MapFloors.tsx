"use client";

import { ArrowDownToLine, ArrowUpToLine, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { askToConfirm } from "@/components/ui/confirm-dialog";
import { ACCEPTED_IMAGE_MIME_TYPES } from "@/lib/media-upload-limits";
import { cn } from "@/lib/utils";
import { findFloorName, FLOOR_LIMITS, GROUND_FLOOR_NAME, parseFloorName, type FloorId, type SceneFloor } from "@/rules/game-floors";
import { HistoryButtons, ToolPanel } from "./MapToolbar";
import { Hint } from "./MapToolPanels";
import type { MapFloors } from "./use-map-floors";
import type { MapHistory } from "./map-history";
import type { MapObjects } from "./use-map-objects";
import { DELETE_KEYS, useMapKey } from "./use-map-key";
import { useFileDrop } from "./use-file-drop";

/// Згори донизу, як кнопки ліфта: поверхи над мапою, сама мапа, підвали.
function listLevels(floors: SceneFloor[]): Array<{ id: FloorId; name: string }> {
  return [...floors.filter((floor) => floor.id > 0), { id: null, name: GROUND_FLOOR_NAME }, ...floors.filter((floor) => floor.id < 0)];
}

/// Швидкий перемикач для бою: майстер показує поверх одним дотиком, гравці бачать, де зараз мапа.
export function MapFloorSwitch({ floors, canEdit }: { floors: MapFloors; canEdit: boolean }) {
  if (!floors.floors.length) return null;
  if (!canEdit)
    return floors.shown === null ? null : (
      <span className="shrink-0 rounded-lg bg-slate-950/90 px-2 py-1.5 text-sm text-slate-200 shadow-xl shadow-black/50">{findFloorName(floors.shown, floors.floors)}</span>
    );
  const isPlanMissing = floors.shown !== null && !floors.hasPlan(floors.shown);
  return (
    <div className="flex max-w-full shrink flex-col items-start gap-1">
      <div role="radiogroup" aria-label="Показаний поверх" className="flex max-w-full flex-wrap rounded-xl bg-slate-950/90 p-0.5 shadow-xl shadow-black/50 ring-1 ring-white/10">
        {listLevels(floors.floors).map((level) => (
          <button
            key={level.id ?? "ground"}
            type="button"
            role="radio"
            aria-checked={floors.shown === level.id}
            onClick={() => void floors.change({ kind: "show", id: level.id })}
            className={cn("h-10 shrink-0 whitespace-nowrap rounded-lg px-2.5 text-sm", floors.shown === level.id ? "bg-arcane-300/20 text-arcane-100" : "text-slate-300 hover:bg-white/10")}
          >
            {level.name}
          </button>
        ))}
      </div>
      {isPlanMissing ? (
        <span className="rounded-lg bg-slate-950/90 px-2 py-1 text-sm text-amber-100 shadow-xl shadow-black/50">Плану ще немає — гравці бачать основну мапу</span>
      ) : null}
    </div>
  );
}

export function FloorsPanel({ floors, objects, history, onClose }: { floors: MapFloors; objects: MapObjects; history: MapHistory; onClose: () => void }) {
  const shownFloor = floors.floors.find((floor) => floor.id === floors.shown) ?? null;
  const isFull = floors.floors.length >= FLOOR_LIMITS.floors;
  return (
    <ToolPanel title="Поверхи" onClose={onClose} aside={<HistoryButtons history={history} />}>
      {floors.floors.length ? (
        <div role="radiogroup" aria-label="Показаний поверх" className="grid gap-0.5 rounded-xl border border-white/10 p-0.5">
          {listLevels(floors.floors).map((level) => (
            <button
              key={level.id ?? "ground"}
              type="button"
              role="radio"
              aria-checked={floors.shown === level.id}
              onClick={() => void floors.change({ kind: "show", id: level.id })}
              className={cn("h-10 truncate rounded-lg px-3 text-left text-sm", floors.shown === level.id ? "bg-white/10 text-slate-100" : "text-slate-400 hover:text-slate-200")}
            >
              {level.name}
            </button>
          ))}
        </div>
      ) : (
        <Hint>
          Другий поверх, підвал чи дах — на тій самій мапі. Додайте поверх і завантажте його план: будинок, вирізаний на прозорому тлі. Хто стоїть на плані — на поверсі; хто зовні — видно з будь-якого
          поверху.
        </Hint>
      )}
      {shownFloor ? <ShownFloor key={shownFloor.id} floor={shownFloor} floors={floors} objects={objects} /> : floors.floors.length ? <Hint>Оберіть поверх, щоб показати його всім і змінити.</Hint> : null}
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
        <Button type="button" variant="outline" disabled={isFull} onClick={() => void floors.change({ kind: "add", direction: "up" })} className="h-11 gap-2 px-2">
          <ArrowUpToLine className="h-4 w-4" aria-hidden />
          Поверх вище
        </Button>
        <Button type="button" variant="outline" disabled={isFull} onClick={() => void floors.change({ kind: "add", direction: "down" })} className="h-11 gap-2 px-2">
          <ArrowDownToLine className="h-4 w-4" aria-hidden />
          Підвал
        </Button>
      </div>
      {isFull ? <Hint>Більше {FLOOR_LIMITS.floors} поверхів на сцені не буває — приберіть зайвий.</Hint> : null}
    </ToolPanel>
  );
}

function ShownFloor({ floor, floors, objects }: { floor: SceneFloor; floors: MapFloors; objects: MapObjects }) {
  const chosenPlan = objects.chosen?.floor === floor.id ? objects.chosen : null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const rename = (raw: string) => {
    const name = parseFloorName(raw);
    if (name && name !== floor.name) void floors.change({ kind: "rename", id: floor.id, name });
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    await floors.uploadPlan(floor.id, file);
    setIsUploading(false);
  };
  const drop = useFileDrop((file) => void upload(file), isUploading);
  const remove = async () => {
    const isConfirmed = await askToConfirm({
      title: `Прибрати «${floor.name}»?`,
      description: "План і обʼєкти цього поверху зникнуть, а токени з нього стануть на основну мапу.",
      confirmLabel: "Прибрати",
      isDestructive: true,
    });
    if (isConfirmed) void floors.change({ kind: "remove", id: floor.id });
  };
  return (
    <div className="space-y-2">
      <label className="block space-y-1 text-sm text-slate-300">
        Назва
        <input
          defaultValue={floor.name}
          maxLength={FLOOR_LIMITS.nameLength}
          onBlur={(event) => rename(event.currentTarget.value)}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-base text-slate-100"
        />
      </label>
      {chosenPlan ? (
        <ChosenPlan onRemove={objects.remove} />
      ) : floors.hasPlan(floor.id) ? (
        <Hint>Торкніться плану на мапі — його можна посунути, повернути, змінити розмір чи прибрати.</Hint>
      ) : (
        <Hint>Плану ще немає — гравці бачать основну мапу. Завантажте план, щоб токени знали, де стіни поверху.</Hint>
      )}
      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_IMAGE_MIME_TYPES}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => void upload(event.currentTarget.files?.[0]).finally(() => (event.target.value = ""))}
        />
        <Button type="button" variant="outline" disabled={isUploading} onClick={() => fileRef.current?.click()} {...drop.bindDrop} title="Натисніть або перетягніть файл сюди" className={cn("h-11 flex-1 gap-2 px-3", drop.isOver && "border-amber-300 bg-amber-300/10")}>
          <ImagePlus className="h-4 w-4" aria-hidden />
          {isUploading ? "Завантажую…" : floors.hasPlan(floor.id) ? "Ще один план" : "Завантажити план"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => void remove()} aria-label={`Прибрати «${floor.name}»`} title="Прибрати поверх" className="h-11 w-11 shrink-0 p-0 text-slate-400">
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function ChosenPlan({ onRemove }: { onRemove: () => void }) {
  useMapKey(DELETE_KEYS, onRemove);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-arcane-300/30 bg-arcane-300/10 p-2 pl-3 text-sm text-slate-200">
      <span className="flex-1">Вибрано план. Тягніть його на мапі або приберіть — інші плани поверху лишаться.</span>
      <Button type="button" variant="outline" onClick={onRemove} title="Delete" className="h-11 shrink-0 gap-2 px-3">
        <Trash2 className="h-4 w-4" aria-hidden />
        Прибрати план
      </Button>
    </div>
  );
}
