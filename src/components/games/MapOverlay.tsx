"use client";

import { useId, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buildAreaPath, type AreaPlacement } from "@/rules/game-areas";
import { isFogStroke, type FogStroke, type SceneFog } from "@/rules/game-fog";
import { buildStrokePath } from "@/rules/map-strokes";
import { MAP_VIEW_WIDTH, buildGridLinesPath, toViewPoint, type MapFrame } from "@/rules/game-grid";
import type { TokenPosition } from "@/rules/game-map";
import { COUNTER_ZOOM } from "./MapTokenSlot";

type Point = { clientX: number; clientY: number };
export type MapRect = { x: number; y: number; width: number; height: number };
export type MapSegment = { from: TokenPosition; to: TokenPosition };
export type AreaLook = "saved" | "selected" | "draft";

export function MapSvg({ aspect, className, children }: { aspect: number; className?: string; children: ReactNode }) {
  return (
    <svg aria-hidden viewBox={`0 0 ${MAP_VIEW_WIDTH} ${MAP_VIEW_WIDTH / aspect}`} preserveAspectRatio="none" className={cn("pointer-events-none absolute inset-0 h-full w-full overflow-visible rounded-xl", className)}>
      {children}
    </svg>
  );
}

export function MapGridLayer({ frame }: { frame: MapFrame }) {
  const path = buildGridLinesPath(frame);
  return (
    <MapSvg aspect={frame.aspect}>
      <path d={path} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={1.5} strokeOpacity={frame.grid.opacity} className="stroke-slate-950" />
      <path d={path} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={0.75} strokeOpacity={frame.grid.opacity} className="stroke-white" />
    </MapSvg>
  );
}

const FOG_EDGE = 0.7;

/// Майстер бачить мапу крізь напівпрозорий туман з чіткими краями для правок; гравці — суцільну темряву, що мʼяко
/// розходиться назовні: край розширено перед розмиттям, тож усередині туману нічого не просвічує.
export function MapFogLayer({ fog, aspect, isVeil, className }: { fog: SceneFog; aspect: number; isVeil: boolean; className?: string }) {
  const maskId = useId();
  const edgeId = useId();
  const height = MAP_VIEW_WIDTH / aspect;
  return (
    <MapSvg aspect={aspect} className={className}>
      <defs>
        {isVeil ? null : (
          <filter id={edgeId} filterUnits="userSpaceOnUse" x={0} y={0} width={MAP_VIEW_WIDTH} height={height}>
            <feMorphology operator="dilate" radius={FOG_EDGE} />
            <feGaussianBlur stdDeviation={FOG_EDGE / 2} />
          </filter>
        )}
        <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={MAP_VIEW_WIDTH} height={height}>
          <g filter={isVeil ? undefined : `url(#${CSS.escape(edgeId)})`}>
            <rect width={MAP_VIEW_WIDTH} height={height} fill="white" />
            {fog.areas.map((area, index) => (isFogStroke(area) ? <FogStrokePath key={index} stroke={area} aspect={aspect} /> : <FogRectShape key={index} area={area} aspect={aspect} fill={area.isRevealed ? "black" : "white"} />))}
          </g>
        </mask>
      </defs>
      <rect width={MAP_VIEW_WIDTH} height={height} mask={`url(#${CSS.escape(maskId)})`} className={isVeil ? "fill-slate-950/55" : "fill-slate-900"} />
    </MapSvg>
  );
}

function FogStrokePath({ stroke, aspect }: { stroke: FogStroke; aspect: number }) {
  return <path d={buildStrokePath(stroke.points, aspect)} fill="none" stroke={stroke.isRevealed ? "black" : "white"} strokeWidth={stroke.radius * 2 * MAP_VIEW_WIDTH} strokeLinecap="round" strokeLinejoin="round" />;
}

function FogRectShape({ area, aspect, fill, className }: { area: MapRect; aspect: number; fill?: string; className?: string }) {
  const scale = MAP_VIEW_WIDTH;
  return <rect x={area.x * scale} y={(area.y * scale) / aspect} width={area.width * scale} height={(area.height * scale) / aspect} fill={fill} className={className} />;
}

const AREA_CLASSES: Record<AreaLook, string> = {
  saved: "fill-amber-300/15 stroke-amber-200/80",
  selected: "fill-amber-300/30 stroke-amber-100",
  draft: "fill-arcane-300/25 stroke-arcane-200",
};

export function MapAreasLayer({ frame, areas }: { frame: MapFrame; areas: Array<{ key: string | number; area: AreaPlacement; look: AreaLook }> }) {
  return (
    <MapSvg aspect={frame.aspect}>
      {areas.map(({ key, area, look }) => (
        <path key={key} d={buildAreaPath(area, frame)} vectorEffect="non-scaling-stroke" strokeWidth={look === "saved" ? 1.5 : 2} strokeDasharray={look === "draft" ? "6 4" : undefined} strokeLinejoin="round" className={AREA_CLASSES[look]} />
      ))}
    </MapSvg>
  );
}

type MeasureLayerProps = { frame: MapFrame | null; aspect: number; ruler: MapSegment | null; move: (MapSegment & { sizeCells: number }) | null; rect: MapRect | null };

/// Лінійка, шлях токена під час перетягування і рамка туману чи підгонки сітки — над усім іншим.
export function MapMeasureLayer({ frame, aspect, ruler, move, rect }: MeasureLayerProps) {
  if (!ruler && !move && !rect) return null;
  const toView = (point: TokenPosition) => toViewPoint(point, aspect);
  const cell = frame ? MAP_VIEW_WIDTH / frame.grid.columns : 0;
  return (
    <MapSvg aspect={aspect} className="z-40">
      {move ? (
        <>
          <line x1={toView(move.from).x} y1={toView(move.from).y} x2={toView(move.to).x} y2={toView(move.to).y} vectorEffect="non-scaling-stroke" strokeWidth={2} strokeDasharray="5 4" className="stroke-arcane-200" />
          {frame ? (
            <rect
              x={toView(move.to).x - (cell * move.sizeCells) / 2}
              y={toView(move.to).y - (cell * move.sizeCells) / 2}
              width={cell * move.sizeCells}
              height={cell * move.sizeCells}
              vectorEffect="non-scaling-stroke"
              strokeWidth={2}
              className="fill-arcane-300/20 stroke-arcane-200"
            />
          ) : null}
        </>
      ) : null}
      {ruler ? (
        <>
          <line x1={toView(ruler.from).x} y1={toView(ruler.from).y} x2={toView(ruler.to).x} y2={toView(ruler.to).y} vectorEffect="non-scaling-stroke" strokeWidth={4} strokeLinecap="round" className="stroke-slate-950/60" />
          <line x1={toView(ruler.from).x} y1={toView(ruler.from).y} x2={toView(ruler.to).x} y2={toView(ruler.to).y} vectorEffect="non-scaling-stroke" strokeWidth={2} strokeLinecap="round" className="stroke-amber-200" />
        </>
      ) : null}
      {rect ? <FogRectShape area={rect} aspect={aspect} className="fill-white/10 stroke-white [stroke-dasharray:6_4] [stroke-width:2px] [vector-effect:non-scaling-stroke]" /> : null}
    </MapSvg>
  );
}

/// Підпис тримає сталий розмір на екрані за будь-якого масштабу мапи.
export function MapLabel({ at, children, className }: { at: TokenPosition; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn("pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-slate-950/90 px-2 py-0.5 text-sm text-slate-100 shadow-lg shadow-black/50 ring-1 ring-white/15", className)}
      style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, transform: `translate(-50%, calc(-100% - 14px)) ${COUNTER_ZOOM}`, transformOrigin: "50% calc(100% + 14px)" }}
    >
      {children}
    </span>
  );
}

type HandleProps = { at: TokenPosition; label: string; onMove: (point: Point) => void; onEnd: () => void; variant?: "move" | "aim" };

/// Ручка 44 пікселі на дотик за будь-якого масштабу; захоплює вказівник, тож мапа під нею не рухається.
export function MapHandle({ at, label, onMove, onEnd, variant = "move" }: HandleProps) {
  const bind = {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) onMove({ clientX: event.clientX, clientY: event.clientY });
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) onEnd();
    },
  };
  return (
    <button
      type="button"
      data-map-control
      aria-label={label}
      className="absolute z-50 grid h-11 w-11 touch-none place-items-center rounded-full"
      style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, transform: `translate(-50%, -50%) ${COUNTER_ZOOM}` }}
      {...bind}
    >
      <span aria-hidden className={cn("block rounded-full border-2 border-slate-950 shadow-lg shadow-black/60", variant === "move" ? "h-5 w-5 bg-arcane-200" : "h-4 w-4 bg-amber-200")} />
    </button>
  );
}
