"use client";

import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { changeHeroConditionsAction, changeMapCreatureConditionsAction } from "@/lib/actions/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { applyTokenConditionChange, type TokenConditionChange, type TokenConditions } from "@/rules/token-conditions";
import { readOptimistic, sendOptimistic, useOptimistic } from "./optimistic-values";

export type TokenRef = { kind: "hero" | "creature"; id: number };

const findConditionsKey = (token: TokenRef) => `conditions:${token.kind}:${token.id}`;

export const useShownConditions = (token: TokenRef, server: TokenConditions) => useOptimistic(findConditionsKey(token), server);

function sendChange(sessionId: number, token: TokenRef, change: TokenConditionChange) {
  return token.kind === "hero" ? changeHeroConditionsAction(sessionId, token.id, change) : changeMapCreatureConditionsAction(sessionId, token.id, change);
}

export function useTokenConditionChanges(sessionId: number) {
  const router = useModeRouter();
  return async (token: TokenRef, server: TokenConditions, change: TokenConditionChange) => {
    const key = findConditionsKey(token);
    const next = applyTokenConditionChange(readOptimistic(key, server), change);
    const result = await sendOptimistic(key, next, () => sendChange(sessionId, token, change));
    if (result.ok) captureGameEvent("game_condition_changed", { token: token.kind, kind: change.kind });
    router.refresh();
  };
}
