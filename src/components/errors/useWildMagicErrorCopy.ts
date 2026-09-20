"use client";

import { useState, useSyncExternalStore } from "react";

import {
  type WildMagicErrorCopy,
  WILD_MAGIC_ERROR_COPIES,
  drawRandomCopyIndex,
  findSeededCopyIndex,
} from "./wild-magic-error-copy";

/// Сервер і гідрація читають варіант, виведений із `seed` (`error.digest`), а клієнт після
/// гідрації — один випадковий на весь показ. `useSyncExternalStore` перемикає їх так, як React
/// велить для контенту, що різниться між сервером і клієнтом: без hydration mismatch, і React
/// домальовує клієнтський варіант ще до першого кадру.
export function useWildMagicErrorCopy(seed?: string): WildMagicErrorCopy {
  const [clientDraw] = useState(createOneTimeDraw);
  const index = useSyncExternalStore(subscribeToNothing, clientDraw.read, () => findSeededCopyIndex(seed));
  return WILD_MAGIC_ERROR_COPIES[index];
}

function createOneTimeDraw() {
  let drawn: number | null = null;
  return { read: () => (drawn ??= drawRandomCopyIndex()) };
}

function subscribeToNothing() {
  return () => {};
}
