"use client";

import type { ReactNode } from "react";

import { OrnateFrame, type ChamferSize } from "@/components/ui/OrnateFrame";
import { cn } from "@/lib/utils";

type PlainTitleCardProps = {
  title: string;
  englishTitle?: string | null;
  meta?: ReactNode;
  isSelected?: boolean;
  selectedTitleClassName?: string;
  hoverTitleClassName?: string;
  highlightColor?: string | null;
  glowColor?: string | null;
  chamfer?: ChamferSize;
  frameClassName?: string;
};

/**
 * What a card looks like once its illustration is hidden: a frame and a well-set title, nothing
 * pretending to be a picture. Kept in one place so the no-AI mode reads the same on the home
 * page, in the catalogues and in the character creator.
 */
export function PlainTitleCard({
  title,
  englishTitle,
  meta,
  isSelected = false,
  selectedTitleClassName = "text-amber-300",
  hoverTitleClassName = "group-hover:text-amber-200",
  highlightColor,
  glowColor,
  chamfer = "md",
  frameClassName,
}: PlainTitleCardProps) {
  return (
    <OrnateFrame
      chamfer={chamfer}
      highlightColor={highlightColor}
      glowColor={glowColor}
      className={frameClassName}
    >
      <div className="flex h-full w-full items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-rpg-display text-lg uppercase leading-tight tracking-[0.08em] transition-colors duration-200 sm:text-xl",
              isSelected ? selectedTitleClassName : cn("text-slate-100", hoverTitleClassName),
            )}
          >
            {title}
          </h3>
          {englishTitle ? (
            <p className="mt-0.5 font-mono text-[11px] tracking-wide text-slate-500">
              [{englishTitle}]
            </p>
          ) : null}
          {meta ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              {meta}
            </div>
          ) : null}
        </div>
      </div>
    </OrnateFrame>
  );
}
