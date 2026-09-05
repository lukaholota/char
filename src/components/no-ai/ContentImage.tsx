"use client";

import Image from "next/image";
import { ComponentProps } from "react";

import { ImageProvenance, findImageProvenance, findVisibleImageSrc } from "@/lib/assets/asset-provenance";
import { useNoAiMode } from "./NoAiModeProvider";

type Props = Omit<ComponentProps<typeof Image>, "src" | "alt"> & {
  src: string;
  alt: string;
  /** Overrides the path-based guess — for images whose address says nothing (DB columns, remote art). */
  provenance?: ImageProvenance;
  /** Manual illustration to draw instead of hiding this one in the no-AI mode. */
  noAiSrc?: string | null;
};

/**
 * Renders an illustration unless the viewer asked for a site without generated art, in which case
 * nothing is drawn at all. Callers that reserve space for a picture must ask `useIsArtHidden`
 * first and lay themselves out without it — a decorated placeholder is not wanted
 * (owner, 2026-08-28).
 */
export function ContentImage({ src, alt, provenance, noAiSrc, ...imageProps }: Props) {
  const visibleSrc = useVisibleImageSrc(src, noAiSrc, provenance);
  if (!visibleSrc) return null;

  return <Image src={visibleSrc} alt={alt} {...imageProps} />;
}

export function useVisibleImageSrc(
  src?: string | null,
  noAiSrc?: string | null,
  provenance?: ImageProvenance,
): string | null {
  const { enabled } = useNoAiMode();
  return findVisibleImageSrc({ src, noAiSrc, isNoAiMode: enabled, provenance });
}

export function useIsArtHidden(src?: string | null, provenance?: ImageProvenance): boolean {
  const { enabled } = useNoAiMode();
  return enabled && (provenance ?? findImageProvenance(src)) === "ai";
}
