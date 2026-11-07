"use client";

import { useMemo } from "react";
import type { PersWithRelations } from "@/lib/actions/pers";
import { listActiveBuffKeys, markSpellBuff, type EffectSpell } from "@/lib/logic/pers-effect-rows";
import { findSpellBuffSpellEngName } from "@/rules/spell-buffs";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { BLESSED_MARK } from "@/rules/token-conditions";
import type { GameSessionView } from "@/server/db/game-sessions";
import { useGameSessionLiveStore } from "./game-session-live-store";

export function isPersBlessedInRoom(view: GameSessionView | null, activeRoomId: number | null, persId: number): boolean {
  if (!view || view.id !== activeRoomId) return false;
  return view.members.some((member) => member.persId === persId && member.conditions.conditions.includes(BLESSED_MARK));
}

/// Позначку кладе чужий заклинач на мапі, тож у листі вона лише віртуальний баф: не зберігається й зникає разом із позначкою.
export function addRoomBlessing(pers: PersWithRelations, isBlessed: boolean): PersWithRelations {
  if (!isBlessed || listActiveBuffKeys(pers).includes("BLESS")) return pers;
  return markSpellBuff(pers, "BLESS", true, { spell: null, endsWithConcentration: false });
}

export function useRoomBlessedPers(pers: PersWithRelations): PersWithRelations {
  const activeRoomId = useGameSessionStore((state) => state.active?.id ?? null);
  const isBlessed = useGameSessionLiveStore((state) => isPersBlessedInRoom(state.view, activeRoomId, pers.persId));
  return useMemo(() => addRoomBlessing(pers, isBlessed), [pers, isBlessed]);
}

export const isBlessSpell = (spell: { engName?: string | null } | null | undefined) => spell?.engName === findSpellBuffSpellEngName("BLESS");

/// Заклинач втратив концентрацію на «Благословенні» — позначки зникають з токенів відкритої кімнати.
export function endRoomBlessing(endedSpell: EffectSpell | null | undefined, nextSpell: EffectSpell | null) {
  const { view } = useGameSessionLiveStore.getState();
  const isRoomOpen = view !== null && view.id === useGameSessionStore.getState().active?.id;
  if (!isRoomOpen || !isBlessSpell(endedSpell) || endedSpell?.spellId === nextSpell?.spellId) return;
  void import("@/lib/actions/game-sessions").then(({ endRoomBlessingAction }) => endRoomBlessingAction(view.id)).catch(() => null);
}
