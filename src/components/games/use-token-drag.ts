"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

const DRAG_THRESHOLD_PX = 4;

type Point = { clientX: number; clientY: number };
export type TokenGhost<Id = number> = Point & { id: Id; isOverTarget: boolean };

const toPoint = (event: Point): Point => ({ clientX: event.clientX, clientY: event.clientY });

/// Токен лишається на місці, а за пальцем їде його копія. Рух і відпускання слухає вікно:
/// якщо новий стан кімнати перемонтує кнопку посеред руху, копія не зависає.
/// onTap — дотик без руху: так токен відкриває картку, не заважаючи перетягуванню.
export function useTokenDrag<Id = number>(onDrop: (id: Id, point: Point) => void, isOverTarget: (point: Point) => boolean, onTap?: (id: Id) => void) {
  const [ghost, setGhost] = useState<TokenGhost<Id> | null>(null);
  const latest = useRef({ onDrop, isOverTarget, onTap });
  latest.current = { onDrop, isOverTarget, onTap };
  const stopDrag = useRef<() => void>(() => undefined);
  useEffect(() => () => stopDrag.current(), []);

  const startDrag = (id: Id, start: PointerEvent<HTMLElement>) => {
    stopDrag.current();
    let isDragging = false;
    const isSamePointer = (event: globalThis.PointerEvent) => event.pointerId === start.pointerId;
    const onMove = (event: globalThis.PointerEvent) => {
      if (!isSamePointer(event)) return;
      if (!isDragging && Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) < DRAG_THRESHOLD_PX) return;
      isDragging = true;
      const point = toPoint(event);
      setGhost({ id, ...point, isOverTarget: latest.current.isOverTarget(point) });
    };
    const onUp = (event: globalThis.PointerEvent) => {
      if (!isSamePointer(event)) return;
      finish();
      if (isDragging) latest.current.onDrop(id, toPoint(event));
      else latest.current.onTap?.(id);
    };
    const onCancel = (event: globalThis.PointerEvent) => isSamePointer(event) && finish();
    const finish = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      stopDrag.current = () => undefined;
      setGhost(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    stopDrag.current = finish;
  };

  const bindToken = (id: Id) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if (event.pointerType === "mouse") event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      startDrag(id, event);
    },
  });

  return { ghost, bindToken };
}
