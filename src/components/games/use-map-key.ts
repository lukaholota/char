"use client";

import { useEffect, useRef, type RefObject } from "react";

/// На ноутбуках Mac клавіша «delete» — це Backspace, тож видаляють обидві; у полі введення вони стирають текст, як звично.
export const DELETE_KEYS = ["Delete", "Backspace"];
export const ESCAPE_KEYS = ["Escape"];

/// scope — елемент мапи чи панелі: поки відкрите модальне вікно, Radix ховає решту сторінки за aria-hidden, і клавіша дістається лише вікну.
export function useMapKey(keys: readonly string[], act: () => void, scope?: RefObject<Element | null>) {
  const latestAct = useRef(act);
  latestAct.current = act;
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!keys.includes(event.key) || event.defaultPrevented) return;
      if (scope && (!scope.current || scope.current.closest('[aria-hidden="true"]'))) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      latestAct.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keys, scope]);
}
