"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRAWING_COLORS, DRAWING_WIDTHS, type DrawingColor, type DrawingStroke, type DrawingWidth } from "@/rules/game-drawings";
import { MAP_VIEW_WIDTH } from "@/rules/game-grid";
import { buildStrokePath } from "@/rules/map-strokes";
import { MapSvg } from "./MapOverlay";
import type { MapHistory } from "./map-history";
import { HistoryButtons, Segmented, ToolPanel } from "./MapToolbar";
import type { DrawMode, MapDrawings } from "./use-map-drawings";

const COLOR_LOOKS: Record<DrawingColor, { label: string; stroke: string; swatch: string }> = {
  red: { label: "Червоний", stroke: "stroke-red-400", swatch: "bg-red-400" },
  amber: { label: "Жовтий", stroke: "stroke-amber-300", swatch: "bg-amber-300" },
  emerald: { label: "Зелений", stroke: "stroke-emerald-400", swatch: "bg-emerald-400" },
  sky: { label: "Блакитний", stroke: "stroke-sky-400", swatch: "bg-sky-400" },
  violet: { label: "Фіолетовий", stroke: "stroke-violet-400", swatch: "bg-violet-400" },
  white: { label: "Білий", stroke: "stroke-white", swatch: "bg-white" },
  black: { label: "Чорний", stroke: "stroke-black", swatch: "bg-black ring-1 ring-white/40" },
};

const WIDTH_LOOKS: Record<DrawingWidth, { label: string; dot: string }> = {
  fine: { label: "Найтонша", dot: "h-1 w-1" },
  thin: { label: "Тонка", dot: "h-1.5 w-1.5" },
  medium: { label: "Середня", dot: "h-2.5 w-2.5" },
  bold: { label: "Товста", dot: "h-3.5 w-3.5" },
  heavy: { label: "Найтовща", dot: "h-5 w-5" },
};

const DRAWING_WIDTH_NAMES = Object.keys(WIDTH_LOOKS) as DrawingWidth[];
const optionLook = (isChecked: boolean) => cn("grid h-11 place-items-center rounded-xl border border-white/10 hover:bg-white/10", isChecked && "bg-white/10 ring-1 ring-arcane-300/60");

export function MapDrawingsLayer({ drawings, aspect }: { drawings: Array<DrawingStroke & { id: number }>; aspect: number }) {
  return (
    <MapSvg aspect={aspect}>
      {drawings.map((drawing) => (
        <path
          key={drawing.id}
          d={buildStrokePath(drawing.points, aspect)}
          fill="none"
          strokeWidth={DRAWING_WIDTHS[drawing.width] * MAP_VIEW_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={COLOR_LOOKS[drawing.color].stroke}
        />
      ))}
    </MapSvg>
  );
}

export function DrawPanel({ drawings, isGm, history, onClose }: { drawings: MapDrawings; isGm: boolean; history: MapHistory; onClose: () => void }) {
  const isPen = drawings.mode === "pen";
  return (
    <ToolPanel title="Олівець" onClose={onClose}>
      <Segmented<DrawMode> label="Що робить" value={drawings.mode} onChange={drawings.setMode} options={[{ value: "pen", label: "Малювати" }, { value: "eraser", label: "Гумка" }]} />
      {isPen ? (
        <>
          <div role="radiogroup" aria-label="Колір" className="grid grid-cols-7 gap-1">
            {DRAWING_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={drawings.color === color}
                aria-label={COLOR_LOOKS[color].label}
                title={COLOR_LOOKS[color].label}
                onClick={() => drawings.setColor(color)}
                className={optionLook(drawings.color === color)}
              >
                <span className={cn("grid h-6 w-6 place-items-center rounded-full", COLOR_LOOKS[color].swatch)}>
                  {drawings.color === color ? <Check className={cn("h-4 w-4", color === "black" ? "text-white" : "text-slate-950")} aria-hidden /> : null}
                </span>
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Товщина лінії" className="grid grid-cols-5 gap-1">
            {DRAWING_WIDTH_NAMES.map((width) => (
              <button key={width} type="button" role="radio" aria-checked={drawings.width === width} aria-label={WIDTH_LOOKS[width].label} title={WIDTH_LOOKS[width].label} onClick={() => drawings.setWidth(width)} className={optionLook(drawings.width === width)}>
                <span className={cn("rounded-full", WIDTH_LOOKS[width].dot, COLOR_LOOKS[drawings.color].swatch)} />
              </button>
            ))}
          </div>
        </>
      ) : null}
      <p className="text-sm leading-snug text-slate-400">
        {isPen ? "Ведіть пальцем по мапі — лінію побачать усі в кімнаті." : isGm ? "Проведіть по лінії, щоб її стерти." : "Проведіть по своїй лінії, щоб її стерти. Чужі лінії стирає майстер."}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <HistoryButtons history={history} />
        <Button type="button" variant="ghost" onClick={drawings.eraseAll} disabled={!drawings.hasErasable} className="h-11 px-2 text-slate-400">{isGm ? "Стерти все" : "Стерти мої"}</Button>
      </div>
    </ToolPanel>
  );
}
