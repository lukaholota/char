"use client";

import type { ReactNode } from "react";

import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { useIsArtHidden } from "@/components/no-ai/ContentImage";
import type { ImageProvenance } from "@/lib/assets/asset-provenance";

/// Один розмір і одне кадрування мініатюри для списків усіх каталогів — бестіарію, рас, класів.
/// Кадрування від верху, бо в усіх трьох корпусах арт портретний: центр обрізав би голову.
export function CatalogMedallion({
  src,
  alt,
  provenance,
  fallback,
}: {
  src?: string | null;
  alt: string;
  provenance?: ImageProvenance;
  fallback: ReactNode;
}) {
  if (useIsArtHidden(src, provenance)) return null;

  return (
    <div className="h-[88px] w-[88px] shrink-0 self-center sm:h-24 sm:w-24">
      <FramedIllustration
        src={src}
        alt={alt}
        provenance={provenance}
        sizes="96px"
        chamfer="sm"
        vignette="sm"
        imageClassName="object-top transition-transform duration-500 group-hover:scale-105"
        fallback={fallback}
      />
    </div>
  );
}
