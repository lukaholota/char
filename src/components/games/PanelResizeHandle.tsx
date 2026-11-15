"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { DEFAULT_DOCKED_JOURNAL_HEIGHT, DEFAULT_SIDE_PANEL_WIDTH } from "@/lib/stores/gameSessionStore";
import { cn } from "@/lib/utils";

/// reserve — скільки сітка лишає сусідам: мапі збоку чи листу над журналом.
export type ResizablePanel = { axis: "x" | "y"; cssVar: string; label: string; min: number; max: number; reserve: number; defaultSize: number };

export const SIDE_PANEL_SIZE: ResizablePanel = { axis: "x", cssVar: "--side-panel-width", label: "Ширина бічної панелі", min: 352, max: 1200, reserve: 480, defaultSize: DEFAULT_SIDE_PANEL_WIDTH };
export const DOCKED_JOURNAL_SIZE: ResizablePanel = { axis: "y", cssVar: "--docked-journal-height", label: "Висота журналу", min: 112, max: 900, reserve: 260, defaultSize: DEFAULT_DOCKED_JOURNAL_HEIGHT };

const KEY_STEP = 32;
const GROW_KEYS = { x: "ArrowLeft", y: "ArrowUp" };
const SHRINK_KEYS = { x: "ArrowRight", y: "ArrowDown" };

export function clampPanelSize(panel: ResizablePanel, size: number, gridSize: number) {
  return Math.round(Math.max(panel.min, Math.min(size, panel.max, gridSize - panel.reserve)));
}

type Props = { panel: ResizablePanel; size: number; onSave: (size: number) => void; className?: string };

/// Ручка — пряма дитина сітки й лежить на межі панелі, що тягнеться до правого чи нижнього краю сітки.
/// Поки тягнуть, міняється лише CSS-змінна сітки, щоб мапа й лист не перемальовувались на кожен рух; у сховище — після відпускання.
export function PanelResizeHandle({ panel, size, onSave, className }: Props) {
  const grabOffset = useRef(0);
  const isX = panel.axis === "x";
  const findGrid = (handle: HTMLElement) => handle.parentElement!.getBoundingClientRect();
  const findPointer = (event: { clientX: number; clientY: number }) => (isX ? event.clientX : event.clientY);
  const findEdge = (rect: DOMRect) => (isX ? rect.left + rect.width / 2 : rect.top + rect.height / 2);
  const findGridEnd = (grid: DOMRect) => (isX ? grid.right : grid.bottom);
  const findGridSize = (grid: DOMRect) => (isX ? grid.width : grid.height);
  const findDraggedSize = (event: PointerEvent<HTMLElement>) => {
    const grid = findGrid(event.currentTarget);
    return clampPanelSize(panel, findGridEnd(grid) - findPointer(event) + grabOffset.current, findGridSize(grid));
  };

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    grabOffset.current = findPointer(event) - findEdge(event.currentTarget.getBoundingClientRect());
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drag = (event: PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.parentElement!.style.setProperty(panel.cssVar, `${findDraggedSize(event)}px`);
  };
  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onSave(findDraggedSize(event));
  };
  const resizeByKey = (event: KeyboardEvent<HTMLElement>) => {
    const step = event.key === GROW_KEYS[panel.axis] ? KEY_STEP : event.key === SHRINK_KEYS[panel.axis] ? -KEY_STEP : 0;
    if (!step) return;
    event.preventDefault();
    const grid = findGrid(event.currentTarget);
    const shown = findGridEnd(grid) - findEdge(event.currentTarget.getBoundingClientRect());
    onSave(clampPanelSize(panel, shown + step, findGridSize(grid)));
  };

  return (
    <div
      role="separator"
      aria-orientation={isX ? "vertical" : "horizontal"}
      aria-label={panel.label}
      aria-valuenow={size}
      aria-valuemin={panel.min}
      aria-valuemax={panel.max}
      tabIndex={0}
      title="Тягніть, щоб змінити розмір. Подвійний клік — як було."
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onSave(panel.defaultSize)}
      onKeyDown={resizeByKey}
      className={cn("group relative z-30 touch-none focus-visible:outline-none", isX ? "-ml-1.5 w-3 cursor-col-resize justify-self-start" : "-mt-1.5 h-3 cursor-row-resize self-start", className)}
    >
      <span className={cn("absolute bg-transparent group-hover:bg-arcane-400/60 group-focus-visible:bg-arcane-300 group-active:bg-arcane-300", isX ? "inset-y-0 left-1/2 w-0.5 -translate-x-1/2" : "inset-x-0 top-1/2 h-0.5 -translate-y-1/2")} aria-hidden />
    </div>
  );
}
