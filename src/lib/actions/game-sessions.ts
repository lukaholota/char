"use server";

import { captureServerPostHogEvent } from "@/lib/monitoring/posthog-server";
import { parseTokenPosition } from "@/rules/game-map";
import { parseHitPointChange } from "@/rules/creature-hit-points";
import { parseInitiative, parseTurnStep } from "@/rules/game-combat";
import { MAP_LIBRARY } from "@/lib/refs/map-library-catalog";
import { parseSceneMapSource } from "@/rules/game-scenes";
import { parseCreatureTokenSize, parseCustomName, parseNewMapCreatures, parseTokenNameMode } from "@/rules/game-map-creatures";
import { parseTokenConditionChange } from "@/rules/token-conditions";
import { isId, rejectBadInput, runAsUser, tooFast } from "@/server/game-sessions/game-action";
import { tryTakeTokenMoveSlot } from "@/server/game-sessions/game-session-limits";
import { activateGameScene, createGameScene, deleteGameScene, moveGameToken, openGameScene, renameGameScene, replaceGameSceneMap } from "@/server/db/game-scenes";
import { changeCreatureConditions, changeHeroConditions, clearBlessedMarks, markBlessedTargets } from "@/server/db/game-conditions";
import { parseRollTargets } from "@/rules/map-target-picks";
import { undoRollDamage } from "@/server/db/game-roll-events";
import { MAX_SAVE_TARGETS } from "@/rules/game-roll-saves";
import { addMissingCombatants, advanceCombatTurn, endCombat, endOwnCombatTurn, setCombatantInitiative, startCombat } from "@/server/db/game-combat";
import { addMapCreatures, changeMapCreatureHitPoints, moveMapCreature, removeMapCreatures, renameMapCreature, setCreatureNameMode, setMapCreatureCutout, setMapCreatureSize } from "@/server/db/game-map-creatures";
import {
  bindMemberPers,
  GAME_SESSION_LIMITS,
  createGameSession,
  joinGameSessionByToken,
  leaveGameSession,
  removeGameSessionMember,
  renameGameSession,
  rotateInviteToken,
  setGameSessionArchived,
} from "@/server/db/game-sessions";

export async function createGameSessionAction(name: string) {
  const result = await runAsUser((userId) => createGameSession(userId, name));
  if (result.ok) captureServerPostHogEvent("game_session_created", {});
  return result;
}

export async function renameGameSessionAction(sessionId: number, name: string) {
  return runAsUser(async (userId) => (isId(sessionId) ? renameGameSession(sessionId, userId, name) : rejectBadInput));
}

export async function setGameSessionArchivedAction(sessionId: number, isArchived: boolean) {
  return runAsUser(async (userId) => (isId(sessionId) ? setGameSessionArchived(sessionId, userId, isArchived === true) : rejectBadInput));
}

export async function rotateInviteTokenAction(sessionId: number) {
  return runAsUser(async (userId) => (isId(sessionId) ? rotateInviteToken(sessionId, userId) : rejectBadInput));
}

export async function joinGameSessionAction(token: string) {
  const result = await runAsUser(async (userId) => (typeof token === "string" ? joinGameSessionByToken(token, userId) : rejectBadInput));
  if (result.ok) captureServerPostHogEvent("game_session_joined", {});
  return result;
}

export async function leaveGameSessionAction(sessionId: number) {
  return runAsUser(async (userId) => (isId(sessionId) ? leaveGameSession(sessionId, userId) : rejectBadInput));
}

export async function removeGameSessionMemberAction(sessionId: number, memberUserId: number) {
  return runAsUser(async (userId) => (isId(sessionId) && isId(memberUserId) ? removeGameSessionMember(sessionId, userId, memberUserId) : rejectBadInput));
}

export async function bindGameSessionPersAction(sessionId: number, persId: number | null) {
  return runAsUser(async (userId) => (isId(sessionId) && (persId === null || isId(persId)) ? bindMemberPers(sessionId, userId, persId) : rejectBadInput));
}

export async function createGameSceneAction(sessionId: number, name: string, formData: FormData) {
  return runAsUser(async (userId) => (isId(sessionId) && formData instanceof FormData ? createGameScene(sessionId, userId, name, parseSceneMapSource(formData)) : rejectBadInput));
}

export async function renameGameSceneAction(sessionId: number, sceneId: number, name: string) {
  return runAsUser(async (userId) => (isId(sessionId) && isId(sceneId) ? renameGameScene(sessionId, userId, sceneId, name) : rejectBadInput));
}

export async function replaceGameSceneMapAction(sessionId: number, sceneId: number, formData: FormData) {
  return runAsUser(async (userId) =>
    isId(sessionId) && isId(sceneId) && formData instanceof FormData ? replaceGameSceneMap(sessionId, userId, sceneId, parseSceneMapSource(formData)) : rejectBadInput,
  );
}

export async function listMapLibraryAction() {
  return runAsUser(async () => ({ ok: true as const, value: MAP_LIBRARY }));
}

export async function openGameSceneAction(sessionId: number, sceneId: number) {
  return runAsUser(async (userId) => (isId(sessionId) && isId(sceneId) ? openGameScene(sessionId, userId, sceneId) : rejectBadInput));
}

export async function activateGameSceneAction(sessionId: number, sceneId: number) {
  return runAsUser(async (userId) => (isId(sessionId) && isId(sceneId) ? activateGameScene(sessionId, userId, sceneId) : rejectBadInput));
}

export async function deleteGameSceneAction(sessionId: number, sceneId: number) {
  return runAsUser(async (userId) => (isId(sessionId) && isId(sceneId) ? deleteGameScene(sessionId, userId, sceneId) : rejectBadInput));
}

export async function moveGameTokenAction(sessionId: number, sceneId: number, tokenUserId: number, rawPosition: unknown) {
  const position = rawPosition === null ? null : parseTokenPosition(rawPosition);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !isId(tokenUserId) || (rawPosition !== null && !position)) return rejectBadInput;
    if (!tryTakeTokenMoveSlot(userId)) return { ok: false as const, error: "too_fast" as const };
    return moveGameToken(sessionId, userId, sceneId, tokenUserId, position);
  });
}

export async function addMapCreaturesAction(sessionId: number, rawInput: unknown) {
  const input = parseNewMapCreatures(rawInput);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !input) return rejectBadInput;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return addMapCreatures(sessionId, userId, input);
  });
}

export async function moveMapCreatureAction(sessionId: number, creatureId: number, rawPosition: unknown) {
  const position = parseTokenPosition(rawPosition);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(creatureId) || !position) return rejectBadInput;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return moveMapCreature(sessionId, userId, creatureId, position);
  });
}

export async function removeMapCreaturesAction(sessionId: number, creatureId: number | null) {
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || (creatureId !== null && !isId(creatureId))) return rejectBadInput;
    return removeMapCreatures(sessionId, userId, creatureId);
  });
}

export async function setMapCreatureSizeAction(sessionId: number, creatureId: number, rawSize: unknown) {
  const size = parseCreatureTokenSize(rawSize);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(creatureId) || !size) return rejectBadInput;
    return setMapCreatureSize(sessionId, userId, creatureId, size);
  });
}

export async function setMapCreatureCutoutAction(sessionId: number, creatureId: number, isCutout: unknown) {
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(creatureId) || typeof isCutout !== "boolean") return rejectBadInput;
    return setMapCreatureCutout(sessionId, userId, creatureId, isCutout);
  });
}

export async function renameMapCreatureAction(sessionId: number, creatureId: number, rawName: unknown) {
  const customName = parseCustomName(rawName);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(creatureId) || customName === undefined) return rejectBadInput;
    return renameMapCreature(sessionId, userId, creatureId, customName);
  });
}

export async function changeMapCreatureHitPointsAction(sessionId: number, creatureId: number, rawChange: unknown) {
  const change = parseHitPointChange(rawChange);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(creatureId) || !change) return rejectBadInput;
    return changeMapCreatureHitPoints(sessionId, userId, creatureId, change);
  });
}

export async function setCreatureNameModeAction(sessionId: number, rawMode: unknown) {
  const mode = parseTokenNameMode(rawMode);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !mode) return rejectBadInput;
    return setCreatureNameMode(sessionId, userId, mode);
  });
}

export async function startCombatAction(sessionId: number) {
  return runAsUser(async (userId) => (isId(sessionId) ? startCombat(sessionId, userId) : rejectBadInput));
}

export async function endCombatAction(sessionId: number) {
  return runAsUser(async (userId) => (isId(sessionId) ? endCombat(sessionId, userId) : rejectBadInput));
}

export async function advanceCombatTurnAction(sessionId: number, rawStep: unknown) {
  const step = parseTurnStep(rawStep);
  return runAsUser(async (userId) => (isId(sessionId) && step ? advanceCombatTurn(sessionId, userId, step) : rejectBadInput));
}

export async function endOwnCombatTurnAction(sessionId: number, combatantId: number) {
  return runAsUser(async (userId) => (isId(sessionId) && isId(combatantId) ? endOwnCombatTurn(sessionId, userId, combatantId) : rejectBadInput));
}

export async function setCombatantInitiativeAction(sessionId: number, combatantId: number, rawInitiative: unknown) {
  const initiative = parseInitiative(rawInitiative);
  return runAsUser(async (userId) => (isId(sessionId) && isId(combatantId) && initiative !== null ? setCombatantInitiative(sessionId, userId, combatantId, initiative) : rejectBadInput));
}

export async function addCombatantsAction(sessionId: number) {
  return runAsUser(async (userId) => (isId(sessionId) ? addMissingCombatants(sessionId, userId) : rejectBadInput));
}

export async function changeMapCreatureConditionsAction(sessionId: number, creatureId: number, rawChange: unknown) {
  const change = parseTokenConditionChange(rawChange);
  return runAsUser(async (userId) => (isId(sessionId) && isId(creatureId) && change ? changeCreatureConditions(sessionId, userId, creatureId, change) : rejectBadInput));
}

export async function changeHeroConditionsAction(sessionId: number, heroUserId: number, rawChange: unknown) {
  const change = parseTokenConditionChange(rawChange);
  return runAsUser(async (userId) => (isId(sessionId) && isId(heroUserId) && change ? changeHeroConditions(sessionId, userId, heroUserId, change) : rejectBadInput));
}

export async function blessRoomTargetsAction(sessionId: number, rawTargets: unknown) {
  const targets = parseRollTargets(rawTargets, GAME_SESSION_LIMITS.members + MAX_SAVE_TARGETS);
  return runAsUser(async (userId) => (isId(sessionId) && targets ? markBlessedTargets(sessionId, userId, targets) : rejectBadInput));
}

export async function endRoomBlessingAction(sessionId: number) {
  return runAsUser(async (userId) => (isId(sessionId) ? clearBlessedMarks(sessionId, userId) : rejectBadInput));
}

export async function undoRollDamageAction(sessionId: number, eventSeq: number) {
  return runAsUser(async (userId) => (isId(sessionId) && isId(eventSeq) ? undoRollDamage(sessionId, userId, eventSeq) : rejectBadInput));
}

export async function undoSaveDamageAction(sessionId: number, eventSeq: number, rowIndex: number) {
  const isRowIndex = Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < MAX_SAVE_TARGETS;
  return runAsUser(async (userId) => (isId(sessionId) && isId(eventSeq) && isRowIndex ? undoRollDamage(sessionId, userId, eventSeq, rowIndex) : rejectBadInput));
}
