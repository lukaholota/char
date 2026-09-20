"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { toast } from "sonner";
import { buildOptimisticVote, type VoteValue } from "@/lib/logic/content-discussion";
import { cn } from "@/lib/utils";
import { useSignInGate } from "./useSignInGate";

type VoteResult = { success: true; score: number; myVote: VoteValue } | { success: false; error: string };

type Props = {
  score: number;
  myVote: VoteValue;
  blockedReason: string | null;
  onVote: (value: VoteValue) => Promise<VoteResult>;
  size?: "md" | "sm";
};

export function VoteControl({ score, myVote, blockedReason, onVote, size = "md" }: Props) {
  const [state, setState] = useState({ score, myVote });
  const latestRequest = useRef(0);
  const { requireSignIn, signInDialog } = useSignInGate();

  useEffect(() => setState({ score, myVote }), [score, myVote]);

  const vote = (value: 1 | -1) =>
    requireSignIn(() => {
      const previous = state;
      const next = buildOptimisticVote(previous, previous.myVote === value ? 0 : value);
      const request = ++latestRequest.current;
      setState(next);
      void onVote(next.myVote).then((result) => {
        if (request !== latestRequest.current) return;
        if (!result.success) {
          setState(previous);
          return void toast.error(result.error);
        }
        setState({ score: result.score, myVote: result.myVote });
      });
    });

  const isSmall = size === "sm";
  return (
    <div className={cn("inline-flex items-center rounded-xl border border-white/10 bg-slate-900/60", isSmall ? "gap-0.5 p-0.5" : "gap-1 p-1")} role="group" aria-label="Рейтинг">
      <VoteButton tone="up" isActive={state.myVote === 1} isSmall={isSmall} blockedReason={blockedReason} disabled={Boolean(blockedReason)} onClick={() => vote(1)} />
      <span className={cn("text-center font-bold tabular-nums", isSmall ? "min-w-6 text-sm" : "min-w-8 text-base", toneOfScore(state.score))} aria-live="polite">
        {state.score}
      </span>
      <VoteButton tone="down" isActive={state.myVote === -1} isSmall={isSmall} blockedReason={blockedReason} disabled={Boolean(blockedReason)} onClick={() => vote(-1)} />
      {signInDialog}
    </div>
  );
}

function VoteButton(props: { tone: "up" | "down"; isActive: boolean; isSmall: boolean; blockedReason: string | null; disabled: boolean; onClick: () => void }) {
  const Icon = props.tone === "up" ? ArrowBigUp : ArrowBigDown;
  const label = props.tone === "up" ? "Подобається" : "Не подобається";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={props.isActive}
      title={props.blockedReason ?? label}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        "flex items-center justify-center rounded-lg transition disabled:opacity-40",
        props.isSmall ? "h-9 w-9" : "h-10 w-10",
        props.isActive ? (props.tone === "up" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300") : "text-slate-400 hover:bg-white/10 hover:text-slate-100",
      )}
    >
      <Icon className={cn(props.isSmall ? "h-5 w-5" : "h-6 w-6", props.isActive && "fill-current")} />
    </button>
  );
}

function toneOfScore(score: number): string {
  if (score > 0) return "text-emerald-300";
  return score < 0 ? "text-rose-300" : "text-slate-300";
}
