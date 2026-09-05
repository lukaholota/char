"use client";

import type { ReactNode } from "react";

import { ContentImage } from "@/components/no-ai/ContentImage";
import { OrnateFrame, type ChamferSize } from "@/components/ui/OrnateFrame";
import type { ImageProvenance } from "@/lib/assets/asset-provenance";
import { cn } from "@/lib/utils";

export type VignetteSize = "sm" | "md" | "lg";

/// Арти каталогів намальовані різними моделями в різних стилях, часто на світлому тлі, і на темній
/// панелі вони відклеюються від сцени. Приглушена насиченість плюс затемнення по краях садять їх
/// назад. Радіус росте разом із картинкою: на 88 px тінь із деталі зʼїла б половину кадру.
const VIGNETTE_SHADOW: Record<VignetteSize, string> = {
  sm: "inset 0 0 18px rgba(3,2,8,0.55)",
  md: "inset 0 0 32px rgba(3,2,8,0.5)",
  lg: "inset 0 0 46px rgba(3,2,8,0.5)",
};

const TAMED_SATURATION = "saturate-[0.85]";

type FramedIllustrationProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  chamfer?: ChamferSize;
  vignette?: VignetteSize;
  provenance?: ImageProvenance;
  priority?: boolean;
  imageClassName?: string;
  frameClassName?: string;
  highlightColor?: string | null;
  glowColor?: string | null;
  hoverGlowColor?: string | null;
  fallback?: ReactNode;
  children?: ReactNode;
};

export function FramedIllustration({
  src,
  alt,
  sizes,
  chamfer = "sm",
  vignette = "sm",
  provenance,
  priority = false,
  imageClassName,
  frameClassName,
  highlightColor,
  glowColor,
  hoverGlowColor,
  fallback,
  children,
}: FramedIllustrationProps) {
  return (
    <OrnateFrame
      chamfer={chamfer}
      highlightColor={highlightColor}
      glowColor={glowColor}
      hoverGlowColor={hoverGlowColor}
      className={frameClassName}
    >
      {src ? (
        <>
          <ContentImage
            src={src}
            alt={alt}
            provenance={provenance}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className={cn("object-cover", TAMED_SATURATION, imageClassName)}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: VIGNETTE_SHADOW[vignette] }}
          />
        </>
      ) : (
        fallback
      )}
      {children}
    </OrnateFrame>
  );
}
