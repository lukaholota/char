"use client";

import React, { ReactNode } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { ContentImage } from "@/components/no-ai/ContentImage";
import { CreationVisual } from "./creation-visuals";

export interface CreationCardProps {
  testId?: string;
  title: string;
  englishTitle?: string;
  visual: CreationVisual;
  isSelected?: boolean;
  badges?: (string | null | undefined)[];
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
  badges = [],
  infoModal,
  onClick,
  className,
  imagePriority = false,
}) => {
  const IconComponent = visual.icon;
  const activeBadges = badges.filter(Boolean) as string[];

  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={clsx(
        "group relative flex aspect-[16/10] sm:aspect-[16/9] min-h-[190px] sm:min-h-[220px] w-full flex-col justify-between overflow-hidden rounded-xl border text-left transition-all duration-300 cursor-pointer select-none",
        isSelected
          ? "border-amber-400 ring-2 ring-amber-400 shadow-[0_0_28px_rgba(245,158,11,0.35)]"
          : "border-white/10 bg-slate-950 hover:border-white/40 hover:shadow-2xl hover:shadow-black/70 hover:-translate-y-0.5",
        className
      )}
    >
      {/* Background Illustration if available - 100% full original brightness */}
      {visual.imageSrc ? (
        <div className="absolute inset-0 overflow-hidden">
          <ContentImage
            src={visual.imageSrc}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={imagePriority}
            className="object-cover object-center transition-all duration-500 group-hover:scale-105"
            fallbackIcon={visual.icon}
            fallbackGradient={visual.bgGradient}
            fallbackTint={visual.glowColor}
          />
          {/* Subtle bottom gradient only behind text */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
        </div>
      ) : (
        <>
          {/* Ambient Theme Gradient Fallback */}
          <div
            className={clsx(
              "absolute inset-0 bg-gradient-to-br opacity-90 transition-opacity duration-300 group-hover:opacity-100",
              visual.bgGradient
            )}
          />

          {/* Decorative Large Watermark Icon Fallback */}
          <div className="pointer-events-none absolute -right-3 -top-3 overflow-hidden text-white/[0.08] transition-all duration-500 group-hover:scale-110 group-hover:text-white/[0.14]">
            <IconComponent className="h-36 w-36 -rotate-6 transform" />
          </div>
        </>
      )}

      {/* Pinned Top-Right Action Row (Info ? and Selected Checkmark) */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-2 drop-shadow-md">
        {isSelected && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)]">
            <Check className="h-4 w-4 stroke-[3]" />
          </div>
        )}
        {infoModal && (
          <div data-stop-card-click className="shrink-0 drop-shadow">
            {infoModal}
          </div>
        )}
      </div>

      {/* Top Left Icon (only when no custom artwork) */}
      {!visual.imageSrc && (
        <div className="relative z-10 p-3">
          <div className={clsx("flex h-7 w-7 items-center justify-center rounded-md border", visual.badgeClass)}>
            <IconComponent className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Empty flex spacer if has image so bottom content is pinned */}
      {visual.imageSrc && <div />}

      {/* Bottom Information Overlay */}
      <div className="relative z-10 flex flex-col justify-end p-4 pt-4">
        <div className="space-y-0.5">
          <div
            className={clsx(
              "text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
              isSelected ? "text-amber-300" : "text-white group-hover:text-amber-200"
            )}
          >
            {title}
          </div>
          {englishTitle && (
            <div className="text-xs font-medium text-slate-200/90 tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {englishTitle}
            </div>
          )}
        </div>

        {/* Feature Badges / Chips */}
        {activeBadges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeBadges.map((badge, idx) => (
              <span
                key={idx}
                className={clsx(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors backdrop-blur-md shadow-sm",
                  isSelected
                    ? "border-amber-400/50 bg-amber-950/70 text-amber-200"
                    : "border-white/20 bg-slate-950/70 text-slate-200 group-hover:border-white/30"
                )}
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreationCard;
