"use client";

import { create } from "zustand";
import { isSummonSpell } from "@/rules/summon-spells";
import { findMapRoomId, showMapForPicking } from "./area-cast";
import { useGameSessionLiveStore } from "./game-session-live-store";

type SummonCast = { sessionId: number; spellEngName: string };

export const useSummonCastStore = create<{ cast: SummonCast | null }>(() => ({ cast: null }));

/// Каст фамільяра чи духа з листа гравця одразу відкриває на мапі «Виклик» з цим заклинанням.
export function startSummonCast(spellEngName: string | null | undefined): boolean {
  const sessionId = findMapRoomId();
  const isPlayer = useGameSessionLiveStore.getState().view?.myRole !== "GM";
  if (!spellEngName || !isSummonSpell(spellEngName) || sessionId === null || !isPlayer) return false;
  useSummonCastStore.setState({ cast: { sessionId, spellEngName } });
  showMapForPicking();
  return true;
}

export function dropSummonCast() {
  useSummonCastStore.setState({ cast: null });
}
