import { ContentImage } from "@/components/no-ai/ContentImage";
import type { RatingTone } from "@/lib/optimization/article-view";
import { cn } from "@/lib/utils";

const ANALYST_SPRITE_SIZE = 96;
const ANALYST_EYE_SIZE = 20;

export function AnalystAvatar({ tone = "none", scale = 1, className }: { tone?: RatingTone; scale?: 1 | 2; className?: string }) {
  const size = ANALYST_SPRITE_SIZE * scale;
  return <ContentImage src={`/images/rpgbot/analyst-${tone}.png`} alt="" width={size} height={size} unoptimized className={cn("shrink-0 [image-rendering:pixelated]", className)} />;
}

export function AnalystEye({ tone, className }: { tone: RatingTone; className?: string }) {
  return <ContentImage src={`/images/rpgbot/eye-${tone}.png`} alt="" width={ANALYST_EYE_SIZE} height={ANALYST_EYE_SIZE} unoptimized className={cn("shrink-0 [image-rendering:pixelated]", className)} />;
}
