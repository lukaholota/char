import { useEffect, type RefObject } from "react";

type RefLike = RefObject<HTMLElement | null>;

export function useClickOutside(
  refs: RefLike | RefLike[],
  onOutside: (event: PointerEvent) => void,
  opts?: { enabled?: boolean }
) {
  const enabled = opts?.enabled ?? true;
  const refList = Array.isArray(refs) ? refs : [refs];

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const isInside = refList.some((ref) => {
        const el = ref.current;
        return el ? el.contains(target) : false;
      });

      if (!isInside) onOutside(event);
    };

    document.addEventListener("pointerdown", handler, { capture: true });
    return () => document.removeEventListener("pointerdown", handler, { capture: true } as any);
  }, [enabled, onOutside, refList]);
}
