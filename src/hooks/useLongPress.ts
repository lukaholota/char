import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

const LONG_PRESS_MS = 500;
// Далі за цей зсув палець уже гортає слайд чи прокручує сторінку — довгого натискання немає.
const MOVE_TOLERANCE_PX = 8;

export function useLongPress(onLongPress: (() => void) | undefined) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const hasFiredRef = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  const onPointerDown = (event: PointerEvent) => {
    if (!onLongPress || event.button !== 0) return;
    hasFiredRef.current = false;
    startRef.current = { x: event.clientX, y: event.clientY };
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      hasFiredRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (event: PointerEvent) => {
    const start = startRef.current;
    if (!start) return;
    if (Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y) > MOVE_TOLERANCE_PX) cancelLongPress();
  };

  const onContextMenu = (event: MouseEvent) => {
    if (onLongPress) event.preventDefault();
  };

  const isLongPressClick = () => {
    const hasFired = hasFiredRef.current;
    hasFiredRef.current = false;
    return hasFired;
  };

  return {
    longPressHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: cancelLongPress,
      onPointerCancel: cancelLongPress,
      onPointerLeave: cancelLongPress,
      onContextMenu,
    },
    isLongPressClick,
  };
}
