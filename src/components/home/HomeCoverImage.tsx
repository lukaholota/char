"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { ContentImage } from "@/components/no-ai/ContentImage";

type HomeCoverImageProps = {
  src: string;
  noAiSrc?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/// Covers are produced outside this code, so a slug may have no file yet. A miss falls back to
/// the painted placeholder instead of a broken image.
export function HomeCoverImage({ src, noAiSrc, alt, sizes, priority, className }: HomeCoverImageProps) {
  const [isMissing, setIsMissing] = useState(false);

  return (
    <>
      <CoverPlaceholder />
      {isMissing ? null : (
        <ContentImage
          src={src}
          noAiSrc={noAiSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setIsMissing(true)}
          className={cn("object-cover", className)}
        />
      )}
    </>
  );
}

function CoverPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_15%,rgba(129,105,190,0.32),rgba(24,20,34,0.9)_58%,rgba(9,8,13,1)_100%)]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0)_45%)]" />
    </div>
  );
}
