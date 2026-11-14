import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { buildMediaImageUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { buildCombatView, type CombatHeroView, type CombatView } from "@/rules/game-combat";
import type { GameRollVisibility } from "@/rules/game-roll";
import type { TokenPosition } from "@/rules/game-map";
import { DEFAULT_TOKEN_TRANSFORM, readTokenTransform, type TokenTransform } from "@/rules/token-transform";
import { parseAreaPlacement, type SceneAreaView } from "@/rules/game-areas";
import { buildDrawingView, type SceneDrawingView } from "@/rules/game-drawings";
import { parseSceneFog, type SceneFog } from "@/rules/game-fog";
import { parseSceneGrid, type SceneGrid } from "@/rules/game-grid";
import { buildSceneObjectViews, type SceneObjectView } from "@/rules/game-objects";
import { buildSceneWallViews, type SceneWallView } from "@/rules/game-walls";
import { buildSceneLightViews, parseSceneLighting, type SceneLighting, type SceneLightView, type TokenLight } from "@/rules/game-lighting";
import { findDarkvisionRange } from "@/rules/senses-and-resistances";
import { buildSceneListItems, findViewedSceneId, type GameSceneListItem } from "@/rules/game-scenes";
import { buildMapCreatureViews, parseTokenNameMode, type MapCreatureView, type TokenNameMode } from "@/rules/game-map-creatures";
import { normalizeTokenConditions, type TokenConditions } from "@/rules/token-conditions";
import { findHeroLifeState, type HeroLifeState } from "@/rules/hero-life-state";
import { canEditPers } from "@/server/db/pers-actions";
import { loadRoomCreatures } from "@/server/db/room-creatures";

export const GAME_SESSION_LIMITS = { members: 12, heroesPerMember: 6, activeOwnedSessions: 30, name: 80 } as const;
const ONLINE_WINDOW_MS = 60_000;
export const GAME_SESSION_SIGNAL_CHANNEL = "game_session";

export type GameSessionRole = "GM" | "PLAYER";
export type GameSessionFailure = "not_found" | "forbidden" | "archived" | "full" | "too_many" | "bad_name" | "bad_pers" | "bad_image" | "no_map" | "bad_creature" | "creature_limit" | "creature_gone" | "no_hit_points" | "combat_active" | "no_combat" | "no_combatants" | "combatant_gone" | "turn_moved" | "bad_scene" | "bad_scene_name" | "scene_limit" | "scene_in_combat" | "scene_active" | "scene_changed" | "bad_target" | "already_undone" | "bad_grid" | "bad_fog" | "fog_limit" | "bad_area" | "area_limit" | "area_gone" | "bad_drawing" | "drawing_limit" | "token_image_gone" | "hero_limit" | "bad_object" | "object_limit" | "object_gone" | "bad_wall" | "wall_limit" | "wall_gone" | "bad_light" | "light_limit" | "light_gone";
export type GameSessionResult<T> = { ok: true; value: T } | { ok: false; error: GameSessionFailure };

export type GameSessionMemberView = {
  heroId: number;
  heroSlot: number;
  userId: number;
  name: string;
  role: GameSessionRole;
  persId: number | null;
  persName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  token: TokenPosition | null;
  tokenTransform: TokenTransform;
  isCutout: boolean;
  conditions: TokenConditions;
  lifeState: HeroLifeState;
  light: TokenLight;
  darkvisionFeet: number;
};

export type GameSessionView = {
  id: number;
  name: string;
  isArchived: boolean;
  myUserId: number;
  myRole: GameSessionRole;
  myPersId: number | null;
  myPersIds: number[];
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
  drawings: SceneDrawingView[];
  objects: SceneObjectView[];
  /// Стіни й двері бачить лише майстер; гравцям — зачинені лінії, що закривають огляд.
  walls: SceneWallView[];
  sightLines: TokenPosition[][];
  lighting: SceneLighting;
  /// Гравцям — лише увімкнені джерела.
  lights: SceneLightView[];
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

/// Пінг на мапі теж живе лише в NOTIFY: потік показує його тим, хто дивиться ту саму сцену.
export async function signalMapPing(sessionId: number, userId: number, sceneId: number, at: TokenPosition): Promise<void> {
  await prisma.$executeRaw`SELECT pg_notify(${GAME_SESSION_SIGNAL_CHANNEL}, ${JSON.stringify({ s: sessionId, k: "ping", u: userId, c: sceneId, x: at.x, y: at.y })})`;
}

export async function signalGameSession(sessionId: number, signal: GameSessionSignal): Promise<void> {
  await prisma.$executeRaw`SELECT pg_notify(${GAME_SESSION_SIGNAL_CHANNEL}, ${JSON.stringify({ s: sessionId, k: signal })})`;
}

/// Лист героя живе поза кімнатою: його хіти й кидки смерті будять кожну кімнату, де героя обрано.
export async function signalPersRooms(persId: number): Promise<void> {
  const rooms = await prisma.gameSessionMember.findMany({ where: { persId, gameSession: { archivedAt: null } }, select: { gameSessionId: true } });
  await Promise.all(rooms.map((room) => signalGameSession(room.gameSessionId, "members")));
}

export async function findMembership(sessionId: number, userId: number) {
  return prisma.gameSessionMember.findUnique({
    where: { gameSessionId_userId_heroSlot: { gameSessionId: sessionId, userId, heroSlot: 0 } },
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
    where: { userId, heroSlot: 0 },
    select: { role: true, gameSession: { select: { id: true, name: true, archivedAt: true, updatedAt: true, _count: { select: { members: { where: { heroSlot: 0 } } } } } } },
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
  const me = session?.members.find((member) => member.userId === viewerUserId && member.heroSlot === 0);
  if (!session || !me) return null;
  const myPersIds = session.members.flatMap((member) => (member.userId === viewerUserId && member.persId !== null ? [member.persId] : []));
  const findCreature = await loadRoomCreatures(session.mapCreatures);
  const now = Date.now();
  const isGm = me.role === "GM";
  const viewedSceneId = findViewedSceneId({ isGm, activeSceneId: session.activeSceneId, openSceneId: me.openSceneId });
  const buildSceneCreatures = (sceneId: number | null) =>
    buildMapCreatureViews(session.mapCreatures.filter((creature) => creature.gameSceneId === sceneId), findCreature, isGm);
  const creatures = buildSceneCreatures(viewedSceneId);
  const combatCreatures = viewedSceneId === session.activeSceneId ? creatures : buildSceneCreatures(session.activeSceneId);
  const viewedMapKey = session.scenes.find((scene) => scene.id === viewedSceneId)?.mapImageKey ?? null;
  const viewedTools = sceneTools.find((scene) => scene.id === viewedSceneId);
  const tokenByHeroId = new Map(heroTokens.filter((token) => token.sceneId === viewedSceneId).map((token) => [token.memberId, token]));
  return {
    id: session.id,
    name: session.name,
    isArchived: session.archivedAt !== null,
    myUserId: viewerUserId,
    myRole: me.role as GameSessionRole,
    myPersId: myPersIds[0] ?? null,
    myPersIds,
    inviteToken: isGm ? session.inviteToken : null,
    mapImageUrl: viewedMapKey ? buildMediaImageUrl(viewedMapKey, "full") : null,
    viewedSceneId,
    activeSceneId: isGm ? session.activeSceneId : null,
    scenes: isGm ? buildSceneListItems(session.scenes, session.activeSceneId) : [],
    members: session.members.map((member) => ({
      heroId: member.id,
      heroSlot: member.heroSlot,
      userId: member.userId,
      name: buildMemberName(member.user),
      role: member.role as GameSessionRole,
      persId: member.persId,
      persName: member.pers?.name ?? null,
      avatarUrl: buildAvatarUrl(member.pers?.portraitKey, member.user.image),
      isOnline: member.lastSeenAt !== null && now - member.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
      token: member.persId !== null ? findHeroTokenPosition(tokenByHeroId.get(member.id)) : null,
      tokenTransform: member.persId !== null ? findHeroTokenTransform(tokenByHeroId.get(member.id)) : DEFAULT_TOKEN_TRANSFORM,
      isCutout: member.isCutout,
      conditions: normalizeTokenConditions(member),
      lifeState: findHeroLifeState(member.pers),
      ...findHeroSight(tokenByHeroId.get(member.id), member.pers),
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
    drawings: viewedTools ? viewedTools.drawings.flatMap(buildDrawingView) : [],
    objects: viewedTools ? buildSceneObjectViews(viewedTools.objects, isGm) : [],
    ...(viewedTools ? buildSceneWallViews(viewedTools.walls, isGm) : { walls: [], sightLines: [] }),
    lighting: (viewedTools && parseSceneLighting(viewedTools.lighting)) || "off",
    lights: viewedTools ? buildSceneLightViews(viewedTools.lights, isGm) : [],
  };
}

function buildCombatHeroes(members: NonNullable<Awaited<ReturnType<typeof findSessionWithMembers>>>["members"]): Map<number, CombatHeroView> {
  const heroes = new Map<number, CombatHeroView>();
  for (const member of members) {
    if (member.persId === null) continue;
    heroes.set(member.persId, { persId: member.persId, userId: member.userId, name: member.pers?.name ?? buildMemberName(member.user), avatarUrl: buildAvatarUrl(member.pers?.portraitKey, member.user.image) });
  }
  return heroes;
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
        orderBy: [{ joinedAt: "asc" }, { userId: "asc" }, { heroSlot: "asc" }],
        select: {
          id: true,
          heroSlot: true,
          isCutout: true,
          userId: true,
          role: true,
          persId: true,
          lastSeenAt: true,
          openSceneId: true,
          conditions: true,
          exhaustionLevel: true,
          pers: { select: { name: true, portraitKey: true, currentHp: true, deathSaveSuccesses: true, deathSaveFailures: true, isDead: true, ...DARKVISION_SELECT } },
          user: { select: { id: true, displayName: true, name: true, image: true } },
        },
      },
      mapCreatures: {
        where: { scene: sceneVisibleTo(sessionId, viewerUserId) },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, gameSceneId: true, creatureKey: true, ruleset: true, number: true, isAlly: true, customName: true, tokenSize: true, isCutout: true, customImageKey: true, tokenX: true, tokenY: true, tokenRotation: true, tokenScalePercent: true, hpMax: true, hpCurrent: true, conditions: true, exhaustionLevel: true, lightBrightFeet: true, lightDimFeet: true },
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
      drawings: { orderBy: { id: "asc" }, select: { id: true, userId: true, color: true, width: true, points: true } },
      objects: { select: { id: true, imageKey: true, name: true, x: true, y: true, widthCells: true, rotation: true, isHidden: true, sortOrder: true } },
      walls: { orderBy: { id: "asc" }, select: { id: true, kind: true, isOpen: true, points: true } },
      lighting: true,
      lights: { orderBy: { id: "asc" }, select: { id: true, x: true, y: true, brightFeet: true, dimFeet: true, isOn: true } },
    },
  });
}

function findSceneHeroTokens(sessionId: number, viewerUserId: number) {
  return prisma.gameSceneHeroToken.findMany({
    where: { scene: { sessionId, ...sceneVisibleTo(sessionId, viewerUserId) } },
    select: { sceneId: true, memberId: true, tokenX: true, tokenY: true, tokenRotation: true, tokenScalePercent: true, lightBrightFeet: true, lightDimFeet: true, darkvisionFeet: true },
  });
}

type SceneHeroToken = Awaited<ReturnType<typeof findSceneHeroTokens>>[number];

const SPECIES_FEATURE_SELECT = { select: { feature: { select: { darkvisionRange: true } } } };
/// shortcut: темний зір беремо лише з рис виду й власних фіч героя — у сіді він більше ніде не задається; якщо зʼявиться в класах, рахувати через calculateDarkvisionRange.
const DARKVISION_SELECT = {
  race: { select: { traits: SPECIES_FEATURE_SELECT } },
  subrace: { select: { traits: SPECIES_FEATURE_SELECT } },
  raceVariants: { select: { traits: SPECIES_FEATURE_SELECT } },
  raceChoiceOptions: { select: { traits: SPECIES_FEATURE_SELECT } },
  features: SPECIES_FEATURE_SELECT,
} as const;

type FeatureLinks = { traits: Array<{ feature: { darkvisionRange: number | null } }> };
type DarkvisionPers = { race: FeatureLinks; subrace: FeatureLinks | null; raceVariants: FeatureLinks[]; raceChoiceOptions: FeatureLinks[]; features: Array<{ feature: { darkvisionRange: number | null } }> };

/// Поправка майстра на токені переважає зір з листа.
function findHeroSight(token: SceneHeroToken | undefined, pers: DarkvisionPers | null): { light: TokenLight; darkvisionFeet: number } {
  const links = pers ? [pers.race, ...(pers.subrace ? [pers.subrace] : []), ...pers.raceVariants, ...pers.raceChoiceOptions].flatMap((owner) => owner.traits) : [];
  const fromSheet = pers ? findDarkvisionRange([...links, ...pers.features].map((link) => link.feature)) : null;
  return { light: { brightFeet: token?.lightBrightFeet ?? 0, dimFeet: token?.lightDimFeet ?? 0 }, darkvisionFeet: token?.darkvisionFeet ?? fromSheet ?? 0 };
}

function findHeroTokenPosition(token: SceneHeroToken | undefined): TokenPosition | null {
  return token ? { x: token.tokenX, y: token.tokenY } : null;
}

function findHeroTokenTransform(token: SceneHeroToken | undefined): TokenTransform {
  return token ? readTokenTransform(token) : DEFAULT_TOKEN_TRANSFORM;
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
    select: { id: true, name: true, archivedAt: true, _count: { select: { members: { where: { heroSlot: 0 } } } } },
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
    const existing = await tx.gameSessionMember.findUnique({ where: { gameSessionId_userId_heroSlot: { gameSessionId: sessionId, userId, heroSlot: 0 } }, select: { id: true } });
    if (existing) return succeed({ sessionId, isNew: false });
    if (session.archived_at) return fail("archived");
    const memberCount = await tx.gameSessionMember.count({ where: { gameSessionId: sessionId, heroSlot: 0 } });
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
  await prisma.gameSessionMember.deleteMany({ where: { gameSessionId: sessionId, userId } });
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
  await prisma.$transaction([
    ...(persId === null ? [prisma.gameSessionMember.deleteMany({ where: { gameSessionId: sessionId, userId, heroSlot: { gt: 0 } } })] : []),
    prisma.gameSessionMember.update({ where: { gameSessionId_userId_heroSlot: { gameSessionId: sessionId, userId, heroSlot: 0 } }, data: { persId } }),
  ]);
  await signalGameSession(sessionId, "members");
  return succeed(null);
}

type HeroRow = { id: number; userId: number; heroSlot: number; persId: number | null };

/// Обраний герой знімається, новий займає вільний слот; той самий лист двічі в одній кімнаті бути не може.
export async function toggleRoomHero(sessionId: number, userId: number, persId: number): Promise<GameSessionResult<null>> {
  const [membership, isBindable] = await Promise.all([findMembership(sessionId, userId), isBindablePers(persId, userId)]);
  if (!membership) return fail("not_found");
  if (membership.gameSession.archivedAt) return fail("archived");
  const toggled = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
    const rows = await tx.gameSessionMember.findMany({ where: { gameSessionId: sessionId, OR: [{ userId }, { persId }] }, select: { id: true, userId: true, heroSlot: true, persId: true } });
    const mine = rows.filter((row) => row.userId === userId);
    const chosen = mine.find((row) => row.persId === persId);
    if (chosen) return removeRoomHero(tx, chosen);
    if (!isBindable || rows.some((row) => row.persId === persId)) return fail("bad_pers");
    return addRoomHero(tx, mine, persId, membership.role);
  });
  if (toggled.ok) await signalGameSession(sessionId, "members");
  return toggled;
}

async function removeRoomHero(tx: Prisma.TransactionClient, hero: HeroRow) {
  if (hero.heroSlot > 0) {
    await tx.gameSessionMember.delete({ where: { id: hero.id } });
    return succeed(null);
  }
  await tx.gameSceneHeroToken.deleteMany({ where: { memberId: hero.id } });
  await tx.gameSessionMember.update({ where: { id: hero.id }, data: { persId: null, isCutout: false, conditions: [], exhaustionLevel: 0 } });
  return succeed(null);
}

async function addRoomHero(tx: Prisma.TransactionClient, mine: HeroRow[], persId: number, role: string) {
  const firstRow = mine.find((row) => row.heroSlot === 0 && row.persId === null);
  if (firstRow) {
    await tx.gameSessionMember.update({ where: { id: firstRow.id }, data: { persId } });
    return succeed(null);
  }
  const usedSlots = new Set(mine.map((row) => row.heroSlot));
  const heroSlot = Array.from({ length: GAME_SESSION_LIMITS.heroesPerMember }, (_, slot) => slot).find((slot) => !usedSlots.has(slot));
  if (heroSlot === undefined) return fail("hero_limit");
  const owner = await tx.gameSessionMember.findFirstOrThrow({ where: { id: mine[0].id }, select: { gameSessionId: true, userId: true, joinedAt: true } });
  await tx.gameSessionMember.create({ data: { ...owner, role, persId, heroSlot, lastSeenAt: new Date() } });
  return succeed(null);
}

export function findRoomHero(sessionId: number, heroId: number) {
  return prisma.gameSessionMember.findFirst({ where: { id: heroId, gameSessionId: sessionId }, select: { userId: true, persId: true } });
}

export async function setRoomHeroCutout(sessionId: number, userId: number, heroId: number, isCutout: boolean): Promise<GameSessionResult<null>> {
  const [membership, hero] = await Promise.all([findMembership(sessionId, userId), findRoomHero(sessionId, heroId)]);
  if (!membership) return fail("not_found");
  if (membership.gameSession.archivedAt) return fail("archived");
  if (!hero || hero.persId === null) return fail("no_map");
  if (hero.userId !== userId && membership.role !== "GM") return fail("forbidden");
  await prisma.gameSessionMember.update({ where: { id: heroId }, data: { isCutout } });
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
