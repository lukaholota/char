"use client";

import { memo } from "react";
import { Check, Circle, Pentagon, PencilLine, Square, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRAWING_COLORS, DRAWING_SHAPES, DRAWING_WIDTHS, findShapeOutline, type DrawingColor, type DrawingShape, type DrawingStroke, type DrawingWidth } from "@/rules/game-drawings";
import { MAP_VIEW_WIDTH } from "@/rules/game-grid";
import { buildStrokePath } from "@/rules/map-strokes";
import { MapSvg } from "./MapOverlay";
import type { MapHistory } from "./map-history";
import { HistoryButtons, Segmented, ToolPanel } from "./MapToolbar";
import { SwitchRow } from "./MapToolPanels";
import type { DrawMode, MapDrawings } from "./use-map-drawings";

const COLOR_LOOKS: Record<DrawingColor, { label: string; stroke: string; fill: string; swatch: string }> = {
  red: { label: "Червоний", stroke: "stroke-red-400", fill: "fill-red-400/35", swatch: "bg-red-400" },
  orange: { label: "Помаранчевий", stroke: "stroke-orange-400", fill: "fill-orange-400/35", swatch: "bg-orange-400" },
  amber: { label: "Жовтий", stroke: "stroke-amber-300", fill: "fill-amber-300/35", swatch: "bg-amber-300" },
  emerald: { label: "Зелений", stroke: "stroke-emerald-400", fill: "fill-emerald-400/35", swatch: "bg-emerald-400" },
  teal: { label: "Бірюзовий", stroke: "stroke-teal-300", fill: "fill-teal-300/35", swatch: "bg-teal-300" },
  sky: { label: "Блакитний", stroke: "stroke-sky-400", fill: "fill-sky-400/35", swatch: "bg-sky-400" },
  blue: { label: "Синій", stroke: "stroke-blue-500", fill: "fill-blue-500/35", swatch: "bg-blue-500" },
  violet: { label: "Фіолетовий", stroke: "stroke-violet-400", fill: "fill-violet-400/35", swatch: "bg-violet-400" },
  pink: { label: "Рожевий", stroke: "stroke-pink-400", fill: "fill-pink-400/35", swatch: "bg-pink-400" },
  stone: { label: "Сірий", stroke: "stroke-stone-400", fill: "fill-stone-400/35", swatch: "bg-stone-400" },
  white: { label: "Білий", stroke: "stroke-white", fill: "fill-white/30", swatch: "bg-white" },
  black: { label: "Чорний", stroke: "stroke-black", fill: "fill-black/45", swatch: "bg-black ring-1 ring-white/40" },
};

const SHAPE_LOOKS: Record<DrawingShape, { label: string; icon: LucideIcon; hint: string }> = {
  line: { label: "Лінія", icon: PencilLine, hint: "Ведіть пальцем по мапі — лінію побачать усі в кімнаті." },
  rect: { label: "Прямокутник", icon: Square, hint: "Протягніть від одного кута до протилежного." },
  circle: { label: "Коло", icon: Circle, hint: "Протягніть від центру до краю кола." },
  polygon: { label: "Багатокутник", icon: Pentagon, hint: "Ставте вершини по черзі. Перша вершина або «Готово» замикає фігуру." },
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
        <DrawingPath key={drawing.id} drawing={drawing} aspect={aspect} />
      ))}
    </MapSvg>
  );
}

/// Під час малювання перемальовується лише живий штрих, а не всі збережені.
const DrawingPath = memo(function DrawingPath({ drawing, aspect }: { drawing: DrawingStroke; aspect: number }) {
  return (
    <path
      d={buildStrokePath(findShapeOutline(drawing, aspect), aspect)}
      fill={drawing.isFilled ? undefined : "none"}
      strokeWidth={DRAWING_WIDTHS[drawing.width] * MAP_VIEW_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(COLOR_LOOKS[drawing.color].stroke, drawing.isFilled && COLOR_LOOKS[drawing.color].fill)}
    />
  );
});

export function DrawPanel({ drawings, isGm, history, onClose }: { drawings: MapDrawings; isGm: boolean; history: MapHistory; onClose: () => void }) {
  const isPen = drawings.mode === "pen";
  const isShape = drawings.shape !== "line";
  return (
    <ToolPanel title="Малювання" onClose={onClose}>
      {drawings.cornerCount ? (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={drawings.finishPolygon} disabled={drawings.cornerCount < 3} className="h-11">Готово</Button>
          <Button type="button" variant="outline" onClick={drawings.dropPolygon} className="h-11">Скасувати</Button>
        </div>
      ) : null}
      <Segmented<DrawMode> label="Що робить" value={drawings.mode} onChange={drawings.setMode} options={[{ value: "pen", label: "Малювати" }, { value: "eraser", label: "Гумка" }]} />
      {isPen ? (
        <>
          <div role="radiogroup" aria-label="Фігура" className="grid grid-cols-4 gap-1">
            {DRAWING_SHAPES.map((shape) => {
              const { label, icon: Icon } = SHAPE_LOOKS[shape];
              return (
                <button key={shape} type="button" role="radio" aria-checked={drawings.shape === shape} aria-label={label} title={label} onClick={() => drawings.setShape(shape)} className={optionLook(drawings.shape === shape)}>
                  <Icon className="h-5 w-5 text-slate-200" aria-hidden />
                </button>
              );
            })}
          </div>
          {isShape ? <Segmented label="Як малювати фігуру" value={drawings.isFilled ? "fill" : "outline"} onChange={(value) => drawings.setIsFilled(value === "fill")} options={[{ value: "outline", label: "Контур" }, { value: "fill", label: "Заливка" }]} /> : null}
          <div role="radiogroup" aria-label="Колір" className="grid grid-cols-6 gap-1">
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
          <div role="radiogroup" aria-label={isShape ? "Товщина контуру" : "Товщина лінії"} className="grid grid-cols-5 gap-1">
            {DRAWING_WIDTH_NAMES.map((width) => (
              <button key={width} type="button" role="radio" aria-checked={drawings.width === width} aria-label={WIDTH_LOOKS[width].label} title={WIDTH_LOOKS[width].label} onClick={() => drawings.setWidth(width)} className={optionLook(drawings.width === width)}>
                <span className={cn("rounded-full", WIDTH_LOOKS[width].dot, COLOR_LOOKS[drawings.color].swatch)} />
              </button>
            ))}
          </div>
          {isShape && drawings.hasGrid ? <SwitchRow label="Без привʼязки до сітки" isChecked={drawings.isSnapOff} onChange={drawings.setIsSnapOff} /> : null}
        </>
      ) : null}
      <p className="text-sm leading-snug text-slate-400">
        {isPen ? SHAPE_LOOKS[drawings.shape].hint : isGm ? "Проведіть по лінії чи фігурі, щоб її стерти." : "Проведіть по своїй лінії чи фігурі, щоб її стерти. Чужі стирає майстер."}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <HistoryButtons history={history} />
        <Button type="button" variant="ghost" onClick={drawings.eraseAll} disabled={!drawings.hasErasable} className="h-11 px-2 text-slate-400">{isGm ? "Стерти все" : "Стерти мої"}</Button>
      </div>
    </ToolPanel>
  );
}
