"use client";

import { useIsArtHidden } from "@/components/no-ai/ContentImage";
import { useNoAiMode } from "@/components/no-ai/NoAiModeProvider";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { cn } from "@/lib/utils";

export function BranchCover({
  src,
  alt,
  sizes,
  className,
  hiddenInNoAi = false,
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  hiddenInNoAi?: boolean;
}) {
  const { enabled: isNoAiMode } = useNoAiMode();
  const isHidden = useIsArtHidden(src);
  if (!src || isHidden || (hiddenInNoAi && isNoAiMode)) return null;

  return (
    <div className={cn("aspect-video w-full", className)}>
      <FramedIllustration src={src} alt={alt} sizes={sizes} chamfer="sm" vignette="md" />
    </div>
  );
}
