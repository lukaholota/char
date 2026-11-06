"use server";

import { captureServerPostHogEvent } from "@/lib/monitoring/posthog-server";
import { parseTokenPosition } from "@/rules/game-map";
import { MAP_CREATURE_LIMITS, parseCreatureTokenSize, parseNewMapCreatures, parseTokenNameMode } from "@/rules/game-map-creatures";
import { findCurrentUserId } from "@/server/db/current-user";
import { tryTakeTokenMoveSlot } from "@/server/game-sessions/game-session-limits";
import { addMapCreatures, moveMapCreature, removeMapCreatures, setCreatureNameMode, setMapCreatureSize } from "@/server/db/game-map-creatures";
import {
  bindMemberPers,
  createGameSession,
  joinGameSessionByToken,
  leaveGameSession,
  moveGameToken,
  removeGameSessionMember,
  renameGameSession,
  rotateInviteToken,
  setGameSessionArchived,
  setGameSessionMap,
  type GameSessionFailure,
  type GameSessionResult,
} from "@/server/db/game-sessions";

type ActionResult<T = null> = { ok: true; value: T } | { ok: false; error: string };

const FAILURE_MESSAGES: Record<GameSessionFailure | "signed_out" | "too_fast", string> = {
  signed_out: "Увійдіть, щоб грати в кімнатах",
  too_fast: "Забагато рухів — зачекайте кілька секунд",
  not_found: "Кімнату не знайдено або посилання вже не діє",
  forbidden: "Це може зробити лише майстер",
  archived: "Кімнату заархівовано",
  full: "У кімнаті вже максимум гравців",
  too_many: "Забагато активних кімнат — заархівуйте стару",
  bad_name: "Назва має містити від 1 до 80 символів",
  bad_pers: "Цього персонажа не можна привʼязати",
  bad_image: "Не вдалося завантажити мапу — спробуйте іншу картинку",
  no_map: "Мапи вже немає або токен без персонажа",
  bad_creature: "Цієї істоти немає в бестіарії",
  creature_limit: `На мапі вже ${MAP_CREATURE_LIMITS.perSession} істот — приберіть зайвих`,
  creature_gone: "Цієї істоти вже немає на мапі",
};

type UserActionResult<T> = GameSessionResult<T> | { ok: false; error: "too_fast" };

function toActionResult<T>(result: UserActionResult<T>): ActionResult<T> {
  return result.ok ? result : { ok: false, error: FAILURE_MESSAGES[result.error] };
}

async function runAsUser<T>(action: (userId: number) => Promise<UserActionResult<T>>): Promise<ActionResult<T>> {
  const userId = await findCurrentUserId();
  if (userId === null) return { ok: false, error: FAILURE_MESSAGES.signed_out };
  return toActionResult(await action(userId));
}

const isId = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0;
const rejectBadInput = { ok: false as const, error: "not_found" as const };

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

export async function setGameMapAction(sessionId: number, formData: FormData) {
  return runAsUser(async (userId) => (isId(sessionId) && formData instanceof FormData ? setGameSessionMap(sessionId, userId, formData.get("file")) : rejectBadInput));
}

export async function clearGameMapAction(sessionId: number) {
  return runAsUser(async (userId) => (isId(sessionId) ? setGameSessionMap(sessionId, userId, null) : rejectBadInput));
}

export async function moveGameTokenAction(sessionId: number, tokenUserId: number, rawPosition: unknown) {
  const position = rawPosition === null ? null : parseTokenPosition(rawPosition);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(tokenUserId) || (rawPosition !== null && !position)) return rejectBadInput;
    if (!tryTakeTokenMoveSlot(userId)) return { ok: false as const, error: "too_fast" as const };
    return moveGameToken(sessionId, userId, tokenUserId, position);
  });
}

const tooFast = { ok: false as const, error: "too_fast" as const };

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

export async function setCreatureNameModeAction(sessionId: number, rawMode: unknown) {
  const mode = parseTokenNameMode(rawMode);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !mode) return rejectBadInput;
    return setCreatureNameMode(sessionId, userId, mode);
  });
}
