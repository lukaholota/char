"use client";

import { useEffect, useRef } from "react";
import { diceService } from "./diceService";

export function DiceOverlay() {
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initRef.current) return;
    initRef.current = true;

    // Initialize dice-box after DOM is ready
    const initDice = async () => {
      try {
        await diceService.init("#dice-box");
      } catch (error) {
        console.error("Failed to initialize dice overlay:", error);
        initRef.current = false; // Allow retry
      }
    };

    // Small delay to ensure DOM is mounted
    const timer = setTimeout(initDice, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      id="dice-overlay-root"
      className="pointer-events-none fixed inset-0 z-[2147483647]"
      style={{ background: "transparent" }}
    >
      <div
        id="dice-box"
        className="h-full w-full"
        style={{ background: "transparent" }}
      />
    </div>
  );
}
