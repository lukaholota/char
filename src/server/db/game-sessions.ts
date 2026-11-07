import { randomBytes } from "node:crypto";
import { getCreatureIndex } from "@/lib/bestiaryData";
import { buildMediaImageUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { buildCombatView, type CombatHeroView, type CombatView } from "@/rules/game-combat";
import type { GameRollVisibility } from "@/rules/game-roll";
import type { TokenPosition } from "@/rules/game-map";
import { parseAreaPlacement, type SceneAreaView } from "@/rules/game-areas";
import { parseSceneFog, type SceneFog } from "@/rules/game-fog";
import { parseSceneGrid, type SceneGrid } from "@/rules/game-grid";
import { buildSceneListItems, findViewedSceneId, type GameSceneListItem } from "@/rules/game-scenes";
import { buildMapCreatureViews, parseTokenNameMode, type MapCreatureView, type TokenNameMode } from "@/rules/game-map-creatures";
import { normalizeTokenConditions, type TokenConditions } from "@/rules/token-conditions";
import { canEditPers } from "@/server/db/pers-actions";

export const GAME_SESSION_LIMITS = { members: 12, activeOwnedSessions: 30, name: 80 } as const;
const ONLINE_WINDOW_MS = 60_000;
export const GAME_SESSION_SIGNAL_CHANNEL = "game_session";

export type GameSessionRole = "GM" | "PLAYER";
export type GameSessionFailure = "not_found" | "forbidden" | "archived" | "full" | "too_many" | "bad_name" | "bad_pers" | "bad_image" | "no_map" | "bad_creature" | "creature_limit" | "creature_gone" | "no_hit_points" | "combat_active" | "no_combat" | "no_combatants" | "combatant_gone" | "turn_moved" | "bad_scene" | "bad_scene_name" | "scene_limit" | "scene_in_combat" | "scene_active" | "scene_changed" | "bad_target" | "already_undone" | "bad_grid" | "bad_fog" | "fog_limit" | "bad_area" | "area_limit" | "area_gone";
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
  conditions: TokenConditions;
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
  viewedSceneId: number | null;
  activeSceneId: number | null;
  scenes: GameSceneListItem[];
  members: GameSessionMemberView[];
  creatures: MapCreatureView[];
  creatureNameMode: TokenNameMode;
  combat: CombatView | null;
  grid: SceneGrid | null;
  fog: SceneFog | null;
  areas: SceneAreaView[];
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
    select: { role: true, persId: true, openSceneId: true, gameSession: { select: { archivedAt: true, name: true, activeSceneId: true } } },
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
  const [session, heroTokens, sceneTools] = await Promise.all([findSessionWithMembers(sessionId, viewerUserId), findSceneHeroTokens(sessionId, viewerUserId), findVisibleSceneTools(sessionId, viewerUserId)]);
  const me = session?.members.find((member) => member.userId === viewerUserId);
  if (!session || !me) return null;
  const now = Date.now();
  const isGm = me.role === "GM";
  const viewedSceneId = findViewedSceneId({ isGm, activeSceneId: session.activeSceneId, openSceneId: me.openSceneId });
  const buildSceneCreatures = (sceneId: number | null) =>
    buildMapCreatureViews(session.mapCreatures.filter((creature) => creature.gameSceneId === sceneId), findCatalogCreature, isGm);
  const creatures = buildSceneCreatures(viewedSceneId);
  const combatCreatures = viewedSceneId === session.activeSceneId ? creatures : buildSceneCreatures(session.activeSceneId);
  const viewedMapKey = session.scenes.find((scene) => scene.id === viewedSceneId)?.mapImageKey ?? null;
  const viewedTools = sceneTools.find((scene) => scene.id === viewedSceneId);
  const tokenByUserId = new Map(heroTokens.filter((token) => token.sceneId === viewedSceneId).map((token) => [token.userId, { x: token.tokenX, y: token.tokenY }]));
  return {
    id: session.id,
    name: session.name,
    isArchived: session.archivedAt !== null,
    myUserId: viewerUserId,
    myRole: me.role as GameSessionRole,
    myPersId: me.persId,
    inviteToken: isGm ? session.inviteToken : null,
    mapImageUrl: viewedMapKey ? buildMediaImageUrl(viewedMapKey, "full") : null,
    viewedSceneId,
    activeSceneId: isGm ? session.activeSceneId : null,
    scenes: isGm ? buildSceneListItems(session.scenes, session.activeSceneId) : [],
    members: session.members.map((member) => ({
      userId: member.userId,
      name: buildMemberName(member.user),
      role: member.role as GameSessionRole,
      persId: member.persId,
      persName: member.pers?.name ?? null,
      avatarUrl: buildAvatarUrl(member.pers?.portraitKey, member.user.image),
      isOnline: member.lastSeenAt !== null && now - member.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
      token: member.persId !== null ? (tokenByUserId.get(member.userId) ?? null) : null,
      conditions: normalizeTokenConditions(member),
    })),
    creatures,
    creatureNameMode: parseTokenNameMode(session.creatureNameMode) ?? "short",
    combat: buildCombatView({
      state: { round: session.combatRound, turn: session.combatTurn, currentCombatantId: session.combatCurrentCombatantId },
      rows: session.combatants,
      heroesByPersId: buildCombatHeroes(session.members),
      creatures: combatCreatures,
    }),
    grid: viewedTools ? parseSceneGrid({ columns: viewedTools.gridColumns, offsetX: viewedTools.gridOffsetX, offsetY: viewedTools.gridOffsetY, isVisible: viewedTools.isGridVisible, opacity: viewedTools.gridOpacity }) : null,
    fog: viewedTools ? parseSceneFog(viewedTools.fog) : null,
    areas: viewedTools ? viewedTools.areas.flatMap(buildAreaView) : [],
  };
}

function buildCombatHeroes(members: NonNullable<Awaited<ReturnType<typeof findSessionWithMembers>>>["members"]): Map<number, CombatHeroView> {
  const heroes = new Map<number, CombatHeroView>();
  for (const member of members) {
    if (member.persId === null) continue;
    heroes.set(member.persId, { userId: member.userId, name: member.pers?.name ?? buildMemberName(member.user), avatarUrl: buildAvatarUrl(member.pers?.portraitKey, member.user.image) });
  }
  return heroes;
}

export function findCatalogCreature(key: string, ruleset: MapCreatureView["ruleset"]) {
  return getCreatureIndex(ruleset).find((entry) => entry.key === key) ?? null;
}

function findSessionWithMembers(sessionId: number, viewerUserId: number) {
  return prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      name: true,
      archivedAt: true,
      inviteToken: true,
      activeSceneId: true,
      creatureNameMode: true,
      combatRound: true,
      combatTurn: true,
      combatCurrentCombatantId: true,
      scenes: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, name: true, mapImageKey: true } },
      combatants: { select: { id: true, persId: true, gameMapCreatureId: true, initiative: true, initiativeBonus: true, sortTiebreak: true } },
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          userId: true,
          role: true,
          persId: true,
          lastSeenAt: true,
          openSceneId: true,
          conditions: true,
          exhaustionLevel: true,
          pers: { select: { name: true, portraitKey: true } },
          user: { select: { id: true, displayName: true, name: true, image: true } },
        },
      },
      mapCreatures: {
        where: { scene: sceneVisibleTo(sessionId, viewerUserId) },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, gameSceneId: true, creatureKey: true, ruleset: true, number: true, isAlly: true, customName: true, tokenSize: true, tokenX: true, tokenY: true, hpMax: true, hpCurrent: true, conditions: true, exhaustionLevel: true },
      },
    },
  });
}

function sceneVisibleTo(sessionId: number, viewerUserId: number) {
  return { OR: [{ activeIn: { some: { id: sessionId } } }, { openedBy: { some: { gameSessionId: sessionId, userId: viewerUserId } } }] };
}

function buildAreaView(row: { id: number; userId: number; shape: string; sizeFeet: number; originX: number; originY: number; angle: number; label: string | null }): SceneAreaView[] {
  const placement = parseAreaPlacement({ shape: row.shape, sizeFeet: row.sizeFeet, origin: { x: row.originX, y: row.originY }, angle: row.angle, label: row.label });
  return placement ? [{ ...placement, id: row.id, userId: row.userId }] : [];
}

function findVisibleSceneTools(sessionId: number, viewerUserId: number) {
  return prisma.gameScene.findMany({
    where: { sessionId, ...sceneVisibleTo(sessionId, viewerUserId) },
    select: {
      id: true,
      gridColumns: true,
      gridOffsetX: true,
      gridOffsetY: true,
      isGridVisible: true,
      gridOpacity: true,
      fog: true,
      areas: { orderBy: { id: "asc" }, select: { id: true, userId: true, shape: true, sizeFeet: true, originX: true, originY: true, angle: true, label: true } },
    },
  });
}

function findSceneHeroTokens(sessionId: number, viewerUserId: number) {
  return prisma.gameSceneToken.findMany({
    where: { scene: { sessionId, ...sceneVisibleTo(sessionId, viewerUserId) } },
    select: { sceneId: true, userId: true, tokenX: true, tokenY: true },
  });
}

async function findGmSession(sessionId: number, userId: number) {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return fail("not_found");
  if (membership.role !== "GM") return fail("forbidden");
  return succeed(membership);
}

export async function findActiveGmSession(sessionId: number, userId: number) {
  const gm = await findGmSession(sessionId, userId);
  if (gm.ok && gm.value.gameSession.archivedAt) return fail("archived");
  return gm;
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
