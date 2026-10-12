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

export function RatingBadge({ rating, className }: { rating: Pick<AnalysisRating, "score" | "context">; className?: string }) {
  const description = describeRating(rating);
  return (
    <HoverHint text={description.hint}>
      <span
        data-rating-tone={description.tone}
        className={cn("mr-2 inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 align-baseline font-sans text-xs font-semibold", RATING_TONE_CLASSES[description.tone], className)}
      >
        <span className="sr-only">{description.summary}. </span>
        <AnalystEye tone={description.tone} className="-my-0.5 -ml-0.5" />
        <span aria-hidden>{description.score === undefined ? "—" : `${description.score}/4`} {description.label}</span>
      </span>
    </HoverHint>
  );
}
