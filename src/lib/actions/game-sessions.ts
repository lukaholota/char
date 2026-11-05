"use server";

import { captureServerPostHogEvent } from "@/lib/monitoring/posthog-server";
import { parseTokenPosition } from "@/rules/game-map";
import { findCurrentUserId } from "@/server/db/current-user";
import { tryTakeTokenMoveSlot } from "@/server/game-sessions/game-session-limits";
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
