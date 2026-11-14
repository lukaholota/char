"use client";

import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { changeHeroConditionsAction, changeMapCreatureConditionsAction } from "@/lib/actions/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { SPOTLIGHT_MARK, applyTokenConditionChange, isSpotlit, type TokenConditionChange, type TokenConditions } from "@/rules/token-conditions";
import { pushUndoStep } from "./map-history";
import { readOptimistic, sendOptimistic, useOptimistic } from "./optimistic-values";

export type TokenRef = { kind: "hero" | "creature"; id: number };

const findConditionsKey = (token: TokenRef) => `conditions:${token.kind}:${token.id}`;

export const useShownConditions = (token: TokenRef, server: TokenConditions) => useOptimistic(findConditionsKey(token), server);

export const useIsSpotlit = (token: TokenRef, server: TokenConditions) => isSpotlit(useShownConditions(token, server));

const isSpotlightChange = (change: TokenConditionChange) => change.kind === "toggle" && change.condition === SPOTLIGHT_MARK;

function sendChange(sessionId: number, token: TokenRef, change: TokenConditionChange) {
  return token.kind === "hero" ? changeHeroConditionsAction(sessionId, token.id, change) : changeMapCreatureConditionsAction(sessionId, token.id, change);
}

function findUndoChange(before: TokenConditions, change: TokenConditionChange): TokenConditionChange {
  return change.kind === "exhaustion" ? { kind: "exhaustion", level: before.exhaustionLevel } : { ...change, isActive: before.conditions.includes(change.condition) };
}

export function useTokenConditionChanges(sessionId: number, sceneId: number | null) {
  const router = useModeRouter();
  const changeConditions = async (token: TokenRef, server: TokenConditions, change: TokenConditionChange) => {
    const key = findConditionsKey(token);
    const before = readOptimistic(key, server);
    const next = applyTokenConditionChange(before, change);
    if (sceneId !== null && !isSpotlightChange(change) && JSON.stringify(before) !== JSON.stringify(next)) {
      pushUndoStep(sceneId, { undo: () => changeConditions(token, server, findUndoChange(before, change)), redo: () => changeConditions(token, server, change) });
    }
    const result = await sendOptimistic(key, next, () => sendChange(sessionId, token, change));
    if (result.ok) captureGameEvent("game_condition_changed", { token: token.kind, kind: isSpotlightChange(change) ? "spotlight" : change.kind });
    router.refresh();
  };
  return changeConditions;
}

export type SpotlightControl = { isOn: boolean; onToggle: () => void };

const NO_TOKEN: TokenRef = { kind: "hero", id: 0 };

/// Без токена — null: підсвітку перемикає лише той, хто вибрав токен, тобто власник героя чи майстер.
export function useSpotlightControl(sessionId: number, sceneId: number | null, token: TokenRef | null, server: TokenConditions): SpotlightControl | null {
  const changeConditions = useTokenConditionChanges(sessionId, sceneId);
  const isOn = useIsSpotlit(token ?? NO_TOKEN, server);
  return token ? { isOn, onToggle: () => void changeConditions(token, server, { kind: "toggle", condition: SPOTLIGHT_MARK, isActive: !isOn }) } : null;
}
