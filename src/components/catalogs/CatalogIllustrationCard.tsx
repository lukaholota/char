"use client";

import type { ComponentType, KeyboardEvent, ReactNode } from "react";

import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { PlainTitleCard } from "@/components/no-ai/PlainTitleCard";
import { useIsArtHidden } from "@/components/no-ai/ContentImage";
import { pickEditionAccent } from "@/components/ui/edition-accent";
import { cn } from "@/lib/utils";

type CatalogIllustrationCardProps = {
  imageSrc?: string | null;
  title: string;
  englishTitle?: string;
  meta: ReactNode;
  fallbackIcon: ComponentType<{ className?: string }>;
  is2024: boolean;
  isSelected: boolean;
  onSelect: () => void;
};

export function CatalogIllustrationCard({
  imageSrc,
  title,
  englishTitle,
  meta,
  fallbackIcon: FallbackIcon,
  is2024,
  isSelected,
  onSelect,
}: CatalogIllustrationCardProps) {
  const isArtHidden = useIsArtHidden(imageSrc);
  const accent = pickEditionAccent(is2024);

  const selectOnEnterOrSpace = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={selectOnEnterOrSpace}
      className={cn(
        "group w-full cursor-pointer select-none transition-transform duration-300 focus-visible:outline-none data-[selected=false]:hover:-translate-y-0.5",
        isArtHidden ? null : "aspect-[16/9]",
      )}
      data-selected={isSelected}
    >
      {isArtHidden ? (
        <PlainTitleCard
          title={title}
          englishTitle={englishTitle}
          meta={meta}
          isSelected={isSelected}
          selectedTitleClassName={accent.titleClassName}
          hoverTitleClassName={accent.hoverTitleClassName}
          highlightColor={isSelected ? accent.ringColor : null}
          glowColor={isSelected ? accent.glowColor : null}
        />
      ) : (
      <FramedIllustration
        src={imageSrc}
        alt={title}
        sizes="(max-width: 1023px) 100vw, 620px"
        chamfer="md"
        vignette="lg"
        highlightColor={isSelected ? accent.ringColor : null}
        glowColor={isSelected ? accent.glowColor : null}
        imageClassName="object-top transition-transform duration-500 group-hover:scale-[1.03]"
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
            <FallbackIcon className="h-12 w-12 text-slate-600" />
          </div>
        }
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#0b0a11] via-[#0b0a11]/60 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 z-10 p-4">
          <h3
            className={cn(
              "font-rpg-display text-xl uppercase leading-tight tracking-[0.08em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] transition-colors duration-200 sm:text-2xl",
              isSelected ? accent.titleClassName : cn("text-white", accent.hoverTitleClassName)
            )}
          >
            {title}
          </h3>
          {englishTitle ? (
            <p className="mt-0.5 font-mono text-[11px] tracking-wide text-slate-300/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
              [{englishTitle}]
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
            {meta}
          </div>
        </div>
      </FramedIllustration>
      )}
    </div>
  );
}
