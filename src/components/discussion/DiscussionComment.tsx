"use client";

import { useState, useTransition } from "react";
import { Flag, Loader2, MessageSquareReply, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addContentComment, deleteContentComment, voteContentComment } from "@/lib/actions/content-discussion-actions";
import type { DiscussionCommentView, DiscussionViewerName } from "@/lib/logic/content-discussion";
import { SITE_OWNER_BADGE } from "@/lib/logic/site-owner";
import { MAX_COMMENT_LENGTH } from "@/rules/discussion-limits";
import { DisplayNameDialog } from "./DisplayNameDialog";
import { ReportDialog } from "./ReportDialog";
import { useSignInGate } from "./useSignInGate";
import { VoteControl } from "./VoteControl";

type CommentCardProps = { target: string; comment: DiscussionCommentView; onReply: () => void; onChanged: () => void };

export function DiscussionCommentCard({ target, comment, onReply, onChanged }: CommentCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isReporting, setReporting] = useState(false);
  const [isRenaming, setRenaming] = useState(false);
  const { requireSignIn, signInDialog } = useSignInGate();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteContentComment(comment.commentId);
      if (!result.success) return void toast.error(result.error);
      onChanged();
    });

  if (comment.isDeleted) {
    return <p className="rounded-xl border border-white/5 bg-slate-900/30 p-3 text-sm italic text-slate-500">{comment.body}</p>;
  }

  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
      <header className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-200">{comment.authorName}</span>
        {comment.isOwn ? (
          <Button type="button" variant="ghost" size="icon" className="-my-2 h-9 w-9 text-slate-400" aria-label="Змінити свій нік" onClick={() => setRenaming(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {comment.isSiteOwner ? <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">{SITE_OWNER_BADGE}</span> : null}
        <time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
      </header>
      <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{comment.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <VoteControl
          size="sm"
          score={comment.score}
          myVote={comment.myVote}
          blockedReason={comment.isOwn ? "За свій коментар голосувати не можна" : null}
          onVote={(value) => voteContentComment(comment.commentId, value)}
        />
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 px-2 text-xs text-slate-300" onClick={() => requireSignIn(onReply)}>
          <MessageSquareReply className="h-4 w-4" />
          Відповісти
        </Button>
        {comment.isOwn ? null : (
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 px-2 text-xs text-slate-400" onClick={() => requireSignIn(() => setReporting(true))}>
            <Flag className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Поскаржитися</span>
          </Button>
        )}
        {comment.canDelete ? (
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 px-2 text-xs text-rose-300" disabled={isPending} onClick={remove}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Видалити</span>
          </Button>
        ) : null}
      </div>
      <ReportDialog target={target} commentId={comment.commentId} open={isReporting} onOpenChange={setReporting} />
      <DisplayNameDialog open={isRenaming} suggestion={comment.authorName} onOpenChange={setRenaming} onSaved={onChanged} />
      {signInDialog}
    </article>
  );
}

type CommentFormProps = { target: string; parentCommentId: number | null; placeholder: string; viewerName: DiscussionViewerName | null; onDone: () => void };

export function DiscussionCommentForm({ target, parentCommentId, placeholder, viewerName, onDone }: CommentFormProps) {
  const [body, setBody] = useState("");
  const [isAskingName, setAskingName] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { isSignedIn, requireSignIn, signInDialog } = useSignInGate();

  const needsName = isSignedIn && !viewerName?.displayName;

  const post = () =>
    startTransition(async () => {
      const result = await addContentComment({ target, body, parentCommentId });
      if (!result.success) return void toast.error(result.error);
      setBody("");
      onDone();
    });

  const submit = () => requireSignIn(() => (needsName ? setAskingName(true) : post()));

  return (
    <div className="space-y-2">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={MAX_COMMENT_LENGTH}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-20 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-base text-slate-100 outline-none focus:ring-1 focus:ring-white/20 sm:text-sm"
      />
      <div className="flex justify-end">
        <Button type="button" className="h-11 w-full sm:h-9 sm:w-auto" disabled={isPending || !body.trim()} onClick={submit}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Надіслати"}
        </Button>
      </div>
      <DisplayNameDialog
        open={isAskingName}
        suggestion={viewerName?.suggestion ?? ""}
        confirmLabel="Зберегти й надіслати"
        onOpenChange={setAskingName}
        onSaved={post}
      />
      {signInDialog}
    </div>
  );
}

function formatCommentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
}
