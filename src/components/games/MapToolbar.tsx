"use client";

import { BrickWall, ChevronDown, CloudFog, Flame, Grid3x3, Lightbulb, Maximize2, Minus, Package, PencilLine, Plus, Redo2, Ruler, RotateCw, Scan, SlidersHorizontal, Undo2, X, type LucideIcon } from "lucide-react";
import { Fragment, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MapHistory } from "./map-history";
import type { MapTool } from "./use-map-tools";

const TOOLS: Array<{ tool: MapTool; label: string; icon: LucideIcon; isGmOnly?: boolean; startsGroup?: boolean }> = [
  { tool: "ruler", label: "Лінійка", icon: Ruler },
  { tool: "area", label: "Область", icon: Flame },
  { tool: "draw", label: "Олівець", icon: PencilLine },
  { tool: "objects", label: "Обʼєкти", icon: Package, isGmOnly: true, startsGroup: true },
  { tool: "walls", label: "Стіни", icon: BrickWall, isGmOnly: true },
  { tool: "light", label: "Світло", icon: Lightbulb, isGmOnly: true },
  { tool: "fog", label: "Туман", icon: CloudFog, isGmOnly: true },
  { tool: "grid", label: "Сітка", icon: Grid3x3, isGmOnly: true },
  { tool: "view", label: "Вигляд", icon: SlidersHorizontal, startsGroup: true },
];

/// Рейка лежить на правому краї мапи й не забирає в неї ні ряду, ні колонки. Вузько — лише іконки, широко — з підписами. Риска відділяє гру, підготовку сцени й вигляд.
const TOOL_ROW = "flex min-h-0 w-12 shrink flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl bg-slate-950/85 p-0.5 shadow-xl shadow-black/50 ring-1 ring-white/10 [scrollbar-width:none] [@container(min-width:40rem)]:w-[4.5rem]";
const TOOL_BUTTON = "flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-slate-300 hover:bg-white/10 hover:text-slate-100 [@container(min-width:40rem)]:h-14 [@container(min-width:40rem)]:w-full";
const TOOL_GROUP_RULE = "mx-2 my-0.5 h-px shrink-0 bg-white/10";

export function MapToolRow({ tool, onToolChange, canEditScene, canDraw, className }: { tool: MapTool | null; onToolChange: (tool: MapTool | null) => void; canEditScene: boolean; canDraw: boolean; className?: string }) {
  const tools = TOOLS.filter((entry) => (canEditScene || !entry.isGmOnly) && (canDraw || entry.tool !== "draw"));
  return (
    <div role="toolbar" aria-label="Інструменти мапи" className={cn(TOOL_ROW, className)}>
      {tools.map(({ tool: entry, label, icon: Icon, startsGroup }, index) => (
        <Fragment key={entry}>
          {startsGroup && index > 0 ? <span aria-hidden className={TOOL_GROUP_RULE} /> : null}
          <button type="button" title={label} aria-pressed={tool === entry} onClick={() => onToolChange(tool === entry ? null : entry)} className={cn(TOOL_BUTTON, tool === entry && "bg-arcane-300/20 text-arcane-100 ring-1 ring-inset ring-arcane-300/60")}>
            <Icon className="h-5 w-5" aria-hidden />
            <span className="sr-only [@container(min-width:40rem)]:not-sr-only [@container(min-width:40rem)]:max-w-full [@container(min-width:40rem)]:truncate">{label}</span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}

function RailButton({ label, onClick, isPressed, children }: { label: string; onClick: () => void; isPressed?: boolean; children: ReactNode }) {
  return (
    <button type="button" data-map-control aria-label={label} aria-pressed={isPressed} title={label} onClick={onClick} className="grid h-11 w-11 place-items-center rounded-xl text-slate-200 hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}

type ZoomProps = { zoom: number; maxZoom: number; onZoomIn: () => void; onZoomOut: () => void; onFit: () => void; turn: { isTurned: boolean; toggle: () => void } | null; history: MapHistory; onFullscreen?: () => void };

/// Щипок і подвійний дотик теж масштабують; кнопки — для миші та для тих, хто про жести не знає.
/// На весь екран мапу розгортає телефон: там це ховає шапку й навігацію; на широкому екрані місце дає згортання бічної панелі.
export function MapZoomControls({ zoom, maxZoom, onZoomIn, onZoomOut, onFit, turn, history, onFullscreen }: ZoomProps) {
  const isZoomed = zoom > 1.01;
  return (
    <div role="group" aria-label="Масштаб мапи" className="mt-auto flex shrink-0 flex-col gap-0.5 rounded-2xl bg-slate-950/85 p-0.5 shadow-xl shadow-black/50 ring-1 ring-white/10">
      {onFullscreen ? (
        <span className="contents lg:hidden">
          <RailButton label="Мапа на весь екран" onClick={onFullscreen}>
            <Maximize2 className="h-5 w-5" aria-hidden />
          </RailButton>
        </span>
      ) : null}
      {turn ? (
        <span className="hidden portrait:contents">
          <RailButton label={turn.isTurned ? "Повернути мапу назад" : "Повернути мапу горизонтально"} isPressed={turn.isTurned} onClick={turn.toggle}>
            <RotateCw className="h-5 w-5" aria-hidden />
          </RailButton>
        </span>
      ) : null}
      {history.undo ? <RailButton label="Скасувати останню дію (Ctrl+Z)" onClick={history.undo}><Undo2 className="h-5 w-5" aria-hidden /></RailButton> : null}
      {history.redo ? <RailButton label="Повторити скасовану дію (Ctrl+Shift+Z)" onClick={history.redo}><Redo2 className="h-5 w-5" aria-hidden /></RailButton> : null}
      {zoom < maxZoom - 0.01 ? <RailButton label="Наблизити" onClick={onZoomIn}><Plus className="h-5 w-5" aria-hidden /></RailButton> : null}
      {isZoomed ? <RailButton label="Віддалити" onClick={onZoomOut}><Minus className="h-5 w-5" aria-hidden /></RailButton> : null}
      {isZoomed ? <RailButton label="Уся мапа" onClick={onFit}><Scan className="h-5 w-5" aria-hidden /></RailButton> : null}
    </div>
  );
}

export function FoldSection({ title, children, className, isOpenAtStart = true }: { title: string; children: ReactNode; className?: string; isOpenAtStart?: boolean }) {
  const [isOpen, setIsOpen] = useState(isOpenAtStart);
  const contentId = useId();
  return (
    <section aria-label={title} className={cn("rounded-2xl border border-white/10 bg-slate-900/60", className)}>
      <button type="button" aria-expanded={isOpen} aria-controls={contentId} onClick={() => setIsOpen(!isOpen)} className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-left text-slate-200 hover:bg-white/5">
        <span className="min-w-0 flex-1 truncate font-rpg-display text-base">{title}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400", isOpen && "rotate-180")} aria-hidden />
      </button>
      {isOpen ? <div id={contentId} className="px-3 pb-3">{children}</div> : null}
    </section>
  );
}

export function ToolPanel({ title, onClose, children, aside }: { title: string; onClose: () => void; children: ReactNode; aside?: ReactNode }) {
  return (
    <section aria-label={title} className="w-full space-y-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3">
      <div className="flex min-h-11 items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-rpg-display text-base text-slate-100">{title}</h3>
        {aside}
        <button type="button" onClick={onClose} aria-label="Закрити інструмент" className="-my-2 -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-slate-100">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {children}
    </section>
  );
}

type SegmentedProps<Value extends string> = { label: string; value: Value; options: Array<{ value: Value; label: string }>; onChange: (value: Value) => void; isTwoRows?: boolean };

export function Segmented<Value extends string>({ label, value, options, onChange, isTwoRows }: SegmentedProps<Value>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("rounded-xl border border-white/10 p-0.5", isTwoRows ? "grid grid-cols-2" : "flex")}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn("h-10 min-w-0 flex-auto truncate rounded-lg px-1.5 text-sm", value === option.value ? "bg-white/10 text-slate-100" : "text-slate-400 hover:text-slate-200")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

type StepperProps = { label: string; value: string; onStep: (direction: 1 | -1) => void; canDecrease?: boolean; canIncrease?: boolean; children?: ReactNode };

export function Stepper({ label, value, onStep, canDecrease = true, canIncrease = true, children }: StepperProps) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="min-w-0 flex-1 text-sm text-slate-300">{label}</span>
      <button type="button" onClick={() => onStep(-1)} disabled={!canDecrease} aria-label={`${label}: менше`} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-200 hover:bg-white/10 disabled:opacity-40">
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      {children ?? <output aria-live="polite" className="min-w-14 text-center text-base tabular-nums text-slate-100">{value}</output>}
      <button type="button" onClick={() => onStep(1)} disabled={!canIncrease} aria-label={`${label}: більше`} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-200 hover:bg-white/10 disabled:opacity-40">
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function HistoryButtons({ history }: { history: MapHistory }) {
  return (
    <>
      <Button type="button" variant="outline" onClick={history.undo ?? undefined} disabled={!history.undo} aria-label="Скасувати" title="Скасувати" className="h-11 w-11 shrink-0 p-0"><Undo2 className="h-4 w-4" aria-hidden /></Button>
      <Button type="button" variant="outline" onClick={history.redo ?? undefined} disabled={!history.redo} aria-label="Повторити" title="Повторити" className="h-11 w-11 shrink-0 p-0"><Redo2 className="h-4 w-4" aria-hidden /></Button>
    </>
  );
}
