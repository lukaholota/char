"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { diceService } from "./diceService";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { DICE_OVERLAY_Z_INDEX, DICE_TRAY_HEIGHT_VAR } from "./dice-tray-layout";

const INIT_DELAY_MS = 100;

export function DiceOverlay() {
  const initRef = useRef(false);
  const { isOpen, mode } = useDiceUIStore();

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const timer = setTimeout(async () => {
      try {
        await diceService.init("#dice-box");
        window.dispatchEvent(new Event("resize"));
      } catch (error) {
        console.error("Failed to initialize dice overlay:", error);
        initRef.current = false;
      }
    }, INIT_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  // До кінця `init()` resize іде у фізичний воркер, де ще немає Ammo, і падає з
  // `reading 'setValue'` (Sentry JAVASCRIPT-NEXTJS-8/-A); після init його шле сам ефект вище.
  useEffect(() => {
    if (diceService.getStatus() !== "ready") return;
    diceService.setVisualPreset(mode);
    window.dispatchEvent(new Event("resize"));
  }, [isOpen, mode]);

  const status = useSyncExternalStore(diceService.subscribeStatus.bind(diceService), () => diceService.getStatus(), () => "loading" as const);

  return (
    <div
      id="dice-overlay-root"
      className="pointer-events-none fixed inset-x-0 top-0"
      style={{ zIndex: DICE_OVERLAY_Z_INDEX, bottom: isOpen ? `var(${DICE_TRAY_HEIGHT_VAR}, 0px)` : 0 }}
    >
      <div id="dice-box" className="pointer-events-none h-full w-full" />
      {isOpen && status === "fallback" && (
        <div
          data-dice-fallback
          className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-slate-950/70 px-3 py-1 text-[11px] text-amber-200/90"
        >
          3D-кубики на цьому пристрої не завантажились — результати без анімації
        </div>
      )}
    </div>
  );
}
