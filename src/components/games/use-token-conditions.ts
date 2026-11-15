"use client";

import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { changeHeroConditionsAction, changeMapCreatureConditionsAction } from "@/lib/actions/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { NO_TOKEN_CONDITIONS, SPOTLIGHT_MARKS, applyTokenConditionChange, findSpotlightStyle, isSpotlightMark, type SpotlightStyle, type TokenConditionChange, type TokenConditions } from "@/rules/token-conditions";
import { pushUndoStep } from "./map-history";
import { readOptimistic, sendOptimistic, useOptimistic, useOptimisticReader } from "./optimistic-values";

export type TokenRef = { kind: "hero" | "creature"; id: number };

const findConditionsKey = (token: TokenRef) => `conditions:${token.kind}:${token.id}`;

export const useShownConditions = (token: TokenRef, server: TokenConditions) => useOptimistic(findConditionsKey(token), server);

export const useSpotlightStyle = (token: TokenRef, server: TokenConditions) => findSpotlightStyle(useShownConditions(token, server));

const isSpotlightChange = (change: TokenConditionChange) => change.kind === "toggle" && isSpotlightMark(change.condition);

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

export type SpotlightControl = { isOn: boolean; style: SpotlightStyle | null; onToggle: () => void; onChoose: (style: SpotlightStyle | null) => void };

const NO_TOKEN: TokenRef = { kind: "hero", id: 0 };

/// Без токена — null: підсвітку перемикає лише той, хто вибрав токен, тобто власник героя чи майстер.
export function useSpotlightControl(sessionId: number, sceneId: number | null, token: TokenRef | null, server: TokenConditions): SpotlightControl | null {
  const changeConditions = useTokenConditionChanges(sessionId, sceneId);
  const style = useSpotlightStyle(token ?? NO_TOKEN, server);
  if (!token) return null;
  const choose = (next: SpotlightStyle | null) => void changeConditions(token, server, { kind: "toggle", condition: SPOTLIGHT_MARKS[next ?? style ?? "glow"], isActive: next !== null });
  return { isOn: style !== null, style, onToggle: () => choose(style ? null : "glow"), onChoose: choose };
}

export type PortraitSpotlightInput = { sessionId: number; sceneId: number | null; token: TokenRef; conditions: TokenConditions; canToggle: boolean };

/// Портрет світиться разом зі своїм токеном: це та сама позначка, тож увімкнути її можна з будь-якого з них.
export function usePortraitSpotlight(input: PortraitSpotlightInput | null): { style: SpotlightStyle | null; control: SpotlightControl | null } {
  const conditions = input?.conditions ?? NO_TOKEN_CONDITIONS;
  const style = useSpotlightStyle(input?.token ?? NO_TOKEN, conditions);
  const control = useSpotlightControl(input?.sessionId ?? 0, input?.sceneId ?? null, input?.canToggle ? input.token : null, conditions);
  return { style: input === null ? null : style, control };
}

export type ConditionedToken = { token: TokenRef; conditions: TokenConditions };

/// Спільний вигляд групи — лише коли він у всіх однаковий; вибір накладає його кожному, повторний — гасить у всіх.
export function useGroupSpotlight(sessionId: number, sceneId: number | null, members: ConditionedToken[]): SpotlightControl {
  const read = useOptimisticReader();
  const changeConditions = useTokenConditionChanges(sessionId, sceneId);
  const styles = members.map((member) => findSpotlightStyle(read(findConditionsKey(member.token), member.conditions)));
  const style = styles.every((current) => current === styles[0]) ? (styles[0] ?? null) : null;
  const choose = (next: SpotlightStyle | null) =>
    members.forEach((member, index) => {
      const current = styles[index];
      if (next === current) return;
      void changeConditions(member.token, member.conditions, { kind: "toggle", condition: SPOTLIGHT_MARKS[next ?? current ?? "glow"], isActive: next !== null });
    });
  return { isOn: styles.some(Boolean), style, onToggle: () => choose(style ? null : "glow"), onChoose: choose };
}
