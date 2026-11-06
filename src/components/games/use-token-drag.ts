"use client";

import { useRef, useState, type PointerEvent } from "react";

const DRAG_THRESHOLD_PX = 4;

type Point = { clientX: number; clientY: number };
export type TokenGhost<Id = number> = Point & { id: Id; isOverTarget: boolean };

/// Токен лишається на місці, а за пальцем їде його копія: так елемент із захопленим вказівником не перемонтовується посеред руху.
/// onTap — дотик без руху: так токен відкриває картку, не заважаючи перетягуванню.
export function useTokenDrag<Id = number>(onDrop: (id: Id, point: Point) => void, isOverTarget: (point: Point) => boolean, onTap?: (id: Id) => void) {
  const [ghost, setGhost] = useState<TokenGhost<Id> | null>(null);
  const origin = useRef<(Point & { id: Id; isDragging: boolean }) | null>(null);

  const finish = () => {
    origin.current = null;
    setGhost(null);
  };

  const bindToken = (id: Id) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      origin.current = { id, clientX: event.clientX, clientY: event.clientY, isDragging: false };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const start = origin.current;
      if (start?.id !== id) return;
      if (!start.isDragging && Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) < DRAG_THRESHOLD_PX) return;
      start.isDragging = true;
      const point = { clientX: event.clientX, clientY: event.clientY };
      setGhost({ id, ...point, isOverTarget: isOverTarget(point) });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const start = origin.current?.id === id ? origin.current : null;
      finish();
      if (start?.isDragging) onDrop(id, { clientX: event.clientX, clientY: event.clientY });
      else if (start) onTap?.(id);
    },
    onPointerCancel: finish,
  });

  return { ghost, bindToken };
}
