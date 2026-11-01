import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GameRoll, GameRollSource, GameRollVisibility } from "@/rules/game-roll";
import { buildAvatarUrl, buildMemberName, GAME_SESSION_SIGNAL_CHANNEL, isBindablePers, type GameSessionResult } from "@/server/db/game-sessions";

export type GameRollEventView = {
  seq: number;
  authorUserId: number | null;
  authorName: string;
  persName: string | null;
  avatarUrl: string | null;
  source: GameRollSource;
  visibility: GameRollVisibility;
  label: string;
  roll: GameRoll;
  total: number;
  rolledAt: string;
  createdAt: string;
};

export type GameRollDraft = {
  idempotencyKey: string;
  visibility: GameRollVisibility;
  source: "CHARACTER" | "FREE";
  persId: number | null;
  label: string;
  roll: GameRoll;
  rolledAt: Date;
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
  pers: { select: { portraitKey: true } },
  author: { select: { image: true } },
} satisfies Prisma.GameRollEventSelect;

type EventRow = Prisma.GameRollEventGetPayload<{ select: typeof EVENT_SELECT }>;

function toEventView(row: EventRow): GameRollEventView {
  return {
    seq: Number(row.seq),
    authorUserId: row.authorUserId,
    authorName: row.authorName,
    persName: row.persName,
    avatarUrl: buildAvatarUrl(row.pers?.portraitKey, row.author?.image),
    source: row.source as GameRollSource,
    visibility: row.visibility as GameRollVisibility,
    label: row.label,
    roll: row.roll as GameRoll,
    total: row.total,
    rolledAt: row.rolledAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/// Має збігатися з canSeeGameRoll у src/rules/game-roll.ts — тест тримає їх разом.
export function buildVisibleEventFilter(viewer: GameRollViewer): Prisma.GameRollEventWhereInput {
  return { OR: [{ visibility: "PUBLIC" }, { authorUserId: viewer.userId }, ...(viewer.isGm ? [{ visibility: "GM" }] : [])] };
}

export async function listEventsAfter(sessionId: number, viewer: GameRollViewer, afterSeq: number, limit: number): Promise<GameRollEventView[]> {
  const rows = await prisma.gameRollEvent.findMany({
    where: { gameSessionId: sessionId, seq: { gt: afterSeq }, ...buildVisibleEventFilter(viewer) },
    orderBy: { seq: "asc" },
    take: limit,
    select: EVENT_SELECT,
  });
  return rows.map(toEventView);
}

export async function listEventsBefore(sessionId: number, viewer: GameRollViewer, beforeSeq: number | null, limit: number): Promise<{ events: GameRollEventView[]; hasOlder: boolean }> {
  const rows = await prisma.gameRollEvent.findMany({
    where: { gameSessionId: sessionId, ...(beforeSeq !== null ? { seq: { lt: beforeSeq } } : {}), ...buildVisibleEventFilter(viewer) },
    orderBy: { seq: "desc" },
    take: limit + 1,
    select: EVENT_SELECT,
  });
  return { events: rows.slice(0, limit).reverse().map(toEventView), hasOlder: rows.length > limit };
}

export async function findLatestVisibleSeq(sessionId: number, viewer: GameRollViewer): Promise<number> {
  const latest = await prisma.gameRollEvent.findFirst({ where: { gameSessionId: sessionId, ...buildVisibleEventFilter(viewer) }, orderBy: { seq: "desc" }, select: { seq: true } });
  return latest ? Number(latest.seq) : 0;
}

/// Рядок сесії блокується на час вставки: seq видається в порядку комітів, і курсор клієнта ніколи не перескочить подію.
export async function insertGameRollEvent(sessionId: number, authorUserId: number, draft: GameRollDraft): Promise<GameSessionResult<GameRollEventView>> {
  const author = await findRollAuthor(sessionId, authorUserId, draft);
  if (!author.ok) return author;
  return prisma.$transaction(async (tx) => {
    const [session] = await tx.$queryRaw<{ last_event_seq: bigint; archived_at: Date | null }[]>`
      SELECT last_event_seq, archived_at FROM game_session WHERE game_session_id = ${sessionId} FOR UPDATE`;
    if (!session) return { ok: false as const, error: "not_found" as const };
    const existing = await tx.gameRollEvent.findUnique({
      where: { gameSessionId_authorUserId_idempotencyKey: { gameSessionId: sessionId, authorUserId, idempotencyKey: draft.idempotencyKey } },
      select: EVENT_SELECT,
    });
    if (existing) return { ok: true as const, value: toEventView(existing) };
    if (session.archived_at) return { ok: false as const, error: "archived" as const };
    const isStillMember = await tx.gameSessionMember.count({ where: { gameSessionId: sessionId, userId: authorUserId } });
    if (!isStillMember) return { ok: false as const, error: "forbidden" as const };
    const seq = session.last_event_seq + BigInt(1);
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
        roll: draft.roll as unknown as Prisma.InputJsonValue,
        total: draft.roll.total,
        rolledAt: draft.rolledAt,
      },
      select: EVENT_SELECT,
    });
    await tx.$executeRaw`SELECT pg_notify(${GAME_SESSION_SIGNAL_CHANNEL}, ${JSON.stringify({ s: sessionId, k: "roll" })})`;
    return { ok: true as const, value: toEventView(created) };
  });
}

async function findRollAuthor(sessionId: number, userId: number, draft: GameRollDraft): Promise<GameSessionResult<{ authorName: string; persId: number | null; persName: string | null }>> {
  const member = await prisma.gameSessionMember.findUnique({
    where: { gameSessionId_userId: { gameSessionId: sessionId, userId } },
    select: { persId: true, pers: { select: { name: true } }, user: { select: { id: true, displayName: true, name: true } } },
  });
  if (!member) return { ok: false, error: "forbidden" };
  const authorName = buildMemberName(member.user);
  const persId = draft.source === "CHARACTER" && draft.persId !== null ? draft.persId : member.persId;
  if (persId === null) return { ok: true, value: { authorName, persId: null, persName: null } };
  if (persId === member.persId) return { ok: true, value: { authorName, persId, persName: member.pers?.name ?? null } };
  if (!(await isBindablePers(persId, userId))) return { ok: false, error: "bad_pers" };
  const pers = await prisma.pers.findUnique({ where: { persId }, select: { name: true } });
  return { ok: true, value: { authorName, persId, persName: pers?.name ?? null } };
}
