"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { undoRollDamageAction } from "@/lib/actions/game-sessions";
import { addGameEvents, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import type { GameRollTargetView } from "@/rules/game-roll-target";

export function GameRollTargetLine({ target, seq }: { target: GameRollTargetView; seq: number }) {
  return (
    <div className="mt-1 space-y-1 text-sm text-slate-200">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="min-w-0 break-words">→ {target.name}</span>
        <span className="font-semibold tabular-nums">· {buildOutcomeText(target)}</span>
        {target.gm?.isUndone ? <span className="rounded-md border border-white/10 px-1.5 text-xs text-slate-300">скасовано</span> : null}
      </div>
      {target.gm ? <GmDetails gm={target.gm} kind={target.kind} seq={seq} /> : null}
    </div>
  );
}

function buildOutcomeText(target: GameRollTargetView): string {
  if (target.kind === "damage") return `−${target.damage ?? 0}${target.isDowned ? " · повалений" : ""}`;
  if (target.isHit === null) return "КЗ невідомий";
  return target.isHit ? "Влучання" : "Промах";
}

function GmDetails({ gm, kind, seq }: { gm: NonNullable<GameRollTargetView["gm"]>; kind: GameRollTargetView["kind"]; seq: number }) {
  const sessionId = useGameSessionLiveStore((state) => state.sessionId);
  const [isUndoing, setIsUndoing] = useState(false);
  const undo = async () => {
    if (sessionId === null) return;
    setIsUndoing(true);
    const result = await undoRollDamageAction(sessionId, seq);
    setIsUndoing(false);
    if (!result.ok) return void toast.error(result.error);
    addGameEvents(sessionId, [result.value]);
    captureGameEvent("game_damage_undone", {});
  };
  if (kind === "attack") return <p className="text-xs text-slate-400">{gm.armorClass === null ? "КЗ істоти змінний — перевірте вручну" : `КЗ ${gm.armorClass}`}</p>;
  if (gm.hitPointsBefore === null || gm.hitPointsAfter === null) return <p className="text-xs text-slate-400">Хіти не змінено: у істоти їх не задано</p>;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-xs text-slate-400 tabular-nums">Хіти {gm.hitPointsBefore} → {gm.hitPointsAfter}</span>
      {gm.canUndo ? (
        <Button type="button" variant="outline" disabled={isUndoing} onClick={undo} className="h-11 px-3 text-sm">
          Скасувати
        </Button>
      ) : null}
    </div>
  );
}
