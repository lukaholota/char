"use client";

import { memo, useId } from "react";
import { Circle, Pentagon, PencilLine, Square, Type, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRAWING_SHAPES, DRAWING_WIDTHS, findDrawingBounds, findDrawingHex, findShapeOutline, type DrawingShape, type DrawingWidth, type SceneDrawingView } from "@/rules/game-drawings";
import { MAP_VIEW_WIDTH, toViewPoint } from "@/rules/game-grid";
import { buildStrokePath } from "@/rules/map-strokes";
import { ColorSpectrumPicker, tileLook } from "./ColorSpectrumPicker";
import { DrawingTextShape, DrawTextOptions, TextEffectFilters, type TextFilterIds } from "./MapDrawingText";
import { MapSvg } from "./MapOverlay";
import type { MapHistory } from "./map-history";
import { HistoryButtons, Segmented, ToolPanel } from "./MapToolbar";
import { SwitchRow } from "./MapToolPanels";
import { DELETE_KEYS, useMapKey } from "./use-map-key";
import type { DrawingFill, DrawMode, MapDrawings } from "./use-map-drawings";

const SHAPE_LOOKS: Record<DrawingShape, { label: string; icon: LucideIcon; hint: string }> = {
  line: { label: "Лінія", icon: PencilLine, hint: "Ведіть пальцем по мапі — лінію побачать усі в кампанії." },
  rect: { label: "Прямокутник", icon: Square, hint: "Протягніть від одного кута до протилежного." },
  circle: { label: "Коло", icon: Circle, hint: "Протягніть від центру до краю кола." },
  polygon: { label: "Багатокутник", icon: Pentagon, hint: "Ставте вершини по черзі. Перша вершина або «Готово» замикає фігуру." },
  text: { label: "Текст", icon: Type, hint: "Напишіть текст і торкніться мапи, де він має стояти." },
};
const MODE_OPTIONS: Array<{ value: DrawMode; label: string }> = [{ value: "pen", label: "Малювати" }, { value: "move", label: "Рухати" }, { value: "eraser", label: "Гумка" }];
const FILL_OPTIONS: Array<{ value: DrawingFill; label: string }> = [{ value: "outline", label: "Контур" }, { value: "solid", label: "Заливка" }, { value: "see-through", label: "Напівпрозора" }];

const WIDTH_LOOKS: Record<DrawingWidth, { label: string; dot: string }> = {
  fine: { label: "Найтонша", dot: "h-1 w-1" },
  thin: { label: "Тонка", dot: "h-1.5 w-1.5" },
  medium: { label: "Середня", dot: "h-2.5 w-2.5" },
  bold: { label: "Товста", dot: "h-3.5 w-3.5" },
  heavy: { label: "Найтовща", dot: "h-5 w-5" },
};

const DRAWING_WIDTH_NAMES = Object.keys(WIDTH_LOOKS) as DrawingWidth[];
const HANDLE_RADIUS = 1.2;

export function MapDrawingsLayer({ drawings, selected, aspect }: { drawings: SceneDrawingView[]; selected: SceneDrawingView | null; aspect: number }) {
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterIds = { shadow: `${baseId}-shadow`, glow: `${baseId}-glow` };
  return (
    <MapSvg aspect={aspect}>
      {drawings.some((drawing) => drawing.label) ? <TextEffectFilters ids={filterIds} /> : null}
      {drawings.map((drawing) => (
        <DrawingShapeView key={drawing.id} drawing={drawing} aspect={aspect} filterIds={filterIds} />
      ))}
      {selected ? <SelectionFrame drawing={selected} aspect={aspect} /> : null}
    </MapSvg>
  );
}

/// Під час малювання перемальовується лише живий штрих, а не всі збережені.
const DrawingShapeView = memo(function DrawingShapeView({ drawing, aspect, filterIds }: { drawing: SceneDrawingView; aspect: number; filterIds: TextFilterIds }) {
  if (drawing.shape === "text") return <DrawingTextShape drawing={drawing} aspect={aspect} filterIds={filterIds} />;
  const hex = findDrawingHex(drawing.color);
  return (
    <path
      d={buildStrokePath(findShapeOutline(drawing, aspect), aspect)}
      stroke={hex}
      fill={drawing.isFilled ? hex : "none"}
      fillOpacity={drawing.isFilled ? drawing.fillOpacity : undefined}
      strokeWidth={DRAWING_WIDTHS[drawing.width] * MAP_VIEW_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
});

function SelectionFrame({ drawing, aspect }: { drawing: SceneDrawingView; aspect: number }) {
  const bounds = findDrawingBounds(drawing, aspect);
  const [from, to] = [toViewPoint(bounds.from, aspect), toViewPoint(bounds.to, aspect)];
  return (
    <g className="stroke-arcane-200">
      <rect x={from.x} y={from.y} width={to.x - from.x} height={to.y - from.y} fill="none" strokeDasharray="6 4" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <circle cx={to.x} cy={to.y} r={HANDLE_RADIUS} strokeWidth={2} vectorEffect="non-scaling-stroke" className="fill-slate-950" />
    </g>
  );
}

function DeleteSelectedKey({ onDelete }: { onDelete: () => void }) {
  useMapKey(DELETE_KEYS, onDelete);
  return null;
}

function findPanelHint(drawings: MapDrawings, isGm: boolean) {
  if (drawings.mode === "pen") return SHAPE_LOOKS[drawings.shape].hint;
  if (drawings.mode === "move") return isGm ? "Торкніться малюнка й тягніть. Кружечок у куті рамки змінює розмір." : "Торкніться свого малюнка й тягніть. Кружечок у куті рамки змінює розмір. Чужі рухає майстер.";
  return isGm ? "Проведіть по лінії чи фігурі, щоб її стерти." : "Проведіть по своїй лінії чи фігурі, щоб її стерти. Чужі стирає майстер.";
}

export function DrawPanel({ drawings, isGm, history, onClose }: { drawings: MapDrawings; isGm: boolean; history: MapHistory; onClose: () => void }) {
  const isPen = drawings.mode === "pen";
  const isText = drawings.shape === "text";
  const isFigure = drawings.shape !== "line" && !isText;
  return (
    <ToolPanel title="Малювання" onClose={onClose}>
      {drawings.cornerCount ? (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={drawings.finishPolygon} disabled={drawings.cornerCount < 3} className="h-11">Готово</Button>
          <Button type="button" variant="outline" onClick={drawings.dropPolygon} className="h-11">Скасувати</Button>
        </div>
      ) : null}
      <Segmented<DrawMode> label="Що робить" value={drawings.mode} onChange={drawings.setMode} options={MODE_OPTIONS} />
      {isPen ? (
        <>
          <div role="radiogroup" aria-label="Фігура" className="grid grid-cols-5 gap-1">
            {DRAWING_SHAPES.map((shape) => {
              const { label, icon: Icon } = SHAPE_LOOKS[shape];
              return (
                <button key={shape} type="button" role="radio" aria-checked={drawings.shape === shape} aria-label={label} title={label} onClick={() => drawings.setShape(shape)} className={tileLook(drawings.shape === shape)}>
                  <Icon className="h-5 w-5 text-slate-200" aria-hidden />
                </button>
              );
            })}
          </div>
          {isText ? <DrawTextOptions drawings={drawings} /> : null}
          {isFigure ? <Segmented<DrawingFill> label="Як малювати фігуру" value={drawings.fill} onChange={drawings.setFill} options={FILL_OPTIONS} /> : null}
          <ColorSpectrumPicker label={isText ? "Колір тексту" : "Колір"} value={drawings.color} onChange={drawings.setColor} />
          {isText ? null : (
            <div role="radiogroup" aria-label={isFigure ? "Товщина контуру" : "Товщина лінії"} className="grid grid-cols-5 gap-1">
              {DRAWING_WIDTH_NAMES.map((width) => (
                <button key={width} type="button" role="radio" aria-checked={drawings.width === width} aria-label={WIDTH_LOOKS[width].label} title={WIDTH_LOOKS[width].label} onClick={() => drawings.setWidth(width)} className={tileLook(drawings.width === width)}>
                  <span className={cn("rounded-full", WIDTH_LOOKS[width].dot)} style={{ backgroundColor: drawings.color }} />
                </button>
              ))}
            </div>
          )}
          {isFigure && drawings.hasGrid ? <SwitchRow label="Без привʼязки до сітки" isChecked={drawings.isSnapOff} onChange={drawings.setIsSnapOff} /> : null}
        </>
      ) : null}
      {drawings.selected ? (
        <>
          <DeleteSelectedKey onDelete={drawings.eraseSelected} />
          <Button type="button" variant="outline" onClick={drawings.eraseSelected} className="h-11">Стерти виділене</Button>
        </>
      ) : null}
      <p className="text-sm leading-snug text-slate-400">{findPanelHint(drawings, isGm)}</p>
      <div className="grid grid-cols-3 gap-2">
        <HistoryButtons history={history} />
        <Button type="button" variant="ghost" onClick={drawings.eraseAll} disabled={!drawings.hasErasable} className="h-11 px-2 text-slate-400">{isGm ? "Стерти все" : "Стерти мої"}</Button>
      </div>
    </ToolPanel>
  );
}
