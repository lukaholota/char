import { useCallback, useRef } from "react";

/**
 * Серія швидких натискань на один лічильник (ресурс класу, слоти): кожне змінює число одразу,
 * а відповідь сервера застосовується лише від останнього — інакше запізніла відповідь першого
 * тапу відкочує вже показані наступні.
 */
export function useLatestMutation() {
  const startedRef = useRef<Record<string, number>>({});
  const finishedRef = useRef<Record<string, number>>({});

  const startMutation = useCallback((key: string) => {
    const version = (startedRef.current[key] ?? 0) + 1;
    startedRef.current[key] = version;
    return version;
  }, []);

  const finishMutation = useCallback((key: string, version: number) => {
    finishedRef.current[key] = Math.max(finishedRef.current[key] ?? 0, version);
    return startedRef.current[key] === version;
  }, []);

  const hasPendingMutation = useCallback(
    (key: string) => (finishedRef.current[key] ?? 0) < (startedRef.current[key] ?? 0),
    [],
  );

  return { startMutation, finishMutation, hasPendingMutation };
}
