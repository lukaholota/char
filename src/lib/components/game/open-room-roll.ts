"use client";

import { useDiceUIStore, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { canCastOnArea, startAreaCast } from "./area-cast";
import { useGameSessionLiveStore } from "./game-session-live-store";
import { startMapTargeting } from "./map-targeting";

/// Кидок у кімнаті з мапою спершу питає, куди він летить: область — поставити зону, ціль — дотикнути токен.
export function openRoomRoll(roll: DiceRollContext) {
  if (!canCastOnArea(roll)) return openTargetedRoll(roll);
  void startAreaCast(roll).then((isStarted) => isStarted || openTargetedRoll(roll));
}

/// Ряткидок цілі кидає кімната, тож поза нею чи без ролі майстра кидати нічого.
export function useCanRollTargetSave(): boolean {
  const activeRoomId = useGameSessionStore((state) => state.active?.id ?? null);
  return useGameSessionLiveStore((state) => state.view?.myRole === "GM" && state.view.id === activeRoomId);
}

function openTargetedRoll(roll: DiceRollContext) {
  if (!startMapTargeting(roll)) useDiceUIStore.getState().openRoll(roll);
}
