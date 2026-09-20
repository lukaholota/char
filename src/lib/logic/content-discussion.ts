import { toEntitySlug } from "@/lib/slug-utils";
import type { HomebrewRuleset } from "./homebrew-input";

export type DiscussionTarget =
  | { kind: "HOMEBREW"; entryId: number }
  | { kind: "SPELL" | "CREATURE"; ruleset: HomebrewRuleset; key: string };

export type VoteValue = -1 | 0 | 1;

export type DiscussionCommentView = {
  commentId: number;
  authorName: string;
  body: string;
  createdAt: string;
  isDeleted: boolean;
  score: number;
  myVote: VoteValue;
  isOwn: boolean;
  canDelete: boolean;
  replies: DiscussionCommentView[];
};

export type DiscussionView = {
  target: string;
  score: number;
  myVote: VoteValue;
  canVoteTarget: boolean;
  canReportTarget: boolean;
  commentCount: number;
  comments: DiscussionCommentView[];
};

export type StoredDiscussionComment = {
  contentCommentId: number;
  parentCommentId: number | null;
  userId: number;
  authorName: string | null;
  body: string;
  score: number;
  createdAt: Date;
  deletedAt: Date | null;
};

type DiscussionViewer = { userId: number | null; isModerator: boolean };

const DELETED_COMMENT_BODY = "Коментар видалено";
const CATALOG_TARGET_PATTERN = /^(SPELL|CREATURE):(RULES_2014|RULES_2024):([a-z0-9][a-z0-9-]{0,199})$/;
const HOMEBREW_TARGET_PATTERN = /^HOMEBREW:([1-9]\d{0,9})$/;

export function buildDiscussionTarget(target: DiscussionTarget): string {
  return target.kind === "HOMEBREW" ? `HOMEBREW:${target.entryId}` : `${target.kind}:${target.ruleset}:${target.key}`;
}

export function findCatalogDiscussionTarget(kind: "SPELL" | "CREATURE", item: { id: number; engName: string | null | undefined; ruleset: string | null | undefined }): string | null {
  if (item.id < 0) return buildDiscussionTarget({ kind: "HOMEBREW", entryId: -item.id });
  const key = toEntitySlug(item.engName ?? "");
  if (!key) return null;
  return buildDiscussionTarget({ kind, ruleset: item.ruleset === "RULES_2024" ? "RULES_2024" : "RULES_2014", key });
}

export function buildDiscussionTargetHref(target: DiscussionTarget): string {
  if (target.kind === "HOMEBREW") return `/homebrew/${target.entryId}`;
  const prefix = target.ruleset === "RULES_2024" ? "/2024" : "";
  return `${prefix}/${target.kind === "SPELL" ? "spells" : "bestiary"}/${target.key}`;
}

export function parseDiscussionTarget(raw: unknown): DiscussionTarget | null {
  const text = String(raw ?? "");
  const homebrew = HOMEBREW_TARGET_PATTERN.exec(text);
  if (homebrew) return { kind: "HOMEBREW", entryId: Number(homebrew[1]) };
  const catalog = CATALOG_TARGET_PATTERN.exec(text);
  if (!catalog) return null;
  return { kind: catalog[1] as "SPELL" | "CREATURE", ruleset: catalog[2] as HomebrewRuleset, key: catalog[3] };
}

export function isVoteValue(value: unknown): value is VoteValue {
  return value === -1 || value === 0 || value === 1;
}

export function buildOptimisticVote(current: { score: number; myVote: VoteValue }, nextVote: VoteValue): { score: number; myVote: VoteValue } {
  return { score: current.score - current.myVote + nextVote, myVote: nextVote };
}

export function formatPublicAuthorName(name: string | null | undefined): string {
  const [first, ...rest] = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!first) return "Гравець";
  const lastInitial = rest.at(-1)?.[0];
  return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first;
}

export function buildDiscussionCommentTree(
  comments: readonly StoredDiscussionComment[],
  viewer: DiscussionViewer,
  myVotes: ReadonlyMap<number, VoteValue>,
): DiscussionCommentView[] {
  const views = new Map(comments.map((comment) => [comment.contentCommentId, toCommentView(comment, viewer, myVotes.get(comment.contentCommentId) ?? 0)]));
  const roots: DiscussionCommentView[] = [];
  for (const comment of comments) {
    const view = views.get(comment.contentCommentId)!;
    const parent = comment.parentCommentId ? views.get(comment.parentCommentId) : undefined;
    if (parent) parent.replies.push(view);
    else roots.push(view);
  }
  return roots;
}

export function findReplyRootId(parent: { contentCommentId: number; parentCommentId: number | null }): number {
  return parent.parentCommentId ?? parent.contentCommentId;
}

function toCommentView(comment: StoredDiscussionComment, viewer: DiscussionViewer, myVote: VoteValue): DiscussionCommentView {
  const isDeleted = comment.deletedAt !== null;
  const isOwn = viewer.userId === comment.userId;
  return {
    commentId: comment.contentCommentId,
    authorName: isDeleted ? "" : formatPublicAuthorName(comment.authorName),
    body: isDeleted ? DELETED_COMMENT_BODY : comment.body,
    createdAt: comment.createdAt.toISOString(),
    isDeleted,
    score: comment.score,
    myVote,
    isOwn,
    canDelete: !isDeleted && (viewer.isModerator || isOwn),
    replies: [],
  };
}
