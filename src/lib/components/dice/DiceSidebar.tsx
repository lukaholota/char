"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    const checkReady = () => {
      setIsReady(diceService.isInitialized());
    };
    checkReady();
    const interval = setInterval(checkReady, 500);

    diceService.onRollComplete((result) => {
      setLastResult(result.total);
      setIsRolling(false);
    });

    return () => clearInterval(interval);
  }, []);

  // Clear dice when sidebar is closed
  useEffect(() => {
    if (!isOpen) {
      diceService.clear();
      setLastResult(null);
    }
  }, [isOpen]);

  const handleRoll = async () => {
    if (!isReady || isRolling) return;

    setIsRolling(true);
    setLastResult(null);
    diceService.clear();

    const sides = DIE_SIDES[dieType];
    
    // Simple roll using official API - library handles random spawn points
    await diceService.roll(count, sides);
    
    // Safety timeout
    setTimeout(() => {
      setIsRolling(false);
    }, 6000);
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
