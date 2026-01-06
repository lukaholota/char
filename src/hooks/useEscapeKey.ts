import { useEffect } from "react";

export function useEscapeKey(onEscape: () => void, opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, onEscape]);
}

