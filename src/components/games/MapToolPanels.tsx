"use client";

import { useState, type ReactNode } from "react";
import { Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { FogChange, SceneFog } from "@/rules/game-fog";
import { findGridSize, GRID_COLUMN_RANGE, GRID_OPACITY_RANGE, type SceneGrid } from "@/rules/game-grid";
import { pluralizeUk } from "@/lib/ukrainian-plural";
import type { TokenNameMode } from "@/rules/game-map-creatures";
import { Segmented, Stepper, ToolPanel } from "./MapToolbar";
import { TokenNameModePicker } from "./TokenName";
import { TokenScaleSlider } from "./TokenScaleSlider";
import type { FogBrush, useGridTool } from "./use-map-tools";

const NEW_GRID: SceneGrid = { columns: 20, offsetX: 0, offsetY: 0, isVisible: true, opacity: GRID_OPACITY_RANGE.initial };
const FIT_CELLS_RANGE = { min: 1, max: 10 } as const;

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-snug text-slate-400">{children}</p>;
}

function SwitchRow({ label, isChecked, onChange }: { label: string; isChecked: boolean; onChange: (isChecked: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm text-slate-300">
      {label}
      <Switch checked={isChecked} onCheckedChange={onChange} />
    </label>
  );
}

type GridTool = ReturnType<typeof useGridTool>;
type GridPanelProps = { grid: SceneGrid | null; aspect: number | null; isSaving: boolean; onChange: (grid: SceneGrid | null) => void; tool: GridTool; onClose: () => void };

export function GridPanel({ grid, aspect, isSaving, onChange, tool, onClose }: GridPanelProps) {
  const status = grid ? <span aria-live="polite" className="text-xs text-slate-400">{isSaving ? "Зберігаю…" : "Збережено"}</span> : null;
  return (
    <ToolPanel title="Сітка й масштаб" onClose={onClose} aside={status}>
      {tool.mode === "fit" ? <FitSteps tool={tool} />
        : grid ? <ManualGrid grid={grid} aspect={aspect} onChange={onChange} tool={tool} />
        : <NewGridChoice onAdd={() => onChange(NEW_GRID)} onFit={() => tool.setMode("fit")} />}
      {grid && tool.mode !== "fit" ? (
        <div className="flex items-center gap-2 border-t border-white/10 pt-2">
          <div className="flex-1"><SwitchRow label="Показувати лінії" isChecked={grid.isVisible} onChange={(isVisible) => onChange({ ...grid, isVisible })} /></div>
          <Button type="button" variant="ghost" onClick={() => onChange(null)} className="h-11 shrink-0 px-3 text-slate-400">Прибрати</Button>
        </div>
      ) : null}
      {grid?.isVisible && tool.mode !== "fit" ? <GridOpacitySlider opacity={grid.opacity} onChange={(opacity) => onChange({ ...grid, opacity })} /> : null}
    </ToolPanel>
  );
}

function GridOpacitySlider({ opacity, onChange }: { opacity: number; onChange: (opacity: number) => void }) {
  return (
    <label className="flex w-full min-w-0 items-center gap-3 text-sm text-slate-400">
      <span className="shrink-0">Непрозорість</span>
      <input
        type="range"
        min={GRID_OPACITY_RANGE.min}
        max={GRID_OPACITY_RANGE.max}
        step={GRID_OPACITY_RANGE.step}
        value={opacity}
        aria-valuetext={`${Math.round(opacity * 100)}%`}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full accent-arcane-300"
      />
      <span className="w-10 shrink-0 text-right tabular-nums text-slate-300">{Math.round(opacity * 100)}%</span>
    </label>
  );
}

export function describeFitTask(cellsAcross: number): string {
  if (cellsAcross === 1) return "Обведіть одну клітинку";
  return `Обведіть квадрат ${cellsAcross} × ${cellsAcross} ${pluralizeUk(cellsAcross, { one: "клітинку", few: "клітинки", many: "клітинок" })}`;
}

function FitButton({ onFit }: { onFit: () => void }) {
  return (
    <Button type="button" onClick={onFit} className="h-11 w-full gap-2">
      <Scan className="h-4 w-4" aria-hidden />
      Підігнати під намальовану сітку
    </Button>
  );
}

function NewGridChoice({ onAdd, onFit }: { onAdd: () => void; onFit: () => void }) {
  return (
    <>
      <Hint>Одна клітинка — 5 футів. Із сіткою працюють лінійка, області заклинань і токени стають на клітинки.</Hint>
      <FitButton onFit={onFit} />
      <Hint>Якщо на мапі вже є клітинки: обведете кілька — сітка ляже точно на них.</Hint>
      <Button type="button" variant="outline" onClick={onAdd} className="h-11 w-full">Мапа без клітинок — додати сітку</Button>
    </>
  );
}

function FitSteps({ tool }: { tool: GridTool }) {
  return (
    <>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-snug text-slate-300 marker:text-slate-500">
        <li>Наблизьте мапу, щоб добре бачити намальовані лінії.</li>
        <li>
          Оберіть розмір квадрата — що більший, то точніше.
          <Stepper
            label="Клітинок у квадраті"
            value={`${tool.cellsAcross} × ${tool.cellsAcross}`}
            onStep={(direction) => tool.setCellsAcross(tool.cellsAcross + direction)}
            canDecrease={tool.cellsAcross > FIT_CELLS_RANGE.min}
            canIncrease={tool.cellsAcross < FIT_CELLS_RANGE.max}
          />
        </li>
        <li>Проведіть пальцем рамку від кута першої клітинки до протилежного кута останньої.</li>
      </ol>
      <Button type="button" variant="ghost" onClick={() => tool.setMode("shift")} className="h-11 w-full text-slate-400">Скасувати</Button>
    </>
  );
}

function ManualGrid({ grid, aspect, onChange, tool }: { grid: SceneGrid; aspect: number | null; onChange: (grid: SceneGrid) => void; tool: GridTool }) {
  return (
    <>
      {tool.isFitted ? (
        <p role="status" className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm leading-snug text-emerald-100">
          Сітку підігнано. Поки «Сітка» відкрита, лінії видно — звірте їх із намальованими. Потім наші лінії сховаються: на мапі є свої.
        </p>
      ) : null}
      <FitButton onFit={() => tool.setMode("fit")} />
      <div className="space-y-2 border-t border-white/10 pt-2">
        <Stepper
          label="Клітинок по ширині"
          value={String(grid.columns)}
          onStep={(direction) => onChange({ ...grid, columns: grid.columns + direction })}
          canDecrease={grid.columns > GRID_COLUMN_RANGE.min}
          canIncrease={grid.columns < GRID_COLUMN_RANGE.max}
        >
          <ColumnsInput columns={grid.columns} onChange={(columns) => onChange({ ...grid, columns })} />
        </Stepper>
        {aspect ? <GridSize grid={grid} aspect={aspect} /> : null}
        <Hint>Тягніть мапу — лінії зсуваються слідом. Двома пальцями мапа рухається й масштабується.</Hint>
      </div>
    </>
  );
}

function GridSize({ grid, aspect }: { grid: SceneGrid; aspect: number }) {
  const size = findGridSize({ aspect, grid });
  return (
    <p aria-live="polite" className="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-200">
      Мапа — <span className="tabular-nums">{size.columns} × {size.rows}</span> клітинок, це <span className="tabular-nums">{size.widthFeet} × {size.heightFeet}</span> футів
    </p>
  );
}

function ColumnsInput({ columns, onChange }: { columns: number; onChange: (columns: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  const change = (value: string) => {
    setText(value);
    const number = Number(value);
    if (Number.isInteger(number) && number >= GRID_COLUMN_RANGE.min && number <= GRID_COLUMN_RANGE.max) onChange(number);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label="Клітинок по ширині"
      min={GRID_COLUMN_RANGE.min}
      max={GRID_COLUMN_RANGE.max}
      value={text ?? String(columns)}
      onChange={(event) => change(event.target.value)}
      onBlur={() => setText(null)}
      className="h-11 w-16 rounded-xl border border-white/10 bg-slate-950/60 text-center text-base tabular-nums text-slate-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

type FogPanelProps = { fog: SceneFog | null; brush: FogBrush; onBrushChange: (brush: FogBrush) => void; onChange: (change: FogChange) => void; isPreview: boolean; onPreviewChange: (isPreview: boolean) => void; onClose: () => void };

export function FogPanel({ fog, brush, onBrushChange, onChange, isPreview, onPreviewChange, onClose }: FogPanelProps) {
  return (
    <ToolPanel title="Туман війни" onClose={onClose}>
      <Segmented<FogBrush> label="Що робить рамка" value={brush} onChange={onBrushChange} options={[{ value: "reveal", label: "Відкрити" }, { value: "hide", label: "Сховати" }]} />
      <Hint>
        {fog ? `Обведіть пальцем ділянку, щоб ${brush === "reveal" ? "відкрити її гравцям" : "знову сховати"}.` : "Туману ще немає — гравці бачать усю мапу. Сховайте все, а тоді відкривайте ділянки рамкою."}
      </Hint>
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" variant="outline" onClick={() => onChange({ kind: "cover" })} className="h-11 px-2">Сховати все</Button>
        <Button type="button" variant="outline" onClick={() => onChange({ kind: "undo" })} disabled={!fog?.areas.length} className="h-11 px-2">Скасувати</Button>
        <Button type="button" variant="ghost" onClick={() => onChange({ kind: "clear" })} disabled={!fog} className="h-11 px-2 text-slate-400">Без туману</Button>
      </div>
      {fog ? <SwitchRow label="Очима гравців" isChecked={isPreview} onChange={onPreviewChange} /> : null}
    </ToolPanel>
  );
}

export function RulerPanel({ hasGrid, distanceFeet, isGm, onClose }: { hasGrid: boolean; distanceFeet: number | null; isGm: boolean; onClose: () => void }) {
  const aside = distanceFeet !== null ? <output aria-live="polite" className="font-rpg-display text-lg tabular-nums text-amber-100">{distanceFeet} фт</output> : null;
  return (
    <ToolPanel title="Лінійка" onClose={onClose} aside={aside}>
      <Hint>
        {hasGrid
          ? "Ведіть пальцем від точки до точки. Діагональ рахується як 5 футів за клітинку."
          : isGm
            ? "Щоб міряти відстань, задайте сітку: інструмент «Сітка»."
            : "Майстер ще не задав масштаб мапи — міряти поки нічим."}
      </Hint>
    </ToolPanel>
  );
}

type NameModeControl = { mode: TokenNameMode; onChange: (mode: TokenNameMode) => void };
type ViewPanelProps = { hasGrid: boolean; tokenScale: number; onTokenScaleChange: (scale: number) => void; heroNames: NameModeControl; creatureNames: NameModeControl | null; onClose: () => void };

export function ViewPanel({ hasGrid, tokenScale, onTokenScaleChange, heroNames, creatureNames, onClose }: ViewPanelProps) {
  return (
    <ToolPanel title="Вигляд" onClose={onClose}>
      {hasGrid ? <Hint>Токени займають клітинки сітки й ростуть разом із мапою.</Hint> : <TokenScaleSlider scale={tokenScale} onChange={onTokenScaleChange} />}
      <TokenNameModePicker label="Імена героїв" mode={heroNames.mode} onChange={heroNames.onChange} />
      {creatureNames ? <TokenNameModePicker label="Імена істот" mode={creatureNames.mode} onChange={creatureNames.onChange} /> : null}
    </ToolPanel>
  );
}
