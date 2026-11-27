"use client";

import { Button } from "@/components/ui/button";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import type { GameRollEventView } from "@/server/db/game-roll-events";
import { isDamageReviewPending, openDamageReview } from "./DamageReviewDialog";

/// Хіти знімає подія підтвердження, тож у самому кидку — лише ціль і стан перевірки.
export function GameRollDamageReviewLine({ event }: { event: GameRollEventView }) {
  const isGm = useGameSessionLiveStore((state) => state.view?.myRole === "GM");
  const targetName = event.target?.name ?? event.heroTarget?.name;
  const isPending = isDamageReviewPending(event);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-200">
      {targetName ? <span className="min-w-0 break-words">→ {targetName}</span> : null}
      {event.isCancelled ? null : <span className="text-xs text-slate-300">{isPending ? "чекає підтвердження майстра" : "майстер перевірив шкоду"}</span>}
      {isGm && isPending ? (
        <Button type="button" variant="outline" onClick={() => openDamageReview(event.seq)} className="h-11 px-3 text-sm">
          Перевірити шкоду
        </Button>
      ) : null}
    </div>
  );
}
