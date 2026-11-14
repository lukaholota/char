"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from "react";

type Point = { clientX: number; clientY: number };
type Vector = { x: number; y: number };

export type MapGesture = { start: (point: Point) => void; move: (point: Point) => void; end: (point: Point) => void; cancel: () => void };

type ViewportOptions = {
  boardRef: RefObject<HTMLDivElement | null>;
  isTurned: () => boolean;
  maxZoom: number;
  gesture: MapGesture | null;
  onTap: (point: Point) => void;
  onHold: (point: Point) => void;
};

const TAP_SLOP_PX = 6;
const DOUBLE_TAP_MS = 320;
const HOLD_MS = 500;
const EDGE_SLACK_PX = 56;
const BUTTON_ZOOM_STEP = 1.6;
const TRACKPAD_STEP_PX = 50;

/// Щипок на тачпаді приходить як колесо з ctrlKey, а прокрутка двома пальцями — дрібними кроками в пікселях.
/// shortcut: миша з плавною прокруткою теж дає дрібні кроки й рухатиме мапу замість масштабу; тоді — кнопки «+»/«−» або Ctrl.
function isTrackpadScroll(event: WheelEvent): boolean {
  return !event.ctrlKey && event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && (event.deltaX !== 0 || Math.abs(event.deltaY) < TRACKPAD_STEP_PX);
}

/// Мапа рухається CSS-трансформацією без перемальовування React; кінцевий масштаб потрапляє в стан лише після жесту.
/// Один палець на порожньому місці — панорама або активний інструмент, два — масштаб і зсув разом.
/// Права або середня кнопка миші завжди тягне мапу: інструмент лишається ввімкненим.
/// Нерухоме утримання на порожньому місці без інструмента — не дотик і не панорама: ним показують точку.
export function useMapViewport({ boardRef, isTurned, maxZoom, gesture, onTap, onHold }: ViewportOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const view = useRef({ zoom: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, Point>());
  const mode = useRef<"idle" | "tap" | "held" | "pan" | "pinch" | "tool">("idle");
  const panStart = useRef({ local: { x: 0, y: 0 }, x: 0, y: 0 });
  const pinchStart = useRef({ distance: 1, zoom: 1, anchor: { x: 0, y: 0 } });
  const tapStart = useRef<Point>({ clientX: 0, clientY: 0 });
  const lastTap = useRef({ at: 0, point: { clientX: 0, clientY: 0 } });
  const latest = useRef({ isTurned, maxZoom, gesture, onTap, onHold });
  const toolGesture = useRef<MapGesture | null>(null);
  latest.current = { isTurned, maxZoom, gesture, onTap, onHold };
  const [zoom, setZoom] = useState(1);

  const toLocal = (point: Point): Vector => {
    const rect = viewportRef.current!.getBoundingClientRect();
    return latest.current.isTurned() ? { x: point.clientY - rect.top, y: rect.right - point.clientX } : { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const apply = (next: { zoom: number; x: number; y: number }) => {
    const board = boardRef.current;
    const viewport = viewportRef.current;
    if (!board || !viewport) return;
    const zoomValue = Math.min(latest.current.maxZoom, Math.max(1, next.zoom));
    const clampAxis = (shift: number, size: number, room: number, offset: number) => {
      if (size <= room) return (room - size) / 2 - offset;
      return Math.min(-offset + EDGE_SLACK_PX, Math.max(room - size - offset - EDGE_SLACK_PX, shift));
    };
    view.current = {
      zoom: zoomValue,
      x: clampAxis(next.x, board.offsetWidth * zoomValue, viewport.clientWidth, board.offsetLeft),
      y: clampAxis(next.y, board.offsetHeight * zoomValue, viewport.clientHeight, board.offsetTop),
    };
    board.style.transform = zoomValue === 1 ? "" : `translate3d(${view.current.x}px, ${view.current.y}px, 0) scale(${zoomValue})`;
    board.style.setProperty("--map-zoom", String(zoomValue));
  };

  /// Точка мапи під фокусом лишається під пальцем або курсором.
  const zoomAround = (local: Vector, nextZoom: number) => {
    const board = boardRef.current;
    if (!board) return;
    const { zoom: current, x, y } = view.current;
    const anchor = { x: (local.x - board.offsetLeft - x) / current, y: (local.y - board.offsetTop - y) / current };
    const clamped = Math.min(latest.current.maxZoom, Math.max(1, nextZoom));
    apply({ zoom: clamped, x: local.x - board.offsetLeft - anchor.x * clamped, y: local.y - board.offsetTop - anchor.y * clamped });
  };

  const settle = () => setZoom(view.current.zoom);

  const zoomByButton = (factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    zoomAround({ x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 }, view.current.zoom * factor);
    settle();
  };

  const fit = () => {
    apply({ zoom: 1, x: 0, y: 0 });
    settle();
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let settleTimer = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (isTrackpadScroll(event)) {
        if (view.current.zoom > 1) apply({ zoom: view.current.zoom, x: view.current.x - event.deltaX, y: view.current.y - event.deltaY });
        return;
      }
      zoomAround(toLocal(event), view.current.zoom * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015)));
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 160);
    };
    const observer = new ResizeObserver(() => apply(view.current));
    viewport.addEventListener("wheel", onWheel, { passive: false });
    observer.observe(viewport);
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      observer.disconnect();
      window.clearTimeout(settleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- обробники читають актуальні значення з ref
  }, []);

  const startPinch = () => {
    const [first, second] = [...pointers.current.values()].map(toLocal);
    const board = boardRef.current!;
    const middle = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const { zoom: current, x, y } = view.current;
    pinchStart.current = {
      distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
      zoom: current,
      anchor: { x: (middle.x - board.offsetLeft - x) / current, y: (middle.y - board.offsetTop - y) / current },
    };
    mode.current = "pinch";
  };

  const movePinch = () => {
    const [first, second] = [...pointers.current.values()].map(toLocal);
    const board = boardRef.current!;
    const middle = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const { distance, zoom: startZoom, anchor } = pinchStart.current;
    const nextZoom = Math.min(latest.current.maxZoom, Math.max(1, startZoom * (Math.hypot(first.x - second.x, first.y - second.y) / distance)));
    apply({ zoom: nextZoom, x: middle.x - board.offsetLeft - anchor.x * nextZoom, y: middle.y - board.offsetTop - anchor.y * nextZoom });
  };

  const handleDoubleTap = (point: Point) => {
    const isDouble = Date.now() - lastTap.current.at < DOUBLE_TAP_MS && Math.hypot(point.clientX - lastTap.current.point.clientX, point.clientY - lastTap.current.point.clientY) < 24;
    lastTap.current = isDouble ? { at: 0, point } : { at: Date.now(), point };
    if (!isDouble) return false;
    if (view.current.zoom > 1.05) fit();
    else {
      zoomAround(toLocal(point), 2.5);
      settle();
    }
    return true;
  };

  const holdPress = (point: Point) => {
    if (mode.current !== "tap" || tapStart.current !== point) return;
    mode.current = "held";
    latest.current.onHold(point);
  };

  const isOnControl = (event: PointerEvent<HTMLElement>) => event.target instanceof Element && event.target.closest("button, a, input, [data-map-control]") !== null;

  const bindViewport = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const isPanButton = event.button === 1 || event.button === 2;
      if (!isPanButton && (event.button !== 0 || isOnControl(event))) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const point = { clientX: event.clientX, clientY: event.clientY };
      pointers.current.set(event.pointerId, point);
      if (pointers.current.size === 2) {
        if (mode.current === "tool") toolGesture.current?.cancel();
        return startPinch();
      }
      if (pointers.current.size > 2) return;
      tapStart.current = point;
      panStart.current = { local: toLocal(point), x: view.current.x, y: view.current.y };
      mode.current = isPanButton ? "pan" : "tap";
      toolGesture.current = isPanButton ? null : latest.current.gesture;
      if (toolGesture.current) {
        mode.current = "tool";
        toolGesture.current.start(point);
      }
      if (mode.current === "tap") window.setTimeout(() => holdPress(point), HOLD_MS);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      const point = { clientX: event.clientX, clientY: event.clientY };
      pointers.current.set(event.pointerId, point);
      if (mode.current === "pinch") return movePinch();
      if (mode.current === "tool") return toolGesture.current?.move(point);
      if (mode.current === "tap" && Math.hypot(point.clientX - tapStart.current.clientX, point.clientY - tapStart.current.clientY) < TAP_SLOP_PX) return;
      if (mode.current === "tap") mode.current = "pan";
      if (mode.current !== "pan" || view.current.zoom === 1) return;
      const local = toLocal(point);
      apply({ zoom: view.current.zoom, x: panStart.current.x + local.x - panStart.current.local.x, y: panStart.current.y + local.y - panStart.current.local.y });
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.delete(event.pointerId)) return;
      const point = { clientX: event.clientX, clientY: event.clientY };
      if (mode.current === "tool") toolGesture.current?.end(point);
      if (mode.current === "tap" && !handleDoubleTap(point)) latest.current.onTap(point);
      if (mode.current === "pinch" && pointers.current.size === 1) {
        const [rest] = [...pointers.current.values()];
        panStart.current = { local: toLocal(rest), x: view.current.x, y: view.current.y };
        mode.current = "pan";
        return settle();
      }
      if (pointers.current.size === 0) {
        if (mode.current === "pinch" || mode.current === "pan") settle();
        mode.current = "idle";
      }
    },
    onContextMenu: (event: MouseEvent<HTMLDivElement>) => event.preventDefault(),
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(event.pointerId);
      if (mode.current === "tool") toolGesture.current?.cancel();
      if (pointers.current.size === 0) {
        mode.current = "idle";
        settle();
      }
    },
  };

  return { viewportRef, bindViewport, zoom, zoomIn: () => zoomByButton(BUTTON_ZOOM_STEP), zoomOut: () => zoomByButton(1 / BUTTON_ZOOM_STEP), fit };
}
