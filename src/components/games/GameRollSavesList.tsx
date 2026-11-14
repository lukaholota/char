"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { undoSaveDamageAction } from "@/lib/actions/game-sessions";
import { addGameEvents, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { formatModifier } from "@/lib/logic/utils";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { damageTypeTranslations } from "@/lib/refs/translation";
import type { DamageDefense, DamageType, SaveDieRoll } from "@/rules/creature-save";
import type { GameRollSaveRowView, GameRollSavesView } from "@/rules/game-roll-saves";
import { TOKEN_CONDITION_LABELS } from "@/rules/token-conditions";
import { MyHeroDamage } from "./GameRollHeroTargetLine";

const DEFENSE_LABELS: Record<DamageDefense, string> = { immune: "імунітет", resistant: "опір", vulnerable: "вразливість" };
const MODE_LABELS = { ADVANTAGE: "перевага", DISADVANTAGE: "перешкода", NORMAL: null } as const;

export function GameRollSavesList({ saves, seq }: { saves: GameRollSavesView; seq: number }) {
  const sessionId = useGameSessionLiveStore((state) => state.sessionId);
  const myPersIds = useGameSessionLiveStore((state) => state.view?.myPersIds);
  return (
    <ul aria-label="Ряткидки цілей" className="mt-1 space-y-1 text-sm text-slate-200">
      {saves.rows.map((row, index) => (
        <li key={index} className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="min-w-0 break-words">→ {row.name}</span>
            <span className={cn("font-semibold", row.isSaved ? "text-emerald-200" : "text-rose-200")}>{row.isSaved ? "успіх" : "провал"}</span>
            {saves.damageType ? <span className="font-semibold tabular-nums">−{row.damage}</span> : null}
            {row.condition ? <span className="text-amber-200">{TOKEN_CONDITION_LABELS[row.condition]}</span> : null}
            {row.gm?.isUndone ? <span className="rounded-md border border-white/10 px-1.5 text-xs text-slate-300">скасовано</span> : null}
          </div>
          {row.gm ? <GmSaveDetails gm={row.gm} defenses={describeDefenses(saves, row.gm)} undoLabel={`Скасувати ${saves.damageType ? "шкоду" : "ефект"}: ${row.name}`} seq={seq} rowIndex={index} /> : null}
          {sessionId !== null && row.persId !== null && myPersIds?.includes(row.persId) && row.damage > 0 ? (
            <MyHeroDamage sessionId={sessionId} seq={seq} persId={row.persId} amount={row.damage} saveRowIndex={index} isApplied={row.isAppliedToSheet} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function GmSaveDetails({ gm, defenses, undoLabel, seq, rowIndex }: { gm: NonNullable<GameRollSaveRowView["gm"]>; defenses: string[]; undoLabel: string; seq: number; rowIndex: number }) {
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
    ...defenses,
    hitPoints,
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-xs text-slate-400 tabular-nums">{details.join(" · ")}</span>
      {gm.canUndo ? (
        <Button type="button" variant="outline" disabled={isUndoing} onClick={undo} aria-label={undoLabel} className="h-11 px-3 text-sm">
          Скасувати
        </Button>
      ) : null}
    </div>
  );
}

/// Шкода двох типів: «дробяча — опір», щоб було видно, проти чого саме захист.
function describeDefenses(saves: GameRollSavesView, gm: NonNullable<GameRollSaveRowView["gm"]>): string[] {
  if (!saves.secondDamageType) return gm.defense ? [DEFENSE_LABELS[gm.defense]] : [];
  const parts: Array<[DamageType | null, DamageDefense | null | undefined]> = [[saves.damageType, gm.defense], [saves.secondDamageType, gm.secondDefense]];
  return parts.flatMap(([type, defense]) => (type && defense ? [`${damageTypeTranslations[type.toUpperCase()].toLocaleLowerCase("uk")} — ${DEFENSE_LABELS[defense]}`] : []));
}

/// «+к4 3» — кубик «Благословення» в ряткидку.
function describeSaveDie(die: SaveDieRoll): string {
  return `${die.value < 0 ? "−" : "+"}к${die.sides} ${Math.abs(die.value)}`;
}
