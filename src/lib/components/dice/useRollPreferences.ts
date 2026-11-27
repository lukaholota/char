"use client";

import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import type { GameSessionView } from "@/server/db/game-sessions";
import { useGameSessionStore, type RollPreferences } from "@/lib/stores/gameSessionStore";

const BOOK_ROLL_PREFERENCES: RollPreferences = { isAttackTrayShown: true, isDamageAutoRolled: true };

export function useCampaignRollPreferences(): RollPreferences {
  const activeId = useGameSessionStore((state) => state.active?.id ?? null);
  return useGameSessionLiveStore((state) => findCampaignRollPreferences(state.view, activeId));
}

export function useRollPreferences(campaign: RollPreferences): RollPreferences {
  const choices = useGameSessionStore((state) => state.rollChoices);
  return mergeRollPreferences(choices, campaign);
}

export function readRollPreferences(): RollPreferences {
  const { active, rollChoices } = useGameSessionStore.getState();
  return mergeRollPreferences(rollChoices, findCampaignRollPreferences(useGameSessionLiveStore.getState().view, active?.id ?? null));
}

/// Вибір, що збігається з кампанією, не зберігається — тоді гравець іде за майстром і далі.
export function chooseRollPreference(key: keyof RollPreferences, value: boolean, campaign: RollPreferences) {
  const { [key]: _previous, ...others } = useGameSessionStore.getState().rollChoices;
  useGameSessionStore.setState({ rollChoices: value === campaign[key] ? others : { ...others, [key]: value } });
}

function findCampaignRollPreferences(view: GameSessionView | null, activeId: number | null): RollPreferences {
  return (view && view.id === activeId ? view.houseRules : null) ?? BOOK_ROLL_PREFERENCES;
}

function mergeRollPreferences(choices: Partial<RollPreferences>, campaign: RollPreferences): RollPreferences {
  return { isAttackTrayShown: choices.isAttackTrayShown ?? campaign.isAttackTrayShown, isDamageAutoRolled: choices.isDamageAutoRolled ?? campaign.isDamageAutoRolled };
}
