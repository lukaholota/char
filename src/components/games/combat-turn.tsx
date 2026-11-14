"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CombatView } from "@/rules/game-combat";

type CurrentTurn = { heroPersId: number | null; creatureId: number | null };

const NO_TURN: CurrentTurn = { heroPersId: null, creatureId: null };
const CurrentTurnContext = createContext<CurrentTurn>(NO_TURN);

/// Однаково світиться той, чий зараз хід у бою, і той, кого підсвітили вручну.
export const SPOTLIGHT_RING_CLASS = "ring-4 ring-arcane-300 shadow-[0_0_1rem_0.3rem] shadow-arcane-300/70";

export function CombatTurnProvider({ combat, children }: { combat: CombatView | null; children: ReactNode }) {
  const current = combat?.combatants.find((combatant) => combatant.id === combat.currentId);
  const heroPersId = current?.hero?.persId ?? null;
  const creatureId = current?.creature?.id ?? null;
  const value = useMemo(() => (heroPersId === null && creatureId === null ? NO_TURN : { heroPersId, creatureId }), [heroPersId, creatureId]);
  return <CurrentTurnContext.Provider value={value}>{children}</CurrentTurnContext.Provider>;
}

export function useIsHeroTurn(persId: number | null): boolean {
  return useContext(CurrentTurnContext).heroPersId === persId && persId !== null;
}

export function useIsCreatureTurn(creatureId: number): boolean {
  return useContext(CurrentTurnContext).creatureId === creatureId;
}
