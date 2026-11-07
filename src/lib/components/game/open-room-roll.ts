"use client";

import { useDiceUIStore, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { canCastOnArea, startAreaCast } from "./area-cast";
import { startMapTargeting } from "./map-targeting";

/// Кидок у кімнаті з мапою спершу питає, куди він летить: область — поставити зону, ціль — дотикнути токен.
export function openRoomRoll(roll: DiceRollContext) {
  if (!canCastOnArea(roll)) return openTargetedRoll(roll);
  void startAreaCast(roll).then((isStarted) => isStarted || openTargetedRoll(roll));
}

function openTargetedRoll(roll: DiceRollContext) {
  if (!startMapTargeting(roll)) useDiceUIStore.getState().openRoll(roll);
}
