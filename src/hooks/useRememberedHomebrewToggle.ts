"use client";

import { useEffect, useRef } from "react";

const STORAGE_PREFIX = "catalog-homebrew:";

// Рішення власника 2026-09-14: увімкнене раз хоумбрю на сторінці каталогу вмикається й надалі, поки його не вимкнуть.
export function useRememberedHomebrewToggle(pageKey: string | null, isOn: boolean, turnOn: () => void) {
  const hasRestored = useRef(false);

  useEffect(() => {
    if (!pageKey) return;
    if (hasRestored.current) return writeRemembered(pageKey, isOn);
    hasRestored.current = true;
    if (!isOn && readRemembered(pageKey)) turnOn();
  }, [pageKey, isOn, turnOn]);
}

function readRemembered(pageKey: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + pageKey) === "1";
  } catch {
    return false;
  }
}

function writeRemembered(pageKey: string, isOn: boolean) {
  try {
    if (isOn) window.localStorage.setItem(STORAGE_PREFIX + pageKey, "1");
    else window.localStorage.removeItem(STORAGE_PREFIX + pageKey);
  } catch {
    return;
  }
}
