"use client";

import Image from "next/image";
import { ComponentProps, ComponentType, useId } from "react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { ImageProvenance, findImageProvenance } from "@/lib/assets/asset-provenance";
import { useNoAiMode } from "./NoAiModeProvider";

type Props = Omit<ComponentProps<typeof Image>, "src" | "alt"> & {
  src: string;
  alt: string;
  /** Overrides the path-based guess — for images whose address says nothing (DB columns, remote art). */
  provenance?: ImageProvenance;
  fallbackIcon?: ComponentType<{ className?: string }>;
  fallbackGradient?: string;
  fallbackTint?: string;
};

/**
 * Renders an illustration unless the viewer asked for a site without generated art,
 * in which case a drawn-free ornament takes its place. Every full-bleed illustration
 * should go through here — a bare `next/image` is invisible to the mode.
 */
export function ContentImage({
  src,
  alt,
  provenance,
  fallbackIcon,
  fallbackGradient,
  fallbackTint,
  className,
  ...imageProps
}: Props) {
  const { enabled } = useNoAiMode();
  const source = provenance ?? findImageProvenance(src);

  if (enabled && source === "ai") {
    return (
      <OrnamentCover
        seed={alt}
        icon={fallbackIcon}
        gradient={fallbackGradient}
        tint={fallbackTint}
        className={className}
      />
    );
  }

  return <Image src={src} alt={alt} className={className} {...imageProps} />;
}

type OrnamentProps = {
  seed: string;
  icon?: ComponentType<{ className?: string }>;
  gradient?: string;
  tint?: string;
  className?: string;
};

const DEFAULT_GRADIENT = "from-slate-900 via-slate-950 to-slate-950";
const DEFAULT_TINT = "rgba(45, 212, 191, 0.22)";

function OrnamentCover({ seed, icon, gradient, tint, className }: OrnamentProps) {
  const patternId = useId();
  const motif = pickMotif(seed);
  const Icon = icon ?? Sparkles;

  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 overflow-hidden bg-gradient-to-br",
        gradient ?? DEFAULT_GRADIENT,
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 22% 12%, ${tint ?? DEFAULT_TINT}, transparent 62%)`,
        }}
      />

      <svg className="absolute inset-0 h-full w-full text-white/[0.13]" aria-hidden>
        <defs>
          <pattern id={patternId} width="44" height="44" patternUnits="userSpaceOnUse">
            {renderMotif(motif)}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      <div className="pointer-events-none absolute -right-6 -top-6 text-white/[0.07]">
        <Icon className="h-44 w-44 -rotate-6" />
      </div>

      <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />
    </div>
  );
}

type Motif = "lattice" | "scales" | "sigil";

const MOTIFS: readonly Motif[] = ["lattice", "scales", "sigil"];

function pickMotif(seed: string): Motif {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  }
  return MOTIFS[hash % MOTIFS.length];
}

function renderMotif(motif: Motif) {
  const stroke = { stroke: "currentColor", strokeWidth: 1, fill: "none" } as const;

  if (motif === "scales") {
    return (
      <>
        <path d="M-22 22a22 22 0 0 0 44 0M0 22a22 22 0 0 0 44 0" {...stroke} />
        <path d="M-22 44a22 22 0 0 0 44 0M0 44a22 22 0 0 0 44 0" {...stroke} />
      </>
    );
  }

  if (motif === "sigil") {
    return (
      <>
        <circle cx="22" cy="22" r="9" {...stroke} />
        <circle cx="22" cy="22" r="2" fill="currentColor" />
        <path d="M22 0v6M22 38v6M0 22h6M38 22h6" {...stroke} />
      </>
    );
  }

  return (
    <>
      <path d="M0 44L44 0M-11 11L11 -11M33 55L55 33" {...stroke} />
      <path d="M0 0l44 44M33 -11l22 22M-11 33l22 22" {...stroke} />
    </>
  );
}
