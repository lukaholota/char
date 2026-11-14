import { useState, useSyncExternalStore } from "react";
import { parseTokenNameMode, type TokenNameMode } from "@/rules/game-map-creatures";

export const TOKEN_SCALE_RANGE = { min: 0.6, max: 1.6, step: 0.1 } as const;
export const SMALLEST_SCALE_WITH_NAMES = 0.8;
export const TOKEN_SIZE_PX = 44;

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

/// Імена героїв кожен обирає для себе; імена істот — майстер для всіх (game_session.creature_name_mode).
export function useHeroNameMode(sessionId: number) {
  const storageKey = `game-map:hero-name-mode:${sessionId}`;
  const remembered = useSyncExternalStore(subscribeToNothing, () => parseTokenNameMode(readStored(storageKey)) ?? "short", () => "short" as const);
  const [chosen, setChosen] = useState<TokenNameMode | null>(null);
  const changeMode = (mode: TokenNameMode) => {
    setChosen(mode);
    writeStored(storageKey, mode);
  };
  return [chosen ?? remembered, changeMode] as const;
}

function useStoredSwitch(storageKey: string, isOnAtStart: boolean, isOnBeforeHydration = isOnAtStart) {
  const remembered = useSyncExternalStore(subscribeToNothing, () => (readStored(storageKey) ?? (isOnAtStart ? "on" : "off")) === "on", () => isOnBeforeHydration);
  const [chosen, setChosen] = useState<boolean | null>(null);
  const changeSwitch = (isOn: boolean) => {
    setChosen(isOn);
    writeStored(storageKey, isOn ? "on" : "off");
  };
  return [chosen ?? remembered, changeSwitch] as const;
}

/// Кольорова обвідка прозорих токенів — за замовчуванням вимкнена: коли світиться кожен, це заважає.
export const useCutoutOutline = (sessionId: number) => useStoredSwitch(`game-map:cutout-outline:${sessionId}`, false);

/// Портрети героїв поза боєм кожен вмикає для себе; у бою чергу згортає стрілка біля заголовка.
export const usePartyPortraits = (sessionId: number) => useStoredSwitch(`game-map:party-portraits:${sessionId}`, true);

/// Портрети поверх мапи не забирають у неї висоту; стрілка біля них виносить їх в окремий ряд над мапою.
/// Типово — там, де висоти бракує (екран ушир). На екрані вгору мапу обмежує ширина: ряд нічого не коштує, а накладка закривала б мапу.
export const usePortraitsOverMap = (sessionId: number) => useStoredSwitch(`game-map:portraits-over-map:${sessionId}`, isScreenLandscape(), true);
const isScreenLandscape = () => typeof window === "undefined" || (window.matchMedia?.("(orientation: landscape)").matches ?? true);

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
