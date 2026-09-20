"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voteContent } from "@/lib/actions/content-discussion-actions";
import { fetchDiscussion } from "@/lib/catalog-reads";
import type { DiscussionCommentView, DiscussionView, DiscussionViewerName } from "@/lib/logic/content-discussion";
import { cn } from "@/lib/utils";
import { DiscussionCommentCard, DiscussionCommentForm } from "./DiscussionComment";
import { ReportDialog } from "./ReportDialog";
import { useSignInGate } from "./useSignInGate";
import { VoteControl } from "./VoteControl";

type Props = { target: string; ownTargetReason?: string; className?: string };

export function ContentDiscussion({ target, ownTargetReason = "За свій запис голосувати не можна", className }: Props) {
  const { discussion, reload } = useDiscussion(target);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [isReporting, setReporting] = useState(false);
  const { requireSignIn, signInDialog } = useSignInGate();

  if (discussion === undefined) {
    return <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-slate-500" aria-label="Завантаження обговорення" />;
  }
  if (discussion === null) return null;

  const afterReply = () => {
    setReplyTo(null);
    reload();
  };

  return (
    <section className={cn("space-y-4", className)} aria-label="Обговорення">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">
          Обговорення <span className="text-slate-400">({discussion.commentCount})</span>
        </h2>
        <div className="flex items-center gap-1">
          <VoteControl score={discussion.score} myVote={discussion.myVote} blockedReason={discussion.canVoteTarget ? null : ownTargetReason} onVote={(value) => voteContent(target, value)} />
          {discussion.canReportTarget ? (
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-slate-400" aria-label="Поскаржитися на запис" onClick={() => requireSignIn(() => setReporting(true))}>
              <Flag className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <DiscussionCommentForm target={target} parentCommentId={null} placeholder="Що думаєте?" viewerName={discussion.viewerName} onDone={reload} />
      {discussion.comments.length === 0 ? <p className="text-sm text-slate-400">Поки ніхто не коментував.</p> : null}
      <ul className="space-y-3">
        {discussion.comments.map((comment) => (
          <CommentThread
            key={comment.commentId}
            target={target}
            comment={comment}
            viewerName={discussion.viewerName}
            isReplying={replyTo === comment.commentId}
            onReply={setReplyTo}
            onChanged={reload}
            onReplied={afterReply}
          />
        ))}
      </ul>
      <ReportDialog target={target} commentId={null} open={isReporting} onOpenChange={setReporting} />
      {signInDialog}
    </section>
  );
}

type ThreadProps = {
  target: string;
  comment: DiscussionCommentView;
  viewerName: DiscussionViewerName | null;
  isReplying: boolean;
  onReply: (commentId: number | null) => void;
  onChanged: () => void;
  onReplied: () => void;
};

function CommentThread({ target, comment, viewerName, isReplying, onReply, onChanged, onReplied }: ThreadProps) {
  const openReply = () => onReply(isReplying ? null : comment.commentId);
  return (
    <li className="space-y-2">
      <DiscussionCommentCard target={target} comment={comment} onReply={openReply} onChanged={onChanged} />
      {comment.replies.length || isReplying ? (
        <ul className="ml-3 space-y-2 border-l border-white/10 pl-3 sm:ml-6 sm:pl-4">
          {comment.replies.map((reply) => (
            <li key={reply.commentId}>
              <DiscussionCommentCard target={target} comment={reply} onReply={() => onReply(comment.commentId)} onChanged={onChanged} />
            </li>
          ))}
          {isReplying ? (
            <li>
              <DiscussionCommentForm target={target} parentCommentId={comment.commentId} placeholder="Ваша відповідь" viewerName={viewerName} onDone={onReplied} />
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}

function useDiscussion(target: string) {
  const [loaded, setLoaded] = useState<{ target: string; discussion: DiscussionView | null } | null>(null);

  const reload = useCallback(() => {
    fetchDiscussion(target)
      .then((discussion) => setLoaded({ target, discussion }))
      .catch((error: unknown) => console.error("Не вдалося завантажити обговорення", error));
  }, [target]);

  useEffect(reload, [reload]);

  return { discussion: loaded?.target === target ? loaded.discussion : undefined, reload };
}
