import { ArrowUpRight, BookOpen } from "lucide-react";
import { ModeLink } from "@/components/no-ai/ModeLink";
import type { LinkCardView } from "@/lib/optimization/inline-view";
import type { AnalysisRating } from "@/lib/optimization/types";
import { cn } from "@/lib/utils";
import { RatingBadge } from "./RatingBadge";

const CARD_CLASSES = "group flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2.5 font-sans no-underline hover:border-white/30 hover:bg-slate-900/80";

export function LinkCardGrid({ cards, accentClassName }: { cards: readonly LinkCardView[]; accentClassName: string }) {
  return (
    <ul className="grid list-none gap-2 pl-0 sm:grid-cols-2">
      {cards.map((card, index) => (
        <li key={index}><LinkCard card={card} accentClassName={accentClassName} className="h-full" /></li>
      ))}
    </ul>
  );
}

type LinkCardProps = { card: LinkCardView; accentClassName: string; className?: string; rating?: Pick<AnalysisRating, "score" | "context"> };

export function LinkCard({ card, accentClassName, className, rating }: LinkCardProps) {
  const Icon = card.isExternal ? ArrowUpRight : BookOpen;
  const body = (
    <>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5", accentClassName)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-snug text-slate-100">{card.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          {rating ? <RatingBadge rating={rating} className="mr-0" /> : null}
          {card.source}
        </span>
      </span>
    </>
  );
  const classes = cn(CARD_CLASSES, className);
  if (card.isExternal) return <a href={card.href} className={classes} target="_blank" rel="noreferrer" data-link-card>{body}</a>;
  return <ModeLink href={card.href} className={classes} data-link-card>{body}</ModeLink>;
}
