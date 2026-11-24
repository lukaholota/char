import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSecretRollLabel, canSeeGameRollValues, EMPTY_GAME_ROLL, type GameRoll, type GameRollSource, type GameRollVisibility } from "@/rules/game-roll";
import { buildGameRollHeroTargetView, type GameRollHeroTargetDraft, type GameRollHeroTargetView, type StoredHeroTarget } from "@/rules/game-roll-hero-target";
import { buildGameRollSavesView, splitSaveDamage, type GameRollSavesDraft, type GameRollSavesView, type StoredSaves } from "@/rules/game-roll-saves";
import { buildGameRollTargetView, type GameRollTargetDraft, type GameRollTargetView } from "@/rules/game-roll-target";
import { findAttackHit } from "@/rules/game-roll-target";
import type { DamageDefenseNote } from "@/rules/damage-parts";
import { takeRolledInitiative } from "@/server/db/game-combat";
import { changeHeroTargetHitPoints, damageHeroSaveRows, revertHeroHitPoints, type RestoredHero } from "@/server/db/game-hero-damage";
import { findRoomHeroes, type RoomHero } from "@/server/db/game-room-heroes";
import { applyRollTarget, applySaveTargets, revertRollDamage, revertSaveDamage } from "@/server/db/game-roll-target";
import { buildAvatarUrl, buildMemberName, findActiveGmSession, GAME_SESSION_SIGNAL_CHANNEL, isBindablePers, signalGameSession, type GameSessionResult } from "@/server/db/game-sessions";

export type GameRollEventView = {
  seq: number;
  authorUserId: number | null;
  authorName: string;
  persName: string | null;
  avatarUrl: string | null;
  source: GameRollSource;
  visibility: GameRollVisibility;
  label: string;
  roll: GameRoll | null;
  total: number | null;
  rolledAt: string;
  createdAt: string;
  target: GameRollTargetView | null;
  saves: GameRollSavesView | null;
  heroTarget: GameRollHeroTargetView | null;
  isCancelled?: true;
  cancelsSeq?: number;
  restoredHeroes?: RestoredHero[];
};

export type GameRollDraft = {
  idempotencyKey: string;
  visibility: GameRollVisibility;
  source: "CHARACTER" | "FREE" | "MESSAGE";
  persId: number | null;
  label: string;
  roll: GameRoll;
  rolledAt: Date;
  target: GameRollTargetDraft | null;
  saves?: GameRollSavesDraft | null;
  heroTarget?: GameRollHeroTargetDraft | null;
  isInitiative?: boolean;
};

export type GameRollViewer = { userId: number; isGm: boolean };

const EVENT_SELECT = {
  seq: true,
  authorUserId: true,
  authorName: true,
  persName: true,
  source: true,
  visibility: true,
  label: true,
  roll: true,
  total: true,
  rolledAt: true,
  createdAt: true,
  targetCreatureId: true,
  targetName: true,
  rollKind: true,
  targetAc: true,
  isHit: true,
  hpBefore: true,
  hpChange: true,
  hpChangeUndone: true,
  pers: { select: { portraitKey: true } },
  author: { select: { image: true } },
} satisfies Prisma.GameRollEventSelect;

type EventRow = Prisma.GameRollEventGetPayload<{ select: typeof EVENT_SELECT }>;
/// targetDamage — шкода по істоті після її опорів; heroTarget тримає свою.
/// isCancelled — майстер скасував кидок; cancelsSeq і restoredHeroes — у самої події скасування.
type StoredRoll = GameRoll & { saves?: StoredSaves; heroTarget?: StoredHeroTarget; targetDamage?: { damage: number; damageDefenses: DamageDefenseNote[] }; isCancelled?: true; cancelsSeq?: number; restoredHeroes?: RestoredHero[] };

function toEventView(row: EventRow, viewer: GameRollViewer): GameRollEventView {
  const visibility = row.visibility as GameRollVisibility;
  const { saves, heroTarget, targetDamage, isCancelled, cancelsSeq, restoredHeroes, ...roll } = row.roll as StoredRoll;
  const hasValues = canSeeGameRollValues(visibility, viewer);
  return {
    seq: Number(row.seq),
    authorUserId: row.authorUserId,
    authorName: row.authorName,
    persName: row.persName,
    avatarUrl: buildAvatarUrl(row.pers?.portraitKey, row.author?.image),
    source: row.source as GameRollSource,
    visibility,
    label: hasValues ? row.label : buildSecretRollLabel(roll),
    roll: hasValues ? roll : null,
    total: hasValues ? row.total : null,
    rolledAt: row.rolledAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    target: hasValues ? buildGameRollTargetView({ ...row, ...targetDamage }, viewer) : null,
    saves: hasValues ? buildGameRollSavesView(saves, viewer) : null,
    heroTarget: hasValues ? buildGameRollHeroTargetView(heroTarget, row.total, viewer) : null,
    ...(isCancelled ? { isCancelled } : {}),
    ...(cancelsSeq ? { cancelsSeq } : {}),
    ...(hasValues && restoredHeroes?.length ? { restoredHeroes } : {}),
  };
}

/// Має збігатися з canSeeGameRoll у src/rules/game-roll.ts — тест тримає їх разом.
export function buildVisibleEventFilter(viewer: GameRollViewer): Prisma.GameRollEventWhereInput {
  return { OR: [{ visibility: "PUBLIC" }, { authorUserId: viewer.userId }, ...(viewer.isGm ? [{ visibility: { in: ["GM", "SECRET"] } }] : [])] };
}

export async function listEventsAfter(sessionId: number, viewer: GameRollViewer, afterSeq: number, limit: number): Promise<GameRollEventView[]> {
  const rows = await prisma.gameRollEvent.findMany({
    where: { gameSessionId: sessionId, seq: { gt: afterSeq }, ...buildVisibleEventFilter(viewer) },
    orderBy: { seq: "asc" },
    take: limit,
    select: EVENT_SELECT,
  });
  return rows.map((row) => toEventView(row, viewer));
}

export async function listEventsBefore(sessionId: number, viewer: GameRollViewer, beforeSeq: number | null, limit: number): Promise<{ events: GameRollEventView[]; hasOlder: boolean }> {
  const rows = await prisma.gameRollEvent.findMany({
    where: { gameSessionId: sessionId, ...(beforeSeq !== null ? { seq: { lt: beforeSeq } } : {}), ...buildVisibleEventFilter(viewer) },
    orderBy: { seq: "desc" },
    take: limit + 1,
    select: EVENT_SELECT,
  });
  return { events: rows.slice(0, limit).reverse().map((row) => toEventView(row, viewer)), hasOlder: rows.length > limit };
}

export async function findLatestVisibleSeq(sessionId: number, viewer: GameRollViewer): Promise<number> {
  const latest = await prisma.gameRollEvent.findFirst({ where: { gameSessionId: sessionId, ...buildVisibleEventFilter(viewer) }, orderBy: { seq: "desc" }, select: { seq: true } });
  return latest ? Number(latest.seq) : 0;
}

/// Рядок сесії блокується на час вставки: seq видається в порядку комітів, і курсор клієнта ніколи не перескочить подію.
export async function insertGameRollEvent(sessionId: number, authorUserId: number, draft: GameRollDraft): Promise<GameSessionResult<GameRollEventView>> {
  const author = await findRollAuthor(sessionId, authorUserId, draft);
  if (!author.ok) return author;
  const authorViewer = { userId: authorUserId, isGm: author.value.isGm };
  if (!author.value.isGm && isGmOnlyRoll(draft)) return { ok: false, error: "forbidden" };
  const heroes = await findRoomHeroes(sessionId, [...(draft.saves?.persIds ?? []), ...(draft.heroTarget ? [draft.heroTarget.persId] : [])]);
  return prisma.$transaction(async (tx) => {
    const [session] = await tx.$queryRaw<{ last_event_seq: bigint; archived_at: Date | null }[]>`
      SELECT last_event_seq, archived_at FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
    if (!session) return { ok: false as const, error: "not_found" as const };
    const existing = await tx.gameRollEvent.findUnique({
      where: { gameSessionId_authorUserId_idempotencyKey: { gameSessionId: sessionId, authorUserId, idempotencyKey: draft.idempotencyKey } },
      select: EVENT_SELECT,
    });
    if (existing) return { ok: true as const, value: toEventView(existing, authorViewer) };
    if (session.archived_at) return { ok: false as const, error: "archived" as const };
    const isStillMember = await tx.gameSessionMember.count({ where: { gameSessionId: sessionId, userId: authorUserId } });
    if (!isStillMember) return { ok: false as const, error: "forbidden" as const };
    const effect = draft.target ? await applyRollTarget(tx, sessionId, draft.target, draft.roll) : { ok: true as const, value: null };
    if (!effect.ok) return effect;
    const seq = session.last_event_seq + BigInt(1);
    const rolledSaves = draft.saves ? await applySaveTargets(tx, sessionId, draft.saves, splitSaveDamage(draft.roll, draft.saves.effect), heroes) : null;
    const saves = await damageHeroSaveRows(tx, sessionId, Number(seq), rolledSaves, heroes);
    const heroTarget = await changeHeroTargetHitPoints(tx, sessionId, Number(seq), draft.heroTarget ? buildHeroTarget(draft.heroTarget, heroes.get(draft.heroTarget.persId), draft.roll) : null, draft.roll, heroes);
    const targetDamage = effect.value?.damageDefenses.length ? { damage: effect.value.damage, damageDefenses: effect.value.damageDefenses } : null;
    await tx.gameSession.update({ where: { id: sessionId }, data: { lastEventSeq: seq, updatedAt: new Date() } });
    const created = await tx.gameRollEvent.create({
      data: {
        gameSessionId: sessionId,
        seq,
        authorUserId,
        persId: author.value.persId,
        idempotencyKey: draft.idempotencyKey,
        visibility: draft.visibility,
        source: draft.source,
        authorName: author.value.authorName,
        persName: author.value.persName,
        label: draft.label,
        roll: { ...draft.roll, ...(saves ? { saves } : {}), ...(heroTarget ? { heroTarget } : {}), ...(targetDamage ? { targetDamage } : {}) } as unknown as Prisma.InputJsonValue,
        total: draft.roll.total,
        rolledAt: draft.rolledAt,
        ...effect.value?.columns,
      },
      select: EVENT_SELECT,
    });
    await tx.$executeRaw`SELECT pg_notify(${GAME_SESSION_SIGNAL_CHANNEL}, ${JSON.stringify({ s: sessionId, k: "roll" })})`;
    const isInitiativeTaken = draft.isInitiative && author.value.persId !== null ? await takeRolledInitiative(tx, sessionId, author.value.persId, draft.roll.total) : false;
    if (isInitiativeTaken || effect.value?.columns.hpChange || heroTarget?.isAppliedToSheet || saves?.rows.some((row) => row.hpChange || row.isConditionAdded || row.isAppliedToSheet)) await tx.$executeRaw`SELECT pg_notify(${GAME_SESSION_SIGNAL_CHANNEL}, ${JSON.stringify({ s: sessionId, k: "session" })})`;
    return { ok: true as const, value: toEventView(created, authorViewer) };
  });
}

export type JournalMessageDraft = { idempotencyKey: string; text: string; isForGm: boolean };

export function insertJournalMessage(sessionId: number, authorUserId: number, message: JournalMessageDraft) {
  return insertGameRollEvent(sessionId, authorUserId, {
    idempotencyKey: message.idempotencyKey,
    visibility: message.isForGm ? "GM" : "PUBLIC",
    source: "MESSAGE",
    persId: null,
    label: message.text,
    roll: EMPTY_GAME_ROLL,
    rolledAt: new Date(),
    target: null,
  });
}

/// saveRowIndex — рядок ряткидків зони: кожну істоту майстер скасовує окремо.
export async function undoRollDamage(sessionId: number, userId: number, seq: number, saveRowIndex?: number): Promise<GameSessionResult<GameRollEventView>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const reverted = await prisma.$transaction(async (tx) => {
    const result = saveRowIndex === undefined ? await revertRollDamage(tx, sessionId, seq) : await revertSaveDamage(tx, sessionId, seq, saveRowIndex);
    if (!result.ok) return result;
    const row = await tx.gameRollEvent.findUniqueOrThrow({ where: { gameSessionId_seq: { gameSessionId: sessionId, seq } }, select: EVENT_SELECT });
    return { ok: true as const, value: toEventView(row, { userId, isGm: true }) };
  });
  if (reverted.ok) await signalGameSession(sessionId, "session");
  return reverted;
}

/// Майстер скасовує будь-який кидок: шкоду й стани повернуто, а в журналі лишається запис «Скасовано».
/// Позначка на події ставиться першим UPDATE — другий клік нічого не поверне вдруге.
export async function cancelGameRoll(sessionId: number, userId: number, seq: number): Promise<GameSessionResult<GameRollEventView[]>> {
  const gm = await findActiveGmSession(sessionId, userId);
  if (!gm.ok) return gm;
  const author = await findRollAuthor(sessionId, userId, { source: "FREE", persId: null });
  if (!author.ok) return author;
  const heroes = await findRoomHeroes(sessionId, await listRollPersIds(sessionId, seq));
  const viewer = { userId, isGm: true };
  const cancelled = await prisma.$transaction(async (tx) => {
    const [session] = await tx.$queryRaw<{ last_event_seq: bigint }[]>`SELECT last_event_seq FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
    const [claimed] = await tx.$queryRaw<{ label: string; visibility: GameRollVisibility; roll: StoredRoll }[]>`
      UPDATE game_roll_event SET roll = roll || '{"isCancelled": true}'::jsonb
      WHERE game_session_id = ${sessionId} AND seq = ${seq}::bigint AND source <> 'MESSAGE'
        AND NOT (roll ? 'isCancelled') AND NOT (roll ? 'cancelsSeq') AND (visibility <> 'SELF' OR author_user_id = ${userId})
      RETURNING label, visibility, roll`;
    if (!session || !claimed) return { ok: false as const, error: await findCancelFailure(tx, sessionId, seq) };
    const cancelSeq = session.last_event_seq + BigInt(1);
    await revertRollDamage(tx, sessionId, seq);
    for (const index of claimed.roll.saves?.rows.keys() ?? []) await revertSaveDamage(tx, sessionId, seq, index);
    const restoredHeroes = await revertHeroHitPoints(tx, sessionId, Number(cancelSeq), claimed.roll, heroes);
    await tx.gameSession.update({ where: { id: sessionId }, data: { lastEventSeq: cancelSeq, updatedAt: new Date() } });
    const created = await tx.gameRollEvent.create({
      data: {
        gameSessionId: sessionId,
        seq: cancelSeq,
        authorUserId: userId,
        idempotencyKey: randomUUID(),
        visibility: claimed.visibility,
        source: "FREE",
        authorName: author.value.authorName,
        persName: author.value.persName,
        persId: author.value.persId,
        label: `Скасовано: ${claimed.label}`,
        roll: { ...EMPTY_GAME_ROLL, cancelsSeq: seq, ...(restoredHeroes.length ? { restoredHeroes } : {}) } as unknown as Prisma.InputJsonValue,
        total: 0,
        rolledAt: new Date(),
      },
      select: EVENT_SELECT,
    });
    const original = await tx.gameRollEvent.findUniqueOrThrow({ where: { gameSessionId_seq: { gameSessionId: sessionId, seq } }, select: EVENT_SELECT });
    return { ok: true as const, value: [toEventView(original, viewer), toEventView(created, viewer)] };
  });
  if (cancelled.ok) await Promise.all([signalGameSession(sessionId, "roll"), signalGameSession(sessionId, "session")]);
  return cancelled;
}

async function listRollPersIds(sessionId: number, seq: number): Promise<number[]> {
  const event = await prisma.gameRollEvent.findUnique({ where: { gameSessionId_seq: { gameSessionId: sessionId, seq } }, select: { roll: true } });
  const roll = event?.roll as StoredRoll | undefined;
  return [...(roll?.heroTarget ? [roll.heroTarget.persId] : []), ...(roll?.saves?.rows ?? []).flatMap((row) => row.persId ?? [])];
}

async function findCancelFailure(tx: Prisma.TransactionClient, sessionId: number, seq: number): Promise<"not_found" | "already_cancelled"> {
  const event = await tx.gameRollEvent.findUnique({ where: { gameSessionId_seq: { gameSessionId: sessionId, seq } }, select: { roll: true } });
  return (event?.roll as StoredRoll | undefined)?.isCancelled ? "already_cancelled" : "not_found";
}

async function findRollAuthor(sessionId: number, userId: number, draft: Pick<GameRollDraft, "source" | "persId">): Promise<GameSessionResult<{ authorName: string; isGm: boolean; persId: number | null; persName: string | null }>> {
  const member = await prisma.gameSessionMember.findUnique({
    where: { gameSessionId_userId_heroSlot: { gameSessionId: sessionId, userId, heroSlot: 0 } },
    select: { role: true, persId: true, pers: { select: { name: true } }, user: { select: { id: true, displayName: true, name: true } } },
  });
  if (!member) return { ok: false, error: "forbidden" };
  const authorName = buildMemberName(member.user);
  const isGm = member.role === "GM";
  const persId = draft.source === "CHARACTER" && draft.persId !== null ? draft.persId : member.persId;
  if (persId === null) return { ok: true, value: { authorName, isGm, persId: null, persName: null } };
  if (persId === member.persId) return { ok: true, value: { authorName, isGm, persId, persName: member.pers?.name ?? null } };
  if (!(await isBindablePers(persId, userId))) return { ok: false, error: "bad_pers" };
  const pers = await prisma.pers.findUnique({ where: { persId }, select: { name: true } });
  return { ok: true, value: { authorName, isGm, persId, persName: pers?.name ?? null } };
}

/// Кидки зі статблоку (без листа) по істоті, герою чи зоні — справа майстра: гравець бʼє лише своїм персонажем.
function isGmOnlyRoll(draft: GameRollDraft): boolean {
  return draft.source === "FREE" && Boolean(draft.target || draft.heroTarget || draft.saves);
}

/// Герой, що вийшов із кімнати, поки кидок чекав у черзі, — кидок лишається без цілі.
function buildHeroTarget(target: GameRollHeroTargetDraft, hero: RoomHero | undefined, roll: GameRoll): StoredHeroTarget | null {
  if (!hero) return null;
  if (target.kind !== "attack") return { ...target, name: hero.name };
  return { ...target, name: hero.name, armorClass: hero.armorClass, isHit: findAttackHit(roll, roll.total, hero.armorClass) };
}
