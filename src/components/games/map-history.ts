"use client";

import { useEffect } from "react";
import { create } from "zustand";

export type HistoryStep = { undo: () => unknown; redo: () => unknown };
type SceneStep = HistoryStep & { sceneId: number };
type History = { done: SceneStep[]; undone: SceneStep[] };

const HISTORY_LIMIT = 40;
const useHistory = create<History>(() => ({ done: [], undone: [] }));
const valuesBefore = new Map<string, unknown>();
let isReplaying = false;

const isSameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const isOtherScene = (sceneId: number) => (step: SceneStep) => step.sceneId !== sceneId;

/// Стрілки й ручки повороту показують зміну ще до запиту: скасування має повернути те, що було до жесту, а не останній кадр.
export function holdValueBefore(key: string, value: unknown) {
  if (!valuesBefore.has(key)) valuesBefore.set(key, value);
}

export function rememberUndo<T>(sceneId: number | null, key: string, current: T, next: T, restore: (value: T) => unknown) {
  const before = valuesBefore.has(key) ? (valuesBefore.get(key) as T) : current;
  valuesBefore.delete(key);
  if (sceneId !== null && !isSameValue(before, next)) pushUndoStep(sceneId, { undo: () => restore(before), redo: () => restore(next) });
}

/// Саме скасування й повтор теж надсилають зміну — вона не має ставати новим кроком історії.
export function pushUndoStep(sceneId: number, step: HistoryStep) {
  if (isReplaying) return;
  useHistory.setState(({ done, undone }) => ({ done: [...done, { ...step, sceneId }].slice(-HISTORY_LIMIT), undone: undone.filter(isOtherScene(sceneId)) }));
}

function replayLastStep(sceneId: number, from: "done" | "undone") {
  const history = useHistory.getState();
  const steps = history[from];
  const index = steps.findLastIndex((step) => step.sceneId === sceneId);
  if (index < 0) return;
  const step = steps[index];
  const rest = steps.filter((_step, stepIndex) => stepIndex !== index);
  useHistory.setState(from === "done" ? { done: rest, undone: [...history.undone, step].slice(-HISTORY_LIMIT) } : { undone: rest, done: [...history.done, step].slice(-HISTORY_LIMIT) });
  isReplaying = true;
  try {
    void (from === "done" ? step.undo() : step.redo());
  } finally {
    isReplaying = false;
  }
}

export type MapHistory = { undo: (() => void) | null; redo: (() => void) | null };

export function useMapHistory(sceneId: number | null): MapHistory {
  const canUndo = useHistory(({ done }) => sceneId !== null && done.some((step) => step.sceneId === sceneId));
  const canRedo = useHistory(({ undone }) => sceneId !== null && undone.some((step) => step.sceneId === sceneId));
  return {
    undo: canUndo && sceneId !== null ? () => replayLastStep(sceneId, "done") : null,
    redo: canRedo && sceneId !== null ? () => replayLastStep(sceneId, "undone") : null,
  };
}

const isTypingTarget = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function findShortcutStep(event: KeyboardEvent): "done" | "undone" | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || isTypingTarget(event.target)) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "undone" : "done";
  return key === "y" && !event.shiftKey ? "undone" : null;
}

/// Ctrl+Z скасовує, Ctrl+Shift+Z або Ctrl+Y повторює правку мапи; у полях вводу клавіші лишаються за текстом.
export function useMapUndoShortcut(sceneId: number | null) {
  useEffect(() => {
    if (sceneId === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const from = findShortcutStep(event);
      if (!from) return;
      event.preventDefault();
      replayLastStep(sceneId, from);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sceneId]);
}

export function resetMapHistory() {
  valuesBefore.clear();
  useHistory.setState({ done: [], undone: [] });
}
