import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  onConfirm: () => void;
  isEnabled?: boolean;
}

export function useTwoStepConfirm<T extends HTMLElement = HTMLElement>({ onConfirm, isEnabled = true }: Options) {
  const [isConfirming, setIsConfirming] = useState(false);
  const ref = useRef<T | null>(null);
  const onConfirmRef = useRef(onConfirm);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  const cancel = useCallback(() => {
    setIsConfirming(false);
  }, []);

  const onClick = useCallback(
    (e?: ReactMouseEvent<HTMLButtonElement>) => {
      if (!isEnabled) {
        onConfirmRef.current();
        return;
      }

      if (!isConfirming) {
        e?.preventDefault();
        setIsConfirming(true);
        return;
      }

      setIsConfirming(false);
      onConfirmRef.current();
    },
    [isConfirming, isEnabled]
  );

  useEffect(() => {
    if (!isConfirming) return;
    if (typeof document === "undefined") return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      const target = event.target as Node | null;

      if (!el || !target) {
        setIsConfirming(false);
        return;
      }

      if (el.contains(target)) return;
      setIsConfirming(false);
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
    };
  }, [isConfirming]);

  return { ref, isConfirming, onClick, cancel };
}
