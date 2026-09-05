"use client";

import React, { ReactNode } from "react";
import clsx from "clsx";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { PlainTitleCard } from "@/components/no-ai/PlainTitleCard";
import { useIsArtHidden } from "@/components/no-ai/ContentImage";
import { pickEditionAccent } from "@/components/ui/edition-accent";
import { CreationVisual } from "./creation-visuals";

export interface CreationCardProps {
  testId?: string;
  title: string;
  englishTitle?: string;
  visual: CreationVisual;
  isSelected?: boolean;
  is2024?: boolean;
  sourceCode?: string | null;
  infoModal?: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  imagePriority?: boolean;
}

export const CreationCard: React.FC<CreationCardProps> = ({
  testId,
  title,
  englishTitle,
  visual,
  isSelected = false,
  is2024 = false,
  infoModal,
  onClick,
  className,
  imagePriority = false,
}) => {
  const isArtHidden = useIsArtHidden(visual.imageSrc);
  const accent = pickEditionAccent(is2024);

  if (isArtHidden) {
    return (
      <div
        data-testid={testId}
        onClick={onClick}
        className={clsx(
          "group relative w-full cursor-pointer select-none text-left transition-transform duration-300",
          !isSelected && "hover:-translate-y-0.5",
          className
        )}
      >
        <PlainTitleCard
          title={title}
          englishTitle={englishTitle}
          isSelected={isSelected}
          selectedTitleClassName={accent.titleClassName}
          hoverTitleClassName={accent.hoverTitleClassName}
          highlightColor={isSelected ? accent.ringColor : null}
          glowColor={isSelected ? accent.glowColor : null}
        />
        {infoModal}
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={clsx(
        "group relative aspect-[16/10] min-h-[190px] w-full cursor-pointer select-none text-left transition-transform duration-300 sm:aspect-[16/9] sm:min-h-[220px]",
        !isSelected && "hover:-translate-y-0.5",
        className
      )}
    >
      <FramedIllustration
        src={visual.imageSrc}
        alt={title}
        sizes="(max-width: 768px) 100vw, 50vw"
        chamfer="md"
        vignette="lg"
        priority={imagePriority}
        highlightColor={isSelected ? accent.ringColor : null}
        glowColor={isSelected ? accent.glowColor : null}
        imageClassName="object-center transition-transform duration-500 group-hover:scale-105"
        fallback={<AmbientBackdrop visual={visual} />}
      >
        {visual.imageSrc ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        ) : null}

        {infoModal && (
          <div
            data-stop-card-click
            className="absolute right-3 top-3 z-20 shrink-0 drop-shadow-md [&>div]:static"
          >
            {infoModal}
          </div>
        )}

        {!visual.imageSrc && <TopLeftIconBadge visual={visual} />}

        <div className="absolute inset-x-0 bottom-0 z-10 p-4">
          <div
            className={clsx(
              "font-rpg-display text-xl uppercase leading-tight tracking-[0.08em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] transition-colors duration-200 sm:text-2xl",
              isSelected ? accent.titleClassName : clsx("text-white", accent.hoverTitleClassName)
            )}
          >
            {title}
          </div>
          {englishTitle && (
            <div className="mt-0.5 font-mono text-[11px] tracking-wide text-slate-300/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
              {englishTitle}
            </div>
          )}
        </div>
      </FramedIllustration>
    </div>
  );
};

function AmbientBackdrop({ visual }: { visual: CreationVisual }) {
  const Icon = visual.icon;

  return (
    <>
      <div
        className={clsx(
          "absolute inset-0 bg-gradient-to-br opacity-90 transition-opacity duration-300 group-hover:opacity-100",
          visual.bgGradient
        )}
      />
      <div className="pointer-events-none absolute -right-3 -top-3 overflow-hidden text-white/[0.08] transition-all duration-500 group-hover:scale-110 group-hover:text-white/[0.14]">
        <Icon className="h-36 w-36 -rotate-6 transform" />
      </div>
    </>
  );
}

function TopLeftIconBadge({ visual }: { visual: CreationVisual }) {
  const Icon = visual.icon;

  return (
    <div className="absolute left-3 top-3 z-10">
      <div
        className={clsx(
          "flex h-7 w-7 items-center justify-center rounded-md border",
          visual.badgeClass
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

export default CreationCard;
