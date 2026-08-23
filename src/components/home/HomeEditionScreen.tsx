"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { Edition } from "@/rules/route-helpers";
import { HomeBackdrop } from "./HomeBackdrop";
import { HomeCategoryCard } from "./HomeCategoryCard";
import { StarDivider } from "./OrnateFrame";
import { HOME_EDITION_HEADINGS, collectHomeCategories, type HomeCategory } from "./homeCategories";
import { HOME_HERO_ROW_MAX_WIDTH, type HomeAccentName } from "./homeTokens";

const EDITION_ACCENTS: Record<Edition, HomeAccentName> = {
  "2014": "runicCyan",
  "2024": "emberGold",
};

/// A landscape phone is ~390px tall: without this the heading alone eats the room the first
/// category row needs in order to peek into the first screen (KR13.7 §6).
const HIDDEN_ON_SHORT_VIEWPORT = "[@media(max-height:560px)]:hidden";

const screenMotion = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
} as const;

const blockMotion = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
} as const;

export function HomeEditionScreen({ edition, children }: { edition: Edition; children?: ReactNode }) {
  const categories = collectHomeCategories(edition);
  const heroes = categories.filter((category) => category.tier === "hero");
  const tiles = categories.filter((category) => category.tier === "tile");

  return (
    <motion.div
      className="w-full pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-16"
      variants={screenMotion}
      initial="hidden"
      animate="show"
    >
      <HomeBackdrop />

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 pt-4 sm:gap-6 sm:px-6 sm:pt-6">
        <EditionHeading edition={edition} />
        <HeroRow heroes={heroes} />
        <TileGrid tiles={tiles} />
      </div>

      {children}
    </motion.div>
  );
}

function EditionHeading({ edition }: { edition: Edition }) {
  const heading = HOME_EDITION_HEADINGS[edition];

  return (
    <motion.header variants={blockMotion} className="text-center">
      <h1 className="font-rpg-display text-lg uppercase tracking-[0.22em] text-slate-100 sm:text-2xl md:text-3xl">
        {heading.title}
      </h1>
      <StarDivider
        accent={EDITION_ACCENTS[edition]}
        className={cn("mx-auto mt-2 w-40 sm:w-56", HIDDEN_ON_SHORT_VIEWPORT)}
      />
      <p
        className={cn(
          "mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm",
          HIDDEN_ON_SHORT_VIEWPORT,
        )}
      >
        {heading.subtitle}
      </p>
    </motion.header>
  );
}

function HeroRow({ heroes }: { heroes: HomeCategory[] }) {
  return (
    <div
      className="mx-auto grid w-full grid-cols-2 gap-3 sm:gap-6"
      style={{ maxWidth: HOME_HERO_ROW_MAX_WIDTH }}
    >
      {heroes.map((hero) => (
        <HomeCategoryCard key={hero.href} category={hero} priority />
      ))}
    </div>
  );
}

function TileGrid({ tiles }: { tiles: HomeCategory[] }) {
  return (
    <div className="grid w-full grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-4 xl:grid-cols-5">
      {tiles.map((tile) => (
        <HomeCategoryCard key={tile.href} category={tile} />
      ))}
    </div>
  );
}
