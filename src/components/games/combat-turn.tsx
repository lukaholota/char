"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CombatView } from "@/rules/game-combat";

type CurrentTurn = { heroUserId: number | null; creatureId: number | null };

const NO_TURN: CurrentTurn = { heroUserId: null, creatureId: null };
const CurrentTurnContext = createContext<CurrentTurn>(NO_TURN);

export const TURN_RING_CLASS = "ring-4 ring-arcane-300";

export function CombatTurnProvider({ combat, children }: { combat: CombatView | null; children: ReactNode }) {
  const current = combat?.combatants.find((combatant) => combatant.id === combat.currentId);
  const heroUserId = current?.hero?.userId ?? null;
  const creatureId = current?.creature?.id ?? null;
  const value = useMemo(() => (heroUserId === null && creatureId === null ? NO_TURN : { heroUserId, creatureId }), [heroUserId, creatureId]);
  return <CurrentTurnContext.Provider value={value}>{children}</CurrentTurnContext.Provider>;
}

export function useIsHeroTurn(userId: number): boolean {
  return useContext(CurrentTurnContext).heroUserId === userId;
}

export function useIsCreatureTurn(creatureId: number): boolean {
  return useContext(CurrentTurnContext).creatureId === creatureId;
}
