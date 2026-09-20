import { useDeferredValue } from "react";

/// false на першому рендері й одразу після зміни `value`; true, коли React у фоні, з поступками
/// вводу, дорендерив дерево з новим значенням. Важке під цим прапорцем не блокує відкриття.
export function useIsDeferredRenderReady<T>(value: T): boolean {
  const deferredValue = useDeferredValue<T | null>(value, null);
  return deferredValue === value;
}
