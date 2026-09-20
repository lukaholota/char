"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildDiscussionTarget, buildDiscussionTargetHref, buildPublicAuthorName, parseDiscussionTarget } from "@/lib/logic/content-discussion";
import { findReportLimitStart, readReportInput, REPORTS_PER_DAY, type ReportReason } from "@/rules/discussion-limits";
import { findContentViewer, NOT_SIGNED_IN } from "@/server/db/content-viewer";
import { findDiscussionTarget } from "@/server/db/content-targets";
import { deleteHomebrewEntryAsModerator } from "@/server/db/homebrew-removal";

type ActionResult = { success: true } | { success: false; error: string };

export type OpenReportGroup = {
  target: string;
  targetHref: string;
  commentId: number | null;
  targetLabel: string;
  commentBody: string | null;
  commentAuthor: string | null;
  reasons: Array<{ reason: ReportReason; details: string | null; createdAt: string }>;
};

const ONLY_MODERATORS = "Лише для модераторів";

export async function reportContent(input: { target: string; commentId?: number | null; reason: unknown; details: unknown }): Promise<ActionResult> {
  const viewer = await findContentViewer();
  if (!viewer.userId) return { success: false, error: NOT_SIGNED_IN };
  const parsed = readReportInput({ reason: input.reason, details: input.details });
  if ("error" in parsed) return { success: false, error: parsed.error };

  const targetError = await findReportTargetError(input.target, input.commentId ?? null, viewer.userId);
  if (targetError) return { success: false, error: targetError };
  const limitError = await findReportLimitError(viewer.userId);
  if (limitError) return { success: false, error: limitError };

  return createReport({ target: input.target, commentId: input.commentId ?? null, reporterUserId: viewer.userId, ...parsed });
}

export async function listOpenContentReports(): Promise<OpenReportGroup[] | null> {
  const viewer = await findContentViewer();
  if (!viewer.isModerator) return null;
  const reports = await prisma.contentReport.findMany({
    where: { status: "OPEN" },
    include: { comment: { include: { user: { select: { name: true, displayName: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const labels = await loadTargetLabels(reports.map((report) => report.target));
  return groupReports(reports, labels);
}

export async function resolveContentReports(input: { target: string; commentId: number | null; action: "DELETE" | "DISMISS" }): Promise<ActionResult> {
  const viewer = await findContentViewer();
  if (!viewer.isModerator || !viewer.userId) return { success: false, error: ONLY_MODERATORS };
  const target = parseDiscussionTarget(input.target);
  if (!target) return { success: false, error: "Запис не знайдено" };

  if (input.action === "DELETE") await deleteReportedContent(target, input.commentId);
  await prisma.contentReport.updateMany({
    where: { target: input.target, contentCommentId: input.commentId, status: "OPEN" },
    data: { status: input.action === "DELETE" ? "RESOLVED" : "DISMISSED", resolvedByUserId: viewer.userId, resolvedAt: new Date() },
  });
  return { success: true };
}

async function findReportTargetError(rawTarget: string, commentId: number | null, userId: number): Promise<string | null> {
  const target = parseDiscussionTarget(rawTarget);
  if (!target) return "Запис не знайдено";
  if (commentId !== null) {
    const comment = await prisma.contentComment.findFirst({ where: { contentCommentId: commentId, target: buildDiscussionTarget(target), deletedAt: null }, select: { userId: true } });
    if (!comment) return "Коментар не знайдено";
    return comment.userId === userId ? "На свій коментар скаржитися не можна" : null;
  }
  if (target.kind !== "HOMEBREW") return "Скаржитися можна на хоумбрю або коментар";
  const lookup = await findDiscussionTarget(target);
  if (!lookup.exists) return "Запис не знайдено";
  return lookup.authorUserId === userId ? "На свій запис скаржитися не можна" : null;
}

async function findReportLimitError(userId: number): Promise<string | null> {
  const count = await prisma.contentReport.count({ where: { reporterUserId: userId, createdAt: { gte: findReportLimitStart(new Date()) } } });
  return count >= REPORTS_PER_DAY ? `Не більше ${REPORTS_PER_DAY} скарг на добу` : null;
}

async function createReport(data: { target: string; commentId: number | null; reporterUserId: number; reason: ReportReason; details: string | null }): Promise<ActionResult> {
  try {
    await prisma.contentReport.create({
      data: { target: data.target, contentCommentId: data.commentId, reporterUserId: data.reporterUserId, reason: data.reason, details: data.details },
    });
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: "Ви вже поскаржилися на це" };
    throw error;
  }
}

async function deleteReportedContent(target: NonNullable<ReturnType<typeof parseDiscussionTarget>>, commentId: number | null): Promise<void> {
  if (commentId !== null) {
    await prisma.contentComment.updateMany({ where: { contentCommentId: commentId, deletedAt: null }, data: { deletedAt: new Date() } });
    return;
  }
  if (target.kind === "HOMEBREW") await deleteHomebrewEntryAsModerator(target.entryId);
}

async function loadTargetLabels(targets: string[]): Promise<Map<string, string>> {
  const entryIds = targets.flatMap((raw) => {
    const target = parseDiscussionTarget(raw);
    return target?.kind === "HOMEBREW" ? [target.entryId] : [];
  });
  const entries = entryIds.length ? await prisma.homebrewEntry.findMany({ where: { homebrewEntryId: { in: entryIds } }, select: { homebrewEntryId: true, name: true } }) : [];
  const names = new Map(entries.map((entry) => [`HOMEBREW:${entry.homebrewEntryId}`, `Хоумбрю «${entry.name}»`]));
  return new Map(targets.map((target) => [target, names.get(target) ?? target]));
}

type LoadedReport = Prisma.ContentReportGetPayload<{ include: { comment: { include: { user: { select: { name: true, displayName: true } } } } } }>;

function groupReports(reports: readonly LoadedReport[], labels: ReadonlyMap<string, string>): OpenReportGroup[] {
  const groups = new Map<string, OpenReportGroup>();
  for (const report of reports) {
    const groupKey = `${report.target}#${report.contentCommentId ?? ""}`;
    const group = groups.get(groupKey) ?? {
      target: report.target,
      targetHref: findTargetHref(report.target),
      commentId: report.contentCommentId,
      targetLabel: labels.get(report.target) ?? report.target,
      commentBody: report.comment?.body ?? null,
      commentAuthor: report.comment ? buildPublicAuthorName(report.comment.user) : null,
      reasons: [],
    };
    group.reasons.push({ reason: report.reason as ReportReason, details: report.details, createdAt: report.createdAt.toISOString() });
    groups.set(groupKey, group);
  }
  return [...groups.values()];
}

function findTargetHref(rawTarget: string): string {
  const target = parseDiscussionTarget(rawTarget);
  return target ? buildDiscussionTargetHref(target) : "/homebrew";
}
