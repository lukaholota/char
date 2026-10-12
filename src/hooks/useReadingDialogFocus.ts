"use client";

import { useRef } from "react";

export function useReadingDialogFocus() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  function rememberTrigger(trigger: HTMLElement) {
    triggerRef.current = trigger;
  }
  function onOpenAutoFocus(event: Event) {
    event.preventDefault();
    triggerRef.current ??= document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus({ preventScroll: true });
  }
  function onCloseAutoFocus(event: Event) {
    event.preventDefault();
    triggerRef.current?.focus({ preventScroll: true });
    triggerRef.current = null;
  }
  return { dialogProps: { ref: dialogRef, onOpenAutoFocus, onCloseAutoFocus }, rememberTrigger };
}
