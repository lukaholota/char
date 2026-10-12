"use client";

import { ModeLink as Link, useLinkStatus } from "@/components/no-ai/ModeLink";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { TAPPABLE_HIDDEN_OPACITY } from "@/lib/tappable-entrance";

import { cn } from "@/lib/utils";
import { HomeCoverImage } from "./HomeCoverImage";
import { OrnateFrame, type ChamferSize, type FrameWeight } from "@/components/ui/OrnateFrame";
import { StarDivider } from "@/components/ui/StarDivider";
import { useVisibleImageSrc } from "@/components/no-ai/ContentImage";
import { HOME_ACCENTS, HOME_HERO_RATIO, HOME_TILE_RATIO } from "./homeTokens";
import type { HomeCard, HomeCardTier } from "./homeCategories";
import { buildRpgbotCtaProps } from "@/lib/monitoring/rpgbot-analytics-model";

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
  hidden: { opacity: TAPPABLE_HIDDEN_OPACITY, y: 18 },
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
    <motion.div variants={cardMotion} data-entrance-layer className={className}>
      <Link
        href={category.href}
        {...(category.slug === "rpgbot" ? buildRpgbotCtaProps("open_index", "home_tile") : {})}
        // A long press lifts a snapshot of the clipped, filtered frame for a preview or drag; phones draw it black and leave traces.
        draggable={false}
        className="group relative block select-none [-webkit-touch-callout:none] transition-transform duration-300 ease-out hover:-translate-y-1 active:opacity-80 focus-visible:outline-none"
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
        <CardPendingIndicator />
      </Link>
    </motion.div>
  );
}

function CardPendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <Loader2 aria-hidden className="h-9 w-9 animate-spin rounded-full bg-black/60 p-2 text-slate-100" />
      <span className="sr-only">Завантаження сторінки</span>
    </span>
  );
}
