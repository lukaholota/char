"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestHeroDamage } from "@/lib/components/game/hero-damage";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { findNaturalD20, type GameRoll } from "@/rules/game-roll";
import { buildHeroDamageOperationId, type GameRollHeroTargetView } from "@/rules/game-roll-hero-target";
import { showRoomTab } from "./room-tabs";

export function GameRollHeroTargetLine({ target, roll, total, seq }: { target: GameRollHeroTargetView; roll: GameRoll | null; total: number | null; seq: number }) {
  const sessionId = useGameSessionLiveStore((state) => state.sessionId);
  const isMyHero = useGameSessionLiveStore((state) => state.view?.myPersId === target.persId);
  return (
    <div className="mt-1 space-y-1 text-sm text-slate-200">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="min-w-0 break-words">→ {target.name}</span>
        {target.isHit !== null ? <span className={cn("font-semibold", target.isHit ? "text-rose-200" : "text-slate-300")}>{target.isHit ? "влучання" : "промах"}</span> : null}
        {target.armorClass !== null ? <span className="text-xs text-slate-400 tabular-nums">КЗ {target.armorClass}</span> : null}
        {target.damage !== null ? <span className="font-semibold tabular-nums">· −{target.damage}</span> : null}
        {target.healing !== null ? <span className="font-semibold tabular-nums text-emerald-200">· +{target.healing} хітів</span> : null}
      </div>
      {isMyHero && target.kind === "attack" && target.isHit === null ? <p className="text-xs text-slate-300">{describeAttackOnMe(roll, total)}</p> : null}
      {isMyHero && target.healing && target.isAppliedToSheet ? <p className="text-xs text-slate-300">Додано {target.healing} хітів на ваш лист</p> : null}
      {isMyHero && sessionId !== null && target.damage ? <MyHeroDamage sessionId={sessionId} seq={seq} persId={target.persId} amount={target.damage} isApplied={target.isAppliedToSheet} /> : null}
    </div>
  );
}

/// Старі події без КЗ героя: гравець порівнює зі своїм листом.
function describeAttackOnMe(roll: GameRoll | null, total: number | null): string {
  const natural = roll ? findNaturalD20(roll) : null;
  if (natural === "NAT_20") return "Природна 20 — влучає у вас";
  if (natural === "NAT_1") return "Природна 1 — промах";
  return `Влучає, якщо ваш КЗ ${total ?? "?"} або менше`;
}

type MyHeroDamageProps = { sessionId: number; seq: number; persId: number; amount: number; saveRowIndex?: number; isApplied: boolean };

/// Нові удари кімната знімає з листа сама; кнопка лишається для подій, записаних до цього.
export function MyHeroDamage({ isApplied, ...props }: MyHeroDamageProps) {
  return isApplied ? <p className="text-xs text-slate-300">Знято {props.amount} хітів з вашого листа</p> : <TakeDamageButton {...props} />;
}

function TakeDamageButton({ sessionId, seq, persId, amount, saveRowIndex }: Omit<MyHeroDamageProps, "isApplied">) {
  const [isTaken, setIsTaken] = useState(false);
  const take = () => {
    requestHeroDamage({ persId, amount, operationId: buildHeroDamageOperationId(sessionId, seq, saveRowIndex) });
    setIsTaken(true);
    showRoomTab("hero");
    captureGameEvent("game_hero_damage_taken", {});
  };
  return (
    <Button type="button" variant={isTaken ? "ghost" : "outline"} disabled={isTaken} onClick={take} className="h-11 px-3 text-sm">
      {isTaken ? `Знято ${amount} з листа` : `Зняти ${amount} хітів з листа`}
    </Button>
  );
}
