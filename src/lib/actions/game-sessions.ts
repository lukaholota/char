"use server";

import { captureServerPostHogEvent } from "@/lib/monitoring/posthog-server";
import { findCurrentUserId } from "@/server/db/current-user";
import {
  bindMemberPers,
  createGameSession,
  joinGameSessionByToken,
  leaveGameSession,
  removeGameSessionMember,
  renameGameSession,
  rotateInviteToken,
  setGameSessionArchived,
  type GameSessionFailure,
  type GameSessionResult,
} from "@/server/db/game-sessions";

type ActionResult<T = null> = { ok: true; value: T } | { ok: false; error: string };

const FAILURE_MESSAGES: Record<GameSessionFailure | "signed_out", string> = {
  signed_out: "Увійдіть, щоб грати в кімнатах",
  not_found: "Кімнату не знайдено або посилання вже не діє",
  forbidden: "Це може зробити лише майстер",
  archived: "Кімнату заархівовано",
  full: "У кімнаті вже максимум гравців",
  too_many: "Забагато активних кімнат — заархівуйте стару",
  bad_name: "Назва має містити від 1 до 80 символів",
  bad_pers: "Цього персонажа не можна привʼязати",
};

function toActionResult<T>(result: GameSessionResult<T>): ActionResult<T> {
  return result.ok ? result : { ok: false, error: FAILURE_MESSAGES[result.error] };
}

async function runAsUser<T>(action: (userId: number) => Promise<GameSessionResult<T>>): Promise<ActionResult<T>> {
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
