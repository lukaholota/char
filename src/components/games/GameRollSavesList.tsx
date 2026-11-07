"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { undoSaveDamageAction } from "@/lib/actions/game-sessions";
import { addGameEvents, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { formatModifier } from "@/lib/logic/utils";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import type { DamageDefense, SaveDieRoll } from "@/rules/creature-save";
import type { GameRollSaveRowView, GameRollSavesView } from "@/rules/game-roll-saves";
import { MyHeroDamage } from "./GameRollHeroTargetLine";

const DEFENSE_LABELS: Record<DamageDefense, string> = { immune: "імунітет", resistant: "опір", vulnerable: "вразливість" };
const MODE_LABELS = { ADVANTAGE: "перевага", DISADVANTAGE: "перешкода", NORMAL: null } as const;

export function GameRollSavesList({ saves, seq }: { saves: GameRollSavesView; seq: number }) {
  const sessionId = useGameSessionLiveStore((state) => state.sessionId);
  const myPersId = useGameSessionLiveStore((state) => state.view?.myPersId ?? null);
  return (
    <ul aria-label="Ряткидки цілей" className="mt-1 space-y-1 text-sm text-slate-200">
      {saves.rows.map((row, index) => (
        <li key={index} className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="min-w-0 break-words">→ {row.name}</span>
            <span className={cn("font-semibold", row.isSaved ? "text-emerald-200" : "text-rose-200")}>{row.isSaved ? "успіх" : "провал"}</span>
            <span className="font-semibold tabular-nums">−{row.damage}</span>
            {row.gm?.isUndone ? <span className="rounded-md border border-white/10 px-1.5 text-xs text-slate-300">скасовано</span> : null}
          </div>
          {row.gm ? <GmSaveDetails gm={row.gm} name={row.name} seq={seq} rowIndex={index} /> : null}
          {sessionId !== null && row.persId !== null && row.persId === myPersId && row.damage > 0 ? (
            <MyHeroDamage sessionId={sessionId} seq={seq} persId={row.persId} amount={row.damage} saveRowIndex={index} isApplied={row.isAppliedToSheet} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function GmSaveDetails({ gm, name, seq, rowIndex }: { gm: NonNullable<GameRollSaveRowView["gm"]>; name: string; seq: number; rowIndex: number }) {
  const sessionId = useGameSessionLiveStore((state) => state.sessionId);
  const [isUndoing, setIsUndoing] = useState(false);
  const undo = async () => {
    if (sessionId === null) return;
    setIsUndoing(true);
    const result = await undoSaveDamageAction(sessionId, seq, rowIndex);
    setIsUndoing(false);
    if (!result.ok) return void toast.error(result.error);
    addGameEvents(sessionId, [result.value]);
    captureGameEvent("game_damage_undone", {});
  };
  const hitPoints = gm.hitPointsBefore !== null && gm.hitPointsAfter !== null ? `хіти ${gm.hitPointsBefore} → ${gm.hitPointsAfter}` : null;
  const details = [
    gm.isAutoFail ? "автопровал" : [`к20 ${gm.d20.join("/")}`, formatModifier(gm.bonus), ...gm.dice.map(describeSaveDie), `= ${gm.total}`].join(" "),
    MODE_LABELS[gm.mode],
    gm.defense ? DEFENSE_LABELS[gm.defense] : null,
    hitPoints,
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-xs text-slate-400 tabular-nums">{details.join(" · ")}</span>
      {gm.canUndo ? (
        <Button type="button" variant="outline" disabled={isUndoing} onClick={undo} aria-label={`Скасувати шкоду: ${name}`} className="h-11 px-3 text-sm">
          Скасувати
        </Button>
      ) : null}
    </div>
  );
}

/// «+к4 3» — кубик «Благословення» в ряткидку.
function describeSaveDie(die: SaveDieRoll): string {
  return `${die.value < 0 ? "−" : "+"}к${die.sides} ${Math.abs(die.value)}`;
}
