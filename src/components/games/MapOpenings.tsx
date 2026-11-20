"use client";

import { Blinds, DoorClosed, DoorClosedLocked, DoorOpen, Grid2x2 } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TokenPosition } from "@/rules/game-map";
import { DOOR_LOCKS, findOpeningChangeFailure, findOpeningMiddle, findOpeningSides, type DoorLock, type SceneWallView } from "@/rules/game-walls";
import { COUNTER_ZOOM } from "./MapTokenSlot";
import type { MapWalls } from "./use-map-walls";

export const DOOR_LOCK_LABELS: Record<DoorLock, string> = { none: "Звичайні", locked: "Замкнені", secret: "Секретні" };
const DOOR_LOCK_HINTS: Record<DoorLock, string> = { none: "відчиняє будь-хто", locked: "гравці не відчинять", secret: "гравці бачать стіну" };

const OPENING_LOOKS = {
  wall: { stroke: "stroke-amber-300", badge: "" },
  door: { stroke: "stroke-sky-300", badge: "border-sky-300 bg-sky-950/90 text-sky-100" },
  secret: { stroke: "stroke-violet-300", badge: "border-violet-300 bg-violet-950/90 text-violet-100" },
  window: { stroke: "stroke-emerald-300", badge: "border-emerald-300 bg-emerald-950/90 text-emerald-100" },
};
export const findOpeningLook = (wall: SceneWallView) => OPENING_LOOKS[wall.kind === "door" && wall.lock === "secret" ? "secret" : wall.kind];

const describeOpening = (wall: SceneWallView) =>
  wall.kind === "window"
    ? `Вікно, ${wall.isOpen ? "відчинене" : "зачинене"}${wall.isCurtained ? ", за шторою" : ""}`
    : `${DOOR_LOCK_LABELS[wall.lock]} двері, ${wall.isOpen ? "відчинені" : "зачинені"}`;

function OpeningIcon({ wall }: { wall: SceneWallView }) {
  const Icon = wall.kind === "window" ? (wall.isCurtained ? Blinds : Grid2x2) : wall.isOpen ? DoorOpen : wall.lock === "locked" ? DoorClosedLocked : DoorClosed;
  return (
    <span aria-hidden className={cn("grid h-7 w-7 place-items-center rounded-full border shadow-lg shadow-black/60", findOpeningLook(wall).badge, wall.isOpen && "border-dashed")}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

type ButtonsProps = { walls: MapWalls; isGm: boolean; isActive: boolean; aspect: number; isSeen: (at: TokenPosition) => boolean };

/// Значок на середині дверей чи вікна. Гравцю — лише двері, які бачить хтось із героїв; вікна й вид дверей міняє майстер.
export function MapOpeningButtons({ walls, isGm, isActive, aspect, isSeen }: ButtonsProps) {
  const openings = walls.shown.filter((wall) => (isGm ? wall.kind !== "wall" : wall.kind === "door" && findOpeningSides(wall.points, aspect).some(isSeen)));
  return openings.map((wall) => {
    const middle = findOpeningMiddle(wall.points);
    const style = { left: `${middle.x * 100}%`, top: `${middle.y * 100}%`, transform: `translate(-50%, -50%) ${COUNTER_ZOOM}` };
    const className = cn("absolute z-[21] grid h-11 w-11 touch-none place-items-center rounded-full disabled:pointer-events-none", !isActive && "opacity-60");
    const button = (onClick?: () => void) => (
      <button key={wall.id} type="button" data-map-control aria-label={describeOpening(wall)} disabled={!isActive} onClick={onClick} className={className} style={style}>
        <OpeningIcon wall={wall} />
      </button>
    );
    if (!isGm) return button(() => (findOpeningChangeFailure(wall, { isOpen: !wall.isOpen }, false) === "door_locked" ? toast("Двері замкнені — відімкнути може майстер") : walls.changeOpening(wall, { isOpen: !wall.isOpen })));
    return (
      <DropdownMenu key={wall.id} modal={false}>
        <DropdownMenuTrigger asChild>{button()}</DropdownMenuTrigger>
        <OpeningMenu wall={wall} walls={walls} />
      </DropdownMenu>
    );
  });
}

function OpeningMenu({ wall, walls }: { wall: SceneWallView; walls: MapWalls }) {
  const noun = wall.kind === "window" ? "вікно" : "двері";
  return (
    <DropdownMenuContent align="center" data-map-control className="!bg-slate-950">
      <DropdownMenuItem className="min-h-11" onSelect={() => walls.changeOpening(wall, { isOpen: !wall.isOpen })}>
        {wall.isOpen ? `Зачинити ${noun}` : `Відчинити ${noun}`}
      </DropdownMenuItem>
      {wall.kind === "window" ? (
        <DropdownMenuItem className="min-h-11" onSelect={() => walls.changeOpening(wall, { isCurtained: !wall.isCurtained })}>
          {wall.isCurtained ? "Відсунути штору" : "Засунути штору"}
        </DropdownMenuItem>
      ) : (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Які двері</DropdownMenuLabel>
          <DoorLockItems value={wall.lock} onChange={(lock) => walls.changeOpening(wall, { lock })} />
        </>
      )}
    </DropdownMenuContent>
  );
}

function DoorLockItems({ value, onChange }: { value: DoorLock; onChange: (lock: DoorLock) => void }) {
  return (
    <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as DoorLock)}>
      {DOOR_LOCKS.map((lock) => (
        <DropdownMenuRadioItem key={lock} value={lock} className="min-h-11">
          <span>
            {DOOR_LOCK_LABELS[lock]} <span className="text-slate-400">— {DOOR_LOCK_HINTS[lock]}</span>
          </span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
