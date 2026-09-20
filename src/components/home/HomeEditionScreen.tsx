"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { isRules2024Allowed } from "@/rules/access";
import type { Edition } from "@/rules/route-helpers";
import { type AccentSchemeName, findEditionAccent } from "@/styles/edition-accent";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { HomeCategoryCard } from "./HomeCategoryCard";
import { HomeFooter } from "./HomeFooter";
import { StarDivider } from "@/components/ui/StarDivider";
import {
  HOME_EDITION_HEADINGS,
  collectHomeCardRows,
  type HomeCard,
  type HomeCardViewport,
} from "./homeCategories";
import { HOME_ACCENTS, buildHomeHeroRowMaxWidth, type HomeAccentName } from "./homeTokens";

/// Ключується схемою, а не редакцією: перемикач EDITION_SCHEME дістає й головну.
const HOME_ACCENT_BY_SCHEME: Record<AccentSchemeName, HomeAccentName> = {
  arcane: "runicCyan",
  prism: "prismSheen",
};

const OTHER_EDITION: Record<Edition, Edition> = { "2014": "2024", "2024": "2014" };

/// A landscape phone is ~390px tall: without this the heading alone eats the room the first
/// category row needs in order to peek into the first screen (KR13.7 §6).
const HIDDEN_ON_SHORT_VIEWPORT = "[@media(max-height:560px)]:hidden";

/// «Desktop» starts at `md`, the same edge the hero image `sizes` already use.
const VIEWPORT_CLASS_NAMES: Record<HomeCardViewport, string | undefined> = {
  all: undefined,
  desktop: "hidden md:block",
  phone: "md:hidden",
};

const screenMotion = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
} as const;

const blockMotion = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
} as const;

export function HomeEditionScreen({ edition }: { edition: Edition }) {
  const { heroes, tiles } = collectHomeCardRows(edition);

  return (
    <motion.div
      className="w-full pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-16"
      variants={screenMotion}
      initial="hidden"
      animate="show"
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 pt-4 sm:gap-6 sm:px-6 sm:pt-6">
        <EditionHeading edition={edition} />
        <HeroRow heroes={heroes} />
        <TileGrid tiles={tiles} />
      </div>

      <HomeFooter edition={edition} />
    </motion.div>
  );
}

function EditionHeading({ edition }: { edition: Edition }) {
  const heading = HOME_EDITION_HEADINGS[edition];

  return (
    <motion.header variants={blockMotion} className="text-center">
      <h1 className="font-rpg-display text-lg uppercase tracking-[0.22em] text-slate-100 sm:text-2xl md:text-3xl">
        {heading.system} · Редакція <EditionYear edition={edition} />
      </h1>
      <StarDivider
        className={cn(
          "mx-auto mt-2 w-40 sm:w-56",
          HOME_ACCENTS[HOME_ACCENT_BY_SCHEME[findEditionAccent(edition).scheme]].textClassName,
          HIDDEN_ON_SHORT_VIEWPORT,
        )}
      />
    </motion.header>
  );
}

/// Власник, 2026-09-19: рік у заголовку перемикає редакцію, а натяк на це — тихий: пунктирне
/// підкреслення й маленька стрілка, що на наведенні набирає колір іншої редакції.
function EditionYear({ edition }: { edition: Edition }) {
  const other = OTHER_EDITION[edition];
  if (!isRules2024Allowed()) return <>{edition}</>;

  return (
    <ModeLink
      href={HOME_EDITION_HEADINGS[other].homePath}
      title={`Перемкнути на редакцію ${other}`}
      aria-label={`Редакція ${edition}. Перемкнути на редакцію ${other}`}
      className={cn(
        "group inline-flex items-baseline gap-[0.3em] underline decoration-white/30 decoration-dotted decoration-1 underline-offset-[0.35em] transition-colors hover:decoration-current",
        HOME_ACCENTS[HOME_ACCENT_BY_SCHEME[findEditionAccent(other).scheme]].hoverTextClassName,
      )}
    >
      {edition}
      <ArrowLeftRight aria-hidden className="h-[0.5em] w-[0.5em] self-center opacity-50 transition-opacity group-hover:opacity-100" />
    </ModeLink>
  );
}

function HeroRow({ heroes }: { heroes: HomeCard[] }) {
  const phoneColumns = heroes.filter((hero) => hero.viewport !== "desktop").length;
  const desktopColumns = heroes.filter((hero) => hero.viewport !== "phone").length;
  const rowStyle = {
    "--hero-columns-phone": phoneColumns,
    "--hero-columns-desktop": desktopColumns,
    "--hero-row-max-width-phone": buildHomeHeroRowMaxWidth(phoneColumns),
    "--hero-row-max-width-desktop": buildHomeHeroRowMaxWidth(desktopColumns),
  } as CSSProperties;

  return (
    <div
      className="mx-auto grid w-full max-w-[var(--hero-row-max-width-phone)] grid-cols-[repeat(var(--hero-columns-phone),minmax(0,1fr))] gap-3 sm:gap-6 md:max-w-[var(--hero-row-max-width-desktop)] md:grid-cols-[repeat(var(--hero-columns-desktop),minmax(0,1fr))]"
      style={rowStyle}
    >
      {heroes.map((hero) => (
        <HomeCategoryCard
          key={hero.category.href}
          card={hero}
          priority={hero.viewport === "all"}
          className={VIEWPORT_CLASS_NAMES[hero.viewport]}
        />
      ))}
    </div>
  );
}

function TileGrid({ tiles }: { tiles: HomeCard[] }) {
  return (
    <div className="grid w-full grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-4 xl:grid-cols-5">
      {tiles.map((tile) => (
        <HomeCategoryCard
          key={tile.category.href}
          card={tile}
          className={VIEWPORT_CLASS_NAMES[tile.viewport]}
        />
      ))}
    </div>
  );
}
