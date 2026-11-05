import { randomBytes } from "node:crypto";
import { buildMediaImageUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import type { GameRollVisibility } from "@/rules/game-roll";
import type { TokenPosition } from "@/rules/game-map";
import { canEditPers } from "@/server/db/pers-actions";
import { deleteStoredImage, storeScreenshotImage } from "@/server/media/image-upload";

export const GAME_SESSION_LIMITS = { members: 12, activeOwnedSessions: 30, name: 80 } as const;
const ONLINE_WINDOW_MS = 60_000;
export const GAME_SESSION_SIGNAL_CHANNEL = "game_session";

export type GameSessionRole = "GM" | "PLAYER";
export type GameSessionFailure = "not_found" | "forbidden" | "archived" | "full" | "too_many" | "bad_name" | "bad_pers" | "bad_image" | "no_map";
export type GameSessionResult<T> = { ok: true; value: T } | { ok: false; error: GameSessionFailure };

export type GameSessionMemberView = {
  userId: number;
  name: string;
  role: GameSessionRole;
  persId: number | null;
  persName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  token: TokenPosition | null;
};

export type GameSessionView = {
  id: number;
  name: string;
  isArchived: boolean;
  myUserId: number;
  myRole: GameSessionRole;
  myPersId: number | null;
  inviteToken: string | null;
  mapImageUrl: string | null;
  members: GameSessionMemberView[];
};

export type GameSessionListItem = { id: number; name: string; isArchived: boolean; myRole: GameSessionRole; memberCount: number; updatedAt: string };

export type GameSessionSignal = "roll" | "members" | "session";

const fail = (error: GameSessionFailure) => ({ ok: false as const, error });
const succeed = <T,>(value: T) => ({ ok: true as const, value });

export function buildAvatarUrl(portraitKey: string | null | undefined, userImage: string | null | undefined): string | null {
  return portraitKey ? buildMediaImageUrl(portraitKey, "thumbnail") : userImage || null;
}

export function buildMemberName(user: { id: number; displayName: string | null; name: string | null }): string {
  return user.displayName?.trim() || user.name?.trim() || `Гравець #${user.id}`;
}

function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

function normalizeSessionName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.replace(/\s+/g, " ").trim();
  return trimmed && trimmed.length <= GAME_SESSION_LIMITS.name ? trimmed : null;
}

/// Сигнал «кидає» живе лише в NOTIFY: у базу не пишеться, а потік сам вирішує, кому його показати.
export async function signalGameRollStart(sessionId: number, userId: number, visibility: GameRollVisibility): Promise<void> {
  await prisma.$executeRaw`SELECT pg_notify(${GAME_SESSION_SIGNAL_CHANNEL}, ${JSON.stringify({ s: sessionId, k: "rolling", u: userId, v: visibility })})`;
}

export async function signalGameSession(sessionId: number, signal: GameSessionSignal): Promise<void> {
  await prisma.$executeRaw`SELECT pg_notify(${GAME_SESSION_SIGNAL_CHANNEL}, ${JSON.stringify({ s: sessionId, k: signal })})`;
}

export async function findMembership(sessionId: number, userId: number) {
  return prisma.gameSessionMember.findUnique({
    where: { gameSessionId_userId: { gameSessionId: sessionId, userId } },
    select: { role: true, persId: true, gameSession: { select: { archivedAt: true, name: true } } },
  });
}

export async function createGameSession(ownerUserId: number, rawName: unknown): Promise<GameSessionResult<{ id: number }>> {
  const name = normalizeSessionName(rawName);
  if (!name) return fail("bad_name");
  const activeOwned = await prisma.gameSession.count({ where: { ownerUserId, archivedAt: null } });
  if (activeOwned >= GAME_SESSION_LIMITS.activeOwnedSessions) return fail("too_many");
  const session = await prisma.gameSession.create({
    data: { ownerUserId, name, inviteToken: generateInviteToken(), members: { create: { userId: ownerUserId, role: "GM" } } },
    select: { id: true },
  });
  return succeed(session);
}

export async function listGameSessionsForUser(userId: number): Promise<GameSessionListItem[]> {
  const memberships = await prisma.gameSessionMember.findMany({
    where: { userId },
    select: { role: true, gameSession: { select: { id: true, name: true, archivedAt: true, updatedAt: true, _count: { select: { members: true } } } } },
    orderBy: { gameSession: { updatedAt: "desc" } },
  });
  return memberships.map(({ role, gameSession }) => ({
    id: gameSession.id,
    name: gameSession.name,
    isArchived: gameSession.archivedAt !== null,
    myRole: role as GameSessionRole,
    memberCount: gameSession._count.members,
    updatedAt: gameSession.updatedAt.toISOString(),
  }));
}

export async function findGameSessionView(sessionId: number, viewerUserId: number): Promise<GameSessionView | null> {
  const session = await findSessionWithMembers(sessionId);
  const me = session?.members.find((member) => member.userId === viewerUserId);
  if (!session || !me) return null;
  const now = Date.now();
  return {
    id: session.id,
    name: session.name,
    isArchived: session.archivedAt !== null,
    myUserId: viewerUserId,
    myRole: me.role as GameSessionRole,
    myPersId: me.persId,
    inviteToken: me.role === "GM" ? session.inviteToken : null,
    mapImageUrl: session.mapImageKey ? buildMediaImageUrl(session.mapImageKey, "full") : null,
    members: session.members.map((member) => ({
      userId: member.userId,
      name: buildMemberName(member.user),
      role: member.role as GameSessionRole,
      persId: member.persId,
      persName: member.pers?.name ?? null,
      avatarUrl: buildAvatarUrl(member.pers?.portraitKey, member.user.image),
      isOnline: member.lastSeenAt !== null && now - member.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
      token: member.persId !== null && member.tokenX !== null && member.tokenY !== null ? { x: member.tokenX, y: member.tokenY } : null,
    })),
  };
}

function findSessionWithMembers(sessionId: number) {
  return prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      name: true,
      archivedAt: true,
      inviteToken: true,
      mapImageKey: true,
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          userId: true,
          role: true,
          persId: true,
          lastSeenAt: true,
          tokenX: true,
          tokenY: true,
          pers: { select: { name: true, portraitKey: true } },
          user: { select: { id: true, displayName: true, name: true, image: true } },
        },
      },
    },
  });
}

async function findGmSession(sessionId: number, userId: number) {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return fail("not_found");
  if (membership.role !== "GM") return fail("forbidden");
  return succeed(membership);
}

async function findActiveGmSession(sessionId: number, userId: number) {
  const gm = await findGmSession(sessionId, userId);
  if (gm.ok && gm.value.gameSession.archivedAt) return fail("archived");
  return gm;
}

/// Нова мапа — нова сцена: старі позиції на ній нічого не означають, тож усі токени повертаються в ряд під мапою.
export async function setGameSessionMap(sessionId: number, userId: number, file: unknown): Promise<GameSessionResult<null>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const stored = file === null ? { key: null } : await storeMapImage(sessionId, file);
  if ("error" in stored) {
    console.warn("Мапу кімнати не збережено", sessionId, stored.error);
    return fail("bad_image");
  }
  // Сирий UPDATE атомарно повертає старий ключ: Prisma update віддає лише новий рядок.
  const [previous] = await prisma.$transaction([
    prisma.$queryRaw<{ previous_key: string | null }[]>`
      UPDATE game_session gs SET map_image_key = ${stored.key}, updated_at = now()
      FROM game_session previous
      WHERE gs.game_session_id = ${sessionId} AND previous.game_session_id = gs.game_session_id
      RETURNING previous.map_image_key AS previous_key`,
    prisma.gameSessionMember.updateMany({ where: { gameSessionId: sessionId }, data: { tokenX: null, tokenY: null } }),
  ]);
  await deleteStoredImage(previous[0]?.previous_key);
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

async function storeMapImage(sessionId: number, file: unknown) {
  try {
    return await storeScreenshotImage(file, `games/${sessionId}/map`);
  } catch (error) {
    return { error: String(error) };
  }
}

/// Свій токен рухає гравець, будь-який — майстер; position null повертає токен у ряд під мапою.
export async function moveGameToken(sessionId: number, userId: number, tokenUserId: number, position: TokenPosition | null): Promise<GameSessionResult<null>> {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return fail("not_found");
  if (membership.gameSession.archivedAt) return fail("archived");
  if (tokenUserId !== userId && membership.role !== "GM") return fail("forbidden");
  const moved = await prisma.gameSessionMember.updateMany({
    where: { gameSessionId: sessionId, userId: tokenUserId, persId: { not: null }, gameSession: { mapImageKey: { not: null } } },
    data: { tokenX: position?.x ?? null, tokenY: position?.y ?? null },
  });
  if (!moved.count) return fail("no_map");
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

export async function renameGameSession(sessionId: number, userId: number, rawName: unknown): Promise<GameSessionResult<null>> {
  const name = normalizeSessionName(rawName);
  if (!name) return fail("bad_name");
  const gm = await findGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  await prisma.gameSession.update({ where: { id: sessionId }, data: { name, updatedAt: new Date() } });
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

export async function setGameSessionArchived(sessionId: number, userId: number, isArchived: boolean): Promise<GameSessionResult<null>> {
  const gm = await findGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  if (!isArchived) {
    const activeOwned = await prisma.gameSession.count({ where: { ownerUserId: userId, archivedAt: null } });
    if (activeOwned >= GAME_SESSION_LIMITS.activeOwnedSessions) return fail("too_many");
  }
  await prisma.gameSession.update({ where: { id: sessionId }, data: { archivedAt: isArchived ? new Date() : null, updatedAt: new Date() } });
  await signalGameSession(sessionId, "session");
  return succeed(null);
}

export async function rotateInviteToken(sessionId: number, userId: number): Promise<GameSessionResult<{ inviteToken: string }>> {
  const gm = await findGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const inviteToken = generateInviteToken();
  await prisma.gameSession.update({ where: { id: sessionId }, data: { inviteToken } });
  await signalGameSession(sessionId, "session");
  return succeed({ inviteToken });
}

export async function findInvite(token: string, viewerUserId: number | null) {
  if (!isPlausibleToken(token)) return null;
  const session = await prisma.gameSession.findUnique({
    where: { inviteToken: token },
    select: { id: true, name: true, archivedAt: true, _count: { select: { members: true } } },
  });
  if (!session) return null;
  const isMember = viewerUserId !== null && (await findMembership(session.id, viewerUserId)) !== null;
  return { sessionId: session.id, name: session.name, isArchived: session.archivedAt !== null, isFull: session._count.members >= GAME_SESSION_LIMITS.members, isMember };
}

function isPlausibleToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token);
}

export async function joinGameSessionByToken(token: string, userId: number): Promise<GameSessionResult<{ sessionId: number }>> {
  if (!isPlausibleToken(token)) return fail("not_found");
  const joined = await prisma.$transaction(async (tx) => {
    const [session] = await tx.$queryRaw<{ game_session_id: number; archived_at: Date | null }[]>`
      SELECT game_session_id, archived_at FROM game_session WHERE invite_token = ${token} FOR UPDATE`;
    if (!session) return fail("not_found");
    const sessionId = session.game_session_id;
    const existing = await tx.gameSessionMember.findUnique({ where: { gameSessionId_userId: { gameSessionId: sessionId, userId } }, select: { id: true } });
    if (existing) return succeed({ sessionId, isNew: false });
    if (session.archived_at) return fail("archived");
    const memberCount = await tx.gameSessionMember.count({ where: { gameSessionId: sessionId } });
    if (memberCount >= GAME_SESSION_LIMITS.members) return fail("full");
    await tx.gameSessionMember.create({ data: { gameSessionId: sessionId, userId, role: "PLAYER" } });
    return succeed({ sessionId, isNew: true });
  });
  if (!joined.ok) return joined;
  if (joined.value.isNew) await signalGameSession(joined.value.sessionId, "members");
  return succeed({ sessionId: joined.value.sessionId });
}

export async function leaveGameSession(sessionId: number, userId: number): Promise<GameSessionResult<null>> {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return fail("not_found");
  if (membership.role === "GM") return fail("forbidden");
  await prisma.gameSessionMember.delete({ where: { gameSessionId_userId: { gameSessionId: sessionId, userId } } });
  await signalGameSession(sessionId, "members");
  return succeed(null);
}

export async function removeGameSessionMember(sessionId: number, gmUserId: number, memberUserId: number): Promise<GameSessionResult<null>> {
  const gm = await findGmSession(sessionId, gmUserId);
  if (!gm.ok) return gm;
  if (memberUserId === gmUserId) return fail("forbidden");
  const removed = await prisma.gameSessionMember.deleteMany({ where: { gameSessionId: sessionId, userId: memberUserId } });
  if (!removed.count) return fail("not_found");
  await signalGameSession(sessionId, "members");
  return succeed(null);
}

export async function bindMemberPers(sessionId: number, userId: number, persId: number | null): Promise<GameSessionResult<null>> {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return fail("not_found");
  if (persId !== null && !(await isBindablePers(persId, userId))) return fail("bad_pers");
  await prisma.gameSessionMember.update({ where: { gameSessionId_userId: { gameSessionId: sessionId, userId } }, data: { persId } });
  await signalGameSession(sessionId, "members");
  return succeed(null);
}

export async function isBindablePers(persId: number, userId: number): Promise<boolean> {
  const pers = await prisma.pers.findUnique({ where: { persId }, select: { isSnapshot: true } });
  if (!pers || pers.isSnapshot) return false;
  return canEditPers(persId, userId);
}

export type BindablePers = Awaited<ReturnType<typeof listBindablePers>>[number];

export async function listBindablePers(userId: number) {
  return prisma.pers.findMany({
    where: { isSnapshot: false, OR: [{ userId }, { additionalUsers: { some: { userId } } }] },
    select: { persId: true, name: true, level: true, portraitKey: true, ruleset: true, isPinned: true, race: { select: { name: true } }, class: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function touchMemberPresence(sessionId: number, userId: number): Promise<boolean> {
  const touched = await prisma.gameSessionMember.updateMany({ where: { gameSessionId: sessionId, userId }, data: { lastSeenAt: new Date() } });
  return touched.count > 0;
}
