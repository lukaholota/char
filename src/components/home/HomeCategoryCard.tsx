"use client";

import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { HomeCoverImage } from "./HomeCoverImage";
import { OrnateFrame, type ChamferSize, type FrameWeight } from "@/components/ui/OrnateFrame";
import { StarDivider } from "@/components/ui/StarDivider";
import { useVisibleImageSrc } from "@/components/no-ai/ContentImage";
import { HOME_ACCENTS, HOME_HERO_RATIO, HOME_TILE_RATIO } from "./homeTokens";
import type { HomeCard, HomeCardTier } from "./homeCategories";

type TierStyle = {
  ratio: number;
  chamfer: ChamferSize;
  frameWeight: FrameWeight;
  titleClassName: string;
  captionClassName: string;
  dividerClassName: string;
  imageSizes: string;
};

const TIER_STYLES: Record<HomeCardTier, TierStyle> = {
  hero: {
    ratio: HOME_HERO_RATIO,
    chamfer: "lg",
    frameWeight: "bold",
    titleClassName: "text-base tracking-[0.16em] sm:text-2xl sm:tracking-[0.2em] lg:text-3xl",
    captionClassName: "px-2 pb-3 pt-2.5 sm:pb-4 sm:pt-3",
    dividerClassName: "mt-2 w-24 sm:mt-3 sm:w-36",
    imageSizes: "(max-width: 767px) 46vw, 700px",
  },
  tile: {
    ratio: HOME_TILE_RATIO,
    chamfer: "sm",
    frameWeight: "regular",
    titleClassName: "text-[10px] tracking-[0.1em] sm:text-xs sm:tracking-[0.12em]",
    captionClassName: "px-1 pb-1.5 pt-1.5",
    dividerClassName: "mt-1 w-12 sm:w-14",
    imageSizes: "(max-width: 639px) 31vw, (max-width: 1279px) 22vw, 260px",
  },
};

const cardMotion = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
} as const;

type HomeCategoryCardProps = {
  card: HomeCard;
  priority?: boolean;
  className?: string;
};

export function HomeCategoryCard({ card, priority, className }: HomeCategoryCardProps) {
  const { category } = card;
  const style = TIER_STYLES[card.tier];
  const accent = HOME_ACCENTS[category.accent];
  const coverSrc = useVisibleImageSrc(card.imageSrc, card.noAiImageSrc);

  return (
    <motion.div variants={cardMotion} className={className}>
      <Link
        href={category.href}
        navigateOnFirstTouch={category.slug === "characters"}
        className="group block transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:outline-none"
      >
        <OrnateFrame
          chamfer={style.chamfer}
          weight={style.frameWeight}
          hoverGlowColor={accent.glowColor}
        >
          <div className="flex h-full w-full flex-col">
            {coverSrc ? (
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: style.ratio }}>
                <HomeCoverImage
                  src={coverSrc}
                  alt={category.title}
                  sizes={style.imageSizes}
                  priority={priority}
                  className="saturate-[0.75] transition-transform duration-500 ease-out group-hover:scale-[1.04] group-hover:saturate-100"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0b0a11] via-[#0b0a11]/45 to-transparent" />
              </div>
            ) : null}

            <div className={cn("text-center", coverSrc ? style.captionClassName : "px-3 py-5")}>
              <h2
                className={cn(
                  "font-rpg-display uppercase leading-tight text-slate-100 transition-colors duration-300",
                  style.titleClassName,
                  accent.hoverTextClassName,
                )}
              >
                {category.title}
              </h2>
              <StarDivider
                className={cn("mx-auto", accent.textClassName, style.dividerClassName)}
              />
            </div>
          </div>
        </OrnateFrame>
      </Link>
    </motion.div>
  );
}
