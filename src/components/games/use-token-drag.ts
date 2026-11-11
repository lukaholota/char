"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

const DRAG_THRESHOLD_PX = 4;

type Point = { clientX: number; clientY: number };
export type TokenGhost<Id = number> = Point & { id: Id; isOverTarget: boolean };

const toPoint = (event: Point): Point => ({ clientX: event.clientX, clientY: event.clientY });

/// Токен лишається на місці, а за пальцем їде його копія. Рух і відпускання слухає вікно:
/// якщо новий стан кімнати перемонтує кнопку посеред руху, копія не зависає.
/// onTap — дотик без руху: так токен відкриває картку, не заважаючи перетягуванню.
/// touchHoldMs — для списків, що гортаються пальцем: тягнути можна лише після утримання, рух раніше — це прокрутка.
export function useTokenDrag<Id = number>(onDrop: (id: Id, point: Point) => void, isOverTarget: (point: Point) => boolean, onTap?: (id: Id) => void, touchHoldMs?: number) {
  const [ghost, setGhost] = useState<TokenGhost<Id> | null>(null);
  const latest = useRef({ onDrop, isOverTarget, onTap });
  latest.current = { onDrop, isOverTarget, onTap };
  const stopDrag = useRef<() => void>(() => undefined);
  useEffect(() => () => stopDrag.current(), []);

  const startDrag = (id: Id, start: PointerEvent<HTMLElement>) => {
    stopDrag.current();
    let isDragging = false;
    const isHeld = touchHoldMs !== undefined && start.pointerType === "touch";
    let isArmed = !isHeld;
    const preventScroll = (event: TouchEvent) => event.preventDefault();
    const holdTimer = isHeld
      ? window.setTimeout(() => {
          isArmed = true;
          window.addEventListener("touchmove", preventScroll, { passive: false });
          setGhost({ id, ...toPoint(start), isOverTarget: false });
        }, touchHoldMs)
      : 0;
    const isSamePointer = (event: globalThis.PointerEvent) => event.pointerId === start.pointerId;
    const onMove = (event: globalThis.PointerEvent) => {
      if (!isSamePointer(event)) return;
      const isMoved = Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) >= DRAG_THRESHOLD_PX;
      if (!isArmed) return void (isMoved && finish());
      if (!isDragging && !isMoved) return;
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
      window.clearTimeout(holdTimer);
      window.removeEventListener("touchmove", preventScroll);
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
