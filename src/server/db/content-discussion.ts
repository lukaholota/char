"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildDiscussionCommentTree,
  buildDiscussionTarget,
  findReplyRootId,
  isVoteValue,
  parseDiscussionTarget,
  type DiscussionTarget,
  type DiscussionView,
  type VoteValue,
} from "@/lib/logic/content-discussion";
import { COMMENTS_PER_HOUR, findCommentLimitStart, readCommentBody } from "@/rules/discussion-limits";
import { findContentViewer, NOT_SIGNED_IN, type ContentViewer } from "@/server/db/content-viewer";
import { findDiscussionTarget } from "@/server/db/content-targets";

type ActionResult = { success: true } | { success: false; error: string };
type VoteResult = { success: true; score: number; myVote: VoteValue } | { success: false; error: string };

const TARGET_NOT_FOUND = "Запис не знайдено";

export async function loadDiscussion(rawTarget: string): Promise<DiscussionView | null> {
  const target = parseDiscussionTarget(rawTarget);
  if (!target) return null;
  const lookup = await findDiscussionTarget(target);
  if (!lookup.exists) return null;

  const viewer = await findContentViewer();
  const key = buildDiscussionTarget(target);
  const [score, myVote, comments] = await Promise.all([sumTargetVotes(prisma, key), findMyTargetVote(viewer, key), loadTargetComments(key)]);
  const myCommentVotes = await loadMyCommentVotes(viewer, comments.map((comment) => comment.contentCommentId));
  const isOwnTarget = viewer.userId !== null && lookup.authorUserId === viewer.userId;

  return {
    target: key,
    score,
    myVote,
    canVoteTarget: !isOwnTarget,
    canReportTarget: target.kind === "HOMEBREW" && !isOwnTarget,
    commentCount: comments.filter((comment) => !comment.deletedAt).length,
    comments: buildDiscussionCommentTree(comments, viewer, myCommentVotes),
  };
}

export async function voteContent(rawTarget: string, value: unknown): Promise<VoteResult> {
  const viewer = await findContentViewer();
  if (!viewer.userId) return { success: false, error: NOT_SIGNED_IN };
  if (!isVoteValue(value)) return { success: false, error: "Невідомий голос" };
  const target = parseDiscussionTarget(rawTarget);
  const lookup = target ? await findDiscussionTarget(target) : { exists: false as const };
  if (!target || !lookup.exists) return { success: false, error: TARGET_NOT_FOUND };
  if (lookup.authorUserId === viewer.userId) return { success: false, error: "За свій запис голосувати не можна" };

  const score = await prisma.$transaction((tx) => persistTargetVote(tx, { target, userId: viewer.userId!, value }));
  return { success: true, score, myVote: value };
}

export async function addContentComment(input: { target: string; body: string; parentCommentId?: number | null }): Promise<ActionResult> {
  const viewer = await findContentViewer();
  if (!viewer.userId) return { success: false, error: NOT_SIGNED_IN };
  const parsed = readCommentBody(String(input.body ?? ""));
  if ("error" in parsed) return { success: false, error: parsed.error };
  const target = parseDiscussionTarget(input.target);
  if (!target || !(await findDiscussionTarget(target)).exists) return { success: false, error: TARGET_NOT_FOUND };

  const limitError = await findCommentLimitError(viewer.userId);
  if (limitError) return { success: false, error: limitError };
  const key = buildDiscussionTarget(target);
  const parentCommentId = input.parentCommentId ? await findReplyParentId(key, input.parentCommentId) : null;
  if (input.parentCommentId && !parentCommentId) return { success: false, error: "Коментар, на який ви відповідаєте, не знайдено" };

  await prisma.contentComment.create({ data: { target: key, userId: viewer.userId, parentCommentId, body: parsed.body } });
  return { success: true };
}

export async function deleteContentComment(commentId: number): Promise<ActionResult> {
  const viewer = await findContentViewer();
  if (!viewer.userId) return { success: false, error: NOT_SIGNED_IN };
  const comment = await prisma.contentComment.findUnique({ where: { contentCommentId: commentId }, select: { userId: true, deletedAt: true } });
  if (!comment || comment.deletedAt) return { success: false, error: "Коментар не знайдено" };
  if (!viewer.isModerator && comment.userId !== viewer.userId) return { success: false, error: "Видалити можна лише свій коментар" };

  await prisma.contentComment.update({ where: { contentCommentId: commentId }, data: { deletedAt: new Date() } });
  return { success: true };
}

export async function voteContentComment(commentId: number, value: unknown): Promise<VoteResult> {
  const viewer = await findContentViewer();
  if (!viewer.userId) return { success: false, error: NOT_SIGNED_IN };
  if (!isVoteValue(value)) return { success: false, error: "Невідомий голос" };
  const comment = await prisma.contentComment.findFirst({ where: { contentCommentId: commentId, deletedAt: null }, select: { userId: true } });
  if (!comment) return { success: false, error: "Коментар не знайдено" };
  if (comment.userId === viewer.userId) return { success: false, error: "За свій коментар голосувати не можна" };

  const score = await prisma.$transaction((tx) => persistCommentVote(tx, { commentId, userId: viewer.userId!, value }));
  return { success: true, score, myVote: value };
}

async function persistTargetVote(tx: Prisma.TransactionClient, input: { target: DiscussionTarget; userId: number; value: VoteValue }): Promise<number> {
  const key = buildDiscussionTarget(input.target);
  if (input.value === 0) await tx.contentVote.deleteMany({ where: { target: key, userId: input.userId } });
  else await tx.contentVote.upsert({ where: { target_userId: { target: key, userId: input.userId } }, create: { target: key, userId: input.userId, value: input.value }, update: { value: input.value } });

  const score = await sumTargetVotes(tx, key);
  if (input.target.kind === "HOMEBREW") await tx.homebrewEntry.update({ where: { homebrewEntryId: input.target.entryId }, data: { score } });
  return score;
}

async function persistCommentVote(tx: Prisma.TransactionClient, input: { commentId: number; userId: number; value: VoteValue }): Promise<number> {
  const where = { contentCommentId: input.commentId, userId: input.userId };
  if (input.value === 0) await tx.contentCommentVote.deleteMany({ where });
  else await tx.contentCommentVote.upsert({ where: { contentCommentId_userId: where }, create: { ...where, value: input.value }, update: { value: input.value } });

  const total = await tx.contentCommentVote.aggregate({ where: { contentCommentId: input.commentId }, _sum: { value: true } });
  const score = total._sum.value ?? 0;
  await tx.contentComment.update({ where: { contentCommentId: input.commentId }, data: { score } });
  return score;
}

async function sumTargetVotes(client: Prisma.TransactionClient, target: string): Promise<number> {
  const total = await client.contentVote.aggregate({ where: { target }, _sum: { value: true } });
  return total._sum.value ?? 0;
}

async function findMyTargetVote(viewer: ContentViewer, target: string): Promise<VoteValue> {
  if (!viewer.userId) return 0;
  const vote = await prisma.contentVote.findUnique({ where: { target_userId: { target, userId: viewer.userId } }, select: { value: true } });
  return toVoteValue(vote?.value);
}

async function loadTargetComments(target: string) {
  const comments = await prisma.contentComment.findMany({ where: { target }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
  return comments.map(({ user, ...comment }) => ({ ...comment, authorName: user.name }));
}

async function loadMyCommentVotes(viewer: ContentViewer, commentIds: number[]): Promise<Map<number, VoteValue>> {
  if (!viewer.userId || commentIds.length === 0) return new Map();
  const votes = await prisma.contentCommentVote.findMany({ where: { userId: viewer.userId, contentCommentId: { in: commentIds } }, select: { contentCommentId: true, value: true } });
  return new Map(votes.map((vote) => [vote.contentCommentId, toVoteValue(vote.value)]));
}

async function findCommentLimitError(userId: number): Promise<string | null> {
  const count = await prisma.contentComment.count({ where: { userId, createdAt: { gte: findCommentLimitStart(new Date()) } } });
  return count >= COMMENTS_PER_HOUR ? `Не більше ${COMMENTS_PER_HOUR} коментарів на годину` : null;
}

async function findReplyParentId(target: string, parentCommentId: number): Promise<number | null> {
  const parent = await prisma.contentComment.findFirst({
    where: { contentCommentId: parentCommentId, target, deletedAt: null },
    select: { contentCommentId: true, parentCommentId: true },
  });
  return parent ? findReplyRootId(parent) : null;
}

function toVoteValue(value: number | undefined): VoteValue {
  return value === 1 ? 1 : value === -1 ? -1 : 0;
}
