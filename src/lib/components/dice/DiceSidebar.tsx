"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { diceService } from "./diceService";
import { Dices, X, Plus, Minus } from "lucide-react";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type DieType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";

const DICE_TYPES: DieType[] = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

const DIE_SIDES: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};

export function DiceSidebar() {
  const { isOpen, close } = useDiceUIStore();
  const [dieType, setDieType] = useState<DieType>("d20");
  const [count, setCount] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  const isOpenRef = useRef(isOpen);
  const isRollingRef = useRef(isRolling);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollIdRef = useRef(0);
  const ignoreNextResultRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isRollingRef.current = isRolling;
  }, [isRolling]);

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const resetRollState = useCallback(() => {
    clearSafetyTimer();

    // If the user closes mid-roll, ignore the eventual late result.
    if (isRollingRef.current) {
      ignoreNextResultRef.current = true;
    }

    rollIdRef.current += 1; // invalidate any in-flight callbacks
    setIsRolling(false);
    setLastResult(null);
    diceService.clear();
  }, [clearSafetyTimer]);

  useEffect(() => {
    const checkReady = () => {
      setIsReady(diceService.isInitialized());
    };
    checkReady();
    const interval = setInterval(checkReady, 500);

    diceService.onRollComplete((result) => {
      clearSafetyTimer();

      // If the sidebar is closed, always unlock but don't show results.
      if (!isOpenRef.current) {
        ignoreNextResultRef.current = false;
        setIsRolling(false);
        return;
      }

      // Only accept a completion if we currently have an active roll.
      // This prevents late/stale results from appearing after close/reopen.
      if (!isRollingRef.current) {
        ignoreNextResultRef.current = false;
        return;
      }

      // Ignore the next completion if we explicitly cancelled by closing.
      if (ignoreNextResultRef.current) {
        ignoreNextResultRef.current = false;
        setIsRolling(false);
        return;
      }

      setLastResult(result.total);
      setIsRolling(false);
    });

    return () => {
      clearInterval(interval);
      clearSafetyTimer();
    };
  }, [clearSafetyTimer]);

  // Clear dice when sidebar is closed
  useEffect(() => {
    if (!isOpen) {
      resetRollState();
    }
  }, [isOpen, resetRollState]);

  const handleRoll = () => {
    if (!isReady || isRolling) return;

    // Starting a new roll should always allow showing its result.
    ignoreNextResultRef.current = false;

    setIsRolling(true);
    setLastResult(null);
    diceService.clear();

    const thisRollId = (rollIdRef.current += 1);

    // Safety timeout: always schedule immediately so we don't get stuck
    // if the underlying promise never resolves (e.g., sidebar closed mid-roll).
    clearSafetyTimer();
    safetyTimerRef.current = setTimeout(() => {
      if (thisRollId !== rollIdRef.current) return;
      setIsRolling(false);
    }, 6000);

    const sides = DIE_SIDES[dieType];

    // Fire-and-forget: completion is handled by diceService.onRollComplete.
    void diceService.roll(count, sides);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 z-[2147483647] h-screen w-20 flex flex-col items-center gap-4 border-l border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-2xl py-4 overflow-y-auto scrollbar-hide"
        >
          {/* Close Button */}
          <button
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="h-px w-10 bg-white/10" />

          {/* Dice Selection */}
          <div className="flex flex-col gap-2 w-full px-2">
            {DICE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setDieType(type)}
                className={cn(
                  "flex h-10 w-full items-center justify-center rounded-lg text-sm font-bold transition-all",
                  dieType === type
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {type.replace("d", "к")}
              </button>
            ))}
          </div>

          <div className="h-px w-10 bg-white/10" />

          {/* Count Selector */}
          <div className="flex flex-col items-center gap-1 bg-slate-900/50 rounded-xl p-1.5 border border-white/5">
            <button
              onClick={() => setCount(Math.min(50, count + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="font-mono text-lg font-bold text-amber-500 w-8 text-center">
              {count}
            </span>
            <button
              onClick={() => setCount(Math.max(1, count - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1" />

          {/* Result Display (Small) */}
          <AnimatePresence>
            {lastResult !== null && (
               <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/50 bg-amber-500/10 text-xl font-bold text-amber-400"
               >
                 {lastResult}
               </motion.div>
            )}
          </AnimatePresence>

          {/* Roll Button */}
          <button
            onClick={handleRoll}
            disabled={!isReady || isRolling}
            className={cn(
              "mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:active:scale-100",
              isRolling && "animate-pulse cursor-not-allowed"
            )}
          >
            <Dices className={cn("h-7 w-7", isRolling && "animate-spin")} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
