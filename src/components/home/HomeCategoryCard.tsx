"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { HomeCoverImage } from "./HomeCoverImage";
import { OrnateFrame, StarDivider } from "./OrnateFrame";
import { HOME_ACCENTS, HOME_HERO_RATIO, HOME_TILE_RATIO } from "./homeTokens";
import type { HomeCardTier, HomeCategory } from "./homeCategories";

type TierStyle = {
  ratio: number;
  notchSize: number;
  titleClassName: string;
  captionClassName: string;
  dividerClassName: string;
  imageSizes: string;
};

const TIER_STYLES: Record<HomeCardTier, TierStyle> = {
  hero: {
    ratio: HOME_HERO_RATIO,
    notchSize: 14,
    titleClassName: "text-base tracking-[0.16em] sm:text-2xl sm:tracking-[0.2em] lg:text-3xl",
    captionClassName: "px-2 pb-3 pt-2.5 sm:pb-4 sm:pt-3",
    dividerClassName: "mt-2 w-24 sm:mt-3 sm:w-36",
    imageSizes: "(max-width: 767px) 46vw, 700px",
  },
  tile: {
    ratio: HOME_TILE_RATIO,
    notchSize: 9,
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
  category: HomeCategory;
  priority?: boolean;
};

export function HomeCategoryCard({ category, priority }: HomeCategoryCardProps) {
  const style = TIER_STYLES[category.tier];
  const accent = HOME_ACCENTS[category.accent];

  return (
    <motion.div variants={cardMotion}>
      <Link
        href={category.href}
        className="group block transition-transform duration-300 ease-out hover:-translate-y-1"
      >
        <OrnateFrame accent={category.accent} notchSize={style.notchSize}>
          <div className="flex h-full w-full flex-col">
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: style.ratio }}>
              <HomeCoverImage
                src={category.imageSrc}
                sizes={style.imageSizes}
                priority={priority}
                className="saturate-[0.75] transition-transform duration-500 ease-out group-hover:scale-[1.04] group-hover:saturate-100"
              />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0b0a11] via-[#0b0a11]/45 to-transparent" />
            </div>

            <div className={cn("text-center", style.captionClassName)}>
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
                accent={category.accent}
                className={cn("mx-auto", style.dividerClassName)}
              />
            </div>
          </div>
        </OrnateFrame>
      </Link>
    </motion.div>
  );
}
