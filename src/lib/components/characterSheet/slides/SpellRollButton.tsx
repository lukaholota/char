"use client";

import { Dice6 } from "lucide-react";
import type { CastSlot } from "./sheet-spell-rolls";

export function SpellRollButton({ spellName, lastCastSlot, onRoll }: { spellName: string; lastCastSlot: CastSlot | null; onRoll: () => void }) {
  const slotText = lastCastSlot ? lastCastSlot.slotLabel.toLocaleLowerCase("uk") : null;
  return (
    <button
      type="button"
      aria-label={`Кинути кубики «${spellName}»${slotText ? `, ${slotText}` : ""}`}
      title={slotText ? `Кинути: ${slotText}` : "Кинути кубики"}
      className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-md border border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
      onClick={(event) => {
        event.stopPropagation();
        onRoll();
      }}
    >
      <Dice6 className="h-3.5 w-3.5" />
    </button>
  );
}
