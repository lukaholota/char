"use client";

import { useRef, useState, type PointerEvent } from "react";

const DRAG_THRESHOLD_PX = 4;

type Point = { clientX: number; clientY: number };
export type TokenGhost = Point & { userId: number; isOverTarget: boolean };

/// Токен лишається на місці, а за пальцем їде його копія: так елемент із захопленим вказівником не перемонтовується посеред руху.
export function useTokenDrag(onDrop: (userId: number, point: Point) => void, isOverTarget: (point: Point) => boolean) {
  const [ghost, setGhost] = useState<TokenGhost | null>(null);
  const origin = useRef<(Point & { userId: number; isDragging: boolean }) | null>(null);

  const finish = () => {
    origin.current = null;
    setGhost(null);
  };

  const bindToken = (userId: number) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      origin.current = { userId, clientX: event.clientX, clientY: event.clientY, isDragging: false };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const start = origin.current;
      if (start?.userId !== userId) return;
      if (!start.isDragging && Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) < DRAG_THRESHOLD_PX) return;
      start.isDragging = true;
      const point = { clientX: event.clientX, clientY: event.clientY };
      setGhost({ userId, ...point, isOverTarget: isOverTarget(point) });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const wasDragging = origin.current?.userId === userId && origin.current.isDragging;
      finish();
      if (wasDragging) onDrop(userId, { clientX: event.clientX, clientY: event.clientY });
    },
    onPointerCancel: finish,
  });

  return { ghost, bindToken };
}
