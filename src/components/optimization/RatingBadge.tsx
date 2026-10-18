import { describeRating, type RatingTone } from "@/lib/optimization/article-view";
import type { AnalysisRating } from "@/lib/optimization/types";
import { HoverHint } from "@/components/ui/HoverHint";
import { cn } from "@/lib/utils";
import { AnalystEye } from "./AnalystAvatar";

export const RATING_TONE_CLASSES: Record<RatingTone, string> = {
  red: "border-rose-400/40 bg-rose-500/15 text-rose-200",
  orange: "border-orange-400/40 bg-orange-500/15 text-orange-200",
  green: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  blue: "border-sky-400/40 bg-sky-500/15 text-sky-200",
  none: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

export const RATING_LABEL_CLASSES: Record<RatingTone, string> = {
  red: "text-rose-300",
  orange: "text-orange-300",
  green: "text-emerald-300",
  blue: "text-sky-300",
  none: "text-slate-100",
};

type RatingView = Pick<AnalysisRating, "score" | "context"> & { alternative?: Pick<NonNullable<AnalysisRating["alternative"]>, "score" | "condition"> };

export function RatingBadge({ rating, className }: { rating: RatingView; className?: string }) {
  const { alternative } = rating;
  if (!alternative) return <ScoreBadge rating={rating} className={className} />;
  return (
    <span className={cn("mr-2 inline-flex min-w-0 max-w-full flex-wrap items-center gap-1 align-baseline", className)}>
      <ScoreBadge rating={rating} className="mr-0" />
      <ScoreBadge rating={{ score: alternative.score, context: rating.context }} caption={alternative.condition} className="mr-0" />
    </span>
  );
}

function ScoreBadge({ rating, caption, className }: { rating: Pick<AnalysisRating, "score" | "context">; caption?: string; className?: string }) {
  const description = describeRating(rating);
  return (
    <HoverHint text={description.hint}>
      <span
        data-rating-tone={description.tone}
        className={cn("mr-2 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 align-baseline font-sans text-xs font-semibold", caption ? "min-w-0 max-w-full flex-wrap text-left" : "whitespace-nowrap", RATING_TONE_CLASSES[description.tone], className)}
      >
        <span className="sr-only">{caption ? `${caption}: ` : ""}{description.summary}. </span>
        <AnalystEye tone={description.tone} className="-my-0.5 -ml-0.5" />
        {caption && <span aria-hidden className="min-w-0 break-words font-normal">{caption}</span>}
        <span aria-hidden className="whitespace-nowrap">{description.score === undefined ? "—" : `${description.score}/4`} {description.label}</span>
      </span>
    </HoverHint>
  );
}
