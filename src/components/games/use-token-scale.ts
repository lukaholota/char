import { useState, useSyncExternalStore } from "react";

export const TOKEN_SCALE_RANGE = { min: 0.6, max: 1.6, step: 0.1 } as const;
export const SMALLEST_SCALE_WITH_NAMES = 0.8;

const subscribeToNothing = () => () => undefined;

export function parseTokenScale(stored: string | null): number {
  const value = Number(stored);
  if (!stored || !Number.isFinite(value)) return 1;
  return Math.min(TOKEN_SCALE_RANGE.max, Math.max(TOKEN_SCALE_RANGE.min, value));
}

export function useTokenScale(sessionId: number) {
  const storageKey = `game-map:token-scale:${sessionId}`;
  const remembered = useSyncExternalStore(subscribeToNothing, () => parseTokenScale(readStored(storageKey)), () => 1);
  const [chosen, setChosen] = useState<number | null>(null);
  const changeScale = (scale: number) => {
    setChosen(scale);
    writeStored(storageKey, String(scale));
  };
  return [chosen ?? remembered, changeScale] as const;
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}
